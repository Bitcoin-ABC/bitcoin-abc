#!/usr/bin/env python3
# Copyright (c) 2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the behavior of RPC importprivkey on set and unset labels of
addresses.

It tests different cases in which an address is imported with importaddress
with or without a label and then its private key is imported with importprivkey
with and without a label.
"""

from test_framework.address import script_to_p2sh
from test_framework.script import (
    CScript,
    OP_CHECKSIG,
    OP_DUP,
    OP_EQUALVERIFY,
    OP_HASH160,
    hash160,
)

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    hex_str_to_bytes,
)


class ImportWithLabel(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        """Main test logic"""

        self.log.info(
            "Test importaddress with label and importprivkey without label."
        )
        self.log.info("Import a watch-only address with a label.")
        address = self.nodes[0].getnewaddress()
        label = "Test Label"
        self.nodes[1].importaddress(address, label)
        address_assert = self.nodes[1].getaddressinfo(address)

        assert_equal(address_assert["iswatchonly"], True)
        assert_equal(address_assert["ismine"], False)
        assert_equal(address_assert["label"], label)

        self.log.info(
            "Import the watch-only address's private key without a "
            "label and the address should keep its label."
        )
        priv_key = self.nodes[0].dumpprivkey(address)
        self.nodes[1].importprivkey(priv_key)

        assert_equal(label, self.nodes[1].getaddressinfo(address)["label"])

        self.log.info(
            "Test importaddress without label and importprivkey with label."
        )
        self.log.info("Import a watch-only address without a label.")
        address2 = self.nodes[0].getnewaddress()
        self.nodes[1].importaddress(address2)
        address_assert2 = self.nodes[1].getaddressinfo(address2)

        assert_equal(address_assert2["iswatchonly"], True)
        assert_equal(address_assert2["ismine"], False)
        assert_equal(address_assert2["label"], "")

        self.log.info(
            "Import the watch-only address's private key with a "
            "label and the address should have its label updated."
        )
        priv_key2 = self.nodes[0].dumpprivkey(address2)
        label2 = "Test Label 2"
        self.nodes[1].importprivkey(priv_key2, label2)

        assert_equal(label2, self.nodes[1].getaddressinfo(address2)["label"])

        self.log.info(
            "Test importaddress with label and importprivkey with label.")
        self.log.info("Import a watch-only address with a label.")
        address3 = self.nodes[0].getnewaddress()
        label3_addr = "Test Label 3 for importaddress"
        self.nodes[1].importaddress(address3, label3_addr)
        address_assert3 = self.nodes[1].getaddressinfo(address3)

        assert_equal(address_assert3["iswatchonly"], True)
        assert_equal(address_assert3["ismine"], False)
        assert_equal(address_assert3["label"], label3_addr)

        self.log.info(
            "Import the watch-only address's private key with a "
            "label and the address should have its label updated."
        )
        priv_key3 = self.nodes[0].dumpprivkey(address3)
        label3_priv = "Test Label 3 for importprivkey"
        self.nodes[1].importprivkey(priv_key3, label3_priv)

        assert_equal(
            label3_priv,
            self.nodes[1].getaddressinfo(address3)["label"])

        self.log.info(
            "Test importprivkey won't label new dests with the same "
            "label as others labeled dests for the same key."
        )
        self.log.info("Import a watch-only legacy address with a label.")
        address4 = self.nodes[0].getnewaddress()
        label4_addr = "Test Label 4 for importaddress"
        self.nodes[1].importaddress(address4, label4_addr)
        address_assert4 = self.nodes[1].getaddressinfo(address4)

        assert_equal(address_assert4["iswatchonly"], True)
        assert_equal(address_assert4["ismine"], False)
        assert_equal(address_assert4["label"], label4_addr)

        self.log.info("Asserts address has no embedded field with dests.")

        assert_equal(address_assert4.get("embedded"), None)

        self.log.info(
            "Import the watch-only address's private key without a "
            "label and new destinations for the key should have an "
            "empty label while the 'old' destination should keep "
            "its label."
        )

        # Build a P2SH manually for this test.
        priv_key4 = self.nodes[0].dumpprivkey(address4)
        pubkey4 = self.nodes[0].getaddressinfo(address4)['pubkey']
        pkh4 = hash160(hex_str_to_bytes(pubkey4))
        script4 = CScript(
            [OP_DUP, OP_HASH160, pkh4, OP_EQUALVERIFY, OP_CHECKSIG])
        p2shaddr4 = script_to_p2sh(script4)

        self.nodes[1].importmulti([{
            "scriptPubKey": {"address": p2shaddr4},
            "timestamp": "now",
            "redeemscript": script4.hex(),
            "keys": [priv_key4],
        }])

        p2shaddrinfo = self.nodes[1].getaddressinfo(p2shaddr4)

        assert p2shaddrinfo.get("embedded")

        embedded_addrinfo = self.nodes[1].getaddressinfo(
            p2shaddrinfo["embedded"]["address"]
        )

        assert_equal(p2shaddrinfo["label"], "")
        assert_equal(embedded_addrinfo["label"], label4_addr)

        self.stop_nodes()


if __name__ == "__main__":
    ImportWithLabel().main()
