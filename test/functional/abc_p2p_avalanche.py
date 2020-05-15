#!/usr/bin/env python3
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of forks via avalanche."""
import random

from test_framework.mininode import P2PInterface, mininode_lock
from test_framework.messages import (
    AvalancheResponse,
    AvalancheVote,
    CInv,
    msg_avapoll,
    msg_tcpavaresponse,
    TCPAvalancheResponse,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    sync_blocks,
    wait_until,
)
from test_framework import schnorr


BLOCK_ACCEPTED = 0
BLOCK_REJECTED = 1
BLOCK_UNKNOWN = -1


class TestNode(P2PInterface):

    def __init__(self):
        self.round = 0
        self.avaresponses = []
        self.avapolls = []
        super().__init__()

    def on_avaresponse(self, message):
        with mininode_lock:
            self.avaresponses.append(message.response)

    def on_avapoll(self, message):
        with mininode_lock:
            self.avapolls.append(message.poll)

    def send_avaresponse(self, round, votes, privkey):
        response = AvalancheResponse(round, 0, votes)
        sig = schnorr.sign(privkey, response.get_hash())
        msg = msg_tcpavaresponse()
        msg.response = TCPAvalancheResponse(response, sig)
        self.send_message(msg)

    def send_poll(self, hashes):
        msg = msg_avapoll()
        msg.poll.round = self.round
        self.round += 1
        for h in hashes:
            msg.poll.invs.append(CInv(2, h))
        self.send_message(msg)

    def wait_for_avaresponse(self, timeout=5):
        wait_until(
            lambda: len(self.avaresponses) > 0,
            timeout=timeout,
            lock=mininode_lock)

        with mininode_lock:
            return self.avaresponses.pop(0)

    def wait_for_avapoll(self, timeout=5):
        wait_until(
            lambda: len(self.avapolls) > 0,
            timeout=timeout,
            lock=mininode_lock)

        with mininode_lock:
            return self.avapolls.pop(0)


class AvalancheTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.extra_args = [
            ['-enableavalanche=1', '-avacooldown=0'],
            ['-enableavalanche=1', '-avacooldown=0', '-noparkdeepreorg', '-maxreorgdepth=-1']]

    def run_test(self):
        node = self.nodes[0]

        # Create a fake node and connect it to our real node.
        poll_node = TestNode()
        node.add_p2p_connection(poll_node)
        poll_node.wait_for_verack()
        poll_node.sync_with_ping()

        # Get our own node id so we can use it later.
        nodeid = node.getpeerinfo()[-1]['id']

        # Generate many block and poll for them.
        address = node.get_deterministic_priv_key().address
        node.generatetoaddress(100, address)

        fork_node = self.nodes[1]
        # Make sure the fork node has synced the blocks
        sync_blocks([node, fork_node])

        # Get the key so we can verify signatures.
        avakey = bytes.fromhex(node.getavalanchekey())

        self.log.info("Poll for the chain tip...")
        best_block_hash = int(node.getbestblockhash(), 16)
        poll_node.send_poll([best_block_hash])

        def assert_response(expected):
            response = poll_node.wait_for_avaresponse()
            r = response.response
            assert_equal(r.cooldown, 0)

            # Verify signature.
            assert schnorr.verify(response.sig, avakey, r.get_hash())

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
            26, 'bchreg:pqv2r67sgz3qumufap3h2uuj0zfmnzuv8v7ej0fffv')
        node.reconsiderblock(invalidated_block)

        poll_node.send_poll(various_block_hashes)
        assert_response([AvalancheVote(BLOCK_ACCEPTED, h) for h in various_block_hashes[:5]] +
                        [AvalancheVote(BLOCK_REJECTED, h) for h in various_block_hashes[-3:]])

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
                        [AvalancheVote(BLOCK_REJECTED, h) for h in various_block_hashes[3:6]] +
                        [AvalancheVote(BLOCK_UNKNOWN, h) for h in various_block_hashes[-3:]])

        self.log.info("Trigger polling from the node...")
        # duplicate the deterministic sig test from src/test/key_tests.cpp
        privkey = bytes.fromhex(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747")
        pubkey = schnorr.getpubkey(privkey, compressed=True)

        node.addavalanchepeer(nodeid, pubkey.hex())

        # Make sure the fork node has synced the blocks
        sync_blocks([node, fork_node])

        # Create a fork 2 blocks deep. This should trigger polling.
        fork_node.invalidateblock(fork_node.getblockhash(100))
        fork_address = fork_node.get_deterministic_priv_key().address
        fork_node.generatetoaddress(2, fork_address)

        def can_find_block_in_poll(hash):
            poll = poll_node.wait_for_avapoll()
            invs = poll.invs

            votes = []
            found_hash = False
            for inv in invs:
                # Look for what we expect
                if inv.hash == hash:
                    found_hash = True
                # Vote yes to everything
                votes.append(AvalancheVote(BLOCK_ACCEPTED, inv.hash))

            poll_node.send_avaresponse(poll.round, votes, privkey)
            return found_hash

        # Because the new tip is a deep reorg, the node should start to poll
        # for it.
        hash_to_find = int(fork_node.getbestblockhash(), 16)
        wait_until(lambda: can_find_block_in_poll(hash_to_find), timeout=5)

        # To verify that responses are processed, do it a few more times.
        for _ in range(10):
            wait_until(lambda: can_find_block_in_poll(hash_to_find), timeout=5)


if __name__ == '__main__':
    AvalancheTest().main()
