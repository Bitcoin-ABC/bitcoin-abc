#!/usr/bin/env python3
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the parckblock and unparkblock RPC calls."""
import os

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ParkedChainTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1

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

        self.log.info("Test chain parking...")
        node.generate(10)
        tip = node.getbestblockhash()
        node.generate(1)
        block_to_park = node.getbestblockhash()
        node.generate(10)
        parked_tip = node.getbestblockhash()

        # Let's park the chain.
        assert(parked_tip != tip)
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


if __name__ == '__main__':
    ParkedChainTest().main()
