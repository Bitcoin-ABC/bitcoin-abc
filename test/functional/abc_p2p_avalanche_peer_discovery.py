#!/usr/bin/env python3
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
    create_coinbase_stakes,
    get_ava_p2p_interface,
    get_proof_ids,
)
from test_framework.key import ECKey, ECPubKey
from test_framework.messages import (
    MSG_AVA_PROOF,
    NODE_AVALANCHE,
    NODE_NETWORK,
    CInv,
    FromHex,
    LegacyAvalancheProof,
    msg_getdata,
)
from test_framework.p2p import p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet_util import bytes_to_wif

UNCONDITIONAL_RELAY_DELAY = 2 * 60


class AvalancheTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [['-enableavalanche=1',
                            '-enableavalanchepeerdiscovery=1']]
        self.supports_cli = False

    def run_test(self):
        node = self.nodes[0]

        # duplicate the deterministic sig test from src/test/key_tests.cpp
        privkey = ECKey()
        privkey.set(bytes.fromhex(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747"), True)
        wif_privkey = bytes_to_wif(privkey.get_bytes())

        self.log.info(
            "Check the node is signalling the avalanche service bit only if there is a proof.")
        assert_equal(
            int(node.getnetworkinfo()['localservices'], 16) & NODE_AVALANCHE,
            0)

        # Create stakes by mining blocks
        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = node.generatetoaddress(2, addrkey0.address)
        stakes = create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key)

        proof_sequence = 11
        proof_expiration = 12
        proof = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey, stakes)

        # Restart the node
        self.restart_node(0, self.extra_args[0] + [
            "-avaproof={}".format(proof),
            "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
        ])

        assert_equal(
            int(node.getnetworkinfo()['localservices'], 16) & NODE_AVALANCHE,
            NODE_AVALANCHE)

        def check_avahello(args):
            # Restart the node with the given args
            self.restart_node(0, self.extra_args[0] + args)

            peer = get_ava_p2p_interface(node)

            avahello = peer.wait_for_avahello().hello

            avakey = ECPubKey()
            avakey.set(bytes.fromhex(node.getavalanchekey()))
            assert avakey.verify_schnorr(
                avahello.sig, avahello.get_sighash(peer))

        self.log.info(
            "Test the avahello signature with a generated delegation")
        check_avahello([
            "-avaproof={}".format(proof),
            "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN"
        ])

        master_key = ECKey()
        master_key.generate()
        limited_id = FromHex(LegacyAvalancheProof(), proof).limited_proofid
        delegation = node.delegateavalancheproof(
            f"{limited_id:0{64}x}",
            bytes_to_wif(privkey.get_bytes()),
            master_key.get_pubkey().get_bytes().hex(),
        )

        self.log.info("Test the avahello signature with a supplied delegation")
        check_avahello([
            "-avaproof={}".format(proof),
            "-avadelegation={}".format(delegation),
            "-avamasterkey={}".format(bytes_to_wif(master_key.get_bytes())),
        ])

        stakes = create_coinbase_stakes(node, [blockhashes[1]], addrkey0.key)
        interface_proof_hex = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey, stakes)
        limited_id = FromHex(
            LegacyAvalancheProof(),
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
        bad_interface = get_ava_p2p_interface(node)
        wrong_key = ECKey()
        wrong_key.generate()
        with node.assert_debug_log(
                ["Misbehaving",
                 "peer=1 (0 -> 100) BAN THRESHOLD EXCEEDED: invalid-avahello-signature"]):
            bad_interface.send_avahello(interface_delegation_hex, wrong_key)
            bad_interface.wait_for_disconnect()

        self.log.info(
            'Check that receiving a valid avahello triggers a proof getdata request')
        good_interface = get_ava_p2p_interface(node)
        proofid = good_interface.send_avahello(
            interface_delegation_hex, delegated_key)

        def getdata_found(peer, proofid):
            with p2p_lock:
                return good_interface.last_message.get(
                    "getdata") and good_interface.last_message["getdata"].inv[-1].hash == proofid
        self.wait_until(lambda: getdata_found(good_interface, proofid))

        self.log.info('Check that we can download the proof from our peer')

        node_proofid = FromHex(LegacyAvalancheProof(), proof).proofid

        def wait_for_proof_validation():
            # Connect some blocks to trigger the proof verification
            node.generate(1)
            self.wait_until(lambda: node_proofid in get_proof_ids(node))

        wait_for_proof_validation()

        getdata = msg_getdata([CInv(MSG_AVA_PROOF, node_proofid)])

        self.log.info(
            "Proof has been inv'ed recently, check it can be requested")
        good_interface.send_message(getdata)

        def proof_received(peer):
            with p2p_lock:
                return peer.last_message.get(
                    "avaproof") and peer.last_message["avaproof"].proof.proofid == node_proofid
        self.wait_until(lambda: proof_received(good_interface))

        # Restart the node
        self.restart_node(0, self.extra_args[0] + [
            "-avaproof={}".format(proof),
            "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
        ])
        wait_for_proof_validation()

        self.log.info(
            "The proof has not been announced, it cannot be requested")
        peer = get_ava_p2p_interface(node, services=NODE_NETWORK)
        peer.send_message(getdata)

        # Give enough time for the node to answer. Since we cannot check for a
        # non-event this is the best we can do
        time.sleep(2)
        assert not proof_received(peer)

        self.log.info("The proof is known for long enough to be requested")
        current_time = int(time.time())
        node.setmocktime(current_time + UNCONDITIONAL_RELAY_DELAY)

        peer.send_message(getdata)
        self.wait_until(lambda: proof_received(peer))

        # Restart the node
        self.restart_node(0, self.extra_args[0] + [
            "-avaproof={}".format(proof),
            "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
        ])
        wait_for_proof_validation()
        # The only peer is the node itself
        assert_equal(len(node.getavalanchepeerinfo()), 1)
        assert_equal(node.getavalanchepeerinfo()[0]["proof"], proof)

        peer = get_ava_p2p_interface(node)
        peer_proofid = peer.send_avahello(
            interface_delegation_hex, delegated_key)

        self.wait_until(lambda: getdata_found(peer, peer_proofid))
        assert peer_proofid not in get_proof_ids(node)

        self.log.info(
            "Check that the peer gets added as an avalanche node as soon as the node knows about the proof")
        node.sendavalancheproof(interface_proof_hex)

        def has_node_count(count):
            peerinfo = node.getavalanchepeerinfo()
            return (len(peerinfo) == 2 and
                    peerinfo[-1]["proof"] == interface_proof_hex and
                    peerinfo[-1]["nodecount"] == count)

        self.wait_until(lambda: has_node_count(1))

        self.log.info(
            "Check that the peer gets added immediately if the proof is already known")

        # Connect another peer using the same proof
        peer_proof_known = get_ava_p2p_interface(node)
        peer_proof_known.send_avahello(interface_delegation_hex, delegated_key)

        self.wait_until(lambda: has_node_count(2))

        self.log.info("Invalidate the proof and check the nodes are removed")
        tip = node.getbestblockhash()
        # Invalidate the block with the proof utxo
        node.invalidateblock(blockhashes[1])
        # Change the address to make sure we don't generate a block identical
        # to the one we just invalidated. Can be generate(1) after D9694 or
        # D9697 is landed.
        forked_tip = node.generatetoaddress(1, ADDRESS_ECREG_UNSPENDABLE)[0]
        self.wait_until(lambda: node.getbestblockhash() == forked_tip)

        self.wait_until(lambda: len(node.getavalanchepeerinfo()) == 1)
        assert peer_proofid not in get_proof_ids(node)

        self.log.info("Reorg back and check the nodes are added back")
        node.invalidateblock(forked_tip)
        node.reconsiderblock(tip)
        self.wait_until(lambda: has_node_count(2), timeout=2)


if __name__ == '__main__':
    AvalancheTest().main()
