# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /chronik-info endpoint.
"""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, get_cli_version


class ChronikChronikInfoTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()
        self.skip_if_no_cli()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        from test_framework.chronik.client import pb

        self.log.info("Chronik version should be the same as the bitcoind version")
        assert_equal(
            chronik.chronik_info().ok(),
            pb.ChronikInfo(
                version=get_cli_version(self, node),
            ),
        )


if __name__ == "__main__":
    ChronikChronikInfoTest().main()
