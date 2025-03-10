# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the gettransactionstatus RPCs."""

from test_framework.messages import CTransaction, FromHex
from test_framework.p2p import P2PDataStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, sync_txindex
from test_framework.wallet import MiniWallet


class GetTransactionStatusTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1

    def run_test(self):
        node = self.nodes[0]
        peer = node.add_p2p_connection(P2PDataStore())

        wallet = MiniWallet(node)

        self.generate(wallet, 2)

        def from_wallet_tx(wallet_tx):
            tx_obj = FromHex(CTransaction(), wallet_tx["hex"])
            tx_obj.rehash()
            return tx_obj

        self.log.info("Tx doesn't exist in any memory pool")
        assert_equal(node.gettransactionstatus("0" * 64)["pool"], "none")

        self.log.info("Tx is in the memory pool")
        utxo = wallet.get_utxo()
        # Pad the transaction with different sizes of OP_RETURN data to create
        # conflicting transactions.
        mempool_tx = wallet.create_self_transfer(utxo_to_spend=utxo, target_size=178)
        peer.send_txs_and_test([from_wallet_tx(mempool_tx)], node, success=True)
        assert_equal(node.gettransactionstatus(mempool_tx["txid"])["pool"], "mempool")

        self.log.info("Tx is in the conflicting pool")
        conflicting_tx = wallet.create_self_transfer(
            utxo_to_spend=utxo, target_size=179
        )
        peer.send_txs_and_test(
            [from_wallet_tx(conflicting_tx)],
            node,
            success=False,
            expect_disconnect=False,
            reject_reason="txn-mempool-conflict",
        )
        assert_equal(
            node.gettransactionstatus(conflicting_tx["txid"])["pool"], "conflicting"
        )

        self.log.info("Tx is in the orphan pool")
        orphan_tx = wallet.create_self_transfer_chain(chain_length=2)[-1]
        peer.send_txs_and_test(
            [from_wallet_tx(orphan_tx)],
            node,
            success=False,
            expect_disconnect=False,
            reject_reason="bad-txns-inputs-missingorspent",
        )
        assert_equal(node.gettransactionstatus(orphan_tx["txid"])["pool"], "orphanage")

        self.log.info("Tx is in a block")
        tip = self.generate(wallet, 1)[0]
        assert_equal(node.getrawmempool(), [])
        assert_equal(node.gettransactionstatus(mempool_tx["txid"])["pool"], "none")

        self.log.info("The block field is not present if txindex is not enabled")
        assert "block" not in node.gettransactionstatus(mempool_tx["txid"])

        # The conflicting tx is removed because we mined the conflicted tx, the
        # orphan remains
        assert_equal(node.gettransactionstatus(conflicting_tx["txid"])["pool"], "none")
        assert_equal(node.gettransactionstatus(orphan_tx["txid"])["pool"], "orphanage")

        self.log.info("Check the block field when the txindex is enabled")

        self.restart_node(0, extra_args=["-txindex=1"])
        sync_txindex(self, node)
        assert_equal(node.gettransactionstatus(mempool_tx["txid"])["block"], tip)

        # A non-mined tx will return none
        mempool_tx = wallet.send_self_transfer(from_node=node)
        assert_equal(node.gettransactionstatus(mempool_tx["txid"])["block"], "none")


if __name__ == "__main__":
    GetTransactionStatusTest().main()
