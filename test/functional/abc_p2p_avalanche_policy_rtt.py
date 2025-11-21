# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the real time targeting policy."""

import time

from test_framework.avatools import (
    assert_response,
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
from test_framework.blocktools import create_block, create_coinbase
from test_framework.key import ECPubKey
from test_framework.messages import AvalancheVote, AvalancheVoteError, ToHex
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

QUORUM_NODE_COUNT = 16


class AvalancheRTTTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-enablertt",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-persistavapeers=0",
            ],
            [],
        ]

    def check_rtt_policy(self):
        node = self.nodes[0]

        def set_mocktimes(t):
            [n.setmocktime(t) for n in self.nodes]

        now = int(time.time())
        set_mocktimes(now)

        self.generate(node, 6)

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
                set_mocktimes(now)
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

        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        def check_and_accept_new_block(tip, expect_initially_accepted):
            cb = create_coinbase(node.getblockcount())
            block = create_block(int(tip, 16), cb, now)
            block.solve()
            assert_equal(node.submitblock(ToHex(block)), None)

            expected_tip = block.hash_hex if expect_initially_accepted else tip
            assert_equal(node.getbestblockhash(), expected_tip)

            # Poll and check the node votes what we expect
            poll_node.send_poll([block.hash_int])
            expected_vote = (
                AvalancheVoteError.ACCEPTED
                if expect_initially_accepted
                else AvalancheVoteError.PARKED
            )
            assert_response(
                poll_node, avakey, [AvalancheVote(expected_vote, block.hash_int)]
            )

            # Vote yes on this block until the node accepts it
            self.wait_until(lambda: has_accepted_tip(block.hash_hex))
            assert_equal(node.getbestblockhash(), block.hash_hex)

            poll_node.send_poll([block.hash_int])
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(AvalancheVoteError.ACCEPTED, block.hash_int)],
            )

        self.log.info("Check the node rejects blocks that doesn't match RTT")
        height = node.getblockcount()
        # First block is rejected because of the RTT 1 block window
        check_and_accept_new_block(node.getbestblockhash(), False)
        # Create another block with the regtest target, not accounting for RTT.
        # It gets rejected again
        check_and_accept_new_block(node.getbestblockhash(), False)
        # The check_and_accept_new_block call will avalanche accept the
        # initially rejected block
        assert_equal(node.getblockcount(), height + 2)

        self.log.info("Check the node accept blocks that match RTT")
        # Elapse enough time for the the difficulty to settle back to regtest
        # target.
        # For the starting difftime, the limiting factor is the 5 blocks window
        # here which enforces >= 1836s with RTT_K=6 to not get RTT in the way.
        ref_time = now
        for t in (636, 1800, 3600, 3600 * 12):
            now = ref_time + t
            set_mocktimes(now)
            assert_equal(int(node.getblocktemplate()["bits"], 16), 0x207FFFFF)
            check_and_accept_new_block(node.getbestblockhash(), True)

        self.log.info(
            "Check the node catches up after a restart without parking due to RTT"
        )

        self.sync_blocks()
        self.stop_node(0)
        self.generate(self.nodes[1], 20, sync_fun=self.no_op)

        self.start_node(0, extra_args=self.extra_args[0] + [f"-mocktime={now}"])
        self.connect_nodes(0, 1)
        self.sync_blocks()

    def run_test(self):
        self.check_rtt_policy()


if __name__ == "__main__":
    AvalancheRTTTest().main()
