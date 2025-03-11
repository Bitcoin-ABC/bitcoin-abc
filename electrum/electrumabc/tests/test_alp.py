# Electrum ABC - lightweight eCash client
# Copyright (C) 2025-present The Electrum ABC Developers
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

import unittest
from unittest.mock import Mock

from ..storage import WalletStorage
from ..tokens import alp
from ..transaction import Transaction

TXID1 = 32 * "11"
TXID2 = 32 * "22"

TXID3 = "7f0d4f89942c1de4d4dbbc1547f4809923195a98dae26cd5ffb582ad69ef8696"
TX3 = "0200000002cffc7c2f17884bb6890e8e3db0ea8692c8baf3ad86979a45449cd6f64b33c57a0200000064411e2f6c44312f2e3f157c2266c538130fd8ffbfc75e9a130be7c8268b71740db6d1e860f6f2a6f710f449a25b9887228a92ec3d4d1b7606b6d4f187d907b8efd7412102bbb9930eeecc29900a2ac5a026902b2d6e8dde48815c8acf06553326f318f8ffffffffff55699eee413e1415eb4dc0262f2f1e521faeb821fbbc26e82ebf86900825ff42020000006441f356e57acd4098ec04694407a5498fb0ac0766fb565ed1db872fc062917acc2d18554e0e2ea6375a2a918e96552749aa26e96ff174a07ac0188e3609d3158e6d412102bbb9930eeecc29900a2ac5a026902b2d6e8dde48815c8acf06553326f318f8ffffffffff0400000000000000003a6a5037534c5032000453454e4441fcee3f2cda85728274fab853040f12c59a2dab5714fdd2e5e930a20f212f210202000000000060000000000022020000000000001976a9147e842c5d53c89a68b241f36ec59de92957a1e20a88ac22020000000000001976a914ede0e733017db4ba1592fa1fa773a6b407528f8888ac4c903a00000000001976a914ede0e733017db4ba1592fa1fa773a6b407528f8888ac00000000"


class TestAlpWalletData(unittest.TestCase):
    def test_rebuild(self):
        """Test a wallet that never scanned for alp tokens"""
        mock_wallet = Mock()
        mock_wallet.storage = WalletStorage("dummy_path", in_memory_only=True)
        mock_wallet.transactions = {TXID3: Transaction(bytes.fromhex(TX3))}
        # This mocks the lock's  context manager
        mock_wallet.lock = Mock()
        mock_wallet.lock.__enter__ = Mock()
        mock_wallet.lock.__exit__ = Mock(return_value=False)

        alp_data = alp.WalletData(mock_wallet)
        self.assertTrue(alp_data.needs_rebuild)
        self.assertEqual(alp_data.outpoints, {})
        self.assertFalse(alp_data.has_txo(f"{TXID1}:42"))
        self.assertFalse(alp_data.has_txo(f"{TXID2}:1"))

        alp_data.rebuild()
        self.assertFalse(alp_data.needs_rebuild)
        self.assertFalse(alp_data.has_txo(f"{TXID1}:42"))
        # The first output is the OpReturn
        self.assertFalse(alp_data.has_txo(f"{TXID3}:0"))
        # The next two are alp tokens
        self.assertTrue(alp_data.has_txo(f"{TXID3}:1"))
        self.assertTrue(alp_data.has_txo(f"{TXID3}:2"))
        # Fixme: improve ALP decoding to detect that this third output is a
        #        tokenless change output.
        self.assertTrue(alp_data.has_txo(f"{TXID3}:3"))
        # There is no such output
        self.assertFalse(alp_data.has_txo(f"{TXID3}:4"))

        # Token will be saved to storage
        alp_data.save()
        self.assertEqual(
            mock_wallet.storage.get("alp")["outpoints"], {TXID3: [1, 2, 3]}
        )

    def test_storage_has_tokens(self):
        mock_wallet = Mock()
        mock_wallet.storage = WalletStorage("dummy_path", in_memory_only=True)
        mock_wallet.storage.put(
            "alp",
            {
                "outpoints": {TXID1: [42, 1337], TXID2: [1, 2, 3]},
                "version": 1,
            },
        )
        # Make the wallet recognize all outputs as ours.
        mock_wallet.is_mine.return_value = True

        alp_data = alp.WalletData(mock_wallet)
        self.assertFalse(alp_data.needs_rebuild)
        self.assertTrue(alp_data.has_txo(f"{TXID1}:42"))
        self.assertTrue(alp_data.has_txo(f"{TXID1}:1337"))
        self.assertTrue(alp_data.has_txo(f"{TXID2}:1"))
        self.assertFalse(alp_data.has_txo(f"{TXID1}:1"))
        self.assertFalse(alp_data.has_txo(f"{TXID2}:42"))

        alp_data.rm_tx(TXID2)
        self.assertTrue(alp_data.has_txo(f"{TXID1}:1337"))
        self.assertFalse(alp_data.has_txo(f"{TXID2}:1"))
        self.assertFalse(alp_data.has_txo(f"{TXID2}:2"))
        self.assertFalse(alp_data.has_txo(f"{TXID2}:3"))

        alp_data.clear()
        self.assertEqual(alp_data.outpoints, {})
        self.assertFalse(alp_data.has_txo(f"{TXID1}:42"))

        alp_data.add_tx(TXID3, Transaction(bytes.fromhex(TX3)))
        # The first output is the OpReturn
        self.assertFalse(alp_data.has_txo(f"{TXID3}:0"))
        # The next two are alp tokens
        self.assertTrue(alp_data.has_txo(f"{TXID3}:1"))
        self.assertTrue(alp_data.has_txo(f"{TXID3}:2"))
        # Fixme: the next one is a tokenless change output
        self.assertTrue(alp_data.has_txo(f"{TXID3}:3"))
        # There is no such output
        self.assertFalse(alp_data.has_txo(f"{TXID3}:4"))

        # Adding the same transaction twice has no effect on the internal data.
        outpoints = alp_data.outpoints.copy()
        alp_data.add_tx(TXID3, Transaction(bytes.fromhex(TX3)))
        self.assertEqual(alp_data.outpoints, outpoints)


if __name__ == "__main__":
    unittest.main()
