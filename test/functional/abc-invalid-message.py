#!/usr/bin/env python3
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""ABC Invalid Message Test

Test that invalid messages get rejected and/or ban the sender as expected for
each case.
"""

import struct

from test_framework.messages import NODE_NETWORK, msg_version
from test_framework.p2p import P2PInterface, msg_ping
from test_framework.test_framework import BitcoinTestFramework


def msg_bad_checksum(connection, original_message):
    message_data = bytearray(connection.build_message(original_message))

    data = original_message.serialize()
    i = 0
    i += len(connection.magic_bytes)
    i += 12
    i += len(struct.pack("<I", len(data)))

    # Make the checksum invalid
    message_data[i] = message_data[i] ^ 0xAA
    return message_data


class BadVersionP2PInterface(P2PInterface):
    def peer_connect(self, *args, services=NODE_NETWORK,
                     send_version=False, **kwargs):
        self.services = services
        return super().peer_connect(*args, send_version=send_version, **kwargs)

    def send_version(self):
        # Send version message with invalid checksum
        vt = msg_version()
        vt.nServices = self.services
        vt.addrTo.ip = self.dstaddr
        vt.addrTo.port = self.dstport
        vt.addrFrom.ip = "0.0.0.0"
        vt.addrFrom.port = 0
        invalid_vt = msg_bad_checksum(self, vt)
        self.send_raw_message(invalid_vt)


class InvalidMessageTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = False
        self.num_nodes = 2

    def run_test(self):
        # Try to connect to a node using an invalid checksum on version message.
        # The version message is delayed because add_p2p_connection checks that
        # the connection is established, and sending a bad version immedately
        # on the first connection might get our peer disconnected before the
        # check happened, causing the test to fail.
        bad_interface = BadVersionP2PInterface()
        self.nodes[0].add_p2p_connection(
            bad_interface, send_version=False, wait_for_verack=False)

        # Also connect to a node with a valid version message
        interface = P2PInterface()
        # Node with valid version message should connect successfully
        connection = self.nodes[1].add_p2p_connection(interface)

        self.log.info(
            "Send an invalid version message and check we get banned")
        bad_interface.send_version()
        bad_interface.wait_for_disconnect()

        # Create a valid message
        valid_message = msg_ping(interface.ping_counter)

        def wait_for_ping():
            def check_ping():
                if not interface.last_message.get("pong"):
                    return False
                return interface.last_message["pong"].nonce == interface.ping_counter
            interface.wait_until(check_ping)
            interface.ping_counter += 1

        # The valid message is accepted
        connection.send_message(valid_message)
        wait_for_ping()

        # Make an invalid copy of the valid message with an invalid checksum
        invalid_message = msg_bad_checksum(connection, valid_message)

        # The invalid message should cause a disconnect because we are now
        # banned
        connection.send_raw_message(invalid_message)
        interface.wait_for_disconnect()


if __name__ == '__main__':
    InvalidMessageTest().main()
