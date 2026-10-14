import argparse
import datetime
import difflib
import gzip
import json
import pathlib
import re
import ssl
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
import xml.etree.ElementTree as ET
import zipfile
from html.parser import HTMLParser

ROOT = pathlib.Path(__file__).resolve().parents[1]
ORIGIN = 'https://cultordelivros.com.br'
AGENT = 'LojinhaDoCentro-CatalogResearch/1.0'


def normalize_isbn(value):
    digits = re.sub(r'[^0-9X]', '', str(value).upper())
    if len(digits) == 13 and digits.isdigit():
        return digits if sum(int(digit) * (1 if index % 2 == 0 else 3) for index, digit in enumerate(digits)) % 10 == 0 else None
    if len(digits) == 10 and digits[:9].isdigit() and (digits[-1].isdigit() or digits[-1] == 'X'):
        if sum((10 - index) * (10 if digit == 'X' else int(digit)) for index, digit in enumerate(digits)) % 11 == 0:
            prefix = '978' + digits[:9]
            check = (-sum(int(digit) * (1 if index % 2 == 0 else 3) for index, digit in enumerate(prefix))) % 10
            return prefix + str(check)
    return None


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta = {}
        self.links = []
        self.text = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'style'):
            self.hidden += 1
        if tag == 'meta':
            self.meta[attrs.get('property', attrs.get('name', ''))] = attrs.get('content', '')
        if tag == 'a' and attrs.get('href'):
            self.links.append(attrs['href'])

    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.hidden = max(0, self.hidden - 1)

    def handle_data(self, data):
        if not self.hidden:
            self.text.append(data)


def extract_product(document):
    page = Page()
    page.feed(document)
    matches = re.findall(r'ISBN(?:\s*-?\s*1[03])?\s*[:：]?\s*([0-9][0-9Xx\s.\-]{8,24})', ' '.join(page.text), re.I)
    identifiers = {normalize_isbn(value.strip()) for value in matches}
    if None in identifiers:
        identifiers = set()
    image = page.meta.get('og:image:secure_url') or page.meta.get('og:image', '')
    image = image.replace('http://', 'https://', 1)
    parsed = urllib.parse.urlparse(image)
    if parsed.scheme != 'https' or not parsed.hostname or not parsed.hostname.endswith('.mitiendanube.com'):
        image = ''
    return identifiers, image, page.meta.get('og:title', '')


def words(value):
    plain = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode().lower()
    return ' '.join(re.findall(r'[a-z0-9]+', plain))


