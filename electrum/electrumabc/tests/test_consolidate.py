import math
import unittest
from unittest.mock import Mock

from .. import consolidate
from ..address import Address

TEST_ADDRESS: Address = Address.from_string(
    "ecash:qr3l6uufcuwm9prgpa6cfxnez87fzstxesp7ugp0ez"
)

FEERATE: int = 1
"""Satoshis per byte"""


class TestConsolidateCoinSelection(unittest.TestCase):
    def setUp(self) -> None:
        coins = {}
        tx_history = []
        i = 0
        for is_coinbase in (True, False):
            for is_frozen_coin in (True, False):
                for slp in (None, "not None"):
                    coins[f"dummy_txid:{i}"] = {
                        "address": TEST_ADDRESS,
                        "prevout_n": i,
                        "prevout_hash": "a" * 64,
                        "height": 700_000 + i,
                        "value": 1000 + i,
                        "coinbase": is_coinbase,
                        "is_frozen_coin": is_frozen_coin,
                        "slp_token": slp,
                        "type": "p2pkh",
                    }
                    i += 1  # noqa: SIM113
                tx_history.append(("a" * 64, 1))

        self.mock_wallet = Mock()
        self.mock_wallet.is_schnorr_enabled.return_value = False
        self.mock_wallet.get_addr_utxo.return_value = coins
        self.mock_wallet.get_address_history.return_value = tx_history
        self.mock_wallet.get_address_history.return_value = tx_history
        self.mock_wallet.get_txin_type.return_value = "p2pkh"

        # mock for self.wallet.txo.get(tx_hash, {}).get(address, [])
        # returns list of (prevout_n, value, is_coinbase)
        self.mock_wallet.txo = Mock()
        txo_get_return = Mock()
        txo_get_return.get.return_value = [
            (
                i,
                1000 + i,
                True,
            )
            for i in range(len(coins))
        ]
        self.mock_wallet.txo.get.return_value = txo_get_return

        self.mock_wallet.get_address_index.return_value = True, 0

        self.mock_wallet.keystore.get_xpubkey.return_value = "dummy"

    def test_coin_selection(self) -> None:
        for incl_coinbase in (True, False):
            for incl_noncoinbase in (True, False):
                for incl_frozen in (True, False):
                    for incl_slp in (True, False):
                        consolidator = consolidate.AddressConsolidator(
                            TEST_ADDRESS,
                            self.mock_wallet,
                            incl_coinbase,
                            incl_noncoinbase,
                            incl_frozen,
                            incl_slp,
                        )
                        for coin in consolidator._coins:
                            if not incl_coinbase:
                                self.assertFalse(coin["coinbase"])
                            if not incl_noncoinbase:
                                self.assertTrue(coin["coinbase"])
                            if not incl_frozen:
                                self.assertFalse(coin["is_frozen_coin"])
                            if not incl_slp:
                                self.assertIsNone(coin["slp_token"])

        # test minimum and maximum value
        consolidator = consolidate.AddressConsolidator(
            TEST_ADDRESS,
            self.mock_wallet,
            True,
            True,
            True,
            True,
            min_value_sats=1003,
            max_value_sats=None,
        )
        for coin in consolidator._coins:
            self.assertGreaterEqual(coin["value"], 1003)
        self.assertEqual(len(consolidator._coins), 5)

        consolidator = consolidate.AddressConsolidator(
            TEST_ADDRESS,
            self.mock_wallet,
            True,
            True,
            True,
            True,
            min_value_sats=None,
            max_value_sats=1005,
        )
        for coin in consolidator._coins:
            self.assertLessEqual(coin["value"], 1005)
        self.assertEqual(len(consolidator._coins), 6)

        consolidator = consolidate.AddressConsolidator(
            TEST_ADDRESS,
            self.mock_wallet,
            True,
            True,
            True,
            True,
            min_value_sats=1003,
            max_value_sats=1005,
        )
        for coin in consolidator._coins:
            self.assertGreaterEqual(coin["value"], 1003)
            self.assertLessEqual(coin["value"], 1005)
        self.assertEqual(len(consolidator._coins), 3)

        # test minimum and maximum height
        consolidator = consolidate.AddressConsolidator(
            TEST_ADDRESS,
            self.mock_wallet,
            True,
            True,
            True,
            True,
            min_height=None,
            max_height=700_005,
        )
        for coin in consolidator._coins:
            self.assertLessEqual(coin["height"], 700_005)
        self.assertEqual(len(consolidator._coins), 6)

        consolidator = consolidate.AddressConsolidator(
            TEST_ADDRESS,
            self.mock_wallet,
            True,
            True,
            True,
            True,
            min_height=700_003,
            max_height=None,
        )
        for coin in consolidator._coins:
            self.assertGreaterEqual(coin["height"], 700_003)
        self.assertEqual(len(consolidator._coins), 5)

        consolidator = consolidate.AddressConsolidator(
            TEST_ADDRESS,
            self.mock_wallet,
            True,
            True,
            True,
            True,
            min_height=700_003,
            max_height=700_005,
        )
        for coin in consolidator._coins:
            self.assertGreaterEqual(coin["height"], 700_003)
            self.assertLessEqual(coin["height"], 700_005)
        self.assertEqual(len(consolidator._coins), 3)

        # Filter both on height and value
        consolidator = consolidate.AddressConsolidator(
            TEST_ADDRESS,
            self.mock_wallet,
            True,
            True,
            True,
            True,
            min_value_sats=1004,
            max_value_sats=1006,
            min_height=700_003,
            max_height=700_005,
        )
        for coin in consolidator._coins:
            self.assertGreaterEqual(coin["value"], 1003)
            self.assertLessEqual(coin["value"], 1006)
            self.assertGreaterEqual(coin["height"], 700_003)
            self.assertLessEqual(coin["height"], 700_005)
        self.assertEqual(len(consolidator._coins), 2)

    def test_get_unsigned_transactions_schnorr(self):
        self._test_get_unsigned_transactions(sign_schnorr=True)

    def test_get_unsigned_transactions_ecdsa(self):
        self._test_get_unsigned_transactions(sign_schnorr=False)

    def _test_get_unsigned_transactions(self, sign_schnorr: bool):
        self.mock_wallet.is_schnorr_enabled.return_value = sign_schnorr

        n_coins = 8
        min_value = 1000
        max_value = 1007
        for max_tx_size in range(200, 1500, 100):
            # select all coins
            consolidator = consolidate.AddressConsolidator(
                TEST_ADDRESS,
                self.mock_wallet,
                True,
                True,
                True,
                True,
                min_value_sats=None,
                max_value_sats=None,
                output_address=TEST_ADDRESS,
                max_tx_size=max_tx_size,
            )
            self.assertEqual(n_coins, len(consolidator._coins))
            txs = consolidator.get_unsigned_transactions()
            for tx in txs:
                self.assertLess(tx.estimated_size(), max_tx_size)

            # txid(32) + prevout_n(4) + compact_size (1) + scriptsig + sequence (4)
            # with scriptsig: compact_size(1) + pubkey(33) + compact_size(1) + sig
            # with sig 65 (schnorr) or ~72 (ecdsa)
            input_approx_size = 148 if not sign_schnorr else 141
            # tx size is: input_size * n_in + 34 * n_out + 10
            # with n_out = 1 for consolidation transactions
            expected_max_n_inputs_for_size = math.floor(
                (max_tx_size - 44) / input_approx_size
            )
            self.assertEqual(
                len(txs), math.ceil(n_coins / expected_max_n_inputs_for_size)
            )

            # Check the fee and amount
            total_input_value = 0
            total_output_value = 0
            total_fee = 0
            total_size = 0
            for tx in txs:
                tx_size = tx.estimated_size()
                self.assertEqual(tx.get_fee(), tx_size * FEERATE)
                total_fee += tx.get_fee()
                total_input_value += tx.input_value()
                total_output_value += tx.output_value()
                total_size += tx_size
            self.assertEqual(total_input_value, sum(range(min_value, max_value + 1)))
            self.assertEqual(total_output_value, total_input_value - total_fee)
            self.assertEqual(total_fee, total_size * FEERATE)


if __name__ == "__main__":
    unittest.main()
