# Copyright (c) 2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test various net timeouts.

- Create three peers:

    no_verack_node - we never send a verack in response to their version
    no_version_node - we never send a version
    no_send_node - we never send any P2P message.

- Wait 1 second
- Assert that we're connected
- Wait 1 second
- Assert that we're still connected
- Wait 2 seconds
- Assert that we're no longer connected (timeout to receive version/verack is 3 seconds)
"""

import time

from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework


class TestP2PConn(P2PInterface):
    def on_version(self, message):
        # Don't send a verack in response
        pass


class TimeoutsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        # set timeout to receive version/verack to 3 seconds
        self.extra_args = [["-peertimeout=3"]]

    def mock_forward(self, delta):
        self.mock_time += delta
        self.nodes[0].setmocktime(self.mock_time)

    def run_test(self):
        self.mock_time = int(time.time())
        self.mock_forward(0)

        # Setup the p2p connections
        no_verack_node = self.nodes[0].add_p2p_connection(
            TestP2PConn(), wait_for_verack=False
        )
        no_version_node = self.nodes[0].add_p2p_connection(
            TestP2PConn(), send_version=False, wait_for_verack=False
        )
        no_send_node = self.nodes[0].add_p2p_connection(
            TestP2PConn(), send_version=False, wait_for_verack=False
        )

        # Wait until we got the verack in response to the version. Though, don't wait for the other node to receive the
        # verack, since we never sent one
        no_verack_node.wait_for_verack()

        self.mock_forward(1)

        assert no_verack_node.is_connected
        assert no_version_node.is_connected
        assert no_send_node.is_connected

        self.mock_forward(1)

        assert "version" in no_verack_node.last_message

        assert no_verack_node.is_connected
        assert no_version_node.is_connected
        assert no_send_node.is_connected

        # Note that we no longer send a ping with no_version_node, because sending
        # anything before the version message results in a disconnection, which
        # makes the test brittle (race between the timeout disconnect and the
        # misbehavior disconnection).
        # As a result, the test is identical for no_send_node and no_version_node.
        expected_timeout_logs = [
            "version handshake timeout peer=0",
            "socket no message in first 3 seconds, 0 0 peer=1",
            "socket no message in first 3 seconds, 0 0 peer=2",
        ]

        with self.nodes[0].assert_debug_log(expected_msgs=expected_timeout_logs):
            self.mock_forward(5)
            no_verack_node.wait_for_disconnect()
            no_version_node.wait_for_disconnect()
            no_send_node.wait_for_disconnect()


if __name__ == "__main__":
    TimeoutsTest().main()
