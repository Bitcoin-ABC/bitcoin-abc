#!/usr/bin/env python3
# Copyright (c) 2020-2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the quorum detection of avalanche."""

from test_framework.avatools import (
    AvaP2PInterface,
    create_coinbase_stakes,
    get_ava_p2p_interface,
)
from test_framework.key import ECKey, ECPubKey
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalancheVote,
    AvalancheVoteError,
    msg_avaproofs,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet_util import bytes_to_wif


class AvalancheQuorumTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.min_avaproofs_node_count = 8
        self.extra_args = [
            [
                '-enableavalanche=1',
                '-avacooldown=0',
                '-avatimeout=0',
                '-avaminquorumstake=100000000',
                '-avaminquorumconnectedstakeratio=0.8',
                f'-avaminavaproofsnodecount={self.min_avaproofs_node_count}',
            ]
        ]

    def run_test(self):
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
        coinbase_key = node.get_deterministic_priv_key().key
        blocks = node.generate(self.min_avaproofs_node_count)
        peers = []

        for i in range(0, self.min_avaproofs_node_count):
            keyHex = f"12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f7{i:02}"
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

        p2p_idx = 0

        def get_ava_outbound(n, peer):
            nonlocal p2p_idx

            avapeer = AvaP2PInterface()
            n.add_outbound_p2p_connection(
                avapeer,
                p2p_idx=p2p_idx,
                connection_type="avalanche",
                services=NODE_NETWORK | NODE_AVALANCHE,
            )
            p2p_idx += 1
            avapeer.nodeid = node.getpeerinfo()[-1]['id']

            peer['node'] = avapeer
            addavalanchenode(peer)

            avapeer.wait_until(
                lambda: avapeer.last_message.get("getavaproofs"))
            avapeer.send_and_ping(msg_avaproofs())
            avapeer.wait_until(
                lambda: avapeer.last_message.get("avaproofsreq"))

            return avapeer

        # Start polling. The response should be UNKNOWN because there's no
        # score
        poll_and_assert_response(AvalancheVoteError.UNKNOWN)

        # Create one peer with half the score and add one node
        get_ava_outbound(node, peers[0])
        poll_and_assert_response(AvalancheVoteError.UNKNOWN)

        # Create a second peer with the other half and add one node.
        # This is not enough because we are lacking avaproofs messages
        get_ava_outbound(node, peers[1])
        poll_and_assert_response(AvalancheVoteError.UNKNOWN)

        # Add more peers for triggering the avaproofs messaging
        for i in range(2, self.min_avaproofs_node_count - 1):
            get_ava_outbound(node, peers[i])
            poll_and_assert_response(AvalancheVoteError.UNKNOWN)

        get_ava_outbound(node, peers[self.min_avaproofs_node_count - 1])
        poll_and_assert_response(AvalancheVoteError.ACCEPTED)

        # Disconnect peer 1's node which drops us below the threshold, but we've
        # latched that the quorum is established
        peers[1]['node'].peer_disconnect()
        peers[1]['node'].wait_for_disconnect()
        poll_and_assert_response(AvalancheVoteError.ACCEPTED)

        # Reconnect node and re-establish quorum
        get_ava_outbound(node, peers[1])
        poll_and_assert_response(AvalancheVoteError.ACCEPTED)


if __name__ == '__main__':
    AvalancheQuorumTest().main()
