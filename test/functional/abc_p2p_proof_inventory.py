# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test proof inventory relaying
"""

import time

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import (
    AvaP2PInterface,
    avalanche_proof_from_hex,
    gen_proof,
    get_proof_ids,
    wait_for_proof,
)
from test_framework.messages import (
    MSG_AVA_PROOF,
    MSG_TYPE_MASK,
    CInv,
    msg_avaproof,
    msg_getdata,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_raises_rpc_error,
    uint256_hex,
)
from test_framework.wallet_util import bytes_to_wif

# Broadcast reattempt occurs every 10 to 15 minutes
MAX_INITIAL_BROADCAST_DELAY = 15 * 60
# Delay to allow the node to respond to getdata requests
UNCONDITIONAL_RELAY_DELAY = 2 * 60


class ProofInvStoreP2PInterface(P2PInterface):
    def __init__(self):
        super().__init__()
        self.proof_invs_counter = 0
        self.last_proofid = None

    def on_inv(self, message):
        for i in message.inv:
            if i.type & MSG_TYPE_MASK == MSG_AVA_PROOF:
                self.proof_invs_counter += 1
                self.last_proofid = i.hash


class ProofInventoryTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 5
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=2",
                "-avacooldown=0",
                "-whitelist=noban@127.0.0.1",
                "-persistavapeers=0",
            ]
        ] * self.num_nodes

    def generate_proof(self, node, mature=True):
        privkey, proof = gen_proof(self, node)

        if mature:
            self.generate(node, 1, sync_fun=self.no_op)

        return privkey, proof

    def test_send_proof_inv(self):
        self.log.info("Test sending a proof to our peers")

        node = self.nodes[0]

        for _ in range(10):
            node.add_p2p_connection(ProofInvStoreP2PInterface())

        _, proof = self.generate_proof(node)
        assert node.sendavalancheproof(proof.serialize().hex())

        def proof_inv_found(peer):
            with p2p_lock:
                return peer.last_proofid == proof.proofid

        self.wait_until(lambda: all(proof_inv_found(i) for i in node.p2ps))

        self.log.info("Test that we don't send the same inv several times")

        extra_peer = ProofInvStoreP2PInterface()
        node.add_p2p_connection(extra_peer)

        # Send the same proof one more time
        node.sendavalancheproof(proof.serialize().hex())

        # Our new extra peer should receive it but not the others
        self.wait_until(lambda: proof_inv_found(extra_peer))
        assert all(p.proof_invs_counter == 1 for p in node.p2ps)

        # Send the proof again and force the send loop to be processed
        for peer in node.p2ps:
            node.sendavalancheproof(proof.serialize().hex())
            peer.sync_with_ping()

        assert all(p.proof_invs_counter == 1 for p in node.p2ps)

    def test_receive_proof(self):
        self.log.info("Test a peer is created on proof reception")

        node = self.nodes[0]
        _, proof = self.generate_proof(node)

        peer = node.add_p2p_connection(P2PInterface())

        msg = msg_avaproof()
        msg.proof = proof
        peer.send_message(msg)

        self.wait_until(lambda: proof.proofid in get_proof_ids(node))

        self.log.info("Test receiving a proof with an immature utxo")

        _, immature = self.generate_proof(node, mature=False)
        immature_proofid = uint256_hex(immature.proofid)

        msg = msg_avaproof()
        msg.proof = immature
        peer.send_message(msg)

        wait_for_proof(node, immature_proofid, expect_status="immature")

    def test_ban_invalid_proof(self):
        node = self.nodes[0]
        _, bad_proof = self.generate_proof(node)
        bad_proof.stakes = []

        privkey = node.get_deterministic_priv_key().key
        missing_stake = node.buildavalancheproof(
            1,
            0,
            privkey,
            [
                {
                    "txid": "0" * 64,
                    "vout": 0,
                    "amount": 10000000,
                    "height": 42,
                    "iscoinbase": False,
                    "privatekey": privkey,
                }
            ],
        )

        self.restart_node(0, ["-avaproofstakeutxodustthreshold=1000000"])

        peer = node.add_p2p_connection(P2PInterface())
        msg = msg_avaproof()

        # Sending a proof with a missing utxo doesn't trigger a ban
        msg.proof = avalanche_proof_from_hex(missing_stake)
        with node.assert_debug_log(["received: avaproof"], ["Misbehaving"]):
            peer.send_message(msg)
            peer.sync_with_ping()

        msg.proof = bad_proof
        with node.assert_debug_log(
            [
                "Misbehaving",
                "invalid-proof",
            ]
        ):
            peer.send_message(msg)
            peer.wait_for_disconnect()

    def test_proof_relay(self):
        # This test makes no sense with less than 2 nodes !
        assert_greater_than(self.num_nodes, 2)

        proofs_keys = [self.generate_proof(self.nodes[0]) for _ in self.nodes]
        proofids = {proof_key[1].proofid for proof_key in proofs_keys}
        # generate_proof does not sync, so do it manually
        self.sync_blocks()

        def restart_nodes_with_proof(nodes, extra_args=None):
            for node in nodes:
                privkey, proof = proofs_keys[node.index]
                self.restart_node(
                    node.index,
                    self.extra_args[node.index]
                    + [
                        f"-avaproof={proof.serialize().hex()}",
                        f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
                    ]
                    + (extra_args or []),
                )

        restart_nodes_with_proof(self.nodes[:-1])

        chainwork = int(self.nodes[-1].getblockchaininfo()["chainwork"], 16)
        restart_nodes_with_proof(
            self.nodes[-1:], extra_args=[f"-minimumchainwork={chainwork + 100:#x}"]
        )

        # Add an inbound so the node proof can be registered and advertised
        [node.add_p2p_connection(P2PInterface()) for node in self.nodes]

        [
            [self.connect_nodes(node.index, j) for j in range(node.index)]
            for node in self.nodes
        ]

        # Connect a block to make the proofs added to our pool
        self.generate(
            self.nodes[0], 1, sync_fun=lambda: self.sync_blocks(self.nodes[:-1])
        )
        # Generate a different block on the IBD node, as it will not sync the low
        # work block while in IBD and it also needs a block to trigger its own proof
        # registration
        self.generate(self.nodes[-1], 1, sync_fun=self.no_op)

        self.log.info("Nodes should eventually get the proof from their peer")
        self.sync_proofs(self.nodes[:-1])
        for node in self.nodes[:-1]:
            assert_equal(set(get_proof_ids(node)), proofids)

        assert self.nodes[-1].getblockchaininfo()["initialblockdownload"]
        self.log.info("Except the node that has not completed IBD")
        assert_equal(len(get_proof_ids(self.nodes[-1])), 1)

        # The same if we send a proof directly with no download request
        peer = AvaP2PInterface()
        self.nodes[-1].add_p2p_connection(peer)

        _, proof = self.generate_proof(self.nodes[0])
        peer.send_avaproof(proof)
        peer.sync_with_ping()
        with p2p_lock:
            assert_equal(peer.message_count.get("getdata", 0), 0)

        # Leave the nodes in good shape for the next tests
        restart_nodes_with_proof(self.nodes)
        [
            [self.connect_nodes(node.index, j) for j in range(node.index)]
            for node in self.nodes
        ]

    def test_manually_sent_proof(self):
        node0 = self.nodes[0]

        _, proof = self.generate_proof(node0)

        self.log.info("Send a proof via RPC and check all the nodes download it")
        node0.sendavalancheproof(proof.serialize().hex())
        self.sync_proofs()

    def test_unbroadcast(self):
        self.log.info("Test broadcasting proofs")

        node = self.nodes[0]

        # Disconnect the other nodes/peers, or they will request the proof and
        # invalidate the test
        [n.stop_node() for n in self.nodes[1:]]
        node.disconnect_p2ps()

        def add_peers(count):
            peers = []
            for i in range(count):
                peer = node.add_p2p_connection(ProofInvStoreP2PInterface())
                peer.wait_for_verack()
                peers.append(peer)
            return peers

        _, proof = self.generate_proof(node)
        proofid_hex = uint256_hex(proof.proofid)

        # Broadcast the proof
        peers = add_peers(3)
        assert node.sendavalancheproof(proof.serialize().hex())
        wait_for_proof(node, proofid_hex)

        def proof_inv_received(peers):
            with p2p_lock:
                return all(
                    p.last_message.get("inv")
                    and p.last_message["inv"].inv[-1].hash == proof.proofid
                    for p in peers
                )

        self.wait_until(lambda: proof_inv_received(peers))

        # If no peer request the proof for download, the node should reattempt
        # broadcasting to all new peers after 10 to 15 minutes.
        peers = add_peers(3)
        node.mockscheduler(MAX_INITIAL_BROADCAST_DELAY + 1)
        peers[-1].sync_with_ping()
        self.wait_until(lambda: proof_inv_received(peers))

        # If at least one peer requests the proof, there is no more attempt to
        # broadcast it
        node.setmocktime(int(time.time()) + UNCONDITIONAL_RELAY_DELAY)
        msg = msg_getdata([CInv(t=MSG_AVA_PROOF, h=proof.proofid)])
        peers[-1].send_message(msg)

        # Give enough time for the node to broadcast the proof again
        peers = add_peers(3)
        node.mockscheduler(MAX_INITIAL_BROADCAST_DELAY + 1)
        peers[-1].sync_with_ping()

        assert not proof_inv_received(peers)

        self.log.info("Proofs that become invalid should no longer be broadcasted")

        # Restart and add connect a new set of peers
        self.restart_node(0)

        # Broadcast the proof
        peers = add_peers(3)
        assert node.sendavalancheproof(proof.serialize().hex())
        self.wait_until(lambda: proof_inv_received(peers))

        # Sanity check our node knows the proof, and it is valid
        wait_for_proof(node, proofid_hex)

        # Mature the utxo then spend it
        self.generate(node, 100, sync_fun=self.no_op)
        utxo = proof.stakes[0].stake.utxo
        raw_tx = node.createrawtransaction(
            inputs=[
                {
                    # coinbase
                    "txid": uint256_hex(utxo.txid),
                    "vout": utxo.n,
                }
            ],
            outputs={ADDRESS_ECREG_UNSPENDABLE: 25_000_000 - 250.00},
        )
        signed_tx = node.signrawtransactionwithkey(
            hexstring=raw_tx,
            privkeys=[node.get_deterministic_priv_key().key],
        )
        node.sendrawtransaction(signed_tx["hex"])

        # Mine the tx in a block
        self.generate(node, 1, sync_fun=self.no_op)

        # Wait for the proof to be invalidated
        def check_proof_not_found(proofid):
            try:
                assert_raises_rpc_error(
                    -8, "Proof not found", node.getrawavalancheproof, proofid
                )
                return True
            except BaseException:
                return False

        self.wait_until(lambda: check_proof_not_found(proofid_hex))

        # It should no longer be broadcasted
        peers = add_peers(3)
        node.mockscheduler(MAX_INITIAL_BROADCAST_DELAY + 1)
        peers[-1].sync_with_ping()

        assert not proof_inv_received(peers)

    def run_test(self):
        self.test_send_proof_inv()
        self.test_receive_proof()
        self.test_proof_relay()
        self.test_manually_sent_proof()

        # Run these tests last because they need to disconnect the nodes
        self.test_unbroadcast()
        self.test_ban_invalid_proof()


if __name__ == "__main__":
    ProofInventoryTest().main()
