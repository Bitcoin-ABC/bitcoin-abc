# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of stake contender preconsensus via avalanche."""
import time

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.key import ECPubKey
from test_framework.messages import (
    MSG_AVA_STAKE_CONTENDER,
    AvalancheContenderVoteError,
    AvalancheVote,
    hash256,
    ser_uint256,
)
from test_framework.p2p import p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex

QUORUM_NODE_COUNT = 16


class AvalancheContenderVotingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avalanchestakingpreconsensus=1",
                "-avalanchestakingrewards=1",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
                "-persistavapeers=0",
            ],
        ]
        self.supports_cli = False

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        node = self.nodes[0]

        # Set mock time so we can control when proofs will be considered for staking rewards
        now = int(time.time())
        node.setmocktime(now)

        # Build a fake quorum of nodes.
        def get_quorum():
            def new_ava_interface(node):
                # Generate a unique payout script for each proof so we can accurately test the stake winners
                payoutAddress = node.getnewaddress()
                peer = get_ava_p2p_interface(self, node, payoutAddress=payoutAddress)

                # This test depends on each proof being added to the contender cache before
                # the next block arrives, so we wait until that happens.
                blockhash = node.getbestblockhash()
                self.wait_until(
                    lambda: node.getstakecontendervote(
                        blockhash, uint256_hex(peer.proof.proofid)
                    )
                    == AvalancheContenderVoteError.PENDING
                )
                return peer

            return [new_ava_interface(node) for _ in range(0, QUORUM_NODE_COUNT)]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()
        poll_node = quorum[0]

        assert node.getavalancheinfo()["ready_to_poll"] is True

        def has_finalized_proof(proofid):
            can_find_inv_in_poll(quorum, proofid)
            return node.getrawavalancheproof(uint256_hex(proofid))["finalized"]

        for peer in quorum:
            self.wait_until(lambda: has_finalized_proof(peer.proof.proofid))

        # Get the key so we can verify signatures.
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        def assert_response(expected):
            response = poll_node.wait_for_avaresponse()
            r = response.response

            # Verify signature
            assert avakey.verify_schnorr(response.sig, r.get_hash())

            votes = r.votes
            assert_equal(len(votes), len(expected))
            for i in range(0, len(votes)):
                assert_equal(repr(votes[i]), repr(expected[i]))

        def make_contender_id(prevblockhash, proofid):
            return int.from_bytes(
                hash256(ser_uint256(int(prevblockhash, 16)) + ser_uint256(proofid)),
                "little",
            )

        # Before finalizing any blocks, no contender promotion occurs in the cache,
        # so the only way to test if the node knows about a particular contender is
        # to check it at the block height that the proof was first seen at.
        for i in range(0, QUORUM_NODE_COUNT):
            # We started with a clean chain and a new block is mined when creating
            # each quorum proof to make it valid, so the first block the proof was
            # seen at is the quorum proof's index + 1.
            blockhash = node.getblockhash(i + 1)
            poll_ids = []
            expected = []
            for p in range(0, QUORUM_NODE_COUNT):
                contender_proof = quorum[p].proof
                contender_id = make_contender_id(blockhash, contender_proof.proofid)
                poll_ids.append(contender_id)
                # If the node knows about the contender, it will respond as INVALID
                expected_vote = (
                    AvalancheContenderVoteError.PENDING
                    if p == i
                    else AvalancheContenderVoteError.UNKNOWN
                )
                expected.append(AvalancheVote(expected_vote, contender_id))
            poll_node.send_poll(poll_ids, inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(expected)

        # Unknown contender
        unknown_contender_id = 0x123
        poll_node.send_poll([unknown_contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
        assert_response(
            [AvalancheVote(AvalancheContenderVoteError.UNKNOWN, unknown_contender_id)]
        )

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        # Finalize a block so we promote the contender cache with every block
        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_tip(tip))
        assert_equal(node.getbestblockhash(), tip)

        # Now trigger building the whole cache for a block
        tip = self.generate(node, 1)[0]

        # Unknown contender is still unknown
        poll_node.send_poll([unknown_contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
        assert_response(
            [AvalancheVote(AvalancheContenderVoteError.UNKNOWN, unknown_contender_id)]
        )

        def get_all_contender_ids(tip):
            return [make_contender_id(tip, peer.proof.proofid) for peer in quorum]

        # All contenders are pending. They cannot be winners yet since mock time
        # has not advanced past the staking rewards minimum registration delay.
        for contender_id in get_all_contender_ids(tip):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                [AvalancheVote(AvalancheContenderVoteError.PENDING, contender_id)]
            )

        # Advance time past the staking rewards minimum registration delay and
        # mine a block.
        now += 90 * 60 + 1
        node.setmocktime(now)
        tip = self.generate(node, 1)[0]

        # Staking rewards has been computed. Check vote for all contenders.
        contenders = get_all_contender_ids(tip)
        local_winner_proofid = int(node.getstakingreward(tip)[0]["proofid"], 16)
        local_winner_cid = make_contender_id(tip, local_winner_proofid)

        poll_node.send_poll(contenders, inv_type=MSG_AVA_STAKE_CONTENDER)
        assert_response(
            [
                AvalancheVote(
                    (
                        AvalancheContenderVoteError.ACCEPTED
                        if cid == local_winner_cid
                        else AvalancheContenderVoteError.INVALID
                    ),
                    cid,
                )
                for cid in contenders
            ]
        )

        # Answer polls until contenders start polling
        self.wait_until(lambda: can_find_inv_in_poll(quorum, local_winner_cid))

        def get_polled_contenders():
            # Pop a poll from any peer
            def wait_for_poll():
                self.wait_until(lambda: any(len(peer.avapolls) > 0 for peer in quorum))
                with p2p_lock:
                    for peer in quorum:
                        if len(peer.avapolls) > 0:
                            return peer.avapolls.pop(0)
                return None

            poll = wait_for_poll()
            assert poll is not None
            return [
                inv.hash for inv in poll.invs if inv.type == MSG_AVA_STAKE_CONTENDER
            ]

        # Check that the local winner was polled
        polled_contenders = get_polled_contenders()
        assert local_winner_cid in polled_contenders

        # Check that the max number of contenders were polled
        assert_equal(len(polled_contenders), 12)

        # Manually set a winner that isn't the local winner
        manual_winner = (
            quorum[0].proof
            if local_winner_proofid != quorum[0].proof.proofid
            else quorum[1].proof
        )
        manual_winner_cid = make_contender_id(tip, manual_winner.proofid)
        node.setstakingreward(tip, manual_winner.payout_script.hex())
        poll_node.send_poll([manual_winner_cid], inv_type=MSG_AVA_STAKE_CONTENDER)
        assert_response(
            [AvalancheVote(AvalancheContenderVoteError.ACCEPTED, manual_winner_cid)]
        )


if __name__ == "__main__":
    AvalancheContenderVotingTest().main()
