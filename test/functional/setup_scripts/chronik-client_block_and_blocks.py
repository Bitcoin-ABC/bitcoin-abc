# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library block() and blocks() functions
"""

import pathmagic  # noqa
from setup_framework import SetupFramework
from test_framework.util import assert_equal


class ChronikClient_Block_Setup(SetupFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        # Init
        node = self.nodes[0]

        yield True

        self.log.info("Step 1: Initialized regtest chain")
        assert_equal(node.getblockcount(), 200)
        yield True

        self.log.info("Step 2: Mine 10 more blocks")
        tip = self.generate(node, 10)[-1]
        assert_equal(node.getblockcount(), 210)
        yield True

        self.log.info("Step 3: Park the last block")
        node.parkblock(node.getbestblockhash())
        assert_equal(node.getblockcount(), 209)
        yield True

        self.log.info("Step 4: Unpark the last block")
        node.unparkblock(tip)
        assert_equal(node.getblockcount(), 210)
        yield True

        self.log.info("Step 5: invalidate the last block")
        node.invalidateblock(node.getbestblockhash())
        assert_equal(node.getblockcount(), 209)
        yield True

        self.log.info("Step 6: Reconsider the last block")
        node.reconsiderblock(tip)
        assert_equal(node.getblockcount(), 210)
        yield True


if __name__ == "__main__":
    ChronikClient_Block_Setup().main()
