import unittest
from decimal import Decimal

from ..invoice import (
    ExchangeRateApi,
    FixedExchangeRate,
    Invoice,
    InvoiceDataError,
    MultiCurrencyExchangeRateApi,
)


class TestInvoice(unittest.TestCase):
    def test_xec_amount(self):
        payee = "My company\n123 Road Street\nTownsville NH 12345"
        payer = "Herr Doktor Überweisung\nLindenstraße 42\nD-77977 Rust"
        invoice = Invoice.from_dict(
            {
                "invoice": {
                    "address": "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
                    "id": "foo#123",
                    "currency": "XEC",
                    "amount": "1337.42",
                    "label": "spam",
                    "payee": payee,
                    "payer": payer,
                }
            }
        )
        self.assertEqual(invoice.label, "spam")
        self.assertEqual(invoice.id, "foo#123")
        self.assertEqual(invoice.currency, "XEC")
        self.assertEqual(invoice.amount, Decimal("1337.42"))
        self.assertEqual(
            invoice.address.to_ui_string(),
            "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
        )
        self.assertEqual(invoice.get_xec_amount(), Decimal("1337.42"))
        self.assertIsNone(invoice.exchange_rate)
        self.assertEqual(invoice.payee_address, payee)
        self.assertEqual(invoice.payer_address, payer)

    def test_fixed_exchange_rate(self):
        invoice = Invoice.from_dict(
            {
                "invoice": {
                    "address": "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
                    "currency": "CHF",
                    "id": "foo#123",
                    "amount": "42.1",
                    "label": "spam",
                    "exchangeRate": "0.5",
                }
            }
        )
        self.assertEqual(invoice.label, "spam")
        self.assertEqual(invoice.id, "foo#123")
        self.assertEqual(invoice.currency, "CHF")
        self.assertEqual(invoice.amount, Decimal("42.1"))
        self.assertEqual(
            invoice.address.to_ui_string(),
            "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
        )
        self.assertEqual(invoice.exchange_rate.get_exchange_rate(), Decimal("0.5"))
        self.assertEqual(invoice.exchange_rate.to_string(), "0.5")
        self.assertEqual(invoice.get_xec_amount(), Decimal("84.2"))
        self.assertIsInstance(invoice.exchange_rate, FixedExchangeRate)

    def test_api_exchange_rate(self):
        invoice = Invoice.from_dict(
            {
                "invoice": {
                    "address": "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
                    "currency": "NOK",
                    "amount": "42.1",
                    "id": "foo#123",
                    "label": "spam",
                    "exchangeRateAPI": {
                        "url": "foo",
                        "keys": ["bar"],
                    },
                }
            }
        )
        self.assertEqual(invoice.label, "spam")
        self.assertEqual(invoice.id, "foo#123")
        self.assertEqual(invoice.currency, "NOK")
        self.assertEqual(invoice.amount, Decimal("42.1"))
        self.assertEqual(
            invoice.address.to_ui_string(),
            "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
        )
        self.assertEqual(invoice.exchange_rate.url, "foo")
        self.assertEqual(invoice.exchange_rate.keys, ["bar"])
        self.assertIsInstance(invoice.exchange_rate, ExchangeRateApi)

    def test_invoice_data_errors(self):
        vector = [
            # Missing top-level "invoice" node
            {
                "address": "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
                "currency": "XEC",
                "amount": "1337.42",
                "label": "spam",
            },
            # bad address
            {
                "invoice": {
                    "address": "icash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
                    "currency": "XEC",
                    "amount": "1337.42",
                    "label": "spam",
                }
            },
            # XEC amount with exchange rate
            {
                "invoice": {
                    "address": "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
                    "currency": "XEC",
                    "amount": "1337.42",
                    "label": "spam",
                    "exchangeRate": "1.5",
                }
            },
            # XEC amount with exchange rate API
            {
                "invoice": {
                    "address": "ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
                    "currency": "XEC",
                    "amount": "1337.42",
                    "label": "spam",
                    "exchangeRateAPI": {
                        "url": "foo",
                        "keys": ["bar"],
                    },
                }
            },
            # Both exchangeRate and exchangeRateAPI are specified (ambiguous)
            {
                "invoice": {
                    "address": "icash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4",
                    "currency": "USD",
                    "amount": "1337.42",
                    "label": "spam",
                    "exchangeRate": "1.5",
                    "exchangeRateAPI": {
                        "url": "foo",
                        "keys": ["bar"],
                    },
                }
            },
        ]
        for data in vector:
            # Missing top-level "invoice" node
            with self.assertRaises(InvoiceDataError):
                Invoice.from_dict(data)

    def test_multicurrency_exchange_rate_api(self):
        api = MultiCurrencyExchangeRateApi(
            url="spam-%cur%_foo%CUR%",
            keys=["foo%cur%", "%CUR%spam", "bar"],
        )
        self.assertEqual(api.get_url(currency="eur"), "spam-eur_fooEUR")
        self.assertEqual(api.get_url(currency="EUR"), "spam-eur_fooEUR")
        self.assertEqual(api.get_keys(currency="usd"), ["foousd", "USDspam", "bar"])
        self.assertEqual(api.get_keys(currency="USD"), ["foousd", "USDspam", "bar"])


if __name__ == "__main__":
    unittest.main()
