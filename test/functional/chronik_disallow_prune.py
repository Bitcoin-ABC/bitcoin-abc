# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Verify combining -prune and -chronik results in an init error.
"""

from test_framework.test_framework import BitcoinTestFramework


class ChronikDisallowPruneTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        self.nodes[0].stop_node()
        self.nodes[0].assert_start_raises_init_error(
            ["-chronik", "-prune=1000"],
            "Error: Prune mode is incompatible with -chronik.",
        )


if __name__ == "__main__":
    ChronikDisallowPruneTest().main()
