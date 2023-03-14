# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test dumping/loading the avalanche peers to/from file."""
import os
import time

from test_framework.avatools import (
    AvaP2PInterface,
    can_find_inv_in_poll,
    gen_proof,
    wait_for_proof,
)
from test_framework.messages import AvalancheProofVoteResponse
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error, uint256_hex
from test_framework.wallet_util import bytes_to_wif

QUORUM_NODE_COUNT = 8


class AvalanchePersistAvapeers(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-avalanchestakingrewards=1",
            ]
        ]
        self.noban_tx_relay = True

    def run_test(self):
        node = self.nodes[0]

        privkey, local_proof = gen_proof(self, node)
        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [
                f"-avaproof={local_proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
            ],
        )

        def get_quorum():
            return [
                node.add_p2p_connection(AvaP2PInterface(self, node))
                for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Note that get_quorum mines blocks to generate the peers' proofs, so
        # our local proof gets verified as a consequence
        quorum = get_quorum()

        def is_quorum_established():
            return node.getavalancheinfo()["ready_to_poll"] is True

        self.wait_until(is_quorum_established)

        def wait_for_finalized_proof(proofid):
            def finalize_proof(proofid):
                can_find_inv_in_poll(
                    quorum, proofid, response=AvalancheProofVoteResponse.ACTIVE
                )
                return node.getrawavalancheproof(uint256_hex(proofid)).get(
                    "finalized", False
                )

            self.wait_until(lambda: finalize_proof(proofid))

        for peer in quorum:
            wait_for_finalized_proof(peer.proof.proofid)
        wait_for_finalized_proof(local_proof.proofid)

        # At this stage we have 9 peers (8 peers + ourself)
        assert_equal(len(node.getavalanchepeerinfo()), QUORUM_NODE_COUNT + 1)

        # Staking reward is not ready yet, we need to know the proofs for long
        # enough.
        tip = node.getbestblockhash()
        assert_raises_rpc_error(
            -32603,
            f"Unable to determine a staking reward winner for block {tip}",
            node.getstakingreward,
            tip,
        )

        mocktime = int(time.time()) + 60 * 60
        node.setmocktime(mocktime)

        tip = self.generate(node, 1, sync_fun=self.no_op)[-1]

        assert node.getstakingreward(tip)

        self.log.info("Check the node dumps the peer set to a file upon shutdown")

        dump_path = os.path.join(node.datadir, node.chain, "avapeers.dat")
        with node.assert_debug_log(
            [f"Successfully dumped {QUORUM_NODE_COUNT + 1} peers"]
        ):
            self.stop_node(0)
        assert os.path.isfile(dump_path)

        self.log.info("Check the loads the dump file upon startup")

        self.start_node(
            0,
            extra_args=self.extra_args[0]
            + [
                f"-avaproof={local_proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
            ],
        )

        # We should get our 9 peers back (8 peers + ourself)
        assert_equal(len(node.getavalanchepeerinfo()), QUORUM_NODE_COUNT + 1)

        # Make sure we have the expected avalanche info
        ava_info = node.getavalancheinfo()
        assert_equal(ava_info["local"]["verified"], True)
        assert_equal(ava_info["network"]["proof_count"], QUORUM_NODE_COUNT + 1)
        # Only ourself
        assert_equal(ava_info["network"]["connected_proof_count"], 1)
        assert_equal(
            ava_info["network"]["finalized_proof_count"], QUORUM_NODE_COUNT + 1
        )

        for peer in quorum:
            assert_equal(
                node.getrawavalancheproof(uint256_hex(peer.proof.proofid)).get(
                    "finalized", False
                ),
                True,
            )
        assert_equal(
            node.getrawavalancheproof(uint256_hex(local_proof.proofid)).get(
                "finalized", False
            ),
            True,
        )

        node.setmocktime(mocktime)

        # At this stage mining is still not possible, we have no quorum so the
        # node could end up on the wrong tip if it was mining but not polling.
        assert_raises_rpc_error(
            -32603,
            f"Unable to determine a staking reward winner for block {tip}",
            node.getstakingreward,
            tip,
        )

        # Refresh the quorum using the same proofs (there is no way to reconnect
        # the previous peers from the test framework).
        for i, peer in enumerate(quorum):
            n = AvaP2PInterface()
            n.master_privkey = peer.master_privkey
            n.proof = peer.proof
            n.delegated_privkey = peer.delegated_privkey
            n.delegation = peer.delegation

            node.add_p2p_connection(n)
            n.send_avaproof(n.proof)
            wait_for_proof(node, uint256_hex(n.proof.proofid))

            # Replace the previous quorum peer with the new one so we can use
            # can_find_inv_in_poll
            quorum[i] = n

        self.wait_until(is_quorum_established)

        ava_info = node.getavalancheinfo()
        assert_equal(ava_info["local"]["verified"], True)
        assert_equal(ava_info["network"]["proof_count"], QUORUM_NODE_COUNT + 1)
        # Now we have it all
        assert_equal(
            ava_info["network"]["connected_proof_count"], QUORUM_NODE_COUNT + 1
        )
        assert_equal(
            ava_info["network"]["finalized_proof_count"], QUORUM_NODE_COUNT + 1
        )

        # As soon as we have a quorum, we can select a staking reward winner
        gbt = node.getblocktemplate()
        assert "stakingrewards" in gbt["coinbasetxn"]
        assert node.getstakingreward(tip)

        # Now that we have a quorum the node should poll for the loaded proofs
        for peer in quorum:
            self.wait_until(lambda: can_find_inv_in_poll(quorum, peer.proof.proofid))
        self.wait_until(lambda: can_find_inv_in_poll(quorum, local_proof.proofid))


if __name__ == "__main__":
    AvalanchePersistAvapeers().main()