def priority_isbns(path):
    if not path:
        return set()
    with zipfile.ZipFile(path) as archive:
        namespace = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
        sheet = ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        result = set()
        for cell in sheet.findall('.//m:c', namespace):
            value = cell.find('m:v', namespace)
            if value is not None and cell.get('t') != 's':
                try:
                    identifier = normalize_isbn(str(int(float(value.text))))
                    if identifier:
                        result.add(identifier)
                except (ValueError, OverflowError):
                    pass
        return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=60)
    parser.add_argument('--delay', type=float, default=2.5)
    parser.add_argument('--priority-xlsx')
    args = parser.parse_args()
    if not 1 <= args.limit <= 600 or args.delay < 2:
        parser.error('Use limit 1–600 and delay >= 2 seconds.')
    books = json.loads((ROOT / 'data/catalog.json').read_text())
    catalog = {normalize_isbn(book['isbn']): book for book in books if normalize_isbn(book['isbn'])}
    output = ROOT / 'data/cover-sources.json'
    manifest = json.loads(output.read_text()) if output.exists() else {'covers': {}, 'pages': {}}
    manifest.setdefault('failures', {})
    priority = priority_isbns(args.priority_xlsx)
    ordered = sorted(catalog, key=lambda identifier: (identifier not in priority, words(catalog[identifier]['title'])))
    last_request = 0
    context = ssl.create_default_context()
    system_certificates = pathlib.Path('/etc/ssl/cert.pem')
    if system_certificates.exists():
        context.load_verify_locations(str(system_certificates))

    def request(url, method='GET'):
        nonlocal last_request
        for attempt in range(3):
            time.sleep(max(0, args.delay - (time.monotonic() - last_request)))
            last_request = time.monotonic()
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': AGENT}, method=method), timeout=25, context=context) as response:
                    content = response.read(5_000_001) if method == 'GET' else b''
                    if len(content) > 5_000_000:
                        raise ValueError('Response exceeds 5 MB limit')
                    return content, response.headers
            except urllib.error.HTTPError as error:
                if error.code in (401, 403, 429):
                    raise RuntimeError(f'Access restricted ({error.code}): {url}; stopped') from error
                if error.code < 500 or attempt == 2:
                    raise
            except (urllib.error.URLError, TimeoutError):
                if attempt == 2:
                    raise
            time.sleep(2 ** (attempt + 1))

    def save():
        manifest['updated_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        manifest['report'] = {
            'total_books': len(books),
            'covers_found': sum(normalize_isbn(book['isbn']) in manifest['covers'] for book in books),
            'covers_missing': sum(normalize_isbn(book['isbn']) not in manifest['covers'] for book in books),
            'uncertain_matches_rejected': sum(page['status'] == 'rejected' for page in manifest['pages'].values()),
            'source': 'Cultor de Livros official product pages / Nuvemshop CDN',
        }
        temporary = output.with_suffix('.tmp')
        temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
        temporary.replace(output)

    try:
        manifest.pop('last_error', None)
        robots_data, _ = request(ORIGIN + '/robots.txt')
        robots = urllib.robotparser.RobotFileParser()
        robots.parse(robots_data.decode().splitlines())
        manifest['robots_url'] = ORIGIN + '/robots.txt'
        manifest['robots_checked_at'] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        for required in ('/', '/sitemap.xml.gz'):
            if not robots.can_fetch(AGENT, ORIGIN + required):
                raise RuntimeError(f'robots.txt prohibits {required}')
        homepage, _ = request(ORIGIN + '/')
        home = Page()
        home.feed(homepage.decode())
        urls = {urllib.parse.urljoin(ORIGIN, link) for link in home.links if '/produtos/' in link}
        sitemap, _ = request(ORIGIN + '/sitemap.xml.gz')
        if sitemap.startswith(b'\x1f\x8b'):
            sitemap = gzip.decompress(sitemap)
        tree = ET.fromstring(sitemap)
        urls.update(element.text for element in tree.iter() if element.tag.endswith('}loc') and '/produtos/' in (element.text or ''))
        candidates = [url for url in urls if urllib.parse.urlparse(url).netloc == 'cultordelivros.com.br' and robots.can_fetch(AGENT, url)]
        available = set(candidates) - set(manifest['pages'])
        queue = []
        for identifier in ordered:
            if identifier in manifest['covers'] or not available:
                continue
            title = words(catalog[identifier]['title'])
            candidate = max(available, key=lambda url: difflib.SequenceMatcher(None, title, words(urllib.parse.urlparse(url).path.split('/')[-2])).ratio())
            queue.append(candidate)
            available.remove(candidate)
        for url in queue[:args.limit]:
            try:
                content, _ = request(url)
                identifiers, image, title = extract_product(content.decode())
                matching = identifiers & catalog.keys()
                status = 'rejected'
                reason = 'Missing, ambiguous, invalid or non-catalog ISBN; no title-only matches accepted'
                if len(identifiers) == 1 and len(matching) == 1 and image:
                    identifier = next(iter(matching))
                    _, headers = request(image, 'HEAD')
                    if headers.get('Content-Type', '').startswith('image/'):
                        manifest['covers'][identifier] = {'url': image, 'source_url': url, 'source': 'Cultor de Livros', 'matched_isbn': identifier, 'source_title': title, 'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'match_method': 'exact validated ISBN from product page', 'storage': 'external publisher CDN URL; no image downloaded'}
                        status, reason = 'matched', identifier
                manifest['pages'][url] = {'status': status, 'reason': reason}
                manifest['failures'].pop(url, None)
                print(f'{status}: {url}', flush=True)
            except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as error:
                manifest['failures'][url] = {'error': str(error), 'checked_at': datetime.datetime.now(datetime.timezone.utc).isoformat()}
                print(f'Failed; retry on next run: {url}: {error}', flush=True)
            save()
    except (RuntimeError, urllib.error.URLError, TimeoutError, ValueError) as error:
        manifest['last_error'] = str(error)
        save()
        raise SystemExit(str(error))
    save()
    print(json.dumps(manifest['report'], ensure_ascii=False))


if __name__ == '__main__':
    main()
