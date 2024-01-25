#!/usr/bin/env python3
# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library block() function
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

        self.log.info("Step 1: Broadcast ten txs")
        txids = []
        for x in range(10):
            txid = self.nodes[0].sendtoaddress(
                self.nodes[0].getnewaddress(), (x + 1) * 1000000
            )
            txids.append(txid)
        send_ipc_message({"txids": txids})
        assert_equal(node.getblockcount(), 200)
        yield True

        self.log.info("Step 2: Mine a block with these txs")
        self.generate(node, 1)
        assert_equal(node.getblockcount(), 201)
        yield True

        self.log.info("Step 3: Park the last block")
        node.parkblock(node.getbestblockhash())
        assert_equal(node.getblockcount(), 200)
        yield True


if __name__ == "__main__":
    ChronikClient_Block_Setup().main()
