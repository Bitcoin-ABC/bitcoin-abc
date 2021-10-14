#!/usr/bin/env python3
# Copyright (c) 2020-2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the getavalanchepeerinfo RPC."""
from test_framework.avatools import (
    create_coinbase_stakes,
    get_ava_p2p_interface,
)
from test_framework.key import ECKey
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet_util import bytes_to_wif


class GetAvalanchePeerInfoTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [['-enableavalanche=1', '-avacooldown=0']]

    def run_test(self):
        node = self.nodes[0]
        peercount = 5
        nodecount = 10

        self.log.info(
            f"Generating {peercount} peers with {nodecount} nodes each")

        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = node.generatetoaddress(peercount, addrkey0.address)
        # Use the first coinbase to create a stake
        stakes = create_coinbase_stakes(node, blockhashes, addrkey0.key)

        def getProof(stake):
            privkey = ECKey()
            privkey.generate()
            pubkey = privkey.get_pubkey()

            proof_sequence = 11
            proof_expiration = 12
            proof = node.buildavalancheproof(
                proof_sequence, proof_expiration, bytes_to_wif(
                    privkey.get_bytes()),
                [stake])
            return (pubkey.get_bytes().hex(), proof)

        # Create peercount * nodecount node array
        nodes = [[get_ava_p2p_interface(node) for _ in range(
            nodecount)] for _ in range(peercount)]

        # Add peercount peers and bind all the nodes to each
        proofs = []
        for i in range(peercount):
            pubkey_hex, proof = getProof(stakes[i])
            proofs.append(proof)
            [node.addavalanchenode(n.nodeid, pubkey_hex, proof)
             for n in nodes[i]]

        self.log.info("Testing getavalanchepeerinfo...")
        avapeerinfo = node.getavalanchepeerinfo()

        assert_equal(len(avapeerinfo), peercount)
        for i, peer in enumerate(avapeerinfo):
            assert_equal(peer["peerid"], i)
            assert_equal(peer["proof"], proofs[i])
            assert_equal(peer["nodecount"], nodecount)
            assert_equal(set(peer["nodes"]), set([n.nodeid for n in nodes[i]]))


if __name__ == '__main__':
    GetAvalanchePeerInfoTest().main()
