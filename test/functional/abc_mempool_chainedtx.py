# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the chained txs limit."""

from test_framework.blocktools import COINBASE_MATURITY
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet

LEGACY_MAX_CHAINED_TX = 5


class ChainedTxTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True

    def run_test(self):
        node = self.nodes[0]

        wallet = MiniWallet(node)

        self.generate(wallet, COINBASE_MATURITY + 2)
        chain_hex = wallet.create_self_transfer_chain(
            chain_length=LEGACY_MAX_CHAINED_TX * 2
        )["chain_hex"]

        for i, tx_hex in enumerate(chain_hex):
            txid = wallet.sendrawtransaction(from_node=node, tx_hex=tx_hex)
            mempool = node.getrawmempool()
            assert_equal(len(mempool), i + 1)
            assert txid in mempool


if __name__ == "__main__":
    ChainedTxTest().main()
