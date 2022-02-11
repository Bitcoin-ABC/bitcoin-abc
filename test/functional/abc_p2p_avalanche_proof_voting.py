#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of conflicting proofs via avalanche."""
import time

from test_framework.avatools import (
    create_coinbase_stakes,
    gen_proof,
    get_ava_p2p_interface,
    get_proof_ids,
)
from test_framework.key import ECPubKey
from test_framework.messages import (
    AvalancheVote,
    AvalancheVoteError,
    FromHex,
    LegacyAvalancheProof,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_raises_rpc_error, try_rpc
from test_framework.wallet_util import bytes_to_wif

QUORUM_NODE_COUNT = 16


class AvalancheProofVotingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.conflicting_proof_cooldown = 100
        self.peer_replacement_cooldown = 2000
        self.extra_args = [
            ['-enableavalanche=1', '-enableavalancheproofreplacement=1',
                f'-avalancheconflictingproofcooldown={self.conflicting_proof_cooldown}', f'-avalanchepeerreplacementcooldown={self.peer_replacement_cooldown}', '-avacooldown=0'],
        ]
        self.supports_cli = False

    # Build a fake quorum of nodes.
    def get_quorum(self, node):
        quorum = [get_ava_p2p_interface(node)
                  for _ in range(0, QUORUM_NODE_COUNT)]

        for n in quorum:
            success = node.addavalanchenode(
                n.nodeid,
                self.privkey.get_pubkey().get_bytes().hex(),
                self.quorum_proof.serialize().hex(),
            )
            assert success is True

        return quorum

    def can_find_proof_in_poll(self, hash, response):
        found_hash = False
        for n in self.quorum:
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

            n.send_avaresponse(poll.round, votes, self.privkey)

        return found_hash

    @staticmethod
    def send_proof(from_peer, proof_hex):
        proof = FromHex(LegacyAvalancheProof(), proof_hex)
        from_peer.send_avaproof(proof)
        return proof.proofid

    def send_and_check_for_polling(self, peer,
                                   proof_hex, response=AvalancheVoteError.ACCEPTED):
        proofid = self.send_proof(peer, proof_hex)
        self.wait_until(lambda: self.can_find_proof_in_poll(proofid, response))

    def build_conflicting_proof(self, node, sequence):
        return node.buildavalancheproof(
            sequence, 0, self.privkey_wif, self.conflicting_stakes)

    def run_test(self):
        node = self.nodes[0]

        self.privkey, self.quorum_proof = gen_proof(node)
        self.privkey_wif = bytes_to_wif(self.privkey.get_bytes())

        self.quorum = self.get_quorum(node)

        addrkey0 = node.get_deterministic_priv_key()
        blockhash = node.generatetoaddress(10, addrkey0.address)
        self.conflicting_stakes = create_coinbase_stakes(
            node, blockhash[5:], addrkey0.key)

        self.poll_tests(node)
        self.update_tests(node)

    def poll_tests(self, node):
        proof_seq10 = self.build_conflicting_proof(node, 10)
        proof_seq20 = self.build_conflicting_proof(node, 20)
        proof_seq30 = self.build_conflicting_proof(node, 30)
        proof_seq40 = self.build_conflicting_proof(node, 40)

        orphan = node.buildavalancheproof(
            100, 2000000000, self.privkey_wif, [{
                'txid': '0' * 64,
                'vout': 0,
                'amount': 10e6,
                'height': 42,
                'iscoinbase': False,
                'privatekey': self.privkey_wif,
            }]
        )

        no_stake = node.buildavalancheproof(
            200, 2000000000, self.privkey_wif, []
        )

        # Get the key so we can verify signatures.
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        self.log.info("Trigger polling from the node...")

        peer = get_ava_p2p_interface(node)

        mock_time = int(time.time())
        node.setmocktime(mock_time)

        self.log.info("Check we poll for valid proof")
        self.send_and_check_for_polling(peer, proof_seq30)

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
        self.send_and_check_for_polling(
            peer, proof_seq20, response=AvalancheVoteError.INVALID)

        self.log.info(
            "Check we poll for conflicting proof if the proof is the favorite")
        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)
        self.send_and_check_for_polling(peer, proof_seq40)

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

    def update_tests(self, node):
        # Restart the node to get rid og in-flight requests
        self.restart_node(0)

        mock_time = int(time.time())
        node.setmocktime(mock_time)

        self.quorum = self.get_quorum(node)
        peer = get_ava_p2p_interface(node)

        proof_seq30 = self.build_conflicting_proof(node, 30)
        proof_seq40 = self.build_conflicting_proof(node, 40)
        proof_seq50 = self.build_conflicting_proof(node, 50)
        proofid_seq30 = FromHex(LegacyAvalancheProof(), proof_seq30).proofid
        proofid_seq40 = FromHex(LegacyAvalancheProof(), proof_seq40).proofid
        proofid_seq50 = FromHex(LegacyAvalancheProof(), proof_seq50).proofid

        node.sendavalancheproof(proof_seq40)
        self.wait_until(lambda: proofid_seq40 in get_proof_ids(node))

        assert proofid_seq40 in get_proof_ids(node)
        assert proofid_seq30 not in get_proof_ids(node)

        self.log.info("Test proof acceptance")

        def accept_proof(proofid):
            self.wait_until(lambda: self.can_find_proof_in_poll(
                proofid, response=AvalancheVoteError.ACCEPTED), timeout=5)
            return proofid in get_proof_ids(node)

        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)

        self.send_and_check_for_polling(peer, proof_seq30)

        # Let the quorum vote for it
        self.wait_until(lambda: accept_proof(proofid_seq30))
        assert proofid_seq40 not in get_proof_ids(node)

        self.log.info("Test the peer replacement rate limit")

        # Wait until proof_seq30 is finalized
        with node.assert_debug_log([f"Avalanche accepted proof {proofid_seq30:0{64}x}, status 3"]):
            self.wait_until(lambda: not self.can_find_proof_in_poll(
                proofid_seq30, response=AvalancheVoteError.ACCEPTED))

        # Not enough
        assert self.conflicting_proof_cooldown < self.peer_replacement_cooldown
        mock_time += self.conflicting_proof_cooldown
        node.setmocktime(mock_time)

        peer = get_ava_p2p_interface(node)

        with node.assert_debug_log(["Not polling the avalanche proof (cooldown-not-elapsed)"]):
            self.send_proof(peer, proof_seq50)

        mock_time += self.peer_replacement_cooldown
        node.setmocktime(mock_time)

        self.log.info("Test proof rejection")

        self.send_proof(peer, proof_seq50)
        self.wait_until(lambda: proofid_seq50 in get_proof_ids(node))
        assert proofid_seq40 not in get_proof_ids(node)

        def reject_proof(proofid):
            self.wait_until(
                lambda: self.can_find_proof_in_poll(
                    proofid, response=AvalancheVoteError.INVALID))
            return proofid not in get_proof_ids(node)

        self.wait_until(lambda: reject_proof(proofid_seq50))

        assert proofid_seq50 not in get_proof_ids(node)
        assert proofid_seq40 in get_proof_ids(node)

        self.log.info("Test proof invalidation")

        def invalidate_proof(proofid):
            self.wait_until(
                lambda: self.can_find_proof_in_poll(
                    proofid, response=AvalancheVoteError.INVALID))
            return try_rpc(-8, "Proof not found",
                           node.getrawavalancheproof, f"{proofid:0{64}x}")

        self.wait_until(lambda: invalidate_proof(proofid_seq50))

        self.log.info("The node will now ignore the invalid proof")

        for i in range(5):
            with node.assert_debug_log(["received: avaproof"]):
                self.send_proof(peer, proof_seq50)
            assert_raises_rpc_error(-8,
                                    "Proof not found",
                                    node.getrawavalancheproof,
                                    f"{proofid_seq50:0{64}x}")


if __name__ == '__main__':
    AvalancheProofVotingTest().main()
