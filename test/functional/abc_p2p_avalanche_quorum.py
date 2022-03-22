#!/usr/bin/env python3
# Copyright (c) 2020-2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the quorum detection of avalanche."""

from time import time

from test_framework.avatools import (
    create_coinbase_stakes,
    get_ava_p2p_interface,
)
from test_framework.key import ECKey, ECPubKey
from test_framework.messages import AvalancheVote, AvalancheVoteError
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet_util import bytes_to_wif


class AvalancheQuorumTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            ['-enableavalanche=1',
             '-avacooldown=0',
             '-avatimeout=0',
             '-avaminquorumstake=100000000',
             '-avaminquorumconnectedstakeratio=0.8']
        ]

    def mock_forward(self, delta):
        self.mock_time += delta
        self.nodes[0].setmocktime(self.mock_time)

    def run_test(self):
        self.mock_time = int(time())
        self.mock_forward(0)

        # Create a local node to poll from and a helper to send polls from it
        # and assert on the response
        node = self.nodes[0]
        poll_node = get_ava_p2p_interface(node)
        poll_node_pubkey = ECPubKey()
        poll_node_pubkey.set(bytes.fromhex(node.getavalanchekey()))

        def poll_and_assert_response(expected):
            # Send poll for best block
            block = int(node.getbestblockhash(), 16)
            poll_node.send_poll([block])

            # Get response and check that the vote is what we expect
            response = poll_node.wait_for_avaresponse()
            r = response.response
            assert poll_node_pubkey.verify_schnorr(response.sig, r.get_hash())
            assert_equal(len(r.votes), 1)

            actual = repr(r.votes[0])
            expected = repr(AvalancheVote(expected, block))
            assert_equal(actual, expected)

        # Create peers to poll
        num_quorum_peers = 2
        coinbase_key = node.get_deterministic_priv_key().key
        blocks = node.generate(num_quorum_peers)
        peers = []
        for i in range(0, num_quorum_peers):
            keyHex = "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f75" + \
                str(i)
            k = ECKey()
            k.set(bytes.fromhex(keyHex), True)
            stakes = create_coinbase_stakes(
                node, [blocks[i]], coinbase_key)
            proof = node.buildavalancheproof(1, 1, bytes_to_wif(k.get_bytes()),
                                             stakes)
            peers.append({'key': k, 'proof': proof, 'stake': stakes})

        def addavalanchenode(peer):
            pubkey = peer['key'].get_pubkey().get_bytes().hex()
            assert node.addavalanchenode(
                peer['node'].nodeid, pubkey, peer['proof']) is True

        # Start polling. The response should be UNKNOWN because there's no
        # score
        poll_and_assert_response(AvalancheVoteError.UNKNOWN)

        # Create one peer with half the score and add one node
        peers[0]['node'] = get_ava_p2p_interface(node)
        addavalanchenode(peers[0])
        poll_and_assert_response(AvalancheVoteError.UNKNOWN)

        # Create a second peer with the other half and add one node
        peers[1]['node'] = get_ava_p2p_interface(node)
        addavalanchenode(peers[1])
        poll_and_assert_response(AvalancheVoteError.ACCEPTED)

        # Disconnect peer 1's node which drops us below the threshold, but we've
        # latched that the quorum is established
        self.mock_forward(1)
        peers[1]['node'].peer_disconnect()
        peers[1]['node'].wait_for_disconnect()
        poll_and_assert_response(AvalancheVoteError.ACCEPTED)

        # Reconnect node and re-establish quorum
        peers[1]['node'] = get_ava_p2p_interface(node)
        addavalanchenode(peers[1])
        poll_and_assert_response(AvalancheVoteError.ACCEPTED)


if __name__ == '__main__':
    AvalancheQuorumTest().main()
