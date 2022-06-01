#!/usr/bin/env python3
# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test proof inventory relaying
"""

import random

from test_framework.avatools import (
    AvaP2PInterface,
    gen_proof,
    get_ava_p2p_interface,
    get_proof_ids,
    wait_for_proof,
)
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalanchePrefilledProof,
    calculate_shortid,
    msg_avaproofs,
    msg_getavaproofs,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import MAX_NODES, assert_equal, p2p_port


class CompactProofsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [[
            '-enableavalanche=1',
            '-avacooldown=0',
        ]] * self.num_nodes

    def test_send_outbound_getavaproofs(self):
        self.log.info(
            "Check we send a getavaproofs message to our avalanche outbound peers")
        node = self.nodes[0]

        non_avapeers = []
        for i in range(4):
            peer = P2PInterface()
            node.add_outbound_p2p_connection(
                peer,
                p2p_idx=i,
                connection_type="outbound-full-relay",
                services=NODE_NETWORK,
            )
            non_avapeers.append(peer)

        inbound_avapeers = [
            node.add_p2p_connection(
                AvaP2PInterface()) for _ in range(4)]

        outbound_avapeers = []
        for i in range(4):
            peer = P2PInterface()
            node.add_outbound_p2p_connection(
                peer,
                p2p_idx=16 + i,
                connection_type="avalanche",
                services=NODE_NETWORK | NODE_AVALANCHE,
            )
            outbound_avapeers.append(peer)

        self.wait_until(
            lambda: all([p.last_message.get("getavaproofs") for p in outbound_avapeers]))
        assert all([p.message_count.get(
            "getavaproofs", 0) == 1 for p in outbound_avapeers])
        assert all([p.message_count.get(
            "getavaproofs", 0) == 0 for p in non_avapeers])
        assert all([p.message_count.get(
            "getavaproofs", 0) == 0 for p in inbound_avapeers])

    def test_send_manual_getavaproofs(self):
        self.log.info(
            "Check we send a getavaproofs message to our manually connected peers that support avalanche")
        node = self.nodes[0]

        # Get rid of previously connected nodes
        node.disconnect_p2ps()

        def added_node_connected(ip_port):
            added_node_info = node.getaddednodeinfo(ip_port)
            return len(
                added_node_info) == 1 and added_node_info[0]['connected']

        def connect_callback(address, port):
            self.log.debug("Connecting to {}:{}".format(address, port))

        p = AvaP2PInterface()
        p2p_idx = 1
        p.peer_accept_connection(
            connect_cb=connect_callback,
            connect_id=p2p_idx,
            net=node.chain,
            timeout_factor=node.timeout_factor,
            services=NODE_NETWORK | NODE_AVALANCHE,
        )()
        ip_port = f"127.0.01:{p2p_port(MAX_NODES - p2p_idx)}"

        node.addnode(node=ip_port, command="add")
        self.wait_until(lambda: added_node_connected(ip_port))

        assert_equal(node.getpeerinfo()[-1]['addr'], ip_port)
        assert_equal(node.getpeerinfo()[-1]['connection_type'], 'manual')

        self.wait_until(lambda: p.last_message.get("getavaproofs"))

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
            calculate_shortid(
                avaproofs.key0,
                avaproofs.key1,
                proofid) for proofid in sorted(proofids)]
        assert_equal(expected_shortids, avaproofs.shortids)

        # Don't expect any prefilled proof for now
        assert_equal(len(avaproofs.prefilled_proofs), 0)

    def test_request_missing_proofs(self):
        self.log.info(
            "Check the node requests the missing proofs after receiving an avaproofs message")

        node = self.nodes[0]

        self.restart_node(0)

        key0 = random.randint(0, 2**64 - 1)
        key1 = random.randint(0, 2**64 - 1)
        proofs = [gen_proof(node)[1] for _ in range(10)]

        # Build a map from proofid to shortid. Use sorted proofids so we don't
        # have the same indices than the `proofs` list.
        proofids = [p.proofid for p in proofs]
        shortid_map = {}
        for proofid in sorted(proofids):
            shortid_map[proofid] = calculate_shortid(key0, key1, proofid)

        self.log.info("The node ignores unsollicited avaproofs")

        spam_peer = get_ava_p2p_interface(node)

        msg = msg_avaproofs()
        msg.key0 = key0
        msg.key1 = key1
        msg.shortids = list(shortid_map.values())
        msg.prefilled_proofs = []

        with node.assert_debug_log(["Ignoring unsollicited avaproofs"]):
            spam_peer.send_message(msg)

        def received_avaproofsreq(peer):
            with p2p_lock:
                return peer.last_message.get("avaproofsreq")

        p2p_idx = 0

        def add_avalanche_p2p_outbound():
            nonlocal p2p_idx

            peer = P2PInterface()
            node.add_outbound_p2p_connection(
                peer,
                p2p_idx=p2p_idx,
                connection_type="avalanche",
                services=NODE_NETWORK | NODE_AVALANCHE,
            )
            p2p_idx += 1

            peer.wait_until(lambda: peer.last_message.get("getavaproofs"))

            return peer

        def expect_indices(shortids, expected_indices, prefilled_proofs=None):
            nonlocal p2p_idx

            if prefilled_proofs is None:
                prefilled_proofs = []

            msg = msg_avaproofs()
            msg.key0 = key0
            msg.key1 = key1
            msg.shortids = shortids
            msg.prefilled_proofs = prefilled_proofs

            peer = add_avalanche_p2p_outbound()
            peer.send_message(msg)
            self.wait_until(lambda: received_avaproofsreq(peer))

            avaproofsreq = received_avaproofsreq(peer)
            assert_equal(avaproofsreq.indices, expected_indices)

        self.log.info("Check no proof is requested if there is no shortid")
        expect_indices([], [])

        self.log.info(
            "Check the node requests all the proofs if it known none")
        expect_indices(
            list(shortid_map.values()),
            [i for i in range(len(shortid_map))]
        )

        self.log.info(
            "Check the node requests only the missing proofs")

        known_proofids = []
        for proof in proofs[:5]:
            node.sendavalancheproof(proof.serialize().hex())
            known_proofids.append(proof.proofid)

        expected_indices = [i for i, proofid in enumerate(
            shortid_map) if proofid not in known_proofids]
        expect_indices(list(shortid_map.values()), expected_indices)

        self.log.info(
            "Check the node don't request prefilled proofs")
        # Get the indices for a couple of proofs
        indice_proof5 = list(shortid_map.keys()).index(proofids[5])
        indice_proof6 = list(shortid_map.keys()).index(proofids[6])
        prefilled_proofs = [
            AvalanchePrefilledProof(indice_proof5, proofs[5]),
            AvalanchePrefilledProof(indice_proof6, proofs[6]),
        ]
        prefilled_proofs = sorted(
            prefilled_proofs,
            key=lambda prefilled_proof: prefilled_proof.index)
        remaining_shortids = [shortid for proofid, shortid in shortid_map.items(
        ) if proofid not in proofids[5:7]]
        known_proofids.extend(proofids[5:7])
        expected_indices = [i for i, proofid in enumerate(
            shortid_map) if proofid not in known_proofids]
        expect_indices(
            remaining_shortids,
            expected_indices,
            prefilled_proofs=prefilled_proofs)

        self.log.info(
            "Check the node requests no proof if it knows all of them")

        for proof in proofs[5:]:
            node.sendavalancheproof(proof.serialize().hex())
            known_proofids.append(proof.proofid)

        expect_indices(list(shortid_map.values()), [])

        self.log.info("Check out of bounds index")

        bad_peer = add_avalanche_p2p_outbound()

        msg = msg_avaproofs()
        msg.key0 = key0
        msg.key1 = key1
        msg.shortids = list(shortid_map.values())
        msg.prefilled_proofs = [
            AvalanchePrefilledProof(
                len(shortid_map) + 1,
                gen_proof(node)[1])]

        with node.assert_debug_log(["Misbehaving", "avaproofs-bad-indexes"]):
            bad_peer.send_message(msg)
        bad_peer.wait_for_disconnect()

        self.log.info("An invalid prefilled proof will trigger a ban")

        _, no_stake = gen_proof(node)
        no_stake.stakes = []

        bad_peer = add_avalanche_p2p_outbound()

        msg = msg_avaproofs()
        msg.key0 = key0
        msg.key1 = key1
        msg.shortids = list(shortid_map.values())
        msg.prefilled_proofs = [
            AvalanchePrefilledProof(len(shortid_map), no_stake),
        ]

        with node.assert_debug_log(["Misbehaving", "invalid-proof"]):
            bad_peer.send_message(msg)
        bad_peer.wait_for_disconnect()

    def run_test(self):
        self.test_send_outbound_getavaproofs()
        self.test_send_manual_getavaproofs()
        self.test_respond_getavaproofs()
        self.test_request_missing_proofs()


if __name__ == '__main__':
    CompactProofsTest().main()
