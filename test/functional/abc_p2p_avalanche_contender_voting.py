# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of stake contender preconsensus via avalanche."""
import math
import time

from test_framework.avatools import (
    build_msg_avaproofs,
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
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
AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL = 5 * 60


class AvalancheContenderVotingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avalanchestakingpreconsensus=1",
                "-avalanchestakingrewards=1",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-avastalevotethreshold=160",
                "-avastalevotefactor=1",
                "-simplegbt",
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

        self.log.info("Check votes before first finalized block")

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

        self.log.info(
            "Check votes after a finalized block has triggered contender promotion"
        )

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

        def get_all_contender_ids(tip, proofids=None):
            # Determine all possible contenders IDs for the given block.
            # The first 12 (best scores) will be polled.
            if not proofids:
                proofids = [peer.proof.proofid for peer in quorum]
            return sorted(
                [make_contender_id(tip, proofid) for proofid in proofids],
                key=lambda cid: (256.0 - math.log2(cid)) / 5000,
            )

        # All contenders are pending. They cannot be winners yet since mock time
        # has not advanced past the staking rewards minimum registration delay.
        for contender_id in get_all_contender_ids(tip):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                [AvalancheVote(AvalancheContenderVoteError.PENDING, contender_id)]
            )

        self.log.info("Check votes after staking rewards have been computed")

        # Advance time past the staking rewards minimum registration delay and
        # mine a block.
        now += 90 * 60 + 1
        node.setmocktime(now)
        tip = self.generate(node, 1)[0]

        # Staking rewards has been computed. Check vote for all contenders.
        contenders = get_all_contender_ids(tip)
        staking_reward = node.getstakingreward(tip)
        local_winner_payout_script = staking_reward[0]["hex"]
        local_winner_proofid = int(staking_reward[0]["proofid"], 16)
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

        def find_polled_contenders():
            # Answer polls until contenders start polling
            for n in quorum:
                poll = n.get_avapoll_if_available()

                if poll is None:
                    continue

                votes = []
                polled_contenders = []
                for inv in poll.invs:
                    votes.append(
                        AvalancheVote(AvalancheContenderVoteError.ACCEPTED, inv.hash)
                    )
                    if inv.type == MSG_AVA_STAKE_CONTENDER:
                        polled_contenders.append(inv.hash)

                n.send_avaresponse(poll.round, votes, n.delegated_privkey)

                if len(polled_contenders) > 0:
                    # Local winner must be polled
                    assert local_winner_cid in polled_contenders
                    # Max number of contenders was polled
                    assert_equal(len(polled_contenders), 12)
                    return True

            return False

        self.wait_until(lambda: find_polled_contenders())

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

        self.log.info("Vote on contenders: manual winner + local winner")

        def vote_all_contenders(
            winners, winnerVote=AvalancheContenderVoteError.ACCEPTED
        ):
            for n in quorum:
                poll = n.get_avapoll_if_available()

                # That node has not received a poll
                if poll is None:
                    continue

                votes = []
                for inv in poll.invs:
                    r = AvalancheContenderVoteError.ACCEPTED

                    # Only accept contenders that should be winners
                    if inv.type == MSG_AVA_STAKE_CONTENDER:
                        r = (
                            winnerVote
                            if inv.hash in winners
                            else AvalancheContenderVoteError.INVALID
                        )

                    votes.append(AvalancheVote(r, inv.hash))

                n.send_avaresponse(poll.round, votes, n.delegated_privkey)

        def check_stake_winners(
            tip, exp_manual_winners, exp_accepted_winners, exp_rejected_winners
        ):
            reward = node.getstakingreward(tip)
            winners = []
            for winner in reward:
                winners.append((int(winner["proofid"], 16), winner["hex"]))

            # Sort winners by rank, but manual winners are always first if they exist
            exp_accepted_winners = sorted(
                set(exp_accepted_winners),
                key=lambda w: (
                    (256.0 - math.log2(make_contender_id(tip, w[0]))) / 5000
                ),
            )
            exp_rejected_winners = sorted(
                set(exp_rejected_winners),
                key=lambda w: (
                    (256.0 - math.log2(make_contender_id(tip, w[0]))) / 5000
                ),
            )

            exp_winners = (
                exp_manual_winners + exp_accepted_winners + exp_rejected_winners
            )
            assert_equal(exp_winners, winners)

            # Check gbt contains the best winner
            gbt = node.getblocktemplate()
            assert "stakingrewards" in gbt
            assert_equal(gbt["stakingrewards"]["script"], exp_winners[0][1])

            # Check poll statuses for sanity
            poll_ids = []
            expected = []
            for w in exp_accepted_winners:
                contender_id = make_contender_id(tip, w[0])
                poll_ids.append(contender_id)
                expected.append(
                    AvalancheVote(AvalancheContenderVoteError.ACCEPTED, contender_id)
                )
            for w in exp_rejected_winners:
                contender_id = make_contender_id(tip, w[0])
                poll_ids.append(contender_id)
                expected.append(
                    AvalancheVote(AvalancheContenderVoteError.INVALID, contender_id)
                )
            poll_node.send_poll(poll_ids, inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(expected)

        # Manual winner should already be a winner even though it isn't finalized
        check_stake_winners(tip, [(0, manual_winner.payout_script.hex())], [], [])

        def finalize_contenders(tip, winner_contenders):
            loser_contenders = get_all_contender_ids(tip)[:12]
            for winner in winner_contenders:
                loser_contenders.remove(winner)

            with node.wait_for_debug_log(
                [
                    f"Avalanche finalized contender {uint256_hex(cid)}".encode()
                    for cid in winner_contenders
                ]
                + [
                    f"Avalanche invalidated contender {uint256_hex(cid)}".encode()
                    for cid in loser_contenders
                ],
                chatty_callable=lambda: vote_all_contenders(winner_contenders),
            ):
                pass

        # Finalize the local winner and invalidate contender associated with
        # the manual winner. Although we don't normally want to poll for manual
        # winners, the polling was kicked off before the manual winner was set.
        finalize_contenders(tip, [local_winner_cid])
        check_stake_winners(
            tip,
            [(0, manual_winner.payout_script.hex())],
            [(local_winner_proofid, local_winner_payout_script)],
            [],
        )

        self.log.info("Vote on contenders: local winner only")

        tip = self.generate(node, 1)[0]
        staking_reward = node.getstakingreward(tip)
        local_winner_payout_script = staking_reward[0]["hex"]
        local_winner_proofid = int(staking_reward[0]["proofid"], 16)
        local_winner_cid = make_contender_id(tip, local_winner_proofid)

        # Local winner is the stake winner even though we haven't finalized it yet
        check_stake_winners(
            tip, [], [(local_winner_proofid, local_winner_payout_script)], []
        )

        finalize_contenders(tip, [local_winner_cid])

        # Sanity check there are no other winners
        check_stake_winners(
            tip, [], [(local_winner_proofid, local_winner_payout_script)], []
        )

        for numWinners in range(1, 4):
            self.log.info(
                f"Vote on contenders: {numWinners} winner(s) other than local winner"
            )

            tip = self.generate(node, 1)[0]
            staking_reward = node.getstakingreward(tip)
            local_winner_payout_script = staking_reward[0]["hex"]
            local_winner_proofid = int(staking_reward[0]["proofid"], 16)
            local_winner_cid = make_contender_id(tip, local_winner_proofid)

            # Local winner is the stake winner before we finalize
            check_stake_winners(
                tip, [], [(local_winner_proofid, local_winner_payout_script)], []
            )

            # Finalize some winners
            contenders = get_all_contender_ids(tip)[:12]
            contenders.remove(local_winner_cid)
            finalize_contenders(tip, contenders[:numWinners])

            # Sanity check the winners. The local winner remains even though it was invalidated, however it is sorted last.
            winners = []
            for winner_cid in contenders[:numWinners]:
                proof = next(
                    (
                        peer.proof
                        for peer in quorum
                        if make_contender_id(tip, peer.proof.proofid) == winner_cid
                    )
                )
                winners.append((proof.proofid, proof.payout_script.hex()))
            check_stake_winners(
                tip, [], winners, [(local_winner_proofid, local_winner_payout_script)]
            )

        self.log.info("Vote on contenders: zero winners")

        tip = self.generate(node, 1)[0]
        staking_reward = node.getstakingreward(tip)
        local_winner_payout_script = staking_reward[0]["hex"]
        local_winner_proofid = int(staking_reward[0]["proofid"], 16)

        # Local winner is the stake winner before we finalize
        check_stake_winners(
            tip, [], [(local_winner_proofid, local_winner_payout_script)], []
        )

        # Invalidate all contenders
        finalize_contenders(tip, [])

        # Local winner did not change
        check_stake_winners(
            tip, [], [], [(local_winner_proofid, local_winner_payout_script)]
        )

        self.log.info("Vote on contenders: stale contenders")

        tip = self.generate(node, 1)[0]
        staking_reward = node.getstakingreward(tip)
        local_winner_payout_script = staking_reward[0]["hex"]
        local_winner_proofid = int(staking_reward[0]["proofid"], 16)

        # Local winner is the stake winner before we finalize
        check_stake_winners(
            tip, [], [(local_winner_proofid, local_winner_payout_script)], []
        )

        # Stale all contenders
        contenders = get_all_contender_ids(tip)[:12]
        with node.wait_for_debug_log(
            [
                f"Avalanche stalled contender {uint256_hex(cid)}".encode()
                for cid in contenders
            ],
            chatty_callable=lambda: vote_all_contenders(
                contenders, AvalancheContenderVoteError.PENDING
            ),
        ):
            pass

        # Local winner did not change because it was not replaced with a finalized contender
        check_stake_winners(
            tip, [], [(local_winner_proofid, local_winner_payout_script)], []
        )

        self.log.info("Check votes after node restart")

        # Restart the node. Persisted ava peers should be re-added to the cache.
        self.restart_node(
            0, extra_args=self.extra_args[0] + ["-avaminquorumconnectedstakeratio=0.5"]
        )
        self.wait_until(lambda: node.getbestblockhash() == tip)

        old_quorum = quorum
        quorum = get_quorum()
        poll_node = quorum[0]

        assert node.getavalancheinfo()["ready_to_poll"] is True

        for peer in quorum:
            self.wait_until(lambda: has_finalized_proof(peer.proof.proofid))

        def peer_has_getavaproofs():
            with p2p_lock:
                for peer in quorum:
                    if peer.message_count.get("getavaproofs", 0) > 0:
                        return peer
            return None

        # Trigger periodic request for getavaproofs
        node.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)
        self.wait_until(lambda: peer_has_getavaproofs() is not None)

        # Send proofs to node so they are marked as remote and will be promoted. But skip
        # the last proof so we can test that proofs missing promotion are re-added to the cache.
        prefilled_proofs = sorted(
            [peer.proof for peer in old_quorum[:-1]], key=lambda p: p.proofid
        )
        peer_with_getavaproofs = peer_has_getavaproofs()
        peer_with_getavaproofs.send_message(
            build_msg_avaproofs(prefilled_proofs, prefilled_proofs)
        )
        with p2p_lock:
            # Reset the count so we don't pick this peer again unless it received another
            # getavaproofs message.
            peer_with_getavaproofs.message_count["getavaproofs"] = 0

        # Get the key so we can verify signatures.
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        # Need a finalized block to promote contenders
        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_tip(tip))

        # Trigger building the whole cache for a new block since we cannot be
        # certain what the tip was when the persisted proofs were registered.
        tip = self.generate(node, 1)[0]

        # Sanity check
        for contender_id in get_all_contender_ids(tip):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                [AvalancheVote(AvalancheContenderVoteError.PENDING, contender_id)]
            )

        # Proofs from the prior quorum that were persisted were loaded back into the contender cache
        for contender_id in get_all_contender_ids(
            tip, [p.proof.proofid for p in old_quorum[:-1]]
        ):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                [AvalancheVote(AvalancheContenderVoteError.PENDING, contender_id)]
            )

        # Set last proof as remote
        prefilled_proofs = [old_quorum[-1].proof]
        peer_has_getavaproofs().send_message(
            build_msg_avaproofs(prefilled_proofs, prefilled_proofs)
        )

        # Trigger contenders promotion
        tip = self.generate(node, 1)[0]

        # Sanity check
        for contender_id in get_all_contender_ids(tip):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                [AvalancheVote(AvalancheContenderVoteError.PENDING, contender_id)]
            )

        # All proofs from the prior quorum were promoted
        for contender_id in get_all_contender_ids(
            tip, [p.proof.proofid for p in old_quorum]
        ):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                [AvalancheVote(AvalancheContenderVoteError.PENDING, contender_id)]
            )


if __name__ == "__main__":
    AvalancheContenderVotingTest().main()
