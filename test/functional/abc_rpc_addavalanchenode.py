# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the addavalanchenode RPC"""

from test_framework.avatools import avalanche_proof_from_hex, create_coinbase_stakes
from test_framework.key import ECKey
from test_framework.messages import (
    AvalancheDelegation,
    AvalancheDelegationLevel,
    hash256,
    ser_string,
)
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_raises_rpc_error
from test_framework.wallet_util import bytes_to_wif


def add_interface_node(test_node) -> int:
    """Create a peer, connect it to test_node, return the nodeid of the peer as
    registered by test_node.
    """
    n = P2PInterface()
    test_node.add_p2p_connection(n)
    n.wait_for_verack()
    return test_node.getpeerinfo()[-1]["id"]


class AddAvalancheNodeTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
            ]
        ]

    def run_test(self):
        node = self.nodes[0]

        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = self.generatetoaddress(
            node, 2, addrkey0.address, sync_fun=self.no_op
        )
        stakes = create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key)

        privkey = ECKey()
        privkey.generate()
        wif_privkey = bytes_to_wif(privkey.get_bytes())

        proof_master = privkey.get_pubkey().get_bytes().hex()
        proof_sequence = 42
        proof_expiration = 2000000000
        proof = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey, stakes
        )

        nodeid = add_interface_node(node)

        def check_addavalanchenode_error(
            error_code,
            error_message,
            nodeid=nodeid,
            proof=proof,
            pubkey=proof_master,
            delegation=None,
        ):
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
        check_addavalanchenode_error(
            -22, "Proof must be an hexadecimal string", proof="not a proof"
        )
        check_addavalanchenode_error(-22, "Proof has invalid format", proof="f000")
        no_stake = node.buildavalancheproof(
            proof_sequence, proof_expiration, wif_privkey, []
        )
        check_addavalanchenode_error(
            -8, "The proof is invalid: no-stake", proof=no_stake
        )

        self.log.info("Node doesn't exist")
        check_addavalanchenode_error(
            -8, f"The node does not exist: {nodeid + 1}", nodeid=nodeid + 1
        )

        self.log.info("Invalid delegation")
        dg_privkey = ECKey()
        dg_privkey.generate()
        dg_pubkey = dg_privkey.get_pubkey().get_bytes()
        check_addavalanchenode_error(
            -22,
            "Delegation must be an hexadecimal string",
            pubkey=dg_pubkey.hex(),
            delegation="not a delegation",
        )
        check_addavalanchenode_error(
            -22,
            "Delegation has invalid format",
            pubkey=dg_pubkey.hex(),
            delegation="f000",
        )

        self.log.info("Delegation mismatch with the proof")
        delegation_wrong_proofid = AvalancheDelegation()
        check_addavalanchenode_error(
            -8,
            "The delegation does not match the proof",
            pubkey=dg_pubkey.hex(),
            delegation=delegation_wrong_proofid.serialize().hex(),
        )

        proofobj = avalanche_proof_from_hex(proof)
        delegation = AvalancheDelegation(
            limited_proofid=proofobj.limited_proofid,
            proof_master=proofobj.master,
        )

        self.log.info("Delegation with bad signature")
        bad_level = AvalancheDelegationLevel(
            pubkey=dg_pubkey,
        )
        delegation.levels.append(bad_level)
        check_addavalanchenode_error(
            -8,
            "The delegation is invalid",
            pubkey=dg_pubkey.hex(),
            delegation=delegation.serialize().hex(),
        )

        delegation.levels = []
        level = AvalancheDelegationLevel(
            pubkey=dg_pubkey,
            sig=privkey.sign_schnorr(
                hash256(delegation.getid() + ser_string(dg_pubkey))
            ),
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


if __name__ == "__main__":
    AddAvalancheNodeTest().main()
