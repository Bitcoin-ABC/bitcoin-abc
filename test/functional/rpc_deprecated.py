#!/usr/bin/env python3
# Copyright (c) 2017-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test deprecation of RPC calls."""
import random

from test_framework.avatools import AvaP2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_raises_rpc_error,
    uint256_hex,
)
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16
FAR_IN_THE_FUTURE = 2000000000


class DeprecatedRpcTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-avaminquorumconnectedstakeratio=0",
            ],
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-avaminquorumconnectedstakeratio=0",
                "-deprecatedrpc=isfinalblock_noerror",
                "-deprecatedrpc=isfinaltransaction_noerror",
                "-deprecatedrpc=getblocktemplate_sigops",
                "-deprecatedrpc=softforks",
            ],
        ]

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

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
            "Check isfinaltransaction returns false when looking for unknown"
            " transactions"
        )
        self.sync_all()
        random_txid = uint256_hex(random.randint(0, 2**256 - 1))
        blockhash = self.nodes[0].getbestblockhash()

        self.log.info(
            "Check isfinalblock and isfinaltransaction returns false when the quorum is"
            " not established"
        )
        assert_raises_rpc_error(
            -1,
            "Avalanche is not ready to poll yet.",
            self.nodes[0].isfinalblock,
            blockhash,
        )
        assert not self.nodes[1].isfinalblock(blockhash)

        cb_txid = self.nodes[0].getblock(blockhash)["tx"][0]
        assert_raises_rpc_error(
            -1,
            "Avalanche is not ready to poll yet.",
            self.nodes[0].isfinaltransaction,
            cb_txid,
            blockhash,
        )
        assert not self.nodes[1].isfinaltransaction(cb_txid, blockhash)

        [
            [
                node.add_p2p_connection(AvaP2PInterface(self, node))
                for _ in range(0, QUORUM_NODE_COUNT)
            ]
            for node in self.nodes
        ]

        self.wait_until(
            lambda: all(
                node.getavalancheinfo()["ready_to_poll"] is True for node in self.nodes
            )
        )

        assert_raises_rpc_error(
            -5,
            "No such transaction found in the provided block.",
            self.nodes[0].isfinaltransaction,
            random_txid,
            blockhash,
        )
        assert not self.nodes[1].isfinaltransaction(random_txid, blockhash)

        self.log.info(
            "Check the getblocktemplate output with and without"
            " -deprecatedrpc=getblocktemplate_sigops"
        )

        # Add a transaction to both nodes mempool
        wallet = MiniWallet(self.nodes[0])
        self.generate(wallet, 1)
        unconfirmed_tx = wallet.send_self_transfer(from_node=self.nodes[0])
        self.nodes[1].sendrawtransaction(unconfirmed_tx["hex"])
        assert unconfirmed_tx["txid"] in self.nodes[0].getrawmempool()
        assert unconfirmed_tx["txid"] in self.nodes[1].getrawmempool()

        block_template = self.nodes[0].getblocktemplate()
        block_template_txs = block_template.get("transactions", [])
        assert_greater_than(len(block_template_txs), 0)

        for tx in block_template_txs:
            assert "sigchecks" in tx
            assert "sigops" not in tx
        assert "sigchecklimit" in block_template
        assert "sigoplimit" not in block_template

        deprecated_block_template = self.nodes[1].getblocktemplate()
        deprecated_block_template_txs = deprecated_block_template.get(
            "transactions", []
        )
        assert_greater_than(len(deprecated_block_template_txs), 0)

        for tx in deprecated_block_template_txs:
            assert "sigchecks" in tx
            assert "sigops" in tx
        assert "sigchecklimit" in deprecated_block_template
        assert "sigoplimit" in deprecated_block_template

        self.log.info(
            "Check the getblockchaininfo output with and without"
            " -deprecatedrpc=softforks"
        )
        assert "softforks" not in self.nodes[0].getblockchaininfo()
        res = self.nodes[1].getblockchaininfo()
        assert_equal(res["softforks"], {})


if __name__ == "__main__":
    DeprecatedRpcTest().main()
