#!/usr/bin/env python3
# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test mempool and mining priorities using high-sigops transactions, probing
how the virtualsize mechanism behaves.

This test assumes:
 -bytespersigop default is 50
 -blockmintxfee default is 1000
 -minrelaytxfee default is 1000
 -MEMPOOL_FULL_FEE_INCREMENT is 1000

based on mempool_limit.py
"""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.messages import (
    CBlock,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    FromHex,
    ToHex,
)
from test_framework.mininode import (
    P2PDataStore,
)
from test_framework.script import (
    OP_CHECKMULTISIG,
    OP_RETURN,
    OP_TRUE,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_raises_rpc_error,
    JSONRPCException
)

from decimal import Decimal
from collections import deque

SATOSHI = Decimal('0.00000001')

# Set test to run with sigops deactivation far in the future.
SIGOPS_DEACTIVATION_TIME = 2000000000


def create_var_transaction(spendfrom, custom_script, size_bytes, fee_sats):
    # Fund and sign a transaction to a given output, padding it to exactly
    # size = size_bytes and providing the given fee.
    # spendfrom should be a CTransaction with first output to OP_TRUE.

    customout = CTxOut(0, custom_script)
    # set output amount to required dust
    customout.nValue = (len(customout.serialize()) + 148) * 3

    ctx = CTransaction()
    ctx.vin.append(CTxIn(COutPoint(spendfrom.sha256, 0), b''))
    ctx.vout.append(
        CTxOut(spendfrom.vout[0].nValue - customout.nValue - fee_sats, bytes([OP_TRUE])))
    ctx.vout.append(customout)
    # two padding outputs
    ctx.vout.append(CTxOut(0, b''))
    ctx.vout.append(CTxOut(0, b''))

    size_without_padding = len(ctx.serialize())
    padding_needed = size_bytes - size_without_padding
    assert padding_needed >= 0, (size_bytes, size_without_padding)

    # Now insert padding. We need to be careful due to the flexible
    # var_int size.
    if padding_needed > 0xFFFF + 4:
        # We can fit all padding in one script.
        # 4 extra bytes will be used for var_int
        ctx.vout[2].scriptPubKey = bytes(
            [OP_RETURN]) * (padding_needed - 4)
        padding_needed = 0
    elif padding_needed >= 0xFD + 2:
        # We can pad most (probably all) using a script that is between
        # 253 and 65535 in length. Probably fit everything in one script.
        # 2 extra bytes will be used for var_int
        scriptsize = min(padding_needed - 2, 0xFFFF)
        ctx.vout[2].scriptPubKey = bytes([OP_RETURN]) * scriptsize
        padding_needed -= scriptsize + 2
    elif padding_needed >= 0xFD:
        # 0xFD or 0xFD+1. We can't pad with just one script, so just
        # take off some.
        ctx.vout[2].scriptPubKey = bytes([OP_RETURN]) * 50
        padding_needed -= 50

    # extra padding on another output is needed if original padding_needed
    # was <= 0xfd+1, or was 0xffff+3 or 0xffff+4 .
    assert padding_needed < 0xfd
    ctx.vout[3].scriptPubKey = bytes([OP_RETURN]) * padding_needed

    ctx.calc_sha256()
    assert_equal(len(ctx.serialize()), size_bytes)
    return ctx


class MempoolLimitSigopsTest(BitcoinTestFramework):

    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            ["-maxmempool=5", '-phononactivationtime={}'.format(SIGOPS_DEACTIVATION_TIME)]]
        self.block_heights = {}

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def getbestblock(self, node):
        """Get the best block. Register its height so we can use build_block."""
        block_height = node.getblockcount()
        blockhash = node.getblockhash(block_height)
        block = FromHex(CBlock(), node.getblock(blockhash, 0))
        block.calc_sha256()
        self.block_heights[block.sha256] = block_height
        return block

    def build_block(self, parent, transactions=(), nTime=None):
        """Make a new block with an OP_1 coinbase output.

        Requires parent to have its height registered."""
        parent.calc_sha256()
        block_height = self.block_heights[parent.sha256] + 1
        block_time = (parent.nTime + 1) if nTime is None else nTime

        block = create_block(
            parent.sha256, create_coinbase(block_height), block_time)
        block.nVersion = 4
        block.vtx.extend(transactions)
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        self.block_heights[block.sha256] = block_height
        return block

    def run_test(self):
        (node,) = self.nodes
        node.add_p2p_connection(P2PDataStore())

        tip = self.getbestblock(node)

        self.log.info("Create some blocks with OP_1 coinbase for spending.")
        blocks = []
        for _ in range(600):
            tip = self.build_block(tip)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node, success=True)
        self.spendable_outputs = deque(block.vtx[0] for block in blocks)

        self.log.info(
            "Mature the blocks and get out of IBD; also make some coinbases for the node wallet.")
        node.generate(120)

        tip = self.getbestblock(node)

        self.log.info(
            'PART 1: testing of priority under congestion (mempool eviction priority and mining priority).')

        self.log.info(
            "Put a regular transaction in mempool at 1 sat/byte.")
        txid1 = node.sendtoaddress(node.getnewaddress(), 0.001)

        self.log.info(
            "Mempool accepts 1 sat/byte txes even with very many sigops")
        script_4000_sigops = bytes([OP_CHECKMULTISIG] * 200)
        # vsize = 200000, so 0.0015 sat/vbyte.
        ctx = create_var_transaction(
            self.spendable_outputs.popleft(), script_4000_sigops, 300, 300)
        txid_parent = node.sendrawtransaction(ToHex(ctx))

        self.log.info(
            "Create a 1 sat/byte compensating child of a high-sigop parent")
        # package vsize = 200000, so 0.5015 sat/vbyte.
        ctx_child = create_var_transaction(
            ctx, b'', 100000, 100000)
        txid_child = node.sendrawtransaction(ToHex(ctx_child))

        # make one with 270 sat/byte, but only 0.4 sat/vbyte.
        ctx = create_var_transaction(
            self.spendable_outputs.popleft(), script_4000_sigops, 300, 80000)
        txid_highsigops = node.sendrawtransaction(ToHex(ctx))

        self.log.info(
            "Flood the mempool with 10-kB transactions @ 9.9 sat/byte and 0.495 sat/vbyte, until it is full")
        # About 500 should fill up our 5 MB mempool.
        # Note that even starting from an empty pool, somewhat fewer than 500
        # would be accepted depending on mempool data structure sizes.
        for i in range(500):
            spendfrom = self.spendable_outputs.popleft()
            ctx = create_var_transaction(
                spendfrom, script_4000_sigops, 10000, 99000)
            try:
                node.sendrawtransaction(ToHex(ctx))
            except JSONRPCException as e:
                if 'mempool full' in e.error['message'] or 'mempool min fee not met' in e.error['message']:
                    self.log.info(
                        "Mempool filled after {} transactions".format(i,))
                    break
                raise
        else:
            raise RuntimeError("didn't fill mempool")

        self.log.info(
            'The flooding only caused eviction of lower low sat/vbyte packages')

        mempool_txids = set(node.getrawmempool())

        # The 9.9 sat/byte txes caused the 270 sat/byte tx to get evicted, because
        # the latter was more dense in sigops.
        assert txid_highsigops not in mempool_txids

        # Other txes did get kept, including txid_parent which had ultralow
        # virtual feerate (but its child supplied enough fee).
        settxids = set([txid1, txid_parent, txid_child])
        assert_equal(settxids.difference(mempool_txids), set())

        self.log.info('Mempool fee floor has jumped to 1.495 sat/vbyte')
        # The removed txes have feerate 495 sat/kvbyte and the fee floor jumps by
        # 1000 sat/kbyte (MEMPOOL_FULL_FEE_INCREMENT) on top of that:
        assert_equal(node.getmempoolinfo()[
                     'mempoolminfee'], Decimal('0.00001495'))

        self.log.info(
            'Broadcasting a regular tx still works, because wallet knows what fee to use.')
        txid2 = node.sendtoaddress(node.getnewaddress(), 0.001)
        settxids.add(txid2)

        self.log.info(
            "But, a regular 1 sat/byte transaction can't get in now.")
        spendfrom = self.spendable_outputs.popleft()
        assert_raises_rpc_error(-26, "mempool min fee not met", node.sendrawtransaction,
                                ToHex(create_var_transaction(spendfrom, b'', 500, 500)))

        self.log.info(
            "Broadcasting regular transactions will push out the high-sigops txns.")
        # We can broadcast a bunch of regular txes. They need to pay a bit more
        # fee (1.5 sat/vbyte) than the floor.
        for i in range(15):
            spendfrom = self.spendable_outputs.popleft()
            ctx = create_var_transaction(spendfrom, b'', 100000, 150000)
            settxids.add(node.sendrawtransaction(ToHex(ctx)))

        self.log.info("Mining picks all the 'good' txes first")
        # These slightly higher-fee transactions also have more priority.
        [lastblockhash, ] = node.generate(1)
        blocktxes = set(node.getblock(lastblockhash, 1)['tx'])
        assert_equal(settxids.difference(blocktxes), set())
        # there are still hundreds of the flooded txes left in mempool.
        assert len(node.getrawmempool()) > 200

        self.log.info(
            'PART 2: The following tests focus on mineability according to blockmintxfee.')

        self.log.info('Clear the mempool by mining out everything.')
        node.generate(100)
        assert_equal(node.getrawmempool(), [])

        self.log.info(
            'Reset the mempool fee floor (currently, restarting the node achieves this).')
        # could also be done by setting mocktime in future (the floor decays
        # over a period of hours)
        self.restart_node(0, self.extra_args[0])
        (node,) = self.nodes
        node.add_p2p_connection(P2PDataStore())
        assert_equal(node.getmempoolinfo()[
                     'mempoolminfee'], Decimal('0.00001000'))

        self.log.info(
            'Get a 0.998 sat/byte transaction into mempool by having it mined then reorged out.')
        self.log.info(node.getbestblockhash())
        tip = self.getbestblock(node)
        self.log.info(tip.hash)
        ctx = create_var_transaction(
            self.spendable_outputs.popleft(), b'', 1000, 998)
        stucktxid = ctx.hash
        # check that indeed it can't get in normally:
        assert_raises_rpc_error(-26, "min relay fee not met",
                                node.sendrawtransaction, ToHex(ctx))
        block = self.build_block(tip, [ctx])
        node.p2p.send_blocks_and_test([block], node, success=True)
        node.invalidateblock(block.hash)
        assert stucktxid in node.getrawmempool(), "should be returned to pool"

        self.log.info(
            "Since blockmintxfee is 1 sat/byte, that 0.998 sat/byte tx won't get mined by default, and is stuck permanently.")
        node.generate(1)
        assert stucktxid in node.getrawmempool(), "should be stuck"

        self.log.info(
            'Get wallet to make an normal tx sending money to 12 people, which is just under 1 sat/vbyte.')
        txid = node.sendmany(
            "", {node.getnewaddress(): 0.01 for _ in range(12)})

        # analyze the constructed tx just to make sure it's as expected
        ctx = FromHex(CTransaction(), node.getrawtransaction(txid))
        assert len(ctx.vin) == 1, "only a single input should be needed"
        assert len(ctx.vout) == 13, "12 recipients and 1 change"
        # tx size should be ~ 599 bytes and fees should be 599 sats.
        # 13 sigops and 50 sigops / byte = 650 vbytes.
        txsize = len(ctx.serialize())
        txvsize = max(txsize, 50 * len(ctx.vout))
        assert txvsize > txsize, "transactions is dense-sigops"
        fee_sats = node.getmempoolentry(txid)['fee'] / SATOSHI
        assert_equal(fee_sats, 599)
        assert fee_sats / txsize >= 1.0, "just over 1 sat/byte"
        assert fee_sats / txvsize < 0.95, "just under 1 sat/vbyte"

        self.log.info(
            "Even though another transaction is stuck permanently, it should not prevent a normal tx from being mined.")
        [bhash, ] = node.generate(1)
        blocktxes = set(node.getblock(bhash, 1)['tx'])
        assert txid in blocktxes, "normal tx is not stuck"
        assert stucktxid not in blocktxes, "lowfee tx is still stuck"


if __name__ == '__main__':
    MempoolLimitSigopsTest().main()
