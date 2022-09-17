#!/usr/bin/env python3
# Copyright (c) 2017-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test deprecation of RPC calls."""
import random

from test_framework.avatools import AvaP2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_raises_rpc_error, uint256_hex

QUORUM_NODE_COUNT = 16


class DeprecatedRpcTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [[
            "-avalanche=1",
            '-avaproofstakeutxodustthreshold=1000000',
            '-avaproofstakeutxoconfirmations=1',
            '-avacooldown=0',
            '-avaminquorumstake=0',
            '-avaminavaproofsnodecount=0',
            '-avaminquorumconnectedstakeratio=0',
        ],
            [
            "-avalanche=1",
            '-avaproofstakeutxodustthreshold=1000000',
            '-avaproofstakeutxoconfirmations=1',
            '-avacooldown=0',
            '-avaminquorumstake=0',
            '-avaminavaproofsnodecount=0',
            '-avaminquorumconnectedstakeratio=0',
            "-deprecatedrpc=isfinalblock_noerror",
            "-deprecatedrpc=isfinaltransaction_noerror",
        ]]

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
        self.log.info(
            "Check isfinaltransaction returns false when looking for unknown transactions")
        self.sync_all()
        random_txid = uint256_hex(random.randint(0, 2**256 - 1))
        blockhash = self.nodes[0].getbestblockhash()

        self.log.info(
            "Check isfinalblock and isfinaltransaction returns false when the quorum is not established")
        assert_raises_rpc_error(
            -1,
            "Avalanche is not ready to poll yet.",
            self.nodes[0].isfinalblock,
            blockhash,
        )
        assert not self.nodes[1].isfinalblock(blockhash)

        cb_txid = self.nodes[0].getblock(blockhash)['tx'][0]
        assert_raises_rpc_error(
            -1,
            "Avalanche is not ready to poll yet.",
            self.nodes[0].isfinaltransaction,
            cb_txid,
            blockhash,
        )
        assert not self.nodes[1].isfinaltransaction(cb_txid, blockhash)

        [[node.add_p2p_connection(AvaP2PInterface(node))
          for _ in range(0, QUORUM_NODE_COUNT)] for node in self.nodes]

        self.wait_until(lambda: all(
            [node.getavalancheinfo()['ready_to_poll'] is True for node in self.nodes]))

        assert_raises_rpc_error(
            -5,
            "No such transaction found in the provided block.",
            self.nodes[0].isfinaltransaction,
            random_txid,
            blockhash,
        )
        assert not self.nodes[1].isfinaltransaction(random_txid, blockhash)


if __name__ == '__main__':
    DeprecatedRpcTest().main()
