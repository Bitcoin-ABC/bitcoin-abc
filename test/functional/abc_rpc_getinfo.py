# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Exercise the Bitcoin ABC getinfo RPC.

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, get_cli_version


class GetInfoRPCTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.extra_args = [["-avalanche=1"]]

    def run_test(self):
        node = self.nodes[0]

        info = node.getinfo()

        assert_equal(info["version_number"], node.getnetworkinfo()["version"])
        assert_equal(info["version_full"], get_cli_version(self, node))
        assert_equal(info["avalanche"], True)

        self.restart_node(0, extra_args=["-avalanche=0"])
        info = node.getinfo()
        assert_equal(info["avalanche"], False)


if __name__ == "__main__":
    GetInfoRPCTest().main()
