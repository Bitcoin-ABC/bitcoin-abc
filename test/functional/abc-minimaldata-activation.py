#!/usr/bin/env python3
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This tests the activation of MINIMALDATA rule to consensus (from standard).
- test rejection in mempool, with error changing before/after activation.
- test acceptance in blocks before activation, and rejection after.
- check non-banning for peers who send invalid txns that would have been valid
on the other side of the upgrade.

Derived from abc-schnorr.py
"""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    create_transaction,
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
    CScript,
    OP_ADD,
    OP_TRUE,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, assert_raises_rpc_error

# the upgrade activation time, which we artificially set far into the future
GRAVITON_START_TIME = 2000000000

# If we don't do this, autoreplay protection will activate before graviton and
# all our sigs will mysteriously fail.
REPLAY_PROTECTION_START_TIME = GRAVITON_START_TIME * 2


# Both before and after the upgrade, minimal push violations are rejected as
# nonstandard. After the upgrade they are actually invalid, but we get the
# same error since MINIMALDATA is internally marked as a "standardness" flag.
MINIMALPUSH_ERROR = 'non-mandatory-script-verify-flag (Data push larger than necessary)'

# Blocks with invalid scripts give this error:
BADINPUTS_ERROR = 'blk-bad-inputs'


class SchnorrTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.block_heights = {}
        self.extra_args = [["-gravitonactivationtime={}".format(
            GRAVITON_START_TIME),
            "-replayprotectionactivationtime={}".format(
            REPLAY_PROTECTION_START_TIME)]]

    def bootstrap_p2p(self, *, num_connections=1):
        """Add a P2P connection to the node.

        Helper to connect and wait for version handshake."""
        for _ in range(num_connections):
            self.nodes[0].add_p2p_connection(P2PDataStore())

    def reconnect_p2p(self, **kwargs):
        """Tear down and bootstrap the P2P connection to the node.

        The node gets disconnected several times in this test. This helper
        method reconnects the p2p and restarts the network thread."""
        self.nodes[0].disconnect_p2ps()
        self.bootstrap_p2p(**kwargs)

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
        block.vtx.extend(transactions)
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        self.block_heights[block.sha256] = block_height
        return block

    def check_for_ban_on_rejected_tx(self, tx, reject_reason=None):
        """Check we are disconnected when sending a txn that the node rejects.

        (Can't actually get banned, since bitcoind won't ban local peers.)"""
        self.nodes[0].p2p.send_txs_and_test(
            [tx], self.nodes[0], success=False, expect_disconnect=True, reject_reason=reject_reason)
        self.reconnect_p2p()

    def check_for_no_ban_on_rejected_tx(self, tx, reject_reason):
        """Check we are not disconnected when sending a txn that the node rejects."""
        self.nodes[0].p2p.send_txs_and_test(
            [tx], self.nodes[0], success=False, reject_reason=reject_reason)

    def check_for_ban_on_rejected_block(self, block, reject_reason=None):
        """Check we are disconnected when sending a block that the node rejects.

        (Can't actually get banned, since bitcoind won't ban local peers.)"""
        self.nodes[0].p2p.send_blocks_and_test(
            [block], self.nodes[0], success=False, reject_reason=reject_reason, expect_disconnect=True)
        self.reconnect_p2p()

    def run_test(self):
        node, = self.nodes

        self.bootstrap_p2p()

        tip = self.getbestblock(node)

        self.log.info("Create some blocks with OP_1 coinbase for spending.")
        blocks = []
        for _ in range(10):
            tip = self.build_block(tip)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node, success=True)
        spendable_outputs = [block.vtx[0] for block in blocks]

        self.log.info("Mature the blocks and get out of IBD.")
        node.generate(100)

        tip = self.getbestblock(node)

        self.log.info("Setting up spends to test and mining the fundings.")
        fundings = []

        def create_fund_and_spend_tx():
            spendfrom = spendable_outputs.pop()

            script = CScript([OP_ADD])

            value = spendfrom.vout[0].nValue

            # Fund transaction
            txfund = create_transaction(spendfrom, 0, b'', value, script)
            txfund.rehash()
            fundings.append(txfund)

            # Spend transaction
            txspend = CTransaction()
            txspend.vout.append(
                CTxOut(value-1000, CScript([OP_TRUE])))
            txspend.vin.append(
                CTxIn(COutPoint(txfund.sha256, 0), b''))

            # Sign the transaction
            txspend.vin[0].scriptSig = CScript(
                b'\x01\x01\x51')  # PUSH1(0x01) OP_1
            pad_tx(txspend)
            txspend.rehash()

            return txspend

        # make a few of these, which are nonstandard before upgrade and invalid after.
        nonminimaltx = create_fund_and_spend_tx()
        nonminimaltx_2 = create_fund_and_spend_tx()
        nonminimaltx_3 = create_fund_and_spend_tx()

        tip = self.build_block(tip, fundings)
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info("Start preupgrade tests")

        self.log.info("Sending rejected transactions via RPC")
        assert_raises_rpc_error(-26, MINIMALPUSH_ERROR,
                                node.sendrawtransaction, ToHex(nonminimaltx))
        assert_raises_rpc_error(-26, MINIMALPUSH_ERROR,
                                node.sendrawtransaction, ToHex(nonminimaltx_2))
        assert_raises_rpc_error(-26, MINIMALPUSH_ERROR,
                                node.sendrawtransaction, ToHex(nonminimaltx_3))

        self.log.info(
            "Sending rejected transactions via net (no banning)")
        self.check_for_no_ban_on_rejected_tx(
            nonminimaltx, MINIMALPUSH_ERROR)
        self.check_for_no_ban_on_rejected_tx(
            nonminimaltx_2, MINIMALPUSH_ERROR)
        self.check_for_no_ban_on_rejected_tx(
            nonminimaltx_3, MINIMALPUSH_ERROR)

        assert_equal(node.getrawmempool(), [])

        self.log.info("Successfully mine nonstandard transaction")
        tip = self.build_block(tip, [nonminimaltx])
        node.p2p.send_blocks_and_test([tip], node)

        # Activation tests

        self.log.info("Approach to just before upgrade activation")
        # Move our clock to the uprade time so we will accept such future-timestamped blocks.
        node.setmocktime(GRAVITON_START_TIME)
        # Mine six blocks with timestamp starting at GRAVITON_START_TIME-1
        blocks = []
        for i in range(-1, 5):
            tip = self.build_block(tip, nTime=GRAVITON_START_TIME + i)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node)
        assert_equal(node.getblockchaininfo()[
                     'mediantime'], GRAVITON_START_TIME - 1)

        self.log.info(
            "Mine the activation block itself, including a minimaldata violation at the last possible moment")
        tip = self.build_block(tip, [nonminimaltx_2])
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info("We have activated!")
        assert_equal(node.getblockchaininfo()[
                     'mediantime'], GRAVITON_START_TIME)

        self.log.info(
            "Trying to mine a minimaldata violation, but we are just barely too late")
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [nonminimaltx_3]), BADINPUTS_ERROR)
        self.log.info(
            "If we try to submit it by mempool or RPC we still aren't banned")
        assert_raises_rpc_error(-26, MINIMALPUSH_ERROR,
                                node.sendrawtransaction, ToHex(nonminimaltx_3))
        self.check_for_no_ban_on_rejected_tx(
            nonminimaltx_3, MINIMALPUSH_ERROR)

        self.log.info("Mine a normal block")
        tip = self.build_block(tip)
        node.p2p.send_blocks_and_test([tip], node)


if __name__ == '__main__':
    SchnorrTest().main()
