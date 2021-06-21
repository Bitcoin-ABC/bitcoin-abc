#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test proof inventory relaying
"""

from test_framework.avatools import (
    create_coinbase_stakes,
    get_proof_ids,
    wait_for_proof,
)
from test_framework.address import ADDRESS_BCHREG_UNSPENDABLE
from test_framework.key import ECKey, bytes_to_wif
from test_framework.messages import (
    AvalancheProof,
    CInv,
    FromHex,
    MSG_AVA_PROOF,
    MSG_TYPE_MASK,
    msg_avaproof,
    msg_getdata,
)
from test_framework.p2p import (
    P2PInterface,
    p2p_lock,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    connect_nodes,
    wait_until,
)

import time

# Broadcast reattempt occurs every 10 to 15 minutes
MAX_INITIAL_BROADCAST_DELAY = 15 * 60
# Delay to allow the node to respond to getdata requests
UNCONDITIONAL_RELAY_DELAY = 2 * 60


class ProofInvStoreP2PInterface(P2PInterface):
    def __init__(self):
        super().__init__()
        self.proof_invs_counter = 0

    def on_inv(self, message):
        for i in message.inv:
            if i.type & MSG_TYPE_MASK == MSG_AVA_PROOF:
                self.proof_invs_counter += 1


class ProofInventoryTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 5
        self.extra_args = [['-enableavalanche=1',
                            '-avacooldown=0']] * self.num_nodes

    def gen_proof(self, node):
        blockhashes = node.generate(10)

        privkey = ECKey()
        privkey.generate()
        pubkey = privkey.get_pubkey()

        stakes = create_coinbase_stakes(
            node, blockhashes, node.get_deterministic_priv_key().key)
        proof_hex = node.buildavalancheproof(
            42, 2000000000, pubkey.get_bytes().hex(), stakes)

        return bytes_to_wif(privkey.get_bytes()), FromHex(
            AvalancheProof(), proof_hex)

    def test_send_proof_inv(self):
        self.log.info("Test sending a proof to our peers")

        node = self.nodes[0]

        for i in range(10):
            node.add_p2p_connection(ProofInvStoreP2PInterface())

        _, proof = self.gen_proof(node)
        assert node.sendavalancheproof(proof.serialize().hex())

        def proof_inv_found(peer):
            with p2p_lock:
                return peer.last_message.get(
                    "inv") and peer.last_message["inv"].inv[-1].hash == proof.proofid

        wait_until(lambda: all(proof_inv_found(i) for i in node.p2ps))

        self.log.info("Test that we don't send the same inv several times")

        extra_peer = ProofInvStoreP2PInterface()
        node.add_p2p_connection(extra_peer)

        # Send the same proof one more time
        node.sendavalancheproof(proof.serialize().hex())

        # Our new extra peer should receive it but not the others
        wait_until(lambda: proof_inv_found(extra_peer))
        assert all(p.proof_invs_counter == 1 for p in node.p2ps)

        # Send the proof again and force the send loop to be processed
        for peer in node.p2ps:
            node.sendavalancheproof(proof.serialize().hex())
            peer.sync_with_ping()

        assert all(p.proof_invs_counter == 1 for p in node.p2ps)

    def test_receive_proof(self):
        self.log.info("Test a peer is created on proof reception")

        node = self.nodes[0]
        _, proof = self.gen_proof(node)

        peer = node.add_p2p_connection(P2PInterface())

        msg = msg_avaproof()
        msg.proof = proof
        peer.send_message(msg)

        wait_until(lambda: proof.proofid in get_proof_ids(node))

        self.log.info("Test receiving a proof with missing utxo is orphaned")

        privkey = ECKey()
        privkey.generate()
        orphan_hex = node.buildavalancheproof(
            42, 2000000000, privkey.get_pubkey().get_bytes().hex(), [{
                'txid': '0' * 64,
                'vout': 0,
                'amount': 10e6,
                'height': 42,
                'iscoinbase': False,
                'privatekey': bytes_to_wif(privkey.get_bytes()),
            }]
        )

        orphan = FromHex(AvalancheProof(), orphan_hex)
        orphan_proofid = "{:064x}".format(orphan.proofid)

        msg = msg_avaproof()
        msg.proof = orphan
        peer.send_message(msg)

        wait_for_proof(node, orphan_proofid, expect_orphan=True)

    def test_ban_invalid_proof(self):
        node = self.nodes[0]
        _, bad_proof = self.gen_proof(node)
        bad_proof.stakes = []

        peer = node.add_p2p_connection(P2PInterface())

        msg = msg_avaproof()
        msg.proof = bad_proof
        with node.assert_debug_log([
            'Misbehaving',
            'invalid-avaproof',
        ]):
            peer.send_message(msg)
            peer.wait_for_disconnect()

    def test_proof_relay(self):
        # This test makes no sense with a single node !
        assert_greater_than(self.num_nodes, 1)

        def restart_nodes_with_proof(nodes=self.nodes):
            proofids = set()
            for i, node in enumerate(nodes):
                privkey, proof = self.gen_proof(node)
                proofids.add(proof.proofid)

                self.restart_node(node.index, self.extra_args[node.index] + [
                    "-avaproof={}".format(proof.serialize().hex()),
                    "-avamasterkey={}".format(privkey)
                ])

                # Connect a block to make the proof be added to our pool
                node.generate(1)
                wait_until(lambda: proof.proofid in get_proof_ids(node))

                [connect_nodes(node, n) for n in nodes[:i]]

            return proofids

        proofids = restart_nodes_with_proof(self.nodes)

        self.log.info("Nodes should eventually get the proof from their peer")
        self.sync_proofs()
        for node in self.nodes:
            assert_equal(set(get_proof_ids(node)), proofids)

    def test_unbroadcast(self):
        self.log.info("Test broadcasting proofs")

        node = self.nodes[0]

        def add_peers(count):
            peers = []
            for i in range(count):
                peer = node.add_p2p_connection(ProofInvStoreP2PInterface())
                peer.wait_for_verack()
                peers.append(peer)
            return peers

        _, proof = self.gen_proof(node)
        proofid_hex = "{:064x}".format(proof.proofid)

        # Broadcast the proof
        peers = add_peers(3)
        assert node.sendavalancheproof(proof.serialize().hex())
        wait_for_proof(node, proofid_hex)

        def proof_inv_received(peers):
            with p2p_lock:
                return all(p.last_message.get(
                    "inv") and p.last_message["inv"].inv[-1].hash == proof.proofid for p in peers)

        wait_until(lambda: proof_inv_received(peers))

        # If no peer request the proof for download, the node should reattempt
        # broadcasting to all new peers after 10 to 15 minutes.
        peers = add_peers(3)
        node.mockscheduler(MAX_INITIAL_BROADCAST_DELAY + 1)
        peers[-1].sync_with_ping()
        wait_until(lambda: proof_inv_received(peers))

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

        self.log.info(
            "Proofs that become invalid should no longer be broadcasted")

        # Restart and add connect a new set of peers
        self.restart_node(0)

        # Broadcast the proof
        peers = add_peers(3)
        assert node.sendavalancheproof(proof.serialize().hex())
        wait_until(lambda: proof_inv_received(peers))

        # Sanity check our node knows the proof, and it is valid
        wait_for_proof(node, proofid_hex, expect_orphan=False)

        # Mature the utxo then spend it
        node.generate(100)
        utxo = proof.stakes[0].stake.utxo
        raw_tx = node.createrawtransaction(
            inputs=[{
                # coinbase
                "txid": "{:064x}".format(utxo.hash),
                "vout": utxo.n
            }],
            outputs={ADDRESS_BCHREG_UNSPENDABLE: 25_000_000 - 250.00},
        )
        signed_tx = self.nodes[0].signrawtransactionwithkey(
            hexstring=raw_tx,
            privkeys=[node.get_deterministic_priv_key().key],
        )
        node.sendrawtransaction(signed_tx['hex'])

        # Mine the tx in a block
        node.generate(1)

        # Wait for the proof to be orphaned
        wait_until(lambda: node.getrawavalancheproof(
            proofid_hex)["orphan"] is True)

        # It should no longer be broadcasted
        peers = add_peers(3)
        node.mockscheduler(MAX_INITIAL_BROADCAST_DELAY + 1)
        peers[-1].sync_with_ping()

        assert not proof_inv_received(peers)

    def run_test(self):
        self.test_send_proof_inv()
        self.test_receive_proof()
        self.test_ban_invalid_proof()
        self.test_proof_relay()
        self.test_unbroadcast()


if __name__ == '__main__':
    ProofInventoryTest().main()
