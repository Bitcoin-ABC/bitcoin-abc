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
    get_ava_p2p_interface_no_handshake,
    wait_for_proof,
)
from test_framework.key import ECKey
from test_framework.messages import AvalancheProofVoteResponse, AvalancheVote
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_raises_rpc_error,
    try_rpc,
    uint256_hex,
)
from test_framework.wallet_util import bytes_to_wif

# Interval between 2 proof cleanups
AVALANCHE_CLEANUP_INTERVAL = 5 * 60
# Dangling proof timeout
AVALANCHE_DANGLING_PROOF_TIMEOUT = 15 * 60


class GetAvalancheInfoTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.conflicting_proof_cooldown = 100
        self.extra_args = [
            [
                f"-avalancheconflictingproofcooldown={self.conflicting_proof_cooldown}",
                "-avacooldown=0",
                "-avaminquorumstake=250000000",
                "-avaminquorumconnectedstakeratio=0.9",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminavaproofsnodecount=0",
            ]
        ]

    def run_test(self):
        node = self.nodes[0]

        privkey, proof = gen_proof(self, node, expiry=2000000000)

        def assert_avalancheinfo(expected):
            assert_equal(node.getavalancheinfo(), expected)

        coinbase_amount = Decimal("25000000.00")

        self.log.info("The test node has no proof")

        assert_avalancheinfo(
            {
                "ready_to_poll": False,
                "network": {
                    "proof_count": 0,
                    "connected_proof_count": 0,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 0,
                    "total_stake_amount": Decimal("0.00"),
                    "connected_stake_amount": Decimal("0.00"),
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": Decimal("0.00"),
                    "node_count": 0,
                    "connected_node_count": 0,
                    "pending_node_count": 0,
                },
            }
        )

        self.log.info("The test node has a proof")

        self.restart_node(
            0,
            self.extra_args[0]
            + [
                f"-avaproof={proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
                "-avaproofstakeutxoconfirmations=1",
            ],
        )

        assert_avalancheinfo(
            {
                "ready_to_poll": False,
                "local": {
                    "verified": False,
                    "verification_status": "pending inbound connections",
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": 0,
                    "connected_proof_count": 0,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 0,
                    "total_stake_amount": Decimal("0.00"),
                    "connected_stake_amount": Decimal("0.00"),
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": Decimal("0.00"),
                    "node_count": 0,
                    "connected_node_count": 0,
                    "pending_node_count": 0,
                },
            }
        )

        # Add an inbound so the node proof can be registered and advertised
        node.add_p2p_connection(P2PInterface())

        assert_avalancheinfo(
            {
                "ready_to_poll": False,
                "local": {
                    "verified": False,
                    "verification_status": "pending verification",
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": 0,
                    "connected_proof_count": 0,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 0,
                    "total_stake_amount": Decimal("0.00"),
                    "connected_stake_amount": Decimal("0.00"),
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": Decimal("0.00"),
                    "node_count": 0,
                    "connected_node_count": 0,
                    "pending_node_count": 0,
                },
            }
        )

        # Make sure receiving our own proof from the network before validating
        # the local proof doesn't change our proof count.
        sender = get_ava_p2p_interface_no_handshake(node)
        sender.send_avaproof(proof)

        # Make sure getting the proof via RPC doesn't change our proof count
        # either.
        node.sendavalancheproof(proof.serialize().hex())
        assert_avalancheinfo(
            {
                "ready_to_poll": False,
                "local": {
                    "verified": False,
                    "verification_status": "pending verification",
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": 0,
                    "connected_proof_count": 0,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 0,
                    "total_stake_amount": Decimal("0.00"),
                    "connected_stake_amount": Decimal("0.00"),
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": Decimal("0.00"),
                    "node_count": 0,
                    "connected_node_count": 0,
                    "pending_node_count": 0,
                },
            }
        )

        self.restart_node(
            0,
            self.extra_args[0]
            + [
                f"-avaproof={proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
                "-avaproofstakeutxoconfirmations=4",
            ],
        )

        assert_avalancheinfo(
            {
                "ready_to_poll": False,
                "local": {
                    "verified": False,
                    "verification_status": "pending inbound connections",
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": 0,
                    "connected_proof_count": 0,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 0,
                    "total_stake_amount": Decimal("0.00"),
                    "connected_stake_amount": Decimal("0.00"),
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": Decimal("0.00"),
                    "node_count": 0,
                    "connected_node_count": 0,
                    "pending_node_count": 0,
                },
            }
        )

        # Add an inbound so the node proof can be registered and advertised
        node.add_p2p_connection(P2PInterface())

        self.log.info("Mine a block to trigger proof validation, check it is immature")
        self.generate(node, 1, sync_fun=self.no_op)
        self.wait_until(
            lambda: node.getavalancheinfo()
            == {
                "ready_to_poll": False,
                "local": {
                    "verified": False,
                    "verification_status": "immature-proof",
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": 0,
                    "connected_proof_count": 0,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 1,
                    "total_stake_amount": Decimal("0.00"),
                    "connected_stake_amount": Decimal("0.00"),
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": coinbase_amount,
                    "node_count": 0,
                    "connected_node_count": 0,
                    "pending_node_count": 0,
                },
            }
        )

        self.log.info(
            "Mine another block to check the local proof immature state remains"
        )
        self.generate(node, 1, sync_fun=self.no_op)
        self.wait_until(
            lambda: node.getavalancheinfo()
            == {
                "ready_to_poll": False,
                "local": {
                    "verified": False,
                    "verification_status": "immature-proof",
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": 0,
                    "connected_proof_count": 0,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 1,
                    "total_stake_amount": Decimal("0.00"),
                    "connected_stake_amount": Decimal("0.00"),
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": coinbase_amount,
                    "node_count": 0,
                    "connected_node_count": 0,
                    "pending_node_count": 0,
                },
            }
        )

        self.log.info("Mine another block to mature the local proof")
        self.generate(node, 1, sync_fun=self.no_op)
        self.wait_until(
            lambda: node.getavalancheinfo()
            == {
                "ready_to_poll": False,
                "local": {
                    "verified": True,
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": 1,
                    "connected_proof_count": 1,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 0,
                    "total_stake_amount": coinbase_amount,
                    "connected_stake_amount": coinbase_amount,
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": Decimal("0.00"),
                    "node_count": 1,
                    "connected_node_count": 1,
                    "pending_node_count": 0,
                },
            }
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
            self.generate(node, 3, sync_fun=self.no_op)

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
            lambda: node.getavalancheinfo()
            == {
                "ready_to_poll": True,
                "local": {
                    "verified": True,
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": N + 1,
                    "connected_proof_count": N + 1,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": N,
                    "immature_proof_count": 1,
                    "total_stake_amount": coinbase_amount * (N + 1),
                    "connected_stake_amount": coinbase_amount * (N + 1),
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": coinbase_amount,
                    "node_count": N + 1,
                    "connected_node_count": N + 1,
                    "pending_node_count": 0,
                },
            }
        )

        self.log.info("Disconnect some nodes")

        D = 3
        for _ in range(D):
            n = node.p2ps.pop()
            n.peer_disconnect()
            n.wait_for_disconnect()

        self.wait_until(
            lambda: node.getavalancheinfo()
            == {
                "ready_to_poll": True,
                "local": {
                    "verified": True,
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": N + 1,
                    "connected_proof_count": N - D + 1,
                    "dangling_proof_count": D,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": N,
                    "immature_proof_count": 1,
                    "total_stake_amount": coinbase_amount * (N + 1),
                    "connected_stake_amount": coinbase_amount * (N + 1 - D),
                    "dangling_stake_amount": coinbase_amount * D,
                    "immature_stake_amount": coinbase_amount,
                    "node_count": N + 1 - D,
                    "connected_node_count": N + 1 - D,
                    "pending_node_count": 0,
                },
            }
        )

        self.log.info("Add some pending nodes")

        P = 3
        for _ in range(P):
            dg_priv = ECKey()
            dg_priv.generate()
            dg_pub = dg_priv.get_pubkey().get_bytes().hex()

            _privkey, _proof = gen_proof(self, node)

            # Make the proof mature
            self.generate(node, 1, sync_fun=self.no_op)

            delegation = node.delegateavalancheproof(
                uint256_hex(_proof.limited_proofid),
                bytes_to_wif(_privkey.get_bytes()),
                dg_pub,
                None,
            )

            # It would be much simpler to just use get_ava_p2p_interface here
            # but the node would be able to download the proof, so the node
            # won't be pending.
            n = get_ava_p2p_interface_no_handshake(node)
            n.send_avahello(delegation, dg_priv)
            # Make sure we completed at least one time the ProcessMessage or we
            # might miss the last pending node for the following assert
            n.sync_with_ping()

        # Immature became mature
        proofs.append(immature_proof)

        assert_avalancheinfo(
            {
                "ready_to_poll": True,
                "local": {
                    "verified": True,
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": N + 2,
                    "connected_proof_count": N + 1 - D,
                    "dangling_proof_count": D + 1,
                    "finalized_proof_count": 0,
                    "conflicting_proof_count": N,
                    "immature_proof_count": 0,
                    "total_stake_amount": coinbase_amount * (N + 2),
                    "connected_stake_amount": coinbase_amount * (N + 1 - D),
                    "dangling_stake_amount": coinbase_amount * (D + 1),
                    "immature_stake_amount": Decimal("0.00"),
                    "node_count": N + 1 - D + P,
                    "connected_node_count": N + 1 - D,
                    "pending_node_count": P,
                },
            }
        )

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
        expected_logs = []
        for p in proofs:
            expected_logs.append(f"Avalanche finalized proof {uint256_hex(p.proofid)}")
        with node.assert_debug_log(expected_logs):
            self.wait_until(lambda: vote_for_all_proofs())

        self.log.info(
            "Disconnect all the nodes, so we are the only node left on the network"
        )

        node.disconnect_p2ps()

        self.wait_until(
            lambda: node.getavalancheinfo()
            == {
                "ready_to_poll": False,
                "local": {
                    "verified": True,
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": N + 2,
                    "connected_proof_count": 1,
                    "dangling_proof_count": N + 1,
                    "finalized_proof_count": N + 2,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 0,
                    "total_stake_amount": coinbase_amount * (N + 2),
                    "connected_stake_amount": coinbase_amount,
                    "dangling_stake_amount": coinbase_amount * (N + 1),
                    "immature_stake_amount": Decimal("0.00"),
                    "node_count": 1,
                    "connected_node_count": 1,
                    "pending_node_count": 0,
                },
            }
        )

        self.log.info("The count drops after the dangling proofs are cleaned up")

        node.setmocktime(mock_time + AVALANCHE_DANGLING_PROOF_TIMEOUT + 1)
        node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)

        self.wait_until(
            lambda: node.getavalancheinfo()
            == {
                "ready_to_poll": False,
                "local": {
                    "verified": True,
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": 1,
                    "connected_proof_count": 1,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": 1,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 0,
                    "total_stake_amount": coinbase_amount,
                    "connected_stake_amount": coinbase_amount,
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": Decimal("0.00"),
                    "node_count": 1,
                    "connected_node_count": 1,
                    "pending_node_count": 0,
                },
            }
        )

        self.log.info("Reconnect the nodes and check the counts update appropriately")

        for q in quorum:
            # We don't reuse the quorum nodes directly as we need a clean state
            # to make sure the messages are sent as expected.
            n = AvaP2PInterface()
            n.proof = q.proof
            n.master_privkey = q.master_privkey

            node.add_p2p_connection(n)
            n.send_avaproof(n.proof)
            wait_for_proof(node, uint256_hex(n.proof.proofid))

        assert_avalancheinfo(
            {
                "ready_to_poll": True,
                "local": {
                    "verified": True,
                    "proofid": uint256_hex(proof.proofid),
                    "limited_proofid": uint256_hex(proof.limited_proofid),
                    "master": privkey.get_pubkey().get_bytes().hex(),
                    "stake_amount": coinbase_amount,
                    "payout_address": ADDRESS_ECREG_UNSPENDABLE,
                },
                "network": {
                    "proof_count": N + 1,
                    "connected_proof_count": N + 1,
                    "dangling_proof_count": 0,
                    "finalized_proof_count": N + 1,
                    "conflicting_proof_count": 0,
                    "immature_proof_count": 0,
                    "total_stake_amount": coinbase_amount * (N + 1),
                    "connected_stake_amount": coinbase_amount * (N + 1),
                    "dangling_stake_amount": Decimal("0.00"),
                    "immature_stake_amount": Decimal("0.00"),
                    "node_count": N + 1,
                    "connected_node_count": N + 1,
                    "pending_node_count": 0,
                },
            }
        )

        self.log.info(
            "Expire the local proof and check the verification status is now invalid"
        )

        node.setmocktime(proof.expiration + 1)
        # Expiry is based on MTP, so we have to generate 6 blocks
        self.generate(node, 6, sync_fun=self.no_op)
        # Check the proof status is what we expect
        assert_raises_rpc_error(
            -8,
            "expired-proof",
            node.verifyavalancheproof,
            proof.serialize().hex(),
        )

        # We ignore the network status as cleanup might happen due to the big
        # mocked time jump.
        def local_status_invalid():
            local_info = node.getavalancheinfo()["local"]
            return (
                local_info["verified"] is False
                and local_info["verification_status"] == "invalid-proof"
            )

        self.wait_until(local_status_invalid)


if __name__ == "__main__":
    GetAvalancheInfoTest().main()
