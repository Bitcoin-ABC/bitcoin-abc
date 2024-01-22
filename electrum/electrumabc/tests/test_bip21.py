"""Test parsing of BIP21 payment URIs"""

import unittest

from ..web import parse_URI


class TestParseURI(unittest.TestCase):
    def _do_test(self, uri, expected):
        result = parse_URI(uri)
        self.assertEqual(expected, result)

    def test_address(self):
        self._do_test(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"},
        )
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"},
        )

    def test_only_address(self):
        self._do_test(
            "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"},
        )

    def test_address_label(self):
        self._do_test(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?label=electrum%20test",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "label": "electrum test"},
        )
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?label=electrum%20test",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "label": "electrum test"},
        )

    def test_address_message(self):
        self._do_test(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?message=electrum%20test",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "message": "electrum test",
            },
        )
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?message=electrum%20test",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "message": "electrum test",
            },
        )

    def test_address_amount(self):
        self._do_test(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?amount=1.03",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "amount": 103},
        )
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?amount=1.03",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "amount": 103},
        )

    def test_address_request_url(self):
        self._do_test(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?r=http://domain.tld/page?h%3D2a8628fc2fbe",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "r": "http://domain.tld/page?h=2a8628fc2fbe",
            },
        )
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?r=http://domain.tld/page?h%3D2a8628fc2fbe",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "r": "http://domain.tld/page?h=2a8628fc2fbe",
            },
        )

    def test_ignore_args(self):
        self._do_test(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?test=test",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "test": "test"},
        )
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?test=test",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "test": "test"},
        )

    def test_multiple_args(self):
        self._do_test(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?amount=10.04&label=electrum-test&message=electrum%20test&test=none&r=http://domain.tld/page",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "amount": 1004,
                "label": "electrum-test",
                "message": "electrum test",
                "r": "http://domain.tld/page",
                "test": "none",
            },
        )

        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?"
            "amount=10.04&"
            "label=electrum-test&"
            "message=electrum%20test&"
            "test=none&"
            "r=http://domain.tld/page",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "amount": 1004,
                "label": "electrum-test",
                "message": "electrum test",
                "r": "http://domain.tld/page",
                "test": "none",
            },
        )

    def test_no_address_request_url(self):
        self._do_test(
            "bitcoincash:?r=http://domain.tld/page?h%3D2a8628fc2fbe",
            {"r": "http://domain.tld/page?h=2a8628fc2fbe"},
        )
        self._do_test(
            "ecash:?r=http://domain.tld/page?h%3D2a8628fc2fbe",
            {"r": "http://domain.tld/page?h=2a8628fc2fbe"},
        )

    def test_invalid_address(self):
        self.assertRaises(Exception, parse_URI, "bitcoincash:invalidaddress")
        self.assertRaises(Exception, parse_URI, "ecash:invalidaddress")

    def test_invalid(self):
        self.assertRaises(
            Exception, parse_URI, "notvalid:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"
        )

    def test_parameter_polution(self):
        # amount specified twice
        self.assertRaises(
            Exception,
            parse_URI,
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?amount=0.0003&label=test&amount=30.0",
        )
        self.assertRaises(
            Exception,
            parse_URI,
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?amount=0.0003&label=test&"
            "amount=30.0",
        )


if __name__ == "__main__":
    unittest.main()
