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
from test_framework.mininode import (
    MAGIC_BYTES,
    mininode_lock,
    msg_ping,
    P2PInterface,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import wait_until


def msg_bad_checksum(connection, original_message):
    message_data = bytearray(connection._build_message(original_message))

    data = original_message.serialize()
    i = 0
    i += len(MAGIC_BYTES[connection.network])
    i += 12
    i += len(struct.pack("<I", len(data)))

    # Make the checksum invalid
    message_data[i] = message_data[i] ^ 0xAA
    return message_data


class BadVersionP2PInterface(P2PInterface):
    def peer_connect(self, *args, services=NODE_NETWORK, send_version=False, **kwargs):
        create_conn = super().peer_connect(*args, send_version=send_version, **kwargs)

        # Send version message with invalid checksum
        vt = msg_version()
        vt.nServices = services
        vt.addrTo.ip = self.dstaddr
        vt.addrTo.port = self.dstport
        vt.addrFrom.ip = "0.0.0.0"
        vt.addrFrom.port = 0
        invalid_vt = msg_bad_checksum(self, vt)
        # Will be sent right after connection_made
        self.on_connection_send_msg = invalid_vt
        self.on_connection_send_msg_is_raw = True

        return create_conn


class InvalidMessageTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = False
        self.num_nodes = 2

    def run_test(self):
        # Try to connect to a node using an invalid checksum on version message
        bad_interface = BadVersionP2PInterface()
        self.nodes[0].add_p2p_connection(
            bad_interface, send_version=False, wait_for_verack=False)

        # Also connect to a node with a valid version message
        interface = P2PInterface()
        # Node with valid version message should connect successfully
        connection = self.nodes[1].add_p2p_connection(interface)

        # The invalid version message should cause a disconnect on the first
        # connection because we are now banned
        bad_interface.wait_for_disconnect()

        # Create a valid message
        valid_message = msg_ping(interface.ping_counter)

        def wait_for_ping():
            def check_ping():
                if not interface.last_message.get("pong"):
                    return False
                return interface.last_message["pong"].nonce == interface.ping_counter
            wait_until(check_ping, lock=mininode_lock)
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
