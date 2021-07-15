#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the addavalanchenode RPC"""

from test_framework.avatools import create_coinbase_stakes
from test_framework.key import ECKey
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_raises_rpc_error,
)


def add_interface_node(test_node) -> int:
    """Create a peer, connect it to test_node, return the nodeid of the peer as
    registered by test_node.
    """
    n = P2PInterface()
    test_node.add_p2p_connection(n)
    n.wait_for_verack()
    return test_node.getpeerinfo()[-1]['id']


class AddAvalancheNodeTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [['-enableavalanche=1', '-avacooldown=0']]

    def run_test(self):
        node = self.nodes[0]

        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = node.generatetoaddress(2, addrkey0.address)
        stakes = create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key)

        privkey = ECKey()
        privkey.generate()

        proof_master = privkey.get_pubkey().get_bytes().hex()
        proof_sequence = 42
        proof_expiration = 2000000000
        proof = node.buildavalancheproof(
            proof_sequence, proof_expiration, proof_master, stakes)

        nodeid = add_interface_node(node)

        def check_addavalanchenode_error(
                error_code, error_message, proof=proof, pubkey=proof_master):
            assert_raises_rpc_error(
                error_code,
                error_message,
                node.addavalanchenode,
                nodeid,
                pubkey,
                proof,
            )

        self.log.info("Invalid proof")
        check_addavalanchenode_error(-8,
                                     "Proof must be an hexadecimal string",
                                     proof="not a proof")
        check_addavalanchenode_error(-8,
                                     "Proof has invalid format",
                                     proof="f000")

        self.log.info("Key mismatch")
        random_privkey = ECKey()
        random_privkey.generate()
        random_pubkey = random_privkey.get_pubkey().get_bytes().hex()
        assert not node.addavalanchenode(nodeid, random_pubkey, proof)

        self.log.info("Node doesn't exist")
        assert not node.addavalanchenode(nodeid + 1, proof_master, proof)

        self.log.info("Invalid proof")
        no_stake = node.buildavalancheproof(
            proof_sequence, proof_expiration, proof_master, [])
        assert not node.addavalanchenode(nodeid, proof_master, no_stake)

        self.log.info("Happy path")
        assert node.addavalanchenode(nodeid, proof_master, proof)
        # Adding several times is OK
        assert node.addavalanchenode(nodeid, proof_master, proof)

        # Use an hardcoded proof. This will help detecting proof format changes.
        # Generated using:
        # stakes = create_coinbase_stakes(node, [blockhashes[1]], addrkey0.key)
        # hardcoded_proof = node.buildavalancheproof(
        #    proof_sequence, proof_expiration, random_pubkey, stakes)
        hardcoded_pubkey = "037d20fcfe118296bb53f0a8f87c864e7b9831c4fcd7c6a0bb9a58e0e0f53d5cbc"
        hardcoded_proof = (
            "2a00000000000000009435770000000021037d20fcfe118296bb53f0a8f87c864e"
            "7b9831c4fcd7c6a0bb9a58e0e0f53d5cbc01683ef49024cf25bb55775b327f5e68"
            "c79da3a7824dc03df5623c96f4a60158f90000000000f902950000000095010000"
            "210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d"
            "3f612834ef0e2545d6359e9f34967c2bb69cb88fe246fed716d998f3f62eba1ef6"
            "6a547606a7ac14c1b5697f4acc20853b3f99954f4f7b6e9bf8a085616d3adfc7"
        )
        assert node.addavalanchenode(nodeid, hardcoded_pubkey, hardcoded_proof)

        self.log.info("Several nodes can share a proof")
        nodeid2 = add_interface_node(node)
        assert node.addavalanchenode(nodeid2, proof_master, proof)


if __name__ == '__main__':
    AddAvalancheNodeTest().main()
