#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test proof inventory relaying
"""

from test_framework.avatools import (
    create_coinbase_stakes,
)
from test_framework.key import ECKey, bytes_to_wif
from test_framework.messages import (
    AvalancheProof,
    FromHex,
    MSG_AVA_PROOF,
    MSG_TYPE_MASK,
)
from test_framework.p2p import (
    P2PInterface,
    p2p_lock,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    wait_until,
)


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
        self.num_nodes = 1
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

    def run_test(self):
        self.test_send_proof_inv()


if __name__ == '__main__':
    ProofInventoryTest().main()
