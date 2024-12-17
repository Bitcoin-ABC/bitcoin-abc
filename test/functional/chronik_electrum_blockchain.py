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
from test_framework.wallet import MiniWallet

COINBASE_TX_HEX = (
    "01000000010000000000000000000000000000000000000000000000000000000000000000ffffffff4d"
    + GENESIS_CB_SCRIPT_SIG.hex()
    + "ffffffff0100f2052a0100000043"
    + GENESIS_CB_SCRIPT_PUBKEY.hex()
    + "00000000"
)


class ChronikElectrumBlockchain(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        self.client = self.nodes[0].get_chronik_electrum_client()
        self.node = self.nodes[0]
        self.wallet = MiniWallet(self.node)

        self.test_invalid_params()
        self.test_transaction_get()

    def test_invalid_params(self):
        # Invalid params type
        for response in (
            self.client.synchronous_request("blockchain.transaction.get", params="foo"),
            self.client.synchronous_request("blockchain.transaction.get", params=42),
        ):
            assert_equal(
                response.error,
                {"code": -32602, "message": "'params' must be an array or an object"},
            )

        assert_equal(
            self.client.synchronous_request(
                "blockchain.transaction.get", params=None
            ).error,
            {"code": -32602, "message": "Missing required params"},
        )

        # Too many params
        for response in (
            self.client.blockchain.transaction.get(1, 2, 3),
            self.client.blockchain.transaction.get(txid=1, verbose=2, blockhash=3),
        ):
            assert_equal(
                response.error,
                {"code": -32602, "message": "Expected at most 2 parameters"},
            )
        assert_equal(
            self.client.blockchain.transaction.get_height(1, 2).error,
            {"code": -32602, "message": "Expected at most 1 parameter"},
        )

        # Missing mandatory argument in otherwise valid params
        for response in (
            self.client.synchronous_request("blockchain.transaction.get", params=[]),
            self.client.synchronous_request("blockchain.transaction.get", params={}),
            self.client.synchronous_request(
                "blockchain.transaction.get",
                params={"nottxid": 32 * "ff", "verbose": False},
            ),
            self.client.blockchain.transaction.get(verbose=True),
        ):
            assert_equal(
                response.error,
                {"code": -32602, "message": "Missing mandatory 'txid' parameter"},
            )

        # Non-string json type for txid
        assert_equal(
            self.client.blockchain.transaction.get(txid=int(32 * "ff", 16)).error,
            {"code": 1, "message": "Invalid tx hash"},
        )

        for response in (
            # non-hex characters
            self.client.blockchain.transaction.get("les sanglots longs"),
            # odd number of hex chars
            self.client.blockchain.transaction.get(GENESIS_CB_TXID[:-1]),
            # valid hex but invalid length for a txid
            self.client.blockchain.transaction.get(GENESIS_CB_TXID[:-2]),
        ):
            assert_equal(
                response.error,
                {"code": 1, "message": "Invalid tx hash"},
            )

        # Invalid type for boolean argument
        assert_equal(
            self.client.blockchain.transaction.get(
                txid=32 * "ff", verbose="true"
            ).error,
            {
                "code": 1,
                "message": "Invalid verbose argument; expected boolean",
            },
        )

        # Valid txid, but no such transaction was found
        assert_equal(
            self.client.blockchain.transaction.get(txid=32 * "ff").error,
            {
                "code": 1,
                "message": "No transaction matching the requested hash was found",
            },
        )

    def test_transaction_get(self):
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
                    "confirmations": 201,
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
            203,
        )

    def test_transaction_get_height(self):
        response = self.client.blockchain.transaction.get_height(GENESIS_CB_TXID)
        assert_equal(response.result, 0)

        self.wallet.rescan_utxos()
        tx = self.wallet.send_self_transfer(from_node=self.node)

        response = self.client.blockchain.transaction.get(tx["txid"])
        assert_equal(response.result, tx["hex"])

        # A mempool transaction has height 0
        response = self.client.blockchain.transaction.get_height(tx["txid"])
        assert_equal(response.result, 0)

        # Mine the tx
        self.generate(self.node, 1)
        response = self.client.blockchain.transaction.get_height(tx["txid"])
        assert_equal(response.result, 203)

        response = self.client.blockchain.transaction.get_height(32 * "ff")
        assert_equal(
            response.error, {"code": -32600, "message": "Unknown transaction id"}
        )


if __name__ == "__main__":
    ChronikElectrumBlockchain().main()
