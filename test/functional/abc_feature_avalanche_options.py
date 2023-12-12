#!/usr/bin/env python3
# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the avalanche options interactions."""

from test_framework.test_framework import BitcoinTestFramework


class AvalancheOptionsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [[]]

    def run_test(self):
        node = self.nodes[0]

        with node.assert_debug_log(
            [
                "Increasing -maxconnections from 10 to 20 to comply with -maxavalancheoutbound"
            ]
        ):
            self.restart_node(
                0,
                extra_args=[
                    "-maxconnections=10",
                    "-maxavalancheoutbound=20",
                ],
            )


if __name__ == "__main__":
    AvalancheOptionsTest().main()
