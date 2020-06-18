#!/usr/bin/env python3
# Copyright (c) 2015-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test node responses to invalid network messages."""
import struct
import time

from test_framework.messages import (
    CBlockHeader,
    CInv,
    msg_avahello,
    msg_avapoll,
    msg_avaresponse,
    msg_getdata,
    msg_headers,
    msg_inv,
    msg_ping,
    MSG_TX,
    ser_string,
)
from test_framework.mininode import (
    P2PDataStore,
    P2PInterface,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    hex_str_to_bytes,
    assert_equal,
    wait_until,
)

MSG_LIMIT = 2 * 1024 * 1024  # 2MB, per MAX_PROTOCOL_MESSAGE_LENGTH
VALID_DATA_LIMIT = MSG_LIMIT - 5  # Account for the 5-byte length prefix


class msg_unrecognized:
    """Nonsensical message. Modeled after similar types in test_framework.messages."""

    msgtype = b'badmsg'

    def __init__(self, *, str_data):
        self.str_data = str_data.encode() if not isinstance(str_data, bytes) else str_data

    def serialize(self):
        return ser_string(self.str_data)

    def __repr__(self):
        return "{}(data={})".format(self.msgtype, self.str_data)


class SenderOfAddrV2(P2PInterface):
    def wait_for_sendaddrv2(self):
        self.wait_until(lambda: 'sendaddrv2' in self.last_message)


class InvalidMessagesTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True

    def run_test(self):
        self.test_buffer()
        self.test_magic_bytes()
        self.test_checksum()
        self.test_size()
        self.test_msgtype()
        self.test_addrv2_empty()
        self.test_addrv2_no_addresses()
        self.test_addrv2_too_long_address()
        self.test_addrv2_unrecognized_network()
        self.test_large_inv()
        self.test_unsolicited_ava_messages()
        self.test_resource_exhaustion()

    def test_buffer(self):
        self.log.info(
            "Test message with header split across two buffers, should be received")
        conn = self.nodes[0].add_p2p_connection(P2PDataStore())
        # Create valid message
        msg = conn.build_message(msg_ping(nonce=12345))
        cut_pos = 12    # Chosen at an arbitrary position within the header
        # Send message in two pieces
        before = int(self.nodes[0].getnettotals()['totalbytesrecv'])
        conn.send_raw_message(msg[:cut_pos])
        # Wait until node has processed the first half of the message
        wait_until(
            lambda: int(
                self.nodes[0].getnettotals()['totalbytesrecv']) != before)
        middle = int(self.nodes[0].getnettotals()['totalbytesrecv'])
        # If this assert fails, we've hit an unlikely race
        # where the test framework sent a message in between the two halves
        assert_equal(middle, before + cut_pos)
        conn.send_raw_message(msg[cut_pos:])
        conn.sync_with_ping(timeout=1)
        self.nodes[0].disconnect_p2ps()

    def test_magic_bytes(self):
        conn = self.nodes[0].add_p2p_connection(P2PDataStore())
        with self.nodes[0].assert_debug_log(['PROCESSMESSAGE: INVALID MESSAGESTART badmsg']):
            msg = conn.build_message(msg_unrecognized(str_data="d"))
            # modify magic bytes
            msg = b'\xff' * 4 + msg[4:]
            conn.send_raw_message(msg)
            conn.wait_for_disconnect(timeout=1)
            self.nodes[0].disconnect_p2ps()

    def test_checksum(self):
        conn = self.nodes[0].add_p2p_connection(P2PDataStore())
        with self.nodes[0].assert_debug_log(['CHECKSUM ERROR (badmsg, 2 bytes), expected 78df0a04 was ffffffff']):
            msg = conn.build_message(msg_unrecognized(str_data="d"))
            # Checksum is after start bytes (4B), message type (12B), len (4B)
            cut_len = 4 + 12 + 4
            # modify checksum
            msg = msg[:cut_len] + b'\xff' * 4 + msg[cut_len + 4:]
            self.nodes[0].p2p.send_raw_message(msg)
            conn.wait_for_disconnect()
            self.nodes[0].disconnect_p2ps()

    def test_size(self):
        conn = self.nodes[0].add_p2p_connection(P2PDataStore())
        with self.nodes[0].assert_debug_log(['']):
            # Create a message with oversized payload
            msg = msg_unrecognized(str_data="d" * (VALID_DATA_LIMIT + 1))
            msg = conn.build_message(msg)
            self.nodes[0].p2p.send_raw_message(msg)
            conn.wait_for_disconnect(timeout=1)
            self.nodes[0].disconnect_p2ps()

    def test_msgtype(self):
        conn = self.nodes[0].add_p2p_connection(P2PDataStore())
        with self.nodes[0].assert_debug_log(['PROCESSMESSAGE: ERRORS IN HEADER']):
            msg = msg_unrecognized(str_data="d")
            msg.msgtype = b'\xff' * 12
            msg = conn.build_message(msg)
            # Modify msgtype
            msg = msg[:7] + b'\x00' + msg[7 + 1:]
            self.nodes[0].p2p.send_raw_message(msg)
            conn.sync_with_ping(timeout=1)
            self.nodes[0].disconnect_p2ps()

    def test_addrv2(self, label, required_log_messages, raw_addrv2):
        node = self.nodes[0]
        conn = node.add_p2p_connection(SenderOfAddrV2())

        # Make sure bitcoind signals support for ADDRv2, otherwise this test
        # will bombard an old node with messages it does not recognize which
        # will produce unexpected results.
        conn.wait_for_sendaddrv2()

        self.log.info('Test addrv2: ' + label)

        msg = msg_unrecognized(str_data=b'')
        msg.msgtype = b'addrv2'
        with node.assert_debug_log(required_log_messages):
            # override serialize() which would include the length of the data
            msg.serialize = lambda: raw_addrv2
            conn.send_raw_message(conn.build_message(msg))
            conn.sync_with_ping()

        node.disconnect_p2ps()

    def test_addrv2_empty(self):
        self.test_addrv2('empty',
                         [
                             'received: addrv2 (0 bytes)',
                             'ProcessMessages(addrv2, 0 bytes): Exception',
                             'end of data',
                         ],
                         b'')

    def test_addrv2_no_addresses(self):
        self.test_addrv2('no addresses',
                         [
                             'received: addrv2 (1 bytes)',
                         ],
                         hex_str_to_bytes('00'))

    def test_addrv2_too_long_address(self):
        self.test_addrv2('too long address',
                         [
                             'received: addrv2 (525 bytes)',
                             'ProcessMessages(addrv2, 525 bytes): Exception',
                             'Address too long: 513 > 512',
                         ],
                         hex_str_to_bytes(
                             # number of entries
                             '01' +
                             # time, Fri Jan  9 02:54:25 UTC 2009
                             '61bc6649' +
                             # service flags, COMPACTSIZE(NODE_NONE)
                             '00' +
                             # network type (IPv4)
                             '01' +
                             # address length (COMPACTSIZE(513))
                             'fd0102' +
                             # address
                             'ab' * 513 +
                             # port
                             '208d'))

    def test_addrv2_unrecognized_network(self):
        now_hex = struct.pack('<I', int(time.time())).hex()
        self.test_addrv2('unrecognized network',
                         [
                             'received: addrv2 (25 bytes)',
                             'IP 9.9.9.9 mapped',
                             'Added 1 addresses',
                         ],
                         hex_str_to_bytes(
                             # number of entries
                             '02' +

                             # this should be ignored without impeding acceptance of
                             # subsequent ones

                             # time
                             now_hex +
                             # service flags, COMPACTSIZE(NODE_NETWORK)
                             '01' +
                             # network type (unrecognized)
                             '99' +
                             # address length (COMPACTSIZE(2))
                             '02' +
                             # address
                             'ab' * 2 +
                             # port
                             '208d' +

                             # this should be added:

                             # time
                             now_hex +
                             # service flags, COMPACTSIZE(NODE_NETWORK)
                             '01' +
                             # network type (IPv4)
                             '01' +
                             # address length (COMPACTSIZE(4))
                             '04' +
                             # address
                             '09' * 4 +
                             # port
                             '208d'))

    def test_large_inv(self):
        conn = self.nodes[0].add_p2p_connection(P2PInterface())
        with self.nodes[0].assert_debug_log(['Misbehaving', '(0 -> 20): oversized-inv: message inv size() = 50001']):
            msg = msg_inv([CInv(MSG_TX, 1)] * 50001)
            conn.send_and_ping(msg)
        with self.nodes[0].assert_debug_log(['Misbehaving', '(20 -> 40): too-many-inv: message getdata size() = 50001']):
            msg = msg_getdata([CInv(MSG_TX, 1)] * 50001)
            conn.send_and_ping(msg)
        with self.nodes[0].assert_debug_log(['Misbehaving', '(40 -> 60): too-many-headers: headers message size = 2001']):
            msg = msg_headers([CBlockHeader()] * 2001)
            conn.send_and_ping(msg)
        self.nodes[0].disconnect_p2ps()

    def test_unsolicited_ava_messages(self):
        """Node 0 has avalanche disabled by default. If a node does not
        advertise the avalanche service flag, it does not expect to receive
        any avalanche related message and should consider it as spam.
        """
        conn = self.nodes[0].add_p2p_connection(P2PInterface())
        with self.nodes[0].assert_debug_log(
                ['Misbehaving', '(0 -> 20): unsolicited-avahello']):
            msg = msg_avahello()
            conn.send_and_ping(msg)
        with self.nodes[0].assert_debug_log(
                ['Misbehaving', '(20 -> 40): unsolicited-avapoll']):
            msg = msg_avapoll()
            conn.send_and_ping(msg)
        with self.nodes[0].assert_debug_log(
                ['Misbehaving', '(40 -> 60): unsolicited-avaresponse']):
            msg = msg_avaresponse()
            conn.send_and_ping(msg)
        self.nodes[0].disconnect_p2ps()

    def test_resource_exhaustion(self):
        conn = self.nodes[0].add_p2p_connection(P2PDataStore())
        conn2 = self.nodes[0].add_p2p_connection(P2PDataStore())
        msg_at_size = msg_unrecognized(str_data="b" * VALID_DATA_LIMIT)
        assert len(msg_at_size.serialize()) == MSG_LIMIT

        self.log.info(
            "Sending a bunch of large, junk messages to test memory exhaustion. May take a bit...")

        # Run a bunch of times to test for memory exhaustion.
        for _ in range(80):
            conn.send_message(msg_at_size)

        # Check that, even though the node is being hammered by nonsense from one
        # connection, it can still service other peers in a timely way.
        for _ in range(20):
            conn2.sync_with_ping(timeout=2)

        # Peer 1, despite being served up a bunch of nonsense, should still be
        # connected.
        self.log.info("Waiting for node to drop junk messages.")
        conn.sync_with_ping(timeout=400)
        assert conn.is_connected
        self.nodes[0].disconnect_p2ps()


if __name__ == '__main__':
    InvalidMessagesTest().main()
