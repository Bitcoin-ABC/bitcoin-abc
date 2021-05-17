# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /block endpoint.
"""

from test_framework.address import ADDRESS_ECREG_P2SH_OP_TRUE, ADDRESS_ECREG_UNSPENDABLE
from test_framework.blocktools import (
    COINBASE_MATURITY,
    GENESIS_BLOCK_HASH,
    TIME_GENESIS_BLOCK,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikBlockTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        from test_framework.chronik.client import pb

        expected_genesis_block = pb.Block(
            block_info=pb.BlockInfo(
                hash=bytes.fromhex(GENESIS_BLOCK_HASH)[::-1],
                prev_hash=bytes(32),
                height=0,
                n_bits=0x207FFFFF,
                timestamp=TIME_GENESIS_BLOCK,
                block_size=285,
                num_txs=1,
                num_inputs=1,
                num_outputs=1,
                sum_input_sats=0,
                sum_coinbase_output_sats=5000000000,
                sum_normal_output_sats=0,
                sum_burned_sats=0,
            ),
        )

        # Not a valid hash or height
        assert_equal(
            chronik.block("1234f").err(400).msg, "400: Not a hash or height: 1234f"
        )
        assert_equal(
            chronik.block("00" * 31).err(400).msg,
            f'400: Not a hash or height: {"00" * 31}',
        )
        assert_equal(chronik.block("01").err(400).msg, "400: Not a hash or height: 01")
        assert_equal(
            chronik.block("12345678901").err(400).msg,
            "400: Not a hash or height: 12345678901",
        )

        # Query genesis block using height
        assert_equal(chronik.block(0).ok(), expected_genesis_block)
        # Or hash
        assert_equal(chronik.block(GENESIS_BLOCK_HASH).ok(), expected_genesis_block)

        # Block 1 not found
        assert_equal(chronik.block(1).err(404).msg, "404: Block not found: 1")
        # Block "0000...0000" not found
        assert_equal(
            chronik.block("00" * 32).err(404).msg, f'404: Block not found: {"00" * 32}'
        )

        # Generate 100 blocks, verify they form a chain
        block_hashes = [GENESIS_BLOCK_HASH] + self.generatetoaddress(
            node, COINBASE_MATURITY, ADDRESS_ECREG_P2SH_OP_TRUE
        )

        expected_proto_blocks = []
        for i in range(1, COINBASE_MATURITY + 1):
            proto_block = chronik.block(i).ok()
            expected_proto = pb.Block(
                block_info=pb.BlockInfo(
                    hash=bytes.fromhex(block_hashes[i])[::-1],
                    prev_hash=bytes.fromhex(block_hashes[i - 1])[::-1],
                    height=i,
                    n_bits=0x207FFFFF,
                    timestamp=proto_block.block_info.timestamp,
                    block_size=181,
                    num_txs=1,
                    num_inputs=1,
                    num_outputs=1,
                    sum_input_sats=0,
                    sum_coinbase_output_sats=5000000000,
                    sum_normal_output_sats=0,
                    sum_burned_sats=0,
                ),
            )
            expected_proto_blocks.append(expected_proto)
            assert_equal(proto_block, expected_proto)
            assert_equal(proto_block, chronik.block(block_hashes[i]).ok())
            block_hashes.append(proto_block.block_info.hash)

        # Using -chronikreindex results in the same data
        self.restart_node(0, ["-chronik", "-chronikreindex"])
        for i in range(1, 101):
            assert_equal(chronik.block(i).ok(), expected_proto_blocks[i - 1])

        # Invalidate in the middle of the chain
        node.invalidateblock(block_hashes[50])
        # Gives 404 for the invalidated blocks
        for i in range(50, 101):
            assert_equal(chronik.block(i).err(404).msg, f"404: Block not found: {i}")
            assert_equal(
                chronik.block(block_hashes[i]).err(404).msg,
                f"404: Block not found: {block_hashes[i]}",
            )
        # Previous blocks are still fine
        for i in range(0, 50):
            chronik.block(i).ok()
            chronik.block(block_hashes[i]).ok()

        # Mine fork block and check it connects
        fork_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]

        proto_block = chronik.block(50).ok()
        assert_equal(
            proto_block,
            pb.Block(
                block_info=pb.BlockInfo(
                    hash=bytes.fromhex(fork_hash)[::-1],
                    prev_hash=bytes.fromhex(block_hashes[49])[::-1],
                    height=50,
                    n_bits=0x207FFFFF,
                    timestamp=proto_block.block_info.timestamp,
                    block_size=181,
                    num_txs=1,
                    num_inputs=1,
                    num_outputs=1,
                    sum_input_sats=0,
                    sum_coinbase_output_sats=5000000000,
                    sum_normal_output_sats=0,
                    sum_burned_sats=0,
                ),
            ),
        )
        assert_equal(chronik.block(fork_hash).ok(), proto_block)


if __name__ == "__main__":
    ChronikBlockTest().main()
