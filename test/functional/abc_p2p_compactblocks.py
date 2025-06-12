# Copyright (c) 2015-2016 The Bitcoin Core developers
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks simple acceptance of bigger blocks via p2p.
It is derived from the much more complex p2p-fullblocktest.
The intention is that small tests can be derived from this one, or
this one can be extended, to cover the checks done for bigger blocks
(e.g. sigCheck limits).
"""

import random
import time
from collections import deque

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.cdefs import ONE_MEGABYTE
from test_framework.messages import (
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    HeaderAndShortIDs,
    msg_cmpctblock,
    msg_sendcmpct,
    ser_compact_size,
)
from test_framework.p2p import P2PDataStore, P2PInterface, p2p_lock
from test_framework.script import OP_RETURN, OP_TRUE, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal


class PreviousSpendableOutput:
    def __init__(self, tx=CTransaction(), n=-1):
        self.tx = tx
        # the output we're spending
        self.n = n


# TestP2PConn: A peer we use to send messages to bitcoind, and store responses.
class TestP2PConn(P2PInterface):
    def __init__(self):
        self.last_sendcmpct = None
        self.last_cmpctblock = None
        self.last_getheaders = None
        self.last_headers = None
        super().__init__()

    def on_sendcmpct(self, message):
        self.last_sendcmpct = message

    def on_cmpctblock(self, message):
        self.last_cmpctblock = message

    def on_getheaders(self, message):
        self.last_getheaders = message

    def on_headers(self, message):
        self.last_headers = message

    def clear_block_data(self):
        with p2p_lock:
            self.last_sendcmpct = None
            self.last_cmpctblock = None


class FullBlockTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        self.excessive_block_size = 16 * ONE_MEGABYTE
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-maxmempool=99999",
                f"-excessiveblocksize={self.excessive_block_size}",
                "-acceptnonstdtxn=1",
            ]
        ]
        # UBSAN will cause this test to timeout without this.
        self.rpc_timeout = 180

    def add_transactions_to_block(self, block, tx_list):
        block.vtx.extend(tx_list)

    def next_block(
        self, number, spend=None, script=CScript([OP_TRUE]), block_size=0, extra_txns=0
    ):
        if self.tip is None:
            base_block_hash = self.genesis_hash
            block_time = int(time.time()) + 1
        else:
            base_block_hash = self.tip.hash_int
            block_time = self.tip.nTime + 1
        # First create the coinbase
        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height)
        if spend is None:
            # We need to have something to spend to fill the block.
            assert_equal(block_size, 0)
            block = create_block(base_block_hash, coinbase, block_time)
        else:
            # all but one satoshi to fees
            coinbase.vout[0].nValue += spend.tx.vout[spend.n].nValue - 1
            block = create_block(base_block_hash, coinbase, block_time)

            # Make sure we have plenty enough to spend going forward.
            spendable_outputs = deque([spend])

            def get_base_transaction():
                # Create the new transaction
                tx = CTransaction()
                # Spend from one of the spendable outputs
                spend = spendable_outputs.popleft()
                tx.vin.append(CTxIn(COutPoint(spend.tx.txid_int, spend.n)))
                # Add spendable outputs
                for i in range(4):
                    tx.vout.append(CTxOut(0, CScript([OP_TRUE])))
                    spendable_outputs.append(PreviousSpendableOutput(tx, i))
                pad_tx(tx)
                return tx

            tx = get_base_transaction()

            # If a specific script is required, add it.
            if script is not None:
                tx.vout.append(CTxOut(1, script))

            # Put some random data into the first transaction of the chain to
            # randomize ids.
            tx.vout.append(CTxOut(0, CScript([random.randint(0, 256), OP_RETURN])))

            # Add the transaction to the block
            self.add_transactions_to_block(block, [tx])

            # Add transaction until we reach the expected transaction count
            for _ in range(extra_txns):
                self.add_transactions_to_block(block, [get_base_transaction()])

            # If we have a block size requirement, just fill
            # the block until we get there
            current_block_size = len(block.serialize())
            overage_bytes = 0
            while current_block_size < block_size:
                # We will add a new transaction. That means the size of
                # the field enumerating how many transaction go in the block
                # may change.
                current_block_size -= len(ser_compact_size(len(block.vtx)))
                current_block_size += len(ser_compact_size(len(block.vtx) + 1))

                # Add padding to fill the block.
                left_to_fill = block_size - current_block_size

                # Don't go over the 1 mb limit for a txn
                if left_to_fill > 500000:
                    # Make sure we eat up non-divisible by 100 amounts quickly
                    # Also keep transaction less than 1 MB
                    left_to_fill = 500000 + left_to_fill % 100

                # Create the new transaction
                tx = get_base_transaction()
                pad_tx(tx, left_to_fill - overage_bytes)
                if len(tx.serialize()) + current_block_size > block_size:
                    # Our padding was too big try again
                    overage_bytes += 1
                    continue

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
        self.block_heights[block.hash_int] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block

    def run_test(self):
        node = self.nodes[0]
        default_p2p = node.add_p2p_connection(P2PDataStore())
        test_p2p = node.add_p2p_connection(TestP2PConn())

        self.genesis_hash = int(node.getbestblockhash(), 16)
        self.block_heights[self.genesis_hash] = 0
        spendable_outputs = []

        # save the current tip so it can be spent by a later block
        def save_spendable_output():
            spendable_outputs.append(self.tip)

        # get an output that we previously marked as spendable
        def get_spendable_output():
            return PreviousSpendableOutput(spendable_outputs.pop(0).vtx[0], 0)

        # shorthand for functions
        block = self.next_block

        # Create a new block
        block(0)
        save_spendable_output()
        default_p2p.send_blocks_and_test([self.tip], node)

        # Now we need that block to mature so we can spend the coinbase.
        maturity_blocks = []
        for i in range(99):
            block(5000 + i)
            maturity_blocks.append(self.tip)
            save_spendable_output()

        # Get to one block of the May 15, 2018 HF activation
        for i in range(6):
            block(5100 + i)
            maturity_blocks.append(self.tip)

        # Send it all to the node at once.
        default_p2p.send_blocks_and_test(maturity_blocks, node)

        # collect spendable outputs now to avoid cluttering the code later on
        out = []
        for i in range(100):
            out.append(get_spendable_output())

        # Check that compact block also work for big blocks
        # Wait for SENDCMPCT
        def received_sendcmpct():
            return test_p2p.last_sendcmpct is not None

        self.wait_until(received_sendcmpct, timeout=30)

        test_p2p.send_and_ping(msg_sendcmpct(announce=True, version=1))

        # Exchange headers
        def received_getheaders():
            return test_p2p.last_getheaders is not None

        self.wait_until(received_getheaders, timeout=30)

        # Return the favor
        test_p2p.send_message(test_p2p.last_getheaders)

        # Wait for the header list
        def received_headers():
            return test_p2p.last_headers is not None

        self.wait_until(received_headers, timeout=30)

        # It's like we know about the same headers !
        test_p2p.send_message(test_p2p.last_headers)

        # Send a block
        b1 = block(1, spend=out[0], block_size=ONE_MEGABYTE + 1)
        default_p2p.send_blocks_and_test([self.tip], node)

        # Checks the node to forward it via compact block
        def received_block():
            return test_p2p.last_cmpctblock is not None

        self.wait_until(received_block, timeout=30)

        # Was it our block ?
        cmpctblk_header = test_p2p.last_cmpctblock.header_and_shortids.header
        assert cmpctblk_header.hash_int == b1.hash_int

        # Send a large block with numerous transactions.
        test_p2p.clear_block_data()
        b2 = block(
            2,
            spend=out[1],
            extra_txns=70000,
            block_size=self.excessive_block_size - 1000,
        )
        default_p2p.send_blocks_and_test([self.tip], node)

        # Checks the node forwards it via compact block
        self.wait_until(received_block, timeout=30)

        # Was it our block ?
        cmpctblk_header = test_p2p.last_cmpctblock.header_and_shortids.header
        assert cmpctblk_header.hash_int == b2.hash_int

        # In order to avoid having to resend a ton of transactions, we invalidate
        # b2, which will send all its transactions in the mempool. Note that this
        # assumes reorgs will insert low-fee transactions back into the
        # mempool.
        node.invalidateblock(node.getbestblockhash())

        # Let's send a compact block and see if the node accepts it.
        # Let's modify b2 and use it so that we can reuse the mempool.
        tx = b2.vtx[0]
        tx.vout.append(CTxOut(0, CScript([random.randint(0, 256), OP_RETURN])))
        b2.vtx[0] = tx
        b2.hashMerkleRoot = b2.calc_merkle_root()
        b2.solve()

        # Now we create the compact block and send it
        comp_block = HeaderAndShortIDs()
        comp_block.initialize_from_block(b2)
        test_p2p.send_and_ping(msg_cmpctblock(comp_block.to_p2p()))

        # Check that compact block is received properly
        assert int(node.getbestblockhash(), 16) == b2.hash_int


if __name__ == "__main__":
    FullBlockTest().main()
