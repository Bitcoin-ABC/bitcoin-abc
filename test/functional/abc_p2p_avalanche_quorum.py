#!/usr/bin/env python3
# Copyright (c) 2020-2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the quorum detection of avalanche."""

from test_framework.avatools import (
    AvaP2PInterface,
    gen_proof,
    get_ava_p2p_interface,
)
from test_framework.key import ECPubKey
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalancheVote,
    AvalancheVoteError,
    msg_avaproofs,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class AvalancheQuorumTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.min_avaproofs_node_count = 8
        self.extra_args = [[
            '-enableavalanche=1',
            '-avacooldown=0',
            '-avatimeout=0',
            '-avaminquorumstake=100000000',
            '-avaminquorumconnectedstakeratio=0.8',
        ]] * self.num_nodes
        self.extra_args[0] = self.extra_args[0] + \
            ['-avaminavaproofsnodecount=0']
        self.extra_args[1] = self.extra_args[1] + \
            [f'-avaminavaproofsnodecount={self.min_avaproofs_node_count}']

    def run_test(self):
        # Prepare peers proofs
        peers = []
        for i in range(0, self.min_avaproofs_node_count):
            key, proof = gen_proof(self.nodes[0])
            peers.append({'key': key, 'proof': proof})

        # Let the nodes known about all the blocks then disconnect them so we're
        # sure they won't exchange proofs when we start connecting peers.
        self.sync_all()
        self.disconnect_nodes(0, 1)

        # Build polling nodes
        pollers = [get_ava_p2p_interface(node) for node in self.nodes]

        def poll_and_assert_response(node, expected):
            pubkey = ECPubKey()
            pubkey.set(bytes.fromhex(node.getavalanchekey()))

            poller = pollers[node.index]

            # Send poll for best block
            block = int(node.getbestblockhash(), 16)
            poller.send_poll([block])

            # Get response and check that the vote is what we expect
            response = poller.wait_for_avaresponse()
            r = response.response
            assert pubkey.verify_schnorr(response.sig, r.get_hash())
            assert_equal(len(r.votes), 1)

            actual = repr(r.votes[0])
            expected = repr(AvalancheVote(expected, block))
            assert_equal(actual, expected)

        def addavalanchenode(node, peer):
            pubkey = peer['key'].get_pubkey().get_bytes().hex()
            assert node.addavalanchenode(
                peer['node'].nodeid,
                pubkey,
                peer['proof'].serialize().hex(),
            ) is True

        p2p_idx = 0

        def get_ava_outbound(node, peer):
            nonlocal p2p_idx

            avapeer = AvaP2PInterface()
            node.add_outbound_p2p_connection(
                avapeer,
                p2p_idx=p2p_idx,
                connection_type="avalanche",
                services=NODE_NETWORK | NODE_AVALANCHE,
            )
            p2p_idx += 1
            avapeer.nodeid = node.getpeerinfo()[-1]['id']

            peer['node'] = avapeer
            addavalanchenode(node, peer)

            avapeer.wait_until(
                lambda: avapeer.last_message.get("getavaproofs"))
            avapeer.send_and_ping(msg_avaproofs())
            avapeer.wait_until(
                lambda: avapeer.last_message.get("avaproofsreq"))

            return avapeer

        def add_avapeer_and_check_status(peer, expected_status):
            for i, node in enumerate(self.nodes):
                get_ava_outbound(node, peer)
                poll_and_assert_response(node, expected_status[i])

        # Start polling. The response should be UNKNOWN because there's no
        # score
        [poll_and_assert_response(node, AvalancheVoteError.UNKNOWN)
         for node in self.nodes]

        # Create one peer with half the score and add one node
        add_avapeer_and_check_status(
            peers[0], [
                AvalancheVoteError.UNKNOWN,
                AvalancheVoteError.UNKNOWN,
            ])

        # Create a second peer with the other half and add one node.
        # This is enough for node0 but not node1
        add_avapeer_and_check_status(
            peers[1], [
                AvalancheVoteError.ACCEPTED,
                AvalancheVoteError.UNKNOWN,
            ])

        # Add more peers for triggering the avaproofs messaging
        for i in range(2, self.min_avaproofs_node_count - 1):
            add_avapeer_and_check_status(
                peers[i], [
                    AvalancheVoteError.ACCEPTED,
                    AvalancheVoteError.UNKNOWN,
                ])

        add_avapeer_and_check_status(
            peers[self.min_avaproofs_node_count - 1], [
                AvalancheVoteError.ACCEPTED,
                AvalancheVoteError.ACCEPTED,
            ])


if __name__ == '__main__':
    AvalancheQuorumTest().main()
