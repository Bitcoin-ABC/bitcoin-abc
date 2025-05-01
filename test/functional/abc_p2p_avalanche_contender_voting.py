# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of stake contender preconsensus via avalanche."""
import math
import time

from test_framework.authproxy import JSONRPCException
from test_framework.avatools import (
    AvaP2PInterface,
    assert_response,
    avalanche_proof_from_hex,
    build_msg_avaproofs,
    can_find_inv_in_poll,
    create_coinbase_stakes,
    gen_proof,
    get_ava_p2p_interface,
    get_proof_ids,
)
from test_framework.key import ECKey, ECPubKey
from test_framework.messages import (
    MSG_AVA_STAKE_CONTENDER,
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalancheContenderVoteError,
    AvalancheDelegation,
    AvalancheVote,
    FromHex,
    hash256,
    ser_uint256,
)
from test_framework.p2p import p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_greater_than, uint256_hex
from test_framework.wallet_util import bytes_to_wif

QUORUM_NODE_COUNT = 16
AVALANCHE_CLEANUP_INTERVAL = 5 * 60
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
        def get_quorum(stake_utxo_confirmations=1, proof_data=None):
            def new_ava_interface(node, i):
                # Generate a unique payout script for each proof so we can accurately test the stake winners
                if not proof_data:
                    payoutAddress = node.getnewaddress()
                    peer = get_ava_p2p_interface(
                        self,
                        node,
                        payoutAddress=payoutAddress,
                        stake_utxo_confirmations=stake_utxo_confirmations,
                    )
                else:
                    assert_greater_than(len(proof_data), i)

                    peer = AvaP2PInterface()
                    peer.master_privkey = proof_data[i]["privkey"]
                    peer.proof = proof_data[i]["proof"]

                    assert node.verifyavalancheproof(peer.proof.serialize().hex())

                    delegation_hex = node.delegateavalancheproof(
                        uint256_hex(peer.proof.limited_proofid),
                        bytes_to_wif(peer.master_privkey.get_bytes()),
                        peer.delegated_privkey.get_pubkey().get_bytes().hex(),
                    )
                    assert node.verifyavalanchedelegation(delegation_hex)
                    peer.delegation = FromHex(AvalancheDelegation(), delegation_hex)

                    node.add_p2p_connection(
                        peer, services=NODE_NETWORK | NODE_AVALANCHE
                    )
                    peer.nodeid = node.getpeerinfo()[-1]["id"]

                    def avapeer_connected():
                        node_list = []
                        try:
                            node_list = node.getavalanchepeerinfo(
                                uint256_hex(peer.proof.proofid)
                            )[0]["node_list"]
                        except BaseException:
                            pass

                        return peer.nodeid in node_list

                    self.wait_until(avapeer_connected)

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

            return [new_ava_interface(node, i) for i in range(0, QUORUM_NODE_COUNT)]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()
        tip = node.getbestblockhash()
        poll_node = quorum[0]

        assert node.getavalancheinfo()["ready_to_poll"] is True

        def has_finalized_proof(proofid):
            can_find_inv_in_poll(
                quorum,
                proofid,
                response_map={
                    MSG_AVA_STAKE_CONTENDER: AvalancheContenderVoteError.UNKNOWN
                },
            )
            return node.getrawavalancheproof(uint256_hex(proofid))["finalized"]

        for peer in quorum:
            self.wait_until(lambda: has_finalized_proof(peer.proof.proofid))

        # Get the key so we can verify signatures.
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        def make_contender_id(prevblockhash, proofid):
            return int.from_bytes(
                hash256(ser_uint256(int(prevblockhash, 16)) + ser_uint256(proofid)),
                "little",
            )

        # Unknown contender
        unknown_contender_id = 0x123
        poll_node.send_poll([unknown_contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheContenderVoteError.UNKNOWN, unknown_contender_id)],
        )

        self.log.info("Check votes after contender promotion")

        def proof_reward_rank(contender_id, proof_score):
            return (256.0 - math.log2(contender_id)) / proof_score

        def get_all_contender_ids(tip, proofs=None):
            # Determine all possible contenders IDs for the given block.
            # The first 12 (best scores) will be polled.
            if not proofs:
                proofs = [peer.proof for peer in quorum]

            proofs_and_cids = [
                (proof, make_contender_id(tip, proof.proofid)) for proof in proofs
            ]
            proofs_and_cids = sorted(
                proofs_and_cids,
                key=lambda proof_and_cid: proof_reward_rank(
                    proof_and_cid[1], proof_and_cid[0].get_score()
                ),
            )
            return [proof_and_cid[1] for proof_and_cid in proofs_and_cids]

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
                    r = AvalancheContenderVoteError.UNKNOWN

                    # Only accept contenders that should be winners
                    if inv.type == MSG_AVA_STAKE_CONTENDER:
                        r = (
                            winnerVote
                            if inv.hash in winners
                            else AvalancheContenderVoteError.INVALID
                        )

                    votes.append(AvalancheVote(r, inv.hash))

                n.send_avaresponse(poll.round, votes, n.delegated_privkey)

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

        # Some contenders may have been finalized already while finalizing the proofs.
        # Mine a block to trigger contender promotion and start from a clean slate.
        tip = self.generate(node, 1)[0]

        # Finalize any contenders that might have been polled since the quorum became active
        # so we do not have any unanswered polls before calling find_polled_contenders.
        finalize_contenders(tip, [])

        # Mining a block will promote contenders to the new block
        tip = self.generate(node, 1)[0]

        # Unknown contender is still unknown
        poll_node.send_poll([unknown_contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheContenderVoteError.UNKNOWN, unknown_contender_id)],
        )

        # All contenders are pending. They cannot be winners yet since mock time
        # has not advanced past the staking rewards minimum registration delay.
        for contender_id in get_all_contender_ids(tip):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(AvalancheContenderVoteError.PENDING, contender_id)],
            )

        def find_polled_contenders(local_winner_contender_id=None):
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

                if local_winner_contender_id:
                    # Local winner must be polled
                    if local_winner_contender_id not in polled_contenders:
                        return False

                # Max number of contenders was polled
                if len(polled_contenders) == 12:
                    return True

            return False

        # Contenders get polled even though there is no local staking reward winner yet.
        # This helps in the case that the local winner fails to compute, but the network
        # can still finalize a winner. For example, a poorly connected node could have
        # proofs go dangling and then come back, but their registration times would be
        # too early to be selected for staking rewards for a short time.
        self.wait_until(lambda: find_polled_contenders())

        # Finalize contenders so we do not have any unanswered polls before calling find_polled_contenders again
        finalize_contenders(tip, [])

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
            poll_node,
            avakey,
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
            ],
        )

        self.wait_until(lambda: find_polled_contenders(local_winner_cid))

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
            poll_node,
            avakey,
            [AvalancheVote(AvalancheContenderVoteError.ACCEPTED, manual_winner_cid)],
        )

        self.log.info("Vote on contenders: manual winner + local winner")

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
                key=lambda w: proof_reward_rank(make_contender_id(tip, w[0]), 5000),
            )
            exp_rejected_winners = sorted(
                set(exp_rejected_winners),
                key=lambda w: proof_reward_rank(make_contender_id(tip, w[0]), 5000),
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
            assert_response(poll_node, avakey, expected)

        # Manual winner should already be a winner even though it isn't finalized
        check_stake_winners(tip, [(0, manual_winner.payout_script.hex())], [], [])

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

        # Build the proofs for the quorum so we don't mine any block after the
        # restart, and make them mature. Note that the proof staked amount is
        # only 45M XEC each because of the staking rewards in the blocks
        # coinbase.
        proof_data = []
        for _ in range(QUORUM_NODE_COUNT):
            payout_address = node.getnewaddress()
            privkey, proof = gen_proof(self, node, payoutAddress=payout_address)

            proof_data.append(
                {
                    "privkey": privkey,
                    "proof": proof,
                    "payout_address": payout_address,
                }
            )

        self.generate(node, 3)
        tip_before_restart = node.getbestblockhash()

        # From there the check_stake_winners function won't work as it assumes
        # the staked amount is 50M XEC per proof
        del check_stake_winners

        # Restart the node. Persisted ava peers should be re-added to the cache.
        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [
                # After restart we will have a new quorum worth 16 * 45M XEC,
                # but also dangling proofs worth 16* 50M XEC due to avapeeers
                # persistency
                "-avaminquorumconnectedstakeratio=0.4",
                "-avaproofstakeutxoconfirmations=3",
            ],
        )

        now = int(time.time())
        node.setmocktime(now)

        old_quorum = quorum
        quorum = get_quorum(stake_utxo_confirmations=3, proof_data=proof_data)
        poll_node = quorum[0]

        assert node.getavalancheinfo()["ready_to_poll"] is True

        # Make sure we mined no block since restarting
        tip = node.getbestblockhash()
        assert_equal(tip, tip_before_restart)

        # Even though we haven't mined a block since restarting, contenders are
        # immediately polled once quorum is established.
        self.wait_until(lambda: find_polled_contenders())

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

        # It is possible staking rewards are not ready depending if they were computed before or
        # after proofs were finalized.
        def expected_contender_poll_response(tip):
            try:
                if len(node.getstakingreward(tip)) > 0:
                    return AvalancheContenderVoteError.ACCEPTED
            except JSONRPCException:
                # An exception is thrown if staking rewards cannot be computed
                pass
            return AvalancheContenderVoteError.PENDING

        expected_response = expected_contender_poll_response(tip)

        # Sanity check that new quorum contenders can be polled even though we have not mined a block yet
        for contender_id in get_all_contender_ids(tip):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(expected_response, contender_id)],
            )

        # Proofs from the prior quorum that were persisted were loaded back into the contender cache
        for contender_id in get_all_contender_ids(
            tip, [p.proof for p in old_quorum[:-1]]
        ):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(expected_response, contender_id)],
            )

        # Make proof dangling
        now += 15 * 60 + 1
        node.setmocktime(now)
        node.mockscheduler(AVALANCHE_CLEANUP_INTERVAL)
        self.wait_until(lambda: old_quorum[-1].proof.proofid not in get_proof_ids(node))

        # Trigger contenders promotion
        tip = self.generate(node, 1)[0]
        expected_response = expected_contender_poll_response(tip)

        # Check last proof was not promoted
        contender_id = make_contender_id(tip, old_quorum[-1].proof.proofid)
        poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheContenderVoteError.UNKNOWN, contender_id)],
        )

        # Sanity check
        for contender_id in get_all_contender_ids(tip):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(expected_response, contender_id)],
            )

        # All proofs from the prior quorum were promoted except the last
        for contender_id in get_all_contender_ids(
            tip, [p.proof for p in old_quorum[:-1]]
        ):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(expected_response, contender_id)],
            )

        # Set last proof as remote
        prefilled_proofs = [old_quorum[-1].proof]
        peer_with_getavaproofs = peer_has_getavaproofs()
        peer_with_getavaproofs.send_message(
            build_msg_avaproofs(prefilled_proofs, prefilled_proofs)
        )
        with p2p_lock:
            # Reset the count so we don't pick this peer again unless it received another
            # getavaproofs message.
            peer_with_getavaproofs.message_count["getavaproofs"] = 0

        # Trigger contenders promotion
        tip = self.generate(node, 1)[0]
        expected_response = expected_contender_poll_response(tip)

        # Sanity check
        for contender_id in get_all_contender_ids(tip):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(expected_response, contender_id)],
            )

        # All proofs from the prior quorum were promoted
        for contender_id in get_all_contender_ids(tip, [p.proof for p in old_quorum]):
            poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(expected_response, contender_id)],
            )

        self.log.info("Check votes when immature proof matures")

        # Build a valid but immature proof
        addrkey0 = node.get_deterministic_priv_key()
        stakes = create_coinbase_stakes(node, [tip], addrkey0.key)
        privkey = ECKey()
        privkey.generate()
        immature_proof = avalanche_proof_from_hex(
            node.buildavalancheproof(
                0, 0, bytes_to_wif(privkey.get_bytes()), stakes, node.getnewaddress()
            )
        )

        # Send the proof to node
        peer_has_getavaproofs().send_message(
            build_msg_avaproofs([immature_proof], [immature_proof])
        )

        def check_immature_proofs(immature_proofs):
            return sorted(node.getavalancheproofs()["immature"]) == sorted(
                immature_proofs
            )

        # Verify the proof is immature
        self.wait_until(
            lambda: check_immature_proofs([uint256_hex(immature_proof.proofid)])
        )

        # For the block where the immature proof was introduced, the proof's
        # contender vote is unknown (contender id is not in the cache, and we
        # can't check if the proofid is immature because polling does not reveal
        # a contender's proofid.
        contender_id = make_contender_id(tip, immature_proof.proofid)
        poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheContenderVoteError.UNKNOWN, contender_id)],
        )

        # Trigger contenders promotion
        tip = self.generate(node, 1)[0]

        # The proof is not mature yet. Contender status should still be unknown.
        contender_id = make_contender_id(tip, immature_proof.proofid)
        poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheContenderVoteError.UNKNOWN, contender_id)],
        )

        # Trigger contenders promotion and mature the proof
        tip = self.generate(node, 1)[0]
        expected_response = expected_contender_poll_response(tip)
        self.wait_until(lambda: check_immature_proofs([]))

        # The proof is now mature so it has been added to the contender cache.
        # Its vote status is pending because staking rewards are not active yet.
        contender_id = make_contender_id(tip, immature_proof.proofid)
        poll_node.send_poll([contender_id], inv_type=MSG_AVA_STAKE_CONTENDER)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(expected_response, contender_id)],
        )


if __name__ == "__main__":
    AvalancheContenderVotingTest().main()
