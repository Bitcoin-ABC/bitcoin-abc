#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks simple acceptance of bigger blocks via p2p.
It is derived from the much more complex p2p-fullblocktest.
The intention is that small tests can be derived from this one, or
this one can be extended, to cover the checks done for bigger blocks
(e.g. sigops limits).
"""

from collections import deque
import random
import time

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    create_tx_with_script,
    make_conform_to_ctor,
)
from test_framework.cdefs import (
    ONE_MEGABYTE,
)
from test_framework.messages import (
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    ser_compact_size,
    ToHex,
)
from test_framework.mininode import P2PDataStore
from test_framework.script import (
    CScript,
    OP_RETURN,
    OP_TRUE,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class PreviousSpendableOutput():

    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        # the output we're spending
        self.n = n


class FullBlockTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        self.excessive_block_size = 100 * ONE_MEGABYTE
        self.extra_args = [['-whitelist=127.0.0.1',
                            "-excessiveblocksize={}".format(self.excessive_block_size)]]

    def add_options(self, parser):
        super().add_options(parser)
        parser.add_argument(
            "--runbarelyexpensive", dest="runbarelyexpensive", default=True)

    def add_transactions_to_block(self, block, tx_list):
        [tx.rehash() for tx in tx_list]
        block.vtx.extend(tx_list)

    # this is a little handier to use than the version in blocktools.py
    def create_tx(self, spend, value, script=CScript([OP_TRUE])):
        tx = create_tx_with_script(spend.tx, spend.n, b"", value, script)
        return tx

    def next_block(self, number, spend=None,
                   script=CScript([OP_TRUE]), block_size=0):
        if self.tip is None:
            base_block_hash = self.genesis_hash
            block_time = int(time.time()) + 1
        else:
            base_block_hash = self.tip.sha256
            block_time = self.tip.nTime + 1
        # First create the coinbase
        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height)
        coinbase.rehash()
        if spend is None:
            # We need to have something to spend to fill the block.
            assert_equal(block_size, 0)
            block = create_block(base_block_hash, coinbase, block_time)
        else:
            # all but one satoshi to fees
            coinbase.vout[0].nValue += spend.tx.vout[spend.n].nValue - 1
            coinbase.rehash()
            block = create_block(base_block_hash, coinbase, block_time)

            # Make sure we have plenty engough to spend going forward.
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
                return tx

            tx = get_base_transaction()

            # Make it the same format as transaction added for padding and save the size.
            # It's missing the padding output, so we add a constant to account
            # for it.
            tx.rehash()
            base_tx_size = len(tx.serialize()) + 18

            # If a specific script is required, add it.
            if script is not None:
                tx.vout.append(CTxOut(1, script))

            # Put some random data into the first transaction of the chain to
            # randomize ids.
            tx.vout.append(
                CTxOut(0, CScript([random.randint(0, 256), OP_RETURN])))

            # Add the transaction to the block
            self.add_transactions_to_block(block, [tx])

            # If we have a block size requirement, just fill
            # the block until we get there
            current_block_size = len(block.serialize())
            while current_block_size < block_size:
                # We will add a new transaction. That means the size of
                # the field enumerating how many transaction go in the block
                # may change.
                current_block_size -= len(ser_compact_size(len(block.vtx)))
                current_block_size += len(ser_compact_size(len(block.vtx) + 1))

                # Create the new transaction
                tx = get_base_transaction()

                # Add padding to fill the block.
                script_length = block_size - current_block_size - base_tx_size
                if script_length > 510000:
                    if script_length < 1000000:
                        # Make sure we don't find ourselves in a position where we
                        # need to generate a transaction smaller than what we
                        # expected.
                        script_length = script_length // 2
                    else:
                        script_length = 500000
                script_pad_len = script_length
                script_output = CScript([b'\x00' * script_pad_len])
                tx.vout.append(CTxOut(0, script_output))

                # Add the tx to the list of transactions to be included
                # in the block.
                self.add_transactions_to_block(block, [tx])
                current_block_size += len(tx.serialize())

            # Now that we added a bunch of transaction, we need to recompute
            # the merkle root.
            make_conform_to_ctor(block)
            block.hashMerkleRoot = block.calc_merkle_root()

        # Check that the block size is what's expected
        if block_size > 0:
            assert_equal(len(block.serialize()), block_size)

        # Do PoW, which is cheap on regnet
        block.solve()
        self.tip = block
        self.block_heights[block.sha256] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block

    def run_test(self):
        node = self.nodes[0]
        node.add_p2p_connection(P2PDataStore())

        # Set the blocksize to 2MB as initial condition
        node.setexcessiveblock(self.excessive_block_size)

        self.genesis_hash = int(node.getbestblockhash(), 16)
        self.block_heights[self.genesis_hash] = 0
        spendable_outputs = []

        # save the current tip so it can be spent by a later block
        def save_spendable_output():
            spendable_outputs.append(self.tip)

        # get an output that we previously marked as spendable
        def get_spendable_output():
            return PreviousSpendableOutput(spendable_outputs.pop(0).vtx[0], 0)

        # move the tip back to a previous block
        def tip(number):
            self.tip = self.blocks[number]

        # adds transactions to the block and updates state
        def update_block(block_number, new_transactions):
            block = self.blocks[block_number]
            self.add_transactions_to_block(block, new_transactions)
            old_sha256 = block.sha256
            make_conform_to_ctor(block)
            block.hashMerkleRoot = block.calc_merkle_root()
            block.solve()
            # Update the internal state just like in next_block
            self.tip = block
            if block.sha256 != old_sha256:
                self.block_heights[
                    block.sha256] = self.block_heights[old_sha256]
                del self.block_heights[old_sha256]
            self.blocks[block_number] = block
            return block

        # shorthand for functions
        block = self.next_block

        # Create a new block
        block(0)
        save_spendable_output()
        node.p2p.send_blocks_and_test([self.tip], node)

        # Now we need that block to mature so we can spend the coinbase.
        maturity_blocks = []
        for i in range(99):
            block(5000 + i)
            maturity_blocks.append(self.tip)
            save_spendable_output()
        node.p2p.send_blocks_and_test(maturity_blocks, node)

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(100):
            out.append(get_spendable_output())

        # Let's build some blocks and test them.
        for i in range(16):
            n = i + 1
            block(n, spend=out[i], block_size=n * ONE_MEGABYTE)
            node.p2p.send_blocks_and_test([self.tip], node)

        # block of maximal size
        block(17, spend=out[16], block_size=self.excessive_block_size)
        node.p2p.send_blocks_and_test([self.tip], node)

        # Reject oversized blocks with bad-blk-length error
        block(18, spend=out[17], block_size=self.excessive_block_size + 1)
        node.p2p.send_blocks_and_test(
            [self.tip], node, success=False, reject_reason='bad-blk-length')

        # Rewind bad block.
        tip(17)

        # Submit a very large block via RPC
        large_block = block(
            33, spend=out[17], block_size=self.excessive_block_size)
        assert_equal(node.submitblock(ToHex(large_block)), None)


if __name__ == '__main__':
    FullBlockTest().main()
