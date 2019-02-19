#!/usr/bin/env python3
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the parckblock and unparkblock RPC calls."""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, wait_until


class ParkedChainTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [["-noparkdeepreorg"], ["-maxreorgdepth=-1"]]

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
        def wait_for_tip(node, tip):
            def check_tip():
                return node.getbestblockhash() == tip
            wait_until(check_tip)

        node = self.nodes[0]
        parking_node = self.nodes[1]

        self.log.info("Test chain parking...")
        node.generate(10)
        tip = node.getbestblockhash()
        node.generate(1)
        block_to_park = node.getbestblockhash()
        node.generate(10)
        parked_tip = node.getbestblockhash()

        # get parking_node caught up.
        # (probably not needed, but just in case parking can have race
        # condition like invalidateblock below)
        wait_for_tip(parking_node, parked_tip)

        # Let's park the chain.
        assert parked_tip != tip
        assert block_to_park != tip
        assert block_to_park != parked_tip
        node.parkblock(block_to_park)
        assert_equal(node.getbestblockhash(), tip)

        # When the chain is unparked, the node reorg into its original chain.
        node.unparkblock(parked_tip)
        assert_equal(node.getbestblockhash(), parked_tip)

        # Parking and then unparking a block should not change its validity,
        # and invaliding and reconsidering a block should not change its
        # parked state.  See the following test cases:
        self.log.info("Test invalidate, park, unpark, reconsider...")
        node.generate(1)
        tip = node.getbestblockhash()
        node.generate(1)
        bad_tip = node.getbestblockhash()
        # Generate an extra block to check that children are invalidated as
        # expected and do not produce dangling chaintips
        node.generate(1)
        good_tip = node.getbestblockhash()

        # avoid race condition from parking_node requesting block when invalid
        wait_for_tip(parking_node, good_tip)

        node.invalidateblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.parkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.unparkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.reconsiderblock(bad_tip)
        self.only_valid_tip(good_tip)

        self.log.info("Test park, invalidate, reconsider, unpark")
        node.generate(1)
        tip = node.getbestblockhash()
        node.generate(1)
        bad_tip = node.getbestblockhash()
        node.generate(1)
        good_tip = node.getbestblockhash()

        # avoid race condition from parking_node requesting block when invalid
        wait_for_tip(parking_node, good_tip)

        node.parkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="parked")
        node.invalidateblock(bad_tip)
        # NOTE: Intuitively, other_tip_status would be "invalid", but because
        # only valid (unparked) chains are walked, child blocks' statuses are
        # not updated, so the "parked" state remains.
        self.only_valid_tip(tip, other_tip_status="parked")
        node.reconsiderblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="parked")
        node.unparkblock(bad_tip)
        self.only_valid_tip(good_tip)

        self.log.info("Test invalidate, park, reconsider, unpark...")
        node.generate(1)
        tip = node.getbestblockhash()
        node.generate(1)
        bad_tip = node.getbestblockhash()
        node.generate(1)
        good_tip = node.getbestblockhash()

        # avoid race condition from parking_node requesting block when invalid
        wait_for_tip(parking_node, good_tip)

        node.invalidateblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.parkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.reconsiderblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="parked")
        node.unparkblock(bad_tip)
        self.only_valid_tip(good_tip)

        self.log.info("Test park, invalidate, unpark, reconsider")
        node.generate(1)
        tip = node.getbestblockhash()
        node.generate(1)
        bad_tip = node.getbestblockhash()
        node.generate(1)
        good_tip = node.getbestblockhash()

        # avoid race condition from parking_node requesting block when invalid
        wait_for_tip(parking_node, good_tip)

        node.parkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="parked")
        node.invalidateblock(bad_tip)
        # NOTE: Intuitively, other_tip_status would be "invalid", but because
        # only valid (unparked) chains are walked, child blocks' statuses are
        # not updated, so the "parked" state remains.
        self.only_valid_tip(tip, other_tip_status="parked")
        node.unparkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.reconsiderblock(bad_tip)
        self.only_valid_tip(good_tip)

        # To get ready for next testset, make sure both nodes are in sync.
        wait_for_tip(parking_node, good_tip)
        assert_equal(node.getbestblockhash(), parking_node.getbestblockhash())

        # Wait for node 1 to park the chain.
        def wait_for_parked_block(block):
            def check_block():
                for tip in parking_node.getchaintips():
                    if tip["hash"] == block:
                        assert tip["status"] != "active"
                        return tip["status"] == "parked"
                return False
            wait_until(check_block)

        def check_reorg_protection(depth, extra_blocks):
            self.log.info(
                "Test deep reorg parking, {} block deep".format(depth))

            # Invalidate the tip on node 0, so it doesn't follow node 1.
            node.invalidateblock(node.getbestblockhash())
            # Mine block to create a fork of proper depth
            parking_node.generate(depth - 1)
            node.generate(depth)
            # extra block should now find themselves parked
            for i in range(extra_blocks):
                node.generate(1)
                wait_for_parked_block(node.getbestblockhash())

            # If we mine one more block, the node reorgs.
            node.generate(1)
            wait_until(lambda: parking_node.getbestblockhash()
                       == node.getbestblockhash())

        check_reorg_protection(1, 0)
        check_reorg_protection(2, 0)
        check_reorg_protection(3, 1)
        check_reorg_protection(4, 4)
        check_reorg_protection(5, 5)
        check_reorg_protection(6, 6)
        check_reorg_protection(100, 100)


if __name__ == '__main__':
    ParkedChainTest().main()
