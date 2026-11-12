# Electrum ABC - lightweight eCash client
# Copyright (C) 2026-present The Electrum ABC developers
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
"""Tests for the RPC commands that use the wallet, but don't require any coins.

The test framework creates a new BIP39 wallet without a password for each test.
"""

import unittest

from ... import mnemo, networks
from ...bip32 import xpub_from_xprv
from ...bitcoin import deserialize_privkey
from ...ecc import ECPrivkey
from .framework import ElectrumABCTestCase
from .util import rpc


class TestRPCWallet(ElectrumABCTestCase):
    def test_wallet_storage_seed_and_master_keys(self):
        assert rpc("get", key="wallet_type") == "standard"
        assert rpc("get", key="seed_type") == "bip39"
        assert rpc("get", key="this_key_does_not_exist") is None

        seed = rpc("getseed")
        assert mnemo.is_bip39_seed(seed)

        xprv = rpc("getmasterprivate")
        xpub = rpc("getmpk")
        assert xprv.startswith("tprv")
        assert xpub.startswith("tpub")
        assert xpub_from_xprv(xprv, net=networks.RegtestNet) == xpub

    def test_addresses(self):
        all_addresses = rpc("listaddresses")
        receiving = rpc("listaddresses", receiving=True)
        change = rpc("listaddresses", change=True)
        assert len(receiving) > 0 and len(change) > 0
        assert sorted(receiving + change) == sorted(all_addresses)
        # Nothing has been used or funded yet
        assert rpc("listaddresses", unused=True) == all_addresses
        assert rpc("listaddresses", funded=True) == []
        assert rpc("listaddresses", frozen=True) == []
        # The formatting of the balance depends on the locale
        with_balance = rpc("listaddresses", receiving=True, balance=True)
        assert [item[0] for item in with_balance] == receiving
        assert all(len(item) == 2 for item in with_balance)

        assert rpc("getunusedaddress") in receiving

        new_address = rpc("createnewaddress")
        assert new_address not in all_addresses
        assert new_address in rpc("listaddresses", receiving=True)
        assert rpc("ismine", address=new_address) is True

    def test_public_and_private_keys(self):
        addresses = rpc("listaddresses")[:3]
        for address in addresses:
            pubkeys = rpc("getpubkeys", address=address)
            assert len(pubkeys) == 1

            wif = rpc("getprivatekeys", address=address)
            _txin_type, privkey, compressed = deserialize_privkey(
                wif, net=networks.RegtestNet
            )
            assert ECPrivkey(privkey).get_public_key_hex(compressed) == pubkeys[0]

        # A list of addresses returns a list of private keys, in the same order
        wifs = rpc("getprivatekeys", address=addresses)
        assert wifs == [rpc("getprivatekeys", address=addr) for addr in addresses]

    def test_sign_and_verify_message(self):
        address, other_address = rpc("listaddresses", receiving=True)[:2]
        message = "Electrum ABC functional tests"
        signature = rpc("signmessage", address=address, message=message)

        def verify(address_: str, message_: str) -> bool:
            return rpc(
                "verifymessage",
                address=address_,
                signature=signature,
                message=message_,
            )

        assert verify(address, message) is True
        assert verify(address, message + "!") is False
        assert verify(other_address, message) is False

    def test_encrypt_and_decrypt(self):
        address = rpc("getunusedaddress")
        pubkey = rpc("getpubkeys", address=address)[0]
        message = "Electrum ABC functional tests"
        encrypted = rpc("encrypt", pubkey=pubkey, message=message)
        assert encrypted != message
        assert rpc("decrypt", pubkey=pubkey, encrypted=encrypted) == message

    def test_contacts(self):
        # There is no RPC command to add a contact
        assert rpc("listcontacts") == []
        assert rpc("searchcontacts", query="foo") == []

    def test_payment_requests(self):
        request = rpc("addrequest", amount=1_000, memo="test memo")
        address = request["address"]
        assert rpc("getrequest", key=address) == request
        assert request["memo"] == "test memo"
        assert request["status"] == "Pending"

        assert rpc("rmrequest", address=address) is True
        with self.assertRaisesRegex(RuntimeError, "Request not found"):
            rpc("getrequest", key=address)
        assert rpc("rmrequest", address=address) is False

    def test_signrequest_without_alias(self):
        request = rpc("addrequest", amount=1_000)
        with self.assertRaisesRegex(RuntimeError, "No alias in your configuration"):
            rpc("signrequest", address=request["address"])

    def test_importprivkey_into_hd_wallet(self):
        """Private keys can only be imported into an imported private keys wallet"""
        wif = rpc("getprivatekeys", address=rpc("getunusedaddress"))
        assert rpc("importprivkey", privkey=wif).startswith(
            "Error: This type of wallet cannot import private keys."
        )


if __name__ == "__main__":
    unittest.main()
