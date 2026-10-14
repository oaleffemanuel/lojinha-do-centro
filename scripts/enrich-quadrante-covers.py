"""Add exact-ISBN Quadrante cover matches from the public VTEX catalog API."""

from __future__ import annotations

import argparse
import datetime
import json
import pathlib
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "catalog.json"
MANIFEST_PATH = ROOT / "data" / "cover-sources.json"
CACHE_PATH = ROOT / "data" / "quadrante-cover-cache.json"
API = "https://www.quadrante.com.br/api/catalog_system/pub/products/search"
AGENT = "LojinhaDoCentro-CatalogResearch/1.0"


def normalize_isbn(value):
    digits = re.sub(r"[^0-9X]", "", str(value).upper())
    if len(digits) == 13 and digits.isdigit():
        return digits if sum(int(digit) * (1 if index % 2 == 0 else 3) for index, digit in enumerate(digits)) % 10 == 0 else None
    return None


def image_dimensions(content):
    if content.startswith(b"\x89PNG\r\n\x1a\n") and len(content) >= 24:
        return int.from_bytes(content[16:20], "big"), int.from_bytes(content[20:24], "big"), "image/png"
    if content.startswith(b"\xff\xd8"):
        index = 2
        while index + 9 < len(content):
            if content[index] != 0xFF:
                index += 1
                continue
            marker = content[index + 1]
            index += 2
            if marker in (0xD8, 0xD9):
                continue
            if index + 2 > len(content):
                break
            length = int.from_bytes(content[index:index + 2], "big")
            if marker in range(0xC0, 0xC4) or marker in range(0xC5, 0xC8) or marker in range(0xC9, 0xCC) or marker in range(0xCD, 0xD0):
                if index + 7 <= len(content):
                    return int.from_bytes(content[index + 5:index + 7], "big"), int.from_bytes(content[index + 3:index + 5], "big"), "image/jpeg"
                break
            index += max(length, 2)
    if content.startswith(b"RIFF") and content[8:12] == b"WEBP" and len(content) >= 30:
        if content[12:16] == b"VP8X":
            width = 1 + int.from_bytes(content[24:27], "little")
            height = 1 + int.from_bytes(content[27:30], "little")
            return width, height, "image/webp"
        if content[12:16] == b"VP8 " and len(content) >= 32:
            frame = content.find(b"\x9d\x01\x2a", 20)
            if frame >= 0 and frame + 7 <= len(content):
                width = int.from_bytes(content[frame + 3:frame + 5], "little") & 0x3FFF
                height = int.from_bytes(content[frame + 5:frame + 7], "little") & 0x3FFF
                return width, height, "image/webp"
    return None


def normalized_image_url(value):
    parsed = urllib.parse.urlsplit(value.replace("http://", "https://", 1))
    return urllib.parse.urlunsplit(
        (
            parsed.scheme,
            parsed.netloc,
            urllib.parse.quote(urllib.parse.unquote(parsed.path), safe="/%:@!$&'()*+,;=-._~"),
            urllib.parse.quote(urllib.parse.unquote(parsed.query), safe="=&/?%:@!$'()*+,;=-._~"),
            parsed.fragment,
        )
    )


