# Copyright (c) 2020-2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the getavalanchepeerinfo RPC."""
from random import choice

from test_framework.avatools import (
    avalanche_proof_from_hex,
    create_coinbase_stakes,
    get_ava_p2p_interface_no_handshake,
)
from test_framework.key import ECKey
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_raises_rpc_error,
    uint256_hex,
)
from test_framework.wallet_util import bytes_to_wif


class GetAvalanchePeerInfoTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-persistavapeers=0",
            ]
        ]

    def test_proofs_and_nodecounts(self):
        node = self.nodes[0]
        peercount = 5
        nodecount = 10

        self.log.info(f"Generating {peercount} peers with {nodecount} nodes each")

        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = self.generatetoaddress(
            node, peercount, addrkey0.address, sync_fun=self.no_op
        )
        # Use the first coinbase to create a stake
        stakes = create_coinbase_stakes(node, blockhashes, addrkey0.key)

        def getProof(stake):
            privkey = ECKey()
            privkey.generate()
            pubkey = privkey.get_pubkey()

            proof_sequence = 11
            proof_expiration = 0
            proof = node.buildavalancheproof(
                proof_sequence,
                proof_expiration,
                bytes_to_wif(privkey.get_bytes()),
                [stake],
            )
            return (pubkey.get_bytes().hex(), proof)

        # Create peercount * nodecount node array
        nodes = [
            [get_ava_p2p_interface_no_handshake(node) for _ in range(nodecount)]
            for _ in range(peercount)
        ]

        # Add peercount peers and bind all the nodes to each
        proofs = []
        for i in range(peercount):
            pubkey_hex, proof = getProof(stakes[i])
            proofs.append(proof)
            [node.addavalanchenode(n.nodeid, pubkey_hex, proof) for n in nodes[i]]

        self.log.info("Testing getavalanchepeerinfo...")
        avapeerinfo = node.getavalanchepeerinfo()

        assert_equal(len(avapeerinfo), peercount)
        for i, peer in enumerate(avapeerinfo):
            proofid_hex = uint256_hex(avalanche_proof_from_hex(proofs[i]).proofid)
            assert_equal(peer["avalanche_peerid"], i)
            assert_equal(peer["proofid"], proofid_hex)
            assert_equal(peer["proof"], proofs[i])
            assert_equal(peer["nodecount"], nodecount)
            assert_equal(set(peer["node_list"]), {n.nodeid for n in nodes[i]})

        self.log.info("Testing with a specified proofid")

        assert_raises_rpc_error(
            -8, "Proofid not found", node.getavalanchepeerinfo, proofid="0" * 64
        )

        target_proof = choice(proofs)
        target_proofid = avalanche_proof_from_hex(target_proof).proofid
        avapeerinfo = node.getavalanchepeerinfo(proofid=uint256_hex(target_proofid))
        assert_equal(len(avapeerinfo), 1)
        assert_equal(avapeerinfo[0]["proof"], target_proof)

    def run_test(self):
        self.test_proofs_and_nodecounts()


if __name__ == "__main__":
    GetAvalanchePeerInfoTest().main()
