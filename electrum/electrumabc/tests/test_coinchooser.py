import unittest

from .. import coinchooser
from ..address import Address
from ..bitcoin import TYPE_ADDRESS, ScriptType
from ..transaction import OutPoint, TxInput, TxOutput
from ..uint256 import UInt256
from ..util import NotEnoughFunds

DUMMY_OUTPOINT = OutPoint(UInt256(b"\x01" * 32), 0)

ADDR1 = Address.from_string("ecash:qrh3ethkfms79tlcw7m736t38hp9kg5f7gycxeymme")
ADDR2 = Address.from_string("ecash:qzdf44zy632zk4etztvmaqav0y2cest4evtph9jyf4")


def get_txinput(value=1000, height=1000, address=ADDR1) -> TxInput:
    return TxInput.from_keys(
        DUMMY_OUTPOINT,
        0,
        ScriptType.p2pkh,
        num_required_sigs=1,
        x_pubkeys=[b""],
        pubkeys=[b""],
        signatures=[b""],
        address=address,
        value=value,
        height=height,
    )


class TestCoinChooser(unittest.TestCase):
    def setUp(self) -> None:
        self.coinchooser = coinchooser.CoinChooserPrivacy()

    def test_bucketize_coins_by_address(self):
        coins = [
            get_txinput(address=ADDR1, value=1_000),
            get_txinput(address=ADDR1, value=2_000),
            get_txinput(address=ADDR2, value=100_000),
        ]
        buckets = self.coinchooser.bucketize_coins(coins)

        self.assertEqual(len(buckets), 2)
        self.assertTrue(any(b.value == 3_000 for b in buckets))
        self.assertTrue(any(b.value == 100_000 for b in buckets))

        for b in buckets:
            if len(b.coins) == 2:
                self.assertTrue(all(c.address == ADDR1 for c in b.coins))
            else:
                self.assertEqual(len(b.coins), 1)
                self.assertEqual(b.coins[0].address, ADDR2)

    def test_choose_buckets(self):
        coins = [
            # bucket 1
            get_txinput(address=ADDR1, value=1_000, height=0),
            get_txinput(address=ADDR1, value=2_000),
            # bucket 2
            get_txinput(address=ADDR2, value=100_000),
        ]

        original_buckets = self.coinchooser.bucketize_coins(coins)

        # Deterministic randomness from coins
        utxos = [str(c.outpoint) for c in coins]
        self.coinchooser.p = coinchooser.PRNG("".join(sorted(utxos)))

        def penalty_function(buckets):
            return 0

        # bucket 2 will be picked, because it has enough funds and all confirmed
        # transactions
        def sufficient_funds(buckets):
            return sum(bucket.value for bucket in buckets) > 1500

        buckets = self.coinchooser.choose_buckets(
            original_buckets, sufficient_funds, penalty_function
        )

        self.assertEqual(len(buckets), 1)
        self.assertEqual(len(buckets[0].coins), 1)
        self.assertEqual(buckets[0].coins[0].address, ADDR2)

        # both buckets are needed if the amount is larger than bucket 2's value
        def sufficient_funds(buckets):
            return sum(bucket.value for bucket in buckets) > 100_001

        buckets = self.coinchooser.choose_buckets(
            original_buckets, sufficient_funds, penalty_function
        )

        self.assertEqual(len(buckets), 2)

        # insufficient funds
        def sufficient_funds(buckets):
            return sum(bucket.value for bucket in buckets) > 103_001

        with self.assertRaises(NotEnoughFunds):
            self.coinchooser.choose_buckets(
                original_buckets, sufficient_funds, penalty_function
            )

    def test_make_tx(self):
        # same test as test_choose_buckets but via make_tx

        def fee_estimator(tx_size):
            """1 sat/byte fee estimator"""
            return tx_size

        coins = [
            # bucket 1
            get_txinput(address=ADDR1, value=1_000, height=0),
            get_txinput(address=ADDR1, value=2_000),
            # bucket 2
            get_txinput(address=ADDR2, value=100_000),
        ]
        change_addrs = [ADDR2]

        # Enough confirmed coins (bucket 2)
        output = TxOutput(TYPE_ADDRESS, ADDR1, 1500)

        tx = self.coinchooser.make_tx(coins, [output], change_addrs, fee_estimator)
        self.assertEqual(len(tx.txinputs()), 1)
        self.assertEqual(tx.txinputs()[0].get_value(), 100_000)

        # Need also unconfirmed coin
        output = TxOutput(TYPE_ADDRESS, ADDR1, 100_001)

        tx = self.coinchooser.make_tx(coins, [output], change_addrs, fee_estimator)
        self.assertEqual(len(tx.txinputs()), 3)

        # insufficient funds
        output = TxOutput(TYPE_ADDRESS, ADDR1, 103_001)
        with self.assertRaises(NotEnoughFunds):
            self.coinchooser.make_tx(coins, [output], change_addrs, fee_estimator)


if __name__ == "__main__":
    unittest.main()
