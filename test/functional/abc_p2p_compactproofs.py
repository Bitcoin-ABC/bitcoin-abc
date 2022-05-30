#!/usr/bin/env python3
# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test proof inventory relaying
"""

from test_framework.avatools import (
    AvaP2PInterface,
    gen_proof,
    get_proof_ids,
    wait_for_proof,
)
from test_framework.messages import msg_getavaproofs
from test_framework.p2p import p2p_lock
from test_framework.siphash import siphash256
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class CompactProofsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [[
            '-enableavalanche=1',
            '-avacooldown=0',
            '-whitelist=noban@127.0.0.1',
        ]] * self.num_nodes

    def test_respond_getavaproofs(self):
        self.log.info("Check the node responds to getavaproofs messages")

        node = self.nodes[0]

        def received_avaproofs(peer):
            with p2p_lock:
                return peer.last_message.get("avaproofs")

        def send_getavaproof_check_shortid_len(peer, expected_len):
            peer.send_message(msg_getavaproofs())
            self.wait_until(lambda: received_avaproofs(peer))

            avaproofs = received_avaproofs(peer)
            assert_equal(len(avaproofs.shortids), expected_len)

        # Initially the node has 0 peer
        assert_equal(len(get_proof_ids(node)), 0)

        peer = node.add_p2p_connection(AvaP2PInterface())
        send_getavaproof_check_shortid_len(peer, 0)

        # Add some proofs
        sending_peer = node.add_p2p_connection(AvaP2PInterface())
        for _ in range(50):
            _, proof = gen_proof(node)
            sending_peer.send_avaproof(proof)
            wait_for_proof(node, f"{proof.proofid:0{64}x}")

        proofids = get_proof_ids(node)
        assert_equal(len(proofids), 50)

        receiving_peer = node.add_p2p_connection(AvaP2PInterface())
        send_getavaproof_check_shortid_len(receiving_peer, len(proofids))

        avaproofs = received_avaproofs(receiving_peer)
        expected_shortids = [
            siphash256(
                avaproofs.key0,
                avaproofs.key1,
                proofid) & 0x0000ffffffffffff for proofid in sorted(proofids)]
        assert_equal(expected_shortids, avaproofs.shortids)

        # Don't expect any prefilled proof for now
        assert_equal(len(avaproofs.prefilled_proofs), 0)

    def run_test(self):
        self.test_respond_getavaproofs()


if __name__ == '__main__':
    CompactProofsTest().main()
