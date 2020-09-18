#!/usr/bin/env python3
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of forks via avalanche."""
import random

from test_framework.key import (
    ECKey,
    ECPubKey,
)
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
    wait_until,
)


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
        sig = privkey.sign_schnorr(response.get_hash())
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

    def get_avapoll_if_available(self):
        with mininode_lock:
            return self.avapolls.pop(0) if len(self.avapolls) > 0 else None


class AvalancheTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.extra_args = [
            ['-enableavalanche=1', '-avacooldown=0', '-automaticunparking=0'],
            ['-enableavalanche=1', '-avacooldown=0', '-noparkdeepreorg', '-maxreorgdepth=-1']]

    def run_test(self):
        node = self.nodes[0]

        # Build a fake quorum of nodes.
        quorum = []
        for i in range(0, 16):
            n = TestNode()
            quorum.append(n)

            node.add_p2p_connection(n)
            n.wait_for_verack()

            # Get our own node id so we can use it later.
            n.nodeid = node.getpeerinfo()[-1]['id']

        # Pick on node from the quorum for polling.
        poll_node = quorum[0]

        # Generate many block and poll for them.
        address = node.get_deterministic_priv_key().address
        node.generatetoaddress(100, address)

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
        privkey = ECKey()
        privkey.set(bytes.fromhex(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747"), True)
        pubkey = privkey.get_pubkey()

        privatekey = node.get_deterministic_priv_key().key
        proof = node.buildavalancheproof(11, 12, pubkey.get_bytes().hex(), [{
            'txid': "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747",
            'vout': 0,
            'amount': 10,
            'height': 100,
            'privatekey': privatekey,
        }])

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
        self.log.info(tip_to_park)

        hash_to_find = int(tip_to_park, 16)
        assert(tip_to_park != fork_tip)

        def has_parked_new_tip():
            can_find_block_in_poll(hash_to_find, BLOCK_REJECTED)
            return node.getbestblockhash() == fork_tip

        # Because everybody answers no, the node will park that block.
        wait_until(has_parked_new_tip, timeout=15)
        assert_equal(node.getbestblockhash(), fork_tip)


if __name__ == '__main__':
    AvalancheTest().main()
