# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test whether we can broadcast txs with Chronik correctly."""

import threading
import time

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.messages import AvalancheVoteError
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16


class ChronikBroadcastTx(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-chronik",
                "-enableminerfund",
                # Disable staking preconsensus to avoid too many votes
                "-avalanchestakingpreconsensus=0",
                # Use a high thresold to avoid stalling transactions
                "-avastalevotethreshold=100000",
            ],
        ]
        self.supports_cli = False

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        now = int(time.time())
        node.setmocktime(now)

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        # Pick one node from the quorum for polling.
        # ws will not receive msgs because it's not subscribed to blocks yet.
        quorum = get_quorum()

        assert node.getavalancheinfo()["ready_to_poll"] is True

        def finalize_proofs(quorum):
            proofids = [q.proof.proofid for q in quorum]
            [can_find_inv_in_poll(quorum, proofid) for proofid in proofids]
            return all(
                node.getrawavalancheproof(uint256_hex(proofid))["finalized"]
                for proofid in proofids
            )

        self.wait_until(lambda: finalize_proofs(quorum))

        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_tip(tip))

        # Make sure chronik has synced
        node.syncwithvalidationinterfacequeue()

        # Bump time so next blocks are mined with now as a time (instead of now
        # plus something to accommodate the MTP increase rule).
        now += 1000
        node.setmocktime(now)

        def wait_added_to_mempool(txid):
            self.wait_until(lambda: txid in node.getrawmempool())

        def finalize_tx(txid):
            def vote_until_final():
                can_find_inv_in_poll(
                    quorum,
                    int(txid, 16),
                    other_response=AvalancheVoteError.UNKNOWN,
                )
                return node.isfinaltransaction(txid)

            self.wait_until(vote_until_final)

        # Mature some coinbase outputs and finalize
        wallet = MiniWallet(node)
        tip = self.generate(wallet, 120)[-1]
        self.wait_until(lambda: has_finalized_tip(tip))

        # Build a tx to check for broadcast without waiting for finalization
        tx = wallet.create_self_transfer()
        txid = tx["txid"]
        chronik.broadcast_tx(bytes.fromhex(tx["hex"])).ok()
        assert txid in node.getrawmempool()

        # Now for multiple txs
        txs = [wallet.create_self_transfer() for _ in range(3)]
        chronik.broadcast_txs([bytes.fromhex(tx["hex"]) for tx in txs]).ok()
        assert {tx["txid"] for tx in txs}.issubset(set(node.getrawmempool()))

        # Build another tx to check for broadcast which successfully waits for finalization
        tx = wallet.create_self_transfer()
        txid = tx["txid"]
        thread = threading.Thread(
            target=lambda: chronik.broadcast_tx(
                bytes.fromhex(tx["hex"]), False, 30
            ).ok()
        )
        thread.start()

        # Wait for tx to be added to the mempool
        wait_added_to_mempool(txid)
        assert txid in node.getrawmempool()
        # Not yet finalized
        assert not node.isfinaltransaction(txid)

        # Finalize tx
        finalize_tx(txid)
        # Wait for request to finish
        thread.join(timeout=60)
        # Now the tx is finalized
        assert node.isfinaltransaction(txid)

        # Build another tx to check for broadcast which times out waiting for finalization
        tx = wallet.create_self_transfer()
        txid = tx["txid"]

        # Broadcast + wait but never finalize -> timeout
        assert_equal(
            chronik.broadcast_tx(bytes.fromhex(tx["hex"]), False, 2).err(504).msg,
            "504: Transaction(s) failed to finalize within 2s",
        )
        # Tx is in mempool
        assert txid in node.getrawmempool()
        # But not finalized
        assert not node.isfinaltransaction(txid)

        # Now for multiple txs
        txs = [wallet.create_self_transfer() for _ in range(3)]

        thread = threading.Thread(
            target=lambda: chronik.broadcast_txs(
                [bytes.fromhex(tx["hex"]) for tx in txs], False, 30
            ).ok()
        )
        thread.start()

        # Wait for tx to be added to the mempool
        for tx in txs:
            wait_added_to_mempool(tx["txid"])
        assert {tx["txid"] for tx in txs}.issubset(set(node.getrawmempool()))

        # Not yet finalized
        for tx in txs:
            assert not node.isfinaltransaction(tx["txid"])

        # Finalize txs
        for tx in txs:
            finalize_tx(tx["txid"])
        # Wait for request to finish
        thread.join(timeout=60)
        # Now the tx is finalized
        for tx in txs:
            assert node.isfinaltransaction(tx["txid"])

        # Test finalization timeout also for multiple txs
        txs = [wallet.create_self_transfer() for _ in range(3)]
        assert_equal(
            chronik.broadcast_txs([bytes.fromhex(tx["hex"]) for tx in txs], False, 2)
            .err(504)
            .msg,
            "504: Transaction(s) failed to finalize within 2s",
        )
        # Tx is in mempool
        assert {tx["txid"] for tx in txs}.issubset(set(node.getrawmempool()))
        # But not finalized
        for tx in txs:
            assert not node.isfinaltransaction(tx["txid"])


if __name__ == "__main__":
    ChronikBroadcastTx().main()
