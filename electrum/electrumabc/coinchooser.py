#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2020-2023 The Electrum ABC developers
# Copyright (C) 2015 kyuupichan@gmail
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
from math import floor, log10
from typing import Dict, List, Optional

from .bitcoin import CASH, TYPE_ADDRESS
from .crypto import sha256
from .printerror import PrintError
from .transaction import DUST_THRESHOLD, Transaction, TxInput, TxOutput
from .util import NotEnoughFunds


# A simple deterministic PRNG.  Used to deterministically shuffle a
# set of coins - the same set of coins should produce the same output.
# Although choosing UTXOs "randomly" we want it to be deterministic,
# so if sending twice from the same UTXO set we choose the same UTXOs
# to spend.  This prevents attacks on users by malicious or stale
# servers.
class PRNG:
    def __init__(self, seed):
        self.sha = sha256(seed)
        self.pool = bytearray()

    def get_bytes(self, n):
        while len(self.pool) < n:
            self.pool.extend(self.sha)
            self.sha = sha256(self.sha)
        result, self.pool = self.pool[:n], self.pool[n:]
        return result

    def randint(self, start, end):
        # Returns random integer in [start, end)
        n = end - start
        r = 0
        p = 1
        while p < n:
            r = self.get_bytes(1)[0] + (r << 8)
            p = p << 8
        return start + (r % n)

    def choice(self, seq):
        return seq[self.randint(0, len(seq))]

    def shuffle(self, x):
        for i in reversed(range(1, len(x))):
            # pick an element in x[:i+1] with which to exchange x[i]
            j = self.randint(0, i + 1)
            x[i], x[j] = x[j], x[i]


class Bucket:
    """Coins with a same address are grouped in buckets. The coinchooser algorithm
    then picks enough buckets to cover the required amount.
    As a result, all coins belonging to a same address are always spent together.
    """

    def __init__(self, desc: str):
        self.desc = desc
        """A descriptor common to all coins in this bucket. Currently it is the address.
        """

        self.size: int = 0
        self.value: int = 0
        self.coins: List[TxInput] = []
        self.min_height: Optional[int] = None

    def add_coin(self, coin: TxInput, sign_schnorr=False):
        self.coins.append(coin)
        self.value += coin.get_value()
        self.size += coin.size(sign_schnorr)
        self.min_height = (
            min(self.min_height, coin.height)
            if self.min_height is not None
            else coin.height
        )


def strip_unneeded(bkts, sufficient_funds):
    """Remove buckets that are unnecessary in achieving the spend amount"""
    bkts = sorted(bkts, key=lambda bkt: bkt.value)
    for i in range(len(bkts)):
        if not sufficient_funds(bkts[i + 1 :]):
            return bkts[i:]
    # Shouldn't get here
    return bkts


