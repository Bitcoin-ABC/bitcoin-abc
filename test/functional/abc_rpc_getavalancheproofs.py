# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the getavalancheproofs RPC."""

import time

from test_framework.avatools import (
    AvaP2PInterface,
    avalanche_proof_from_hex,
    create_coinbase_stakes,
    gen_proof,
    wait_for_proof,
)
from test_framework.messages import AvalancheProofVoteResponse, AvalancheVote
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, try_rpc, uint256_hex
from test_framework.wallet_util import bytes_to_wif


class GetAvalancheProofsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.conflicting_proof_cooldown = 100
        self.noban_tx_relay = True
        self.extra_args = [
            [
                f"-avalancheconflictingproofcooldown={self.conflicting_proof_cooldown}",
                "-avaproofstakeutxoconfirmations=2",
                "-avacooldown=0",
                "-avaminquorumstake=250000000",
                "-avaminquorumconnectedstakeratio=0.9",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminavaproofsnodecount=0",
            ]
        ]

    def run_test(self):
        node = self.nodes[0]

        privkey, proof = gen_proof(self, node)

        # Make the proof mature
        self.generate(node, 1, sync_fun=self.no_op)

        def avalancheproofs_equals(expected):
            proofs = node.getavalancheproofs()
            for key, proof_list in proofs.items():
                proof_list.sort()
            for key, proof_list in expected.items():
                proof_list.sort()
            return proofs == expected

        self.log.info("The test node has no proof")

        assert avalancheproofs_equals(
            {
                "valid": [],
                "conflicting": [],
                "immature": [],
            }
        )

        self.log.info("The test node has a proof")

        self.restart_node(
            0,
            self.extra_args[0]
            + [
                f"-avaproof={proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
            ],
        )

        # Before local proof is validated
        assert avalancheproofs_equals(
            {
                "valid": [],
                "conflicting": [],
                "immature": [],
            }
        )

        # Add an inbound so the node proof can be registered and advertised
        node.add_p2p_connection(P2PInterface())
        # Mine a block to trigger proof validation
        self.generate(node, 1, sync_fun=self.no_op)
        self.wait_until(
            lambda: avalancheproofs_equals(
                {
                    "valid": [uint256_hex(proof.proofid)],
                    "conflicting": [],
                    "immature": [],
                }
            )
        )

        self.log.info("Connect a bunch of peers and nodes")

        mock_time = int(time.time())
        node.setmocktime(mock_time)

        privkeys = []
        proofs = [proof]
        conflicting_proofs = []
        quorum = []
        N = 13
        for _ in range(N):
            _privkey, _proof = gen_proof(self, node)
            proofs.append(_proof)
            privkeys.append(_privkey)

            # For each proof, also make a conflicting one
            stakes = create_coinbase_stakes(
                node, [node.getbestblockhash()], node.get_deterministic_priv_key().key
            )
            conflicting_proof_hex = node.buildavalancheproof(
                10, 0, bytes_to_wif(_privkey.get_bytes()), stakes
            )
            conflicting_proof = avalanche_proof_from_hex(conflicting_proof_hex)
            conflicting_proofs.append(conflicting_proof)

            # Make the proof and its conflicting proof mature
            self.generate(node, 1, sync_fun=self.no_op)

            n = AvaP2PInterface()
            n.proof = _proof
            n.master_privkey = _privkey
            node.add_p2p_connection(n)
            quorum.append(n)

            n.send_avaproof(_proof)
            wait_for_proof(node, uint256_hex(_proof.proofid))

            mock_time += self.conflicting_proof_cooldown
            node.setmocktime(mock_time)
            n.send_avaproof(conflicting_proof)

        # Generate an immature proof
        _, immature_proof = gen_proof(self, node)
        n.send_avaproof(immature_proof)

        self.wait_until(
            lambda: avalancheproofs_equals(
                {
                    "valid": [uint256_hex(p.proofid) for p in proofs],
                    "conflicting": [uint256_hex(p.proofid) for p in conflicting_proofs],
                    "immature": [uint256_hex(immature_proof.proofid)],
                }
            )
        )

        assert_equal(node.getavalancheinfo()["ready_to_poll"], True)

        self.log.info("Finalize the proofs for some peers")

        def vote_for_all_proofs():
            for i, n in enumerate(quorum):
                if not n.is_connected:
                    continue

                poll = n.get_avapoll_if_available()

                # That node has not received a poll
                if poll is None:
                    continue

                # Respond yes to all polls except the conflicting proofs
                votes = []
                for inv in poll.invs:
                    response = AvalancheProofVoteResponse.ACTIVE
                    if inv.hash in [p.proofid for p in conflicting_proofs]:
                        response = AvalancheProofVoteResponse.REJECTED

                    votes.append(AvalancheVote(response, inv.hash))

                n.send_avaresponse(poll.round, votes, privkeys[i])

            # Check if all proofs are finalized or invalidated
            return all(
                [
                    node.getrawavalancheproof(uint256_hex(p.proofid)).get(
                        "finalized", False
                    )
                    for p in proofs
                ]
                + [
                    try_rpc(
                        -8,
                        "Proof not found",
                        node.getrawavalancheproof,
                        uint256_hex(c.proofid),
                    )
                    for c in conflicting_proofs
                ]
            )

        # Vote until all the proofs have finalized (including ours)
        self.wait_until(lambda: vote_for_all_proofs(), timeout=240)

        self.wait_until(
            lambda: avalancheproofs_equals(
                {
                    "valid": [uint256_hex(p.proofid) for p in proofs],
                    "conflicting": [],
                    "immature": [uint256_hex(immature_proof.proofid)],
                }
            )
        )

        # Make the immature proof mature
        self.generate(node, 1, sync_fun=self.no_op)
        proofs.append(immature_proof)

        self.wait_until(
            lambda: avalancheproofs_equals(
                {
                    "valid": [uint256_hex(p.proofid) for p in proofs],
                    "conflicting": [],
                    "immature": [],
                }
            )
        )


if __name__ == "__main__":
    GetAvalancheProofsTest().main()
