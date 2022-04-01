#!/usr/bin/env python3
# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test getavaaddr p2p message"""
import time
from decimal import Decimal

from test_framework.avatools import AvaP2PInterface, gen_proof
from test_framework.key import ECKey
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalancheVote,
    AvalancheVoteError,
    msg_getavaaddr,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet_util import bytes_to_wif

# getavaaddr time interval in seconds, as defined in net_processing.cpp
GETAVAADDR_INTERVAL = 10 * 60


class AddrReceiver(P2PInterface):

    def __init__(self):
        super().__init__()
        self.received_addrs = None

    def get_received_addrs(self):
        with p2p_lock:
            return self.received_addrs

    def on_addr(self, message):
        self.received_addrs = []
        for addr in message.addrs:
            self.received_addrs.append(f"{addr.ip}:{addr.port}")

    def addr_received(self):
        return self.received_addrs is not None


class MutedAvaP2PInterface(AvaP2PInterface):
    def __init__(self):
        super().__init__()
        self.is_responding = False
        self.privkey = None
        self.addr = None
        self.poll_received = 0

    def set_addr(self, addr):
        self.addr = addr

    def on_avapoll(self, message):
        self.poll_received += 1


class AllYesAvaP2PInterface(MutedAvaP2PInterface):
    def __init__(self, privkey):
        super().__init__()
        self.privkey = privkey
        self.is_responding = True

    def on_avapoll(self, message):
        self.send_avaresponse(
            message.poll.round, [
                AvalancheVote(
                    AvalancheVoteError.ACCEPTED, inv.hash) for inv in message.poll.invs], self.privkey)
        super().on_avapoll(message)


class AvaAddrTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = False
        self.num_nodes = 1
        self.extra_args = [['-enableavalanche=1',
                            '-avacooldown=0', '-whitelist=noban@127.0.0.1']]

    def getavaaddr_interval_test(self):
        node = self.nodes[0]

        # Init mock time
        mock_time = int(time.time())
        node.setmocktime(mock_time)

        master_privkey, proof = gen_proof(node)
        master_pubkey = master_privkey.get_pubkey().get_bytes().hex()
        proof_hex = proof.serialize().hex()

        # Add some avalanche peers to the node
        for n in range(10):
            node.add_p2p_connection(AllYesAvaP2PInterface(master_privkey))
            assert node.addavalanchenode(
                node.getpeerinfo()[-1]['id'], master_pubkey, proof_hex)

        # Build some statistics to ensure some addresses will be returned
        self.wait_until(lambda: all(
            [avanode.poll_received > 0 for avanode in node.p2ps]))
        node.mockscheduler(10 * 60)

        requester = node.add_p2p_connection(AddrReceiver())
        requester.send_message(msg_getavaaddr())
        # Remember the time we sent the getavaaddr message
        getavaddr_time = mock_time

        # Spamming more get getavaaddr has no effect
        for i in range(10):
            with node.assert_debug_log(["Ignoring repeated getavaaddr from peer"]):
                requester.send_message(msg_getavaaddr())

        # Move the time so we get an addr response
        mock_time += 5 * 60
        node.setmocktime(mock_time)
        requester.wait_until(requester.addr_received)

        # Spamming more get getavaaddr still has no effect
        for i in range(10):
            with node.assert_debug_log(["Ignoring repeated getavaaddr from peer"]):
                requester.send_message(msg_getavaaddr())

        # Elapse the getavaaddr interval and check our message is now accepted
        # again
        mock_time = getavaddr_time + GETAVAADDR_INTERVAL
        node.setmocktime(mock_time)

        requester.send_message(msg_getavaaddr())

        # We can get an addr message again
        mock_time += 5 * 60
        node.setmocktime(mock_time)
        requester.wait_until(requester.addr_received)

    def address_test(self, maxaddrtosend, num_proof, num_avanode):
        self.restart_node(
            0,
            extra_args=self.extra_args[0] +
            [f'-maxaddrtosend={maxaddrtosend}'])
        node = self.nodes[0]

        # Init mock time
        mock_time = int(time.time())
        node.setmocktime(mock_time)

        # Create a bunch of proofs and associate each a bunch of nodes.
        avanodes = []
        for _ in range(num_proof):
            master_privkey, proof = gen_proof(node)
            master_pubkey = master_privkey.get_pubkey().get_bytes().hex()
            proof_hex = proof.serialize().hex()

            for n in range(num_avanode):
                avanode = AllYesAvaP2PInterface(
                    master_privkey) if n % 2 else MutedAvaP2PInterface()
                node.add_p2p_connection(avanode)

                peerinfo = node.getpeerinfo()[-1]
                avanode.set_addr(peerinfo["addr"])

                assert node.addavalanchenode(
                    peerinfo['id'], master_pubkey, proof_hex)
                avanodes.append(avanode)

        responding_addresses = [
            avanode.addr for avanode in avanodes if avanode.is_responding]
        assert_equal(len(responding_addresses), num_proof * num_avanode // 2)

        # Check we have what we expect
        avapeers = node.getavalanchepeerinfo()
        assert_equal(len(avapeers), num_proof)
        for avapeer in avapeers:
            assert_equal(len(avapeer['nodes']), num_avanode)

        # Force the availability score to diverge between the responding and the
        # muted nodes.
        def poll_all_for_block():
            node.generate(1)
            return all([avanode.poll_received > (
                10 if avanode.is_responding else 0) for avanode in avanodes])
        self.wait_until(poll_all_for_block)

        # Move the scheduler time 10 minutes forward so that so that our peers
        # get an availability score computed.
        node.mockscheduler(10 * 60)

        requester = node.add_p2p_connection(AddrReceiver())
        requester.send_and_ping(msg_getavaaddr())

        # Sanity check that the availability score is set up as expected
        peerinfo = node.getpeerinfo()
        muted_addresses = [
            avanode.addr for avanode in avanodes if not avanode.is_responding]
        assert all([p['availability_score'] <
                   0 for p in peerinfo if p["addr"] in muted_addresses])
        assert all([p['availability_score'] >
                   0 for p in peerinfo if p["addr"] in responding_addresses])
        # Requester has no availability_score because it's not an avalanche
        # peer
        assert 'availability_score' not in peerinfo[-1].keys()

        mock_time += 5 * 60
        node.setmocktime(mock_time)

        requester.wait_until(requester.addr_received)
        addresses = requester.get_received_addrs()
        assert_equal(len(addresses),
                     min(maxaddrtosend, len(responding_addresses)))

        # Check all the addresses belong to responding peer
        assert all([address in responding_addresses for address in addresses])

    def getavaaddr_outbound_test(self):
        self.log.info(
            "Check we send a getavaaddr message to our avalanche outbound peers")
        node = self.nodes[0]

        # Get rid of previously connected nodes
        node.disconnect_p2ps()

        avapeers = []
        for i in range(16):
            avapeer = P2PInterface()
            node.add_outbound_p2p_connection(
                avapeer,
                p2p_idx=i,
                connection_type="avalanche",
                services=NODE_NETWORK | NODE_AVALANCHE,
            )
            avapeers.append(avapeer)

        self.wait_until(
            lambda: all([p.last_message.get("getavaaddr") for p in avapeers]))
        assert all([p.message_count.get(
            "getavaaddr", 0) == 1 for p in avapeers])

        # Generate some block to poll for
        node.generate(1)

        # Because none of the avalanche peers is responding, our node should
        # fail out of option shortly and send a getavaaddr message to one of its
        # outbound avalanche peers.
        node.mockscheduler(10 * 60)
        self.wait_until(
            lambda: any([p.message_count.get("getavaaddr", 0) > 1 for p in avapeers]))

    def getavaaddr_noquorum(self):
        self.log.info(
            "Check we send a getavaaddr message while our quorum is not established")
        node = self.nodes[0]

        self.restart_node(0, extra_args=self.extra_args[0] + [
            '-avaminquorumstake=100000000',
            '-avaminquorumconnectedstakeratio=0.8',
        ])

        privkey, proof = gen_proof(node)

        avapeers = []
        for i in range(16):
            avapeer = AllYesAvaP2PInterface(privkey)
            node.add_outbound_p2p_connection(
                avapeer,
                p2p_idx=i,
                connection_type="avalanche",
                services=NODE_NETWORK | NODE_AVALANCHE,
            )
            avapeers.append(avapeer)

            peerinfo = node.getpeerinfo()[-1]
            avapeer.set_addr(peerinfo["addr"])

        self.wait_until(
            lambda: all([p.last_message.get("getavaaddr") for p in avapeers]))
        assert all([p.message_count.get(
            "getavaaddr", 0) == 1 for p in avapeers])

        def total_getavaaddr_msg():
            return sum([p.message_count.get("getavaaddr", 0)
                       for p in avapeers])

        # Because we have not enough stake to start polling, we keep requesting
        # more addresses
        total_getavaaddr = total_getavaaddr_msg()
        for i in range(5):
            node.mockscheduler(10 * 60)
            self.wait_until(lambda: total_getavaaddr_msg() > total_getavaaddr)
            total_getavaaddr = total_getavaaddr_msg()

        # Connect the nodes via an avahello message
        limitedproofid_hex = f"{proof.limited_proofid:0{64}x}"
        for avapeer in avapeers:
            avakey = ECKey()
            avakey.generate()
            delegation = node.delegateavalancheproof(
                limitedproofid_hex,
                bytes_to_wif(privkey.get_bytes()),
                avakey.get_pubkey().get_bytes().hex(),
            )
            avapeer.send_avahello(delegation, avakey)

        # Move the schedulter time forward to make seure we get statistics
        # computed. But since we did not start polling yet it should remain all
        # zero.
        node.mockscheduler(10 * 60)

        def wait_for_availability_score():
            peerinfo = node.getpeerinfo()
            return all([p.get('availability_score', None) == Decimal(0)
                       for p in peerinfo])
        self.wait_until(wait_for_availability_score)

        requester = node.add_p2p_connection(AddrReceiver())
        requester.send_and_ping(msg_getavaaddr())

        node.setmocktime(int(time.time() + 5 * 60))

        # Check all the peers addresses are returned.
        requester.wait_until(requester.addr_received)
        addresses = requester.get_received_addrs()
        assert_equal(len(addresses), len(avapeers))
        expected_addresses = [avapeer.addr for avapeer in avapeers]
        assert all([address in expected_addresses for address in addresses])

    def run_test(self):
        self.getavaaddr_interval_test()

        # Limited by maxaddrtosend
        self.address_test(maxaddrtosend=3, num_proof=2, num_avanode=8)
        # Limited by the number of good nodes
        self.address_test(maxaddrtosend=100, num_proof=2, num_avanode=8)

        self.getavaaddr_outbound_test()
        self.getavaaddr_noquorum()


if __name__ == '__main__':
    AvaAddrTest().main()
