# Copyright (c) 2020-2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the getavalanchepeerinfo RPC."""
from random import choice

from test_framework.avatools import (
    AvaP2PInterface,
    avalanche_proof_from_hex,
    create_coinbase_stakes,
    gen_proof,
    get_ava_p2p_interface_no_handshake,
)
from test_framework.key import ECKey
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalancheVote,
    AvalancheVoteError,
)
from test_framework.p2p import p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_raises_rpc_error,
    uint256_hex,
)
from test_framework.wallet_util import bytes_to_wif

# The interval between avalanche statistics computation
AVALANCHE_STATISTICS_INTERVAL = 10 * 60


class MutedAvaP2PInterface(AvaP2PInterface):
    def __init__(self, test_framework=None, node=None):
        super().__init__(test_framework, node)
        self.is_responding = False
        self.privkey = None
        self.addr = None
        self.poll_received = 0

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
            assert_equal(peer["availability_score"], 0.0)
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

    def test_peer_availability_scores(self):
        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
            ],
        )
        node = self.nodes[0]

        # Setup node interfaces, some responsive and some not
        avanodes = [
            # First peer has all responsive nodes
            AllYesAvaP2PInterface(),
            AllYesAvaP2PInterface(),
            AllYesAvaP2PInterface(),
            # Next peer has only one responsive node
            MutedAvaP2PInterface(),
            MutedAvaP2PInterface(),
            AllYesAvaP2PInterface(),
            # Last peer has no responsive nodes
            MutedAvaP2PInterface(),
            MutedAvaP2PInterface(),
            MutedAvaP2PInterface(),
        ]

        # Create some proofs and associate the nodes with them
        avaproofids = []
        p2p_idx = 0
        num_proof = 3
        num_avanode = 3
        for p in range(num_proof):
            master_privkey, proof = gen_proof(self, node)
            avaproofids.append(uint256_hex(proof.proofid))
            for n in range(num_avanode):
                avanode = avanodes[p * num_proof + n]
                avanode.master_privkey = master_privkey
                avanode.proof = proof
                node.add_outbound_p2p_connection(
                    avanode,
                    p2p_idx=p2p_idx,
                    connection_type="avalanche",
                    services=NODE_NETWORK | NODE_AVALANCHE,
                )
                p2p_idx += 1

        assert_equal(len(avanodes), num_proof * num_avanode)

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

        # Move the scheduler forward so that so that our peers get availability
        # scores computed.
        node.mockscheduler(AVALANCHE_STATISTICS_INTERVAL)

        def check_availability_scores():
            peerinfos = node.getavalanchepeerinfo()

            # Get availability scores for each peer
            scores = {}
            for peerinfo in peerinfos:
                p = avaproofids.index(peerinfo["proofid"])
                scores[p] = peerinfo["availability_score"]

                # Wait until scores have been computed
                if scores[p] == 0.0:
                    return False

            # Even though the first peer has more responsive nodes than the second
            # peer, they will both have "good" scores because overall both peers are
            # responsive to polls. But the first peer's score won't necessarily be
            # higher than the second.
            assert_greater_than(scores[0], 5)
            assert_greater_than(scores[1], 5)

            # Last peer should have negative score since it is unresponsive
            assert_greater_than(0.0, scores[2])
            return True

        self.wait_until(check_availability_scores)

    def run_test(self):
        self.test_proofs_and_nodecounts()
        self.test_peer_availability_scores()


if __name__ == "__main__":
    GetAvalanchePeerInfoTest().main()
