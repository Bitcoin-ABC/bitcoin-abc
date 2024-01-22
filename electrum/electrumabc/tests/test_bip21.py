"""Test parsing of BIP21 payment URIs"""

import unittest

from ..address import Address
from ..web import DuplicateKeyInURIError, create_URI, parse_URI


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

    def test_op_return(self):
        self._do_test(
            "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?op_return_raw=04deadbeef",
            {
                "address": "qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme",
                "op_return_raw": "04deadbeef",
            },
        )
        self._do_test(
            "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?op_return=payment%20for%20invoice%20%2342-1337",
            {
                "address": "qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme",
                "op_return": "payment for invoice #42-1337",
            },
        )

        with self.assertRaises(DuplicateKeyInURIError):
            parse_URI(
                "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?op_return=spam&op_return_raw=04deadbeef",
                strict=True,
            )

        # without strict, op_return_raw is ignored
        self._do_test(
            "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?op_return=spam&op_return_raw=04deadbeef",
            {
                "address": "qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme",
                "op_return": "spam",
            },
        )


class TestCreateURI(unittest.TestCase):
    def _do_test(self, args, kwargs, expected_uri: str):
        # create_URI(addr, amount, message, *, op_return=None, op_return_raw=None, net=None)
        result = create_URI(*args, **kwargs)
        self.assertEqual(expected_uri, result)

    def test_address(self):
        self._do_test(
            args=[
                Address.from_string("ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme"),
                None,
                "",
            ],
            kwargs={},
            expected_uri="ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme",
        )

    def test_address_amount(self):
        self._do_test(
            args=[
                Address.from_string("ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme"),
                103,
                "",
            ],
            kwargs={},
            expected_uri="ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?amount=1.03",
        )

    def test_addr_amount_message(self):
        self._do_test(
            args=[
                Address.from_string("ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme"),
                1004,
                "electrum test",
            ],
            kwargs={},
            expected_uri="ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?amount=10.04&message=electrum%20test",
        )

    def test_op_return(self):
        self._do_test(
            args=[
                Address.from_string("ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme"),
                None,
                "",
            ],
            kwargs={"op_return": "payment for invoice #42-1337"},
            # fixme: the current implementation does not escape special chars
            #        in op_return (see how it is done for message)
            expected_uri="ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?op_return=payment for invoice #42-1337",
        )

        self._do_test(
            args=[
                Address.from_string("ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme"),
                None,
                "",
            ],
            kwargs={"op_return_raw": "04deadbeef"},
            expected_uri="ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?op_return_raw=04deadbeef",
        )

        # cannot specify both op_return and op_return_raw
        with self.assertRaises(ValueError):
            create_URI(
                Address.from_string("ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme"),
                None,
                "",
                op_return="spam",
                op_return_raw="04deadbeef",
            )


if __name__ == "__main__":
    unittest.main()
