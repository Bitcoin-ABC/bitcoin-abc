# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the finalizetransaction, removetransaction and getfinaltransactions RPCs."""

import time

from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error
from test_framework.wallet import MiniWallet


class AvalancheFinalizeTransactionTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                # This is disabled by default on the test framework
                "-avalanchepreconsensusmining=1",
            ],
        ]

    def run_test(self):
        node = self.nodes[0]

        wallet = MiniWallet(node)

        now = int(time.time())
        node.setmocktime(now)

        # The node needs a peer connection for the block template to be
        # generated
        node.add_p2p_connection(P2PInterface())

        # Add some non finalized txs to the mempool
        txids = [wallet.send_self_transfer(from_node=node)["txid"] for _ in range(5)]
        assert all(txid in node.getrawmempool() for txid in txids)

        def assert_gbt_transaction_ids(expected_txids):
            # Force the cached block template to be updated
            node.bumpmocktime(6)
            gbt = node.getblocktemplate()
            assert_equal(
                sorted([tx["txid"] for tx in gbt["transactions"]]),
                sorted(expected_txids),
            )

        # No tx in the block template
        assert_gbt_transaction_ids([])

        def assert_getfinaltransactions(expected_txids):
            sorted_txids = sorted(expected_txids)
            assert_equal(node.getfinaltransactions(), sorted_txids)
            assert_equal(
                node.getfinaltransactions(verbose=True),
                [node.getrawtransaction(txid, True) for txid in sorted_txids],
            )

        assert_getfinaltransactions([])

        # Finalizing a non existing transaction returns an error
        assert_raises_rpc_error(
            -8,
            "The transaction is not in the mempool",
            node.finalizetransaction,
            "00" * 32,
        )

        # Removing a non existing trnsaction returns an error
        assert_raises_rpc_error(
            -8,
            "The transaction is not in the mempool",
            node.removetransaction,
            "00" * 32,
        )

        # Finalize a tx: it should be added to the block template
        assert_equal(node.finalizetransaction(txids[0]), [txids[0]])
        assert_gbt_transaction_ids([txids[0]])
        assert_getfinaltransactions([txids[0]])

        # Finalize more
        assert_equal(node.finalizetransaction(txids[1]), [txids[1]])
        assert_equal(node.finalizetransaction(txids[2]), [txids[2]])
        assert_gbt_transaction_ids(txids[:3])
        assert_getfinaltransactions(txids[:3])

        # Remove the first transaction, it should no longer be in the block
        # template
        assert_equal(node.removetransaction(txids[0]), [txids[0]])
        assert txids[0] not in node.getrawmempool()
        assert_gbt_transaction_ids(txids[1:3])
        assert_getfinaltransactions(txids[1:3])

        chained_txs = wallet.send_self_transfer_chain(from_node=node, chain_length=5)
        assert all(tx["txid"] in node.getrawmempool() for tx in chained_txs)

        # Finalize the penultimate transaction so all the chain up to this one
        # is final
        expected_chained_txids = [tx["txid"] for tx in chained_txs[:-1]]
        assert_equal(
            sorted(node.finalizetransaction(chained_txs[-2]["txid"])),
            sorted(expected_chained_txids),
        )

        # They are all included in the block template but no other
        assert_gbt_transaction_ids(txids[1:3] + expected_chained_txids)
        assert_getfinaltransactions(txids[1:3] + expected_chained_txids)

        # Remove the second transaction from the chain, check the descendants
        # are removed as well and no longer in the block template
        expected_removed_chained_txids = [tx["txid"] for tx in chained_txs[1:]]
        assert_equal(
            sorted(node.removetransaction(chained_txs[1]["txid"])),
            sorted(expected_removed_chained_txids),
        )
        assert all(
            txid not in node.getrawmempool() for txid in expected_removed_chained_txids
        )
        # Only the first tx from the chain remain in the mempool and in the
        # block template
        assert chained_txs[0]["txid"] in node.getrawmempool()
        assert_gbt_transaction_ids(txids[1:3] + [chained_txs[0]["txid"]])
        assert_getfinaltransactions(txids[1:3] + [chained_txs[0]["txid"]])


if __name__ == "__main__":
    AvalancheFinalizeTransactionTest().main()
