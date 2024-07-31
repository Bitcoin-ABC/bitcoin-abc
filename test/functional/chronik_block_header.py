# Copyright (c) The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /header and /headers endpoints.
"""

from test_framework.address import ADDRESS_ECREG_P2SH_OP_TRUE, ADDRESS_ECREG_UNSPENDABLE
from test_framework.blocktools import GENESIS_BLOCK_HASH
from test_framework.messages import hash256
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

NUM_HEADERS = 10

GENESIS_HEADER = bytes.fromhex(
    "0100000000000000000000000000000000000000000000000000000000000000000000003ba3edfd7"
    "a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4adae5494dffff7f2002000000"
)


class ChronikHeaderTest(BitcoinTestFramework):
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

        expected_genesis_header = pb.BlockHeader(
            raw_header=GENESIS_HEADER,
        )

        self.log.info("Test the /header endpoint before mining any block")
        # Not a valid hash or height
        assert_equal(
            chronik.block_header("1234f").err(400).msg,
            "400: Not a hash or height: 1234f",
        )
        assert_equal(
            chronik.block_header("00" * 31).err(400).msg,
            f'400: Not a hash or height: {"00" * 31}',
        )
        assert_equal(
            chronik.block_header("01").err(400).msg, "400: Not a hash or height: 01"
        )
        assert_equal(
            chronik.block_header("12345678901").err(400).msg,
            "400: Not a hash or height: 12345678901",
        )

        # Query genesis block using height
        assert_equal(chronik.block_header(0).ok(), expected_genesis_header)
        # Or hash
        assert_equal(
            chronik.block_header(GENESIS_BLOCK_HASH).ok(), expected_genesis_header
        )

        # Block 1 not found
        assert_equal(chronik.block_header(1).err(404).msg, "404: Block not found: 1")
        # Block "0000...0000" not found
        assert_equal(
            chronik.block_header("00" * 32).err(404).msg,
            f'404: Block not found: {"00" * 32}',
        )

        self.log.info("Test the /headers endpoint before mining any block")
        assert_equal(
            chronik.block_headers(-1, 0).err(400).msg,
            "400: Invalid block start height: -1",
        )
        assert_equal(
            chronik.block_headers(-(2**31), 0).err(400).msg,
            f"400: Invalid block start height: {-2**31}",
        )
        assert_equal(
            chronik.block_headers(2, 1).err(400).msg, "400: Invalid block end height: 1"
        )
        assert_equal(
            chronik.block_headers(1, 501).err(400).msg,
            "400: Blocks page size too large, may not be above 500 but got 501",
        )
        # Doesn't overflow:
        assert_equal(
            chronik.block_headers(0, 2**31 - 1).err(400).msg,
            f"400: Blocks page size too large, may not be above 500 but got {2**31}",
        )

        assert_equal(
            chronik.block_headers(0, 100).ok(),
            pb.BlockHeaders(headers=[expected_genesis_header]),
        )
        assert_equal(
            chronik.block_headers(0, 0).ok(),
            pb.BlockHeaders(headers=[expected_genesis_header]),
        )
        assert_equal(chronik.block_headers(500, 500).ok(), pb.BlockHeaders(headers=[]))
        assert_equal(chronik.block_headers(1, 500).ok(), pb.BlockHeaders(headers=[]))
        assert_equal(chronik.block_headers(500, 999).ok(), pb.BlockHeaders(headers=[]))
        assert_equal(
            chronik.block_headers(2**31 - 500, 2**31 - 1).ok(),
            pb.BlockHeaders(headers=[]),
        )

        self.log.info("Mine blocks and test the endpoints")
        # Generate blocks, verify they form a chain
        block_hashes = [GENESIS_BLOCK_HASH] + self.generatetoaddress(
            node, NUM_HEADERS, ADDRESS_ECREG_P2SH_OP_TRUE
        )

        # Get the headers via RPC and compare them to the ones returned by chronik
        block_headers_from_rpc = [
            bytes.fromhex(node.getblockheader(h, False)) for h in block_hashes
        ]

        expected_proto_headers = []
        for i in range(1, NUM_HEADERS + 1):
            proto_header = chronik.block_header(i).ok()
            expected_proto = pb.BlockHeader(raw_header=block_headers_from_rpc[i])
            expected_proto_headers.append(expected_proto)
            assert_equal(proto_header, expected_proto)
            assert_equal(proto_header, chronik.block_header(block_hashes[i]).ok())
            assert_equal(hash256(proto_header.raw_header)[::-1].hex(), block_hashes[i])

        assert_equal(
            [
                hdr.raw_header
                for hdr in chronik.block_headers(0, NUM_HEADERS).ok().headers
            ],
            block_headers_from_rpc,
        )

        # Invalidate in the middle of the chain. We can no longer query invalidated
        # headers by height, but they remain accessible by hash
        node.invalidateblock(block_hashes[NUM_HEADERS // 2])
        for i in range(NUM_HEADERS // 2, NUM_HEADERS + 1):
            assert_equal(
                chronik.block_header(i).err(404).msg, f"404: Block not found: {i}"
            )
            chronik.block_header(block_hashes[i]).ok()

        # Previous blocks are still fine
        for i in range(0, NUM_HEADERS // 2):
            chronik.block_header(i).ok()
            chronik.block_header(block_hashes[i]).ok()

        assert_equal(
            [
                hdr.raw_header
                for hdr in chronik.block_headers(0, NUM_HEADERS).ok().headers
            ],
            block_headers_from_rpc[: NUM_HEADERS // 2],
        )

        # Mine fork block and check it connects
        fork_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        assert fork_hash != block_hashes[NUM_HEADERS // 2]

        proto_header = chronik.block_header(NUM_HEADERS // 2).ok()
        rpc_header = bytes.fromhex(node.getblockheader(fork_hash, False))
        assert_equal(proto_header, pb.BlockHeader(raw_header=rpc_header))
        assert_equal(chronik.block_header(fork_hash).ok(), proto_header)

        assert_equal(
            [
                hdr.raw_header
                for hdr in chronik.block_headers(0, NUM_HEADERS).ok().headers
            ],
            block_headers_from_rpc[: NUM_HEADERS // 2] + [rpc_header],
        )


if __name__ == "__main__":
    ChronikHeaderTest().main()
