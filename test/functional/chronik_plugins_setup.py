#!/usr/bin/env python3
# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test the Chronik plugin system gets sets up correctly.
"""

from test_framework.test_framework import BitcoinTestFramework


class ChronikPluginsSetup(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik_plugins()

    def run_test(self):
        node = self.nodes[0]
        with node.assert_debug_log(["Plugin context initialized Python"]):
            self.restart_node(0, ["-chronik"])


if __name__ == "__main__":
    ChronikPluginsSetup().main()
