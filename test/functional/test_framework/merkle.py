# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Function to compute merkle trees
"""

import math
import unittest

from .messages import hash256
from .util import assert_equal, hex_to_be_bytes


def branch_length(num_hashes: int):
    return math.ceil(math.log2(num_hashes))


def hash_one_level(hashes: list[bytes]) -> list[bytes]:
    """Return a new list of hashes half of the original size.
    The number of input hashes must be even.

    input: h0 h1 h2 h3 ...  h_n-1 h_n

    output: hash(h0 + h1) hash(h2 + h3) ... hash(h_n-1 + h_n)
    """
    assert len(hashes) % 2 == 0
    out = []
    for i in range(0, len(hashes), 2):
        out.append(hash256(hashes[i] + hashes[i + 1]))
    return out


def merkle_root_and_branch(
    hashes: list[bytes], index: int
) -> tuple[bytes, list[bytes]]:
    """Return the merkle root of a list of  hashes, and a list of intermediate
    hashes in the merkle tree that are needed to prove that the hash at a given index
    is part of the tree.
    """
    assert 0 <= index < len(hashes)

    bl = branch_length(len(hashes))
    branch = []

    working_hashes = hashes.copy()

    for i in range(bl):
        if len(working_hashes) % 2 == 1:
            # odd number of hashes, duplicate last one
            working_hashes.append(working_hashes[-1])

        branch.append(working_hashes[index ^ 1])
        index >>= 1

        working_hashes = hash_one_level(working_hashes)

    assert len(working_hashes) == 1
    return working_hashes[0], branch


def merkle_root_from_hash_and_branch(
    hash_: bytes, index: int, branch: list[bytes]
) -> bytes:
    """Given a block hash at a specified index/height in the blockchain and a branch
    of intermediate hashes, compute the merkle root.
    """
    working_hash = hash_
    for intermediate_hash in branch:
        if index & 1:
            working_hash = hash256(intermediate_hash + working_hash)
        else:
            working_hash = hash256(working_hash + intermediate_hash)
        index >>= 1
    assert index == 0, "index out of range for branch"
    return working_hash


class TestFrameworkMerkle(unittest.TestCase):
    """Same test vectors as unittests in merkle.rs, using the first blockhashes of
    the mainnet chain and tested against value returned by Fulcrum"""

    def setUp(self):
        self.block_hashes = [
            hex_to_be_bytes(h)
            for h in (
                "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
                "00000000839a8e6886ab5951d76f411475428afc90947ee320161bbf18eb6048",
                "000000006a625f06636b8bb6ac7b960a8d03705d1ace08b1a19da3fdcc99ddbd",
                "0000000082b5015589a3fdf2d4baff403e6f0be035a5d9742c1cae6295464449",
                "000000004ebadb55ee9096c9a2f8880e09da59c0d68b1c228da88e48844a1485",
                "000000009b7262315dbf071787ad3656097b892abffd1f95a1a022f896f533fc",
                "000000003031a0e73735690c5a1ff2a4be82553b2a12b776fbd3a215dc8f778d",
                "0000000071966c2b1d065fd446b1e485b2c9d9594acd2007ccbd5441cfc89444",
                "00000000408c48f847aa786c2268fc3e6ec2af68e8468a34a28c61b7f1de0dc6",
                "000000008d9dc510f23c2657fc4f67bea30078cc05a90eb89e84cc475c080805",
                "000000002c05cc2e78923c34df87fd108b22221ac6076c18f3ade378a4d915e9",
                "0000000097be56d606cdd9c54b04d4747e957d3608abe69198c661f2add73073",
                "0000000027c2488e2510d1acf4369787784fa20ee084c258b58d9fbd43802b5e",
                "000000005c51de2031a895adc145ee2242e919a01c6d61fb222a54a54b4d3089",
                "0000000080f17a0c5a67f663a9bc9969eb37e81666d9321125f0e293656f8a37",
                "00000000b3322c8c3ef7d2cf6da009a776e6a99ee65ec5a32f3f345712238473",
                "00000000174a25bb399b009cc8deff1c4b3ea84df7e93affaaf60dc3416cc4f5",
            )
        ]

        self.expected_roots = [
            hex_to_be_bytes(h)
            for h in (
                "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
                "abdc2227d02d114b77be15085c1257709252a7a103f9ac0ab3c85d67e12bc0b8",
                "6ce668e2ec49dae449c0d55de7b1c973696c7d4a47024dbcb26ee99411244ff6",
                "965ac94082cebbcffe458075651e9cc33ce703ab0115c72d9e8b1a9906b2b636",
                "a7b8e38ec91da1483864ecd86a19580a79c385c3871c1b74e4c9cca38a9a43a5",
                "8128c71269a41befbdbacb87e90cf246991cc305a357df36ddb4345f1e691f52",
                "1872dce49586510591bb2a2a10fba53300694c85995cdb64aa72f871bb688d88",
                "c809e7a698a4b4c474ff6f5f05e88af6d7cb80ddbbe302660dfe6bd1969224a2",
                "e347b1c43fd9b5415bf0d92708db8284b78daf4d0e24f9c3405f45feb85e25db",
                "8a5027e722a53eef05400679fe711bd5cea74ba0b604d9a98caabf8ac0986a7e",
                "8b8f513a34feeb1f2cdac70fcd97042be23ccd64de9d66d36f9407bbc1809f5f",
                "b05152646ed9384d234ae37e034db54e1ff65314200edd9617c53cd72a2e706d",
                "15288b27a233994b809901c91af1bd27992b20b26cf187b4eb72d6a2858ff5f0",
                "77f9bc6eae1e18f92f746fb2f6b8f66c11086833ae2177f60905f0b2397ef67a",
                "4ffb2fac9ecd33b1925bae9c8e2ae89b85078b90853b1feb5d7038a8fdbd1176",
                "3cdcb64f35c3fc45a2737c2c22c5b61ccb8b93d36af10d21ae953b7d91e094d7",
                "ad1bb2b84eeb782e3cc281cc801ae5da49a43b60b2a37c265c37737553709f21",
            )
        ]

    def test_roots(self):
        for i in range(len(self.block_hashes)):
            root, _branch = merkle_root_and_branch(self.block_hashes[: i + 1], 0)
            assert_equal(root, self.expected_roots[i])

    def test_branches(self):
        def assert_branch(
            hashes: list[bytes], index: int, expected_branch: list[bytes]
        ):
            root, branch = merkle_root_and_branch(hashes, index)
            assert_equal(branch, expected_branch)
            assert_equal(
                merkle_root_from_hash_and_branch(
                    self.block_hashes[index], index, branch
                ),
                root,
            )

        assert_branch(self.block_hashes[:1], 0, [])
        assert_branch(self.block_hashes[:2], 0, [self.block_hashes[1]])
        assert_branch(self.block_hashes[:2], 1, [self.block_hashes[0]])
        assert_branch(
            self.block_hashes[:3],
            0,
            [
                self.block_hashes[1],
                hex_to_be_bytes(
                    "66e512a6e02cea83ac65cbdd907a2731e778b96b71839ff7b19836c433c5c92b"
                ),
            ],
        )
        assert_branch(
            self.block_hashes[:3],
            1,
            [
                self.block_hashes[0],
                hex_to_be_bytes(
                    "66e512a6e02cea83ac65cbdd907a2731e778b96b71839ff7b19836c433c5c92b"
                ),
            ],
        )
        assert_branch(
            self.block_hashes[:3],
            2,
            [
                self.block_hashes[2],
                hex_to_be_bytes(
                    "abdc2227d02d114b77be15085c1257709252a7a103f9ac0ab3c85d67e12bc0b8"
                ),
            ],
        )
        assert_branch(
            self.block_hashes[:16],
            7,
            [
                self.block_hashes[6],
                hex_to_be_bytes(
                    "f9f17a3c6d02b0920eccb11156df370bf4117fae2233dfee40817586ba981ca5"
                ),
                hex_to_be_bytes(
                    "965ac94082cebbcffe458075651e9cc33ce703ab0115c72d9e8b1a9906b2b636"
                ),
                hex_to_be_bytes(
                    "a0c4df031de8f1370f278ac9f3dcdca4f627f86ff6238f09e40270bb9ecd3f62"
                ),
            ],
        )
        assert_branch(
            self.block_hashes[:16],
            10,
            [
                self.block_hashes[11],
                hex_to_be_bytes(
                    "cd5d21a5bc8ad65c8dc862bd9e6ec38f914ee6499d7e0ad23d7ca9582770b6c2"
                ),
                hex_to_be_bytes(
                    "d84ed7114670b8d129dd1d50970315995c0d6309e0935e7bbc91477bfc717d3a"
                ),
                hex_to_be_bytes(
                    "c809e7a698a4b4c474ff6f5f05e88af6d7cb80ddbbe302660dfe6bd1969224a2"
                ),
            ],
        )
        assert_branch(
            self.block_hashes[:16],
            15,
            [
                self.block_hashes[14],
                hex_to_be_bytes(
                    "e55021736ef89c3787e2729058a76a3cf6decf561b856c57eb88ed99899009d1"
                ),
                hex_to_be_bytes(
                    "e9106987dc15c9ea710feeed3c2b3252cbfe21925803696ea52aa7b50a0f1085"
                ),
                hex_to_be_bytes(
                    "c809e7a698a4b4c474ff6f5f05e88af6d7cb80ddbbe302660dfe6bd1969224a2"
                ),
            ],
        )
