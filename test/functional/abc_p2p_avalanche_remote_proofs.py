#!/usr/bin/env python3
# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the avalanche remote proofs feature."""
import time

from test_framework.avatools import AvaP2PInterface, gen_proof, get_ava_p2p_interface
from test_framework.messages import NODE_AVALANCHE, NODE_NETWORK
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex


class AvalancheRemoteProofsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=10000",
                "-avaproofstakeutxoconfirmations=1",
            ]
        ]

    def run_test(self):
        node = self.nodes[0]

        inbound = get_ava_p2p_interface(self, node)

        now = int(time.time())
        node.setmocktime(now)

        outbound = node.add_outbound_p2p_connection(
            AvaP2PInterface(self, node),
            p2p_idx=1,
            connection_type="avalanche",
            services=NODE_NETWORK | NODE_AVALANCHE,
        )

        assert_equal(len(node.getpeerinfo()), 2)
        outbound.nodeid = node.getpeerinfo()[-1]["id"]

        self.log.info("Check we save the remote proofs for our avalanche outbounds")

        def remoteFromProof(proof, present=True, last_update=now):
            return {
                "proofid": uint256_hex(proof.proofid),
                "present": present,
                "last_update": now,
            }

        assert_equal(node.getremoteproofs(inbound.nodeid), [])
        assert_equal(
            node.getremoteproofs(outbound.nodeid), [remoteFromProof(outbound.proof)]
        )

        proofs = [outbound.proof]
        for _ in range(10):
            _, proof = gen_proof(self, node)
            proofs.append(proof)

            inbound.send_avaproof(proof)
            outbound.send_avaproof(proof)

        inbound.sync_with_ping()
        outbound.sync_with_ping()

        assert_equal(node.getremoteproofs(inbound.nodeid), [])
        assert_equal(
            node.getremoteproofs(outbound.nodeid),
            [remoteFromProof(proof) for proof in proofs],
        )

        self.log.info("Upon disconnect the remote proofs empty")

        outbound.peer_disconnect()
        outbound.wait_for_disconnect()
        assert_equal(node.getremoteproofs(outbound.nodeid), [])


if __name__ == "__main__":
    AvalancheRemoteProofsTest().main()
