#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test building avalanche proofs and using them to add avalanche peers."""

from test_framework.avatools import get_stakes
from test_framework.key import ECKey, bytes_to_wif
from test_framework.messages import AvalancheDelegation
from test_framework.mininode import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.test_node import ErrorMatch
from test_framework.util import (
    append_config,
    wait_until,
    assert_raises_rpc_error,
)

AVALANCHE_MAX_PROOF_STAKES = 1000


def add_interface_node(test_node) -> str:
    """Create a mininode, connect it to test_node, return the nodeid
    of the mininode as registered by test_node.
    """
    n = P2PInterface()
    test_node.add_p2p_connection(n)
    n.wait_for_verack()
    return test_node.getpeerinfo()[-1]['id']


class AvalancheProofTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [['-enableavalanche=1', '-avacooldown=0'], ]
        self.supports_cli = False
        self.rpc_timeout = 120

    def run_test(self):
        node = self.nodes[0]

        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = node.generatetoaddress(100, addrkey0.address)

        self.log.info(
            "Make build a valid proof and restart the node to use it")
        privkey = ECKey()
        privkey.set(bytes.fromhex(
            "12b004fff7f4b69ef8650e767f18f11ede158148b425660723b9f9a66e61f747"), True)

        def get_hex_pubkey(privkey):
            return privkey.get_pubkey().get_bytes().hex()

        proof_master = get_hex_pubkey(privkey)
        proof_sequence = 11
        proof_expiration = 12
        proof = node.buildavalancheproof(
            proof_sequence, proof_expiration, proof_master,
            get_stakes(node, [blockhashes[0]], addrkey0.key))

        # Restart the node, making sure it is initially in IBD mode
        minchainwork = int(node.getblockchaininfo()["chainwork"], 16) + 1
        self.restart_node(0, self.extra_args[0] + [
            "-avaproof={}".format(proof),
            "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
            "-minimumchainwork=0x{:x}".format(minchainwork),
        ])

        self.log.info(
            "The proof verification should be delayed until IBD is complete")
        assert node.getblockchaininfo()["initialblockdownload"] is True
        # Our proof cannot be verified during IBD, so we should have no peer
        assert not node.getavalanchepeerinfo()
        # Mining a few more blocks should cause us to leave IBD
        node.generate(2)
        # Our proof is now verified and our node is added as a peer
        assert node.getblockchaininfo()["initialblockdownload"] is False
        wait_until(lambda: len(node.getavalanchepeerinfo()) == 1, timeout=5)

        self.log.info(
            "A proof using the maximum number of stakes is accepted...")
        blockhashes = node.generatetoaddress(AVALANCHE_MAX_PROOF_STAKES + 1,
                                             addrkey0.address)

        too_many_stakes = get_stakes(node, blockhashes, addrkey0.key)
        maximum_stakes = get_stakes(node, blockhashes[:-1], addrkey0.key)
        good_proof = node.buildavalancheproof(
            proof_sequence, proof_expiration,
            proof_master, maximum_stakes)
        peerid1 = add_interface_node(node)
        assert node.addavalanchenode(peerid1, proof_master, good_proof)

        self.log.info("A proof using too many stakes should be rejected...")
        too_many_utxos = node.buildavalancheproof(
            proof_sequence, proof_expiration,
            proof_master, too_many_stakes)
        peerid2 = add_interface_node(node)
        assert not node.addavalanchenode(peerid2, proof_master, too_many_utxos)

        self.log.info("Generate delegations for the proof")

        # Stack up a few delegation levels
        def gen_privkey():
            pk = ECKey()
            pk.generate()
            return pk

        delegator_privkey = privkey
        delegation = None
        for _ in range(10):
            delegated_privkey = gen_privkey()
            delegation = node.delegateavalancheproof(
                proof,
                bytes_to_wif(delegator_privkey.get_bytes()),
                get_hex_pubkey(delegated_privkey),
                delegation,
            )
            delegator_privkey = delegated_privkey

        random_privkey = gen_privkey()
        random_pubkey = get_hex_pubkey(random_privkey)

        # Invalid proof
        assert_raises_rpc_error(-8, "The proof is invalid",
                                node.delegateavalancheproof,
                                too_many_utxos,
                                bytes_to_wif(privkey.get_bytes()),
                                random_pubkey,
                                )

        # Invalid privkey
        assert_raises_rpc_error(-5, "The private key is invalid",
                                node.delegateavalancheproof,
                                proof,
                                bytes_to_wif(bytes(32)),
                                random_pubkey,
                                )

        # Invalid delegation
        bad_dg = AvalancheDelegation()
        assert_raises_rpc_error(-8, "The supplied delegation is not valid",
                                node.delegateavalancheproof,
                                proof,
                                bytes_to_wif(privkey.get_bytes()),
                                random_pubkey,
                                bad_dg.serialize().hex(),
                                )

        # Wrong privkey, does not match the proof
        assert_raises_rpc_error(-8, "The private key does not match the proof or the delegation",
                                node.delegateavalancheproof,
                                proof,
                                bytes_to_wif(random_privkey.get_bytes()),
                                random_pubkey,
                                )

        # Wrong privkey, match the proof but does not match the delegation
        assert_raises_rpc_error(-8, "The private key does not match the proof or the delegation",
                                node.delegateavalancheproof,
                                proof,
                                bytes_to_wif(privkey.get_bytes()),
                                random_pubkey,
                                delegation,
                                )

        # Test invalid proofs
        self.log.info("Bad proof should be rejected at startup")
        no_stake = node.buildavalancheproof(
            proof_sequence, proof_expiration, proof_master, [])

        dust = node.buildavalancheproof(
            proof_sequence, proof_expiration, proof_master,
            get_stakes(node, [blockhashes[0]], addrkey0.key, amount="0"))

        duplicate_stake = node.buildavalancheproof(
            proof_sequence, proof_expiration, proof_master,
            get_stakes(node, [blockhashes[0]] * 2, addrkey0.key))

        bad_sig = ("0b000000000000000c0000000000000021030b4c866585dd868a9d62348"
                   "a9cd008d6a312937048fff31670e7e920cfc7a7440105c5f72f5d6da3085"
                   "583e75ee79340eb4eff208c89988e7ed0efb30b87298fa30000000000f20"
                   "52a0100000003000000210227d85ba011276cf25b51df6a188b75e604b3"
                   "8770a462b2d0e9fb2fc839ef5d3faf07f001dd38e9b4a43d07d5d449cc0"
                   "f7d2888d96b82962b3ce516d1083c0e031773487fc3c4f2e38acd1db974"
                   "1321b91a79b82d1c2cfd47793261e4ba003cf5")

        self.stop_node(0)

        def check_proof_init_error(proof, message):
            node.assert_start_raises_init_error(
                self.extra_args[0] + [
                    "-avaproof={}".format(proof),
                    "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
                ],
                expected_msg="Error: " + message,
            )

        check_proof_init_error(no_stake,
                               "the avalanche proof has no stake")
        check_proof_init_error(dust,
                               "the avalanche proof stake is too low")
        check_proof_init_error(duplicate_stake,
                               "the avalanche proof has duplicated stake")
        check_proof_init_error(bad_sig,
                               "the avalanche proof has invalid stake signatures")
        # The too many utxos case creates a proof which is that large that it
        # cannot fit on the command line
        append_config(node.datadir, ["avaproof={}".format(too_many_utxos)])
        node.assert_start_raises_init_error(
            self.extra_args[0] + [
                "-avamasterkey=cND2ZvtabDbJ1gucx9GWH6XT9kgTAqfb6cotPt5Q5CyxVDhid2EN",
            ],
            expected_msg="Error: the avalanche proof has too many utxos",
            match=ErrorMatch.PARTIAL_REGEX,
        )


if __name__ == '__main__':
    AvalancheProofTest().main()