class CoinChooserBase(PrintError):
    def bucketize_coins(self, coins: List[TxInput], sign_schnorr=False) -> List[Bucket]:
        buckets: Dict[str, Bucket] = {}
        for coin in coins:
            address = coin.address.to_cashaddr()
            if address not in buckets:
                buckets[address] = Bucket(address)
            buckets[address].add_coin(coin, sign_schnorr)

        return list(buckets.values())

    def penalty_func(self, tx):
        def penalty(candidate):
            return 0

        return penalty

    def change_amounts(self, tx: Transaction, count, fee_estimator) -> List[int]:
        """Return a list of at most `count` change amounts.
        This method attempts to break up the change amount into multiple sub-amounts
        that are not significantly larger than the largest non-change output for this
        transaction."""
        # Break change up if bigger than max_change
        output_amounts = [o.value for o in tx.outputs()]
        # Don't split change of less than 20 000 XEC
        max_change = max(max(output_amounts) * 1.25, 20000 * CASH)

        # Use N change outputs
        for n in range(1, count + 1):
            # How much is left if we add this many change outputs?
            change_amount = max(0, tx.get_fee() - fee_estimator(n))
            if change_amount // n <= max_change:
                break

        # Get a handle on the precision of the output amounts; round our
        # change to look similar
        def trailing_zeroes(val):
            s = str(val)
            return len(s) - len(s.rstrip("0"))

        zeroes = [trailing_zeroes(i) for i in output_amounts]
        min_zeroes = min(zeroes)
        max_zeroes = max(zeroes)
        zeroes = range(max(0, min_zeroes - 1), (max_zeroes + 1) + 1)

        # Calculate change; randomize it a bit if using more than 1 output
        remaining = change_amount
        amounts = []
        while n > 1:
            average = remaining / n
            amount = self.p.randint(int(average * 0.7), int(average * 1.3))
            precision = min(self.p.choice(zeroes), int(floor(log10(amount))))
            amount = int(round(amount, -precision))
            amounts.append(amount)
            remaining -= amount
            n -= 1

        # Last change output.  Round down to maximum precision but lose
        # no more than 100 satoshis to fees (2dp)
        N = pow(10, min(2, zeroes[0]))
        amount = (remaining // N) * N
        amounts.append(amount)

        assert sum(amounts) <= change_amount

        return amounts

    def change_outputs(self, tx, change_addrs, fee_estimator) -> List[TxOutput]:
        amounts = self.change_amounts(tx, len(change_addrs), fee_estimator)
        assert min(amounts) >= 0
        assert len(change_addrs) >= len(amounts)
        # If change is above dust threshold add it to the transaction.
        amounts = [amount for amount in amounts if amount >= DUST_THRESHOLD]
        change = [
            TxOutput(TYPE_ADDRESS, addr, amount)
            for addr, amount in zip(change_addrs, amounts)
        ]
        return change

    def make_tx(
        self,
        coins: List[TxInput],
        outputs: List[TxOutput],
        change_addrs,
        fee_estimator,
        sign_schnorr=False,
    ) -> Transaction:
        """Select unspent coins to spend to pay outputs.  If the change is
        greater than dust_threshold (after adding the change output to
        the transaction) it is kept, otherwise none is sent and it is
        added to the transaction fee."""

        # Deterministic randomness from coins
        utxos = [str(c.outpoint) for c in coins]
        self.p = PRNG("".join(sorted(utxos)))

        # Copy the outputs so when adding change we don't modify "outputs"
        tx = Transaction.from_io([], outputs, sign_schnorr=sign_schnorr)
        # Size of the transaction with no inputs and no change
        base_size = tx.estimated_size()
        spent_amount = tx.output_value()

        def sufficient_funds(buckets):
            """Given a list of buckets, return True if it has enough
            value to pay for the transaction"""
            total_input = sum(bucket.value for bucket in buckets)
            total_size = sum(bucket.size for bucket in buckets) + base_size
            return total_input >= spent_amount + fee_estimator(total_size)

        # Collect the coins into buckets, choose a subset of the buckets
        buckets = self.bucketize_coins(coins, sign_schnorr=sign_schnorr)
        buckets = self.choose_buckets(buckets, sufficient_funds, self.penalty_func(tx))

        for b in buckets:
            tx.add_inputs(b.coins)
        tx_size = base_size + sum(bucket.size for bucket in buckets)

        # This takes a count of change outputs and returns a tx fee;
        # each pay-to-bitcoin-address output serializes as 34 bytes
        def fee(count):
            return fee_estimator(tx_size + count * 34)

        change = self.change_outputs(tx, change_addrs, fee)
        tx.add_outputs(change)

        self.print_error("using %d inputs" % len(tx.txinputs()))
        self.print_error("using buckets:", [bucket.desc for bucket in buckets])

        return tx

    def choose_buckets(self, buckets, sufficient_funds, penalty_func):
        raise NotImplementedError("To be subclassed")


class CoinChooserRandom(CoinChooserBase):
    def bucket_candidates_any(self, buckets, sufficient_funds):
        """Returns a list of bucket sets."""
        if not buckets:
            raise NotEnoughFunds()

        candidates = set()

        # Add all singletons
        for n, bucket in enumerate(buckets):
            if sufficient_funds([bucket]):
                candidates.add((n,))

        # And now some random ones
        attempts = min(100, (len(buckets) - 1) * 10 + 1)
        permutation = list(range(len(buckets)))
        for i in range(attempts):
            # Get a random permutation of the buckets, and
            # incrementally combine buckets until sufficient
            self.p.shuffle(permutation)
            bkts = []
            for count, index in enumerate(permutation):
                bkts.append(buckets[index])
                if sufficient_funds(bkts):
                    candidates.add(tuple(sorted(permutation[: count + 1])))
                    break
            else:
                raise NotEnoughFunds()

        candidates = [[buckets[n] for n in c] for c in candidates]
        return [strip_unneeded(c, sufficient_funds) for c in candidates]

    def bucket_candidates_prefer_confirmed(self, buckets, sufficient_funds):
        """Returns a list of bucket sets preferring confirmed coins.

        Any bucket can be:
        1. "confirmed" if it only contains confirmed coins; else
        2. "unconfirmed" if it does not contain coins with unconfirmed parents
        3. "unconfirmed parent" otherwise

        This method tries to only use buckets of type 1, and if the coins there
        are not enough, tries to use the next type but while also selecting
        all buckets of all previous types.
        """
        conf_buckets = [bkt for bkt in buckets if bkt.min_height > 0]
        unconf_buckets = [bkt for bkt in buckets if bkt.min_height == 0]
        unconf_par_buckets = [bkt for bkt in buckets if bkt.min_height == -1]

        bucket_sets = [conf_buckets, unconf_buckets, unconf_par_buckets]
        already_selected_buckets = []

        for bkts_choose_from in bucket_sets:
            try:

                def sfunds(bkts):
                    return sufficient_funds(already_selected_buckets + bkts)

                candidates = self.bucket_candidates_any(bkts_choose_from, sfunds)
                break
            except NotEnoughFunds:
                already_selected_buckets += bkts_choose_from
        else:
            raise NotEnoughFunds()

        candidates = [(already_selected_buckets + c) for c in candidates]
        return [strip_unneeded(c, sufficient_funds) for c in candidates]

    def choose_buckets(self, buckets, sufficient_funds, penalty_func):
        candidates = self.bucket_candidates_prefer_confirmed(buckets, sufficient_funds)
        penalties = [penalty_func(cand) for cand in candidates]
        winner = candidates[penalties.index(min(penalties))]
        self.print_error("Bucket sets:", len(buckets))
        self.print_error("Winning penalty:", min(penalties))
        return winner


class CoinChooserPrivacy(CoinChooserRandom):
    """Attempts to better preserve user privacy.  First, if any coin is
    spent from a user address, all coins are.  Compared to spending
    from other addresses to make up an amount, this reduces
    information leakage about sender holdings.  It also helps to
    reduce blockchain UTXO bloat, and reduce future privacy loss that
    would come from reusing that address' remaining UTXOs.  Second, it
    penalizes change that is quite different to the sent amount.
    Third, it penalizes change that is too big."""

    def penalty_func(self, tx: Transaction):
        min_change = min(o.value for o in tx.outputs()) * 0.75
        max_change = max(o.value for o in tx.outputs()) * 1.33
        spent_amount = sum(o.value for o in tx.outputs())

        def penalty(buckets):
            badness = len(buckets) - 1
            total_input = sum(bucket.value for bucket in buckets)
            # FIXME "change" here also includes fees
            change = float(total_input - spent_amount)
            # Penalize change not roughly in output range
            if change < min_change:
                badness += (min_change - change) / (min_change + 10000)
            elif change > max_change:
                badness += (change - max_change) / (max_change + 10000)
                # Penalize large change; 5 BTC excess ~= using 1 more input
                badness += change / (CASH * 5000000)
            return badness

        return penalty


COIN_CHOOSERS = {
    "Privacy": CoinChooserPrivacy,
}


def get_name(config):
    kind = config.get("coin_chooser")
    if kind not in COIN_CHOOSERS:
        kind = "Privacy"
    return kind
