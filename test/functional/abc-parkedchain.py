#!/usr/bin/env python3
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the parckblock and unparkblock RPC calls."""
import os

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ParckedChainTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1

    def run_test(self):
        node = self.nodes[0]

        self.log.info("test chain parking")
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


if __name__ == '__main__':
    ParckedChainTest().main()
