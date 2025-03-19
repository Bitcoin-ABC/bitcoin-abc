# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test proof inventory relaying
"""

import random
import time

from test_framework.avatools import (
    AvaP2PInterface,
    NoHandshakeAvaP2PInterface,
    build_raw_msg_avaproofs,
    gen_proof,
    get_ava_p2p_interface,
    get_proof_ids,
    wait_for_proof,
)
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalanchePrefilledProof,
    calculate_shortid,
    msg_avaproofsreq,
    msg_getavaproofs,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import MAX_NODES, assert_equal, p2p_port, uint256_hex

# Timeout after which the proofs can be cleaned up
AVALANCHE_AVAPROOFS_TIMEOUT = 2 * 60
# Max interval between 2 periodic networking processing
AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL = 5 * 60


class ProofStoreP2PInterface(AvaP2PInterface):
    def __init__(self, test_framework=None, node=None):
        self.proofs = []
        super().__init__(test_framework, node)

    def on_avaproof(self, message):
        self.proofs.append(message.proof)

    def get_proofs(self):
        with p2p_lock:
            return self.proofs


class CompactProofsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-persistavapeers=0",
            ]
        ] * self.num_nodes

    def setup_network(self):
        # Don't connect the nodes
        self.setup_nodes()

    @staticmethod
    def received_avaproofs(peer):
        with p2p_lock:
            return peer.last_message.get("avaproofs")

    @staticmethod
    def get_avaproofs(peer):
        with p2p_lock:
            return peer.last_message.pop("avaproofs", None)

    def test_send_outbound_getavaproofs(self):
        self.log.info(
            "Check we send a getavaproofs message to our avalanche outbound peers"
        )
        node = self.nodes[0]

        p2p_idx = 0
        non_avapeers = []
        for _ in range(4):
            peer = P2PInterface()
            node.add_outbound_p2p_connection(
                peer,
                p2p_idx=p2p_idx,
                connection_type="outbound-full-relay",
                services=NODE_NETWORK,
            )
            non_avapeers.append(peer)
            p2p_idx += 1

        inbound_avapeers = [
            node.add_p2p_connection(NoHandshakeAvaP2PInterface()) for _ in range(4)
        ]

        outbound_avapeers = []
        # With a proof and the service bit set
        for _ in range(4):
            peer = AvaP2PInterface(self, node)
            node.add_outbound_p2p_connection(
                peer,
                p2p_idx=p2p_idx,
                connection_type="avalanche",
                services=NODE_NETWORK | NODE_AVALANCHE,
            )
            outbound_avapeers.append(peer)
            p2p_idx += 1

        # Without a proof and no service bit set
        for _ in range(4):
            peer = AvaP2PInterface()
            node.add_outbound_p2p_connection(
                peer,
                p2p_idx=p2p_idx,
                connection_type="outbound-full-relay",
                services=NODE_NETWORK,
            )
            outbound_avapeers.append(peer)
            p2p_idx += 1

        def all_peers_received_getavaproofs():
            with p2p_lock:
                return all(
                    p.last_message.get("getavaproofs") for p in outbound_avapeers
                )

        self.wait_until(all_peers_received_getavaproofs)

        with p2p_lock:
            assert all(
                p.message_count.get("getavaproofs", 0) >= 1 for p in outbound_avapeers
            )
            assert all(
                p.message_count.get("getavaproofs", 0) == 0 for p in non_avapeers
            )
            assert all(
                p.message_count.get("getavaproofs", 0) == 0 for p in inbound_avapeers
            )

        self.log.info(
            "Check we send periodic getavaproofs message to some of our peers"
        )

        def count_outbounds_getavaproofs():
            with p2p_lock:
                return sum(
                    [p.message_count.get("getavaproofs", 0) for p in outbound_avapeers]
                )

        outbounds_getavaproofs = count_outbounds_getavaproofs()
        node.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)
        self.wait_until(
            lambda: count_outbounds_getavaproofs() == outbounds_getavaproofs + 3
        )
        outbounds_getavaproofs += 3

        with p2p_lock:
            assert all(
                p.message_count.get("getavaproofs", 0) == 0 for p in non_avapeers
            )
            assert all(
                p.message_count.get("getavaproofs", 0) == 0 for p in inbound_avapeers
            )

        self.log.info(
            "After the first avaproofs has been received, all the peers are requested"
            " periodically"
        )

        responding_outbound_avapeer = AvaP2PInterface(self, node)
        node.add_outbound_p2p_connection(
            responding_outbound_avapeer,
            p2p_idx=p2p_idx,
            connection_type="avalanche",
            services=NODE_NETWORK | NODE_AVALANCHE,
        )
        p2p_idx += 1
        outbound_avapeers.append(responding_outbound_avapeer)

        self.wait_until(all_peers_received_getavaproofs)

        _, proof = gen_proof(self, node)

        # Send the avaproofs message
        avaproofs = build_raw_msg_avaproofs([proof])
        responding_outbound_avapeer.send_and_ping(avaproofs)

        # Now the node will request from all its peers at each time period
        outbounds_getavaproofs = count_outbounds_getavaproofs()
        num_outbound_avapeers = len(outbound_avapeers)
        node.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)
        self.wait_until(
            lambda: count_outbounds_getavaproofs()
            == outbounds_getavaproofs + num_outbound_avapeers
        )
        outbounds_getavaproofs += num_outbound_avapeers

        self.log.info("Empty avaproofs will not trigger any request")
        for p in outbound_avapeers:
            p.send_message(build_raw_msg_avaproofs([]))

        with p2p_lock:
            # Only this peer actually sent a proof
            assert_equal(
                responding_outbound_avapeer.message_count.get("avaproofsreq", 0), 1
            )
            assert_equal(
                sum(
                    [p.message_count.get("avaproofsreq", 0) for p in outbound_avapeers]
                ),
                1,
            )

            # Sanity checks
            assert all(
                p.message_count.get("getavaproofs", 0) == 0 for p in non_avapeers
            )
            assert all(
                p.message_count.get("getavaproofs", 0) == 0 for p in inbound_avapeers
            )

    def test_send_manual_getavaproofs(self):
        self.log.info(
            "Check we send a getavaproofs message to our manually connected peers that"
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

        p = AvaP2PInterface(self, node)
        p2p_idx = 1
        p.peer_accept_connection(
            connect_cb=connect_callback,
            connect_id=p2p_idx,
            net=node.chain,
            timeout_factor=node.timeout_factor,
            services=NODE_NETWORK | NODE_AVALANCHE,
        )()
        ip_port = f"127.0.0.1:{p2p_port(MAX_NODES - p2p_idx)}"

        node.addnode(node=ip_port, command="add")
        self.wait_until(lambda: added_node_connected(ip_port))

        assert_equal(node.getpeerinfo()[-1]["addr"], ip_port)
        assert_equal(node.getpeerinfo()[-1]["connection_type"], "manual")

        # Make sure p.is_connected is set, otherwise the last_message check
        # below will assert.
        p.wait_for_connect()
        p.wait_until(lambda: p.last_message.get("getavaproofs"))

    def test_respond_getavaproofs(self):
        self.log.info("Check the node responds to getavaproofs messages")

        node = self.nodes[0]

        def send_getavaproof_check_shortid_len(peer, expected_len):
            peer.send_message(msg_getavaproofs())
            self.wait_until(lambda: self.received_avaproofs(peer))

            avaproofs = self.received_avaproofs(peer)
            assert_equal(len(avaproofs.shortids), expected_len)

        # Initially the node has 0 peer
        self.restart_node(0)
        assert_equal(len(get_proof_ids(node)), 0)

        peer = node.add_p2p_connection(NoHandshakeAvaP2PInterface())
        send_getavaproof_check_shortid_len(peer, 0)

        # Add some peers with a proof
        sending_peer = node.add_p2p_connection(NoHandshakeAvaP2PInterface())
        avapeers = []
        for _ in range(15):
            p = get_ava_p2p_interface(self, node)
            sending_peer.send_avaproof(p.proof)
            wait_for_proof(node, uint256_hex(p.proof.proofid))
            avapeers.append(p)

        proofids = get_proof_ids(node)
        assert_equal(len(proofids), 15)

        receiving_peer = node.add_p2p_connection(NoHandshakeAvaP2PInterface())
        send_getavaproof_check_shortid_len(receiving_peer, len(proofids))

        avaproofs = self.get_avaproofs(receiving_peer)
        assert avaproofs is not None
        expected_shortids = [
            calculate_shortid(avaproofs.key0, avaproofs.key1, proofid)
            for proofid in sorted(proofids)
        ]
        assert_equal(expected_shortids, avaproofs.shortids)

        # Don't expect any prefilled proof for now
        assert_equal(len(avaproofs.prefilled_proofs), 0)

        # Disconnect some peers and check their proof is no longer sent in the
        # compact proofs messages
        for i in range(10):
            avapeers[i].peer_disconnect()
            avapeers[i].wait_for_disconnect()
            proofids.remove(avapeers[i].proof.proofid)

        assert_equal(len(proofids), 5)
        send_getavaproof_check_shortid_len(receiving_peer, len(proofids))

        avaproofs = self.get_avaproofs(receiving_peer)
        assert avaproofs is not None
        expected_shortids = [
            calculate_shortid(avaproofs.key0, avaproofs.key1, proofid)
            for proofid in sorted(proofids)
        ]
        assert_equal(expected_shortids, avaproofs.shortids)

    def test_request_missing_proofs(self):
        self.log.info(
            "Check the node requests the missing proofs after receiving an avaproofs"
            " message"
        )

        node = self.nodes[0]

        self.restart_node(0)

        key0 = random.randint(0, 2**64 - 1)
        key1 = random.randint(0, 2**64 - 1)
        proofs = [gen_proof(self, node)[1] for _ in range(10)]

        # Build a map from proofid to shortid. Use sorted proofids so we don't
        # have the same indices than the `proofs` list.
        proofids = [p.proofid for p in proofs]
        shortid_map = {}
        for proofid in sorted(proofids):
            shortid_map[proofid] = calculate_shortid(key0, key1, proofid)

        self.log.info("The node ignores unsollicited avaproofs")

        spam_peer = get_ava_p2p_interface(self, node)

        msg = build_raw_msg_avaproofs(
            proofs, prefilled_proofs=[], key_pair=[key0, key1]
        )

        with node.assert_debug_log(["Ignoring unsollicited avaproofs"]):
            spam_peer.send_message(msg)

        def received_avaproofsreq(peer):
            with p2p_lock:
                return peer.last_message.get("avaproofsreq")

        p2p_idx = 0

        def add_avalanche_p2p_outbound():
            nonlocal p2p_idx

            peer = AvaP2PInterface(self, node)
            node.add_outbound_p2p_connection(
                peer,
                p2p_idx=p2p_idx,
                connection_type="avalanche",
                services=NODE_NETWORK | NODE_AVALANCHE,
            )
            p2p_idx += 1

            peer.wait_until(lambda: peer.last_message.get("getavaproofs"))

            return peer

        def expect_indices(shortids, expected_indices, prefilled_proofs=None):
            nonlocal p2p_idx

            msg = build_raw_msg_avaproofs(
                [], prefilled_proofs=prefilled_proofs, key_pair=[key0, key1]
            )
            msg.shortids = shortids

            peer = add_avalanche_p2p_outbound()
            peer.send_message(msg)
            self.wait_until(lambda: received_avaproofsreq(peer))

            avaproofsreq = received_avaproofsreq(peer)
            assert_equal(avaproofsreq.indices, expected_indices)

        self.log.info("Check no proof is requested if there is no shortid")

        msg = build_raw_msg_avaproofs([])
        sender = add_avalanche_p2p_outbound()
        sender.send_message(msg)
        # Make sure we don't get an avaproofsreq message
        sender.sync_with_ping()
        with p2p_lock:
            assert_equal(sender.message_count.get("avaproofsreq", 0), 0)

        self.log.info("Check the node requests all the proofs if it known none")

        expect_indices(list(shortid_map.values()), list(range(len(shortid_map))))

        self.log.info("Check the node requests only the missing proofs")

        known_proofids = []
        for proof in proofs[:5]:
            node.sendavalancheproof(proof.serialize().hex())
            known_proofids.append(proof.proofid)

        expected_indices = [
            i for i, proofid in enumerate(shortid_map) if proofid not in known_proofids
        ]
        expect_indices(list(shortid_map.values()), expected_indices)

        self.log.info("Check the node don't request prefilled proofs")

        # Get the indices for a couple of proofs
        indice_proof5 = list(shortid_map.keys()).index(proofids[5])
        indice_proof6 = list(shortid_map.keys()).index(proofids[6])
        prefilled_proofs = [
            AvalanchePrefilledProof(indice_proof5, proofs[5]),
            AvalanchePrefilledProof(indice_proof6, proofs[6]),
        ]
        prefilled_proofs = sorted(
            prefilled_proofs, key=lambda prefilled_proof: prefilled_proof.index
        )
        remaining_shortids = [
            shortid
            for proofid, shortid in shortid_map.items()
            if proofid not in proofids[5:7]
        ]
        known_proofids.extend(proofids[5:7])
        expected_indices = [
            i for i, proofid in enumerate(shortid_map) if proofid not in known_proofids
        ]
        expect_indices(
            remaining_shortids, expected_indices, prefilled_proofs=prefilled_proofs
        )

        self.log.info("Check the node requests no proof if it knows all of them")

        for proof in proofs[5:]:
            node.sendavalancheproof(proof.serialize().hex())
            known_proofids.append(proof.proofid)

        expect_indices(list(shortid_map.values()), [])

        self.log.info("Check out of bounds index")

        bad_peer = add_avalanche_p2p_outbound()

        msg = build_raw_msg_avaproofs(
            [],
            prefilled_proofs=[
                AvalanchePrefilledProof(len(shortid_map) + 1, gen_proof(self, node)[1])
            ],
            key_pair=[key0, key1],
        )
        msg.shortids = list(shortid_map.values())

        with node.assert_debug_log(["Misbehaving", "avaproofs-bad-indexes"]):
            bad_peer.send_message(msg)
        bad_peer.wait_for_disconnect()

        self.log.info("An invalid prefilled proof will trigger a ban")

        _, no_stake = gen_proof(self, node)
        no_stake.stakes = []

        bad_peer = add_avalanche_p2p_outbound()

        msg = build_raw_msg_avaproofs(
            [],
            prefilled_proofs=[
                AvalanchePrefilledProof(len(shortid_map), no_stake),
            ],
            key_pair=[key0, key1],
        )
        msg.shortids = list(shortid_map.values())

        with node.assert_debug_log(["Misbehaving", "invalid-proof"]):
            bad_peer.send_message(msg)
        bad_peer.wait_for_disconnect()

    def test_send_missing_proofs(self):
        self.log.info("Check the node respond to missing proofs requests")

        node = self.nodes[0]

        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + ["-avaminquorumstake=1000000", "-avaminavaproofsnodecount=0"],
        )

        numof_proof = 10
        avapeers = [get_ava_p2p_interface(self, node) for _ in range(numof_proof)]
        proofs = [peer.proof for peer in avapeers]

        assert_equal(node.getavalancheinfo()["ready_to_poll"], True)

        for proof in proofs:
            node.sendavalancheproof(proof.serialize().hex())
        proofids = get_proof_ids(node)
        assert all(proof.proofid in proofids for proof in proofs)

        self.log.info("Unsollicited requests are ignored")

        peer = node.add_p2p_connection(ProofStoreP2PInterface())
        peer.send_and_ping(msg_avaproofsreq())
        assert_equal(len(peer.get_proofs()), 0)

        def request_proofs(peer):
            peer.send_message(msg_getavaproofs())
            self.wait_until(lambda: self.received_avaproofs(peer))

            avaproofs = self.received_avaproofs(peer)
            assert_equal(len(avaproofs.shortids), numof_proof)

            return avaproofs

        _ = request_proofs(peer)

        self.log.info("Sending an empty request has no effect")

        peer.send_and_ping(msg_avaproofsreq())
        assert_equal(len(peer.get_proofs()), 0)

        self.log.info("Check the requested proofs are sent by the node")

        def check_received_proofs(indices):
            requester = node.add_p2p_connection(ProofStoreP2PInterface())
            avaproofs = request_proofs(requester)

            req = msg_avaproofsreq()
            req.indices = indices
            requester.send_message(req)

            # Check we got the expected number of proofs
            self.wait_until(lambda: len(requester.get_proofs()) == len(indices))

            # Check we got the expected proofs
            received_shortids = [
                calculate_shortid(avaproofs.key0, avaproofs.key1, proof.proofid)
                for proof in requester.get_proofs()
            ]
            assert_equal(
                set(received_shortids), {avaproofs.shortids[i] for i in indices}
            )

        # Only the first proof
        check_received_proofs([0])
        # Only the last proof
        check_received_proofs([numof_proof - 1])
        # Half first
        check_received_proofs(range(0, numof_proof // 2))
        # Half last
        check_received_proofs(range(numof_proof // 2, numof_proof))
        # Even
        check_received_proofs([i for i in range(numof_proof) if i % 2 == 0])
        # Odds
        check_received_proofs([i for i in range(numof_proof) if i % 2 == 1])
        # All
        check_received_proofs(range(numof_proof))

        self.log.info(
            "Check the node will not send the proofs if not requested before the"
            " timeout elapsed"
        )

        # Disconnect the peers except the ones with a proof attached
        for peer in node.p2ps:
            if peer not in avapeers:
                peer.peer_disconnect()
                peer.wait_for_disconnect()

        mocktime = int(time.time())
        node.setmocktime(mocktime)

        slow_peer = ProofStoreP2PInterface(self, node)
        node.add_outbound_p2p_connection(
            slow_peer,
            p2p_idx=0,
            connection_type="avalanche",
            services=NODE_NETWORK | NODE_AVALANCHE,
        )
        numof_proof += 1
        slow_peer.wait_until(lambda: slow_peer.last_message.get("getavaproofs"))
        # Make sure to send at least one avaproofs message, otherwise the node
        # will only send a getavaproofs message to up to 3 nodes and the test
        # might randomly fail.
        avaproofs_msg = build_raw_msg_avaproofs([slow_peer.proof])
        slow_peer.send_and_ping(avaproofs_msg)

        slow_peer.nodeid = node.getpeerinfo()[-1]["id"]
        _ = request_proofs(slow_peer)

        # Elapse the timeout
        mocktime += AVALANCHE_AVAPROOFS_TIMEOUT + 1
        node.setmocktime(mocktime)

        node.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)

        # Periodic compact proofs requests are sent in the same loop than the
        # cleanup, so when such a request is made we are sure the cleanup did
        # happen.
        slow_peer.wait_until(lambda: slow_peer.message_count.get("getavaproofs") > 1)

        req = msg_avaproofsreq()
        req.indices = range(numof_proof)
        slow_peer.send_and_ping(req)

        # Check we get no proof
        assert_equal(len(slow_peer.get_proofs()), 0)

    def test_compact_proofs_download_on_connect(self):
        self.log.info(
            "Check the node get compact proofs upon avalanche outbound discovery"
        )

        requestee = self.nodes[0]
        requester = self.nodes[1]

        self.restart_node(0)

        numof_proof = 10
        proofs = [gen_proof(self, requestee)[1] for _ in range(numof_proof)]

        for proof in proofs:
            requestee.sendavalancheproof(proof.serialize().hex())
        proofids = get_proof_ids(requestee)
        assert all(proof.proofid in proofids for proof in proofs)

        # Start the requester and check it gets all the proofs
        self.start_node(1)
        self.connect_nodes(0, 1)
        self.wait_until(
            lambda: all(proof.proofid in proofids for proof in get_proof_ids(requester))
        )

    def test_no_compactproofs_during_ibs(self):
        self.log.info("Check the node don't request compact proofs during IBD")

        node = self.nodes[0]

        chainwork = int(node.getblockchaininfo()["chainwork"], 16)
        self.restart_node(
            0, extra_args=self.extra_args[0] + [f"-minimumchainwork={chainwork + 2:#x}"]
        )

        assert node.getblockchaininfo()["initialblockdownload"]

        peer = P2PInterface()
        node.add_outbound_p2p_connection(
            peer,
            p2p_idx=0,
            connection_type="avalanche",
            services=NODE_NETWORK | NODE_AVALANCHE,
        )

        # Force the node to process the sending loop
        peer.sync_with_ping()
        with p2p_lock:
            assert_equal(peer.message_count.get("getavaproofs", 0), 0)

        # Make sure there is no message sent as part as the periodic network
        # messaging either
        node.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)
        peer.sync_with_ping()
        with p2p_lock:
            assert_equal(peer.message_count.get("getavaproofs", 0), 0)

    def test_send_inbound_getavaproofs(self):
        self.log.info("Check we also request the inbounds for their compact proofs")

        node = self.nodes[0]

        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + ["-avaminquorumstake=1000000", "-avaminavaproofsnodecount=0"],
        )

        assert_equal(node.getavalancheinfo()["ready_to_poll"], False)

        outbound = AvaP2PInterface()
        node.add_outbound_p2p_connection(outbound, p2p_idx=0)

        inbound = AvaP2PInterface()
        node.add_p2p_connection(inbound)
        inbound.nodeid = node.getpeerinfo()[-1]["id"]

        def count_getavaproofs(peers):
            with p2p_lock:
                return sum(
                    [peer.message_count.get("getavaproofs", 0) for peer in peers]
                )

        # Upon connection only the outbound gets a compact proofs message
        assert_equal(count_getavaproofs([inbound]), 0)
        self.wait_until(lambda: count_getavaproofs([outbound]) == 1)

        # Periodic send will include the inbound as well
        current_total = count_getavaproofs([inbound, outbound])
        while count_getavaproofs([inbound]) == 0:
            node.mockscheduler(AVALANCHE_MAX_PERIODIC_NETWORKING_INTERVAL)
            self.wait_until(
                lambda: count_getavaproofs([inbound, outbound]) > current_total
            )
            current_total = count_getavaproofs([inbound, outbound])

    def run_test(self):
        # Most if the tests only need a single node, let the other ones start
        # the node when required
        self.stop_node(1)

        self.test_send_outbound_getavaproofs()
        self.test_send_manual_getavaproofs()
        self.test_respond_getavaproofs()
        self.test_request_missing_proofs()
        self.test_send_missing_proofs()
        self.test_compact_proofs_download_on_connect()
        self.test_no_compactproofs_during_ibs()
        self.test_send_inbound_getavaproofs()


if __name__ == "__main__":
    CompactProofsTest().main()
