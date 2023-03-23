#!/usr/bin/env python3
# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /block endpoint.
"""

import http.client

from test_framework.address import ADDRESS_ECREG_P2SH_OP_TRUE, ADDRESS_ECREG_UNSPENDABLE
from test_framework.blocktools import GENESIS_BLOCK_HASH, TIME_GENESIS_BLOCK
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikBlockTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [['-chronik']]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        import chronik_pb2 as pb

        def query_block(hash_or_height):
            chronik_port = self.nodes[0].chronik_port
            client = http.client.HTTPConnection('127.0.0.1', chronik_port, timeout=4)
            client.request('GET', f'/block/{hash_or_height}')
            response = client.getresponse()
            assert_equal(response.getheader('Content-Type'),
                         'application/x-protobuf')
            return response

        def query_block_success(hash_or_height):
            response = query_block(hash_or_height)
            assert_equal(response.status, 200)
            proto_block = pb.Block()
            proto_block.ParseFromString(response.read())
            return proto_block

        def query_block_err(hash_or_height, status):
            response = query_block(hash_or_height)
            assert_equal(response.status, status)
            proto_error = pb.Error()
            proto_error.ParseFromString(response.read())
            return proto_error

        expected_genesis_block = pb.Block(
            block_info=pb.BlockInfo(
                hash=bytes.fromhex(GENESIS_BLOCK_HASH)[::-1],
                prev_hash=bytes(32),
                height=0,
                n_bits=0x207fffff,
                timestamp=TIME_GENESIS_BLOCK,
            ),
        )

        # Not a valid hash or height
        assert_equal(query_block_err('1234f', 400).msg,
                     '400: Not a hash or height: 1234f')
        assert_equal(query_block_err('00' * 31, 400).msg,
                     f'400: Not a hash or height: {"00"*31}')
        assert_equal(query_block_err('01', 400).msg, '400: Not a hash or height: 01')
        assert_equal(query_block_err('12345678901', 400).msg,
                     '400: Not a hash or height: 12345678901')

        # Query genesis block using height
        assert_equal(query_block_success(0), expected_genesis_block)
        # Or hash
        assert_equal(query_block_success(GENESIS_BLOCK_HASH), expected_genesis_block)

        # Block 1 not found
        assert_equal(query_block_err(1, 404).msg, '404: Block not found: 1')
        # Block "0000...0000" not found
        assert_equal(query_block_err('00' * 32, 404).msg,
                     f'404: Block not found: {"00"*32}')

        # Generate 100 blocks, verify they form a chain
        node = self.nodes[0]
        block_hashes = (
            [GENESIS_BLOCK_HASH] +
            self.generatetoaddress(node, 100, ADDRESS_ECREG_P2SH_OP_TRUE)
        )

        for i in range(1, 101):
            proto_block = query_block_success(i)
            assert_equal(proto_block, pb.Block(
                block_info=pb.BlockInfo(
                    hash=bytes.fromhex(block_hashes[i])[::-1],
                    prev_hash=bytes.fromhex(block_hashes[i - 1])[::-1],
                    height=i,
                    n_bits=0x207fffff,
                    timestamp=proto_block.block_info.timestamp,
                ),
            ))
            assert_equal(proto_block, query_block_success(block_hashes[i]))
            block_hashes.append(proto_block.block_info.hash)

        # Invalidate in the middle of the chain
        node.invalidateblock(block_hashes[50])
        # Gives 404 for the invalidated blocks
        for i in range(50, 101):
            assert_equal(query_block_err(i, 404).msg, f'404: Block not found: {i}')
            assert_equal(
                query_block_err(
                    block_hashes[i],
                    404).msg,
                f'404: Block not found: {block_hashes[i]}')
        # Previous blocks are still fine
        for i in range(0, 50):
            query_block_success(i)
            query_block_success(block_hashes[i])

        # Mine fork block and check it connects
        fork_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]

        proto_block = query_block_success(50)
        assert_equal(proto_block, pb.Block(
            block_info=pb.BlockInfo(
                hash=bytes.fromhex(fork_hash)[::-1],
                prev_hash=bytes.fromhex(block_hashes[49])[::-1],
                height=50,
                n_bits=0x207fffff,
                timestamp=proto_block.block_info.timestamp,
            ),
        ))
        assert_equal(query_block_success(fork_hash), proto_block)


if __name__ == '__main__':
    ChronikBlockTest().main()
