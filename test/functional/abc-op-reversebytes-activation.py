#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks the activation logic of OP_REVERSEBYTES.
Derived from both abc-schnorrmultisig-activation.py (see https://reviews.bitcoinabc.org/D3736) and
abc-schnorrmultisig.py
"""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    create_tx_with_script,
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
    OP_EQUAL,
    OP_REVERSEBYTES,
    OP_RETURN,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


# The upgrade activation time, which we artificially set far into the future.
PHONON_START_TIME = 2000000000


# Blocks with invalid scripts give this error:
BAD_INPUTS_ERROR = 'blk-bad-inputs'

# Pre-upgrade, we get a BAD_OPCODE error
PRE_UPGRADE_BAD_OPCODE_ERROR = \
    'upgrade-conditional-script-failure (Opcode missing or not understood)'


class OpReversebytesActivationTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.block_heights = {}
        self.extra_args = [
            ["-phononactivationtime={}".format(PHONON_START_TIME)]]

    def bootstrap_p2p(self, *, num_connections=1):
        """Add a P2P connection to the node.

        Helper to connect and wait for version handshake."""
        for _ in range(num_connections):
            self.nodes[0].add_p2p_connection(P2PDataStore())
        self.nodes[0].p2p.wait_for_verack()

    def reconnect_p2p(self, **kwargs):
        """Tear down and bootstrap the P2P connection to the node.

        The node gets disconnected several times in this test. This helper
        method reconnects the p2p and restarts the network thread."""
        self.nodes[0].disconnect_p2ps()
        self.bootstrap_p2p(**kwargs)

    def get_best_block(self, node):
        """Get the best block. Register its height so we can use build_block."""
        block_height = node.getblockcount()
        blockhash = node.getblockhash(block_height)
        block = FromHex(CBlock(), node.getblock(blockhash, 0))
        block.calc_sha256()
        self.block_heights[block.sha256] = block_height
        return block

    def build_block(self, parent, transactions=(), n_time=None):
        """Make a new block with an OP_1 coinbase output.

        Requires parent to have its height registered."""
        parent.calc_sha256()
        block_height = self.block_heights[parent.sha256] + 1
        block_time = (parent.nTime + 1) if n_time is None else n_time

        block = create_block(
            parent.sha256, create_coinbase(block_height), block_time)
        block.vtx.extend(transactions)
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        self.block_heights[block.sha256] = block_height
        return block

    def check_for_no_ban_on_rejected_tx(self, tx, reject_reason):
        """Check we are not disconnected when sending a txn that the node rejects."""
        self.nodes[0].p2p.send_txs_and_test(
            [tx], self.nodes[0], success=False, reject_reason=reject_reason)

    def check_for_ban_on_rejected_tx(self, tx, reject_reason=None):
        """Check we are disconnected when sending a txn that the node rejects.

        (Can't actually get banned, since bitcoind won't ban local peers.)"""
        self.nodes[0].p2p.send_txs_and_test(
            [tx], self.nodes[0], success=False, expect_disconnect=True, reject_reason=reject_reason)
        self.reconnect_p2p()

    def check_for_ban_on_rejected_block(self, block, reject_reason=None):
        """Check we are disconnected when sending a block that the node rejects.

        (Can't actually get banned, since bitcoind won't ban local peers.)"""
        self.nodes[0].p2p.send_blocks_and_test([block], self.nodes[0], success=False,
                                               reject_reason=reject_reason, expect_disconnect=True)
        self.reconnect_p2p()

    def run_test(self):
        node, = self.nodes

        self.bootstrap_p2p()

        tip = self.get_best_block(node)

        self.log.info("Create some blocks with OP_1 coinbase for spending.")
        blocks = []
        for _ in range(10):
            tip = self.build_block(tip)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node, success=True)
        spendable_outputs = [block.vtx[0] for block in blocks]

        self.log.info("Mature the blocks and get out of IBD.")
        node.generatetoaddress(100, node.get_deterministic_priv_key().address)

        tip = self.get_best_block(node)

        self.log.info(
            "Set up spending transactions to test and mine the funding transactions.")

        def create_fund_and_spend_tx():
            spend_from = spendable_outputs.pop()
            value = spend_from.vout[0].nValue

            # Reversed data
            data = bytes.fromhex('0123456789abcdef')
            rev_data = bytes(reversed(data))

            # Lockscript: provide a bytestring that reverses to X
            script = CScript([OP_REVERSEBYTES, rev_data, OP_EQUAL])

            # Fund transaction: REVERSEBYTES <reversed(x)> EQUAL
            tx_fund = create_tx_with_script(spend_from, 0, b'', value, script)
            tx_fund.rehash()

            # Spend transaction: <x>
            tx_spend = CTransaction()
            tx_spend.vout.append(
                CTxOut(value - 1000, CScript([b'x' * 100, OP_RETURN])))
            tx_spend.vin.append(
                CTxIn(COutPoint(tx_fund.sha256, 0), b''))
            tx_spend.vin[0].scriptSig = CScript([data])
            tx_spend.rehash()

            return tx_spend, tx_fund

        # Create funding/spending transaction pair
        tx_reversebytes_spend, tx_reversebytes_fund = create_fund_and_spend_tx()

        # Mine funding transaction into block. Pre-upgrade output scripts can have
        # OP_REVERSEBYTES and still be fully valid, but they cannot spend it.
        tip = self.build_block(tip, [tx_reversebytes_fund])
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info("Start pre-upgrade tests")

        self.log.info(
            "Sending rejected transaction (bad opcode) via RPC (doesn't ban)")
        assert_raises_rpc_error(-26, PRE_UPGRADE_BAD_OPCODE_ERROR,
                                node.sendrawtransaction, ToHex(tx_reversebytes_spend))

        self.log.info(
            "Sending rejected transaction (bad opcode) via net (no banning)")
        self.check_for_no_ban_on_rejected_tx(
            tx_reversebytes_spend, PRE_UPGRADE_BAD_OPCODE_ERROR)

        self.log.info(
            "Sending invalid transactions in blocks (bad inputs, and get banned)")
        self.check_for_ban_on_rejected_block(self.build_block(tip, [tx_reversebytes_spend]),
                                             BAD_INPUTS_ERROR)

        self.log.info("Start activation tests")

        self.log.info("Approach to just before upgrade activation")
        # Move our clock to the upgrade time so we will accept such
        # future-timestamped blocks.
        node.setmocktime(PHONON_START_TIME)

        # Mine six blocks with timestamp starting at PHONON_START_TIME-1
        blocks = []
        for i in range(-1, 5):
            tip = self.build_block(tip, n_time=PHONON_START_TIME + i)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node)

        # Ensure our MTP is PHONON_START_TIME-1, just before activation
        assert_equal(node.getblockchaininfo()['mediantime'],
                     PHONON_START_TIME - 1)

        self.log.info(
            "The next block will activate, but the activation block itself must follow old rules")
        self.check_for_ban_on_rejected_block(
            self.build_block(tip, [tx_reversebytes_spend]), BAD_INPUTS_ERROR)

        # Save pre-upgrade block, we will reorg based on this block later
        pre_upgrade_block = tip

        self.log.info("Mine the activation block itself")
        tip = self.build_block(tip, [])
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info("We have activated!")
        # Ensure our MTP is PHONON_START_TIME, exactly at activation
        assert_equal(node.getblockchaininfo()['mediantime'], PHONON_START_TIME)
        # Ensure empty mempool
        assert_equal(node.getrawmempool(), [])

        # Save upgrade block, will invalidate and reconsider this later
        upgrade_block = tip

        self.log.info(
            "Submitting a new OP_REVERSEBYTES tx via net, and mining it in a block")
        # Send OP_REVERSEBYTES tx
        node.p2p.send_txs_and_test([tx_reversebytes_spend], node)

        # Verify OP_REVERSEBYTES tx is in mempool
        assert_equal(set(node.getrawmempool()), {tx_reversebytes_spend.hash})

        # Mine OP_REVERSEBYTES tx into block
        tip = self.build_block(tip, [tx_reversebytes_spend])
        node.p2p.send_blocks_and_test([tip], node)

        # Save post-upgrade block, will invalidate and reconsider this later
        post_upgrade_block = tip

        self.log.info("Start deactivation tests")

        self.log.info(
            "Invalidating the post-upgrade blocks returns OP_REVERSEBYTES transaction to mempool")
        node.invalidateblock(post_upgrade_block.hash)
        assert_equal(set(node.getrawmempool()), {
                     tx_reversebytes_spend.hash})

        self.log.info(
            "Invalidating the upgrade block evicts the OP_REVERSEBYTES transaction")
        node.invalidateblock(upgrade_block.hash)
        assert_equal(set(node.getrawmempool()), set())

        self.log.info("Return to our tip")
        node.reconsiderblock(upgrade_block.hash)
        node.reconsiderblock(post_upgrade_block.hash)
        assert_equal(node.getbestblockhash(), tip.hash)
        assert_equal(node.getrawmempool(), [])

        self.log.info(
            "Create an empty-block reorg that forks from pre-upgrade")
        tip = pre_upgrade_block
        blocks = []
        for _ in range(10):
            tip = self.build_block(tip)
            blocks.append(tip)
        node.p2p.send_blocks_and_test(blocks, node)

        self.log.info(
            "Transactions from orphaned blocks are sent into mempool ready to be mined again, "
            "including upgrade-dependent ones even though the fork deactivated and reactivated "
            "the upgrade.")
        assert_equal(set(node.getrawmempool()),
                     {tx_reversebytes_spend.hash})
        node.generatetoaddress(1, node.get_deterministic_priv_key().address)
        tip = self.get_best_block(node)
        assert (set(tx.rehash() for tx in tip.vtx) >=
                {tx_reversebytes_spend.hash})


if __name__ == '__main__':
    OpReversebytesActivationTest().main()
