# Copyright (c) 2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the generation of UTXO snapshots using `dumptxoutset`."""

import hashlib
from pathlib import Path

from test_framework.blocktools import COINBASE_MATURITY
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


class DumptxoutsetTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1

    def run_test(self):
        """Test a trivial usage of the dumptxoutset RPC command."""
        node = self.nodes[0]
        mocktime = node.getblockheader(node.getblockhash(0))["time"] + 1
        node.setmocktime(mocktime)
        self.generate(node, COINBASE_MATURITY)

        FILENAME = "txoutset.dat"
        out = node.dumptxoutset(FILENAME, "latest")
        expected_path = Path(node.datadir) / self.chain / FILENAME

        assert expected_path.is_file()

        assert_equal(out["coins_written"], 100)
        assert_equal(out["base_height"], 100)
        assert_equal(out["path"], str(expected_path))
        # Blockhash should be deterministic based on mocked time.
        assert_equal(
            out["base_hash"],
            "53bd41279adf93df5bb1f51c84d3409aeba14d4276238ae30f813ff27e711ad7",
        )

        with open(str(expected_path), "rb") as f:
            digest = hashlib.sha256(f.read()).hexdigest()
            # UTXO snapshot hash should be deterministic based on mocked time.
            assert_equal(
                digest,
                "32fecc313102de241ea284c080ccb71b59032fefda4c4f72d6c7ab4263bcac5b",
            )

        assert_equal(
            out["txoutset_hash"],
            "f00b066f5014ef37f0bb40ab455f995a85ac475bc3beaa721476854a37fb4268",
        )
        assert_equal(out["nchaintx"], 101)

        # Specifying a path to an existing file will fail.
        assert_raises_rpc_error(
            -8, f"{FILENAME} already exists", node.dumptxoutset, FILENAME, "latest"
        )

        self.log.info("Test that dumptxoutset with unknown dump type fails")
        assert_raises_rpc_error(
            -8,
            'Invalid snapshot type "bogus" specified. Please specify "rollback" or "latest"',
            node.dumptxoutset,
            "utxos.dat",
            "bogus",
        )

        self.log.info(
            "Test that dumptxoutset failure does not leave the network activity suspended"
        )
        blockchaininfo_before_rollback = node.getblockchaininfo()
        blocks_path = Path(node.datadir) / self.chain / "blocks"
        rev_file = blocks_path / "rev00000.dat"
        bogus_file = blocks_path / "bogus.dat"
        rev_file.rename(bogus_file)
        assert_raises_rpc_error(
            -1,
            "Could not roll back to requested height.",
            node.dumptxoutset,
            "utxos.dat",
            rollback=99,
        )
        assert_equal(node.getnetworkinfo()["networkactive"], True)
        # Check that the tip ("blocks", "bestblockhash"...) is still the same
        assert_equal(node.getblockchaininfo(), blockchaininfo_before_rollback)

        # Cleanup
        bogus_file.rename(rev_file)


if __name__ == "__main__":
    DumptxoutsetTest().main()
