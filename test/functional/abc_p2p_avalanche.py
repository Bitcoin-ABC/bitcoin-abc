#!/usr/bin/env python3
# Copyright (c) 2020-2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of forks via avalanche."""
import random

from test_framework.avatools import get_stakes
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
    NODE_AVALANCHE,
    NODE_NETWORK,
    TCPAvalancheResponse,
)
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


class TestNode(P2PInterface):

    def __init__(self):
        self.round = 0
        self.avahello = None
        self.avaresponses = []
        self.avapolls = []
        super().__init__()

    def peer_connect(self, *args, **kwargs):
        create_conn = super().peer_connect(*args, **kwargs)

        # Save the nonce and extra entropy so they can be reused later.
        self.local_nonce = self.on_connection_send_msg.nNonce
        self.local_extra_entropy = self.on_connection_send_msg.nExtraEntropy

        return create_conn

    def on_version(self, message):
        super().on_version(message)

        # Save the nonce and extra entropy so they can be reused later.
        self.remote_nonce = message.nNonce
        self.remote_extra_entropy = message.nExtraEntropy

    def on_avaresponse(self, message):
        with mininode_lock:
            self.avaresponses.append(message.response)

    def on_avapoll(self, message):
        with mininode_lock:
            self.avapolls.append(message.poll)

    def on_avahello(self, message):
        with mininode_lock:
            assert(self.avahello is None)
            self.avahello = message

    def send_avaresponse(self, round, votes, privkey):
        response = AvalancheResponse(round, 0, votes)
        sig = privkey.sign_schnorr(response.get_hash())
        msg = msg_tcpavaresponse()
        msg.response = TCPAvalancheResponse(response, sig)
        self.send_message(msg)

    def wait_for_avaresponse(self, timeout=5):
        wait_until(
            lambda: len(self.avaresponses) > 0,
            timeout=timeout,
            lock=mininode_lock)

        with mininode_lock:
            return self.avaresponses.pop(0)

    def send_poll(self, hashes):
        msg = msg_avapoll()
        msg.poll.round = self.round
        self.round += 1
        for h in hashes:
            msg.poll.invs.append(CInv(2, h))
        self.send_message(msg)

    def get_avapoll_if_available(self):
        with mininode_lock:
            return self.avapolls.pop(0) if len(self.avapolls) > 0 else None

    def wait_for_avahello(self, timeout=5):
        wait_until(
            lambda: self.avahello is not None,
            timeout=timeout,
            lock=mininode_lock)

        with mininode_lock:
            return self.avahello


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

        self.log.info("Check the node is signalling the avalanche service.")
        assert_equal(
            int(node.getnetworkinfo()['localservices'], 16) & NODE_AVALANCHE,
            NODE_AVALANCHE)

        # Build a fake quorum of nodes.
        def get_node():
            n = TestNode()
            node.add_p2p_connection(
                n, services=NODE_NETWORK | NODE_AVALANCHE)
            n.wait_for_verack()

            # Get our own node id so we can use it later.
            n.nodeid = node.getpeerinfo()[-1]['id']

            return n

        def get_quorum():
            return [get_node() for _ in range(0, QUORUM_NODE_COUNT)]

        # Pick on node from the quorum for polling.
        quorum = get_quorum()
        poll_node = quorum[0]

        # Generate many block and poll for them.
        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = node.generatetoaddress(100, addrkey0.address)
        # Use the first coinbase to create a stake
        stakes = get_stakes(node, [blockhashes[0]], addrkey0.key)

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

        self.log.info("Testing getavalanchepeerinfo...")
        avapeerinfo = node.getavalanchepeerinfo()
        # There is a single peer because all nodes share the same proof.
        assert_equal(len(avapeerinfo), 1)
        assert_equal(avapeerinfo[0]["peerid"], 0)
        assert_equal(avapeerinfo[0]["nodecount"], len(quorum))
        # The first avalanche node index is 1, because 0 is self.nodes[1].
        assert_equal(sorted(avapeerinfo[0]["nodes"]),
                     list(range(1, QUORUM_NODE_COUNT + 1)))
        assert_equal(avapeerinfo[0]["sequence"], proof_sequence)
        assert_equal(avapeerinfo[0]["expiration"], proof_expiration)
        assert_equal(avapeerinfo[0]["master"], pubkey.get_bytes().hex())
        assert_equal(avapeerinfo[0]["proof"], proof)
        assert_equal(len(avapeerinfo[0]["stakes"]), 1)
        assert_equal(avapeerinfo[0]["stakes"][0]["txid"], stakes[0]['txid'])

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

        # Restart the node
        self.restart_node(0, self.extra_args[0] + [
            "-avaproof={}".format(proof),
            "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
        ])

        self.log.info("Test the avahello signature")
        quorum = get_quorum()
        poll_node = quorum[0]

        avahello = poll_node.wait_for_avahello().hello

        avakey.set(bytes.fromhex(node.getavalanchekey()))
        assert avakey.verify_schnorr(
            avahello.sig, avahello.get_sighash(poll_node))


if __name__ == '__main__':
    AvalancheTest().main()
