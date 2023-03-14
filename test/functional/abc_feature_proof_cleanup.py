# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test the dangling proofs cleanup
"""

import time

from test_framework.avatools import (
    gen_proof,
    get_ava_p2p_interface,
    get_ava_p2p_interface_no_handshake,
    get_proof_ids,
    wait_for_proof,
)
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error, uint256_hex
from test_framework.wallet_util import bytes_to_wif

# Interval between 2 proof cleanups
AVALANCHE_CLEANUP_INTERVAL = 5 * 60
# Dangling proof timeout
AVALANCHE_DANGLING_PROOF_TIMEOUT = 15 * 60


class ProofsCleanupTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
            ]
        ] * self.num_nodes

    def run_test(self):
        node = self.nodes[0]

        master_key, local_proof = gen_proof(self, node)

        self.restart_node(
            0,
            self.extra_args[0]
            + [
                f"-avaproof={local_proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(master_key.get_bytes())}",
            ],
        )
        # Add an inbound so the node proof can be registered and advertised
        node.add_p2p_connection(P2PInterface())

        self.generate(node, 1, sync_fun=self.no_op)
        wait_for_proof(node, uint256_hex(local_proof.proofid))

        mocktime = int(time.time())
        node.setmocktime(mocktime)

        proofs = [local_proof]
        keys = [master_key]
        peers = []
        # The first 5 peers have a node attached
        for _ in range(5):
            peer = get_ava_p2p_interface(self, node)
            proofs.append(peer.proof)
            keys.append(peer.master_privkey)
            peers.append(peer)

        # The last 5 peers have no node attached
        for _ in range(5):
            _, proof = gen_proof(self, node)
            node.sendavalancheproof(proof.serialize().hex())
            proofs.append(proof)

        peer_info = node.getavalanchepeerinfo()
        assert_equal(len(peer_info), 11)
        assert_equal(set(get_proof_ids(node)), {proof.proofid for proof in proofs})

        self.log.info("No proof is cleaned before the timeout expires")

        mocktime += AVALANCHE_DANGLING_PROOF_TIMEOUT - 1
        node.setmocktime(mocktime)
        # Run the cleanup, the proofs are still there
        node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)
        assert_equal(len(peer_info), 11)

        self.log.info("Check the proofs with attached nodes are not cleaned")

        # Run the cleanup, the proofs with no node are cleaned excepted our
        # local proof
        with node.assert_debug_log(
            [
                "Proof dangling for too long (no connected node):"
                f" {uint256_hex(p.proofid)}"
                for p in proofs[6:]
            ]
        ):
            # Expire the dangling proof timeout
            mocktime += 1
            node.setmocktime(mocktime)

            node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)
            self.wait_until(
                lambda: set(get_proof_ids(node))
                == {proof.proofid for proof in proofs[:6]},
                timeout=5,
            )

        self.log.info(
            "Check the proofs are cleaned on next cleanup after the nodes disconnected"
        )

        for peer in peers:
            peer.peer_disconnect()
            peer.wait_for_disconnect()

        node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)
        self.wait_until(lambda: get_proof_ids(node) == [local_proof.proofid])

        self.log.info("Check the cleaned up proofs are no longer accepted...")

        sender = get_ava_p2p_interface_no_handshake(node)
        for proof in proofs[1:]:
            sender.send_avaproof(proof)
            assert_raises_rpc_error(
                -8, "dangling-proof", node.sendavalancheproof, proof.serialize().hex()
            )

        assert_equal(get_proof_ids(node), [local_proof.proofid])

        self.log.info("...until there is a node to attach")

        node.disconnect_p2ps()
        assert_equal(len(node.p2ps), 0)

        avanode = get_ava_p2p_interface(self, node)
        avanode.wait_until(
            lambda: avanode.last_message.get("getdata")
            and avanode.last_message["getdata"].inv[-1].hash == avanode.proof.proofid
        )

        avanode.send_avaproof(avanode.proof)
        self.wait_until(lambda: avanode.proof.proofid in get_proof_ids(node))


if __name__ == "__main__":
    ProofsCleanupTest().main()
