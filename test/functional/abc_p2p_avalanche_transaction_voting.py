# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test avalanche transaction voting."""
import random

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
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
from test_framework.p2p import P2PDataStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, assert_raises_rpc_error, uint256_hex
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

        # Now we can focus on transactions
        def has_finalized_tx(txid):
            can_find_inv_in_poll(quorum, int(txid, 16))
            return node.isfinaltransaction(txid)

        def has_invalidated_tx(txid):
            can_find_inv_in_poll(
                quorum, int(txid, 16), response=AvalancheTxVoteError.INVALID
            )
            return txid not in node.getrawmempool()

        self.log.info("Check the node can mine a finalized tx")

        txid = wallet.send_self_transfer(from_node=node)["txid"]
        assert txid in node.getrawmempool()
        assert not node.isfinaltransaction(txid)
        self.wait_until(lambda: has_finalized_tx(txid))
        assert txid in node.getrawmempool()

        tip = self.generate(node, 1)[0]
        self.wait_until(lambda: has_finalized_block(tip))
        assert node.isfinaltransaction(txid, tip)
        assert txid not in node.getrawmempool()

        self.log.info("Check the node drops transactions invalidated by avalanche")

        parent_tx = wallet.send_self_transfer(from_node=node)
        parent_txid = parent_tx["txid"]
        child_tx = wallet.send_self_transfer(
            from_node=node, utxo_to_spend=parent_tx["new_utxo"]
        )
        child_txid = child_tx["txid"]

        assert parent_txid in node.getrawmempool()
        assert child_txid in node.getrawmempool()
        assert not node.isfinaltransaction(parent_txid)
        assert not node.isfinaltransaction(child_txid)

        self.wait_until(lambda: has_invalidated_tx(parent_txid))

        assert parent_txid not in node.getrawmempool()
        assert child_txid not in node.getrawmempool()
        assert_raises_rpc_error(
            -5, "No such transaction", node.isfinaltransaction, parent_txid
        )
        assert_raises_rpc_error(
            -5, "No such transaction", node.isfinaltransaction, child_txid
        )

        self.log.info(
            "The node rejects blocks that contains tx conflicting with a finalized one"
        )

        utxo = wallet.get_utxo()
        txid = wallet.send_self_transfer(from_node=node, utxo_to_spend=utxo)["txid"]
        assert txid in node.getrawmempool()
        assert not node.isfinaltransaction(txid)
        self.wait_until(lambda: has_finalized_tx(txid))
        assert txid in node.getrawmempool()

        conflicting_block = create_block(
            int(node.getbestblockhash(), 16),
            create_coinbase(node.getblockcount() - 1),
        )
        conflicting_tx = wallet.create_self_transfer(utxo_to_spend=utxo)["tx"]
        assert conflicting_tx.get_id() != txid

        conflicting_block.vtx.append(conflicting_tx)
        make_conform_to_ctor(conflicting_block)
        conflicting_block.hashMerkleRoot = conflicting_block.calc_merkle_root()
        conflicting_block.solve()

        peer = node.add_p2p_connection(P2PDataStore())
        peer.send_blocks_and_test(
            [conflicting_block],
            node,
            success=False,
            reject_reason="finalized-tx-conflict",
        )

        # The tx is still finalized as the block is rejected
        assert node.isfinaltransaction(txid)
        assert txid in node.getrawmempool()

        # The block is accepted if we remove the offending transaction
        conflicting_block.vtx.remove(conflicting_tx)
        conflicting_block.hashMerkleRoot = conflicting_block.calc_merkle_root()
        conflicting_block.solve()

        peer.send_blocks_and_test(
            [conflicting_block],
            node,
        )


if __name__ == "__main__":
    AvalancheTransactionVotingTest().main()
