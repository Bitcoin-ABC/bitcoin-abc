"""Tests for the util.py module.

To enable tests for various locales, you need to install them first.

For ubuntu:

    sudo locale-gen zh_CN.UTF-8
"""

import locale
import unittest

from ..util import (
    _fmt_sats_cache,
    clear_cached_dp,
    format_satoshis,
    set_locale_has_thousands_separator,
)
from ..web import parse_URI

initial_locale = locale.getlocale(locale.LC_NUMERIC)


class _TestFormatSatoshis(unittest.TestCase):
    """Base class for testing formating amounts.
    Subclass and specify a locale
    """

    loc = None
    dp = None

    @classmethod
    def setUpClass(cls) -> None:
        try:
            locale.setlocale(locale.LC_NUMERIC, cls.loc)
        except locale.Error:
            raise unittest.SkipTest(f"locale {cls.loc} is not installed")
        else:
            is_locale_aware = len(f"{1000:n}") > 4
            set_locale_has_thousands_separator(is_locale_aware)
            cls.dp = locale.localeconv().get("decimal_point") or "."
            cls.ts = locale.localeconv().get("thousands_sep") or ","
            if not is_locale_aware:
                cls.dp = "."
                cls.ts = ","
        finally:
            _fmt_sats_cache.d.clear()
            clear_cached_dp()

    @classmethod
    def tearDownClass(cls) -> None:
        locale.setlocale(locale.LC_NUMERIC, initial_locale)

    def test_format_satoshis(self):
        self.assertEqual(format_satoshis(1234), "12" + self.dp + "34")
        self.assertEqual(format_satoshis(12), "0" + self.dp + "12")
        self.assertEqual(format_satoshis(7), "0" + self.dp + "07")

        # amounts > 1000 XEC should have thousands grouping
        self.assertEqual(
            format_satoshis(123456), "1" + self.ts + "234" + self.dp + "56"
        )
        self.assertEqual(
            format_satoshis(123456789),
            "1" + self.ts + "234" + self.ts + "567" + self.dp + "89",
        )

    def test_format_satoshis_zero(self):
        result = format_satoshis(0)
        expected = "0" + self.dp
        self.assertEqual(expected, result)

    def test_format_satoshis_negative(self):
        self.assertEqual(format_satoshis(-1234), "-12" + self.dp + "34")
        self.assertEqual(format_satoshis(-1), "-0" + self.dp + "01")

        self.assertEqual(
            format_satoshis(-123456789),
            "-1" + self.ts + "234" + self.ts + "567" + self.dp + "89",
        )

    def test_format_fee(self):
        result = format_satoshis(1700 / 1000, 0, 0)
        expected = "1" + self.dp + "7"
        self.assertEqual(expected, result)

    def test_format_fee_precision(self):
        result = format_satoshis(1666 / 1000, 0, 0, precision=6)
        expected = "1" + self.dp + "666"
        self.assertEqual(expected, result)

        result = format_satoshis(1666 / 1000, 0, 0, precision=1)
        expected = "1" + self.dp + "7"
        self.assertEqual(expected, result)

    def test_format_satoshis_whitespaces(self):
        result = format_satoshis(12340, whitespaces=True)
        expected = "         123" + self.dp + "4 "
        self.assertEqual(expected, result)

        result = format_satoshis(1234, whitespaces=True)
        expected = "          12" + self.dp + "34"
        self.assertEqual(expected, result)

        self.assertEqual(
            format_satoshis(123456789, whitespaces=True),
            "   1" + self.ts + "234" + self.ts + "567" + self.dp + "89",
        )

    def test_format_satoshis_whitespaces_negative(self):
        result = format_satoshis(-12340, whitespaces=True)
        expected = "        -123" + self.dp + "4 "
        self.assertEqual(expected, result)

        result = format_satoshis(-1234, whitespaces=True)
        expected = "         -12" + self.dp + "34"
        self.assertEqual(expected, result)

        self.assertEqual(
            format_satoshis(-123456789, whitespaces=True),
            "  -1" + self.ts + "234" + self.ts + "567" + self.dp + "89",
        )

    def test_format_satoshis_diff_positive(self):
        result = format_satoshis(1234, is_diff=True)
        expected = "+12" + self.dp + "34"
        self.assertEqual(expected, result)

    def test_format_satoshis_diff_negative(self):
        result = format_satoshis(-1234, is_diff=True)
        expected = "-12" + self.dp + "34"
        self.assertEqual(expected, result)


class TestFormatSatoshisLocaleC(_TestFormatSatoshis):
    loc = "C"


