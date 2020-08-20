#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from test_framework.blocktools import (
    create_block,
    create_coinbase,
)
from test_framework.messages import ToHex
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than_or_equal,
)

from decimal import Decimal

AXION_ACTIVATION_TIME = 2000000600

MINER_FUND_RATIO = 8

MINER_FUND_ADDR = 'bchreg:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdgd35g0pkl'


class MinerFundTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [[
            '-enableminerfund',
            '-axionactivationtime={}'.format(AXION_ACTIVATION_TIME),
        ]]

    def run_test(self):
        node = self.nodes[0]
        address = node.get_deterministic_priv_key().address

        self.log.info('Create some history')
        for _ in range(0, 50):
            node.generatetoaddress(1, address)

        node = self.nodes[0]
        address = node.get_deterministic_priv_key().address

        # Move MTP forward to axion activation
        node.setmocktime(AXION_ACTIVATION_TIME)
        node.generatetoaddress(6, address)
        assert_equal(
            node.getblockchaininfo()['mediantime'],
            AXION_ACTIVATION_TIME)

        # Let's remember the hash of this block for later use.
        fork_block_hash = int(node.getbestblockhash(), 16)

        def get_best_coinbase():
            return node.getblock(node.getbestblockhash(), 2)['tx'][0]

        # No money goes to the fund.
        coinbase = get_best_coinbase()
        assert_equal(len(coinbase['vout']), 1)
        block_reward = coinbase['vout'][0]['value']

        # First block with the new rules.
        node.generatetoaddress(1, address)

        # Now we send part of the coinbase to the fund.
        coinbase = get_best_coinbase()
        assert_equal(len(coinbase['vout']), 2)
        assert_equal(
            coinbase['vout'][1]['scriptPubKey']['addresses'][0],
            MINER_FUND_ADDR)

        total = Decimal()
        for o in coinbase['vout']:
            total += o['value']

        assert_equal(total, block_reward)
        assert_greater_than_or_equal(
            coinbase['vout'][1]['value'],
            (MINER_FUND_RATIO * total) / 100)

        # Invalidate top block, submit a custom block that do not send anything
        # to the fund and check it is rejected.
        node.invalidateblock(node.getbestblockhash())

        block_height = node.getblockcount() + 1
        block = create_block(
            fork_block_hash, create_coinbase(block_height), AXION_ACTIVATION_TIME + 1, version=4)
        block.solve()

        assert_equal(node.submitblock(ToHex(block)), 'bad-cb-minerfund')


if __name__ == '__main__':
    MinerFundTest().main()
