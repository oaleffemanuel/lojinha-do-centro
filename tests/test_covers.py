import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('covers', pathlib.Path(__file__).resolve().parents[1] / 'scripts/enrich-covers.py')
covers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(covers)

quadrante_spec = importlib.util.spec_from_file_location('quadrante_covers', pathlib.Path(__file__).resolve().parents[1] / 'scripts/enrich-quadrante-covers.py')
quadrante_covers = importlib.util.module_from_spec(quadrante_spec)
quadrante_spec.loader.exec_module(quadrante_covers)


class CoverMatching(unittest.TestCase):
    def test_valid_isbn_and_check_digit(self):
        self.assertEqual(covers.normalize_isbn('978-85-5638-410-2'), '9788556384102')
        self.assertIsNone(covers.normalize_isbn('9788556381102'))
        self.assertEqual(covers.normalize_isbn('0-306-40615-2'), '9780306406157')

    def test_only_explicit_isbn_and_publisher_image(self):
        page = '<meta property="og:image" content="https://acdn-us.mitiendanube.com/cover.webp"><p>ISBN: 978-85-5638-410-2<br>Páginas: 800</p>'
        identifiers, image, _ = covers.extract_product(page)
        self.assertEqual(identifiers, {'9788556384102'})
        self.assertTrue(image.endswith('/cover.webp'))
        self.assertEqual(covers.extract_product('<h1>Teologia do corpo</h1>')[0], set())

    def test_reject_foreign_image_host_and_keep_ambiguous_identifiers(self):
        page = '<meta property="og:image" content="https://example.com/image.jpg"><p>ISBN: 9788556384102</p><p>ISBN: 9780306406157</p>'
        identifiers, image, _ = covers.extract_product(page)
        self.assertEqual(len(identifiers), 2)
        self.assertEqual(image, '')


class QuadranteCoverMatching(unittest.TestCase):
    def test_normalizes_official_image_urls_and_webp_dimensions(self):
        raw = b'RIFF' + b'\x00' * 4 + b'WEBPVP8 ' + b'\x00' * 6 + b'\x9d\x01\x2a' + (660).to_bytes(2, 'little') + (1008).to_bytes(2, 'little') + b'\x00' * 3
        self.assertEqual(quadrante_covers.image_dimensions(raw), (660, 1008, 'image/webp'))
        self.assertEqual(
            quadrante_covers.normalized_image_url('http://quadrante.vteximg.com.br/arquivos/capa nova.jpg?v=1'),
            'https://quadrante.vteximg.com.br/arquivos/capa%20nova.jpg?v=1',
        )

    def test_catalog_manifest_has_exact_quadrante_matches(self):
        import json
        root = pathlib.Path(__file__).resolve().parents[1]
        catalog = json.loads((root / 'data/catalog.json').read_text())
        manifest = json.loads((root / 'data/cover-sources.json').read_text())
        quadrante = [book for book in catalog if book['publisher'] == 'Quadrante Editora']
        covers = [book for book in quadrante if book['isbn'] in manifest['covers']]
        self.assertEqual(len(quadrante), 560)
        self.assertEqual(len(covers), 557)
        self.assertTrue(all(manifest['covers'][book['isbn']]['matched_isbn'] == book['isbn'] for book in covers))


if __name__ == '__main__':
    unittest.main()
