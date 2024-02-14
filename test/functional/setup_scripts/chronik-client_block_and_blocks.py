# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library block() and blocks() functions
"""

import pathmagic  # noqa
from ipc import send_ipc_message
from setup_framework import SetupFramework
from test_framework.util import assert_equal


class ChronikClient_Block_Setup(SetupFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.ipc_timeout = 10

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def send_chronik_info(self):
        send_ipc_message({"chronik": f"http://127.0.0.1:{self.nodes[0].chronik_port}"})

    def run_test(self):
        # Init
        node = self.nodes[0]

        self.send_chronik_info()

        yield True

        self.log.info("Step 1: Mine 10 more blocks")
        tip = self.generate(node, 10)[-1]
        assert_equal(node.getblockcount(), 210)
        yield True

        self.log.info("Step 2: Park the last block")
        node.parkblock(node.getbestblockhash())
        assert_equal(node.getblockcount(), 209)
        yield True

        self.log.info("Step 3: Unpark the last block")
        node.unparkblock(tip)
        assert_equal(node.getblockcount(), 210)
        yield True

        self.log.info("Step 4: invalidate the last block")
        node.invalidateblock(node.getbestblockhash())
        assert_equal(node.getblockcount(), 209)
        yield True

        self.log.info("Step 5: Reconsider the last block")
        node.reconsiderblock(tip)
        assert_equal(node.getblockcount(), 210)
        yield True


if __name__ == "__main__":
    ChronikClient_Block_Setup().main()
