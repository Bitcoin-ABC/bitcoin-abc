#!/usr/bin/env python3
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the finalizeblock RPC calls."""
import os

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error, connect_nodes_bi, sync_blocks, wait_until

RPC_FINALIZE_INVALID_BLOCK_ERROR = 'finalize-invalid-block'
AUTO_FINALIZATION_DEPTH = 10


class FinalizeBlockTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_flags = [["-maxreorgdepth={}".format(AUTO_FINALIZATION_DEPTH)], [
            "-maxreorgdepth={}".format(AUTO_FINALIZATION_DEPTH)]]

    # There should only be one chaintip, which is expected_tip
    def only_valid_tip(self, expected_tip, other_tip_status=None):
        node = self.nodes[0]
        assert_equal(node.getbestblockhash(), expected_tip)
        for tip in node.getchaintips():
            if tip["hash"] == expected_tip:
                assert_equal(tip["status"], "active")
            else:
                assert_equal(tip["status"], other_tip_status)

    def run_test(self):
        node = self.nodes[0]

        self.log.info("Test block finalization...")
        node.generate(10)
        tip = node.getbestblockhash()
        node.finalizeblock(tip)
        assert_equal(node.getbestblockhash(), tip)

        alt_node = self.nodes[1]
        connect_nodes_bi(self.nodes, 0, 1)
        sync_blocks(self.nodes[0:2])

        alt_node.invalidateblock(tip)
        # We will use this later to check auto-finalization during a reorg
        auto_finalized_tip = alt_node.getbestblockhash()
        alt_node.generate(10)

        # Wait for node 0 to invalidate the chain.
        def wait_for_invalid_block(node, block):
            def check_block():
                for tip in node.getchaintips():
                    if tip["hash"] == block:
                        assert(tip["status"] != "active")
                        return tip["status"] == "invalid"
                return False
            wait_until(check_block)

        # node do not accept alt_node's chain due to tip being finalized,
        # even though it is longer.
        wait_for_invalid_block(node, alt_node.getbestblockhash())
        assert_equal(node.getbestblockhash(), tip)

        # alt_node has mined 10 block, so tip must be invalid due to finalization.
        wait_for_invalid_block(alt_node, tip)

        self.log.info("Test that an invalid block cannot be finalized...")
        assert_raises_rpc_error(-20, RPC_FINALIZE_INVALID_BLOCK_ERROR,
                                node.finalizeblock, alt_node.getbestblockhash())

        self.log.info(
            "Test that invalidating a finalized block moves the finalization backward...")
        node.invalidateblock(tip)
        node.reconsiderblock(tip)
        finalized_block = node.getblockhash(
            int(node.getblockheader(tip)['height']) - AUTO_FINALIZATION_DEPTH)
        assert_equal(node.getbestblockhash(), tip)
        assert_equal(
            node.getfinalizedblockhash(),
            finalized_block)

        # The node will now accept that chain as the finalized block moved back.
        node.reconsiderblock(alt_node.getbestblockhash())
        assert_equal(node.getbestblockhash(), alt_node.getbestblockhash())
        assert_equal(node.getfinalizedblockhash(), auto_finalized_tip)

        self.log.info("Trigger reorg via block finalization...")
        node.finalizeblock(tip)
        assert_equal(node.getfinalizedblockhash(),
                     finalized_block)

        self.log.info("Try to finalized a block on a competiting fork...")
        assert_raises_rpc_error(-20, RPC_FINALIZE_INVALID_BLOCK_ERROR,
                                node.finalizeblock, alt_node.getbestblockhash())
        assert node.getfinalizedblockhash() != alt_node.getbestblockhash(), \
            "Finalize block is alt_node's tip!"
        assert_equal(node.getfinalizedblockhash(), finalized_block)


if __name__ == '__main__':
    FinalizeBlockTest().main()
