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
"""Tests for the RPC commands that use neither the wallet nor the network"""

import unittest

from ... import mnemo
from ...version import PACKAGE_VERSION
from .framework import ElectrumABCTestCase
from .util import rpc

# txid f8c9d5fea8bda2ba3514c5d316a68d7439c04de29b0404eaa197e2da871712f6
# A version 1 transaction with one p2pkh input and two p2pkh outputs
P2PKH_TX_HEX = (
    "0100000001f184f3128dc56f6575cf876c77657af21888fab6e602d1e3df7aa24"
    "d1d36c632010000006a47304402207f0066e8c48bc73fbd58045b9ce7272d5cd7"
    "1fdd86ab1debdd0628f5cc14a77d02207b2c92f785dd89387eadc37cfaa825392"
    "c2dfa8e24b7673546b5ed02050639a8412103562731a08eb23e6260b516c4564f"
    "746033e9080bc9f61ad2158a63927500b8b1ffffffff02a6ca360c00000000197"
    "6a9142560d750b51eebd180cef831b4a5c7aafc487bbd88acc2b64d0300000000"
    "1976a914231f7087937684790d1049294f3aef9cfb7b05dd88ac00000000"
)


class TestRPCOffline(ElectrumABCTestCase):
    def test_commands_help_version(self):
        commands = rpc("commands")
        help_list = rpc("help")
        # Both list the same commands, as a sorted space separated string and as a
        # sorted list
        assert commands == " ".join(help_list)
        assert help_list == sorted(help_list)
        for name in ("commands", "help", "version", "getinfo", "payto"):
            assert name in help_list

        assert rpc("version") == PACKAGE_VERSION

    def test_config(self):
        # Set in the config file copied by the test framework
        assert rpc("getconfig", key="rpcport") == 12342
        assert rpc("getconfig", key="this_key_does_not_exist") is None

        # The value is parsed as a python literal
        assert rpc("setconfig", key="fee_per_kb", value="3000") is True
        assert rpc("getconfig", key="fee_per_kb") == 3000
        assert rpc("getfeerate") == 3000

    def test_seeds(self):
        seed = rpc("make_seed")
        assert len(seed.split()) == 12
        assert mnemo.is_bip39_seed(seed)

        with self.assertRaisesRegex(RuntimeError, "check_seed has been removed"):
            rpc("check_seed", seed=seed)

    def test_dumpprivkeys(self):
        """This command is deprecated and only returns a message"""
        assert "getprivatekeys" in rpc("dumpprivkeys")

    def test_validateaddress(self):
        for address in (
            "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkt",
            "qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkt",
            "mfWxJ45yp2SFn7UciZyNpvDKrzbhyfKrY8",
        ):
            assert rpc("validateaddress", address=address) is True, address

        for address in (
            "",
            "foo",
            # bad checksum
            "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkq",
        ):
            assert rpc("validateaddress", address=address) is False, address

    def test_serialize(self):
        """Rebuild a transaction from the output of the deserialize command"""
        tx = rpc("deserialize", tx=P2PKH_TX_HEX)
        result = rpc(
            "serialize",
            jsontx={
                "inputs": tx["inputs"],
                "outputs": tx["outputs"],
                "locktime": tx["lockTime"],
            },
        )
        assert result["complete"] is True
        assert result["final"] is True
        # serialize always creates a version 2 transaction, everything else is the
        # same
        assert result["hex"] == "02" + P2PKH_TX_HEX[2:]

    def test_createmultisig(self):
        """Compare the result with the node's createmultisig RPC"""
        # Public keys of the private keys 1, 2 and 3
        pubkeys = [
            "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798",
            "02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5",
            "02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9",
        ]
        for num in (1, 2, 3):
            result = rpc("createmultisig", num=num, pubkeys=pubkeys)
            expected = self.node.createmultisig(num, pubkeys)
            assert result["redeemScript"] == expected["redeemScript"]
            # The address is returned in the legacy format
            converted = rpc("addressconvert", address=result["address"])
            assert converted["legacy"] == result["address"]
            assert converted["cashaddr"] == expected["address"]


if __name__ == "__main__":
    unittest.main()
