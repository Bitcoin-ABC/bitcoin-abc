# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to test chronik-client failover functionality
"""

from ipc import send_ipc_message
from setup_framework import SetupFramework


class ChronikClient_Failover_Setup(SetupFramework):
    def set_test_params(self):
        # Start 3 nodes for failover testing
        self.num_nodes = 3
        self.noban_tx_relay = True
        self.extra_args = [["-chronik"]] * self.num_nodes

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()
        self.skip_if_no_wallet()

    def run_test(self):
        self.log.info("Initialization")
        chronik_urls = []
        for node in self.nodes:
            chronik_urls.append(f"http://127.0.0.1:{node.chronik_port}")

        send_ipc_message({"chronik_urls": chronik_urls})
        yield True

        self.log.info("All the nodes are running")
        # Nothing to for this step
        yield True

        self.log.info("Stop node 0 then generate a block on the second node")
        self.stop_node(0)
        tip_hash = self.generate(self.nodes[1], 1, sync_fun=self.no_op)[0]
        send_ipc_message({"tipHash": tip_hash})
        yield True

        self.log.info("Stop second node and generate a new block on third node")
        self.stop_node(1)
        tip_hash = self.generate(self.nodes[2], 1, sync_fun=self.no_op)[0]
        send_ipc_message({"tipHash": tip_hash})
        yield True

        self.log.info("Stop the last node after all tests are done")
        self.stop_node(2)
        yield True


if __name__ == "__main__":
    ChronikClient_Failover_Setup().main()
