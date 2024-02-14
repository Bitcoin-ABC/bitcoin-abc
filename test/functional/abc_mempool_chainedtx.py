# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the chained txs limit."""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import create_raw_chain

LEGACY_MAX_CHAINED_TX = 5


class ChainedTxTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        node = self.nodes[0]

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

        self.log.info(
            "Since Wellington activation, the chained-tx limit no longer applies"
        )

        chain_hex, _ = create_raw_chain(
            node,
            self.coins.pop(),
            self.address,
            self.privkeys,
            chain_length=LEGACY_MAX_CHAINED_TX * 2,
        )

        for i in range(LEGACY_MAX_CHAINED_TX * 2):
            txid = node.sendrawtransaction(chain_hex[i])
            mempool = node.getrawmempool()
            assert_equal(len(mempool), i + 1)
            assert txid in mempool


if __name__ == "__main__":
    ChainedTxTest().main()
