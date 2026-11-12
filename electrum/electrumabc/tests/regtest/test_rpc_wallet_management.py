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
"""Tests for the RPC commands that create, restore, load and close wallets, and
change their password.

The daemon is started by the test framework with a default wallet path. The
`load_wallet` and `close_wallet` commands act on this default wallet. The
`create` and `restore` commands write new wallet files, but don't load them.
"""

import json
import os
import unittest

from ... import mnemo
from .framework import ElectrumABCTestCase
from .util import rpc


class TestRPCWalletManagement(ElectrumABCTestCase):
    def default_wallet_path(self) -> str:
        return os.path.join(self.electrum_data_dir, "default_wallet")

    def read_wallet_file(self, path: str) -> dict:
        """Read a wallet file that was created without a password"""
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def test_create(self):
        path = os.path.join(self.electrum_data_dir, "new_bip39_wallet")
        result = rpc("create", wallet_path=path)
        assert result["path"] == path
        assert mnemo.is_bip39_seed(result["seed"])
        assert self.read_wallet_file(path)["seed_type"] == "bip39"

        path = os.path.join(self.electrum_data_dir, "new_electrum_wallet")
        result = rpc("create", wallet_path=path, seed_type="electrum")
        assert mnemo.seed_type(result["seed"]) == mnemo.SeedType.Electrum
        assert self.read_wallet_file(path)["seed_type"] == "electrum"

        # The new wallets are not loaded
        assert [w["path"] for w in rpc("list_wallets")] == [self.default_wallet_path()]

        with self.assertRaisesRegex(RuntimeError, "Remove the existing wallet first"):
            rpc("create", wallet_path=path)
        with self.assertRaisesRegex(
            RuntimeError, "not supported for new wallet creation"
        ):
            rpc(
                "create",
                wallet_path=os.path.join(self.electrum_data_dir, "slip39"),
                seed_type="slip39",
            )

    def test_restore(self):
        # Restore the default wallet from its seed
        path = os.path.join(self.electrum_data_dir, "restored_from_seed")
        result = rpc("restore", text=rpc("getseed"), wallet_path=path)
        assert result["path"] == path
        restored = self.read_wallet_file(path)
        assert restored["seed_type"] == "bip39"
        assert restored["keystore"]["xpub"] == rpc("getmpk")

        # Restore a watching-only wallet from the master public key
        path = os.path.join(self.electrum_data_dir, "restored_from_xpub")
        rpc("restore", text=rpc("getmpk"), wallet_path=path)
        restored = self.read_wallet_file(path)
        assert restored["keystore"]["xpub"] == rpc("getmpk")
        assert restored["keystore"]["xprv"] is None

        # Restore a watching-only wallet from an address
        path = os.path.join(self.electrum_data_dir, "restored_from_address")
        address = rpc("getunusedaddress")
        rpc("restore", text=address, wallet_path=path)
        assert self.read_wallet_file(path)["wallet_type"] == "imported_addr"

        with self.assertRaisesRegex(RuntimeError, "Seed or key not recognized"):
            rpc(
                "restore",
                text="not a seed",
                wallet_path=os.path.join(self.electrum_data_dir, "invalid"),
            )

    def test_close_and_load_wallet(self):
        path = self.default_wallet_path()
        assert [w["path"] for w in rpc("list_wallets")] == [path]

        assert rpc("close_wallet") is True
        assert rpc("list_wallets") == []
        # Already closed
        assert rpc("close_wallet") is False

        assert rpc("load_wallet") is True
        assert [w["path"] for w in rpc("list_wallets")] == [path]

    def test_password(self):
        seed = rpc("getseed")

        assert rpc("password", new_password="secret") == {"password": True}
        assert rpc("getseed") == {"error": "Password required"}
        assert rpc("getseed", password="secret") == seed
        with self.assertRaisesRegex(RuntimeError, "Incorrect password"):
            rpc("getseed", password="wrong")

        # Remove the password
        assert rpc("password", password="secret", new_password=None) == {
            "password": False
        }
        assert rpc("getseed") == seed


if __name__ == "__main__":
    unittest.main()
