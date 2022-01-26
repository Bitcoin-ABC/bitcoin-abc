#!/usr/bin/env python3
# Copyright (c) 2020-2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the polling of Avalanche stake proofs."""

from test_framework.avatools import (
    create_coinbase_stakes,
    get_ava_p2p_interface,
)
from test_framework.key import ECKey, ECPubKey
from test_framework.messages import (
    MSG_AVA_PROOF,
    AvalancheProofVoteResponse,
    AvalancheVote,
    FromHex,
    LegacyAvalancheProof,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error
from test_framework.wallet_util import bytes_to_wif


class AvalancheTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            ['-enableavalanche=1', '-avacooldown=0', '-whitelist=noban@127.0.0.1']]
        self.supports_cli = False

    def run_test(self):
        node = self.nodes[0]
        ava_node = get_ava_p2p_interface(self.nodes[0])

        # Generate coinbases to use for stakes
        stakes_key = node.get_deterministic_priv_key()
        blocks = node.generatetoaddress(4, stakes_key.address)

        # Get the ava key so we can verify signatures.
        ava_key = ECPubKey()
        ava_key.set(bytes.fromhex(node.getavalanchekey()))

        # Get stakes key so we can sign stakes
        priv_key = ECKey()
        priv_key.set(bytes.fromhex(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747"
        ), True)
        master_key = bytes_to_wif(priv_key.get_bytes())

        def create_proof(stakes):
            proof = node.buildavalancheproof(11, 12, master_key, stakes)
            proof_id = FromHex(LegacyAvalancheProof(), proof).proofid
            return proof, proof_id

        # proof_0 is valid right now
        stakes_0 = create_coinbase_stakes(node, [blocks[0]], stakes_key.key)
        proof_0, proof_0_id = create_proof(stakes_0)

        # proof_1 is valid right now, and from different stakes
        stakes_1 = create_coinbase_stakes(node, [blocks[1]], stakes_key.key)
        proof_1, proof_1_id = create_proof(stakes_1)

        # proof_2 is an orphan because the stake UTXO is unknown
        stakes_2 = create_coinbase_stakes(node, [blocks[2]], stakes_key.key)
        stakes_2[0]['height'] = 5
        proof_2, proof_2_id = create_proof(stakes_2)

        # proof_3 conflicts with proof_0 and proof_1
        stakes_3 = create_coinbase_stakes(
            node, [blocks[0], blocks[1]], stakes_key.key)
        proof_3, proof_3_id = create_proof(stakes_3)

        # proof_4 is invalid and should be rejected
        stakes_4 = create_coinbase_stakes(node, [blocks[3]], stakes_key.key)
        stakes_4[0]['amount'] -= 100000
        proof_4, proof_4_id = create_proof(stakes_4)

        # Create a helper to issue a poll and validate the responses
        def poll_assert_response(expected):
            # Issue a poll for each proof
            self.log.info("Trigger polling from the node...")
            ava_node.send_poll(
                [proof_0_id, proof_1_id, proof_2_id, proof_3_id, proof_4_id],
                MSG_AVA_PROOF)
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
        poll_assert_response([
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_0_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_1_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_2_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_3_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_4_id)])

        # Send the first proof. Nodes should now respond that it's accepted
        node.sendavalancheproof(proof_0)
        poll_assert_response([
            AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_0_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_1_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_2_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_3_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_4_id)])

        # Send and check the 2nd proof. Nodes should now respond that it's
        # accepted
        node.sendavalancheproof(proof_1)
        poll_assert_response([
            AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_0_id),
            AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_1_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_2_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_3_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_4_id)])

        # The next proof should be rejected/put in the orphan pool
        ava_node.send_proof(FromHex(LegacyAvalancheProof(), proof_2))
        poll_assert_response([
            AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_0_id),
            AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_1_id),
            AvalancheVote(AvalancheProofVoteResponse.ORPHAN, proof_2_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_3_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_4_id)])

        # The next proof should be rejected and marked as a conflicting proof
        assert_raises_rpc_error(-8,
                                "The proof has conflicting utxo with an existing proof",
                                node.sendavalancheproof, proof_3)
        poll_assert_response([
            AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_0_id),
            AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_1_id),
            AvalancheVote(AvalancheProofVoteResponse.ORPHAN, proof_2_id),
            AvalancheVote(AvalancheProofVoteResponse.CONFLICT, proof_3_id),
            AvalancheVote(AvalancheProofVoteResponse.UNKNOWN, proof_4_id)])

        # The final proof should be permanently rejected for being completely
        # invalid
        ava_node.send_proof(FromHex(LegacyAvalancheProof(), proof_4))
        poll_assert_response([
            AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_0_id),
            AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof_1_id),
            AvalancheVote(AvalancheProofVoteResponse.ORPHAN, proof_2_id),
            AvalancheVote(AvalancheProofVoteResponse.CONFLICT, proof_3_id),
            AvalancheVote(AvalancheProofVoteResponse.REJECTED, proof_4_id)])


if __name__ == '__main__':
    AvalancheTest().main()
