# Copyright (c) 2020-2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the quorum detection of avalanche."""

from test_framework.avatools import (
    AvaP2PInterface,
    build_msg_avaproofs,
    gen_proof,
    get_ava_p2p_interface_no_handshake,
    get_proof_ids,
    wait_for_proof,
)
from test_framework.key import ECPubKey
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    AvalancheVote,
    AvalancheVoteError,
)
from test_framework.p2p import p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex


class AvalancheQuorumTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 3
        self.min_avaproofs_node_count = 8
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avatimeout=0",
                "-avaminquorumstake=150000000",
                "-avaminquorumconnectedstakeratio=0.8",
                "-minimumchainwork=0",
                "-persistavapeers=0",
            ]
        ] * self.num_nodes
        self.extra_args[0] = self.extra_args[0] + ["-avaminavaproofsnodecount=0"]
        self.extra_args[1] = self.extra_args[1] + [
            f"-avaminavaproofsnodecount={self.min_avaproofs_node_count}"
        ]
        self.extra_args[2] = self.extra_args[2] + [
            f"-avaminavaproofsnodecount={self.min_avaproofs_node_count}"
        ]

    def run_test(self):
        # Initially all nodes start with 8 nodes attached to a single proof
        privkey, proof = gen_proof(self, self.nodes[0])
        for node in self.nodes:
            for _ in range(8):
                n = get_ava_p2p_interface_no_handshake(node)

                success = node.addavalanchenode(
                    n.nodeid,
                    privkey.get_pubkey().get_bytes().hex(),
                    proof.serialize().hex(),
                )
                assert success is True

        # Prepare peers proofs
        peers = []
        for i in range(0, self.min_avaproofs_node_count + 1):
            key, proof = gen_proof(self, self.nodes[0])
            peers.append({"key": key, "proof": proof})

        # Let the nodes known about all the blocks then disconnect them so we're
        # sure they won't exchange proofs when we start connecting peers.
        self.sync_all()
        self.disconnect_nodes(0, 1)

        # Restart node 2 to apply the minimum chainwork and make sure it's still
        # in IBD state.
        chainwork = int(self.nodes[2].getblockchaininfo()["chainwork"], 16)
        self.restart_node(
            2, extra_args=self.extra_args[2] + [f"-minimumchainwork={chainwork + 2:#x}"]
        )
        assert self.nodes[2].getblockchaininfo()["initialblockdownload"]

        # Build polling nodes
        pollers = [get_ava_p2p_interface_no_handshake(node) for node in self.nodes]

        def poll_and_assert_response(node, expected):
            pubkey = ECPubKey()
            pubkey.set(bytes.fromhex(node.getavalanchekey()))

            poller = pollers[node.index]

            # Send poll for best block
            block = int(node.getbestblockhash(), 16)
            poller.send_poll([block])

            # Get response and check that the vote is what we expect
            response = poller.wait_for_avaresponse()
            r = response.response
            assert pubkey.verify_schnorr(response.sig, r.get_hash())
            assert_equal(len(r.votes), 1)

            actual = repr(r.votes[0])
            expected = repr(AvalancheVote(expected, block))
            assert_equal(actual, expected)

        p2p_idx = 0

        def get_ava_outbound(node, peer, empty_avaproof):
            nonlocal p2p_idx

            avapeer = AvaP2PInterface()
            avapeer.proof = peer["proof"]
            avapeer.master_privkey = peer["key"]
            node.add_outbound_p2p_connection(
                avapeer,
                p2p_idx=p2p_idx,
                connection_type="avalanche",
                services=NODE_NETWORK | NODE_AVALANCHE,
            )
            p2p_idx += 1
            avapeer.nodeid = node.getpeerinfo()[-1]["id"]

            peer["node"] = avapeer

            # There is no compact proof request if the node is in IBD state
            if not node.getblockchaininfo()["initialblockdownload"]:
                avapeer.wait_until(lambda: avapeer.last_message.get("getavaproofs"))

                if empty_avaproof:
                    avapeer.send_message(build_msg_avaproofs([]))
                    avapeer.sync_with_ping()
                    with p2p_lock:
                        assert_equal(avapeer.message_count.get("avaproofsreq", 0), 0)
                else:
                    avapeer.send_and_ping(build_msg_avaproofs([peer["proof"]]))
                    avapeer.wait_until(lambda: avapeer.last_message.get("avaproofsreq"))

            return avapeer

        def add_avapeer_and_check_status(peer, expected_status, empty_avaproof=False):
            for i, node in enumerate(self.nodes):
                get_ava_outbound(node, peer, empty_avaproof)
                poll_and_assert_response(node, expected_status[i])

        # Start polling. The response should be UNKNOWN because there's not
        # enough stake
        [
            poll_and_assert_response(node, AvalancheVoteError.UNKNOWN)
            for node in self.nodes
        ]

        # Create one peer with half the remaining missing stake and add one
        # node
        add_avapeer_and_check_status(
            peers[0],
            [
                AvalancheVoteError.UNKNOWN,
                AvalancheVoteError.UNKNOWN,
                AvalancheVoteError.UNKNOWN,
            ],
        )

        # Create a second peer with the other half and add one node.
        # This is enough for node0 but not node1
        add_avapeer_and_check_status(
            peers[1],
            [
                AvalancheVoteError.ACCEPTED,
                AvalancheVoteError.UNKNOWN,
                AvalancheVoteError.UNKNOWN,
            ],
        )

        # Add more peers for triggering the avaproofs messaging
        for i in range(2, self.min_avaproofs_node_count - 1):
            add_avapeer_and_check_status(
                peers[i],
                [
                    AvalancheVoteError.ACCEPTED,
                    AvalancheVoteError.UNKNOWN,
                    AvalancheVoteError.UNKNOWN,
                ],
            )

        add_avapeer_and_check_status(
            peers[self.min_avaproofs_node_count - 1],
            [
                AvalancheVoteError.ACCEPTED,
                AvalancheVoteError.ACCEPTED,
                AvalancheVoteError.UNKNOWN,
            ],
        )

        # The proofs are not requested during IBD, so node 2 has no proof yet.
        assert_equal(len(get_proof_ids(self.nodes[2])), 0)
        # And all the nodes are pending
        assert_equal(
            self.nodes[2].getavalancheinfo()["network"]["pending_node_count"],
            self.min_avaproofs_node_count,
        )

        self.generate(self.nodes[2], 1, sync_fun=self.no_op)
        assert not self.nodes[2].getblockchaininfo()["initialblockdownload"]

        # Connect the pending nodes so the next compact proofs requests can get
        # accounted for
        for i in range(self.min_avaproofs_node_count):
            node.sendavalancheproof(peers[i]["proof"].serialize().hex())
        assert_equal(
            self.nodes[2].getavalancheinfo()["network"]["pending_node_count"], 0
        )

        # The avaproofs message are not accounted during IBD, so this is not
        # enough.
        poll_and_assert_response(self.nodes[2], AvalancheVoteError.UNKNOWN)

        # Connect more peers to reach the message threshold while node 2 is out
        # of IBD.
        for i in range(self.min_avaproofs_node_count - 1):
            add_avapeer_and_check_status(
                peers[i],
                [
                    AvalancheVoteError.ACCEPTED,
                    AvalancheVoteError.ACCEPTED,
                    AvalancheVoteError.UNKNOWN,
                ],
            )

        # The messages is not accounted when there is no shortid
        add_avapeer_and_check_status(
            peers[self.min_avaproofs_node_count - 1],
            [
                AvalancheVoteError.ACCEPTED,
                AvalancheVoteError.ACCEPTED,
                AvalancheVoteError.UNKNOWN,
            ],
            empty_avaproof=True,
        )

        # The messages are accounted and the node quorum finally valid
        add_avapeer_and_check_status(
            peers[self.min_avaproofs_node_count],
            [
                AvalancheVoteError.ACCEPTED,
                AvalancheVoteError.ACCEPTED,
                AvalancheVoteError.ACCEPTED,
            ],
        )

        # Unless there is not enough nodes to poll
        for node in self.nodes:
            avapeers = [p2p for p2p in node.p2ps if p2p not in pollers]
            for peer in avapeers[7:]:
                peer.peer_disconnect()
                peer.wait_for_disconnect()
            self.wait_until(lambda: node.getavalancheinfo()["ready_to_poll"] is False)
            poll_and_assert_response(node, AvalancheVoteError.UNKNOWN)

            # Add a node back and check it resumes the quorum status
            avapeer = AvaP2PInterface(self, node)
            node.add_p2p_connection(avapeer)
            wait_for_proof(node, uint256_hex(avapeer.proof.proofid))
            poll_and_assert_response(node, AvalancheVoteError.ACCEPTED)


if __name__ == "__main__":
    AvalancheQuorumTest().main()
