#!/usr/bin/env python3
# Copyright (c) 2020-2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of forks via avalanche."""
import random

from test_framework.avatools import get_ava_p2p_interface
from test_framework.key import ECPubKey
from test_framework.messages import AvalancheVote, AvalancheVoteError
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

QUORUM_NODE_COUNT = 16


class AvalancheTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.extra_args = [
            [
                '-avalanche=1',
                '-avaproofstakeutxodustthreshold=1000000',
                '-avaproofstakeutxoconfirmations=1',
                '-avacooldown=0',
                '-avaminquorumstake=0',
                '-avaminavaproofsnodecount=0',
                '-whitelist=noban@127.0.0.1',
            ],
            [
                '-avalanche=1',
                '-avaproofstakeutxoconfirmations=1',
                '-avacooldown=0',
                '-avaminquorumstake=0',
                '-avaminavaproofsnodecount=0',
                '-noparkdeepreorg',
                '-maxreorgdepth=-1',
                '-whitelist=noban@127.0.0.1',
            ],
        ]
        self.supports_cli = False
        self.rpc_timeout = 120

    def run_test(self):
        node = self.nodes[0]

        # Build a fake quorum of nodes.
        def get_quorum():
            return [get_ava_p2p_interface(self, node)
                    for _ in range(0, QUORUM_NODE_COUNT)]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()
        poll_node = quorum[0]

        assert node.getavalancheinfo()['ready_to_poll'] is True

        # Generate many block and poll for them.
        self.generate(node, 100 - node.getblockcount())

        fork_node = self.nodes[1]

        # Get the key so we can verify signatures.
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        self.log.info("Poll for the chain tip...")
        best_block_hash = int(node.getbestblockhash(), 16)
        poll_node.send_poll([best_block_hash])

        def assert_response(expected):
            response = poll_node.wait_for_avaresponse()
            r = response.response
            assert_equal(r.cooldown, 0)

            # Verify signature.
            assert avakey.verify_schnorr(response.sig, r.get_hash())

            votes = r.votes
            assert_equal(len(votes), len(expected))
            for i in range(0, len(votes)):
                assert_equal(repr(votes[i]), repr(expected[i]))

        assert_response(
            [AvalancheVote(AvalancheVoteError.ACCEPTED, best_block_hash)])

        self.log.info("Poll for a selection of blocks...")
        various_block_hashes = [
            int(node.getblockhash(0), 16),
            int(node.getblockhash(1), 16),
            int(node.getblockhash(10), 16),
            int(node.getblockhash(25), 16),
            int(node.getblockhash(42), 16),
            int(node.getblockhash(96), 16),
            int(node.getblockhash(99), 16),
            int(node.getblockhash(100), 16),
        ]

        poll_node.send_poll(various_block_hashes)
        assert_response([AvalancheVote(AvalancheVoteError.ACCEPTED, h)
                         for h in various_block_hashes])

        self.log.info(
            "Poll for a selection of blocks, but some are now invalid...")
        invalidated_block = node.getblockhash(76)
        node.invalidateblock(invalidated_block)
        # We need to send the coin to a new address in order to make sure we do
        # not regenerate the same block.
        self.generatetoaddress(node,
                               26, 'ecregtest:pqv2r67sgz3qumufap3h2uuj0zfmnzuv8v38gtrh5v', sync_fun=self.no_op)
        node.reconsiderblock(invalidated_block)

        poll_node.send_poll(various_block_hashes)
        assert_response([AvalancheVote(AvalancheVoteError.ACCEPTED, h) for h in various_block_hashes[:5]] +
                        [AvalancheVote(AvalancheVoteError.FORK, h) for h in various_block_hashes[-3:]])

        self.log.info("Poll for unknown blocks...")
        various_block_hashes = [
            int(node.getblockhash(0), 16),
            int(node.getblockhash(25), 16),
            int(node.getblockhash(42), 16),
            various_block_hashes[5],
            various_block_hashes[6],
            various_block_hashes[7],
            random.randrange(1 << 255, (1 << 256) - 1),
            random.randrange(1 << 255, (1 << 256) - 1),
            random.randrange(1 << 255, (1 << 256) - 1),
        ]
        poll_node.send_poll(various_block_hashes)
        assert_response([AvalancheVote(AvalancheVoteError.ACCEPTED, h) for h in various_block_hashes[:3]] +
                        [AvalancheVote(AvalancheVoteError.FORK, h) for h in various_block_hashes[3:6]] +
                        [AvalancheVote(AvalancheVoteError.UNKNOWN, h) for h in various_block_hashes[-3:]])

        self.log.info("Trigger polling from the node...")

        def can_find_block_in_poll(hash, resp=AvalancheVoteError.ACCEPTED):
            found_hash = False
            for n in quorum:
                poll = n.get_avapoll_if_available()

                # That node has not received a poll
                if poll is None:
                    continue

                # We got a poll, check for the hash and repond
                votes = []
                for inv in poll.invs:
                    # Vote yes to everything
                    r = AvalancheVoteError.ACCEPTED

                    # Look for what we expect
                    if inv.hash == hash:
                        r = resp
                        found_hash = True

                    votes.append(AvalancheVote(r, inv.hash))

                n.send_avaresponse(poll.round, votes, n.delegated_privkey)

            return found_hash

        # Now that we have a peer, we should start polling for the tip.
        hash_tip = int(node.getbestblockhash(), 16)
        self.wait_until(lambda: can_find_block_in_poll(hash_tip))

        # Make sure the fork node has synced the blocks
        self.sync_blocks([node, fork_node])

        # Create a fork 2 blocks deep. This should trigger polling.
        fork_node.invalidateblock(fork_node.getblockhash(100))
        self.generate(fork_node, 2, sync_fun=self.no_op)

        # Because the new tip is a deep reorg, the node will not accept it
        # right away, but poll for it.
        def parked_block(blockhash):
            for tip in node.getchaintips():
                if tip["hash"] == blockhash:
                    assert tip["status"] != "active"
                    return tip["status"] == "parked"
            return False

        fork_tip = fork_node.getbestblockhash()
        self.wait_until(lambda: parked_block(fork_tip))

        self.log.info("Answer all polls to finalize...")
        hash_tip_final = int(fork_tip, 16)

        def has_accepted_new_tip():
            can_find_block_in_poll(hash_tip_final)
            return node.getbestblockhash() == fork_tip

        # Because everybody answers yes, the node will accept that block.
        self.wait_until(has_accepted_new_tip)

        def has_finalized_new_tip():
            can_find_block_in_poll(hash_tip_final)
            return node.isfinalblock(fork_tip)

        # And continuing to answer yes finalizes the block.
        with node.assert_debug_log([f"Avalanche finalized block {fork_tip}"]):
            self.wait_until(has_finalized_new_tip)
        assert_equal(node.getbestblockhash(), fork_tip)

        self.log.info("Answer all polls to park...")
        self.generate(node, 1, sync_fun=self.no_op)

        tip_to_park = node.getbestblockhash()
        hash_tip_park = int(tip_to_park, 16)
        assert tip_to_park != fork_tip

        def has_parked_new_tip():
            can_find_block_in_poll(hash_tip_park, AvalancheVoteError.PARKED)
            return node.getbestblockhash() == fork_tip

        # Because everybody answers no, the node will park that block.
        with node.assert_debug_log([f"Avalanche invalidated block {tip_to_park}"]):
            self.wait_until(has_parked_new_tip)
        assert_equal(node.getbestblockhash(), fork_tip)

        # Mine on the current chaintip to trigger polling and so we don't reorg
        old_fork_tip = fork_tip
        fork_tip = self.generate(fork_node, 2, sync_fun=self.no_op)[-1]
        hash_tip_final = int(fork_tip, 16)

        # Manually unparking the invalidated block will reset finalization.
        node.unparkblock(tip_to_park)
        assert not node.isfinalblock(old_fork_tip)

        # Wait until the new tip is finalized
        self.sync_blocks([node, fork_node])
        self.wait_until(has_finalized_new_tip)
        assert_equal(node.getbestblockhash(), fork_tip)

        # Manually parking the finalized chaintip will reset finalization.
        node.parkblock(fork_tip)
        assert not node.isfinalblock(fork_tip)

        # Trigger polling and finalize a new tip to setup for the next test.
        node.unparkblock(fork_tip)
        fork_tip = self.generate(fork_node, 1)[-1]
        hash_tip_final = int(fork_tip, 16)
        self.wait_until(has_finalized_new_tip)
        assert_equal(node.getbestblockhash(), fork_tip)

        self.log.info("Verify finalization sticks...")
        # Create a new fork 2 blocks deep
        fork_node.invalidateblock(fork_tip)
        # We need to send the coin to a new address in order to make sure we do
        # not regenerate the same block.
        self.generatetoaddress(
            fork_node,
            2,
            'ecregtest:pqv2r67sgz3qumufap3h2uuj0zfmnzuv8v38gtrh5v',
            sync_fun=self.no_op)

        # node should park the block because its tip is finalized
        fork_tip = fork_node.getbestblockhash()
        hash_to_find = int(fork_tip, 16)
        self.wait_until(lambda: parked_block(fork_tip))

        # sanity check
        poll_node.send_poll([hash_to_find])
        assert_response(
            [AvalancheVote(AvalancheVoteError.PARKED, hash_to_find)])

        self.log.info(
            "Check the node is discouraging unexpected avaresponses.")
        with node.assert_debug_log(
                ['Misbehaving', 'peer=1 (0 -> 2): unexpected-ava-response']):
            # unknown voting round
            poll_node.send_avaresponse(
                round=2**32 - 1, votes=[], privkey=poll_node.delegated_privkey)


if __name__ == '__main__':
    AvalancheTest().main()
