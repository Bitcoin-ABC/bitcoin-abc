#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test version message behavior"""

from test_framework.messages import NODE_NETWORK, msg_version
from test_framework.mininode import P2PInterface
from test_framework.test_framework import BitcoinTestFramework


class ModifiedVersionTimestampP2PInterface(P2PInterface):
    def __init__(self, timestamp):
        super().__init__()
        self.versionTimestamp = timestamp

    def peer_connect(self, *args, services=NODE_NETWORK,
                     send_version=False, **kwargs):
        create_conn = super().peer_connect(*args, send_version=send_version, **kwargs)

        # Send version message with invalid timestamp
        vt = msg_version()
        vt.nTime = self.versionTimestamp

        vt.nServices = services
        vt.addrTo.ip = self.dstaddr
        vt.addrTo.port = self.dstport
        vt.addrFrom.ip = "0.0.0.0"
        vt.addrFrom.port = 0

        # Will be sent right after connection_made
        self.on_connection_send_msg = vt
        return create_conn


class VersionMessageTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = False

    def run_test(self):
        # Check some invalid timestamps in the version message
        with self.nodes[0].assert_debug_log(expected_msgs=["Ignoring invalid timestamp in version message"]):
            self.nodes[0].add_p2p_connection(
                ModifiedVersionTimestampP2PInterface(-9223372036854775807), send_version=False)

        # Check timestamp boundary
        with self.nodes[0].assert_debug_log(expected_msgs=["Ignoring invalid timestamp in version message"]):
            self.nodes[0].add_p2p_connection(
                ModifiedVersionTimestampP2PInterface(1296688601), send_version=False)

        # Genesis block timestamp
        with self.nodes[0].assert_debug_log(expected_msgs=["added time data"], unexpected_msgs=["Ignoring invalid timestamp in version message"]):
            self.nodes[0].add_p2p_connection(
                ModifiedVersionTimestampP2PInterface(1296688602), send_version=False)


if __name__ == '__main__':
    VersionMessageTest().main()
