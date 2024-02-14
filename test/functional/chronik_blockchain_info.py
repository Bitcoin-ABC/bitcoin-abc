# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /blockchain-info endpoint.
"""

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.blocktools import GENESIS_BLOCK_HASH
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikBlockchainInfoTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        from test_framework.chronik.client import pb

        assert_equal(
            chronik.blockchain_info().ok(),
            pb.BlockchainInfo(
                tip_hash=bytes.fromhex(GENESIS_BLOCK_HASH)[::-1],
                tip_height=0,
            ),
        )

        block_hashes = self.generatetoaddress(node, 12, ADDRESS_ECREG_UNSPENDABLE)

        assert_equal(
            chronik.blockchain_info().ok(),
            pb.BlockchainInfo(
                tip_hash=bytes.fromhex(block_hashes[11])[::-1],
                tip_height=12,
            ),
        )

        node.invalidateblock(block_hashes[6])

        assert_equal(
            chronik.blockchain_info().ok(),
            pb.BlockchainInfo(
                tip_hash=bytes.fromhex(block_hashes[5])[::-1],
                tip_height=6,
            ),
        )


if __name__ == "__main__":
    ChronikBlockchainInfoTest().main()
