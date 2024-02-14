# Copyright (c) 2020 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test add_outbound_p2p_connection test framework functionality"""

import random

from test_framework.messages import NODE_AVALANCHE, NODE_NETWORK
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, check_node_connections

# From net.h
MAX_OUTBOUND_FULL_RELAY_CONNECTIONS = 16
MAX_BLOCK_RELAY_ONLY_CONNECTIONS = 2

# Override DEFAULT_MAX_AVALANCHE_OUTBOUND_CONNECTIONS with
# -maxavalancheoutbound
MAX_AVALANCHE_OUTBOUND_CONNECTIONS = 12


class P2PFeelerReceiver(P2PInterface):
    def on_version(self, message):
        # The bitcoind node closes feeler connections as soon as a version
        # message is received from the test framework. Don't send any responses
        # to the node's version message since the connection will already be
        # closed.
        pass


class P2PAddConnections(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [
            [
                "-avaproofstakeutxoconfirmations=1",
                f"-maxavalancheoutbound={MAX_AVALANCHE_OUTBOUND_CONNECTIONS}",
            ],
            [],
        ]

    def setup_network(self):
        self.setup_nodes()
        # Don't connect the nodes

    def add_outbounds(self, node, quantity, conn_type):
        services = NODE_NETWORK
        if conn_type == "avalanche":
            services |= NODE_AVALANCHE

        for _ in range(quantity):
            self.log.debug(
                f"Node {node.index}, {conn_type}: {self.p2p_idx[node.index]}"
            )
            node.add_outbound_p2p_connection(
                P2PInterface(),
                p2p_idx=self.p2p_idx[node.index],
                connection_type=conn_type,
                services=services,
            )
            self.p2p_idx[node.index] += 1

    def simple_test(self):
        self.log.info("Connect to various outbound peers in a predetermined way")
        self.p2p_idx = [0] * self.num_nodes

        self.log.info(f"Add {MAX_OUTBOUND_FULL_RELAY_CONNECTIONS} outbounds to node 0")
        self.add_outbounds(
            self.nodes[0], MAX_OUTBOUND_FULL_RELAY_CONNECTIONS, "outbound-full-relay"
        )

        self.log.info(
            f"Add {MAX_BLOCK_RELAY_ONLY_CONNECTIONS} block-relay-only connections to"
            " node 0"
        )
        self.add_outbounds(
            self.nodes[0], MAX_BLOCK_RELAY_ONLY_CONNECTIONS, "block-relay-only"
        )

        self.log.info(
            f"Add {MAX_BLOCK_RELAY_ONLY_CONNECTIONS} block-relay-only connections to"
            " node 1"
        )
        self.add_outbounds(
            self.nodes[1], MAX_BLOCK_RELAY_ONLY_CONNECTIONS, "block-relay-only"
        )

        self.log.info("Add 5 inbound connections to node 1")
        for i in range(5):
            self.log.info(f"inbound: {i}")
            self.nodes[1].add_p2p_connection(P2PInterface())

        self.log.info("Add 4 outbounds to node 1")
        self.add_outbounds(self.nodes[1], 4, "outbound-full-relay")

        self.log.info("Check the connections opened as expected")
        check_node_connections(
            node=self.nodes[0],
            num_in=0,
            num_out=MAX_OUTBOUND_FULL_RELAY_CONNECTIONS
            + MAX_BLOCK_RELAY_ONLY_CONNECTIONS,
        )
        check_node_connections(
            node=self.nodes[1], num_in=5, num_out=4 + MAX_BLOCK_RELAY_ONLY_CONNECTIONS
        )

        self.log.info("Disconnect p2p connections & try to re-open")
        self.nodes[0].disconnect_p2ps()
        self.p2p_idx[0] = 0
        check_node_connections(node=self.nodes[0], num_in=0, num_out=0)

        self.log.info(f"Add {MAX_OUTBOUND_FULL_RELAY_CONNECTIONS} outbounds to node 0")
        self.add_outbounds(
            self.nodes[0], MAX_OUTBOUND_FULL_RELAY_CONNECTIONS, "outbound-full-relay"
        )
        check_node_connections(
            node=self.nodes[0], num_in=0, num_out=MAX_OUTBOUND_FULL_RELAY_CONNECTIONS
        )

        self.log.info(
            f"Add {MAX_BLOCK_RELAY_ONLY_CONNECTIONS} block-relay-only connections to"
            " node 0"
        )
        self.add_outbounds(
            self.nodes[0], MAX_BLOCK_RELAY_ONLY_CONNECTIONS, "block-relay-only"
        )
        check_node_connections(
            node=self.nodes[0],
            num_in=0,
            num_out=MAX_OUTBOUND_FULL_RELAY_CONNECTIONS
            + MAX_BLOCK_RELAY_ONLY_CONNECTIONS,
        )

        self.log.info("Restart node 0 and try to reconnect to p2ps")
        self.restart_node(0)
        self.p2p_idx[0] = 0

        self.log.info(f"Add {MAX_OUTBOUND_FULL_RELAY_CONNECTIONS} outbounds to node 0")
        self.add_outbounds(
            self.nodes[0], MAX_OUTBOUND_FULL_RELAY_CONNECTIONS, "outbound-full-relay"
        )
        check_node_connections(
            node=self.nodes[0], num_in=0, num_out=MAX_OUTBOUND_FULL_RELAY_CONNECTIONS
        )

        self.log.info(
            f"Add {MAX_BLOCK_RELAY_ONLY_CONNECTIONS} block-relay-only connections to"
            " node 0"
        )
        self.add_outbounds(
            self.nodes[0], MAX_BLOCK_RELAY_ONLY_CONNECTIONS, "block-relay-only"
        )
        check_node_connections(
            node=self.nodes[0],
            num_in=0,
            num_out=MAX_OUTBOUND_FULL_RELAY_CONNECTIONS
            + MAX_BLOCK_RELAY_ONLY_CONNECTIONS,
        )

        check_node_connections(
            node=self.nodes[1], num_in=5, num_out=4 + MAX_BLOCK_RELAY_ONLY_CONNECTIONS
        )

        self.log.info("Add 1 feeler connection to node 0")
        feeler_conn = self.nodes[0].add_outbound_p2p_connection(
            P2PFeelerReceiver(), p2p_idx=self.p2p_idx[0], connection_type="feeler"
        )

        # Feeler connection is closed
        assert not feeler_conn.is_connected

        # Verify version message received
        assert_equal(feeler_conn.message_count["version"], 1)
        # Feeler connections do not request tx relay
        assert_equal(feeler_conn.last_message["version"].relay, 0)

        self.log.info("Connecting avalanche outbounds")
        self.add_outbounds(
            self.nodes[0], MAX_AVALANCHE_OUTBOUND_CONNECTIONS, "avalanche"
        )
        check_node_connections(
            node=self.nodes[0],
            num_in=0,
            num_out=MAX_OUTBOUND_FULL_RELAY_CONNECTIONS
            + MAX_BLOCK_RELAY_ONLY_CONNECTIONS
            + MAX_AVALANCHE_OUTBOUND_CONNECTIONS,
        )

    def random_test(self):
        for node in self.nodes:
            node.disconnect_p2ps()
        self.p2p_idx = [0] * self.num_nodes

        remaining_outbounds = {
            "outbound-full-relay": MAX_OUTBOUND_FULL_RELAY_CONNECTIONS,
            "block-relay-only": MAX_BLOCK_RELAY_ONLY_CONNECTIONS,
            "avalanche": MAX_AVALANCHE_OUTBOUND_CONNECTIONS,
        }
        max_outbounds = sum(remaining_outbounds.values())

        iterations = random.randint(1, 5 * max_outbounds)
        self.log.info(f"Randomly insert outbounds of various types {iterations} times")

        for _ in range(iterations):
            conn_type = random.choice(list(remaining_outbounds))
            if remaining_outbounds[conn_type] <= 0:
                continue

            self.add_outbounds(self.nodes[0], 1, conn_type)
            remaining_outbounds[conn_type] -= 1

        check_node_connections(
            node=self.nodes[0],
            num_in=0,
            num_out=max_outbounds - sum(remaining_outbounds.values()),
        )

    def run_test(self):
        self.simple_test()
        self.random_test()


if __name__ == "__main__":
    P2PAddConnections().main()
