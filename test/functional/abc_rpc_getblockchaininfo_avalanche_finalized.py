# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of forks via avalanche."""

from test_framework.avatools import (
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
from test_framework.blocktools import GENESIS_BLOCK_HASH
from test_framework.messages import (
    MSG_BLOCK,
    AvalancheVoteError,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex

QUORUM_NODE_COUNT = 16


class AvalancheTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
            ],
        ]
        self.supports_cli = False
        self.rpc_timeout = 120

    def run_test(self):
        node = self.nodes[0]

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()

        assert node.getavalancheinfo()["ready_to_poll"] is True

        def has_finalized_proof(proofid):
            can_find_inv_in_poll(
                quorum,
                proofid,
                # don't finalize blocks as a side effect
                response_map={MSG_BLOCK: AvalancheVoteError.UNKNOWN},
            )
            return node.getrawavalancheproof(uint256_hex(proofid))["finalized"]

        for peer in quorum:
            self.wait_until(lambda: has_finalized_proof(peer.proof.proofid))

        # Generate blocks and poll for them.
        self.generate(node, 10)

        self.log.info("Answer all polls to finalize...")

        # Initially no block has been finalized.
        info = node.getblockchaininfo()
        tip = info["bestblockhash"]
        assert_equal(info["finalized_blockhash"], GENESIS_BLOCK_HASH)

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        # Because everybody answers yes, the node will finalize that block.
        with node.assert_debug_log([f"Avalanche finalized block {tip}"]):
            self.wait_until(lambda: has_finalized_tip(tip))
        assert_equal(node.getbestblockhash(), tip)
        assert_equal(node.getblockchaininfo()["finalized_blockhash"], tip)

        self.log.info("Answer all polls to park...")
        tip_to_park = self.generate(node, 1, sync_fun=self.no_op)[0]

        previous_tip = tip
        assert tip_to_park != previous_tip

        def has_parked_tip(tip_park):
            hash_tip_park = int(tip_park, 16)
            can_find_inv_in_poll(quorum, hash_tip_park, AvalancheVoteError.PARKED)

            for tip in node.getchaintips():
                if tip["hash"] == tip_park:
                    return tip["status"] == "parked"
            return False

        # Because everybody answers no, the node will park that block.
        with node.assert_debug_log([f"Avalanche rejected block {tip_to_park}"]):
            self.wait_until(lambda: has_parked_tip(tip_to_park))
        assert_equal(node.getbestblockhash(), previous_tip)
        # Check rejecting a block doesn't impact the finalized one
        assert_equal(node.getblockchaininfo()["finalized_blockhash"], previous_tip)

        # Manually unparking the invalidated block will reset finalization.
        node.unparkblock(tip_to_park)
        assert not node.isfinalblock(previous_tip)
        assert_equal(
            node.getblockchaininfo()["finalized_blockhash"], GENESIS_BLOCK_HASH
        )

        tip = self.generate(node, 1, sync_fun=self.no_op)[0]

        # Wait until the new tip is finalized
        self.wait_until(lambda: has_finalized_tip(tip))
        assert_equal(node.getbestblockhash(), tip)
        assert_equal(node.getblockchaininfo()["finalized_blockhash"], tip)

        # Manually parking the finalized chaintip will reset finalization.
        node.parkblock(tip)
        assert not node.isfinalblock(tip)
        assert_equal(
            node.getblockchaininfo()["finalized_blockhash"], GENESIS_BLOCK_HASH
        )


if __name__ == "__main__":
    AvalancheTest().main()
