# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the invalidateavalancheproof and reconsideravalancheproof RPCs."""

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import (
    AvaP2PInterface,
    avalanche_proof_from_hex,
    create_coinbase_stakes,
    gen_proof,
    wait_for_proof,
)
from test_framework.key import ECPubKey
from test_framework.messages import (
    MSG_AVA_PROOF,
    AvalancheProofVoteResponse,
    AvalancheVote,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error, uint256_hex
from test_framework.wallet_util import bytes_to_wif


class InvalidateAvalancheProofTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avalancheconflictingproofcooldown=0",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=250000000",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminavaproofsnodecount=0",
            ]
        ]

    def run_test(self):
        node = self.nodes[0]

        node_key, node_proof = gen_proof(self, node)
        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [
                f"-avaproof={node_proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(node_key.get_bytes())}",
            ],
        )

        node_pubkey = ECPubKey()
        node_pubkey.set(bytes.fromhex(node.getavalanchekey()))

        quorum = [
            node.add_p2p_connection(AvaP2PInterface(self, node)) for _ in range(10)
        ]
        self.wait_until(lambda: node.getavalancheinfo()["ready_to_poll"])

        _, proof = gen_proof(self, node)
        proofid_hex = uint256_hex(proof.proofid)
        assert_raises_rpc_error(
            -8, "Proof not found", node.invalidateavalancheproof, proofid_hex
        )

        # Register that valid proof
        assert node.sendavalancheproof(proof.serialize().hex())
        wait_for_proof(node, proofid_hex)

        # Now it can be invalidated
        node.invalidateavalancheproof(proofid_hex)
        # It's no longer in the node known proofs
        assert_raises_rpc_error(
            -8, "Proof not found", node.getrawavalancheproof, proofid_hex
        )

        # Make sure the node votes against the proof if polled
        poll_node = quorum[0]
        poll_node.send_poll([proof.proofid], MSG_AVA_PROOF)

        def assert_response(expected):
            response = poll_node.wait_for_avaresponse()
            r = response.response
            assert_equal(r.cooldown, 0)

            # Verify signature.
            assert node_pubkey.verify_schnorr(response.sig, r.get_hash())

            votes = r.votes
            assert_equal(len(votes), len(expected))
            for i in range(0, len(votes)):
                assert_equal(repr(votes[i]), repr(expected[i]))

        assert_response(
            [AvalancheVote(AvalancheProofVoteResponse.REJECTED, proof.proofid)]
        )

        assert node.reconsideravalancheproof(proof.serialize().hex())
        wait_for_proof(node, proofid_hex)

        # Now the node vote yes for that proof
        poll_node.send_poll([proof.proofid], MSG_AVA_PROOF)
        assert_response(
            [AvalancheVote(AvalancheProofVoteResponse.ACTIVE, proof.proofid)]
        )

        # Reconsidering an existing proof is a no-op
        assert node.reconsideravalancheproof(proof.serialize().hex())

        # Reconsidering an invalid proof always fail
        no_stake = node.buildavalancheproof(
            1, 0, bytes_to_wif(node_key.get_bytes()), []
        )
        assert_raises_rpc_error(-8, "no-stake", node.reconsideravalancheproof, no_stake)

        # If the proof is known but not valid (conflicting or immature) reconsider returns false
        self.generate(node, 1)
        stakes = create_coinbase_stakes(
            node, [node.getbestblockhash()], node.get_deterministic_priv_key().key
        )
        conflicting_proof = node.buildavalancheproof(
            1,
            0,
            bytes_to_wif(node_key.get_bytes()),
            stakes,
            ADDRESS_ECREG_UNSPENDABLE,
        )
        better_proof = node.buildavalancheproof(
            2,
            0,
            bytes_to_wif(node_key.get_bytes()),
            stakes,
            ADDRESS_ECREG_UNSPENDABLE,
        )

        # Will just register the proof
        assert node.reconsideravalancheproof(better_proof)
        wait_for_proof(
            node, uint256_hex(avalanche_proof_from_hex(better_proof).proofid)
        )

        # Will raise a registration error
        assert_raises_rpc_error(
            -8, "conflicting-utxos", node.reconsideravalancheproof, conflicting_proof
        )


if __name__ == "__main__":
    InvalidateAvalancheProofTest().main()
