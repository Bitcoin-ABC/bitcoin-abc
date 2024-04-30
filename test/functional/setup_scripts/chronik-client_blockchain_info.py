# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library blockchaininfo() function
"""

import pathmagic  # noqa
from setup_framework import SetupFramework
from test_framework.util import assert_equal


class ChronikClient_BlockChainInfo_Setup(SetupFramework):
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
        self.generate(node, 10)
        assert_equal(node.getblockcount(), 210)
        yield True

        self.log.info("Step 3: Mine again 10 more blocks")
        tip = self.generate(node, 10)[-1]
        assert_equal(node.getblockcount(), 220)
        yield True

        self.log.info("Step 4: Park the last block")
        node.parkblock(node.getbestblockhash())
        assert_equal(node.getblockcount(), 219)
        yield True

        self.log.info("Step 5: Unpark the last block")
        node.unparkblock(tip)
        assert_equal(node.getblockcount(), 220)
        yield True


if __name__ == "__main__":
    ChronikClient_BlockChainInfo_Setup().main()
