# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test avalanche transaction finalization."""

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.messages import AvalancheTxVoteError, AvalancheVote
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16


class AvalancheTransactionFinalizationTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avalanchepreconsensus=1",
                "-avacooldown=0",
                "-avaproofstakeutxoconfirmations=1",
                # Low enough for coinbase transactions to be staked in valid proofs
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
            ]
        ]

    def finalize_tip(self):
        tip = self.nodes[0].getbestblockhash()

        def vote_until_final():
            can_find_inv_in_poll(
                self.quorum,
                int(tip, 16),
                response=AvalancheTxVoteError.ACCEPTED,
                other_response=AvalancheTxVoteError.UNKNOWN,
            )
            return self.nodes[0].isfinalblock(tip)

        self.wait_until(vote_until_final)

    def finalize_tip_and_check_no_finalized_tx_is_polled(self, finalized_txids):
        tip = self.nodes[0].getbestblockhash()

        def find_tip_in_poll_and_check_for_no_finalized_tx():
            found_hash = False
            tip_int = int(tip, 16)
            for n in self.quorum:
                poll = n.get_avapoll_if_available()

                # That node has not received a poll
                if poll is None:
                    continue

                # We got a poll, check for the hash and repond
                votes = []
                for inv in poll.invs:
                    # Vote unknown to everything but our searched inv
                    r = AvalancheTxVoteError.UNKNOWN

                    # Look for what we expect
                    if inv.hash == tip_int:
                        r = AvalancheTxVoteError.ACCEPTED
                        found_hash = True

                    votes.append(AvalancheVote(r, inv.hash))

                # We found the tip, so we expect none of the finalized tx to be
                # present in the polled inventories
                if found_hash:
                    for inv in poll.invs:
                        assert inv.hash not in finalized_txids

                n.send_avaresponse(poll.round, votes, n.delegated_privkey)

            return found_hash

        def vote_until_final():
            find_tip_in_poll_and_check_for_no_finalized_tx()
            return self.nodes[0].isfinalblock(tip)

        self.wait_until(vote_until_final)

    def finalize_tx(self, txid, other_response=AvalancheTxVoteError.ACCEPTED):
        def vote_until_final():
            can_find_inv_in_poll(
                self.quorum,
                txid,
                response=AvalancheTxVoteError.ACCEPTED,
                other_response=other_response,
            )
            return self.nodes[0].isfinaltransaction(uint256_hex(txid))

        self.wait_until(vote_until_final, timeout=10)

    def test_simple_txs(self):
        self.log.info("Check the finalization of simple non-chained txs")

        node = self.nodes[0]

        # Make some valid txs
        num_txs = 5
        self.generate(self.wallet, num_txs)
        self.finalize_tip()

        assert_equal(node.getmempoolinfo()["size"], 0)
        txids = [
            int(self.wallet.send_self_transfer(from_node=node)["txid"], 16)
            for _ in range(num_txs)
        ]
        assert_equal(node.getmempoolinfo()["size"], num_txs)

        for txid in txids:
            self.finalize_tx(txid)

        # Mine one more block, wait for it to be finalized while checking none
        # of the finalized txs are part of the polled items
        self.generate(self.wallet, 1)
        self.finalize_tip_and_check_no_finalized_tx_is_polled(txids)

    def test_chained_txs(self):
        self.log.info("Check the finalization of chained txs")

        node = self.nodes[0]

        # Make some valid chained txs
        num_txs = 5
        self.generate(self.wallet, num_txs)
        self.finalize_tip()

        assert_equal(node.getmempoolinfo()["size"], 0)
        txs = self.wallet.send_self_transfer_chain(from_node=node, chain_length=num_txs)
        assert_equal(node.getmempoolinfo()["size"], num_txs)

        # Keep the chain ordering. We only vote for the penultimate child tx
        txids = [tx["txid"] for tx in txs]
        self.finalize_tx(
            int(txids[-2], 16), other_response=AvalancheTxVoteError.UNKNOWN
        )

        # The ancestors should all be final as well
        assert all(node.isfinaltransaction(txid) for txid in txids[:-1])
        # But not the descendant
        assert not node.isfinaltransaction(txids[-1])

        # Mine one more block, wait for it to be finalized while checking none
        # of the finalized txs are part of the polled items
        self.generate(self.wallet, 1)
        self.finalize_tip_and_check_no_finalized_tx_is_polled(txids[:-1])

    def test_diamond_txs(self):
        self.log.info("Check the finalization of diamond shaped tx chains")

        node = self.nodes[0]

        #       --> tx2 --
        #     /            \
        # tx1                --> tx4
        #     \            /
        #       --> tx3 --
        #               \
        #                 --> tx5
        num_txs = 5
        self.generate(self.wallet, num_txs)
        self.finalize_tip()

        assert_equal(node.getmempoolinfo()["size"], 0)
        tx1 = self.wallet.create_self_transfer_multi(num_outputs=2)
        tx2 = self.wallet.create_self_transfer(utxo_to_spend=tx1["new_utxos"][0])
        tx3 = self.wallet.create_self_transfer_multi(
            utxos_to_spend=[tx1["new_utxos"][1]], num_outputs=2
        )
        tx4 = self.wallet.create_self_transfer_multi(
            utxos_to_spend=[tx2["new_utxo"], tx3["new_utxos"][0]]
        )
        tx5 = self.wallet.create_self_transfer(utxo_to_spend=tx3["new_utxos"][1])

        txids = [
            self.wallet.sendrawtransaction(from_node=node, tx_hex=tx["hex"])
            for tx in (tx1, tx2, tx3, tx4, tx5)
        ]
        assert_equal(node.getmempoolinfo()["size"], num_txs)

        # Finalizing tx4 should finalize all the ancestors as well
        self.finalize_tx(
            int(txids[-2], 16), other_response=AvalancheTxVoteError.UNKNOWN
        )
        assert all(node.isfinaltransaction(txid) for txid in txids[:-1])

        # But not tx5
        assert not node.isfinaltransaction(txids[-1])

        # Mine one more block, wait for it to be finalized while checking none
        # of the finalized txs are part of the polled items
        self.generate(self.wallet, 1)
        self.finalize_tip_and_check_no_finalized_tx_is_polled(txids[:-1])

    def run_test(self):
        def get_quorum():
            return [
                get_ava_p2p_interface(self, self.nodes[0])
                for _ in range(0, QUORUM_NODE_COUNT)
            ]

        self.quorum = get_quorum()
        assert self.nodes[0].getavalancheinfo()["ready_to_poll"]

        # Let's clean up the non transaction inventories from our avalanche polls
        def has_finalized_proof(proofid):
            can_find_inv_in_poll(self.quorum, proofid)
            return self.nodes[0].getrawavalancheproof(uint256_hex(proofid))["finalized"]

        for q in self.quorum:
            self.wait_until(lambda: has_finalized_proof(q.proof.proofid))

        self.finalize_tip()

        self.wallet = MiniWallet(self.nodes[0])
        # Mature the coinbases
        self.generate(self.wallet, COINBASE_MATURITY)

        self.test_simple_txs()
        self.test_chained_txs()
        self.test_diamond_txs()


if __name__ == "__main__":
    AvalancheTransactionFinalizationTest().main()
