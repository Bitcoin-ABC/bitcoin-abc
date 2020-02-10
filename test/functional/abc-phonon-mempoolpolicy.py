#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

"""Test ancestor and descendants policies around phonon-activation."""

from test_framework.blocktools import (
    create_block,
    create_coinbase,
    create_tx_with_script,
    make_conform_to_ctor,
)
from test_framework.txtools import pad_tx
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
    OP_TRUE
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error

# Phonon dummy activation time
PHONON_START_TIME = 2000000000

# Replay protection time needs to be moved beyond phonon activation
REPLAY_PROTECTION_TIME = PHONON_START_TIME * 2

PREFORK_MAX_ANCESTORS = 25
PREFORK_MAX_DESCENDANTS = 25
POSTFORK_MAX_ANCESTORS = 50
POSTFORK_MAX_DESCENDANTS = 50

LONG_MEMPOOL_ERROR = "too-long-mempool-chain"


class PhononPolicyChangeTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1

        self.block_heights = {}
        self.extra_args = [[
            "-phononactivationtime={}".format(PHONON_START_TIME),
            "-replayprotectionactivationtime={}".format(
                REPLAY_PROTECTION_TIME)]]

    def bootstrap_p2p(self):
        self.nodes[0].add_p2p_connection(P2PDataStore())
        self.nodes[0].p2p.wait_for_verack()

    def get_best_block(self, node):
        """Get the best block. Register its height so we can use build_block."""
        block_height = node.getblockcount()
        blockhash = node.getblockhash(block_height)
        block = FromHex(CBlock(), node.getblock(blockhash, 0))
        block.calc_sha256()
        self.block_heights[block.sha256] = block_height
        return block

    def check_for_no_ban_on_rejected_tx(self, tx, reject_reason):
        """Check we are not disconnected when sending a txn that the node rejects."""
        self.nodes[0].p2p.send_txs_and_test(
            [tx], self.nodes[0], success=False, reject_reason=reject_reason)

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

    def build_ancestor_chain(self, spend_from, num_ancestors):
        fee = 1000
        chain = [spend_from]
        for _ in range(num_ancestors):
            parent_tx = chain[-1]
            tx = create_tx_with_script(
                parent_tx,
                n=0,
                amount=parent_tx.vout[0].nValue -
                fee,
                script_pub_key=CScript(
                    [OP_TRUE]))
            chain.append(tx)

        return chain[1:]

    def build_descendants_chain(self, spend_from, num_descendants):
        # -1 as parent counts toward descendants
        num_descendants -= 1
        fee = 1000
        descendants = []

        parent_tx = CTransaction()
        parent_tx.vin.append(
            CTxIn(
                COutPoint(
                    spend_from.sha256,
                    0),
                b'',
                0xffffffff))
        amount = (spend_from.vout[0].nValue - fee) // num_descendants

        for _ in range(num_descendants):
            parent_tx.vout.append(CTxOut(amount, CScript([OP_TRUE])))
        pad_tx(parent_tx)
        parent_tx.rehash()

        for n in range(num_descendants):
            child_tx = create_tx_with_script(
                parent_tx, n=n, amount=parent_tx.vout[0].nValue - fee)
            descendants.append(child_tx)

        assert(len(descendants) == num_descendants)

        return [parent_tx] + descendants

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
        self.log.info("Start pre-upgrade tests")

        # Test pre-upgrade max ancestor limit.
        # We create the full post-fork length chain for use later (+1 to test
        # too long chain)
        ancestors = self.build_ancestor_chain(
            spendable_outputs.pop(0), POSTFORK_MAX_ANCESTORS + 1)
        [node.sendrawtransaction(ToHex(tx))
         for tx in ancestors[:PREFORK_MAX_ANCESTORS]]

        self.log.info(
            "Sending rejected transaction (too many ancestors) via RPC")
        assert_raises_rpc_error(-26,
                                LONG_MEMPOOL_ERROR,
                                node.sendrawtransaction,
                                ToHex(ancestors[PREFORK_MAX_ANCESTORS]))

        self.log.info(
            "Sending rejected transaction (too many ancestors) via net")
        self.check_for_no_ban_on_rejected_tx(
            ancestors[PREFORK_MAX_ANCESTORS], LONG_MEMPOOL_ERROR)

        # Test pre-upgrade max descendants limit
        # We create the full post-fork length chain for use later (+1 to test
        # too long chain)
        descendants = self.build_descendants_chain(
            spendable_outputs.pop(0), POSTFORK_MAX_DESCENDANTS + 1)
        [node.sendrawtransaction(ToHex(tx))
         for tx in descendants[:PREFORK_MAX_DESCENDANTS]]

        self.log.info(
            "Sending rejected transaction (too many descendants) via RPC")
        assert_raises_rpc_error(-26,
                                LONG_MEMPOOL_ERROR,
                                node.sendrawtransaction,
                                ToHex(descendants[PREFORK_MAX_DESCENDANTS]))

        self.log.info(
            "Sending rejected transaction (too many descendants) via net")
        self.check_for_no_ban_on_rejected_tx(
            descendants[PREFORK_MAX_DESCENDANTS], LONG_MEMPOOL_ERROR)

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
            "The next block will activate, but at the activation block itself must follow old rules")

        self.check_for_no_ban_on_rejected_tx(
            ancestors[PREFORK_MAX_ANCESTORS], LONG_MEMPOOL_ERROR)
        self.check_for_no_ban_on_rejected_tx(
            descendants[PREFORK_MAX_DESCENDANTS], LONG_MEMPOOL_ERROR)

        # Save pre-upgrade block, we will reorg based on this block later
        pre_upgrade_block = tip

        self.log.info("Mine the activation block itself")
        tip = self.build_block(tip, [])
        node.p2p.send_blocks_and_test([tip], node)

        self.log.info("We have activated!")
        # Ensure our MTP is PHONON_START_TIME, exactly at activation
        assert_equal(node.getblockchaininfo()['mediantime'], PHONON_START_TIME)

        # Test post-upgrade max ancestor limit
        [node.sendrawtransaction(
            ToHex(tx)) for tx in ancestors[PREFORK_MAX_ANCESTORS:POSTFORK_MAX_ANCESTORS]]

        self.log.info(
            "Sending rejected transaction (too many ancestors) via RPC")
        assert_raises_rpc_error(-26,
                                LONG_MEMPOOL_ERROR,
                                node.sendrawtransaction,
                                ToHex(ancestors[-1]))

        self.log.info(
            "Sending rejected transaction (too many ancestors) via net")
        self.check_for_no_ban_on_rejected_tx(ancestors[-1], LONG_MEMPOOL_ERROR)

        # Test post-upgrade max descendants limit
        [node.sendrawtransaction(ToHex(
            tx)) for tx in descendants[PREFORK_MAX_DESCENDANTS:POSTFORK_MAX_DESCENDANTS]]

        self.log.info(
            "Sending rejected transaction (too many descendants) via RPC")
        assert_raises_rpc_error(-26,
                                LONG_MEMPOOL_ERROR,
                                node.sendrawtransaction,
                                ToHex(descendants[-1]))

        self.log.info(
            "Sending rejected transaction (too many descendants) via net")
        self.check_for_no_ban_on_rejected_tx(
            descendants[-1], LONG_MEMPOOL_ERROR)

        self.log.info("Start deactivation tests")

        self.log.info(
            "Invalidating the pre-upgrade blocks trims the mempool back to old policies")
        node.invalidateblock(pre_upgrade_block.hash)

        assert_equal(PREFORK_MAX_ANCESTORS +
                     PREFORK_MAX_DESCENDANTS, len(node.getrawmempool()))
        expected = set([tx.hash for tx in ancestors[:PREFORK_MAX_ANCESTORS] +
                        descendants[:PREFORK_MAX_ANCESTORS]])
        assert_equal(set(node.getrawmempool()), expected)


if __name__ == '__main__':
    PhononPolicyChangeTest().main()
