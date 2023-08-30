#!/usr/bin/env python3
# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of staking rewards via avalanche."""
import random
import time
from decimal import Decimal

from test_framework.address import P2SH_OP_TRUE, SCRIPT_UNSPENDABLE, hash160
from test_framework.avatools import (
    AvaP2PInterface,
    avalanche_proof_from_hex,
    can_find_inv_in_poll,
    create_coinbase_stakes,
    get_ava_p2p_interface,
)
from test_framework.blocktools import create_block, create_coinbase
from test_framework.cashaddr import PUBKEY_TYPE, encode_full
from test_framework.key import ECKey
from test_framework.messages import (
    NODE_AVALANCHE,
    NODE_NETWORK,
    XEC,
    AvalancheDelegation,
    AvalancheProofVoteResponse,
    AvalancheVote,
    AvalancheVoteError,
    CTxOut,
    FromHex,
    ToHex,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, uint256_hex
from test_framework.wallet_util import bytes_to_wif

STAKING_REWARDS_COINBASE_RATIO_PERCENT = 25
QUORUM_NODE_COUNT = 16


class ABCStakingRewardsPolicyTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avalanchestakingrewards=1",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-stakingrewardmaxslackpercent=25",
                "-whitelist=noban@127.0.0.1",
            ],
        ]

    def run_test(self):
        node = self.nodes[0]

        now = int(time.time())
        node.setmocktime(now)

        # Build a fake quorum of nodes. The payout script is SCRIPT_UNSPENDABLE
        # for all the proofs.
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()

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

        poll_node = quorum[0]

        assert node.getavalancheinfo()["ready_to_poll"] is True

        now += 60 * 60
        node.setmocktime(now)

        self.generate(node, 1)

        # Get block reward
        coinbase = node.getblock(node.getbestblockhash(), 2)["tx"][0]
        block_reward = sum([vout["value"] for vout in coinbase["vout"]])
        staking_rewards_amount = int(
            block_reward * XEC * STAKING_REWARDS_COINBASE_RATIO_PERCENT / 100
        )

        def has_accepted_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.getbestblockhash() == tip_expected

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        def create_cb(payout_script, amount):
            # Build a coinbase with no staking reward
            cb = create_coinbase(node.getblockcount() + 1)
            # Keep only the block reward output
            cb.vout = cb.vout[:1]
            # Change the block reward to account for the staking reward
            cb.vout[0].nValue = int(block_reward * XEC - amount)
            # Add the staking reward output
            if payout_script and amount > 0:
                cb.vout.append(
                    CTxOut(
                        nValue=amount,
                        scriptPubKey=payout_script,
                    )
                )

            pad_tx(cb)
            cb.calc_sha256()
            return cb

        def assert_response(expected):
            response = poll_node.wait_for_avaresponse()
            r = response.response
            assert_equal(r.cooldown, 0)

            votes = r.votes
            assert_equal(len(votes), len(expected))
            for i in range(0, len(votes)):
                assert_equal(repr(votes[i]), repr(expected[i]))

        def new_block(tip, payout_script, amount):
            # Create a new block paying to the specified payout script
            cb = create_cb(payout_script, amount)
            block = create_block(
                int(tip, 16), cb, node.getblock(tip)["time"] + 1, version=4
            )
            block.solve()
            node.submitblock(ToHex(block))

            # Check the current tip is what we expect
            matches_policy = (
                payout_script == SCRIPT_UNSPENDABLE and amount >= staking_rewards_amount
            )
            expected_tip = block.hash if matches_policy else tip
            assert_equal(node.getbestblockhash(), expected_tip)

            # Poll and check the node votes what we expect
            poll_node.send_poll([block.sha256])
            expected_vote = (
                AvalancheVoteError.ACCEPTED
                if matches_policy
                else AvalancheVoteError.PARKED
            )
            assert_response([AvalancheVote(expected_vote, block.sha256)])

            # Vote yes on this block until the node accepts it
            self.wait_until(lambda: has_accepted_tip(block.hash))
            assert_equal(node.getbestblockhash(), block.hash)

            poll_node.send_poll([block.sha256])
            assert_response([AvalancheVote(AvalancheVoteError.ACCEPTED, block.sha256)])

            return block

        # Base cases that we always want to test
        cases = [
            (SCRIPT_UNSPENDABLE, staking_rewards_amount),
            # Another script but all else equal
            (P2SH_OP_TRUE, staking_rewards_amount),
            # Pay no staking reward at all
            (None, 0),
        ]

        # Add some more random cases
        for _ in range(0, 10):
            script = SCRIPT_UNSPENDABLE if random.randrange(0, 2) else P2SH_OP_TRUE
            amount = random.randrange(0, staking_rewards_amount * 2)
            cases.append((script, amount))

        # Shuffle the test cases so we get varied test coverage
        random.shuffle(cases)
        for script, amount in cases:
            self.log.info(
                f"Staking rewards test case: script: {script.hex() if script is not None else 'None'}, amount: {amount}"
            )
            new_block(node.getbestblockhash(), script, amount)

        # Check a rejection case
        tip = node.getbestblockhash()
        self.log.info("Staking rewards rejection test case")

        reject = ""
        with node.assert_debug_log(expected_msgs=["policy-bad-staking-reward"]):
            reject = new_block(tip, P2SH_OP_TRUE, staking_rewards_amount).hash

        reject_hash = int(reject, 16)
        with node.wait_for_debug_log(
            [f"Avalanche invalidated block {reject}".encode()],
            chatty_callable=lambda: can_find_inv_in_poll(
                quorum, reject_hash, AvalancheVoteError.PARKED
            ),
        ):
            pass

        # Build a block on the accepted tip and the chain continues as normal
        tip = new_block(tip, SCRIPT_UNSPENDABLE, staking_rewards_amount).hash
        assert_equal(node.getbestblockhash(), tip)

        # Tip should finalize
        self.wait_until(lambda: has_finalized_tip(tip))

        # Check tip height for sanity
        assert_equal(node.getblockcount(), QUORUM_NODE_COUNT + len(cases) + 2)

        self.log.info("Checking staking rewards acceptable winners")

        self.restart_node(0)

        blockhashes = self.generate(node, 2 * QUORUM_NODE_COUNT)
        stakes = create_coinbase_stakes(
            node, blockhashes, node.get_deterministic_priv_key().key
        )
        assert all(s["amount"] == Decimal("50000000") for s in stakes)

        now = int(time.time())
        node.setmocktime(now)

        def avapeer_connected(nodeid, proofid_hex):
            node_list = []
            try:
                node_list = node.getavalanchepeerinfo(proofid_hex)[0]["node_list"]
            except BaseException:
                pass

            return nodeid in node_list

        # Build a quorum with a different address for each peer
        quorum = []
        for i in range(QUORUM_NODE_COUNT):
            n = AvaP2PInterface()

            privkey = ECKey()
            privkey.generate()

            pubkey = privkey.get_pubkey()
            address = encode_full("ecregtest", PUBKEY_TYPE, hash160(pubkey.get_bytes()))

            # Let the first proof have has much stake as all the others
            # together. This ensure we are capping the slack to the value we set
            # on the command line.
            proof_hex = node.buildavalancheproof(
                0,
                0,
                bytes_to_wif(privkey.get_bytes()),
                stakes[:QUORUM_NODE_COUNT]
                if i == 0
                else [stakes[i + QUORUM_NODE_COUNT]],
                payoutAddress=address,
            )
            assert node.verifyavalancheproof(proof_hex)

            n.master_privkey = privkey
            n.proof = avalanche_proof_from_hex(proof_hex)

            n.delegated_privkey = ECKey()
            n.delegated_privkey.generate()

            delegation_hex = node.delegateavalancheproof(
                uint256_hex(n.proof.limited_proofid),
                bytes_to_wif(n.master_privkey.get_bytes()),
                n.delegated_privkey.get_pubkey().get_bytes().hex(),
            )
            assert node.verifyavalanchedelegation(delegation_hex)

            n.delegation = FromHex(AvalancheDelegation(), delegation_hex)

            proofid_hex = uint256_hex(n.proof.proofid)
            node.add_p2p_connection(n, services=NODE_NETWORK | NODE_AVALANCHE)
            n.nodeid = node.getpeerinfo()[-1]["id"]

            self.wait_until(lambda: avapeer_connected(n.nodeid, proofid_hex))

            quorum.append(n)

        for peer in quorum:
            wait_for_finalized_proof(peer.proof.proofid)

        quorum.sort(key=lambda peer: peer.proof.proofid)

        start = 0
        slots = []
        for peer in quorum:
            staked_amount = (
                100
                * int(
                    node.decodeavalancheproof(peer.proof.serialize().hex())[
                        "staked_amount"
                    ]
                )
                // 1_000_000
            )
            slots.append((start, start + staked_amount))
            start += staked_amount

        assert node.getavalancheinfo()["ready_to_poll"] is True

        now += 60 * 60
        node.setmocktime(now)

        def get_acceptable_winners(blockhash):
            lsb = int(blockhash, 16) & 0xFFFFFFFFFFFFFFFF
            slot = lsb * (slots[-1][1] - 1) // (2**64 - 1)
            slot_min = slot - int(0.125 * slots[-1][1])
            slot_max = slot + int(0.125 * slots[-1][1])
            return [
                quorum[i]
                for i, s in enumerate(slots)
                if s[0] <= slot_max and s[1] >= slot_min
            ]

        for _ in range(10):
            tip = self.generate(node, 1)[-1]
            acceptable_winners = get_acceptable_winners(tip)
            assert len(acceptable_winners) >= 1

            for peer in quorum:
                cb = create_cb(peer.proof.payout_script, staking_rewards_amount)
                block = create_block(
                    int(tip, 16), cb, node.getblock(tip)["time"] + 1, version=4
                )
                block.solve()
                node.submitblock(ToHex(block))

                newtip = node.getbestblockhash()
                if peer not in acceptable_winners:
                    assert_equal(newtip, tip)
                else:
                    assert_equal(newtip, block.hash)
                    node.parkblock(newtip)
                    self.wait_until(lambda: node.getbestblockhash() == tip)


if __name__ == "__main__":
    ABCStakingRewardsPolicyTest().main()
