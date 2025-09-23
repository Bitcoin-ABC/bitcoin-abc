# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the activation of the staking rewards preconsensus feature."""
from test_framework.avatools import (
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
from test_framework.messages import (
    MSG_AVA_STAKE_CONTENDER,
    AvalancheContenderVoteError,
    hash256,
    ser_uint256,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import uint256_hex

# Only 12 contenders are polled at a time so we limit the node count to that
# number to make the test simpler.
QUORUM_NODE_COUNT = 12
THE_FUTURE = 2100000000


class AvalancheStakingPreconsensusActivationTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-avalanchestakingrewards=1",
                "-avalanchestakingpreconsensus=1",
                f"-shibusawaactivationtime={THE_FUTURE}",
            ],
        ]

    def run_test(self):
        node = self.nodes[0]

        # Set mock time so we can control when proofs will be considered for staking rewards
        now = THE_FUTURE - 600
        node.setmocktime(now)

        quorum = [
            get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
        ]
        assert node.getavalancheinfo()["ready_to_poll"]

        def finalize_proof(proofid):
            def has_finalized_proof(proofid):
                can_find_inv_in_poll(
                    quorum,
                    proofid,
                )
                return node.getrawavalancheproof(uint256_hex(proofid))["finalized"]

            self.wait_until(lambda: has_finalized_proof(proofid))

        for peer in quorum:
            finalize_proof(peer.proof.proofid)

        def finalize_tip(tip, other_response=None):
            def has_finalized_block(blockhash):
                can_find_inv_in_poll(
                    quorum,
                    int(blockhash, 16),
                    response_map={
                        MSG_AVA_STAKE_CONTENDER: AvalancheContenderVoteError.UNKNOWN
                    },
                )
                return node.isfinalblock(blockhash)

            self.wait_until(lambda: has_finalized_block(tip))

        finalize_tip(node.getbestblockhash())

        now = THE_FUTURE
        node.setmocktime(now)

        assert not node.getinfo()["avalanche_staking_preconsensus"]

        def contender_id(prevblockhash, proofid):
            return int.from_bytes(
                hash256(ser_uint256(int(prevblockhash, 16)) + ser_uint256(proofid)),
                "little",
            )

        # None of the contender is polled yet
        def check_no_contender_is_polled(tip):
            for peer in quorum:
                cid = contender_id(tip, peer.proof.proofid)
                assert not can_find_inv_in_poll(quorum, cid)

        check_no_contender_is_polled(node.getbestblockhash())

        for _ in range(5):
            tip = self.generate(node, 1)[0]
            assert not node.getinfo()["avalanche_staking_preconsensus"]
            check_no_contender_is_polled(tip)

        # Next block activates staking rewards preconsensus
        activation_block = self.generate(node, 1)[0]
        assert node.getinfo()["avalanche_staking_preconsensus"]

        # From now on contenders are polled for subsequent blocks
        tip = self.generate(node, 1)[0]

        finalize_tip(tip)

        def check_all_contenders_are_polled(tip):
            for peer in quorum:
                cid = contender_id(tip, peer.proof.proofid)
                self.wait_until(lambda: can_find_inv_in_poll(quorum, cid))

        check_all_contenders_are_polled(tip)

        # Park the activation block to deactivate
        node.parkblock(activation_block)
        assert not node.getinfo()["avalanche_staking_preconsensus"]

        # Unpark the activation block to reactivate
        node.unparkblock(activation_block)
        assert node.getinfo()["avalanche_staking_preconsensus"]


if __name__ == "__main__":
    AvalancheStakingPreconsensusActivationTest().main()
