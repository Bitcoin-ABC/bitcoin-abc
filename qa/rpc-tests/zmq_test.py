#!/usr/bin/env python3
# Copyright (c) 2015-2017 The Bitcoin Core developers
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#
# Test ZMQ interface
#

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import *
import zmq
import struct


class ZMQTest (BitcoinTestFramework):

    def __init__(self):
        super().__init__()
        self.num_nodes = 2

    def setup_nodes(self):
        self.zmqContext = zmq.Context()
        self.zmqSubSocket = self.zmqContext.socket(zmq.SUB)
        self.zmqSubSocket.set(zmq.RCVTIMEO, 60000)
        self.zmqSubSocket.setsockopt(zmq.SUBSCRIBE, b"hashblock")
        self.zmqSubSocket.setsockopt(zmq.SUBSCRIBE, b"hashtx")
        ip_address = "tcp://127.0.0.1:28332"
        self.zmqSubSocket.connect(ip_address)
        extra_args = [
            ['-zmqpubhashtx=%s' % ip_address, '-zmqpubhashblock=%s' % ip_address], []]
        self.nodes = start_nodes(
            self.num_nodes, self.options.tmpdir, extra_args)

    def run_test(self):
        try:
            self._zmq_test()
        finally:
            # Destroy the zmq context
            self.log.debug("Destroying zmq context")
            self.zmqContext.destroy(linger=None)

    def _zmq_test(self):
        genhashes = self.nodes[0].generate(1)
        self.sync_all()

        self.log.info("listen...")
        msg = self.zmqSubSocket.recv_multipart()
        topic = msg[0]
        assert_equal(topic, b"hashtx")
        body = msg[1]
        msgSequence = struct.unpack('<I', msg[-1])[-1]
        # Must be sequence 0 on hashtx
        assert_equal(msgSequence, 0)

        msg = self.zmqSubSocket.recv_multipart()
        topic = msg[0]
        body = msg[1]
        msgSequence = struct.unpack('<I', msg[-1])[-1]
        # Must be sequence 0 on hashblock
        assert_equal(msgSequence, 0)
        blkhash = bytes_to_hex_str(body)

        # blockhash from generate must be equal to the hash received over zmq
        assert_equal(genhashes[0], blkhash)

        n = 10
        genhashes = self.nodes[1].generate(n)
        self.sync_all()

        zmqHashes = []
        blockcount = 0
        for x in range(n * 2):
            msg = self.zmqSubSocket.recv_multipart()
            topic = msg[0]
            body = msg[1]
            if topic == b"hashblock":
                zmqHashes.append(bytes_to_hex_str(body))
                msgSequence = struct.unpack('<I', msg[-1])[-1]
                assert_equal(msgSequence, blockcount + 1)
                blockcount += 1

        for x in range(n):
            # blockhash from generate must be equal to the hash
            # received over zmq
            assert_equal(genhashes[x], zmqHashes[x])

        # Test tx from a second node
        hashRPC = self.nodes[1].sendtoaddress(
            self.nodes[0].getnewaddress(), 1.0)
        self.sync_all()

        # Now we should receive a zmq msg because the tx was broadcast
        msg = self.zmqSubSocket.recv_multipart()
        topic = msg[0]
        body = msg[1]
        assert_equal(topic, b"hashtx")
        hashZMQ = bytes_to_hex_str(body)
        msgSequence = struct.unpack('<I', msg[-1])[-1]
        assert_equal(msgSequence, blockcount + 1)
        # txid from sendtoaddress must be equal to the hash received over zmq
        assert_equal(hashRPC, hashZMQ)

if __name__ == '__main__':
    ZMQTest().main()
