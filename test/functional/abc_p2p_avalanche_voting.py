#!/usr/bin/env python3
# Copyright (c) 2020-2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of forks via avalanche."""
import random

from test_framework.avatools import (
    get_ava_p2p_interface,
    create_coinbase_stakes,
)
from test_framework.key import (
    ECKey,
    ECPubKey,
)
from test_framework.messages import AvalancheVote
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    wait_until,
)

BLOCK_ACCEPTED = 0
BLOCK_INVALID = 1
BLOCK_PARKED = 2
BLOCK_FORK = 3
BLOCK_UNKNOWN = -1
BLOCK_MISSING = -2
BLOCK_PENDING = -3

QUORUM_NODE_COUNT = 16


class AvalancheTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.extra_args = [
            ['-enableavalanche=1', '-avacooldown=0'],
            ['-enableavalanche=1', '-avacooldown=0', '-noparkdeepreorg', '-maxreorgdepth=-1']]
        self.supports_cli = False
        self.rpc_timeout = 120

    def run_test(self):
        node = self.nodes[0]

        # Build a fake quorum of nodes.
        def get_quorum():
            return [get_ava_p2p_interface(node)
                    for _ in range(0, QUORUM_NODE_COUNT)]

        # Pick on node from the quorum for polling.
        quorum = get_quorum()
        poll_node = quorum[0]

        # Generate many block and poll for them.
        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = node.generatetoaddress(100, addrkey0.address)
        # Use the first coinbase to create a stake
        stakes = create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key)

        fork_node = self.nodes[1]
        # Make sure the fork node has synced the blocks
        self.sync_blocks([node, fork_node])

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

        assert_response([AvalancheVote(BLOCK_ACCEPTED, best_block_hash)])

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
        assert_response([AvalancheVote(BLOCK_ACCEPTED, h)
                         for h in various_block_hashes])

        self.log.info(
            "Poll for a selection of blocks, but some are now invalid...")
        invalidated_block = node.getblockhash(76)
        node.invalidateblock(invalidated_block)
        # We need to send the coin to a new address in order to make sure we do
        # not regenerate the same block.
        node.generatetoaddress(
            26, 'ecregtest:pqv2r67sgz3qumufap3h2uuj0zfmnzuv8v38gtrh5v')
        node.reconsiderblock(invalidated_block)

        poll_node.send_poll(various_block_hashes)
        assert_response([AvalancheVote(BLOCK_ACCEPTED, h) for h in various_block_hashes[:5]] +
                        [AvalancheVote(BLOCK_FORK, h) for h in various_block_hashes[-3:]])

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
        assert_response([AvalancheVote(BLOCK_ACCEPTED, h) for h in various_block_hashes[:3]] +
                        [AvalancheVote(BLOCK_FORK, h) for h in various_block_hashes[3:6]] +
                        [AvalancheVote(BLOCK_UNKNOWN, h) for h in various_block_hashes[-3:]])

        self.log.info("Trigger polling from the node...")
        # duplicate the deterministic sig test from src/test/key_tests.cpp
        privkey = ECKey()
        privkey.set(bytes.fromhex(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747"), True)
        pubkey = privkey.get_pubkey()

        proof_sequence = 11
        proof_expiration = 12
        proof = node.buildavalancheproof(
            proof_sequence, proof_expiration, pubkey.get_bytes().hex(),
            stakes)

        # Activate the quorum.
        for n in quorum:
            success = node.addavalanchenode(
                n.nodeid, pubkey.get_bytes().hex(), proof)
            assert success is True

        def can_find_block_in_poll(hash, resp=BLOCK_ACCEPTED):
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
                    r = BLOCK_ACCEPTED

                    # Look for what we expect
                    if inv.hash == hash:
                        r = resp
                        found_hash = True

                    votes.append(AvalancheVote(r, inv.hash))

                n.send_avaresponse(poll.round, votes, privkey)

            return found_hash

        # Now that we have a peer, we should start polling for the tip.
        hash_tip = int(node.getbestblockhash(), 16)
        wait_until(lambda: can_find_block_in_poll(hash_tip), timeout=5)

        # Make sure the fork node has synced the blocks
        self.sync_blocks([node, fork_node])

        # Create a fork 2 blocks deep. This should trigger polling.
        fork_node.invalidateblock(fork_node.getblockhash(100))
        fork_address = fork_node.get_deterministic_priv_key().address
        fork_node.generatetoaddress(2, fork_address)

        # Because the new tip is a deep reorg, the node will not accept it
        # right away, but poll for it.
        def parked_block(blockhash):
            for tip in node.getchaintips():
                if tip["hash"] == blockhash:
                    assert tip["status"] != "active"
                    return tip["status"] == "parked"
            return False

        fork_tip = fork_node.getbestblockhash()
        wait_until(lambda: parked_block(fork_tip))

        self.log.info("Answer all polls to finalize...")

        hash_to_find = int(fork_tip, 16)

        def has_accepted_new_tip():
            can_find_block_in_poll(hash_to_find)
            return node.getbestblockhash() == fork_tip

        # Because everybody answers yes, the node will accept that block.
        wait_until(has_accepted_new_tip, timeout=15)
        assert_equal(node.getbestblockhash(), fork_tip)

        self.log.info("Answer all polls to park...")
        node.generate(1)

        tip_to_park = node.getbestblockhash()
        hash_to_find = int(tip_to_park, 16)
        assert(tip_to_park != fork_tip)

        def has_parked_new_tip():
            can_find_block_in_poll(hash_to_find, BLOCK_PARKED)
            return node.getbestblockhash() == fork_tip

        # Because everybody answers no, the node will park that block.
        wait_until(has_parked_new_tip, timeout=15)
        assert_equal(node.getbestblockhash(), fork_tip)

        self.log.info(
            "Check the node is discouraging unexpected avaresponses.")
        with node.assert_debug_log(
                ['Misbehaving', 'peer=1 (0 -> 2): unexpected-ava-response']):
            # unknown voting round
            poll_node.send_avaresponse(
                round=2**32 - 1, votes=[], privkey=privkey)


if __name__ == '__main__':
    AvalancheTest().main()
