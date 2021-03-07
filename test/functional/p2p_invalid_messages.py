#!/usr/bin/env python3
# Copyright (c) 2015-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test node responses to invalid network messages."""
import asyncio
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
    NetworkThread,
    P2PDataStore,
    P2PInterface,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import hex_str_to_bytes


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
        """
         . Test msg header
        0. Send a bunch of large (2MB) messages of an unrecognized type. Check to see
           that it isn't an effective DoS against the node.

        1. Send an oversized (2MB+) message and check that we're disconnected.

        2. Send a few messages with an incorrect data size in the header, ensure the
           messages are ignored.
        """
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

        node = self.nodes[0]
        self.node = node
        node.add_p2p_connection(P2PDataStore())
        conn2 = node.add_p2p_connection(P2PDataStore())

        # 2MB, per MAX_PROTOCOL_MESSAGE_LENGTH
        msg_limit = 2 * 1024 * 1024
        # Account for the 4-byte length prefix
        valid_data_limit = msg_limit - 5

        #
        # 0.
        #
        # Send as large a message as is valid, ensure we aren't disconnected but
        # also can't exhaust resources.
        #
        msg_at_size = msg_unrecognized(str_data="b" * valid_data_limit)
        assert len(msg_at_size.serialize()) == msg_limit

        self.log.info(
            "Sending a bunch of large, junk messages to test memory exhaustion. May take a bit...")

        # Run a bunch of times to test for memory exhaustion.
        for _ in range(80):
            node.p2p.send_message(msg_at_size)

        # Check that, even though the node is being hammered by nonsense from one
        # connection, it can still service other peers in a timely way.
        for _ in range(20):
            conn2.sync_with_ping(timeout=2)

        # Peer 1, despite serving up a bunch of nonsense, should still be
        # connected.
        self.log.info("Waiting for node to drop junk messages.")
        node.p2p.sync_with_ping(timeout=320)
        assert node.p2p.is_connected

        #
        # 1.
        #
        # Send an oversized message, ensure we're disconnected.
        #
        msg_over_size = msg_unrecognized(str_data="b" * (valid_data_limit + 1))
        assert len(msg_over_size.serialize()) == (msg_limit + 1)

        with node.assert_debug_log(["Oversized header detected"]):
            # An unknown message type (or *any* message type) over
            # MAX_PROTOCOL_MESSAGE_LENGTH should result in a disconnect.
            node.p2p.send_message(msg_over_size)
            node.p2p.wait_for_disconnect(timeout=4)

        node.disconnect_p2ps()
        conn = node.add_p2p_connection(P2PDataStore())
        conn.wait_for_verack()

        #
        # 2.
        #
        # Send messages with an incorrect data size in the header.
        #
        actual_size = 100
        msg = msg_unrecognized(str_data="b" * actual_size)

        # TODO: handle larger-than cases. I haven't been able to pin down what
        # behavior to expect.
        for wrong_size in (2, 77, 78, 79):
            self.log.info(
                "Sending a message with incorrect size of {}".format(wrong_size))

            # Unmodified message should submit okay.
            node.p2p.send_and_ping(msg)

            # A message lying about its data size results in a disconnect when the incorrect
            # data size is less than the actual size.
            #
            # TODO: why does behavior change at 78 bytes?
            #
            node.p2p.send_raw_message(
                self._tweak_msg_data_size(
                    msg, wrong_size))

            # For some reason unknown to me, we sometimes have to push additional data to the
            # peer in order for it to realize a disconnect.
            try:
                node.p2p.send_message(msg_ping(nonce=123123))
            except IOError:
                pass

            node.p2p.wait_for_disconnect(timeout=10)
            node.disconnect_p2ps()
            node.add_p2p_connection(P2PDataStore())

        # Node is still up.
        conn = node.add_p2p_connection(P2PDataStore())

    def test_magic_bytes(self):
        conn = self.nodes[0].add_p2p_connection(P2PDataStore())

        async def swap_magic_bytes():
            # Need to ignore all incoming messages from now, since they come
            # with "invalid" magic bytes
            conn._on_data = lambda: None
            conn.magic_bytes = b'\x00\x11\x22\x32'

        # Call .result() to block until the atomic swap is complete, otherwise
        # we might run into races later on
        asyncio.run_coroutine_threadsafe(
            swap_magic_bytes(),
            NetworkThread.network_event_loop).result()

        with self.nodes[0].assert_debug_log(['PROCESSMESSAGE: INVALID MESSAGESTART ping']):
            conn.send_message(msg_ping(nonce=0xff))
            conn.wait_for_disconnect(timeout=1)
            self.nodes[0].disconnect_p2ps()

    def test_checksum(self):
        conn = self.nodes[0].add_p2p_connection(P2PDataStore())
        with self.nodes[0].assert_debug_log(['CHECKSUM ERROR (badmsg, 2 bytes), expected 78df0a04 was ffffffff']):
            msg = conn.build_message(msg_unrecognized(str_data="d"))
            cut_len = (
                # magic
                4 +
                # msgtype
                12 +
                # len
                4
            )
            # modify checksum
            msg = msg[:cut_len] + b'\xff' * 4 + msg[cut_len + 4:]
            self.nodes[0].p2p.send_raw_message(msg)
            conn.wait_for_disconnect()
            self.nodes[0].disconnect_p2ps()

    def test_size(self):
        conn = self.nodes[0].add_p2p_connection(P2PDataStore())
        with self.nodes[0].assert_debug_log(['']):
            msg = conn.build_message(msg_unrecognized(str_data="d"))
            cut_len = (
                # magic
                4 +
                # command
                12
            )
            # modify len to MAX_SIZE + 1
            msg = msg[:cut_len] + \
                struct.pack("<I", 0x02000000 + 1) + msg[cut_len + 4:]
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
        with self.nodes[0].assert_debug_log(['Misbehaving', 'peer=8 (0 -> 20): oversized-inv: message inv size() = 50001']):
            msg = msg_inv([CInv(MSG_TX, 1)] * 50001)
            conn.send_and_ping(msg)
        with self.nodes[0].assert_debug_log(['Misbehaving', 'peer=8 (20 -> 40): too-many-inv: message getdata size() = 50001']):
            msg = msg_getdata([CInv(MSG_TX, 1)] * 50001)
            conn.send_and_ping(msg)
        with self.nodes[0].assert_debug_log(['Misbehaving', 'peer=8 (40 -> 60): too-many-headers: headers message size = 2001']):
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
                ['Misbehaving', 'peer=9 (0 -> 20): unsolicited-avahello']):
            msg = msg_avahello()
            conn.send_and_ping(msg)
        with self.nodes[0].assert_debug_log(
                ['Misbehaving', 'peer=9 (20 -> 40): unsolicited-avapoll']):
            msg = msg_avapoll()
            conn.send_and_ping(msg)
        with self.nodes[0].assert_debug_log(
                ['Misbehaving', 'peer=9 (40 -> 60): unsolicited-avaresponse']):
            msg = msg_avaresponse()
            conn.send_and_ping(msg)
        self.nodes[0].disconnect_p2ps()

    def _tweak_msg_data_size(self, message, wrong_size):
        """
        Return a raw message based on another message but with an incorrect data size in
        the message header.
        """
        raw_msg = self.node.p2p.build_message(message)

        bad_size_bytes = struct.pack("<I", wrong_size)
        num_header_bytes_before_size = 4 + 12

        # Replace the correct data size in the message with an incorrect one.
        raw_msg_with_wrong_size = (
            raw_msg[:num_header_bytes_before_size] +
            bad_size_bytes +
            raw_msg[(num_header_bytes_before_size + len(bad_size_bytes)):]
        )
        assert len(raw_msg) == len(raw_msg_with_wrong_size)

        return raw_msg_with_wrong_size


if __name__ == '__main__':
    InvalidMessagesTest().main()
