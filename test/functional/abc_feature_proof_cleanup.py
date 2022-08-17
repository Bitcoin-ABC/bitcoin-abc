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
    wait_for_proof,
)
from test_framework.key import ECKey
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex
from test_framework.wallet_util import bytes_to_wif

# Interval between 2 proof cleanups
AVALANCHE_CLEANUP_INTERVAL = 5 * 60
# Dangling proof timeout
AVALANCHE_DANGLING_PROOF_TIMEOUT = 15 * 60


class ProofsCleanupTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [[
            '-enableavalanche=1',
            '-avaproofstakeutxodustthreshold=1000000',
            '-avaproofstakeutxoconfirmations=1',
            '-enableavalanchepeerdiscovery=1',
            # Get rid of the getdata delay penalty for inbounds
            '-whitelist=noban@127.0.0.1',
        ]] * self.num_nodes

    def run_test(self):
        node = self.nodes[0]

        master_key, local_proof = gen_proof(node)

        self.restart_node(0, self.extra_args[0] + [
            "-avaproof={}".format(local_proof.serialize().hex()),
            "-avamasterkey={}".format(bytes_to_wif(master_key.get_bytes())),
        ])

        node.generate(1)
        wait_for_proof(node, uint256_hex(local_proof.proofid))

        mocktime = int(time.time())
        node.setmocktime(mocktime)

        proofs = [local_proof]
        keys = [master_key]
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
            keys.append(key)
            peers.append(peer)

        # The last 5 peers have no node attached
        for _ in range(5):
            _, proof = gen_proof(node)
            node.sendavalancheproof(proof.serialize().hex())
            proofs.append(proof)

        peer_info = node.getavalanchepeerinfo()
        assert_equal(len(peer_info), 11)
        assert_equal(set(get_proof_ids(node)),
                     set([proof.proofid for proof in proofs]))

        self.log.info("No proof is cleaned before the timeout expires")

        mocktime += AVALANCHE_DANGLING_PROOF_TIMEOUT - 1
        node.setmocktime(mocktime)
        # Run the cleanup, the proofs are still there
        node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)
        assert_equal(len(peer_info), 11)

        self.log.info("Check the proofs with attached nodes are not cleaned")

        # Expire the dangling proof timeout
        mocktime += 1
        node.setmocktime(mocktime)

        # Run the cleanup, the proofs with no node are cleaned excepted our
        # local proof
        node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)
        self.wait_until(lambda: set(get_proof_ids(node)) == set(
            [proof.proofid for proof in proofs[:6]]), timeout=5)

        self.log.info(
            "Check the proofs are cleaned on next cleanup after the nodes disconnected")

        for peer in peers:
            peer.peer_disconnect()
            peer.wait_for_disconnect()

        node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)
        self.wait_until(lambda: get_proof_ids(node) == [local_proof.proofid])

        self.log.info("Check the cleaned up proofs are no longer accepted...")

        sender = get_ava_p2p_interface(node)
        for proof in proofs[1:]:
            with node.assert_debug_log(["dangling-proof"]):
                sender.send_avaproof(proof)

        assert_equal(get_proof_ids(node), [local_proof.proofid])

        self.log.info("...until there is a node to attach")

        node.disconnect_p2ps()
        assert_equal(len(node.p2ps), 0)

        avanode = get_ava_p2p_interface(node)

        avanode_key = keys[1]
        avanode_proof = proofs[1]

        delegated_key = ECKey()
        delegated_key.generate()

        delegation = node.delegateavalancheproof(
            f"{avanode_proof.limited_proofid:064x}",
            bytes_to_wif(avanode_key.get_bytes()),
            delegated_key.get_pubkey().get_bytes().hex(),
        )

        avanode.send_avahello(delegation, delegated_key)
        avanode.sync_with_ping()
        avanode.wait_until(lambda: avanode.last_message.get(
            "getdata") and avanode.last_message["getdata"].inv[-1].hash == avanode_proof.proofid)

        avanode.send_avaproof(avanode_proof)
        self.wait_until(lambda: avanode_proof.proofid in get_proof_ids(node))


if __name__ == '__main__':
    ProofsCleanupTest().main()
