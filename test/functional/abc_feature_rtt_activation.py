# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Tests for Bitcoin ABC heartbeat feature activation
"""
from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.blocktools import create_block, create_coinbase
from test_framework.messages import AvalancheVote, AvalancheVoteError, ToHex
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_greater_than_or_equal

QUORUM_NODE_COUNT = 16
AUGUSTO_ACTIVATION = 2000000000


class AbcRTTActivationTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-enablertt",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
                f"-augustoactivationtime={AUGUSTO_ACTIVATION}",
            ],
        ]

    def run_test(self):
        node = self.nodes[0]

        now = AUGUSTO_ACTIVATION - 10000
        node.setmocktime(now)

        def get_quorum():
            nonlocal now
            quorum = []
            for _ in range(QUORUM_NODE_COUNT):
                now += 600
                node.setmocktime(now)
                quorum.append(get_ava_p2p_interface(self, node))

            return quorum

        quorum = get_quorum()
        assert node.getavalancheinfo()["ready_to_poll"] is True
        poll_node = quorum[0]

        def has_accepted_tip(blockhash):
            can_find_inv_in_poll(quorum, int(blockhash, 16))
            return node.getbestblockhash() == blockhash

        def has_finalized_tip(blockhash):
            return has_accepted_tip(blockhash) and node.isfinalblock(blockhash)

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

        def submit_new_block_then_accept(expect_initially_accepted):
            tip = node.getbestblockhash()

            cb = create_coinbase(node.getblockcount() + 1)
            block = create_block(
                int(tip, 16), cb, node.getblock(tip)["time"] + 1, version=4
            )
            block.solve()
            node.submitblock(ToHex(block))

            # Check the current tip is what we expect
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

            return block

        # Before activation, rtt is disabled and fast blocks are accepted
        now = AUGUSTO_ACTIVATION - 6
        node.setmocktime(now)

        # Mine a first block to get a reference time for the
        # submit_new_block_then_accept calls which increase each block timestamp
        # by 1
        self.generate(node, 1)

        for _ in range(11):
            # The block template doesn't include the rtt parameters
            assert "rtt" not in node.getblocktemplate()
            submit_new_block_then_accept(expect_initially_accepted=True)

        # Now augusto has activated
        activation_hash = node.getbestblockhash()
        assert_greater_than_or_equal(
            node.getblock(activation_hash, 2)["mediantime"], AUGUSTO_ACTIVATION
        )

        # The block template now includes the rtt parameters and fast blocks are
        # rejected
        assert "rtt" in node.getblocktemplate()
        with node.assert_debug_log(["policy-bad-rtt"]):
            submit_new_block_then_accept(expect_initially_accepted=False)

        # Reorg the block so we de-activate augusto
        node.parkblock(activation_hash)

        # Bump mocktime by 1s to make sure we don't end up with the same block
        # as before. Now fast blocks are accepted again
        assert "rtt" not in node.getblocktemplate()
        submit_new_block_then_accept(expect_initially_accepted=True)

        # It's now reactivated
        assert "rtt" in node.getblocktemplate()
        with node.assert_debug_log(["policy-bad-rtt"]):
            submit_new_block_then_accept(expect_initially_accepted=False)

        # "Slow" blocks are still acceptable. Bump time by a large amount as we
        # got lots of blocks in a short time window in this test. Note that the
        # block timestamp doesn't matter as RTT is based on reception time.
        now += 6000
        node.setmocktime(now)
        submit_new_block_then_accept(expect_initially_accepted=True)


if __name__ == "__main__":
    AbcRTTActivationTest().main()
