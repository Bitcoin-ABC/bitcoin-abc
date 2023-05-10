#!/usr/bin/env python3
# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the chained txs limit."""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_raises_rpc_error,
)
from test_framework.wallet import create_raw_chain

MAX_CHAINED_TX = 5
WELLINGTON_ACTIVATION_TIME = 2000000000


class ChainedTxTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.extra_args = [
            [
                f"-replayprotectionactivationtime={WELLINGTON_ACTIVATION_TIME + 1000}",
                f"-wellingtonactivationtime={WELLINGTON_ACTIVATION_TIME}",
                f"-limitancestorcount={MAX_CHAINED_TX}",
                f"-limitdescendantcount={MAX_CHAINED_TX + 1}",
            ]
        ]

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        node = self.nodes[0]
        node.setmocktime(WELLINGTON_ACTIVATION_TIME - 1000)

        self.privkeys = [node.get_deterministic_priv_key().key]
        self.address = node.get_deterministic_priv_key().address
        self.coins = []
        # The last 100 coinbase transactions are premature
        for b in self.generatetoaddress(node, 102, self.address)[:2]:
            coinbase = node.getblock(blockhash=b, verbosity=2)["tx"][0]
            self.coins.append(
                {
                    "txid": coinbase["txid"],
                    "amount": coinbase["vout"][0]["value"],
                    "scriptPubKey": coinbase["vout"][0]["scriptPubKey"],
                }
            )

        self.log.info("Before Wellington, the chained-tx limit applies")

        assert_greater_than(
            WELLINGTON_ACTIVATION_TIME, node.getblockchaininfo()["mediantime"]
        )

        chain_hex, _ = create_raw_chain(
            node,
            self.coins.pop(),
            self.address,
            self.privkeys,
            chain_length=MAX_CHAINED_TX + 1,
        )

        for i in range(MAX_CHAINED_TX):
            txid = node.sendrawtransaction(chain_hex[i])
            mempool = node.getrawmempool()
            assert_equal(len(mempool), i + 1)
            assert txid in mempool

        assert_raises_rpc_error(
            -26,
            (
                "too-long-mempool-chain, too many unconfirmed ancestors [limit:"
                f" {MAX_CHAINED_TX}]"
            ),
            node.sendrawtransaction,
            chain_hex[-1],
        )

        self.log.info("Activate Wellington")

        node.setmocktime(WELLINGTON_ACTIVATION_TIME)
        self.generate(node, 6)
        assert_equal(node.getblockchaininfo()["mediantime"], WELLINGTON_ACTIVATION_TIME)

        self.log.info("After Wellington, the chained-tx limit no longer applies")

        chain_hex, _ = create_raw_chain(
            node,
            self.coins.pop(),
            self.address,
            self.privkeys,
            chain_length=MAX_CHAINED_TX * 2,
        )

        for i in range(MAX_CHAINED_TX * 2):
            txid = node.sendrawtransaction(chain_hex[i])
            mempool = node.getrawmempool()
            assert_equal(len(mempool), i + 1)
            assert txid in mempool

        self.log.info("Upon reorg the mempool policy is maintained")

        node.invalidateblock(node.getbestblockhash())
        assert_greater_than(
            WELLINGTON_ACTIVATION_TIME, node.getblockchaininfo()["mediantime"]
        )

        # Mempool size should be limited again
        assert_equal(len(node.getrawmempool()), MAX_CHAINED_TX * 2)

        # Mine an activation block to clear the mempool
        self.generate(node, 1)
        assert_equal(len(node.getrawmempool()), 0)

        # Reorg that block, and make sure all the txs are added back to the
        # mempool
        node.invalidateblock(node.getbestblockhash())
        assert_greater_than(
            WELLINGTON_ACTIVATION_TIME, node.getblockchaininfo()["mediantime"]
        )
        assert_equal(len(node.getrawmempool()), MAX_CHAINED_TX * 2)


if __name__ == "__main__":
    ChainedTxTest().main()
