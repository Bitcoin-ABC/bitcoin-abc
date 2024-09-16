# Copyright (c) The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /header and /headers endpoints.
"""

from test_framework.address import ADDRESS_ECREG_P2SH_OP_TRUE, ADDRESS_ECREG_UNSPENDABLE
from test_framework.blocktools import GENESIS_BLOCK_HASH
from test_framework.merkle import merkle_root_and_branch
from test_framework.messages import hash256
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, hex_to_be_bytes

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

        self.log.info("Test the checkpoint_height query param")
        # checkpoint height must be higher than the queried header height
        assert_equal(
            chronik.block_header(hash_or_height=4, checkpoint_height=2).err(400).msg,
            "400: Invalid checkpoint height 2, may not be below queried header height 4",
        )

        # checkpoint height must be higher than the queried header height
        assert_equal(
            chronik.block_headers(0, 42, checkpoint_height=41).err(400).msg,
            "400: Invalid checkpoint height 41, may not be below queried header height 42",
        )

        # checkpoint_height=0 disables the checkpoint data, any other value enables it
        assert_equal(
            chronik.block_header(hash_or_height=0, checkpoint_height=0).ok(),
            expected_genesis_header,
        )
        for i in range(1, NUM_HEADERS + 1):
            proto_header = chronik.block_header(
                hash_or_height=i, checkpoint_height=0
            ).ok()
            assert_equal(proto_header.root, b"")
            assert_equal(proto_header.branch, [])

            proto_header = chronik.block_header(
                hash_or_height=i, checkpoint_height=i
            ).ok()
            assert proto_header.root != b""
            assert proto_header.branch != []

        block_hashes_bytes = [hex_to_be_bytes(h) for h in block_hashes]

        for checkpoint_height in range(1, len(block_hashes_bytes)):
            for block_height in range(checkpoint_height + 1):
                proto_header = chronik.block_header(
                    block_height, checkpoint_height
                ).ok()
                root, branch = merkle_root_and_branch(
                    block_hashes_bytes[: checkpoint_height + 1], block_height
                )
                assert_equal(proto_header.root, root)
                assert_equal(proto_header.branch, branch)

        proto_headers = (
            chronik.block_headers(
                0, NUM_HEADERS // 3, checkpoint_height=NUM_HEADERS // 2
            )
            .ok()
            .headers
        )

        for i, hdr in enumerate(proto_headers[:-1]):
            assert_equal(hdr.raw_header, block_headers_from_rpc[i])
            # only the final header has checkpoint data
            assert_equal(hdr.root, b"")
            assert_equal(hdr.branch, [])

        root, branch = merkle_root_and_branch(
            block_hashes_bytes[: NUM_HEADERS // 2 + 1], NUM_HEADERS // 3
        )
        assert_equal(
            proto_headers[-1].raw_header, block_headers_from_rpc[NUM_HEADERS // 3]
        )
        assert_equal(proto_headers[-1].root, root)
        assert_equal(proto_headers[-1].branch, branch)

        self.log.info("Invalidate a block in the middle of the chain.")
        # We can no longer query invalidated
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

        self.log.info("Mine a fork block and check it connects")
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

        self.log.info("Check merkle tree data after the block invalidation")
        block_hashes = (
            block_hashes[: NUM_HEADERS // 2]
            + [fork_hash]
            + self.generatetoaddress(node, NUM_HEADERS, ADDRESS_ECREG_P2SH_OP_TRUE)
        )
        block_hashes_bytes = [hex_to_be_bytes(h) for h in block_hashes]
        new_num_headers = len(block_hashes_bytes)

        for cp_height in range(1, new_num_headers):
            for block_height in range(cp_height + 1):
                root, branch = merkle_root_and_branch(
                    block_hashes_bytes[: cp_height + 1], block_height
                )
                proto_header = chronik.block_header(block_height, cp_height).ok()

                assert_equal(
                    proto_header.raw_header,
                    bytes.fromhex(
                        node.getblockheader(block_hashes[block_height], False)
                    ),
                )
                assert_equal(proto_header.root, root)
                assert_equal(proto_header.branch, branch)


if __name__ == "__main__":
    ChronikHeaderTest().main()
