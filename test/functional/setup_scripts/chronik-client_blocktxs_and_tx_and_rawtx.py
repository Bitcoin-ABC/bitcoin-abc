#!/usr/bin/env python3
# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library blockTxs(), tx(), and rawTx() functions
"""

import pathmagic  # noqa
from ipc import send_ipc_message
from setup_framework import SetupFramework
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet


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
        wallet = MiniWallet(node)
        wallet.rescan_utxos()

        self.send_chronik_info()

        yield True

        self.log.info("Step 1: Broadcast ten txs")
        txs_and_rawtxs = {}
        for x in range(10):
            # Make the fee rate vary to have txs with varying amounts
            tx = wallet.send_self_transfer(from_node=node, fee_rate=(x + 1) * 1000)
            txs_and_rawtxs[tx["txid"]] = tx["hex"]
        send_ipc_message({"txs_and_rawtxs": txs_and_rawtxs})
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
