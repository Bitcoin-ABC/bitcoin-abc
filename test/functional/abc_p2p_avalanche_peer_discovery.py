# Copyright (c) 2020-2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the peer discovery behavior of avalanche nodes.

This includes tests for the service flag, avahello handshake and
proof exchange.
"""

import time

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import (
    AvaP2PInterface,
    avalanche_proof_from_hex,
    create_coinbase_stakes,
    gen_proof,
    get_ava_p2p_interface_no_handshake,
    get_proof_ids,
    wait_for_proof,
)
from test_framework.key import ECKey, ECPubKey
from test_framework.messages import (
    MSG_AVA_PROOF,
    MSG_TYPE_MASK,
    NODE_AVALANCHE,
    NODE_NETWORK,
    CInv,
    msg_getdata,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex
from test_framework.wallet_util import bytes_to_wif

UNCONDITIONAL_RELAY_DELAY = 2 * 60
MAX_AVALANCHE_PERIODIC_NETWORKING = 5 * 60


class GetProofDataCountingInterface(AvaP2PInterface):
    def __init__(self):
        self.get_proof_data_count = 0
        super().__init__()

    def on_getdata(self, message):
        for i in message.inv:
            if i.type & MSG_TYPE_MASK == MSG_AVA_PROOF:
                self.get_proof_data_count += 1


class AvalanchePeerDiscoveryTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=3",
                "-persistavapeers=0",
            ]
        ]
        self.supports_cli = False

    def run_test(self):
        node = self.nodes[0]

        # duplicate the deterministic sig test from src/test/key_tests.cpp
        privkey = ECKey()
        privkey.set(
            bytes.fromhex(
                "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747"
            ),
            True,
        )
        wif_privkey = bytes_to_wif(privkey.get_bytes())

        self.log.info(
            "Check the node is signalling the avalanche service bit only if there is a"
            " proof."
        )
        assert_equal(
            int(node.getnetworkinfo()["localservices"], 16) & NODE_AVALANCHE, 0
        )

        # Create stakes by mining blocks
        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = self.generatetoaddress(
            node, 4, addrkey0.address, sync_fun=self.no_op
        )
        stakes = create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key)

        proof_sequence = 11
        proof_expiration = 0
        proof = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey, stakes
        )

        master_key = ECKey()
        master_key.generate()

        limited_id = avalanche_proof_from_hex(proof).limited_proofid
        delegation = node.delegateavalancheproof(
            uint256_hex(limited_id),
            bytes_to_wif(privkey.get_bytes()),
            master_key.get_pubkey().get_bytes().hex(),
        )

        self.log.info("Test the avahello signature with no proof")

        peer = get_ava_p2p_interface_no_handshake(node)
        avahello = peer.wait_for_avahello().hello
        assert_equal(avahello.delegation.limited_proofid, 0)

        self.log.info(
            "A delegation with all zero limited id indicates that the peer has no proof"
        )

        no_proof_peer = GetProofDataCountingInterface()
        node.add_p2p_connection(no_proof_peer, wait_for_verack=True)

        no_proof_peer.sync_with_ping()

        # No proof is requested
        with p2p_lock:
            assert_equal(no_proof_peer.get_proof_data_count, 0)
        assert_equal(len(node.getavalanchepeerinfo()), 0)

        self.log.info(
            "A peer can send another hello containing a proof, only if the previous"
            " delegation was empty"
        )

        # Send another hello, with a non-null delegation
        no_proof_peer.send_avahello(delegation, master_key)
        # Check the associated proof gets requested by the node
        no_proof_peer.wait_until(lambda: no_proof_peer.get_proof_data_count > 0)

        # Send the proof
        proofobj = avalanche_proof_from_hex(proof)
        no_proof_peer.send_avaproof(proofobj)
        wait_for_proof(node, uint256_hex(proofobj.proofid))

        # Make sure we are added as a peer
        avalanchepeerinfo = node.getavalanchepeerinfo()
        assert_equal(len(avalanchepeerinfo), 1)
        # With a single node
        assert_equal(len(avalanchepeerinfo[0]["node_list"]), 1)
        nodeid = avalanchepeerinfo[0]["node_list"][0]

        # Subsequent avahello get ignored
        for _ in range(3):
            with node.assert_debug_log(
                [f"Ignoring avahello from peer {nodeid}: already in our node set"]
            ):
                no_proof_peer.send_avahello(delegation, master_key)

        # Restart the node
        self.restart_node(
            0,
            self.extra_args[0]
            + [
                f"-avaproof={proof}",
                "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
            ],
        )

        assert_equal(
            int(node.getnetworkinfo()["localservices"], 16) & NODE_AVALANCHE,
            NODE_AVALANCHE,
        )

        def check_avahello(args):
            # Restart the node with the given args
            self.restart_node(0, self.extra_args[0] + args)

            peer = get_ava_p2p_interface_no_handshake(node)

            avahello = peer.wait_for_avahello().hello

            avakey = ECPubKey()
            avakey.set(bytes.fromhex(node.getavalanchekey()))
            assert avakey.verify_schnorr(avahello.sig, avahello.get_sighash(peer))

        self.log.info("Test the avahello signature with a generated delegation")
        check_avahello(
            [
                f"-avaproof={proof}",
                "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
            ]
        )

        self.log.info("Test the avahello signature with a supplied delegation")
        check_avahello(
            [
                f"-avaproof={proof}",
                f"-avadelegation={delegation}",
                f"-avamasterkey={bytes_to_wif(master_key.get_bytes())}",
            ]
        )

        stakes = create_coinbase_stakes(node, [blockhashes[1]], addrkey0.key)
        interface_proof_hex = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey, stakes
        )
        limited_id = avalanche_proof_from_hex(interface_proof_hex).limited_proofid

        # delegate
        delegated_key = ECKey()
        delegated_key.generate()
        interface_delegation_hex = node.delegateavalancheproof(
            uint256_hex(limited_id),
            bytes_to_wif(privkey.get_bytes()),
            delegated_key.get_pubkey().get_bytes().hex(),
            None,
        )

        self.log.info("Test that wrong avahello signature causes a ban")
        bad_interface = get_ava_p2p_interface_no_handshake(node)
        wrong_key = ECKey()
        wrong_key.generate()
        with node.assert_debug_log(
            [
                "Misbehaving",
                (
                    "peer=1 (0 -> 100) DISCOURAGE THRESHOLD EXCEEDED: "
                    "invalid-avahello-signature"
                ),
            ]
        ):
            bad_interface.send_avahello(interface_delegation_hex, wrong_key)
            bad_interface.wait_for_disconnect()

        self.log.info(
            "Check that receiving a valid avahello triggers a proof getdata request"
        )
        good_interface = get_ava_p2p_interface_no_handshake(node)
        proofid = good_interface.send_avahello(interface_delegation_hex, delegated_key)

        def getdata_found(peer, proofid):
            with p2p_lock:
                return (
                    good_interface.last_message.get("getdata")
                    and good_interface.last_message["getdata"].inv[-1].hash == proofid
                )

        self.wait_until(lambda: getdata_found(good_interface, proofid))

        self.log.info("Check that we can download the proof from our peer")

        node_proofid = avalanche_proof_from_hex(proof).proofid

        getdata = msg_getdata([CInv(MSG_AVA_PROOF, node_proofid)])

        self.log.info("Proof has been inv'ed recently, check it can be requested")
        good_interface.send_message(getdata)

        # This is our local proof so if it was announced it can be requested
        # without waiting for validation.
        assert_equal(len(node.getavalanchepeerinfo()), 0)

        def proof_received(peer, proofid):
            with p2p_lock:
                return (
                    peer.last_message.get("avaproof")
                    and peer.last_message["avaproof"].proof.proofid == proofid
                )

        self.wait_until(lambda: proof_received(good_interface, node_proofid))

        # Restart the node
        self.restart_node(
            0,
            self.extra_args[0]
            + [
                f"-avaproof={proof}",
                "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
            ],
        )

        def wait_for_proof_validation():
            # Add an inbound so the node proof can be registered and advertised
            node.add_p2p_connection(P2PInterface())
            # Connect some blocks to trigger the proof verification
            self.generate(node, 1, sync_fun=self.no_op)
            self.wait_until(lambda: node_proofid in get_proof_ids(node))

        wait_for_proof_validation()

        self.log.info("The proof has not been announced, it cannot be requested")
        peer = get_ava_p2p_interface_no_handshake(node, services=NODE_NETWORK)

        # Build a new proof and only announce this one
        _, new_proof_obj = gen_proof(self, node)
        new_proof = new_proof_obj.serialize().hex()
        new_proofid = new_proof_obj.proofid

        # Make the proof mature
        self.generate(node, 2, sync_fun=self.no_op)

        node.sendavalancheproof(new_proof)
        wait_for_proof(node, uint256_hex(new_proofid))

        # Request both our local proof and the new proof
        getdata = msg_getdata(
            [CInv(MSG_AVA_PROOF, node_proofid), CInv(MSG_AVA_PROOF, new_proofid)]
        )
        peer.send_message(getdata)

        self.wait_until(lambda: proof_received(peer, new_proofid))
        assert not proof_received(peer, node_proofid)

        self.log.info("The proof is known for long enough to be requested")
        current_time = int(time.time())
        node.setmocktime(current_time + UNCONDITIONAL_RELAY_DELAY)

        getdata = msg_getdata([CInv(MSG_AVA_PROOF, node_proofid)])
        peer.send_message(getdata)
        self.wait_until(lambda: proof_received(peer, node_proofid))

        # Restart the node
        self.restart_node(
            0,
            self.extra_args[0]
            + [
                f"-avaproof={proof}",
                "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
            ],
        )
        wait_for_proof_validation()
        # The only peer is the node itself
        assert_equal(len(node.getavalanchepeerinfo()), 1)
        assert_equal(node.getavalanchepeerinfo()[0]["proof"], proof)

        peer = get_ava_p2p_interface_no_handshake(node)
        peer_proofid = peer.send_avahello(interface_delegation_hex, delegated_key)

        self.wait_until(lambda: getdata_found(peer, peer_proofid))
        assert peer_proofid not in get_proof_ids(node)

        self.log.info(
            "Check that the peer gets added as an avalanche node as soon as the node"
            " knows about the proof"
        )
        node.sendavalancheproof(interface_proof_hex)

        def has_node_count(count):
            peerinfo = node.getavalanchepeerinfo()
            return (
                len(peerinfo) == 2
                and peerinfo[-1]["proof"] == interface_proof_hex
                and peerinfo[-1]["nodecount"] == count
            )

        self.wait_until(lambda: has_node_count(1))

        self.log.info(
            "Check that the peer gets added immediately if the proof is already known"
        )

        # Connect another peer using the same proof
        peer_proof_known = get_ava_p2p_interface_no_handshake(node)
        peer_proof_known.send_avahello(interface_delegation_hex, delegated_key)

        self.wait_until(lambda: has_node_count(2))

        self.log.info("Check that repeated avahello messages are ignored")
        for i in range(3):
            with node.assert_debug_log(["Ignoring avahello from peer"]):
                peer_proof_known.send_avahello(interface_delegation_hex, delegated_key)

        self.log.info("Invalidate the proof and check the nodes are removed")
        tip = node.getbestblockhash()
        # Invalidate the block after the proof utxo to make the proof immature
        node.invalidateblock(blockhashes[2])
        # Change the address to make sure we don't generate a block identical
        # to the one we just invalidated. Can be generate(1) after D9694 or
        # D9697 is landed.
        forked_tip = self.generatetoaddress(
            node, 1, ADDRESS_ECREG_UNSPENDABLE, sync_fun=self.no_op
        )[0]

        self.wait_until(lambda: len(node.getavalanchepeerinfo()) == 1)
        assert peer_proofid not in get_proof_ids(node)

        self.log.info("Reorg back and check the nodes are added back")
        node.invalidateblock(forked_tip)
        node.reconsiderblock(tip)
        self.wait_until(lambda: has_node_count(2), timeout=2)

        self.log.info(
            "Check the node sends an avahello message to all peers even if the"
            " avalanche service bit is not advertised"
        )
        for _ in range(3):
            nonavapeer = get_ava_p2p_interface_no_handshake(node, services=NODE_NETWORK)
            nonavapeer.wait_for_avahello()

        self.log.info(
            "Check the node waits for inbound connection to advertise its proof"
        )

        self.restart_node(
            0,
            self.extra_args[0]
            + [
                f"-avaproof={proof}",
                f"-avadelegation={delegation}",
                f"-avamasterkey={bytes_to_wif(master_key.get_bytes())}",
            ],
        )

        outbound = AvaP2PInterface()
        outbound.master_privkey, outbound.proof = gen_proof(self, node)
        node.add_outbound_p2p_connection(
            outbound,
            p2p_idx=1,
            connection_type="avalanche",
            services=NODE_NETWORK | NODE_AVALANCHE,
        )

        # Check the proof is not advertised when there is no inbound
        hello = outbound.wait_for_avahello().hello
        assert_equal(hello.delegation.limited_proofid, 0)
        outbound.avahello = None

        # Check we don't get any avahello message until we have inbounds
        for _ in range(5):
            node.mockscheduler(MAX_AVALANCHE_PERIODIC_NETWORKING)
            outbound.sync_with_ping()
            assert outbound.avahello is None

        # Add an inbound
        inbound = node.add_p2p_connection(P2PInterface())

        # Wait for the periodic update
        node.mockscheduler(MAX_AVALANCHE_PERIODIC_NETWORKING)

        # Check we got an avahello with the expected proof
        hello = outbound.wait_for_avahello().hello
        assert_equal(hello.delegation.limited_proofid, proofobj.limited_proofid)
        outbound.avahello = None

        # Check we don't get any avahello message anymore
        for _ in range(5):
            node.mockscheduler(MAX_AVALANCHE_PERIODIC_NETWORKING)
            outbound.sync_with_ping()
            assert outbound.avahello is None

        # Disconnect the inbound peer
        inbound.peer_disconnect()
        inbound.wait_for_disconnect()

        # Add another outbound peer
        other_outbound = AvaP2PInterface()
        other_outbound.master_privkey, other_outbound.proof = gen_proof(self, node)
        node.add_outbound_p2p_connection(
            other_outbound,
            p2p_idx=2,
            connection_type="avalanche",
            services=NODE_NETWORK | NODE_AVALANCHE,
        )

        # Check we got an avahello with the expected proof, because the inbound
        # capability has been latched
        hello = other_outbound.wait_for_avahello().hello
        assert_equal(hello.delegation.limited_proofid, proofobj.limited_proofid)


if __name__ == "__main__":
    AvalanchePeerDiscoveryTest().main()
