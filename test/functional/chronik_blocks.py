#!/usr/bin/env python3
# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /blocks/:start_height/:end_height endpoint.
"""

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.blocktools import GENESIS_BLOCK_HASH, TIME_GENESIS_BLOCK
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikBlockRangeTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        node.setmocktime(1300000000)
        chronik = node.get_chronik_client()

        assert_equal(
            chronik.blocks(-1, 0).err(400).msg, "400: Invalid block start height: -1"
        )
        assert_equal(
            chronik.blocks(-(2**31), 0).err(400).msg,
            f"400: Invalid block start height: {-2**31}",
        )
        assert_equal(
            chronik.blocks(2, 1).err(400).msg, "400: Invalid block end height: 1"
        )
        assert_equal(
            chronik.blocks(1, 501).err(400).msg,
            "400: Blocks page size too large, may not be above 500 but got 501",
        )
        # Doesn't overflow:
        assert_equal(
            chronik.blocks(0, 2**31 - 1).err(400).msg,
            f"400: Blocks page size too large, may not be above 500 but got {2**31}",
        )

        from test_framework.chronik.client import pb

        genesis_info = pb.BlockInfo(
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
        )
        assert_equal(chronik.blocks(0, 100).ok(), pb.Blocks(blocks=[genesis_info]))
        assert_equal(chronik.blocks(0, 0).ok(), pb.Blocks(blocks=[genesis_info]))
        assert_equal(chronik.blocks(500, 500).ok(), pb.Blocks(blocks=[]))
        assert_equal(chronik.blocks(1, 500).ok(), pb.Blocks(blocks=[]))
        assert_equal(chronik.blocks(500, 999).ok(), pb.Blocks(blocks=[]))
        assert_equal(chronik.blocks(2**31 - 500, 2**31 - 1).ok(), pb.Blocks(blocks=[]))

        block_hashes = [GENESIS_BLOCK_HASH]
        block_hashes += self.generatetoaddress(node, 12, ADDRESS_ECREG_UNSPENDABLE)

        assert_equal(
            chronik.blocks(8, 12).ok(),
            pb.Blocks(
                blocks=[
                    pb.BlockInfo(
                        hash=bytes.fromhex(block_hashes[height])[::-1],
                        prev_hash=bytes.fromhex(block_hashes[height - 1])[::-1],
                        height=height,
                        n_bits=0x207FFFFF,
                        timestamp=1300000003,
                        block_size=181,
                        num_txs=1,
                        num_inputs=1,
                        num_outputs=1,
                        sum_input_sats=0,
                        sum_coinbase_output_sats=5000000000,
                        sum_normal_output_sats=0,
                        sum_burned_sats=0,
                    )
                    for height in range(8, 13)
                ]
            ),
        )


if __name__ == "__main__":
    ChronikBlockRangeTest().main()
