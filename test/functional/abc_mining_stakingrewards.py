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
from test_framework.util import (
    assert_equal,
    assert_greater_than_or_equal,
    assert_raises_rpc_error,
    uint256_hex,
)

QUORUM_NODE_COUNT = 16
STAKING_REWARDS_COINBASE_RATIO_PERCENT = 10


class AbcMiningStakingRewardsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-whitelist=noban@127.0.0.1",
                "-avalanchestakingrewards=1",
            ],
        ]

    def run_test(self):
        node = self.nodes[0]

        now = int(time.time())
        node.setmocktime(now)

        # Build a quorum
        quorum = [get_ava_p2p_interface(self, node) for _ in range(QUORUM_NODE_COUNT)]
        assert node.getavalancheinfo()["ready_to_poll"] is True

        now += 60 * 60
        node.setmocktime(now)

        invalid_block_hash = "0" * 63
        assert_raises_rpc_error(
            -8,
            f"blockhash must be of length 64 (not 63, for '{invalid_block_hash}')",
            node.getstakingreward,
            invalid_block_hash,
        )
        assert_raises_rpc_error(
            -8,
            f"blockhash must be of length 64 (not 63, for '{invalid_block_hash}')",
            node.setstakingreward,
            invalid_block_hash,
            "76a914000000000000000000000000000000000000000088ac",
        )

        invalid_block_hash = "0" * 64
        assert_raises_rpc_error(
            -8,
            f"Block not found: {invalid_block_hash}",
            node.getstakingreward,
            invalid_block_hash,
        )
        assert_raises_rpc_error(
            -8,
            f"Block not found: {invalid_block_hash}",
            node.setstakingreward,
            invalid_block_hash,
            "76a914000000000000000000000000000000000000000088ac",
        )

        def get_coinbase(blockhash):
            return node.getblock(blockhash, 2)["tx"][0]

        tiphash = node.getbestblockhash()
        coinbase = get_coinbase(tiphash)
        block_reward = sum([vout["value"] for vout in coinbase["vout"]])

        self.log.info(
            "Staking rewards not ready yet, check getblocktemplate lacks the staking rewards data"
        )

        assert_raises_rpc_error(
            -32603,
            f"Unable to determine a staking reward winner for block {tiphash}",
            node.getstakingreward,
            tiphash,
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

        assert_raises_rpc_error(
            -32603,
            f"Unable to determine a staking reward winner for block {tiphash}",
            node.getstakingreward,
            tiphash,
        )

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

        assert_equal(
            node.getstakingreward(tiphash),
            {
                "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000000 OP_EQUALVERIFY OP_CHECKSIG",
                "hex": "76a914000000000000000000000000000000000000000088ac",
                "reqSigs": 1,
                "type": "pubkeyhash",
                "addresses": [ADDRESS_ECREG_UNSPENDABLE],
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

        self.log.info("Override the staking reward via RPC")

        assert node.setstakingreward(
            tiphash, "76a914000000000000000000000000000000000000000188ac"
        )
        assert_equal(
            node.getstakingreward(tiphash),
            {
                "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000001 OP_EQUALVERIFY OP_CHECKSIG",
                "hex": "76a914000000000000000000000000000000000000000188ac",
                "reqSigs": 1,
                "type": "pubkeyhash",
                "addresses": ["ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqyx0q3yvg0"],
            },
        )

        gbt = node.getblocktemplate()
        assert_equal(gbt["previousblockhash"], tiphash)
        assert_equal(
            gbt["coinbasetxn"]["stakingrewards"],
            {
                "payoutscript": {
                    "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000001 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914000000000000000000000000000000000000000188ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqyx0q3yvg0"
                    ],
                },
                "minimumvalue": Decimal(
                    block_reward * STAKING_REWARDS_COINBASE_RATIO_PERCENT // 100 * XEC
                ),
            },
        )

        for i in range(2, 10):
            script_hex = f"76a914{i:0{40}x}88ac"
            assert node.setstakingreward(tiphash, script_hex)
            assert_equal(node.getstakingreward(tiphash)["hex"], script_hex)
            gbt = node.getblocktemplate()
            assert_equal(
                gbt["coinbasetxn"]["stakingrewards"]["payoutscript"]["hex"], script_hex
            )

        self.log.info("Recompute the staking reward")
        assert_equal(
            node.getstakingreward(blockhash=tiphash, recompute=True),
            {
                "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000000 OP_EQUALVERIFY OP_CHECKSIG",
                "hex": "76a914000000000000000000000000000000000000000088ac",
                "reqSigs": 1,
                "type": "pubkeyhash",
                "addresses": [ADDRESS_ECREG_UNSPENDABLE],
            },
        )

        gbt = node.getblocktemplate()
        assert_equal(gbt["previousblockhash"], tiphash)
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


if __name__ == "__main__":
    AbcMiningStakingRewardsTest().main()
