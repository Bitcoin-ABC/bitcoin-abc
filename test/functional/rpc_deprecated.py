#!/usr/bin/env python3
# Copyright (c) 2017-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test deprecation of RPC calls."""
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_greater_than
from test_framework.wallet import MiniWallet


class DeprecatedRpcTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [
            [],
            [
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
