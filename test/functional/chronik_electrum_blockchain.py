# Copyright (c) 2024-present The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's electrum interface: blockchain.* methods
"""
from test_framework.blocktools import (
    GENESIS_BLOCK_HASH,
    GENESIS_CB_SCRIPT_PUBKEY,
    GENESIS_CB_SCRIPT_SIG,
    GENESIS_CB_TXID,
    TIME_GENESIS_BLOCK,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

COINBASE_TX_HEX = (
    "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d"
    + GENESIS_CB_SCRIPT_SIG.hex()
    + "ffffffff0100f2052a0100000043"
    + GENESIS_CB_SCRIPT_PUBKEY.hex()
    + "00000000"
)


class ChronikElectrumBlockchain(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        self.client = self.nodes[0].get_chronik_electrum_client()

        for response in (
            self.client.blockchain.transaction.get(GENESIS_CB_TXID),
            self.client.blockchain.transaction.get(GENESIS_CB_TXID, False),
            self.client.blockchain.transaction.get(txid=GENESIS_CB_TXID),
            self.client.blockchain.transaction.get(txid=GENESIS_CB_TXID, verbose=False),
        ):
            assert_equal(response.result, COINBASE_TX_HEX)

        for response in (
            self.client.blockchain.transaction.get(GENESIS_CB_TXID, True),
            self.client.blockchain.transaction.get(txid=GENESIS_CB_TXID, verbose=True),
        ):
            assert_equal(
                response.result,
                {
                    "blockhash": GENESIS_BLOCK_HASH,
                    "blocktime": TIME_GENESIS_BLOCK,
                    "confirmations": 1,
                    "hash": GENESIS_CB_TXID,
                    "hex": COINBASE_TX_HEX,
                    "time": 0,
                },
            )
        self.generate(self.nodes[0], 2)
        assert_equal(
            self.client.blockchain.transaction.get(
                txid=GENESIS_CB_TXID, verbose=True
            ).result["confirmations"],
            3,
        )


if __name__ == "__main__":
    ChronikElectrumBlockchain().main()
