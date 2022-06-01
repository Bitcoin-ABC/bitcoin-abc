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
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    msg_getavaproofs,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.siphash import siphash256
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import MAX_NODES, assert_equal, p2p_port


class CompactProofsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [[
            '-enableavalanche=1',
            '-avacooldown=0',
            '-whitelist=noban@127.0.0.1',
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
            siphash256(
                avaproofs.key0,
                avaproofs.key1,
                proofid) & 0x0000ffffffffffff for proofid in sorted(proofids)]
        assert_equal(expected_shortids, avaproofs.shortids)

        # Don't expect any prefilled proof for now
        assert_equal(len(avaproofs.prefilled_proofs), 0)

    def run_test(self):
        self.test_send_outbound_getavaproofs()
        self.test_send_manual_getavaproofs()
        self.test_respond_getavaproofs()


if __name__ == '__main__':
    CompactProofsTest().main()
