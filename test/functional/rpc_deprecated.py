#!/usr/bin/env python3
# Copyright (c) 2017-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test deprecation of RPC calls."""
from test_framework.cdefs import DEFAULT_MAX_BLOCK_SIZE
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_raises_rpc_error


class DeprecatedRpcTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True
        self.extra_args = [[], ["-deprecatedrpc=banscore",
                                "-deprecatedrpc=setexcessiveblock"]]

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

        self.log.info("Test deprecated banscore")
        assert 'banscore' not in self.nodes[0].getpeerinfo()[0]
        assert 'banscore' in self.nodes[1].getpeerinfo()[0]

        self.log.info("Test deprecated setexcessiveblock RPC")
        assert_raises_rpc_error(-32,
                                'The setexcessiveblock RPC is deprecated',
                                self.nodes[0].setexcessiveblock,
                                DEFAULT_MAX_BLOCK_SIZE)
        self.nodes[1].setexcessiveblock(DEFAULT_MAX_BLOCK_SIZE)


if __name__ == '__main__':
    DeprecatedRpcTest().main()
