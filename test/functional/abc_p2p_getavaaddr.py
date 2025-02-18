# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test getavaaddr p2p message"""
import time
from decimal import Decimal

from test_framework.avatools import AvaP2PInterface, gen_proof
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalancheVote,
    AvalancheVoteError,
    msg_avahello,
    msg_getaddr,
    msg_getavaaddr,
    msg_verack,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import MAX_NODES, assert_equal, p2p_port, uint256_hex

# getavaaddr time interval in seconds, as defined in net_processing.cpp
# A node will ignore repeated getavaaddr during this interval
GETAVAADDR_INTERVAL = 2 * 60

# Address are sent every 30s on average, with a Poisson filter. Use a large
# enough delay so it's very unlikely we don't get the message within this time.
MAX_ADDR_SEND_DELAY = 10 * 60

# The interval between avalanche statistics computation
AVALANCHE_STATISTICS_INTERVAL = 10 * 60

# The getavaaddr messages are sent every 2 to 5 minutes
MAX_GETAVAADDR_DELAY = 5 * 60


class AddrReceiver(P2PInterface):
    def __init__(self):
        super().__init__()
        self.received_addrs = None
        self.addr_message_count = 0

    def get_received_addrs(self):
        with p2p_lock:
            return self.received_addrs

    def on_addr(self, message):
        self.received_addrs = []
        self.addr_message_count += 1
        for addr in message.addrs:
            self.received_addrs.append(f"{addr.ip}:{addr.port}")

    def addr_received(self):
        return self.received_addrs is not None

    def addr_count(self):
        return self.addr_message_count


class MutedAvaP2PInterface(AvaP2PInterface):
    def __init__(self, test_framework=None, node=None):
        super().__init__(test_framework, node)
        self.is_responding = False
        self.privkey = None
        self.addr = None
        self.poll_received = 0

    def set_addr(self, addr):
        self.addr = addr

    def on_avapoll(self, message):
        self.poll_received += 1


class AllYesAvaP2PInterface(MutedAvaP2PInterface):
    def __init__(self, test_framework=None, node=None):
        super().__init__(test_framework, node)
        self.is_responding = True

    def on_avapoll(self, message):
        self.send_avaresponse(
            message.poll.round,
            [
                AvalancheVote(AvalancheVoteError.ACCEPTED, inv.hash)
                for inv in message.poll.invs
            ],
            self.master_privkey if self.delegation is None else self.delegated_privkey,
        )
        super().on_avapoll(message)


class AvaHelloInterface(AvaP2PInterface):
    def __init__(self):
        super().__init__()

    def on_version(self, message):
        self.send_message(msg_verack())
        self.send_message(msg_avahello())


class AvaAddrTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = False
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-persistavapeers=0",
            ]
        ]

    def check_all_peers_received_getavaaddr_once(self, avapeers):
        def received_all_getavaaddr(avapeers):
            with p2p_lock:
                return all(p.last_message.get("getavaaddr") for p in avapeers)

        self.wait_until(lambda: received_all_getavaaddr(avapeers))

        with p2p_lock:
            assert all(p.message_count.get("getavaaddr", 0) == 1 for p in avapeers)

    def getavaaddr_interval_test(self):
        node = self.nodes[0]

        # Init mock time
        mock_time = int(time.time())
        node.setmocktime(mock_time)

        peers = [AllYesAvaP2PInterface(self, node) for _ in range(10)]

        # Add some avalanche peers to the node
        for p in peers[:8]:
            node.add_p2p_connection(p)

        # Build some statistics to ensure some addresses will be returned
        def all_peers_addr_are_relayable(avapeers):
            proofids = [uint256_hex(p.proof.proofid) for p in avapeers]
            valid_proofids = node.getavalancheproofs()["valid"]

            node.mockscheduler(AVALANCHE_STATISTICS_INTERVAL)

            nodeids = []
            for p in node.getavalanchepeerinfo():
                nodeids += p["node_list"]

            return all(proofid in valid_proofids for proofid in proofids) and all(
                node.getavailabilityscore(nodeid) > 0 for nodeid in nodeids
            )

        self.wait_until(lambda: all_peers_addr_are_relayable(peers[:8]))
        node.mockscheduler(AVALANCHE_STATISTICS_INTERVAL)

        requester = node.add_p2p_connection(AddrReceiver())
        requester.send_message(msg_getavaaddr())
        # Make sure the message is processed
        requester.sync_with_ping()
        # Remember the time we sent the getavaaddr message
        getavaddr_time = mock_time

        # Spamming more get getavaaddr has no effect
        for _ in range(2):
            requester.send_message(msg_getavaaddr())
            requester.sync_with_ping()

        # Move the time so we get an addr response
        mock_time += MAX_ADDR_SEND_DELAY
        node.setmocktime(mock_time)
        requester.sync_with_ping()
        requester.wait_until(requester.addr_received)

        requester.received_addrs = None
        # Add some more address so the node has something to respond
        for p in peers[8:]:
            node.add_p2p_connection(p)
        self.wait_until(lambda: all_peers_addr_are_relayable(peers))
        node.mockscheduler(AVALANCHE_STATISTICS_INTERVAL)

        # Check our message is now accepted again now that the getavaaddr
        # interval is elapsed
        assert mock_time >= getavaddr_time + GETAVAADDR_INTERVAL
        requester.send_message(msg_getavaaddr())
        requester.sync_with_ping()

        # We can get an addr message again
        mock_time += MAX_ADDR_SEND_DELAY
        node.setmocktime(mock_time)
        requester.sync_with_ping()
        requester.wait_until(requester.addr_received)

        # We only got 2 responses, other messages have been ignored
        assert_equal(requester.addr_count(), 2)

    def address_test(self, maxaddrtosend, num_proof, num_avanode):
        self.restart_node(
            0, extra_args=self.extra_args[0] + [f"-maxaddrtosend={maxaddrtosend}"]
        )
        node = self.nodes[0]

        # Init mock time
        mock_time = int(time.time())
        node.setmocktime(mock_time)

        # Create a bunch of proofs and associate each a bunch of nodes.
        avanodes = []
        for _ in range(num_proof):
            master_privkey, proof = gen_proof(self, node)
            for n in range(num_avanode):
                avanode = AllYesAvaP2PInterface() if n % 2 else MutedAvaP2PInterface()
                avanode.master_privkey = master_privkey
                avanode.proof = proof
                node.add_p2p_connection(avanode)

                peerinfo = node.getpeerinfo()[-1]
                avanode.set_addr(peerinfo["addr"])

                avanodes.append(avanode)

        responding_addresses = [
            avanode.addr for avanode in avanodes if avanode.is_responding
        ]
        assert_equal(len(responding_addresses), num_proof * num_avanode // 2)

        # Check we have what we expect
        def all_nodes_connected():
            avapeers = node.getavalanchepeerinfo()
            if len(avapeers) != num_proof:
                return False

            for avapeer in avapeers:
                if avapeer["nodecount"] != num_avanode:
                    return False

            return True

        self.wait_until(all_nodes_connected)

        # Force the availability score to diverge between the responding and the
        # muted nodes.
        self.generate(node, 1, sync_fun=self.no_op)

        def poll_all_for_block():
            with p2p_lock:
                return all(
                    avanode.poll_received > (10 if avanode.is_responding else 0)
                    for avanode in avanodes
                )

        self.wait_until(poll_all_for_block)

        # Move the scheduler time 10 minutes forward so that so that our peers
        # get an availability score computed.
        node.mockscheduler(AVALANCHE_STATISTICS_INTERVAL)

        requester = node.add_p2p_connection(AddrReceiver())
        requester.send_and_ping(msg_getavaaddr())

        # Sanity check that the availability score is set up as expected
        peerinfo = node.getpeerinfo()
        muted_addresses = [
            avanode.addr for avanode in avanodes if not avanode.is_responding
        ]
        assert all(
            node.getavailabilityscore(p["id"]) < 0
            for p in peerinfo
            if p["addr"] in muted_addresses
        )
        assert all(
            node.getavailabilityscore(p["id"]) > 0
            for p in peerinfo
            if p["addr"] in responding_addresses
        )
        # Requester has no availability_score because it's not an avalanche
        # peer
        assert_equal(node.getavailabilityscore(peerinfo[-1]["id"]), None)

        mock_time += MAX_ADDR_SEND_DELAY
        node.setmocktime(mock_time)

        requester.wait_until(requester.addr_received)
        addresses = requester.get_received_addrs()
        assert_equal(len(addresses), min(maxaddrtosend, len(responding_addresses)))

        # Check all the addresses belong to responding peer
        assert all(address in responding_addresses for address in addresses)

    def getavaaddr_outbound_test(self):
        self.log.info(
            "Check we send a getavaaddr message to our avalanche outbound peers"
        )
        node = self.nodes[0]

        # Get rid of previously connected nodes
        node.disconnect_p2ps()

        avapeers = []
        for i in range(16):
            avapeer = AvaP2PInterface()
            node.add_outbound_p2p_connection(
                avapeer,
                p2p_idx=i,
            )
            avapeers.append(avapeer)

        self.check_all_peers_received_getavaaddr_once(avapeers)

        # Generate some block to poll for
        self.generate(node, 1, sync_fun=self.no_op)

        # Because none of the avalanche peers is responding, our node should
        # fail out of option shortly and send a getavaaddr message to its
        # outbound avalanche peers.
        node.mockscheduler(MAX_GETAVAADDR_DELAY)

        def all_peers_received_getavaaddr():
            with p2p_lock:
                return all(p.message_count.get("getavaaddr", 0) > 1 for p in avapeers)

        self.wait_until(all_peers_received_getavaaddr)

    def getavaaddr_manual_test(self):
        self.log.info(
            "Check we send a getavaaddr message to our manually connected peers that"
            " support avalanche"
        )
        node = self.nodes[0]

        # Get rid of previously connected nodes
        node.disconnect_p2ps()

        def added_node_connected(ip_port):
            added_node_info = node.getaddednodeinfo(ip_port)
            return len(added_node_info) == 1 and added_node_info[0]["connected"]

        def connect_callback(address, port):
            self.log.debug(f"Connecting to {address}:{port}")

        p = AvaP2PInterface()
        p2p_idx = 1
        p.peer_accept_connection(
            connect_cb=connect_callback,
            connect_id=p2p_idx,
            net=node.chain,
            timeout_factor=node.timeout_factor,
        )()
        ip_port = f"127.0.0.1:{p2p_port(MAX_NODES - p2p_idx)}"

        node.addnode(node=ip_port, command="add")
        self.wait_until(lambda: added_node_connected(ip_port))

        assert_equal(node.getpeerinfo()[-1]["addr"], ip_port)
        assert_equal(node.getpeerinfo()[-1]["connection_type"], "manual")

        # Make sure p.is_connected is set, otherwise the last_message check
        # below will assert.
        p.wait_for_connect()
        p.wait_until(lambda: p.last_message.get("getavaaddr"))

        # Generate some block to poll for
        self.generate(node, 1, sync_fun=self.no_op)

        # Because our avalanche peer is not responding, our node should fail
        # out of option shortly and send another getavaaddr message.
        node.mockscheduler(MAX_GETAVAADDR_DELAY)
        p.wait_until(lambda: p.message_count.get("getavaaddr", 0) > 1)

    def getavaaddr_noquorum(self):
        self.log.info(
            "Check we send a getavaaddr message while our quorum is not established"
        )
        node = self.nodes[0]

        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [
                "-avaminquorumstake=500000000",
                "-avaminquorumconnectedstakeratio=0.8",
            ],
        )

        avapeers = []
        for i in range(16):
            avapeer = AllYesAvaP2PInterface(self, node)
            node.add_outbound_p2p_connection(
                avapeer,
                p2p_idx=i,
                connection_type="avalanche",
                services=NODE_NETWORK | NODE_AVALANCHE,
            )
            avapeers.append(avapeer)

            peerinfo = node.getpeerinfo()[-1]
            avapeer.set_addr(peerinfo["addr"])

        self.check_all_peers_received_getavaaddr_once(avapeers)

        def total_getavaaddr_msg():
            with p2p_lock:
                return sum([p.message_count.get("getavaaddr", 0) for p in avapeers])

        # Because we have not enough stake to start polling, we keep requesting
        # more addresses from all our peers
        total_getavaaddr = total_getavaaddr_msg()
        node.mockscheduler(MAX_GETAVAADDR_DELAY)
        self.wait_until(
            lambda: total_getavaaddr_msg() == total_getavaaddr + len(avapeers)
        )

        # Move the schedulter time forward to make sure we get statistics
        # computed. But since we did not start polling yet it should remain all
        # zero.
        node.mockscheduler(AVALANCHE_STATISTICS_INTERVAL)

        def wait_for_availability_score():
            peerinfo = node.getpeerinfo()
            return all(
                node.getavailabilityscore(p["id"]) == Decimal(0) for p in peerinfo
            )

        self.wait_until(wait_for_availability_score)

        requester = node.add_p2p_connection(AddrReceiver())
        requester.send_and_ping(msg_getavaaddr())

        node.setmocktime(int(time.time() + MAX_ADDR_SEND_DELAY))

        # Check all the peers addresses are returned.
        requester.wait_until(requester.addr_received)
        addresses = requester.get_received_addrs()
        assert_equal(len(addresses), len(avapeers))
        expected_addresses = [avapeer.addr for avapeer in avapeers]
        assert all(address in expected_addresses for address in addresses)

        # Add more nodes so we reach the mininum quorum stake amount.
        for _ in range(4):
            avapeer = AllYesAvaP2PInterface(self, node)
            node.add_p2p_connection(avapeer)
        self.wait_until(lambda: node.getavalancheinfo()["ready_to_poll"] is True)

        def is_vote_finalized(proof):
            return node.getrawavalancheproof(uint256_hex(proof.proofid)).get(
                "finalized", False
            )

        # Wait until all proofs are finalized
        self.wait_until(
            lambda: all(
                is_vote_finalized(p.proof)
                for p in node.p2ps
                if isinstance(p, AvaP2PInterface)
            )
        )

        # Go through several rounds of getavaaddr requests. We don't know for
        # sure how many will be sent as it depends on whether the peers
        # responded fast enough during the polling phase, but at some point a
        # single outbound peer will be requested and no more.
        def sent_single_getavaaddr():
            total_getavaaddr = total_getavaaddr_msg()
            node.mockscheduler(MAX_GETAVAADDR_DELAY)
            self.wait_until(lambda: total_getavaaddr_msg() >= total_getavaaddr + 1)
            for p in avapeers:
                p.sync_with_ping()
            return total_getavaaddr_msg() == total_getavaaddr + 1

        self.wait_until(sent_single_getavaaddr)

    def test_send_inbound_getavaaddr_until_quorum_is_established(self):
        self.log.info(
            "Check we also request the inbounds until the quorum is established"
        )

        node = self.nodes[0]

        self.restart_node(
            0, extra_args=self.extra_args[0] + ["-avaminquorumstake=1000000"]
        )

        assert_equal(node.getavalancheinfo()["ready_to_poll"], False)

        outbound = MutedAvaP2PInterface()
        node.add_outbound_p2p_connection(outbound, p2p_idx=0)

        inbound = MutedAvaP2PInterface()
        node.add_p2p_connection(inbound)
        inbound.nodeid = node.getpeerinfo()[-1]["id"]

        def count_getavaaddr(peers):
            with p2p_lock:
                return sum([peer.message_count.get("getavaaddr", 0) for peer in peers])

        # Upon connection only the outbound gets a getavaaddr message
        assert_equal(count_getavaaddr([inbound]), 0)
        self.wait_until(lambda: count_getavaaddr([outbound]) == 1)

        # Periodic send will include the inbound as well
        current_total = count_getavaaddr([inbound, outbound])
        while count_getavaaddr([inbound]) == 0:
            node.mockscheduler(MAX_GETAVAADDR_DELAY)
            self.wait_until(
                lambda: count_getavaaddr([inbound, outbound]) > current_total
            )
            current_total = count_getavaaddr([inbound, outbound])

        # Connect the minimum amount of stake and nodes
        for _ in range(8):
            node.add_p2p_connection(AvaP2PInterface(self, node))
        self.wait_until(lambda: node.getavalancheinfo()["ready_to_poll"] is True)

        # From now only the outbound is requested
        count_inbound = count_getavaaddr([inbound])
        for _ in range(10):
            # Trigger a poll
            self.generate(node, 1, sync_fun=self.no_op)
            inbound.sync_with_ping()

            node.mockscheduler(MAX_GETAVAADDR_DELAY)
            self.wait_until(
                lambda: count_getavaaddr([inbound, outbound]) > current_total
            )
            current_total = count_getavaaddr([inbound, outbound])

        assert_equal(count_getavaaddr([inbound]), count_inbound)

    def test_addr_requests_order(self):
        node = self.nodes[0]

        # Get rid of previously connected nodes
        node.disconnect_p2ps()

        def check_addr_requests(p):
            p.wait_until(lambda: p.last_message.get("getavaaddr"))
            p.wait_until(lambda: p.message_count.get("getavaaddr", 0) == 1)
            p.wait_until(lambda: p.last_message.get("getaddr"))
            p.wait_until(lambda: p.message_count.get("getaddr", 0) == 1)

        # Test getaddr is sent first
        requester1 = node.add_outbound_p2p_connection(AvaHelloInterface(), p2p_idx=0)
        requester1.send_message(msg_getaddr())
        requester1.send_message(msg_getavaaddr())
        check_addr_requests(requester1)

        # Test getavaaddr is sent first
        requester2 = node.add_outbound_p2p_connection(AvaHelloInterface(), p2p_idx=1)
        requester2.send_message(msg_getavaaddr())
        requester2.send_message(msg_getaddr())
        check_addr_requests(requester2)

    def run_test(self):
        self.getavaaddr_interval_test()

        # Limited by maxaddrtosend
        self.address_test(maxaddrtosend=3, num_proof=2, num_avanode=8)
        # Limited by the number of good nodes
        self.address_test(maxaddrtosend=100, num_proof=2, num_avanode=8)

        self.getavaaddr_outbound_test()
        self.getavaaddr_manual_test()
        self.getavaaddr_noquorum()
        self.test_send_inbound_getavaaddr_until_quorum_is_established()
        self.test_addr_requests_order()


if __name__ == "__main__":
    AvaAddrTest().main()
