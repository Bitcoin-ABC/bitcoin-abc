# Copyright (c) 2017-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test deprecation of RPC calls."""

from test_framework.avatools import get_ava_p2p_interface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class DeprecatedRpcTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
            ],
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-deprecatedrpc=node_availability_score",
            ],
        ]

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
        self.disconnect_nodes(0, 1)

        get_ava_p2p_interface(self, self.nodes[0])
        get_ava_p2p_interface(self, self.nodes[1])

        node_info = self.nodes[0].getpeerinfo()
        assert_equal(len(node_info), 1)
        assert "availability_score" not in node_info[0]

        node_info = self.nodes[1].getpeerinfo()
        assert_equal(len(node_info), 1)
        assert_equal(node_info[0]["availability_score"], 0)


if __name__ == "__main__":
    DeprecatedRpcTest().main()
