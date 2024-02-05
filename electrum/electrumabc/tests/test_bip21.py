"""Test parsing of BIP21 payment URIs"""

import unittest

from ..address import Address
from ..networks import MainNet, RegtestNet, TestNet
from ..web import (
    BadSchemeError,
    BadURIParameter,
    DuplicateKeyInURIError,
    create_URI,
    parse_URI,
    parseable_schemes,
)


class TestParseURI(unittest.TestCase):
    def _do_test(self, uri, expected):
        result = parse_URI(uri)
        self.assertEqual(expected, result)

    def test_address(self):
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
            {"addresses": ["15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"]},
        )

    def test_testnet(self):
        with self.assertRaises(BadSchemeError):
            parse_URI("ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme", net=TestNet)

        with self.assertRaises(BadURIParameter):
            # correct prefix with bad checksum
            parse_URI("ectest:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme", net=TestNet)

        self.assertEqual(
            parse_URI("ectest:qrh3ethkfms79tlcw7m736t38hp9kg5f7gzncerkcg", net=TestNet),
            {"addresses": ["qrh3ethkfms79tlcw7m736t38hp9kg5f7gzncerkcg"]},
        )

        self.assertEqual(
            parse_URI("qrh3ethkfms79tlcw7m736t38hp9kg5f7gzncerkcg", net=TestNet),
            {"addresses": ["qrh3ethkfms79tlcw7m736t38hp9kg5f7gzncerkcg"]},
        )

    def test_only_address(self):
        self._do_test(
            "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
            {"addresses": ["15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"]},
        )

    def test_address_label(self):
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?label=electrum%20test",
            {
                "addresses": ["15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"],
                "label": "electrum test",
            },
        )

    def test_address_message(self):
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?message=electrum%20test",
            {
                "addresses": ["15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"],
                "message": "electrum test",
            },
        )

    def test_address_amount(self):
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?amount=1.03",
            {"addresses": ["15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"], "amounts": [103]},
        )

    def test_address_request_url(self):
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?r=http://domain.tld/page?h%3D2a8628fc2fbe",
            {
                "addresses": ["15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"],
                "r": "http://domain.tld/page?h=2a8628fc2fbe",
            },
        )

    def test_ignore_args(self):
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?test=test",
            {"addresses": ["15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"], "test": "test"},
        )

    def test_multiple_args(self):
        self._do_test(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?"
            "amount=10.04&"
            "label=electrum-test&"
            "message=electrum%20test&"
            "test=none&"
            "r=http://domain.tld/page",
            {
                "addresses": ["15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"],
                "amounts": [1004],
                "label": "electrum-test",
                "message": "electrum test",
                "r": "http://domain.tld/page",
                "test": "none",
            },
        )

    def test_no_address_request_url(self):
        self._do_test(
            "ecash:?r=http://domain.tld/page?h%3D2a8628fc2fbe",
            {"r": "http://domain.tld/page?h=2a8628fc2fbe"},
        )

    def test_invalid_address(self):
        self.assertRaises(Exception, parse_URI, "ecash:invalidaddress")

    def test_invalid(self):
        self.assertRaises(
            Exception, parse_URI, "notvalid:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"
        )

    def test_parameter_pollution(self):
        # label specified twice
        self.assertRaises(
            DuplicateKeyInURIError,
            parse_URI,
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?label=spam&amount=0.0003&"
            "label=foo",
        )

    def test_op_return(self):
        self._do_test(
            "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?op_return_raw=04deadbeef",
            {
                "addresses": ["qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme"],
                "op_return_raw": "04deadbeef",
            },
        )
        self._do_test(
            "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?op_return=payment%20for%20invoice%20%2342-1337",
            {
                "addresses": ["qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme"],
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
                "addresses": ["qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme"],
                "op_return": "spam",
            },
        )

        self._do_test(
            "ecash:?op_return_raw=04deadbeef",
            {"op_return_raw": "04deadbeef"},
        )

    def test_multiple_outputs(self):
        self._do_test(
            "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?amount=100&"
            "op_return_raw=0401020304&"
            "addr=qz252dlyuzfqk7k35f57csamlgxc23ahz5accatyk9&amount=200&"
            "addr=qzrseeup3rhehuaf9e6nr3sgm6t5eegufuuht750at&amount=300",
            {
                "addresses": [
                    "qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme",
                    "qz252dlyuzfqk7k35f57csamlgxc23ahz5accatyk9",
                    "qzrseeup3rhehuaf9e6nr3sgm6t5eegufuuht750at",
                ],
                "amounts": [10_000, 20_000, 30_000],
                "op_return_raw": "0401020304",
            },
        )

    def test_inconsistent_multiple_outputs(self):
        # amount specified twice for single address
        self.assertRaises(
            BadURIParameter,
            parse_URI,
            "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?amount=40.00&label=test&"
            "amount=30.00",
        )
        # multiple addresses, not enough amounts
        self.assertRaises(
            BadURIParameter,
            parse_URI,
            "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?amount=40.00&"
            "addr=qz252dlyuzfqk7k35f57csamlgxc23ahz5accatyk9",
        )
        self.assertRaises(
            BadURIParameter,
            parse_URI,
            "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?"
            "addr=qz252dlyuzfqk7k35f57csamlgxc23ahz5accatyk9",
        )
        # 2 addresses, 3 amounts
        self.assertRaises(
            BadURIParameter,
            parse_URI,
            "ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?amount=40.00&"
            "addr=qz252dlyuzfqk7k35f57csamlgxc23ahz5accatyk9&amount=30.00&"
            "amount=20.00",
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
            expected_uri="ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme?op_return=payment%20for%20invoice%20%2342-1337",
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


class TestParseableSchemes(unittest.TestCase):
    def test_mainnet(self):
        self.assertEqual(parseable_schemes(MainNet), ("ecash",))

    def test_testnet(self):
        self.assertEqual(parseable_schemes(TestNet), ("ectest",))

    def test_regtest(self):
        self.assertEqual(parseable_schemes(RegtestNet), ("ecregtest",))


if __name__ == "__main__":
    unittest.main()
