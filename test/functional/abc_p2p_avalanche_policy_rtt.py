# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the real time targeting policy."""
import time

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.blocktools import create_block, create_coinbase
from test_framework.messages import AvalancheVote, AvalancheVoteError, ToHex
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

QUORUM_NODE_COUNT = 16


class AvalancheRTTTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.extra_args = [
            [
                "-enablertt",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
            ],
            [],
        ]

    def run_test(self):
        node = self.nodes[0]

        now = int(time.time()) - 10000
        node.setmocktime(now)

        node.add_p2p_connection(P2PInterface())
        self.nodes[1].add_p2p_connection(P2PInterface())

        tip = self.generate(node, 1, sync_fun=self.no_op)[0]
        assert_equal(node.getbestblockhash(), tip)

        self.log.info(
            "The getblocktempate call returns an increasing target over time (decreasing difficulty)"
        )

        def get_quorum():
            nonlocal now

            quorum = []
            for _ in range(QUORUM_NODE_COUNT):
                now += 600
                node.setmocktime(now)
                quorum.append(get_ava_p2p_interface(self, node))

            return quorum

        quorum = get_quorum()
        poll_node = quorum[0]
        assert node.getavalancheinfo()["ready_to_poll"] is True

        def has_accepted_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.getbestblockhash() == tip_expected

        def has_finalized_tip(tip_expected):
            return has_accepted_tip(tip_expected) and node.isfinalblock(tip_expected)

        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_tip(tip))

        def assert_response(expected):
            response = poll_node.wait_for_avaresponse()
            r = response.response
            assert_equal(r.cooldown, 0)

            votes = r.votes
            assert_equal(len(votes), len(expected))
            for i in range(0, len(votes)):
                assert_equal(repr(votes[i]), repr(expected[i]))

        def check_and_accept_new_block(tip, expect_initially_accepted):
            cb = create_coinbase(node.getblockcount())
            block = create_block(int(tip, 16), cb, now)
            block.solve()
            assert_equal(node.submitblock(ToHex(block)), None)

            expected_tip = block.hash if expect_initially_accepted else tip
            assert_equal(node.getbestblockhash(), expected_tip)

            # Poll and check the node votes what we expect
            poll_node.send_poll([block.sha256])
            expected_vote = (
                AvalancheVoteError.ACCEPTED
                if expect_initially_accepted
                else AvalancheVoteError.PARKED
            )
            assert_response([AvalancheVote(expected_vote, block.sha256)])

            # Vote yes on this block until the node accepts it
            self.wait_until(lambda: has_accepted_tip(block.hash))
            assert_equal(node.getbestblockhash(), block.hash)

            poll_node.send_poll([block.sha256])
            assert_response([AvalancheVote(AvalancheVoteError.ACCEPTED, block.sha256)])

        self.log.info("Check the node rejects blocks that doesn't match RTT")
        height = node.getblockcount()
        # First block is accepted because RTT uses the 2 blocks window
        check_and_accept_new_block(node.getbestblockhash(), True)
        # Create another block with the regtest target, not accounting for RTT.
        # This time it gets rejected.
        check_and_accept_new_block(node.getbestblockhash(), False)
        # The check_and_accept_new_block call will avalanche accept the
        # initially rejected block
        assert_equal(node.getblockcount(), height + 2)

        self.log.info("Check the node accept blocks that match RTT")
        # Elapse enough time for the the difficulty to settle back to regtest
        # target. We stop at 1h to avoid blocks too far in the future that would
        # prevent node1 from catching up and node0 from restarting.
        # For the starting difftime, the limiting factor is the 5 blocks window
        # here which enforces >= 1836s with RTT_K=6 to not get RTT in the way.
        ref_time = now
        for t in (636, 1800, 3600):
            now = ref_time + t
            node.setmocktime(now)
            assert_equal(int(node.getblocktemplate()["bits"], 16), 0x207FFFFF)
            check_and_accept_new_block(node.getbestblockhash(), True)

        self.log.info(
            "Check the node catches up after a restart without parking due to RTT"
        )

        self.sync_blocks()
        self.stop_node(0)
        self.generate(self.nodes[1], 20, sync_fun=self.no_op)

        self.start_node(0, extra_args=self.extra_args[0])
        self.connect_nodes(0, 1)
        self.sync_blocks()


if __name__ == "__main__":
    AvalancheRTTTest().main()
