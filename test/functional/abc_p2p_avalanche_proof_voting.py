#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of conflicting proofs via avalanche."""
import time

from test_framework.avatools import (
    create_coinbase_stakes,
    get_ava_p2p_interface,
)
from test_framework.key import ECKey, ECPubKey
from test_framework.messages import (
    AvalancheVote,
    AvalancheVoteError,
    FromHex,
    LegacyAvalancheProof,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.wallet_util import bytes_to_wif

QUORUM_NODE_COUNT = 16


class AvalancheProofVotingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.conflicting_proof_cooldown = 100
        self.extra_args = [
            ['-enableavalanche=1', '-enableavalancheproofreplacement=1',
                f'-avalancheconflictingproofcooldown={self.conflicting_proof_cooldown}', '-avacooldown=0'],
        ]
        self.supports_cli = False

    def run_test(self):
        node = self.nodes[0]

        # Build a fake quorum of nodes.
        def get_quorum():
            return [get_ava_p2p_interface(node)
                    for _ in range(0, QUORUM_NODE_COUNT)]

        # Pick on node from the quorum for polling.
        quorum = get_quorum()

        privkey = ECKey()
        privkey.set(bytes.fromhex(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747"), True)
        proof_master = privkey.get_pubkey().get_bytes().hex()

        addrkey0 = node.get_deterministic_priv_key()
        blockhash = node.generatetoaddress(10, addrkey0.address)
        stakes = create_coinbase_stakes(node, blockhash[:5], addrkey0.key)

        quorum_proof = node.buildavalancheproof(
            42, 0, bytes_to_wif(privkey.get_bytes()), stakes)
        for n in quorum:
            success = node.addavalanchenode(
                n.nodeid, proof_master, quorum_proof)
            assert success is True

        conflicting_stakes = create_coinbase_stakes(
            node, blockhash[5:], addrkey0.key)

        def build_conflicting_proof(sequence):
            return node.buildavalancheproof(sequence, 0, bytes_to_wif(
                privkey.get_bytes()), conflicting_stakes)

        proof_seq10 = build_conflicting_proof(10)
        proof_seq20 = build_conflicting_proof(20)
        proof_seq30 = build_conflicting_proof(30)
        proof_seq40 = build_conflicting_proof(40)

        orphan = node.buildavalancheproof(
            100, 2000000000, bytes_to_wif(privkey.get_bytes()), [{
                'txid': '0' * 64,
                'vout': 0,
                'amount': 10e6,
                'height': 42,
                'iscoinbase': False,
                'privatekey': bytes_to_wif(privkey.get_bytes()),
            }]
        )

        no_stake = node.buildavalancheproof(
            200, 2000000000, bytes_to_wif(privkey.get_bytes()), []
        )

        # Get the key so we can verify signatures.
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        self.log.info("Trigger polling from the node...")

        def can_find_proof_in_poll(hash, response):
            found_hash = False
            for n in quorum:
                poll = n.get_avapoll_if_available()

                # That node has not received a poll
                if poll is None:
                    continue

                # We got a poll, check for the hash and repond
                votes = []
                for inv in poll.invs:
                    # Vote yes to everything
                    r = AvalancheVoteError.ACCEPTED

                    # Look for what we expect
                    if inv.hash == hash:
                        r = response
                        found_hash = True

                    votes.append(AvalancheVote(r, inv.hash))

                n.send_avaresponse(poll.round, votes, privkey)

            return found_hash

        peer = get_ava_p2p_interface(node)

        mock_time = int(time.time())
        node.setmocktime(mock_time)

        def send_and_check_for_polling(
                proof_hex, response=AvalancheVoteError.ACCEPTED):
            proof = FromHex(LegacyAvalancheProof(), proof_hex)
            peer.send_avaproof(proof)
            self.wait_until(
                lambda: can_find_proof_in_poll(
                    proof.proofid, response))

        self.log.info("Check we poll for valid proof")
        send_and_check_for_polling(proof_seq30)

        self.log.info(
            "Check we don't poll for subsequent proofs if the cooldown is not elapsed, proof not the favorite")
        with node.assert_debug_log(["Not polling the avalanche proof (cooldown-not-elapsed)"]):
            peer.send_avaproof(FromHex(LegacyAvalancheProof(), proof_seq20))

        self.log.info(
            "Check we don't poll for subsequent proofs if the cooldown is not elapsed, proof is the favorite")
        with node.assert_debug_log(["Not polling the avalanche proof (cooldown-not-elapsed)"]):
            peer.send_avaproof(FromHex(LegacyAvalancheProof(), proof_seq40))

        self.log.info(
            "Check we poll for conflicting proof if the proof is not the favorite")
        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)
        send_and_check_for_polling(proof_seq20)

        self.log.info(
            "Check we poll for conflicting proof if the proof is the favorite")
        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)
        send_and_check_for_polling(proof_seq40)

        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)

        self.log.info("Check we don't poll for orphans")
        with node.assert_debug_log(["Not polling the avalanche proof (orphan-proof)"]):
            peer.send_avaproof(FromHex(LegacyAvalancheProof(), orphan))

        self.log.info("Check we don't poll for proofs that get rejected")
        with node.assert_debug_log(["Not polling the avalanche proof (rejected-proof)"]):
            peer.send_avaproof(FromHex(LegacyAvalancheProof(), proof_seq10))

        self.log.info("Check we don't poll for invalid proofs and get banned")
        with node.assert_debug_log(["Misbehaving", "invalid-proof"]):
            peer.send_avaproof(FromHex(LegacyAvalancheProof(), no_stake))
        peer.wait_for_disconnect()


if __name__ == '__main__':
    AvalancheProofVotingTest().main()
