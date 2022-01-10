#!/usr/bin/env python3
# Copyright (c) 2017-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test deprecation of RPC calls."""
from test_framework.test_framework import BitcoinTestFramework


class DeprecatedRpcTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [[],
                           ["-deprecatedrpc=getpeerinfo_addnode",
                            "-deprecatedrpc=whitelisted"]]

    def run_test(self):
        # This test should be used to verify correct behaviour of deprecated
        # RPC methods with and without the -deprecatedrpc flags. For example:
        #
        # In set_test_params:
        # self.extra_args = [[], ["-deprecatedrpc=generate"]]
        #
        # In run_test:
        # self.log.info("Test generate RPC")
        # assert_raises_rpc_error(-32, 'The wallet generate rpc method is deprecated', self.nodes[0].rpc.generate, 1)
        # self.nodes[1].generate(1)

        self.log.info("Test deprecated fields from getpeerinfo")
        for key in ['addnode', 'whitelisted']:
            assert key not in self.nodes[0].getpeerinfo()[0]
            assert key in self.nodes[1].getpeerinfo()[0]


if __name__ == '__main__':
    DeprecatedRpcTest().main()
