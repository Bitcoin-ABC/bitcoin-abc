# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from decimal import Decimal

from test_framework.blocktools import create_block, create_coinbase
from test_framework.cashaddr import decode
from test_framework.messages import XEC, CTxOut, ToHex
from test_framework.script import OP_EQUAL, OP_HASH160, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, assert_greater_than_or_equal

MINER_FUND_RATIO = 32
MINER_FUND_ADDR = "ecregtest:prfhcnyqnl5cgrnmlfmms675w93ld7mvvq9jcw0zsn"


class MinerFundTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-enableminerfund",
            ],
            [],
        ]

    @staticmethod
    def get_best_coinbase(n):
        return n.getblock(n.getbestblockhash(), 2)["tx"][0]

    def run_for_ratio(self, ratio):
        node = self.nodes[0]

        self.log.info("Create some history")
        self.generate(node, 10)

        coinbase = self.get_best_coinbase(node)
        assert_greater_than_or_equal(len(coinbase["vout"]), 2)
        block_reward = sum([vout["value"] for vout in coinbase["vout"]])

        def check_miner_fund_output():
            coinbase = self.get_best_coinbase(node)
            assert_equal(len(coinbase["vout"]), 2)
            assert_equal(
                coinbase["vout"][1]["scriptPubKey"]["addresses"][0], MINER_FUND_ADDR
            )

            total = Decimal()
            for o in coinbase["vout"]:
                total += o["value"]

            assert_equal(total, block_reward)
            assert_greater_than_or_equal(
                coinbase["vout"][1]["value"], (ratio * total) / 100
            )

        # The coinbase has an output to the miner fund address.
        # Now we send part of the coinbase to the fund.
        check_miner_fund_output()

        def create_cb_pay_to_address():
            _, _, script_hash = decode(MINER_FUND_ADDR)

            miner_fund_amount = int(block_reward * XEC * ratio / 100)

            # Build a coinbase with no miner fund
            cb = create_coinbase(node.getblockcount() + 1)
            # Keep only the block reward output
            cb.vout = cb.vout[:1]
            # Change the block reward to account for the miner fund
            cb.vout[0].nValue = int(block_reward * XEC - miner_fund_amount)
            # Add the miner fund output
            cb.vout.append(
                CTxOut(
                    nValue=miner_fund_amount,
                    scriptPubKey=CScript([OP_HASH160, script_hash, OP_EQUAL]),
                )
            )

            pad_tx(cb)

            return cb

        tip = node.getbestblockhash()
        # Build a custom coinbase that spend to the new miner fund address
        # and check it is accepted.
        good_block = create_block(
            int(tip, 16),
            create_cb_pay_to_address(),
            node.getblock(tip)["time"] + 1,
            version=4,
        )
        good_block.solve()

        node.submitblock(ToHex(good_block))
        assert_equal(node.getbestblockhash(), good_block.hash)

        # node0 mines a block with a coinbase output to the miner fund.
        address = node.get_deterministic_priv_key().address
        first_block_has_miner_fund = self.generatetoaddress(
            node, nblocks=1, address=address
        )[0]
        check_miner_fund_output()

        # Invalidate it
        for n in self.nodes:
            n.invalidateblock(first_block_has_miner_fund)

        # node1 mines a block without a coinbase output to the miner fund.
        with node.assert_debug_log(expected_msgs=["policy-bad-miner-fund"], timeout=10):
            first_block_no_miner_fund = self.generatetoaddress(
                self.nodes[1], nblocks=1, address=address, sync_fun=self.no_op
            )[0]

        coinbase = self.get_best_coinbase(self.nodes[1])
        assert_equal(len(coinbase["vout"]), 1)

        # node0 parks the block since the miner fund is enforced by policy.
        def parked_block(blockhash):
            for tip in node.getchaintips():
                if tip["hash"] == blockhash:
                    assert tip["status"] != "active"
                    return tip["status"] == "parked"
            return False

        self.wait_until(lambda: parked_block(first_block_no_miner_fund))

        # Unpark the block
        node.unparkblock(first_block_no_miner_fund)

        # Invalidate it
        for n in self.nodes:
            n.invalidateblock(first_block_no_miner_fund)

        # Connecting the block again does not park because block policies are
        # only checked the first time a block is connected.
        for n in self.nodes:
            n.reconsiderblock(first_block_no_miner_fund)
            assert_equal(n.getbestblockhash(), first_block_no_miner_fund)

    def test_without_avalanche(self):
        self.log.info("Test the behavior when avalanche is completely disabled")
        self.restart_node(0, extra_args=["-enableminerfund"])
        self.restart_node(1, extra_args=["-avalanche=0"])
        self.connect_nodes(0, 1)

        avalanche_node = self.nodes[0]
        other_node = self.nodes[1]

        # First mine a block on an avalanche enabled node, check that the node with
        # avalanche uninitialized accepts it
        avalanche_tip = self.generate(avalanche_node, 1, sync_fun=self.sync_blocks)[0]
        coinbase = self.get_best_coinbase(other_node)
        assert_greater_than_or_equal(len(coinbase["vout"]), 2)

        # Mine a block on a non-avalanche node, check that the avalanche node parks it
        with avalanche_node.assert_debug_log(
            ["Park block because it violated a block policy: policy-bad-miner-fund"]
        ):
            other_tip = self.generate(other_node, 1, sync_fun=self.no_op)[0]

        coinbase = self.get_best_coinbase(other_node)
        assert_equal(len(coinbase["vout"]), 1)

        assert_equal(other_node.getblock(other_tip)["confirmations"], 1)
        assert_equal(other_node.getbestblockhash(), other_tip)

        assert_equal(avalanche_node.getblock(other_tip)["confirmations"], -1)
        assert_equal(avalanche_node.getbestblockhash(), avalanche_tip)

    def run_test(self):
        self.run_for_ratio(MINER_FUND_RATIO)
        self.test_without_avalanche()


if __name__ == "__main__":
    MinerFundTest().main()