class RestrictedSource(RuntimeError):
    pass


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=560)
    parser.add_argument("--delay", type=float, default=1.5)
    parser.add_argument("--only-isbn", nargs="*")
    args = parser.parse_args()
    if not 1 <= args.limit <= 600 or args.delay < 0.5:
        parser.error("Use limit 1–600 and delay >= 0.5 seconds.")

    books = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    catalog = {
        normalize_isbn(book["isbn"]): book
        for book in books
        if book.get("publisher") == "Quadrante Editora" and normalize_isbn(book.get("isbn"))
    }
    requested = {normalize_isbn(isbn) for isbn in (args.only_isbn or [])}
    requested.discard(None)
    targets = requested or set(catalog)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    manifest.setdefault("covers", {})
    cache = json.loads(CACHE_PATH.read_text(encoding="utf-8")) if CACHE_PATH.exists() else {
        "source": "Quadrante public VTEX catalog API",
        "products": {},
        "failures": {},
    }
    cache.setdefault("products", {})
    cache.setdefault("failures", {})
    context = ssl.create_default_context()
    cert_path = pathlib.Path("/etc/ssl/cert.pem")
    if cert_path.exists():
        context.load_verify_locations(str(cert_path))
    last_request = 0.0

    def request(url, accept="application/json"):
        nonlocal last_request
        time.sleep(max(0, args.delay - (time.monotonic() - last_request)))
        last_request = time.monotonic()
        req = urllib.request.Request(url, headers={"User-Agent": AGENT, "Accept": accept})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=25, context=context) as response:
                    content = response.read(5_000_001)
                    if len(content) > 5_000_000:
                        raise ValueError("response exceeds 5 MB limit")
                    return content, response.headers
            except urllib.error.HTTPError as error:
                if error.code in (401, 403, 429):
                    raise RestrictedSource(f"Quadrante access restricted ({error.code}); stopped") from error
                if error.code not in (500, 502, 503, 504) or attempt == 2:
                    raise
                time.sleep(args.delay * 2)

    def save_cache():
        cache["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        temporary = CACHE_PATH.with_suffix(".tmp")
        temporary.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(CACHE_PATH)

    def save_manifest():
        temporary = MANIFEST_PATH.with_suffix(".tmp")
        temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(MANIFEST_PATH)

    def cover_record(product, isbn, image):
        image_url = normalized_image_url(image["imageUrl"])
        content, headers = request(image_url, accept="image/*")
        dimensions = image_dimensions(content)
        content_type = headers.get("Content-Type", "").split(";", 1)[0].lower()
        if not dimensions or not content_type.startswith("image/"):
            raise ValueError("image candidate is not a valid supported image")
        width, height, detected_type = dimensions
        if width < 100 or height < 100:
            raise ValueError("image candidate is too small")
        return {
            "url": image_url,
            "source_url": product.get("link", ""),
            "source": "Quadrante official VTEX catalog API",
            "matched_isbn": isbn,
            "source_title": product.get("productName", ""),
            "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "match_method": "exact productReference ISBN and validated image record",
            "storage": "external official VTEX image URL; no image downloaded",
            "width": width,
            "height": height,
            "content_type": detected_type,
        }

    def process_product(product):
        references = {normalize_isbn(product.get("productReference"))}
        for item in product.get("items", []):
            references.add(normalize_isbn(item.get("ean")))
            references.update(normalize_isbn(ref.get("Value")) for ref in item.get("referenceId", []))
        references.discard(None)
        matches = references & set(catalog)
        if len(matches) != 1:
            return False
        isbn = next(iter(matches))
        if isbn in manifest["covers"]:
            return True
        images = [image for item in product.get("items", []) for image in item.get("images", []) if image.get("imageUrl")]
        images.sort(key=lambda image: ("capa" not in (image.get("imageText", "") or "").lower(), image.get("imageId", "")))
        if not images:
            cache["failures"][f"isbn:{isbn}"] = "No public image record"
            return False
        try:
            manifest["covers"][isbn] = cover_record(product, isbn, images[0])
            cache["failures"].pop(f"isbn:{isbn}", None)
            cache["products"][isbn] = {
                "product_url": product.get("link", ""),
                "product_name": product.get("productName", ""),
                "matched_isbn": isbn,
                "image_url": manifest["covers"][isbn]["url"],
                "image_width": manifest["covers"][isbn]["width"],
                "image_height": manifest["covers"][isbn]["height"],
                "status": "matched",
            }
            save_manifest()
            print(f"matched: {isbn} {catalog[isbn]['title']}", flush=True)
            return True
        except (urllib.error.URLError, TimeoutError, ValueError) as error:
            cache["failures"][f"isbn:{isbn}"] = str(error)
            print(f"rejected: {isbn} {error}", flush=True)
            return False

    try:
        if requested:
            for isbn in sorted(requested):
                if isbn not in catalog or isbn in manifest["covers"]:
                    continue
                query = urllib.parse.urlencode({"fq": f"alternateIds_RefId:{isbn}"})
                content, _ = request(f"{API}?{query}")
                products = json.loads(content)
                if not products:
                    cache["failures"][f"isbn:{isbn}"] = "No exact public product record"
                for product in products:
                    process_product(product)
                save_cache()
        else:
            matched_targets = set(manifest["covers"]) & targets
            offset = 0
            while matched_targets != targets and offset < 1000 and len(matched_targets) < args.limit:
                query = urllib.parse.urlencode({"fq": "brandId:2000001", "_from": offset, "_to": offset + 49})
                content, _ = request(f"{API}?{query}")
                products = json.loads(content)
                if not products:
                    break
                for product in products:
                    process_product(product)
                    matched_targets = set(manifest["covers"]) & targets
                    if len(matched_targets) >= args.limit:
                        break
                save_cache()
                offset += 50
    except (RestrictedSource, urllib.error.URLError, TimeoutError, ValueError) as error:
        cache["last_error"] = str(error)
        save_cache()
        print(str(error), flush=True)
        raise SystemExit(2)

    by_publisher = {}
    for book in books:
        publisher = book.get("publisher", "Sem editora")
        by_publisher.setdefault(publisher, {"total": 0, "covers": 0})
        by_publisher[publisher]["total"] += 1
        if normalize_isbn(book.get("isbn")) in manifest["covers"]:
            by_publisher[publisher]["covers"] += 1
    manifest["updated_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
    manifest["report"] = {
        "total_books": len(books),
        "covers_found": sum(normalize_isbn(book.get("isbn")) in manifest["covers"] for book in books),
        "covers_missing": sum(normalize_isbn(book.get("isbn")) not in manifest["covers"] for book in books),
        "uncertain_matches_rejected": sum(page.get("status") == "rejected" for page in manifest.get("pages", {}).values()),
        "source": "Cultor official pages plus Quadrante official VTEX catalog API",
        "by_publisher": by_publisher,
    }
    save_manifest()
    save_cache()
    print(json.dumps(manifest["report"], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
