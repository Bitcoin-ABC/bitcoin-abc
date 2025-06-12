# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of miner fund changes via avalanche."""
import random

from test_framework.avatools import (
    assert_response,
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
from test_framework.blocktools import create_block, create_coinbase
from test_framework.cashaddr import decode
from test_framework.key import ECPubKey
from test_framework.messages import (
    XEC,
    AvalancheVote,
    AvalancheVoteError,
    CTxOut,
    ToHex,
)
from test_framework.script import OP_EQUAL, OP_HASH160, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal

LEGACY_MINER_FUND_RATIO = 8
MINER_FUND_RATIO = 32

MINER_FUND_ADDR = "ecregtest:prfhcnyqnl5cgrnmlfmms675w93ld7mvvq9jcw0zsn"
OTHER_MINER_FUND_ADDR = "ecregtest:pqv2r67sgz3qumufap3h2uuj0zfmnzuv8v38gtrh5v"
QUORUM_NODE_COUNT = 16


class AvalancheMinerFundTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-enableminerfund",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
            ],
        ]

    def run_for_ratio(self, ratio):
        node = self.nodes[0]
        initial_block_count = node.getblockcount()

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()
        poll_node = quorum[0]

        assert node.getavalancheinfo()["ready_to_poll"] is True

        # Get block reward
        coinbase = node.getblock(node.getbestblockhash(), 2)["tx"][0]
        block_reward = sum([vout["value"] for vout in coinbase["vout"]])
        policy_miner_fund_amount = int(block_reward * XEC * ratio / 100)

        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        def has_accepted_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.getbestblockhash() == tip_expected

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        def create_cb_pay_to_address(address, miner_fund_amount):
            # Build a coinbase with no miner fund
            cb = create_coinbase(node.getblockcount() + 1)
            # Keep only the block reward output
            cb.vout = cb.vout[:1]
            # Change the block reward to account for the miner fund
            cb.vout[0].nValue = int(block_reward * XEC - miner_fund_amount)
            # Add the miner fund output
            if address and miner_fund_amount > 0:
                _, _, script_hash = decode(address)
                cb.vout.append(
                    CTxOut(
                        nValue=miner_fund_amount,
                        scriptPubKey=CScript([OP_HASH160, script_hash, OP_EQUAL]),
                    )
                )

            pad_tx(cb)
            return cb

        def new_block(tip, miner_fund_addr, miner_fund_amount):
            # Create a new block paying to the specified miner fund
            cb = create_cb_pay_to_address(miner_fund_addr, miner_fund_amount)
            block = create_block(
                int(tip, 16), cb, node.getblock(tip)["time"] + 1, version=4
            )
            block.solve()
            node.submitblock(ToHex(block))

            # Check the current tip is what we expect
            matches_policy = (
                miner_fund_addr == MINER_FUND_ADDR
                and miner_fund_amount >= policy_miner_fund_amount
            )
            expected_tip = block.hash if matches_policy else tip
            assert_equal(node.getbestblockhash(), expected_tip)

            # Poll and check the node votes what we expect
            poll_node.send_poll([block.hash_int])
            expected_vote = (
                AvalancheVoteError.ACCEPTED
                if matches_policy
                else AvalancheVoteError.PARKED
            )
            assert_response(
                poll_node, avakey, [AvalancheVote(expected_vote, block.hash_int)]
            )

            # Vote yes on this block until the node accepts it
            self.wait_until(lambda: has_accepted_tip(block.hash))
            assert_equal(node.getbestblockhash(), block.hash)

            poll_node.send_poll([block.hash_int])
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(AvalancheVoteError.ACCEPTED, block.hash_int)],
            )

            return block

        # Base cases that we always want to test
        cases = [
            # Normal miner fund as set by policy
            (MINER_FUND_ADDR, policy_miner_fund_amount),
            # Miner fund address changed but all else equal
            (OTHER_MINER_FUND_ADDR, policy_miner_fund_amount),
            # Pay no miner fund at all
            (None, 0),
        ]

        # Add some more random cases
        for _ in range(0, 10):
            addr = MINER_FUND_ADDR if random.randrange(0, 2) else OTHER_MINER_FUND_ADDR
            amount = random.randrange(0, policy_miner_fund_amount * 2)
            cases.append((addr, amount))

        # Shuffle the test cases so we get varied test coverage on the first
        # post-activation block over many test runs.
        random.shuffle(cases)
        for addr, amount in cases:
            self.log.info(
                f"Miner fund test case: address: {addr}, fund amount: {amount}"
            )
            new_block(node.getbestblockhash(), addr, amount)

        # Check a rejection case
        tip = node.getbestblockhash()
        self.log.info("Miner fund rejection test case")
        reject = new_block(tip, OTHER_MINER_FUND_ADDR, policy_miner_fund_amount).hash
        reject_hash = int(reject, 16)
        with node.wait_for_debug_log(
            [f"Avalanche invalidated block {reject}".encode()],
            chatty_callable=lambda: can_find_inv_in_poll(
                quorum, reject_hash, AvalancheVoteError.PARKED
            ),
        ):
            pass

        # Build a block on the accepted tip and the chain continues as normal
        tip = new_block(tip, MINER_FUND_ADDR, policy_miner_fund_amount).hash
        assert_equal(node.getbestblockhash(), tip)

        # Tip should finalize
        self.wait_until(lambda: has_finalized_tip(tip))

        # Check tip height for sanity
        assert_equal(
            node.getblockcount(),
            initial_block_count + QUORUM_NODE_COUNT + len(cases) + 1,
        )

    def run_test(self):
        self.run_for_ratio(MINER_FUND_RATIO)


if __name__ == "__main__":
    AvalancheMinerFundTest().main()
