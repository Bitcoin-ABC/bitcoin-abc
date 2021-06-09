#!/usr/bin/env python3
# Copyright (c) 2020-2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of forks via avalanche."""
import random
import struct
import time

from test_framework.avatools import create_coinbase_stakes, get_proof_ids
from test_framework.key import (
    bytes_to_wif,
    ECKey,
    ECPubKey,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.messages import (
    AvalancheDelegation,
    AvalancheProof,
    AvalancheResponse,
    AvalancheVote,
    CInv,
    FromHex,
    hash256,
    msg_avahello,
    msg_avapoll,
    MSG_AVA_PROOF,
    msg_getdata,
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

UNCONDITIONAL_RELAY_DELAY = 2 * 60


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
        self.avaresponses.append(message.response)

    def on_avapoll(self, message):
        self.avapolls.append(message.poll)

    def on_avahello(self, message):
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
            lock=p2p_lock)

        with p2p_lock:
            return self.avaresponses.pop(0)

    def send_poll(self, hashes):
        msg = msg_avapoll()
        msg.poll.round = self.round
        self.round += 1
        for h in hashes:
            msg.poll.invs.append(CInv(2, h))
        self.send_message(msg)

    def get_avapoll_if_available(self):
        with p2p_lock:
            return self.avapolls.pop(0) if len(self.avapolls) > 0 else None

    def wait_for_avahello(self, timeout=5):
        wait_until(
            lambda: self.avahello is not None,
            timeout=timeout,
            lock=p2p_lock)

        with p2p_lock:
            return self.avahello

    def send_avahello(self, delegation_hex: str, delegated_privkey: ECKey):
        delegation = FromHex(AvalancheDelegation(), delegation_hex)
        local_sighash = hash256(
            delegation.getid() +
            struct.pack("<QQQQ", self.local_nonce, self.remote_nonce,
                        self.local_extra_entropy, self.remote_extra_entropy))

        msg = msg_avahello()
        msg.hello.delegation = delegation
        msg.hello.sig = delegated_privkey.sign_schnorr(local_sighash)
        self.send_message(msg)

        return delegation.proofid


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
        def get_node(services=NODE_NETWORK | NODE_AVALANCHE):
            n = TestNode()
            node.add_p2p_connection(
                n, services=services)
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

        self.log.info("Testing getavalanchepeerinfo...")
        avapeerinfo = node.getavalanchepeerinfo()
        # There is a single peer because all nodes share the same proof.
        assert_equal(len(avapeerinfo), 1)
        assert_equal(avapeerinfo[0]["peerid"], 0)
        assert_equal(avapeerinfo[0]["nodecount"], len(quorum))
        # The first avalanche node index is 1, because 0 is self.nodes[1].
        assert_equal(sorted(avapeerinfo[0]["nodes"]),
                     list(range(1, QUORUM_NODE_COUNT + 1)))
        assert_equal(avapeerinfo[0]["proof"], proof)

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
        with self.nodes[0].assert_debug_log(
                ['Misbehaving', 'peer=1 (0 -> 2): unexpected-ava-response']):
            # unknown voting round
            poll_node.send_avaresponse(
                round=2**32 - 1, votes=[], privkey=privkey)

        self.log.info(
            "Check the node is signalling the avalanche service bit only if there is a proof.")
        assert_equal(
            int(node.getnetworkinfo()['localservices'], 16) & NODE_AVALANCHE,
            0)

        # Restart the node
        self.restart_node(0, self.extra_args[0] + [
            "-avaproof={}".format(proof),
            "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
        ])

        assert_equal(
            int(node.getnetworkinfo()['localservices'], 16) & NODE_AVALANCHE,
            NODE_AVALANCHE)

        self.log.info("Test the avahello signature (node -> P2PInterface)")
        good_interface = get_node()
        avahello = good_interface.wait_for_avahello().hello

        avakey.set(bytes.fromhex(node.getavalanchekey()))
        assert avakey.verify_schnorr(
            avahello.sig, avahello.get_sighash(good_interface))

        stakes = create_coinbase_stakes(node, [blockhashes[1]], addrkey0.key)
        interface_proof_hex = node.buildavalancheproof(
            proof_sequence, proof_expiration, pubkey.get_bytes().hex(),
            stakes)
        limited_id = FromHex(
            AvalancheProof(),
            interface_proof_hex).limited_proofid

        # delegate
        delegated_key = ECKey()
        delegated_key.generate()
        interface_delegation_hex = node.delegateavalancheproof(
            f"{limited_id:0{64}x}",
            bytes_to_wif(privkey.get_bytes()),
            delegated_key.get_pubkey().get_bytes().hex(),
            None)

        self.log.info("Test that wrong avahello signature causes a ban")
        bad_interface = get_node()
        wrong_key = ECKey()
        wrong_key.generate()
        with self.nodes[0].assert_debug_log(
                ["Misbehaving",
                 "peer=1 (0 -> 100) BAN THRESHOLD EXCEEDED: invalid-avahello-signature"]):
            bad_interface.send_avahello(interface_delegation_hex, wrong_key)
            bad_interface.wait_for_disconnect()

        self.log.info(
            'Check that receiving a valid avahello triggers a proof getdata request')
        proofid = good_interface.send_avahello(
            interface_delegation_hex, delegated_key)

        def getdata_found():
            with p2p_lock:
                return good_interface.last_message.get(
                    "getdata") and good_interface.last_message["getdata"].inv[-1].hash == proofid
        wait_until(getdata_found)

        self.log.info('Check that we can download the proof from our peer')

        node_proofid = FromHex(AvalancheProof(), proof).proofid

        def wait_for_proof_validation():
            # Connect some blocks to trigger the proof verification
            node.generate(2)
            wait_until(lambda: node_proofid in get_proof_ids(node))

        wait_for_proof_validation()

        getdata = msg_getdata([CInv(MSG_AVA_PROOF, node_proofid)])

        self.log.info(
            "Proof has been inv'ed recently, check it can be requested")
        good_interface.send_message(getdata)

        def proof_received(peer):
            with p2p_lock:
                return peer.last_message.get(
                    "avaproof") and peer.last_message["avaproof"].proof.proofid == node_proofid
        wait_until(lambda: proof_received(good_interface))

        # Restart the node
        self.restart_node(0, self.extra_args[0] + [
            "-avaproof={}".format(proof),
            "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
        ])
        wait_for_proof_validation()

        self.log.info(
            "The proof has not been announced, it cannot be requested")
        peer = get_node(services=NODE_NETWORK)
        peer.send_message(getdata)

        # Give enough time for the node to answer. Since we cannot check for a
        # non-event this is the best we can do
        time.sleep(2)
        assert not proof_received(peer)

        self.log.info("The proof is known for long enough to be requested")
        current_time = int(time.time())
        node.setmocktime(current_time + UNCONDITIONAL_RELAY_DELAY)

        peer.send_message(getdata)
        wait_until(lambda: proof_received(peer))


if __name__ == '__main__':
    AvalancheTest().main()
