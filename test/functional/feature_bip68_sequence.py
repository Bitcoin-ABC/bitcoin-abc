#!/usr/bin/env python3
# Copyright (c) 2014-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#
# Test BIP68 implementation
#

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import *
from test_framework.script import *
from test_framework.mininode import *
from test_framework.blocktools import *
from test_framework.txtools import pad_tx

SEQUENCE_LOCKTIME_DISABLE_FLAG = (1 << 31)
SEQUENCE_LOCKTIME_TYPE_FLAG = (1 << 22)  # this means use time (0 means height)
SEQUENCE_LOCKTIME_GRANULARITY = 9  # this is a bit-shift
SEQUENCE_LOCKTIME_MASK = 0x0000ffff

# RPC error for non-BIP68 final transactions
NOT_FINAL_ERROR = "64: non-BIP68-final"


class BIP68Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [["-blockprioritypercentage=0", "-noparkdeepreorg", "-maxreorgdepth=-1"],
                           ["-blockprioritypercentage=0", "-acceptnonstdtxn=0", "-maxreorgdepth=-1"]]

    def run_test(self):
        self.relayfee = self.nodes[0].getnetworkinfo()["relayfee"]

        # Generate some coins
        self.nodes[0].generate(110)

        self.log.info("Running test disable flag")
        self.test_disable_flag()

        self.log.info("Running test sequence-lock-confirmed-inputs")
        self.test_sequence_lock_confirmed_inputs()

        self.log.info("Running test sequence-lock-unconfirmed-inputs")
        self.test_sequence_lock_unconfirmed_inputs()

        self.log.info(
            "Running test BIP68 not consensus before versionbits activation")
        self.test_bip68_not_consensus()

        self.log.info("Verifying nVersion=2 transactions aren't standard")
        self.test_version2_relay(before_activation=True)

        self.log.info("Activating BIP68 (and 112/113)")
        self.activateCSV()

        self.log.info("Verifying nVersion=2 transactions are now standard")
        self.test_version2_relay(before_activation=False)

        self.log.info("Passed")

    # Test that BIP68 is not in effect if tx version is 1, or if
    # the first sequence bit is set.
    def test_disable_flag(self):
        # Create some unconfirmed inputs
        new_addr = self.nodes[0].getnewaddress()
        self.nodes[0].sendtoaddress(new_addr, 2)  # send 2 BTC

        utxos = self.nodes[0].listunspent(0, 0)
        assert(len(utxos) > 0)

        utxo = utxos[0]

        tx1 = CTransaction()
        value = int(satoshi_round(utxo["amount"] - self.relayfee) * COIN)

        # Check that the disable flag disables relative locktime.
        # If sequence locks were used, this would require 1 block for the
        # input to mature.
        sequence_value = SEQUENCE_LOCKTIME_DISABLE_FLAG | 1
        tx1.vin = [
            CTxIn(COutPoint(int(utxo["txid"], 16), utxo["vout"]), nSequence=sequence_value)]
        tx1.vout = [CTxOut(value, CScript([b'a']))]
        pad_tx(tx1)

        tx1_signed = self.nodes[0].signrawtransaction(ToHex(tx1))["hex"]
        tx1_id = self.nodes[0].sendrawtransaction(tx1_signed)
        tx1_id = int(tx1_id, 16)

        # This transaction will enable sequence-locks, so this transaction should
        # fail
        tx2 = CTransaction()
        tx2.nVersion = 2
        sequence_value = sequence_value & 0x7fffffff
        tx2.vin = [CTxIn(COutPoint(tx1_id, 0), nSequence=sequence_value)]
        tx2.vout = [CTxOut(int(value - self.relayfee * COIN), CScript([b'a']))]
        pad_tx(tx2)
        tx2.rehash()

        assert_raises_rpc_error(-26, NOT_FINAL_ERROR,
                                self.nodes[0].sendrawtransaction, ToHex(tx2))

        # Setting the version back down to 1 should disable the sequence lock,
        # so this should be accepted.
        tx2.nVersion = 1

        self.nodes[0].sendrawtransaction(ToHex(tx2))

    # Calculate the median time past of a prior block ("confirmations" before
    # the current tip).
    def get_median_time_past(self, confirmations):
        block_hash = self.nodes[0].getblockhash(
            self.nodes[0].getblockcount() - confirmations)
        return self.nodes[0].getblockheader(block_hash)["mediantime"]

    # Test that sequence locks are respected for transactions spending
    # confirmed inputs.
    def test_sequence_lock_confirmed_inputs(self):
        # Create lots of confirmed utxos, and use them to generate lots of random
        # transactions.
        max_outputs = 50
        addresses = []
        while len(addresses) < max_outputs:
            addresses.append(self.nodes[0].getnewaddress())
        while len(self.nodes[0].listunspent()) < 200:
            import random
            random.shuffle(addresses)
            num_outputs = random.randint(1, max_outputs)
            outputs = {}
            for i in range(num_outputs):
                outputs[addresses[i]] = random.randint(1, 20) * 0.01
            self.nodes[0].sendmany("", outputs)
            self.nodes[0].generate(1)

        utxos = self.nodes[0].listunspent()

        # Try creating a lot of random transactions.
        # Each time, choose a random number of inputs, and randomly set
        # some of those inputs to be sequence locked (and randomly choose
        # between height/time locking). Small random chance of making the locks
        # all pass.
        for i in range(400):
            # Randomly choose up to 10 inputs
            num_inputs = random.randint(1, 10)
            random.shuffle(utxos)

            # Track whether any sequence locks used should fail
            should_pass = True

            # Track whether this transaction was built with sequence locks
            using_sequence_locks = False

            tx = CTransaction()
            tx.nVersion = 2
            value = 0
            for j in range(num_inputs):
                sequence_value = 0xfffffffe  # this disables sequence locks

                # 50% chance we enable sequence locks
                if random.randint(0, 1):
                    using_sequence_locks = True

                    # 10% of the time, make the input sequence value pass
                    input_will_pass = (random.randint(1, 10) == 1)
                    sequence_value = utxos[j]["confirmations"]
                    if not input_will_pass:
                        sequence_value += 1
                        should_pass = False

                    # Figure out what the median-time-past was for the confirmed input
                    # Note that if an input has N confirmations, we're going back N blocks
                    # from the tip so that we're looking up MTP of the block
                    # PRIOR to the one the input appears in, as per the BIP68
                    # spec.
                    orig_time = self.get_median_time_past(
                        utxos[j]["confirmations"])
                    cur_time = self.get_median_time_past(0)  # MTP of the tip

                    # can only timelock this input if it's not too old --
                    # otherwise use height
                    can_time_lock = True
                    if ((cur_time - orig_time) >> SEQUENCE_LOCKTIME_GRANULARITY) >= SEQUENCE_LOCKTIME_MASK:
                        can_time_lock = False

                    # if time-lockable, then 50% chance we make this a time
                    # lock
                    if random.randint(0, 1) and can_time_lock:
                        # Find first time-lock value that fails, or latest one
                        # that succeeds
                        time_delta = sequence_value << SEQUENCE_LOCKTIME_GRANULARITY
                        if input_will_pass and time_delta > cur_time - orig_time:
                            sequence_value = (
                                (cur_time - orig_time) >> SEQUENCE_LOCKTIME_GRANULARITY)
                        elif (not input_will_pass and time_delta <= cur_time - orig_time):
                            sequence_value = (
                                (cur_time - orig_time) >> SEQUENCE_LOCKTIME_GRANULARITY) + 1
                        sequence_value |= SEQUENCE_LOCKTIME_TYPE_FLAG
                tx.vin.append(
                    CTxIn(COutPoint(int(utxos[j]["txid"], 16), utxos[j]["vout"]), nSequence=sequence_value))
                value += utxos[j]["amount"] * COIN
            # Overestimate the size of the tx - signatures should be less than
            # 120 bytes, and leave 50 for the output
            tx_size = len(ToHex(tx)) // 2 + 120 * num_inputs + 50
            tx.vout.append(
                CTxOut(int(value - self.relayfee * tx_size * COIN / 1000), CScript([b'a'])))
            rawtx = self.nodes[0].signrawtransaction(ToHex(tx))["hex"]

            if (using_sequence_locks and not should_pass):
                # This transaction should be rejected
                assert_raises_rpc_error(-26, NOT_FINAL_ERROR,
                                        self.nodes[0].sendrawtransaction, rawtx)
            else:
                # This raw transaction should be accepted
                self.nodes[0].sendrawtransaction(rawtx)
                utxos = self.nodes[0].listunspent()

    # Test that sequence locks on unconfirmed inputs must have nSequence
    # height or time of 0 to be accepted.
    # Then test that BIP68-invalid transactions are removed from the mempool
    # after a reorg.
    def test_sequence_lock_unconfirmed_inputs(self):
        # Store height so we can easily reset the chain at the end of the test
        cur_height = self.nodes[0].getblockcount()

        # Create a mempool tx.
        txid = self.nodes[0].sendtoaddress(self.nodes[0].getnewaddress(), 2)
        tx1 = FromHex(CTransaction(), self.nodes[0].getrawtransaction(txid))
        tx1.rehash()

        # As the fees are calculated prior to the transaction being signed,
        # there is some uncertainty that calculate fee provides the correct
        # minimal fee. Since regtest coins are free, let's go ahead and
        # increase the fee by an order of magnitude to ensure this test
        # passes.
        fee_multiplier = 10

        # Anyone-can-spend mempool tx.
        # Sequence lock of 0 should pass.
        tx2 = CTransaction()
        tx2.nVersion = 2
        tx2.vin = [CTxIn(COutPoint(tx1.sha256, 0), nSequence=0)]
        tx2.vout = [
            CTxOut(int(0), CScript([b'a']))]
        tx2.vout[0].nValue = tx1.vout[0].nValue - \
            fee_multiplier * self.nodes[0].calculate_fee(tx2)
        tx2_raw = self.nodes[0].signrawtransaction(ToHex(tx2))["hex"]
        tx2 = FromHex(tx2, tx2_raw)
        tx2.rehash()
        self.nodes[0].sendrawtransaction(tx2_raw)

        # Create a spend of the 0th output of orig_tx with a sequence lock
        # of 1, and test what happens when submitting.
        # orig_tx.vout[0] must be an anyone-can-spend output
        def test_nonzero_locks(orig_tx, node, use_height_lock):
            sequence_value = 1
            if not use_height_lock:
                sequence_value |= SEQUENCE_LOCKTIME_TYPE_FLAG

            tx = CTransaction()
            tx.nVersion = 2
            tx.vin = [
                CTxIn(COutPoint(orig_tx.sha256, 0), nSequence=sequence_value)]
            tx.vout = [
                CTxOut(int(orig_tx.vout[0].nValue - fee_multiplier * node.calculate_fee(tx)), CScript([b'a']))]
            pad_tx(tx)
            tx.rehash()

            if (orig_tx.hash in node.getrawmempool()):
                # sendrawtransaction should fail if the tx is in the mempool
                assert_raises_rpc_error(-26, NOT_FINAL_ERROR,
                                        node.sendrawtransaction, ToHex(tx))
            else:
                # sendrawtransaction should succeed if the tx is not in the mempool
                node.sendrawtransaction(ToHex(tx))

            return tx

        test_nonzero_locks(
            tx2, self.nodes[0], use_height_lock=True)
        test_nonzero_locks(
            tx2, self.nodes[0], use_height_lock=False)

        # Now mine some blocks, but make sure tx2 doesn't get mined.
        # Use prioritisetransaction to lower the effective feerate to 0
        self.nodes[0].prioritisetransaction(
            tx2.hash, -1e15, -fee_multiplier * self.nodes[0].calculate_fee(tx2))
        cur_time = int(time.time())
        for i in range(10):
            self.nodes[0].setmocktime(cur_time + 600)
            self.nodes[0].generate(1)
            cur_time += 600

        assert(tx2.hash in self.nodes[0].getrawmempool())

        test_nonzero_locks(
            tx2, self.nodes[0], use_height_lock=True)
        test_nonzero_locks(
            tx2, self.nodes[0], use_height_lock=False)

        # Mine tx2, and then try again
        self.nodes[0].prioritisetransaction(
            tx2.hash, 1e15, fee_multiplier * self.nodes[0].calculate_fee(tx2))

        # Advance the time on the node so that we can test timelocks
        self.nodes[0].setmocktime(cur_time + 600)
        self.nodes[0].generate(1)
        assert(tx2.hash not in self.nodes[0].getrawmempool())

        # Now that tx2 is not in the mempool, a sequence locked spend should
        # succeed
        tx3 = test_nonzero_locks(
            tx2, self.nodes[0], use_height_lock=False)
        assert(tx3.hash in self.nodes[0].getrawmempool())

        self.nodes[0].generate(1)
        assert(tx3.hash not in self.nodes[0].getrawmempool())

        # One more test, this time using height locks
        tx4 = test_nonzero_locks(
            tx3, self.nodes[0], use_height_lock=True)
        assert(tx4.hash in self.nodes[0].getrawmempool())

        # Now try combining confirmed and unconfirmed inputs
        tx5 = test_nonzero_locks(
            tx4, self.nodes[0], use_height_lock=True)
        assert(tx5.hash not in self.nodes[0].getrawmempool())

        utxos = self.nodes[0].listunspent()
        tx5.vin.append(
            CTxIn(COutPoint(int(utxos[0]["txid"], 16), utxos[0]["vout"]), nSequence=1))
        tx5.vout[0].nValue += int(utxos[0]["amount"] * COIN)
        raw_tx5 = self.nodes[0].signrawtransaction(ToHex(tx5))["hex"]

        assert_raises_rpc_error(-26, NOT_FINAL_ERROR,
                                self.nodes[0].sendrawtransaction, raw_tx5)

        # Test mempool-BIP68 consistency after reorg
        #
        # State of the transactions in the last blocks:
        # ... -> [ tx2 ] ->  [ tx3 ]
        #         tip-1        tip
        # And currently tx4 is in the mempool.
        #
        # If we invalidate the tip, tx3 should get added to the mempool, causing
        # tx4 to be removed (fails sequence-lock).
        self.nodes[0].invalidateblock(self.nodes[0].getbestblockhash())
        assert(tx4.hash not in self.nodes[0].getrawmempool())
        assert(tx3.hash in self.nodes[0].getrawmempool())

        # Now mine 2 empty blocks to reorg out the current tip (labeled tip-1 in
        # diagram above).
        # This would cause tx2 to be added back to the mempool, which in turn causes
        # tx3 to be removed.
        tip = int(self.nodes[0].getblockhash(
            self.nodes[0].getblockcount() - 1), 16)
        height = self.nodes[0].getblockcount()
        for i in range(2):
            block = create_block(tip, create_coinbase(height), cur_time)
            block.nVersion = 3
            block.rehash()
            block.solve()
            tip = block.sha256
            height += 1
            self.nodes[0].submitblock(ToHex(block))
            cur_time += 1

        mempool = self.nodes[0].getrawmempool()
        assert(tx3.hash not in mempool)
        assert(tx2.hash in mempool)

        # Reset the chain and get rid of the mocktimed-blocks
        self.nodes[0].setmocktime(0)
        self.nodes[0].invalidateblock(
            self.nodes[0].getblockhash(cur_height + 1))
        self.nodes[0].generate(10)

    def get_csv_status(self):
        softforks = self.nodes[0].getblockchaininfo()['softforks']
        for sf in softforks:
            if sf['id'] == 'csv' and sf['version'] == 5:
                return sf['reject']['status']
        raise AssertionError('Cannot find CSV fork activation informations')

    # Make sure that BIP68 isn't being used to validate blocks, prior to
    # versionbits activation.  If more blocks are mined prior to this test
    # being run, then it's possible the test has activated the soft fork, and
    # this test should be moved to run earlier, or deleted.
    def test_bip68_not_consensus(self):
        assert_equal(self.get_csv_status(), False)
        txid = self.nodes[0].sendtoaddress(self.nodes[0].getnewaddress(), 2)

        tx1 = FromHex(CTransaction(), self.nodes[0].getrawtransaction(txid))
        tx1.rehash()

        # Make an anyone-can-spend transaction
        tx2 = CTransaction()
        tx2.nVersion = 1
        tx2.vin = [CTxIn(COutPoint(tx1.sha256, 0), nSequence=0)]
        tx2.vout = [
            CTxOut(int(tx1.vout[0].nValue - self.relayfee * COIN), CScript([b'a']))]

        # sign tx2
        tx2_raw = self.nodes[0].signrawtransaction(ToHex(tx2))["hex"]
        tx2 = FromHex(tx2, tx2_raw)
        pad_tx(tx2)
        tx2.rehash()

        self.nodes[0].sendrawtransaction(ToHex(tx2))

        # Now make an invalid spend of tx2 according to BIP68
        sequence_value = 100  # 100 block relative locktime

        tx3 = CTransaction()
        tx3.nVersion = 2
        tx3.vin = [CTxIn(COutPoint(tx2.sha256, 0), nSequence=sequence_value)]
        tx3.vout = [
            CTxOut(int(tx2.vout[0].nValue - self.relayfee * COIN), CScript([b'a']))]
        pad_tx(tx3)
        tx3.rehash()

        assert_raises_rpc_error(-26, NOT_FINAL_ERROR,
                                self.nodes[0].sendrawtransaction, ToHex(tx3))

        # make a block that violates bip68; ensure that the tip updates
        tip = int(self.nodes[0].getbestblockhash(), 16)
        block = create_block(
            tip, create_coinbase(self.nodes[0].getblockcount() + 1))
        block.nVersion = 3
        block.vtx.extend(
            sorted([tx1, tx2, tx3], key=lambda tx: tx.get_id()))
        block.hashMerkleRoot = block.calc_merkle_root()
        block.rehash()
        block.solve()

        self.nodes[0].submitblock(ToHex(block))
        assert_equal(self.nodes[0].getbestblockhash(), block.hash)

    def activateCSV(self):
        # activation should happen at block height 576
        csv_activation_height = 576
        height = self.nodes[0].getblockcount()
        assert_greater_than(csv_activation_height - height, 1)
        self.nodes[0].generate(csv_activation_height - height - 1)
        assert_equal(self.get_csv_status(), False)
        disconnect_nodes(self.nodes[0], self.nodes[1])
        self.nodes[0].generate(1)
        assert_equal(self.get_csv_status(), True)
        # We have a block that has CSV activated, but we want to be at
        # the activation point, so we invalidate the tip.
        self.nodes[0].invalidateblock(self.nodes[0].getbestblockhash())
        connect_nodes(self.nodes[0], self.nodes[1])
        sync_blocks(self.nodes)

    # Use self.nodes[1] to test standardness relay policy
    def test_version2_relay(self, before_activation):
        inputs = []
        outputs = {self.nodes[1].getnewaddress(): 1.0}
        rawtx = self.nodes[1].createrawtransaction(inputs, outputs)
        rawtxfund = self.nodes[1].fundrawtransaction(rawtx)['hex']
        tx = FromHex(CTransaction(), rawtxfund)
        tx.nVersion = 2
        tx_signed = self.nodes[1].signrawtransaction(ToHex(tx))["hex"]
        try:
            self.nodes[1].sendrawtransaction(tx_signed)
            assert(before_activation == False)
        except:
            assert(before_activation)


if __name__ == '__main__':
    BIP68Test().main()
