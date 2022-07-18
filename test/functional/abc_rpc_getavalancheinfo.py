#!/usr/bin/env python3
# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the getavalancheinfo RPC."""
import time
from decimal import Decimal

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import (
    AvaP2PInterface,
    avalanche_proof_from_hex,
    create_coinbase_stakes,
    gen_proof,
    get_ava_p2p_interface,
    wait_for_proof,
)
from test_framework.key import ECKey
from test_framework.messages import (
    AvalancheProofVoteResponse,
    AvalancheVote,
    LegacyAvalancheProof,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet_util import bytes_to_wif


class GetAvalancheInfoTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.conflicting_proof_cooldown = 100
        self.extra_args = [[
            '-enableavalanche=1',
            '-enableavalancheproofreplacement=1',
            f'-avalancheconflictingproofcooldown={self.conflicting_proof_cooldown}',
            '-avaproofstakeutxoconfirmations=2',
            '-avacooldown=0',
            '-enableavalanchepeerdiscovery=1',
            '-avaminquorumstake=250000000',
            '-avaminquorumconnectedstakeratio=0.9',
        ]]

    def run_test(self):
        node = self.nodes[0]

        privkey, proof = gen_proof(node)
        is_legacy = isinstance(proof, LegacyAvalancheProof)

        # Make the proof mature
        node.generate(1)

        def handle_legacy_format(expected):
            # Add the payout address to the expected output if the legacy format
            # is diabled
            if not is_legacy and "local" in expected.keys():
                expected["local"]["payout_address"] = ADDRESS_ECREG_UNSPENDABLE

            return expected

        def assert_avalancheinfo(expected):
            assert_equal(
                node.getavalancheinfo(),
                handle_legacy_format(expected)
            )

        coinbase_amount = Decimal('25000000.00')

        self.log.info("The test node has no proof")

        assert_avalancheinfo({
            "active": False,
            "network": {
                "proof_count": 0,
                "connected_proof_count": 0,
                "dangling_proof_count": 0,
                "finalized_proof_count": 0,
                "conflicting_proof_count": 0,
                "orphan_proof_count": 0,
                "total_stake_amount": Decimal('0.00'),
                "connected_stake_amount": Decimal('0.00'),
                "dangling_stake_amount": Decimal('0.00'),
                "node_count": 0,
                "connected_node_count": 0,
                "pending_node_count": 0,
            }
        })

        self.log.info("The test node has a proof")

        self.restart_node(0, self.extra_args[0] + [
            '-enableavalanche=1',
            '-avaproof={}'.format(proof.serialize().hex()),
            '-avamasterkey={}'.format(bytes_to_wif(privkey.get_bytes()))
        ])
        assert_avalancheinfo({
            "active": False,
            "local": {
                "live": False,
                "proofid": f"{proof.proofid:0{64}x}",
                "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                "master": privkey.get_pubkey().get_bytes().hex(),
                "stake_amount": coinbase_amount,
            },
            "network": {
                "proof_count": 0,
                "connected_proof_count": 0,
                "dangling_proof_count": 0,
                "finalized_proof_count": 0,
                "conflicting_proof_count": 0,
                "orphan_proof_count": 0,
                "total_stake_amount": Decimal('0.00'),
                "connected_stake_amount": Decimal('0.00'),
                "dangling_stake_amount": Decimal('0.00'),
                "node_count": 0,
                "connected_node_count": 0,
                "pending_node_count": 0,
            }
        })

        # Mine a block to trigger proof validation
        node.generate(1)
        self.wait_until(
            lambda: node.getavalancheinfo() == handle_legacy_format({
                "active": False,
                "local": {
                    "live": True,
                    "proofid": f"{proof.proofid:0{64}x}",
                    "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                },
                "network": {
                    "proof_count": 0,
                    "connected_proof_count": 0,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": 0,
                    "orphan_proof_count": 0,
                    "total_stake_amount": Decimal('0.00'),
                    "connected_stake_amount": Decimal('0.00'),
                    "dangling_stake_amount": Decimal('0.00'),
                    "node_count": 0,
                    "connected_node_count": 0,
                    "pending_node_count": 0,
                }
            })
        )

        self.log.info("Connect a bunch of peers and nodes")

        mock_time = int(time.time())
        node.setmocktime(mock_time)

        privkeys = []
        proofs = []
        conflicting_proofs = []
        quorum = []
        N = 13
        for _ in range(N):
            _privkey, _proof = gen_proof(node)
            proofs.append(_proof)
            privkeys.append(_privkey)

            # For each proof, also make a conflicting one
            stakes = create_coinbase_stakes(
                node, [node.getbestblockhash()], node.get_deterministic_priv_key().key)
            conflicting_proof_hex = node.buildavalancheproof(
                10, 9999, bytes_to_wif(_privkey.get_bytes()), stakes)
            conflicting_proof = avalanche_proof_from_hex(conflicting_proof_hex)
            conflicting_proofs.append(conflicting_proof)

            # Make the proof and its conflicting proof mature
            node.generate(1)

            n = AvaP2PInterface()
            n.proof = _proof
            n.master_privkey = _privkey
            node.add_p2p_connection(n)
            quorum.append(n)

            n.send_avaproof(_proof)
            wait_for_proof(node, f"{_proof.proofid:0{64}x}", timeout=10)

            mock_time += self.conflicting_proof_cooldown
            node.setmocktime(mock_time)
            n.send_avaproof(conflicting_proof)

        # Generate an orphan (immature) proof
        _, orphan_proof = gen_proof(node)
        n.send_avaproof(orphan_proof)

        self.wait_until(
            lambda: node.getavalancheinfo() == handle_legacy_format({
                "active": True,
                "local": {
                    "live": True,
                    "proofid": f"{proof.proofid:0{64}x}",
                    "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                },
                "network": {
                    "proof_count": N,
                    "connected_proof_count": N,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": N,
                    "orphan_proof_count": 1,
                    "total_stake_amount": coinbase_amount * N,
                    "connected_stake_amount": coinbase_amount * N,
                    "dangling_stake_amount": Decimal('0.00'),
                    "node_count": N,
                    "connected_node_count": N,
                    "pending_node_count": 0,
                }
            })
        )

        self.log.info("Disconnect some nodes")

        D = 3
        for _ in range(D):
            n = node.p2ps.pop()
            n.peer_disconnect()
            n.wait_for_disconnect()

        self.wait_until(
            lambda: node.getavalancheinfo() == handle_legacy_format({
                "active": True,
                "local": {
                    "live": True,
                    "proofid": f"{proof.proofid:0{64}x}",
                    "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                },
                "network": {
                    "proof_count": N,
                    "connected_proof_count": N - D,
                    "dangling_proof_count": D,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": N,
                    "orphan_proof_count": 1,
                    "total_stake_amount": coinbase_amount * N,
                    "connected_stake_amount": coinbase_amount * (N - D),
                    "dangling_stake_amount": coinbase_amount * D,
                    "node_count": N - D,
                    "connected_node_count": N - D,
                    "pending_node_count": 0,
                }
            })
        )

        self.log.info("Add some pending nodes")

        P = 3
        for _ in range(P):
            dg_priv = ECKey()
            dg_priv.generate()
            dg_pub = dg_priv.get_pubkey().get_bytes().hex()

            _privkey, _proof = gen_proof(node)

            # Make the proof mature
            node.generate(1)

            delegation = node.delegateavalancheproof(
                f"{_proof.limited_proofid:0{64}x}",
                bytes_to_wif(_privkey.get_bytes()),
                dg_pub,
                None
            )

            n = get_ava_p2p_interface(node)
            n.send_avahello(delegation, dg_priv)
            # Make sure we completed at least one time the ProcessMessage or we
            # might miss the last pending node for the following assert
            n.sync_with_ping()

        assert_avalancheinfo({
            "active": True,
            "local": {
                "live": True,
                "proofid": f"{proof.proofid:0{64}x}",
                "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                "master": privkey.get_pubkey().get_bytes().hex(),
                "stake_amount": coinbase_amount,
            },
            "network": {
                # Orphan became mature
                "proof_count": N + 1,
                "connected_proof_count": N - D,
                "dangling_proof_count": D + 1,
                "finalized_proof_count": 0,
                "conflicting_proof_count": N,
                "orphan_proof_count": 0,
                "total_stake_amount": coinbase_amount * (N + 1),
                "connected_stake_amount": coinbase_amount * (N - D),
                "dangling_stake_amount": coinbase_amount * (D + 1),
                "node_count": N - D + P,
                "connected_node_count": N - D,
                "pending_node_count": P,
            }
        })

        self.log.info("Finalize the proofs for some peers")

        def vote_for_all_proofs():
            done_voting = True
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

                        # We need to finish voting on the conflicting proofs to
                        # ensure the count is stable and that no valid proof
                        # was replaced.
                        done_voting = False

                    votes.append(AvalancheVote(response, inv.hash))

                    # If we voted on one of our proofs, we're probably not done
                    # voting.
                    if inv.hash in [p.proofid for p in proofs]:
                        done_voting = False

                n.send_avaresponse(poll.round, votes, privkeys[i])

            return done_voting

        # Vote until proofs have finalized
        expected_logs = []
        for p in proofs:
            expected_logs.append(
                f"Avalanche finalized proof {p.proofid:0{64}x}")
        with node.assert_debug_log(expected_logs):
            self.wait_until(lambda: vote_for_all_proofs())

        self.log.info("Disconnect all the nodes")

        node.disconnect_p2ps()

        assert_avalancheinfo({
            "active": False,
            "local": {
                "live": True,
                "proofid": f"{proof.proofid:0{64}x}",
                "limited_proofid": f"{proof.limited_proofid:0{64}x}",
                "master": privkey.get_pubkey().get_bytes().hex(),
                "stake_amount": coinbase_amount,
            },
            "network": {
                "proof_count": N + 1,
                "connected_proof_count": 0,
                "dangling_proof_count": N + 1,
                "finalized_proof_count": N + 1,
                "conflicting_proof_count": 0,
                "orphan_proof_count": 0,
                "total_stake_amount": coinbase_amount * (N + 1),
                "connected_stake_amount": 0,
                "dangling_stake_amount": coinbase_amount * (N + 1),
                "node_count": 0,
                "connected_node_count": 0,
                "pending_node_count": 0,
            }
        })


if __name__ == '__main__':
    GetAvalancheInfoTest().main()
