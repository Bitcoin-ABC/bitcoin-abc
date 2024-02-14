# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks that the node software accepts transactions in
non topological order once the feature is activated.
"""

import random
import time
from collections import deque

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_RETURN, OP_TRUE, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class PreviousSpendableOutput:
    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        self.n = n  # the output we're spending


class TransactionOrderingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        self.extra_args = [["-whitelist=noban@127.0.0.1"]]

    def add_transactions_to_block(self, block, tx_list):
        [tx.rehash() for tx in tx_list]
        block.vtx.extend(tx_list)

    def next_block(self, number, spend=None, tx_count=0):
        if self.tip is None:
            base_block_hash = self.genesis_hash
            block_time = int(time.time()) + 1
        else:
            base_block_hash = self.tip.sha256
            block_time = self.tip.nTime + 1
        # First create the coinbase
        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height)
        if spend is None:
            # We need to have something to spend to fill the block.
            block = create_block(base_block_hash, coinbase, block_time)
        else:
            # all but one satoshi to fees
            coinbase.vout[0].nValue += spend.tx.vout[spend.n].nValue - 1
            coinbase.rehash()
            block = create_block(base_block_hash, coinbase, block_time)

            # Make sure we have plenty enough to spend going forward.
            spendable_outputs = deque([spend])

            def get_base_transaction():
                # Create the new transaction
                tx = CTransaction()
                # Spend from one of the spendable outputs
                spend = spendable_outputs.popleft()
                tx.vin.append(CTxIn(COutPoint(spend.tx.sha256, spend.n)))
                # Add spendable outputs
                for i in range(4):
                    tx.vout.append(CTxOut(0, CScript([OP_TRUE])))
                    spendable_outputs.append(PreviousSpendableOutput(tx, i))
                # Put some random data into the transaction in order to randomize ids.
                # This also ensures that transaction are larger than 100 bytes.
                rand = random.getrandbits(256)
                tx.vout.append(CTxOut(0, CScript([rand, OP_RETURN])))
                return tx

            tx = get_base_transaction()

            # Make it the same format as transaction added for padding and save the size.
            # It's missing the padding output, so we add a constant to account
            # for it.
            tx.rehash()

            # Add the transaction to the block
            self.add_transactions_to_block(block, [tx])

            # If we have a transaction count requirement, just fill the block
            # until we get there
            while len(block.vtx) < tx_count:
                # Create the new transaction and add it.
                tx = get_base_transaction()
                self.add_transactions_to_block(block, [tx])

            # Now that we added a bunch of transaction, we need to recompute
            # the merkle root.
            block.hashMerkleRoot = block.calc_merkle_root()

        if tx_count > 0:
            assert_equal(len(block.vtx), tx_count)

        # Do PoW, which is cheap on regnet
        block.solve()
        self.tip = block
        self.block_heights[block.sha256] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block

    def set_tip(self, number: int):
        """
        Move the tip back to a previous block.
        """
        self.tip = self.blocks[number]

    def run_test(self):
        node = self.nodes[0]
        peer = node.add_p2p_connection(P2PDataStore())

        self.genesis_hash = int(node.getbestblockhash(), 16)
        self.block_heights[self.genesis_hash] = 0
        spendable_outputs = []

        # save the current tip so it can be spent by a later block
        def save_spendable_output():
            spendable_outputs.append(self.tip)

        # get an output that we previously marked as spendable
        def get_spendable_output():
            return PreviousSpendableOutput(spendable_outputs.pop(0).vtx[0], 0)

        # update block state
        def update_block(block_number):
            block = self.blocks[block_number]
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

        # Create a new block
        block(0)
        save_spendable_output()
        peer.send_blocks_and_test([self.tip], node)

        # Now we need that block to mature so we can spend the coinbase.
        maturity_blocks = []
        for i in range(99):
            block(5000 + i)
            maturity_blocks.append(self.tip)
            save_spendable_output()
        peer.send_blocks_and_test(maturity_blocks, node)

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(100):
            out.append(get_spendable_output())

        # Let's build some blocks and test them.
        for i in range(17):
            n = i + 1
            peer.send_blocks_and_test([block(n)], node)

        peer.send_blocks_and_test([block(5556)], node)

        # Block with regular ordering are now rejected.
        peer.send_blocks_and_test(
            [block(5557, out[17], tx_count=16)],
            node,
            success=False,
            reject_reason="tx-ordering",
        )

        # Rewind bad block.
        self.set_tip(5556)

        # After we activate the Nov 15, 2018 HF, transaction order is enforced.
        def ordered_block(block_number, spend):
            b = block(block_number, spend=spend, tx_count=16)
            make_conform_to_ctor(b)
            update_block(block_number)
            return b

        # Now that the fork activated, we need to order transaction per txid.
        peer.send_blocks_and_test([ordered_block(4445, out[17])], node)
        peer.send_blocks_and_test([ordered_block(4446, out[18])], node)

        # Generate a block with a duplicated transaction.
        double_tx_block = ordered_block(4447, out[19])
        assert_equal(len(double_tx_block.vtx), 16)
        double_tx_block.vtx = (
            double_tx_block.vtx[:8] + [double_tx_block.vtx[8]] + double_tx_block.vtx[8:]
        )
        update_block(4447)
        peer.send_blocks_and_test(
            [self.tip], node, success=False, reject_reason="bad-txns-duplicate"
        )

        # Rewind bad block.
        self.set_tip(4446)

        # Check over two blocks.
        proper_block = ordered_block(4448, out[20])
        peer.send_blocks_and_test([self.tip], node)

        replay_tx_block = ordered_block(4449, out[21])
        assert_equal(len(replay_tx_block.vtx), 16)
        replay_tx_block.vtx.append(proper_block.vtx[5])
        replay_tx_block.vtx = [replay_tx_block.vtx[0]] + sorted(
            replay_tx_block.vtx[1:], key=lambda tx: tx.get_id()
        )
        update_block(4449)
        peer.send_blocks_and_test(
            [self.tip], node, success=False, reject_reason="bad-txns-BIP30"
        )


if __name__ == "__main__":
    TransactionOrderingTest().main()
