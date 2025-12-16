# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library broadcastTx and broadcastTxs methods
Based on test/functional/chronik_broadcast_tx.py
"""

import pathmagic  # noqa
import time

from ipc import send_ipc_message
from setup_framework import SetupFramework
from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.messages import AvalancheVoteError
from test_framework.util import uint256_hex
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16


class ChronikClient_Broadcast_Tx_Setup(SetupFramework):
    def set_test_params(self):
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
        # Init
        node = self.nodes[0]

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

        yield True

        self.log.info("Step 1: Mature some coinbase outputs and finalize blocks")

        # Mature some coinbase outputs and finalize
        wallet = MiniWallet(node)
        tip = self.generate(wallet, 120)[-1]
        self.wait_until(lambda: has_finalized_tip(tip))

        # Build a tx to check for broadcast without waiting for finalization
        tx = wallet.create_self_transfer()
        txid = tx["txid"]
        tx_hex = tx["hex"]

        send_ipc_message({"tx_no_wait_rawtx": tx_hex})
        send_ipc_message({"tx_no_wait_txid": txid})

        # Now for multiple txs
        txs = [wallet.create_self_transfer() for _ in range(3)]
        txs_hex = [tx["hex"] for tx in txs]
        txs_txids = [tx["txid"] for tx in txs]

        send_ipc_message({"txs_no_wait_rawtxs": txs_hex})
        send_ipc_message({"txs_no_wait_txids": txs_txids})

        yield True

        self.log.info(
            "Step 2: Build tx for broadcast which successfully waits for finalization"
        )

        # Build another tx to check for broadcast which successfully waits for finalization
        tx = wallet.create_self_transfer()
        txid = tx["txid"]
        tx_hex = tx["hex"]

        send_ipc_message({"tx_wait_success_rawtx": tx_hex})
        send_ipc_message({"tx_wait_success_txid": txid})

        yield True

        self.log.info("Step 3: Wait for tx to be added to mempool, then finalize it")

        # Yield first to let the integration test start the broadcast
        yield True

        # Wait for tx to be added to the mempool
        wait_added_to_mempool(txid)
        # Then finalize tx
        finalize_tx(txid)

        yield True

        self.log.info(
            "Step 4: Build tx for broadcast which times out waiting for finalization"
        )

        # Build another tx to check for broadcast which times out waiting for finalization
        tx = wallet.create_self_transfer()
        txid = tx["txid"]
        tx_hex = tx["hex"]

        send_ipc_message({"tx_wait_timeout_rawtx": tx_hex})
        send_ipc_message({"tx_wait_timeout_txid": txid})

        yield True

        self.log.info(
            "Step 5: Build multiple txs for broadcast which successfully wait for finalization"
        )

        # Now for multiple txs
        txs = [wallet.create_self_transfer() for _ in range(3)]
        txs_hex = [tx["hex"] for tx in txs]
        txs_txids = [tx["txid"] for tx in txs]

        send_ipc_message({"txs_wait_success_rawtxs": txs_hex})
        send_ipc_message({"txs_wait_success_txids": txs_txids})

        yield True

        self.log.info("Step 6: Wait for txs to be added to mempool, then finalize them")

        # Yield first to let the integration test start the broadcast
        yield True

        # Wait for txs to be added to the mempool
        for txid in txs_txids:
            wait_added_to_mempool(txid)
        # Then finalize txs
        for txid in txs_txids:
            finalize_tx(txid)

        yield True

        self.log.info(
            "Step 7: Build multiple txs for broadcast which timeout waiting for finalization"
        )

        # Test finalization timeout also for multiple txs
        txs = [wallet.create_self_transfer() for _ in range(3)]
        txs_hex = [tx["hex"] for tx in txs]
        txs_txids = [tx["txid"] for tx in txs]

        send_ipc_message({"txs_wait_timeout_rawtxs": txs_hex})
        send_ipc_message({"txs_wait_timeout_txids": txs_txids})

        yield True


if __name__ == "__main__":
    ChronikClient_Broadcast_Tx_Setup().main()