class TestFormatSatoshisLocaleFr(_TestFormatSatoshis):
    loc = "fr_FR.UTF-8"


class TestFormatSatoshisLocaleDe(_TestFormatSatoshis):
    loc = "de_DE.UTF-8"


class TestFormatSatoshisLocaleAr_SA(_TestFormatSatoshis):
    """Test amounts for Arabic locale"""

    loc = "ar_SA.UTF-8"


class TestFormatSatoshisLocalezh_CN(_TestFormatSatoshis):
    """Test amounts for Chinese locale"""

    loc = "zh_CN.UTF-8"


class TestUtil(unittest.TestCase):
    def _do_test_parse_URI(self, uri, expected):
        result = parse_URI(uri)
        self.assertEqual(expected, result)

    def test_parse_URI_address(self):
        self._do_test_parse_URI(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"},
        )
        self._do_test_parse_URI(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"},
        )

    def test_parse_URI_only_address(self):
        self._do_test_parse_URI(
            "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"},
        )

    def test_parse_URI_address_label(self):
        self._do_test_parse_URI(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?label=electrum%20test",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "label": "electrum test"},
        )
        self._do_test_parse_URI(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?label=electrum%20test",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "label": "electrum test"},
        )

    def test_parse_URI_address_message(self):
        self._do_test_parse_URI(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?message=electrum%20test",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "message": "electrum test",
                "memo": "electrum test",
            },
        )
        self._do_test_parse_URI(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?message=electrum%20test",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "message": "electrum test",
                "memo": "electrum test",
            },
        )

    def test_parse_URI_address_amount(self):
        self._do_test_parse_URI(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?amount=1.03",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "amount": 103},
        )
        self._do_test_parse_URI(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?amount=1.03",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "amount": 103},
        )

    def test_parse_URI_address_request_url(self):
        self._do_test_parse_URI(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?r=http://domain.tld/page?h%3D2a8628fc2fbe",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "r": "http://domain.tld/page?h=2a8628fc2fbe",
            },
        )
        self._do_test_parse_URI(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?r=http://domain.tld/page?h%3D2a8628fc2fbe",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "r": "http://domain.tld/page?h=2a8628fc2fbe",
            },
        )

    def test_parse_URI_ignore_args(self):
        self._do_test_parse_URI(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?test=test",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "test": "test"},
        )
        self._do_test_parse_URI(
            "ecash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?test=test",
            {"address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma", "test": "test"},
        )

    def test_parse_URI_multiple_args(self):
        self._do_test_parse_URI(
            "bitcoincash:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma?amount=10.04&label=electrum-test&message=electrum%20test&test=none&r=http://domain.tld/page",
            {
                "address": "15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma",
                "amount": 1004,
                "label": "electrum-test",
                "message": "electrum test",
                "memo": "electrum test",
                "r": "http://domain.tld/page",
                "test": "none",
            },
        )

        self._do_test_parse_URI(
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
                "memo": "electrum test",
                "r": "http://domain.tld/page",
                "test": "none",
            },
        )

    def test_parse_URI_no_address_request_url(self):
        self._do_test_parse_URI(
            "bitcoincash:?r=http://domain.tld/page?h%3D2a8628fc2fbe",
            {"r": "http://domain.tld/page?h=2a8628fc2fbe"},
        )
        self._do_test_parse_URI(
            "ecash:?r=http://domain.tld/page?h%3D2a8628fc2fbe",
            {"r": "http://domain.tld/page?h=2a8628fc2fbe"},
        )

    def test_parse_URI_invalid_address(self):
        self.assertRaises(Exception, parse_URI, "bitcoincash:invalidaddress")
        self.assertRaises(Exception, parse_URI, "ecash:invalidaddress")

    def test_parse_URI_invalid(self):
        self.assertRaises(
            Exception, parse_URI, "notvalid:15mKKb2eos1hWa6tisdPwwDC1a5J1y9nma"
        )

    def test_parse_URI_parameter_polution(self):
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


def suite():
    test_suite = unittest.TestSuite()
    loadTests = unittest.defaultTestLoader.loadTestsFromTestCase
    test_suite.addTest(loadTests(TestFormatSatoshisLocaleC))
    test_suite.addTest(loadTests(TestFormatSatoshisLocaleFr))
    test_suite.addTest(loadTests(TestFormatSatoshisLocaleDe))
    test_suite.addTest(loadTests(TestFormatSatoshisLocaleAr_SA))
    test_suite.addTest(loadTests(TestFormatSatoshisLocalezh_CN))
    test_suite.addTest(loadTests(TestUtil))
    return test_suite


if __name__ == "__main__":
    unittest.main(defaultTest="suite")
