# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of conflicting proofs via avalanche."""

import time

from test_framework.avatools import (
    avalanche_proof_from_hex,
    can_find_inv_in_poll,
    create_coinbase_stakes,
    gen_proof,
    get_ava_p2p_interface,
    get_proof_ids,
)
from test_framework.key import ECKey, ECPubKey
from test_framework.messages import (
    MSG_AVA_PROOF,
    AvalancheProofVoteResponse,
    AvalancheVote,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_raises_rpc_error,
    try_rpc,
    uint256_hex,
)
from test_framework.wallet_util import bytes_to_wif

QUORUM_NODE_COUNT = 16


class AvalancheProofVotingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.avaproof_stake_utxo_confirmations = 1
        self.conflicting_proof_cooldown = 100
        self.peer_replacement_cooldown = 2000
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                f"-avaproofstakeutxoconfirmations={self.avaproof_stake_utxo_confirmations}",
                f"-avalancheconflictingproofcooldown={self.conflicting_proof_cooldown}",
                f"-avalanchepeerreplacementcooldown={self.peer_replacement_cooldown}",
                "-avacooldown=0",
                "-avastalevotethreshold=140",
                "-avastalevotefactor=1",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
                "-persistavapeers=0",
            ],
        ]
        self.supports_cli = False

    # Build a fake quorum of nodes.
    def get_quorum(self, node):
        return [
            get_ava_p2p_interface(
                self,
                node,
                stake_utxo_confirmations=self.avaproof_stake_utxo_confirmations,
            )
            for _ in range(0, QUORUM_NODE_COUNT)
        ]

    @staticmethod
    def send_proof(from_peer, proof_hex):
        proof = avalanche_proof_from_hex(proof_hex)
        from_peer.send_avaproof(proof)
        return proof.proofid

    def send_and_check_for_polling(
        self, peer, proof_hex, response=AvalancheProofVoteResponse.ACTIVE
    ):
        proofid = self.send_proof(peer, proof_hex)
        self.wait_until(lambda: can_find_inv_in_poll(self.quorum, proofid, response))

    def build_conflicting_proof(self, node, sequence):
        return node.buildavalancheproof(
            sequence, 0, self.privkey_wif, self.conflicting_stakes
        )

    def wait_for_invalidated_proof(self, node, proofid):
        def invalidate_proof(proofid):
            self.wait_until(
                lambda: can_find_inv_in_poll(
                    self.quorum, proofid, response=AvalancheProofVoteResponse.REJECTED
                )
            )
            return try_rpc(
                -8, "Proof not found", node.getrawavalancheproof, uint256_hex(proofid)
            )

        with node.assert_debug_log(
            [f"Avalanche invalidated proof {uint256_hex(proofid)}"],
            ["Failed to reject proof"],
        ):
            self.wait_until(lambda: invalidate_proof(proofid))

    def wait_for_finalized_proof(self, node, proofid):
        def finalize_proof(proofid):
            can_find_inv_in_poll(
                self.quorum, proofid, response=AvalancheProofVoteResponse.ACTIVE
            )
            return node.getrawavalancheproof(uint256_hex(proofid)).get(
                "finalized", False
            )

        with node.assert_debug_log(
            [f"Avalanche finalized proof {uint256_hex(proofid)}"]
        ):
            self.wait_until(lambda: finalize_proof(proofid))

    def run_test(self):
        node = self.nodes[0]

        privkey = ECKey()
        privkey.generate()
        self.privkey_wif = bytes_to_wif(privkey.get_bytes())

        self.quorum = self.get_quorum(node)

        addrkey0 = node.get_deterministic_priv_key()
        blockhash = self.generatetoaddress(
            node, 9, addrkey0.address, sync_fun=self.no_op
        )
        self.conflicting_stakes = create_coinbase_stakes(
            node, blockhash[5:9], addrkey0.key
        )

        self.poll_tests(node)
        self.update_tests(node)
        self.vote_tests(node)
        self.stale_proof_tests(node)
        self.maturity_poll_tests(node)

    def poll_tests(self, node):
        # Disable the peer replacement cooldown for this test
        self.restart_node(
            0, extra_args=self.extra_args[0] + ["-avalanchepeerreplacementcooldown=0"]
        )
        self.quorum = self.get_quorum(node)

        proof_seq10 = self.build_conflicting_proof(node, 10)
        proof_seq20 = self.build_conflicting_proof(node, 20)
        proof_seq30 = self.build_conflicting_proof(node, 30)
        proof_seq40 = self.build_conflicting_proof(node, 40)

        no_stake = node.buildavalancheproof(200, 2000000000, self.privkey_wif, [])

        # Get the key so we can verify signatures.
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        self.log.info("Trigger polling from the node...")

        peer = get_ava_p2p_interface(self, node)

        mock_time = int(time.time())
        node.setmocktime(mock_time)

        self.log.info("Check we poll for valid proof")
        self.send_and_check_for_polling(peer, proof_seq30)

        proofid_seq30 = avalanche_proof_from_hex(proof_seq30).proofid
        self.wait_for_finalized_proof(node, proofid_seq30)

        self.log.info(
            "Check we don't poll for subsequent proofs if the cooldown is not elapsed,"
            " proof not the favorite"
        )
        with node.assert_debug_log(
            ["Not polling the avalanche proof (cooldown-not-elapsed)"]
        ):
            peer.send_avaproof(avalanche_proof_from_hex(proof_seq20))

        self.log.info(
            "Check we don't poll for subsequent proofs if the cooldown is not elapsed,"
            " proof is the favorite"
        )
        with node.assert_debug_log(
            ["Not polling the avalanche proof (cooldown-not-elapsed)"]
        ):
            peer.send_avaproof(avalanche_proof_from_hex(proof_seq40))

        self.log.info(
            "Check we poll for conflicting proof if the proof is not the favorite"
        )
        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)
        self.send_and_check_for_polling(
            peer, proof_seq20, response=AvalancheProofVoteResponse.REJECTED
        )

        # Continue to vote until the proof is invalidated
        proofid_seq20 = avalanche_proof_from_hex(proof_seq20).proofid
        self.wait_for_invalidated_proof(node, proofid_seq20)

        self.log.info(
            "Check we poll for conflicting proof if the proof is the favorite"
        )
        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)
        self.send_and_check_for_polling(peer, proof_seq40)

        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)

        self.log.info("Check we don't poll for proofs that get rejected")
        with node.assert_debug_log(
            ["Not polling the avalanche proof (rejected-proof)"]
        ):
            peer.send_avaproof(avalanche_proof_from_hex(proof_seq10))

        self.log.info("Check we don't poll for invalid proofs and get banned")
        with node.assert_debug_log(["Misbehaving", "invalid-proof"]):
            peer.send_avaproof(avalanche_proof_from_hex(no_stake))

    def update_tests(self, node):
        # Restart the node to get rid of in-flight requests
        self.restart_node(0)

        self.quorum = self.get_quorum(node)
        peer = get_ava_p2p_interface(self, node)

        mock_time = int(time.time())
        node.setmocktime(mock_time)

        proof_seq30 = self.build_conflicting_proof(node, 30)
        proof_seq40 = self.build_conflicting_proof(node, 40)
        proof_seq50 = self.build_conflicting_proof(node, 50)
        proofid_seq30 = avalanche_proof_from_hex(proof_seq30).proofid
        proofid_seq40 = avalanche_proof_from_hex(proof_seq40).proofid
        proofid_seq50 = avalanche_proof_from_hex(proof_seq50).proofid

        node.sendavalancheproof(proof_seq40)
        self.wait_until(lambda: proofid_seq40 in get_proof_ids(node))

        assert proofid_seq40 in get_proof_ids(node)
        assert proofid_seq30 not in get_proof_ids(node)

        self.log.info("Test proof acceptance")

        def accept_proof(proofid):
            self.wait_until(
                lambda: can_find_inv_in_poll(
                    self.quorum, proofid, response=AvalancheProofVoteResponse.ACTIVE
                )
            )
            return proofid in get_proof_ids(node)

        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)

        self.send_and_check_for_polling(peer, proof_seq30)

        # Let the quorum vote for it
        self.wait_until(lambda: accept_proof(proofid_seq30))
        assert proofid_seq40 not in get_proof_ids(node)

        self.log.info("Test the peer replacement rate limit")
        self.wait_for_finalized_proof(node, proofid_seq30)

        # Not enough
        assert self.conflicting_proof_cooldown < self.peer_replacement_cooldown
        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)

        with node.assert_debug_log(
            ["Not polling the avalanche proof (cooldown-not-elapsed)"]
        ):
            self.send_proof(peer, proof_seq50)

        mock_time += self.peer_replacement_cooldown
        node.setmocktime(mock_time)

        self.log.info("Test proof rejection")

        self.send_proof(peer, proof_seq50)
        self.wait_until(lambda: proofid_seq50 in get_proof_ids(node))
        assert proofid_seq40 not in get_proof_ids(node)

        def reject_proof(proofid):
            self.wait_until(
                lambda: can_find_inv_in_poll(
                    self.quorum, proofid, response=AvalancheProofVoteResponse.REJECTED
                )
            )
            return proofid not in get_proof_ids(node)

        with node.assert_debug_log(
            [f"Avalanche rejected proof {uint256_hex(proofid_seq50)}"],
            ["Failed to reject proof"],
        ):
            self.wait_until(lambda: reject_proof(proofid_seq50))

        assert proofid_seq50 not in get_proof_ids(node)
        assert proofid_seq40 in get_proof_ids(node)

        self.log.info("Test proof invalidation")
        self.wait_for_invalidated_proof(node, proofid_seq50)

        self.log.info("The node will now ignore the invalid proof")

        for i in range(5):
            with node.assert_debug_log(["received: avaproof"]):
                self.send_proof(peer, proof_seq50)
            assert_raises_rpc_error(
                -8,
                "Proof not found",
                node.getrawavalancheproof,
                uint256_hex(proofid_seq50),
            )

        node.setmocktime(0)

    def vote_tests(self, node):
        self.avaproof_stake_utxo_confirmations = 2
        self.restart_node(
            0,
            extra_args=[
                "-avaproofstakeutxodustthreshold=1000000",
                f"-avaproofstakeutxoconfirmations={self.avaproof_stake_utxo_confirmations}",
                "-avacooldown=0",
                "-avalancheconflictingproofcooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
                "-persistavapeers=0",
            ],
        )

        self.get_quorum(node)
        ava_node = get_ava_p2p_interface(
            self, node, stake_utxo_confirmations=self.avaproof_stake_utxo_confirmations
        )

        # Generate coinbases to use for stakes
        stakes_key = node.get_deterministic_priv_key()
        blocks = self.generatetoaddress(
            node, 4, stakes_key.address, sync_fun=self.no_op
        )

        # Get the ava key so we can verify signatures.
        ava_key = ECPubKey()
        ava_key.set(bytes.fromhex(node.getavalanchekey()))

        def create_proof(stakes, sequence=10):
            proof = node.buildavalancheproof(sequence, 0, self.privkey_wif, stakes)
            proof_id = avalanche_proof_from_hex(proof).proofid
            return proof, proof_id

        # proof_0 is valid right now
        stakes_0 = create_coinbase_stakes(node, [blocks[0]], stakes_key.key)
        proof_0, proof_0_id = create_proof(stakes_0)

        # proof_1 is valid right now, and from different stakes
        stakes_1 = create_coinbase_stakes(node, [blocks[1]], stakes_key.key)
        proof_1, proof_1_id = create_proof(stakes_1)

        # proof_2 is immature because the stake UTXO is immature
        stakes_2 = create_coinbase_stakes(node, [blocks[3]], stakes_key.key)
        proof_2, proof_2_id = create_proof(stakes_2)

        # proof_3 conflicts with proof_0 and proof_1, but has a lower sequence
        stakes_3 = create_coinbase_stakes(node, [blocks[0], blocks[1]], stakes_key.key)
        proof_3, proof_3_id = create_proof(stakes_3, sequence=1)

        # proof_4 is invalid and should be rejected
        stakes_4 = create_coinbase_stakes(node, [blocks[2]], stakes_key.key)
        stakes_4[0]["amount"] -= 100000
        proof_4, proof_4_id = create_proof(stakes_4)

        # Create a helper to issue a poll and validate the responses
        def poll_assert_response(expected):
            # Issue a poll for each proof
            self.log.info("Trigger polling from the node...")
            ava_node.send_poll(
                [proof_0_id, proof_1_id, proof_2_id, proof_3_id, proof_4_id],
                MSG_AVA_PROOF,
            )
            response = ava_node.wait_for_avaresponse()
            r = response.response

            # Verify signature
            assert ava_key.verify_schnorr(response.sig, r.get_hash())

            # Verify votes
            votes = r.votes
            assert_equal(len(votes), len(expected))
            for i in range(0, len(votes)):
                assert_equal(repr(votes[i]), repr(expected[i]))

        # Check that all proofs start unknown
        poll_assert_response(
            [
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_0_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_1_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_2_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_3_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_4_id),
            ]
        )

        # Send the first proof. Nodes should now respond that it's accepted
        node.sendavalancheproof(proof_0)
        poll_assert_response(
            [
                AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_0_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_1_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_2_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_3_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_4_id),
            ]
        )

        # Send and check the 2nd proof. Nodes should now respond that it's
        # accepted
        node.sendavalancheproof(proof_1)
        poll_assert_response(
            [
                AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_0_id),
                AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_1_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_2_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_3_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_4_id),
            ]
        )

        # The next proof should be rejected/put in the immature pool
        ava_node.send_proof(avalanche_proof_from_hex(proof_2))
        poll_assert_response(
            [
                AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_0_id),
                AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_1_id),
                AvalancheVote(AvalancheProofVoteResponse.IMMATURE, proof_2_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_3_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_4_id),
            ]
        )

        # The next proof should be rejected and marked as a conflicting proof
        assert_raises_rpc_error(
            -8, "conflicting-utxos", node.sendavalancheproof, proof_3
        )
        poll_assert_response(
            [
                AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_0_id),
                AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_1_id),
                AvalancheVote(AvalancheProofVoteResponse.IMMATURE, proof_2_id),
                AvalancheVote(AvalancheProofVoteResponse.CONFLICT, proof_3_id),
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_4_id),
            ]
        )

        # The final proof should be permanently rejected for being completely
        # invalid
        ava_node.send_proof(avalanche_proof_from_hex(proof_4))
        poll_assert_response(
            [
                AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_0_id),
                AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_1_id),
                AvalancheVote(AvalancheProofVoteResponse.IMMATURE, proof_2_id),
                AvalancheVote(AvalancheProofVoteResponse.CONFLICT, proof_3_id),
                AvalancheVote(AvalancheProofVoteResponse.REJECTED, proof_4_id),
            ]
        )

    def stale_proof_tests(self, node):
        # Restart the node to get rid of in-flight requests
        self.restart_node(0)

        self.quorum = self.get_quorum(node)
        peer = get_ava_p2p_interface(self, node)

        mock_time = int(time.time())
        node.setmocktime(mock_time)

        proof_seq1 = self.build_conflicting_proof(node, 1)
        proof_seq2 = self.build_conflicting_proof(node, 2)
        proofid_seq1 = avalanche_proof_from_hex(proof_seq1).proofid
        proofid_seq2 = avalanche_proof_from_hex(proof_seq2).proofid

        node.sendavalancheproof(proof_seq2)
        self.wait_until(lambda: proofid_seq2 in get_proof_ids(node))

        assert proofid_seq2 in get_proof_ids(node)
        assert proofid_seq1 not in get_proof_ids(node)

        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)

        self.send_and_check_for_polling(
            peer, proof_seq1, response=AvalancheProofVoteResponse.UNKNOWN
        )

        def vote_until_dropped(proofid):
            can_find_inv_in_poll(
                self.quorum, proofid, response=AvalancheProofVoteResponse.UNKNOWN
            )
            return try_rpc(
                -8, "Proof not found", node.getrawavalancheproof, uint256_hex(proofid)
            )

        with node.assert_debug_log(
            [f"Avalanche stalled proof {uint256_hex(proofid_seq1)}"]
        ):
            self.wait_until(lambda: vote_until_dropped(proofid_seq1))

        # Verify that proof_seq2 was not replaced
        assert proofid_seq2 in get_proof_ids(node)
        assert proofid_seq1 not in get_proof_ids(node)

        # When polled, peer responds with expected votes for both proofs
        peer.send_poll([proofid_seq1, proofid_seq2], MSG_AVA_PROOF)
        response = peer.wait_for_avaresponse()
        assert repr(response.response.votes) == repr(
            [
                AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proofid_seq1),
                AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proofid_seq2),
            ]
        )

        node.setmocktime(0)

    def maturity_poll_tests(self, node):
        # Restart the node with appropriate flags for this test
        self.avaproof_stake_utxo_confirmations = 2
        self.restart_node(
            0,
            extra_args=[
                "-avaproofstakeutxodustthreshold=1000000",
                f"-avaproofstakeutxoconfirmations={self.avaproof_stake_utxo_confirmations}",
                "-avalancheconflictingproofcooldown=0",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
                "-persistavapeers=0",
            ],
        )

        self.quorum = self.get_quorum(node)
        peer = get_ava_p2p_interface(
            self, node, stake_utxo_confirmations=self.avaproof_stake_utxo_confirmations
        )

        _, immature_proof = gen_proof(self, node)

        self.log.info("Immature proofs are not polled")

        with node.assert_debug_log(
            ["Not polling the avalanche proof (immature-proof)"]
        ):
            peer.send_avaproof(immature_proof)

        self.log.info("Newly mature proofs are polled")

        self.generate(node, 1, sync_fun=self.no_op)
        self.send_and_check_for_polling(peer, immature_proof.serialize().hex())


if __name__ == "__main__":
    AvalancheProofVotingTest().main()
