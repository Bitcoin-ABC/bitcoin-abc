#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the addavalanchenode RPC"""

from test_framework.avatools import create_coinbase_stakes
from test_framework.key import ECKey
from test_framework.messages import (
    AvalancheDelegation,
    AvalancheDelegationLevel,
    AvalancheProof,
    FromHex,
    hash256,
    ser_string,
)
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
                error_code, error_message, nodeid=nodeid, proof=proof, pubkey=proof_master, delegation=None):
            assert_raises_rpc_error(
                error_code,
                error_message,
                node.addavalanchenode,
                nodeid,
                pubkey,
                proof,
                delegation,
            )

        self.log.info("Invalid proof")
        check_addavalanchenode_error(-22,
                                     "Proof must be an hexadecimal string",
                                     proof="not a proof")
        check_addavalanchenode_error(-22,
                                     "Proof has invalid format",
                                     proof="f000")
        no_stake = node.buildavalancheproof(
            proof_sequence, proof_expiration, proof_master, [])
        check_addavalanchenode_error(-8,
                                     "The proof is invalid: no-stake",
                                     proof=no_stake)

        self.log.info("Node doesn't exist")
        check_addavalanchenode_error(-8,
                                     f"The node does not exist: {nodeid + 1}",
                                     nodeid=nodeid + 1)

        self.log.info("Invalid delegation")
        dg_privkey = ECKey()
        dg_privkey.generate()
        dg_pubkey = dg_privkey.get_pubkey().get_bytes()
        check_addavalanchenode_error(-22,
                                     "Delegation must be an hexadecimal string",
                                     pubkey=dg_pubkey.hex(),
                                     delegation="not a delegation")
        check_addavalanchenode_error(-22,
                                     "Delegation has invalid format",
                                     pubkey=dg_pubkey.hex(),
                                     delegation="f000")

        self.log.info("Delegation mismatch with the proof")
        delegation_wrong_proofid = AvalancheDelegation()
        check_addavalanchenode_error(-8,
                                     "The delegation does not match the proof",
                                     pubkey=dg_pubkey.hex(),
                                     delegation=delegation_wrong_proofid.serialize().hex())

        proofobj = FromHex(AvalancheProof(), proof)
        delegation = AvalancheDelegation(
            limited_proofid=proofobj.limited_proofid,
            proof_master=proofobj.master,
        )

        self.log.info("Delegation with bad signature")
        bad_level = AvalancheDelegationLevel(
            pubkey=dg_pubkey,
        )
        delegation.levels.append(bad_level)
        check_addavalanchenode_error(-8,
                                     "The delegation is invalid",
                                     pubkey=dg_pubkey.hex(),
                                     delegation=delegation.serialize().hex())

        delegation.levels = []
        level = AvalancheDelegationLevel(
            pubkey=dg_pubkey,
            sig=privkey.sign_schnorr(
                hash256(
                    delegation.getid() +
                    ser_string(dg_pubkey)
                )
            )
        )
        delegation.levels.append(level)

        self.log.info("Key mismatch with the proof")
        check_addavalanchenode_error(
            -5,
            "The public key does not match the proof",
            pubkey=dg_pubkey.hex(),
        )

        self.log.info("Key mismatch with the delegation")
        random_privkey = ECKey()
        random_privkey.generate()
        random_pubkey = random_privkey.get_pubkey()
        check_addavalanchenode_error(
            -5,
            "The public key does not match the delegation",
            pubkey=random_pubkey.get_bytes().hex(),
            delegation=delegation.serialize().hex(),
        )

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

        self.log.info("Add a node with a valid delegation")
        assert node.addavalanchenode(
            nodeid,
            dg_pubkey.hex(),
            proof,
            delegation.serialize().hex(),
        )

        self.log.info("Several nodes can share a proof")
        nodeid2 = add_interface_node(node)
        assert node.addavalanchenode(nodeid2, proof_master, proof)


if __name__ == '__main__':
    AddAvalancheNodeTest().main()
