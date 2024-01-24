#!/usr/bin/env python3
# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test avalanche transaction voting."""
import random

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.key import ECPubKey
from test_framework.messages import (
    MSG_TX,
    AvalancheTxVoteError,
    AvalancheVote,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
    msg_tx,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, uint256_hex
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16


class AvalancheTransactionVotingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avalanchepreconsensus=1",
                "-avacooldown=0",
                "-avaproofstakeutxoconfirmations=1",
                # Low enough for coinbase transactions to be staked in valid proofs
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
            ]
        ]

    def run_test(self):
        node = self.nodes[0]
        poll_node = get_ava_p2p_interface(self, node)

        # Create helper to check expected poll responses
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        def assert_response(expected):
            response = poll_node.wait_for_avaresponse()
            r = response.response

            # Verify signature.
            assert avakey.verify_schnorr(response.sig, r.get_hash())

            # Verify correct votes list
            votes = r.votes
            assert_equal(len(votes), len(expected))
            for i in range(0, len(votes)):
                assert_equal(repr(votes[i]), repr(expected[i]))

        # Make some valid txs
        num_txs = 5
        wallet = MiniWallet(node)
        self.generate(wallet, num_txs, sync_fun=self.no_op)

        # Mature the coinbases
        self.generate(node, 100, sync_fun=self.no_op)

        assert_equal(node.getmempoolinfo()["size"], 0)
        tx_ids = [
            int(wallet.send_self_transfer(from_node=node)["txid"], 16)
            for _ in range(num_txs)
        ]
        assert_equal(node.getmempoolinfo()["size"], num_txs)

        self.log.info("Check the votes are unknown while the quorum is not established")

        poll_node.send_poll(tx_ids, MSG_TX)
        assert_response(
            [AvalancheVote(AvalancheTxVoteError.UNKNOWN, txid) for txid in tx_ids]
        )

        self.log.info("Check the votes on valid mempool transactions")

        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        quorum = get_quorum()
        assert node.getavalancheinfo()["ready_to_poll"]

        poll_node.send_poll(tx_ids, MSG_TX)
        assert_response(
            [AvalancheVote(AvalancheTxVoteError.ACCEPTED, txid) for txid in tx_ids]
        )

        self.log.info("Check the votes on recently mined transactions")

        self.generate(node, 1, sync_fun=self.no_op)
        assert_equal(node.getmempoolinfo()["size"], 0)

        poll_node.send_poll(tx_ids, MSG_TX)
        assert_response(
            [AvalancheVote(AvalancheTxVoteError.ACCEPTED, txid) for txid in tx_ids]
        )

        for _ in range(10):
            self.generate(node, 1, sync_fun=self.no_op)
            poll_node.send_poll(tx_ids, MSG_TX)
            assert_response(
                [AvalancheVote(AvalancheTxVoteError.ACCEPTED, txid) for txid in tx_ids]
            )

        self.log.info("Check the votes on unknown transactions")

        tx_ids = [random.randint(0, 2**256) for _ in range(10)]
        poll_node.send_poll(tx_ids, MSG_TX)

        assert_response(
            [AvalancheVote(AvalancheTxVoteError.UNKNOWN, txid) for txid in tx_ids]
        )

        self.log.info("Check the votes on invalid transactions")

        invalid_tx = CTransaction()
        invalid_txid = int(invalid_tx.get_id(), 16)

        with node.assert_debug_log(["bad-txns-vin-empty", "Misbehaving"], []):
            # The node has the NOBAN whitelist flag, so it remains connected
            poll_node.send_message(msg_tx(invalid_tx))

        poll_node.send_poll([invalid_txid], MSG_TX)
        assert_response([AvalancheVote(AvalancheTxVoteError.INVALID, invalid_txid)])

        self.log.info("Check the votes on orphan transactions")

        orphan_tx = CTransaction()
        orphan_tx.vin.append(CTxIn(outpoint=COutPoint(random.randint(0, 2**256), 0)))
        orphan_tx.vout = [
            CTxOut(nValue=1_000_000, scriptPubKey=wallet.get_scriptPubKey())
        ]
        pad_tx(orphan_tx)
        orphan_txid = int(orphan_tx.get_id(), 16)

        with node.assert_debug_log(["bad-txns-inputs-missingorspent"], []):
            poll_node.send_message(msg_tx(orphan_tx))

        poll_node.send_poll([orphan_txid], MSG_TX)
        assert_response([AvalancheVote(AvalancheTxVoteError.ORPHAN, orphan_txid)])

        self.log.info("Check the node polls for transactions added to the mempool")

        # Let's clean up the non transaction inventories from our avalanche polls
        def has_finalized_proof(proofid):
            can_find_inv_in_poll(quorum, proofid)
            return node.getrawavalancheproof(uint256_hex(proofid))["finalized"]

        for q in quorum:
            self.wait_until(lambda: has_finalized_proof(q.proof.proofid))

        def has_finalized_block(block_hash):
            can_find_inv_in_poll(quorum, int(block_hash, 16))
            return node.isfinalblock(block_hash)

        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_block(tip))

        txid = wallet.send_self_transfer(from_node=node)["txid"]
        assert txid in node.getrawmempool()
        self.wait_until(lambda: can_find_inv_in_poll(quorum, int(txid, 16)))


if __name__ == "__main__":
    AvalancheTransactionVotingTest().main()
