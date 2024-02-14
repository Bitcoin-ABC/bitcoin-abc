# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the avalanche remote proofs feature."""
import random
import time

from test_framework.avatools import (
    AvaP2PInterface,
    build_msg_avaproofs,
    can_find_inv_in_poll,
    gen_proof,
    get_ava_p2p_interface,
    wait_for_proof,
)
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalanchePrefilledProof,
    AvalancheProofVoteResponse,
    calculate_shortid,
)
from test_framework.p2p import p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex
from test_framework.wallet_util import bytes_to_wif

AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL = 5 * 60
AVALANCHE_DANGLING_PROOF_TIMEOUT = 15 * 60


class AvalancheRemoteProofsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=10000",
                "-avaproofstakeutxoconfirmations=1",
                "-avaminquorumstake=1000000",
                "-avaminavaproofsnodecount=0",
                "-avacooldown=0",
                "-whitelist=noban@127.0.0.1",
                "-persistavapeers=0",
            ]
        ] * self.num_nodes

    def run_test(self):
        self.disconnect_nodes(0, 1)
        node = self.nodes[0]

        now = int(time.time())
        node.setmocktime(now)

        inbound = get_ava_p2p_interface(self, node)

        outbound = node.add_outbound_p2p_connection(
            AvaP2PInterface(self, node),
            p2p_idx=1,
            connection_type="avalanche",
            services=NODE_NETWORK | NODE_AVALANCHE,
        )

        assert_equal(len(node.getpeerinfo()), 2)
        outbound.nodeid = node.getpeerinfo()[-1]["id"]

        self.log.info("Check we save the remote proofs for our avalanche peers")

        def remoteFromProof(proof, present=True):
            return {
                "proofid": uint256_hex(proof.proofid),
                "present": present,
                "last_update": now,
            }

        def check_remote_proofs(_node, nodeid, remote_proofs):
            lhs = sorted(_node.getremoteproofs(nodeid), key=lambda p: p["proofid"])
            rhs = sorted(remote_proofs, key=lambda p: p["proofid"])
            return lhs, rhs

        def assert_remote_proofs(nodeid, remote_proofs):
            lhs, rhs = check_remote_proofs(node, nodeid, remote_proofs)
            assert_equal(lhs, rhs)

        assert_remote_proofs(inbound.nodeid, [remoteFromProof(inbound.proof)])
        assert_remote_proofs(outbound.nodeid, [remoteFromProof(outbound.proof)])

        proofs = []
        for _ in range(10):
            _, proof = gen_proof(self, node)
            proofs.append(proof)

            inbound.send_avaproof(proof)
            outbound.send_avaproof(proof)

        inbound.sync_with_ping()
        outbound.sync_with_ping()

        assert_remote_proofs(
            inbound.nodeid,
            [remoteFromProof(proof) for proof in [inbound.proof] + proofs],
        )
        assert_remote_proofs(
            outbound.nodeid,
            [remoteFromProof(proof) for proof in [outbound.proof] + proofs],
        )

        self.log.info("Upon disconnect the remote proofs empty")

        outbound.peer_disconnect()
        outbound.wait_for_disconnect()
        self.wait_until(lambda: check_remote_proofs(node, outbound.nodeid, [])[0] == [])

        self.log.info("Check the compact proofs update the remote proofs status")

        # Clear all proofs from the node
        self.restart_node(0)

        now = int(time.time())
        node.setmocktime(now)

        outbound = node.add_outbound_p2p_connection(
            AvaP2PInterface(self, node),
            p2p_idx=2,
            connection_type="avalanche",
            services=NODE_NETWORK | NODE_AVALANCHE,
        )
        outbound.nodeid = node.getpeerinfo()[-1]["id"]
        assert_remote_proofs(outbound.nodeid, [remoteFromProof(outbound.proof)])

        now += 1
        node.setmocktime(now)

        def trigger_avaproofs(msg):
            node.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)

            outbound.wait_until(lambda: outbound.last_message.get("getavaproofs"))
            with p2p_lock:
                outbound.last_message = {}
            outbound.send_and_ping(msg)

        def build_compactproofs_msg(prefilled_proof, proofs_to_announce):
            key0 = random.randint(0, 2**64 - 1)
            key1 = random.randint(0, 2**64 - 1)

            shortid_map = {}
            for proofid in [proof.proofid for proof in proofs_to_announce]:
                shortid_map[proofid] = calculate_shortid(key0, key1, proofid)
            index_prefilled_proof = list(shortid_map.keys()).index(
                prefilled_proof.proofid
            )

            return build_msg_avaproofs(
                proofs_to_announce,
                prefilled_proofs=[
                    AvalanchePrefilledProof(index_prefilled_proof, prefilled_proof)
                ],
                key_pair=[key0, key1],
            )

        # Build a compact proofs message, including a prefilled proof that node
        # doesn't know yet.
        _, prefilled_proof = gen_proof(self, node)
        compactproofs_msg = build_compactproofs_msg(
            prefilled_proof, [outbound.proof] + [prefilled_proof] + proofs
        )
        trigger_avaproofs(compactproofs_msg)

        # We expect the prefilled proof to be added as present, the outbound
        # proof to remain present, and the proofs to not be added (because the
        # node doesn't know about them and needs to request them)
        assert_remote_proofs(
            outbound.nodeid,
            [remoteFromProof(proof) for proof in [outbound.proof] + [prefilled_proof]],
        )

        # Add the proofs to the node
        for proof in proofs:
            node.sendavalancheproof(proof.serialize().hex())
            assert uint256_hex(proof.proofid) in node.getavalancheproofs()["valid"]

        trigger_avaproofs(compactproofs_msg)

        # Now the proofs should be all present
        assert_remote_proofs(
            outbound.nodeid,
            [
                remoteFromProof(proof)
                for proof in [outbound.proof] + [prefilled_proof] + proofs
            ],
        )

        # Stop sending some proofs and check they are marked as absent
        now += 1
        node.setmocktime(now)

        compactproofs_msg = build_compactproofs_msg(
            prefilled_proof, [outbound.proof] + [prefilled_proof]
        )
        trigger_avaproofs(compactproofs_msg)

        # Now only the peer proof and the prefilled one are present
        assert_remote_proofs(
            outbound.nodeid,
            [
                remoteFromProof(proof, present=(proof not in proofs))
                for proof in [outbound.proof] + [prefilled_proof] + proofs
            ],
        )

        # Add back half the proofs
        proofs_present = proofs[:5]
        proofs_absent = proofs[5:]

        now += 1
        node.setmocktime(now)

        compactproofs_msg = build_compactproofs_msg(
            prefilled_proof, [outbound.proof] + [prefilled_proof] + proofs_present
        )
        trigger_avaproofs(compactproofs_msg)

        assert_remote_proofs(
            outbound.nodeid,
            [
                remoteFromProof(proof, present=(proof not in proofs_absent))
                for proof in [outbound.proof] + [prefilled_proof] + proofs
            ],
        )

        node0_privkey, node0_proof = gen_proof(self, node)

        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [
                f"-avamasterkey={bytes_to_wif(node0_privkey.get_bytes())}",
                f"-avaproof={node0_proof.serialize().hex()}",
            ],
        )

        quorum = [get_ava_p2p_interface(self, node) for _ in range(10)]
        proofs = [node0_proof] + [peer.proof for peer in quorum]

        self.wait_until(lambda: node.getavalancheinfo()["ready_to_poll"] is True)

        def wait_for_finalized_proof(_node, _quorum, proofid, **kwargs):
            def finalize_proof(proofid):
                can_find_inv_in_poll(
                    _quorum, proofid, response=AvalancheProofVoteResponse.ACTIVE
                )
                return _node.getrawavalancheproof(uint256_hex(proofid)).get(
                    "finalized", False
                )

            self.wait_until(lambda: finalize_proof(proofid), **kwargs)

        for proof in proofs:
            wait_for_finalized_proof(node, quorum, proof.proofid)

        node1 = self.nodes[1]

        self.connect_nodes(1, 0)
        self.sync_blocks()

        [node1.sendavalancheproof(proof.serialize().hex()) for proof in proofs]
        assert all(
            node1.verifyavalancheproof(proof.serialize().hex()) for proof in proofs
        )

        node1.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)

        def wait_for_remote_proofs(remote_proofs, nodeid=1, **kwargs):
            def expected_remote_proofs():
                lhs, rhs = check_remote_proofs(node1, nodeid, remote_proofs)
                # We don't care about update time
                lhs = [{k: v for k, v in d.items() if k != "last_update"} for d in lhs]
                rhs = [{k: v for k, v in d.items() if k != "last_update"} for d in rhs]
                return lhs == rhs

            self.wait_until(expected_remote_proofs, **kwargs)

        wait_for_remote_proofs([remoteFromProof(proof) for proof in proofs])

        # Disconnect some nodes and check the remote status updates
        for peer in quorum[:5]:
            peer.peer_disconnect()
            peer.wait_for_disconnect()
        assert_equal(len(node.getpeerinfo()), 6)

        proofs_absent = [peer.proof for peer in quorum[:5]]

        node1.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)

        wait_for_remote_proofs(
            [
                remoteFromProof(proof, present=(proof not in proofs_absent))
                for proof in proofs
            ],
        )

        self.log.info(
            "Check the finalization status is sticky when pulling back a previously dangling proof"
        )

        self.restart_node(1, extra_args=self.extra_args[1])

        node1_quorum = [get_ava_p2p_interface(self, node1) for _ in range(10)]
        node1_proofs = [peer.proof for peer in node1_quorum]

        self.wait_until(lambda: node1.getavalancheinfo()["ready_to_poll"] is True)

        # The sending node is not a staker, so it is not acconted for the remote
        # proofs status.
        sending_node = AvaP2PInterface()
        node1.add_p2p_connection(sending_node)
        for proof in proofs:
            sending_node.send_avaproof(proof)
            wait_for_proof(node1, uint256_hex(proof.proofid))
            wait_for_finalized_proof(node1, node1_quorum, proof.proofid)

        def check_count(proof_count, dangling_proof_count, finalized_proof_count):
            info = node1.getavalancheinfo()["network"]
            return (
                info["proof_count"] == proof_count
                and info["dangling_proof_count"] == dangling_proof_count
                and info["finalized_proof_count"] == finalized_proof_count
            )

        # At this stage all proofs are finalized, and the 11 from node 0 are
        # dangling
        assert check_count(
            proof_count=21, dangling_proof_count=11, finalized_proof_count=21
        )

        now = int(time.time()) + AVALANCHE_DANGLING_PROOF_TIMEOUT
        node1.setmocktime(now)
        node1.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)

        # The dangling proofs are cleaned up
        self.wait_until(
            lambda: check_count(
                proof_count=10, dangling_proof_count=0, finalized_proof_count=10
            )
        )

        self.connect_nodes(1, 0)
        self.sync_blocks()

        nodeid = node1.getpeerinfo()[-1]["id"]
        proofs_present = [node0_proof] + [peer.proof for peer in quorum[5:]]

        wait_for_remote_proofs(
            [
                remoteFromProof(proof, present=(proof in proofs_present))
                for proof in proofs_present + node1_proofs
            ],
            nodeid=nodeid,
        )

        # One more dangling proof processing and we will reconsider the 6 proofs
        # (5 from quorum + node 0 proof) from our peer thanks to remote proofs.
        # We also make sure the proofs remain finalized!
        node1.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)
        self.wait_until(
            lambda: check_count(
                proof_count=16, dangling_proof_count=5, finalized_proof_count=16
            )
        )


if __name__ == "__main__":
    AvalancheRemoteProofsTest().main()
