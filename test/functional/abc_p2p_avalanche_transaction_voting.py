#!/usr/bin/env python3
# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test avalanche transaction polling."""
import random

from test_framework.avatools import get_ava_p2p_interface
from test_framework.key import ECPubKey
from test_framework.messages import MSG_TX, AvalancheVote, AvalancheVoteError
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet


class AvalancheTransactionVotingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [['-enableavalanche=1']]

    def run_test(self):
        node = self.nodes[0]
        poll_node = get_ava_p2p_interface(node)

        # Create helper to check expected poll responses
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        def assert_response(expected):
            response = poll_node.wait_for_avaresponse()
            r = response.response

            # Verify signature.
            assert avakey.verify_schnorr(response.sig, r.get_hash())

            # Verify correct votes list
            votes = r.votes
            assert_equal(len(votes), len(expected))
            for i in range(0, len(votes)):
                assert_equal(repr(votes[i]), repr(expected[i]))

        # Create random non-existing tx ids and poll for them
        tx_ids = [random.randint(0, 2**256) for _ in range(10)]
        poll_node.send_poll(tx_ids, MSG_TX)

        # Each tx id should get an UNKNOWN response
        assert_response(
            [AvalancheVote(AvalancheVoteError.UNKNOWN, id) for id in tx_ids])

        # Make real txs
        num_txs = 5
        wallet = MiniWallet(node)
        wallet.generate(num_txs)

        # Mature the coinbases
        node.generate(100)

        assert_equal(node.getmempoolinfo()['size'], 0)
        tx_ids = [int(wallet.send_self_transfer(from_node=node)
                      ['txid'], 16) for _ in range(num_txs)]
        assert_equal(node.getmempoolinfo()['size'], num_txs)

        # These real txs are also voted as UNKNOWN for now
        poll_node.send_poll(tx_ids, MSG_TX)
        assert_response(
            [AvalancheVote(AvalancheVoteError.UNKNOWN, id) for id in tx_ids])


if __name__ == '__main__':
    AvalancheTransactionVotingTest().main()
