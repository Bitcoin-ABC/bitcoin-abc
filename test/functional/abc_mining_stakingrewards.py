# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Tests for Bitcoin ABC mining with staking rewards
"""

import threading
import time
from decimal import Decimal

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.blocktools import create_block
from test_framework.messages import XEC, AvalancheProofVoteResponse, CTxOut, msg_block
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than_or_equal,
    assert_raises_rpc_error,
    get_rpc_proxy,
    uint256_hex,
)

QUORUM_NODE_COUNT = 16
STAKING_REWARDS_COINBASE_RATIO_PERCENT = 10


class LongpollThread(threading.Thread):

    def __init__(self, node, longpollid):
        threading.Thread.__init__(self)
        self.longpollid = longpollid
        # create a new connection to the node, we can't use the same
        # connection from two threads
        self.node = get_rpc_proxy(
            node.url, 1, timeout=600, coveragedir=node.coverage_dir
        )

    def run(self):
        self.longpoll_template = self.node.getblocktemplate(
            {"longpollid": self.longpollid}
        )


class AbcMiningStakingRewardsTest(BitcoinTestFramework):
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
            ],
        ]

    def run_test(self):
        node = self.nodes[0]

        now = int(time.time())
        node.setmocktime(now)

        # Build a quorum
        quorum = [get_ava_p2p_interface(self, node) for _ in range(QUORUM_NODE_COUNT)]
        assert node.getavalancheinfo()["ready_to_poll"] is True

        now += 90 * 60 + 1
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

        reward = node.getstakingreward(tiphash)

        assert_equal(len(reward), 1)
        assert "proofid" in reward[0]
        proofid = reward[0]["proofid"]
        assert proofid in [uint256_hex(peer.proof.proofid) for peer in quorum]

        assert_equal(
            reward,
            [
                {
                    "proofid": proofid,
                    "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000000 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914000000000000000000000000000000000000000088ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [ADDRESS_ECREG_UNSPENDABLE],
                },
            ],
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
            [
                {
                    "proofid": "0000000000000000000000000000000000000000000000000000000000000000",
                    "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000001 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914000000000000000000000000000000000000000188ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqyx0q3yvg0"
                    ],
                },
            ],
        )

        # Try appending the same winner again
        self.log.info(tiphash)
        assert_raises_rpc_error(
            -32603,
            f"Staking rewards winner is already set for block {tiphash}",
            node.setstakingreward,
            tiphash,
            "76a914000000000000000000000000000000000000000188ac",
            True,
        )

        # Append another acceptable winner
        assert node.setstakingreward(
            tiphash,
            "76a914000000000000000000000000000000000000000288ac",
            True,
        )
        assert_equal(
            node.getstakingreward(tiphash),
            [
                {
                    "proofid": "0000000000000000000000000000000000000000000000000000000000000000",
                    "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000001 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914000000000000000000000000000000000000000188ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqyx0q3yvg0"
                    ],
                },
                {
                    "proofid": "0000000000000000000000000000000000000000000000000000000000000000",
                    "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000002 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914000000000000000000000000000000000000000288ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [
                        "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqgdmg7vcrr"
                    ],
                },
            ],
        )

        # We always pick the first one
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
            assert_equal(node.getstakingreward(tiphash)[0]["hex"], script_hex)
            gbt = node.getblocktemplate()
            assert_equal(
                gbt["coinbasetxn"]["stakingrewards"]["payoutscript"]["hex"], script_hex
            )

        self.log.info("Recompute the staking reward")
        reward = node.getstakingreward(blockhash=tiphash, recompute=True)

        assert_equal(len(reward), 1)
        assert "proofid" in reward[0]
        proofid = reward[0]["proofid"]
        assert proofid in [uint256_hex(peer.proof.proofid) for peer in quorum]

        assert_equal(
            reward,
            [
                {
                    "proofid": proofid,
                    "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000000 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914000000000000000000000000000000000000000088ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [ADDRESS_ECREG_UNSPENDABLE],
                },
            ],
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

        self.log.info("Check it works with longpoll")

        mining_peer = quorum[0]

        for _ in range(50):
            block = create_block(tmpl=gbt)
            staking_reward_amount = int(
                block_reward * STAKING_REWARDS_COINBASE_RATIO_PERCENT // 100 * XEC
            )
            block.vtx[0].vout[0].nValue -= staking_reward_amount
            block.vtx[0].vout.append(
                CTxOut(
                    staking_reward_amount,
                    bytes.fromhex("76a914000000000000000000000000000000000000000088ac"),
                )
            )
            block.hashMerkleRoot = block.calc_merkle_root()
            block.solve()

            expected_tip = block.hash

            msg = msg_block(block)

            thr = LongpollThread(node, gbt["longpollid"])
            thr.start()

            mining_peer.send_message(msg)

            thr.join(5)
            assert not thr.is_alive()

            assert_equal(thr.longpoll_template["previousblockhash"], expected_tip)
            assert (
                "stakingrewards" in thr.longpoll_template["coinbasetxn"]
            ), thr.longpoll_template
            assert_equal(
                thr.longpoll_template["coinbasetxn"]["stakingrewards"],
                {
                    "payoutscript": {
                        "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000000 OP_EQUALVERIFY OP_CHECKSIG",
                        "hex": "76a914000000000000000000000000000000000000000088ac",
                        "reqSigs": 1,
                        "type": "pubkeyhash",
                        "addresses": [ADDRESS_ECREG_UNSPENDABLE],
                    },
                    "minimumvalue": Decimal(
                        block_reward
                        * STAKING_REWARDS_COINBASE_RATIO_PERCENT
                        // 100
                        * XEC
                    ),
                },
            )

            gbt = thr.longpoll_template

        tiphash = node.getbestblockhash()

        proofids = []
        for i in range(1, QUORUM_NODE_COUNT):
            reward = node.getstakingreward(tiphash)
            assert_equal(len(reward), i)

            last_proofid = reward[-1]["proofid"]
            assert node.setflakyproof(last_proofid, True)

            proofids.append(last_proofid)

            flaky_proofs = node.getflakyproofs()
            assert_equal(len(flaky_proofs), len(proofids))
            assert last_proofid in [p["proofid"] for p in flaky_proofs]

        for i in range(QUORUM_NODE_COUNT, 1, -1):
            reward = node.getstakingreward(tiphash)
            assert_equal(len(reward), i)

            last_proofid = proofids.pop()
            assert node.setflakyproof(last_proofid, False)

            flaky_proofs = node.getflakyproofs()
            assert_equal(len(flaky_proofs), len(proofids))
            assert last_proofid not in [p["proofid"] for p in flaky_proofs]

        assert_equal(len(node.getstakingreward(tiphash)), 1)

        # Add an unknown proof, check the stake amount and payout are not
        # returned but the proofid always is
        unknown_proofid = uint256_hex(0)
        assert node.setflakyproof(unknown_proofid, True)
        flaky_proofs = node.getflakyproofs()
        assert_equal(len(flaky_proofs), 1)
        flaky_proof = flaky_proofs[0]
        assert_equal(
            flaky_proof,
            {
                "proofid": unknown_proofid,
            },
        )
        assert node.setflakyproof(unknown_proofid, False)
        assert_equal(node.getflakyproofs(), [])

        known_proofid = node.getstakingreward(blockhash=tiphash, recompute=True)[0][
            "proofid"
        ]
        assert node.setflakyproof(known_proofid, True)
        flaky_proofs = node.getflakyproofs()
        assert_equal(len(flaky_proofs), 1)
        flaky_proof = flaky_proofs[0]
        staked_amount = node.decodeavalancheproof(
            node.getrawavalancheproof(known_proofid)["proof"]
        )["staked_amount"]
        assert_equal(
            flaky_proof,
            {
                "proofid": known_proofid,
                "staked_amount": Decimal(staked_amount),
                "payout": {
                    "asm": "OP_DUP OP_HASH160 0000000000000000000000000000000000000000 OP_EQUALVERIFY OP_CHECKSIG",
                    "hex": "76a914000000000000000000000000000000000000000088ac",
                    "reqSigs": 1,
                    "type": "pubkeyhash",
                    "addresses": [ADDRESS_ECREG_UNSPENDABLE],
                },
            },
        )
        assert node.setflakyproof(known_proofid, False)
        assert_equal(node.getflakyproofs(), [])


if __name__ == "__main__":
    AbcMiningStakingRewardsTest().main()
