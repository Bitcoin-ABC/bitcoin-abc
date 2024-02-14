# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test time adjustment behavior when receiving a VERSION message.

Messages with a timestamp too far in the past are ignored and discouraged.
Messages from an outbound peer with a timestamp more recent than the genesis block
timestamp are used to adjust our local time.
"""

from test_framework.blocktools import TIME_GENESIS_BLOCK
from test_framework.messages import NODE_NETWORK, msg_version
from test_framework.p2p import P2P_SUBVERSION, P2P_VERSION, P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

NODE0_TIME = TIME_GENESIS_BLOCK + 1337


class ModifiedVersionTimestampP2PInterface(P2PInterface):
    def __init__(self, timestamp):
        super().__init__()
        self.versionTimestamp = timestamp

    def peer_connect(self, *args, services=NODE_NETWORK, send_version=False, **kwargs):
        create_conn = super().peer_connect(*args, send_version=send_version, **kwargs)

        # Send version message with invalid timestamp
        vt = msg_version()
        vt.nVersion = P2P_VERSION
        vt.strSubVer = P2P_SUBVERSION

        vt.nTime = self.versionTimestamp

        vt.nServices = services
        vt.addrTo.ip = self.dstaddr
        vt.addrTo.port = self.dstport
        vt.addrFrom.ip = "0.0.0.0"
        vt.addrFrom.port = 0

        # Will be sent right after connection_made
        self.on_connection_send_msg = vt
        return create_conn


class VersionTimestampTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2

    def setup_network(self):
        self.setup_nodes()
        # Don't connect the nodes

    def run_test(self):
        # Set a deterministic time so that we can check the time offset with other
        # nodes is as expected
        self.nodes[0].setmocktime(NODE0_TIME)

        self.log.info("Check some invalid timestamp in the version message")
        with self.nodes[0].assert_debug_log(
            expected_msgs=[
                "Added connection peer=0",
                "Ignoring invalid timestamp in version message",
            ]
        ):
            self.nodes[0].add_p2p_connection(
                ModifiedVersionTimestampP2PInterface(-9223372036854775807),
                send_version=False,
            )

        self.log.info("Check invalid side of the timestamp boundary")
        with self.nodes[0].assert_debug_log(
            expected_msgs=[
                "Added connection peer=1",
                "Ignoring invalid timestamp in version message",
            ]
        ):
            self.nodes[0].add_p2p_connection(
                ModifiedVersionTimestampP2PInterface(TIME_GENESIS_BLOCK - 1),
                send_version=False,
            )

        self.log.info("Check valid side of the timestamp boundary (genesis timestamp)")
        # Outbound connection: the timestamp is used for our adjusted time
        self.nodes[1].setmocktime(TIME_GENESIS_BLOCK)
        with self.nodes[0].assert_debug_log(
            expected_msgs=["Added connection peer=2", "added time data"],
            unexpected_msgs=["Ignoring invalid timestamp in version message"],
        ):
            self.connect_nodes(0, 1)

        # This check verifies that the mocktime was indeed used in the VERSION message
        assert_equal(
            self.nodes[0].getpeerinfo()[2]["timeoffset"],
            TIME_GENESIS_BLOCK - NODE0_TIME,
        )

        # Inbound connection: the timestamp is ignored
        with self.nodes[0].assert_debug_log(
            expected_msgs=["Added connection peer=3"],
            unexpected_msgs=[
                "Ignoring invalid timestamp in version message",
                "added time data",
            ],
        ):
            self.nodes[0].add_p2p_connection(
                ModifiedVersionTimestampP2PInterface(TIME_GENESIS_BLOCK),
                send_version=False,
            )


if __name__ == "__main__":
    VersionTimestampTest().main()
