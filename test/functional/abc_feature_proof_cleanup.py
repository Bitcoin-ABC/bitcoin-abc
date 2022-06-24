#!/usr/bin/env python3
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
    get_proof_ids,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

# Interval between 2 proof cleanups
AVALANCHE_CLEANUP_INTERVAL = 5 * 60
# Dangling proof timeout
AVALANCHE_DANGLING_PROOF_TIMEOUT = 15 * 60


class ProofsCleanupTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [[
            '-enableavalanche=1',
            '-avaproofstakeutxoconfirmations=1',
        ]] * self.num_nodes

    def run_test(self):
        node = self.nodes[0]

        mocktime = int(time.time())
        node.setmocktime(mocktime)

        proofs = []
        peers = []
        # The first 5 peers have a node attached
        for _ in range(5):
            key, proof = gen_proof(node)

            peer = get_ava_p2p_interface(node)
            node.addavalanchenode(
                peer.nodeid,
                key.get_pubkey().get_bytes().hex(),
                proof.serialize().hex())

            proofs.append(proof)
            peers.append(peer)

        # The last 5 peers have no node attached
        for _ in range(5):
            _, proof = gen_proof(node)
            node.sendavalancheproof(proof.serialize().hex())
            proofs.append(proof)

        peer_info = node.getavalanchepeerinfo()
        assert_equal(len(peer_info), 10)
        assert_equal(set(get_proof_ids(node)),
                     set([proof.proofid for proof in proofs]))

        self.log.info("No proof is cleaned before the timeout expires")

        mocktime += AVALANCHE_DANGLING_PROOF_TIMEOUT - 1
        node.setmocktime(mocktime)
        # Run the cleanup, the proofs are still there
        node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)
        assert_equal(len(peer_info), 10)

        self.log.info("Check the proofs with attached nodes are not cleaned")

        # Expire the dangling proof timeout
        mocktime += 1
        node.setmocktime(mocktime)

        # Run the cleanup, the proofs with no node are cleaned
        node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)
        self.wait_until(lambda: set(get_proof_ids(node)) == set(
            [proof.proofid for proof in proofs[:5]]), timeout=5)

        self.log.info(
            "Check the proofs are cleaned on next cleanup after the nodes disconnected")

        for peer in peers:
            peer.peer_disconnect()
            peer.wait_for_disconnect()

        node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)
        self.wait_until(lambda: get_proof_ids(node) == [])


if __name__ == '__main__':
    ProofsCleanupTest().main()
