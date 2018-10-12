#!/usr/bin/env python3
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks that simple features of the magnetic anomaly fork
activates properly. More complex features are given their own tests.
"""

from test_framework.test_framework import ComparisonTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error
from test_framework.comptool import TestManager, TestInstance, RejectResult
from test_framework.blocktools import create_coinbase, create_block
from test_framework.mininode import *
from test_framework.script import *
from test_framework.cdefs import MIN_TX_SIZE
from collections import deque

# far into the future
MAGNETIC_ANOMALY_START_TIME = 2000000000
RPC_VERIFY_REJECTED = -26


class PreviousSpendableOutput():

    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        self.n = n  # the output we're spending


class MagneticAnomalyActivationTest(ComparisonTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        self.extra_args = [['-whitelist=127.0.0.1',
                            "-magneticanomalyactivationtime=%d" % MAGNETIC_ANOMALY_START_TIME,
                            "-replayprotectionactivationtime=%d" % (2 * MAGNETIC_ANOMALY_START_TIME)]]

    def run_test(self):
        self.test = TestManager(self, self.options.tmpdir)
        self.test.add_all_connections(self.nodes)
        # Start up network handling in another thread
        NetworkThread().start()
        # Set the blocksize to 2MB as initial condition
        self.nodes[0].setmocktime(MAGNETIC_ANOMALY_START_TIME)
        self.test.run()

    def add_transactions_to_block(self, block, tx_list):
        [tx.rehash() for tx in tx_list]
        block.vtx.extend(tx_list)

    def new_transaction(self, spend, tx_size=0, pushonly=True, cleanstack=True):
        tx = CTransaction()
        # Make sure we have plenty enough to spend going forward.
        spendable_outputs = deque([spend])

        # Spend from one of the spendable outputs
        spend = spendable_outputs.popleft()
        tx.vin.append(CTxIn(COutPoint(spend.tx.sha256, spend.n)))
        extra_ops = []
        if pushonly == False:
            extra_ops += [OP_TRUE, OP_DROP]
        if cleanstack == False:
            extra_ops += [OP_TRUE]
        tx.vin[0].scriptSig = CScript(extra_ops)

        # Add spendable outputs
        for i in range(2):
            tx.vout.append(CTxOut(0, CScript([OP_TRUE])))
            spendable_outputs.append(PreviousSpendableOutput(tx, i))

        # Put some random data into the transaction in order to randomize ids.
        if tx_size == 0:
            tx.vout.append(
                CTxOut(0, CScript([random.getrandbits(8), OP_RETURN])))
        else:
            # Create an input to pad the transaction.
            tx.vout.append(CTxOut(0, CScript([OP_RETURN])))

            # Estimate the size of the padding.
            push_size = tx_size - len(tx.serialize()) - 1

            # Because several field are of variable size, we grow the push slowly
            # up to the requested size.
            while len(tx.serialize()) < tx_size:
                # Ensure the padding has a left most bit on, so it's
                # exactly the correct number of bits.
                padding = random.randrange(
                    1 << 8 * push_size - 2, 1 << 8 * push_size - 1)
                tx.vout[2] = CTxOut(0, CScript([padding, OP_RETURN]))
                push_size += 1

            assert_equal(len(tx.serialize()), tx_size)

        tx.rehash()
        return tx

    def next_block(self, number, spend_tx=None):
        if self.tip == None:
            base_block_hash = self.genesis_hash
            import time
            block_time = int(time.time()) + 1
        else:
            base_block_hash = self.tip.sha256
            block_time = self.tip.nTime + 1
        # First create the coinbase
        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height)
        coinbase.rehash()
        if spend_tx == None:
            # We need to have something to spend to fill the block.
            block = create_block(base_block_hash, coinbase, block_time)
        else:
            # All but one satoshi to fees
            #coinbase.vout[0].nValue += spend.tx.vout[spend.n].nValue - 1
            coinbase.vout[0].nValue += spend_tx.vin[0].prevout.n - 1
            coinbase.rehash()
            block = create_block(base_block_hash, coinbase, block_time)

            # Add the transaction to the block
            self.add_transactions_to_block(block, [spend_tx])

            # Now that we added a bunch of transactions, we need to recompute
            # the merkle root.
            block.hashMerkleRoot = block.calc_merkle_root()

        # Do PoW, which is cheap on regnet
        block.solve()
        self.tip = block
        self.block_heights[block.sha256] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block

    def get_tests(self):
        node = self.nodes[0]
        self.genesis_hash = int(node.getbestblockhash(), 16)
        self.block_heights[self.genesis_hash] = 0
        spendable_outputs = []

        # save the current tip so it can be spent by a later block
        def save_spendable_output():
            spendable_outputs.append(self.tip)

        # get an output that we previously marked as spendable
        def get_spendable_output():
            return PreviousSpendableOutput(spendable_outputs.pop(0).vtx[0], 0)

        # returns a test case that asserts that the current tip was accepted
        def accepted():
            return TestInstance([[self.tip, True]])

        # returns a test case that asserts that the current tip was rejected
        def rejected(reject=None):
            if reject is None:
                return TestInstance([[self.tip, False]])
            else:
                return TestInstance([[self.tip, reject]])

        # move the tip back to a previous block
        def tip(number):
            self.tip = self.blocks[number]

        # adds transactions to the block and updates state
        def update_block(block_number, new_transactions=[]):
            block = self.blocks[block_number]
            self.add_transactions_to_block(block, new_transactions)
            old_sha256 = block.sha256
            block.hashMerkleRoot = block.calc_merkle_root()
            block.solve()
            # Update the internal state just like in next_block
            self.tip = block
            if block.sha256 != old_sha256:
                self.block_heights[block.sha256] = self.block_heights[old_sha256]
                del self.block_heights[old_sha256]
            self.blocks[block_number] = block
            return block

        # shorthand for functions
        block = self.next_block
        transaction = self.new_transaction

        # Create a new block
        block(0)
        save_spendable_output()
        yield accepted()

        # Now we need that block to mature so we can spend the coinbase.
        test = TestInstance(sync_every_block=False)
        for i in range(99):
            block(5000 + i)
            test.blocks_and_transactions.append([self.tip, True])
            save_spendable_output()
        yield test

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(100):
            out.append(get_spendable_output())

        # Let's build some blocks and test them.
        for i in range(15):
            n = i + 1
            block(n)
            yield accepted()

        # Start moving MTP forward
        bfork = block(5555)
        bfork.nTime = MAGNETIC_ANOMALY_START_TIME - 1
        update_block(5555)
        yield accepted()

        # Get to one block of the Nov 15, 2018 HF activation
        for i in range(5):
            block(5100 + i)
            test.blocks_and_transactions.append([self.tip, True])
        yield test

        # Check that the MTP is just before the configured fork point.
        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     MAGNETIC_ANOMALY_START_TIME - 1)

        # Check that block with small transactions, non push only signatures and
        # non clean stack are still accepted.
        small_tx_block = block(4444,
                               transaction(out[0], MIN_TX_SIZE - 1, pushonly=False, cleanstack=False))
        assert_equal(len(small_tx_block.vtx[1].serialize()), MIN_TX_SIZE - 1)
        yield accepted()

        # Now MTP is exactly the fork time. Small transaction are now rejected.
        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     MAGNETIC_ANOMALY_START_TIME)

        # Now that the for activated, it is not possible to have
        # small transactions anymore.
        small_tx_block = block(4445, transaction(out[1], MIN_TX_SIZE - 1))
        assert_equal(len(small_tx_block.vtx[1].serialize()), MIN_TX_SIZE - 1)
        yield rejected(RejectResult(16, b'bad-txns-undersize'))

        # Rewind bad block.
        tip(4444)

        # Now that the for activated, it is not possible to have
        # non push only transactions.
        non_pushonly_tx_block = block(4446,
                                      transaction(out[1], MIN_TX_SIZE, pushonly=False))
        yield rejected(RejectResult(16, b'blk-bad-inputs'))

        # Rewind bad block.
        tip(4444)

        # Now that the for activated, it is not possible to have
        # non clean stack transactions.
        non_cleanstack_tx_block = block(4447,
                                        transaction(out[1], MIN_TX_SIZE, cleanstack=False))
        yield rejected(RejectResult(16, b'blk-bad-inputs'))

        # Rewind bad block.
        tip(4444)

        # Verfiy that ATMP doesn't accept undersize transactions
        undersized_tx = transaction(out[1], MIN_TX_SIZE - 1)
        assert_raises_rpc_error(RPC_VERIFY_REJECTED, "bad-txns-undersize",
                                node.sendrawtransaction, ToHex(undersized_tx), True)

        # But large transactions are still ok.
        large_tx_block = block(3333, transaction(out[1], MIN_TX_SIZE))
        assert_equal(len(large_tx_block.vtx[1].serialize()), MIN_TX_SIZE)
        yield accepted()


if __name__ == '__main__':
    MagneticAnomalyActivationTest().main()
