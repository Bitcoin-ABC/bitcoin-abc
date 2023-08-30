#!/usr/bin/env python3
# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Tests for Bitcoin ABC mining with staking rewards
"""

import time
from decimal import Decimal

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.messages import XEC, AvalancheProofVoteResponse
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_greater_than_or_equal, uint256_hex

QUORUM_NODE_COUNT = 16
STAKING_REWARDS_COINBASE_RATIO_PERCENT = 25


class AbcMiningStakingRewardsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avalanchestakingrewards",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
            ],
        ]

    def run_test(self):
        node = self.nodes[0]

        now = int(time.time())

        # Build a quorum
        quorum = [get_ava_p2p_interface(self, node) for _ in range(QUORUM_NODE_COUNT)]
        assert node.getavalancheinfo()["ready_to_poll"] is True

        now += 60 * 60
        node.setmocktime(now)

        def get_coinbase(blockhash):
            return node.getblock(blockhash, 2)["tx"][0]

        tiphash = node.getbestblockhash()
        coinbase = get_coinbase(tiphash)
        block_reward = sum([vout["value"] for vout in coinbase["vout"]])

        self.log.info(
            "Staking rewards not ready yet, check getblocktemplate lacks the staking rewards data"
        )

        gbt = node.getblocktemplate()
        assert_equal(gbt["previousblockhash"], tiphash)
        assert "coinbasetxn" in gbt
        assert "stakingrewards" not in gbt["coinbasetxn"]

        self.log.info(
            "Staking rewards not ready yet, check the miner doesn't produce the staking rewards output"
        )

        tiphash = self.generate(node, 1)[-1]
        coinbase = get_coinbase(tiphash)
        assert_equal(len(coinbase["vout"]), 1)

        self.log.info(
            "Staking rewards are computed, check the block template returns the staking rewards data"
        )

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

        # At this stage the staking rewards may or may not be computed. This
        # depends on whether the node called ActivateBestChain, which occurs in
        # various scenari (e.g. an avalanche vote on a block that changed its
        # state). To make sure rhe rewards are computed, mine one more block.
        tiphash = self.generate(node, 1)[-1]

        gbt = node.getblocktemplate()
        assert_equal(gbt["previousblockhash"], tiphash)
        assert "coinbasetxn" in gbt
        assert "stakingrewards" in gbt["coinbasetxn"]
        assert_equal(
            gbt["coinbasetxn"]["stakingrewards"],
            {
                "payoutscript": {
                    "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000000 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914000000000000000000000000000000000000000088ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [ADDRESS_ECREG_UNSPENDABLE],
                },
                "minimumvalue": Decimal(
                    block_reward * STAKING_REWARDS_COINBASE_RATIO_PERCENT // 100 * XEC
                ),
            },
        )

        self.log.info(
            "Staking rewards are computed, check the miner produces the staking rewards output"
        )

        tiphash = self.generate(node, 1)[-1]
        coinbase = get_coinbase(tiphash)
        assert_greater_than_or_equal(len(coinbase["vout"]), 2)
        assert_equal(
            coinbase["vout"][-1]["value"],
            Decimal(block_reward * STAKING_REWARDS_COINBASE_RATIO_PERCENT // 100),
        )
        assert_equal(
            coinbase["vout"][-1]["scriptPubKey"]["hex"],
            "76a914000000000000000000000000000000000000000088ac",
        )


if __name__ == "__main__":
    AbcMiningStakingRewardsTest().main()
