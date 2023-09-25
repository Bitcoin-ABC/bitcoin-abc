import unittest

from .. import contacts, dnssec
from ..address import Address


class MockDNSRecord:
    def __init__(self, data: bytes):
        self.strings = [data]


mock_records = [
    MockDNSRecord(
        b"oa1:btc recipient_address=1KTexdemPdxSBcG55heUuTjDRYqbC5ZL8H; "
        b"recipient_name=Monero Development (BTC); "
        b"tx_description=Donation to Monero Core Team;"
    ),
    MockDNSRecord(
        b"oa1:xmr "
        b"recipient_address=888tNkZrPN6JsEgekjMnABU4TBzc2Dt29EPAvkRxbANsAnjyPbb3iQ1YBRk1UXcdRsiKc9dhwMVgN5S9cQUiyoogDavup3H; "
        b"recipient_name=Monero Development (XMR); "
        b"tx_description=Donation to Monero Core Team;"
    ),
    MockDNSRecord(
        b"oa1:xec "
        b"recipient_address=ecash:qr98e3qdhegz5k79gkfmp0xl27phv63uuqjtz8uutp; "
        b"recipient_name=Monero Development (XEC); "
        b"tx_description=Donation to Monero Core Team;"
    ),
    MockDNSRecord(
        b"oa1:bch "
        b"recipient_address=bitcoincash:qr98e3qdhegz5k79gkfmp0xl27phv63uuqtxkv8xdk; "
        b"recipient_name=Monero Development (BCH); "
        b"tx_description=Donation to Monero Core Team;"
    ),
]


def mock_dnssec_query(*args, **kwargs):
    validated = True
    return mock_records, validated


class TestOpenAlias(unittest.TestCase):
    def setUp(self):
        self.original_dnssec_query = dnssec.query
        dnssec.query = mock_dnssec_query

    def tearDown(self):
        dnssec.query = self.original_dnssec_query

    def test_resolve_openalias(self):
        result = contacts.Contacts.resolve_openalias("mock url")
        self.assertIsNotNone(result)
        address, name, _validated = result
        self.assertEqual(
            address,
            Address.from_string("ecash:qr98e3qdhegz5k79gkfmp0xl27phv63uuqjtz8uutp"),
        )
        self.assertEqual(
            name,
            "Monero Development (XEC)",
        )


if __name__ == "__main__":
    unittest.main()
