import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('covers', pathlib.Path(__file__).resolve().parents[1] / 'scripts/enrich-covers.py')
covers = importlib.util.module_from_spec(spec)
spec.loader.exec_module(covers)


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


if __name__ == '__main__':
    unittest.main()
