#!/usr/bin/env python3
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

GLUON_ACTIVATION_TIME = 2100000600

MINER_FUND_RATIO = 8

MINER_FUND_ADDR_AXION = 'ecregtest:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdgz0wv9ltl'
MINER_FUND_ADDR = 'ecregtest:prfhcnyqnl5cgrnmlfmms675w93ld7mvvq9jcw0zsn'


class MinerFundTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [[
            '-enableminerfund',
            '-gluonactivationtime={}'.format(GLUON_ACTIVATION_TIME),
        ]]

    def run_test(self):
        node = self.nodes[0]
        address = node.get_deterministic_priv_key().address

        self.log.info('Create some history')
        for _ in range(0, 50):
            node.generatetoaddress(1, address)

        node = self.nodes[0]

        address = node.get_deterministic_priv_key().address

        def get_best_coinbase():
            return node.getblock(node.getbestblockhash(), 2)['tx'][0]

        coinbase = get_best_coinbase()
        assert_greater_than_or_equal(len(coinbase['vout']), 2)
        block_reward = sum([vout['value'] for vout in coinbase['vout']])

        # Move MTP forward to gluon activation
        node.setmocktime(GLUON_ACTIVATION_TIME)
        node.generatetoaddress(6, address)
        assert_equal(
            node.getblockchaininfo()['mediantime'],
            GLUON_ACTIVATION_TIME)

        # Let's remember the hash of this block for later use.
        gluon_fork_block_hash = int(node.getbestblockhash(), 16)

        def check_miner_fund_output(expected_address):
            coinbase = get_best_coinbase()
            assert_equal(len(coinbase['vout']), 2)
            assert_equal(
                coinbase['vout'][1]['scriptPubKey']['addresses'][0],
                expected_address)

            total = Decimal()
            for o in coinbase['vout']:
                total += o['value']

            assert_equal(total, block_reward)
            assert_greater_than_or_equal(
                coinbase['vout'][1]['value'],
                (MINER_FUND_RATIO * total) / 100)

        # The coinbase has an output to the legacy miner fund address
        # Now we send part of the coinbase to the fund.
        check_miner_fund_output(MINER_FUND_ADDR_AXION)

        # First block with the miner fund address.
        node.generatetoaddress(1, address)
        check_miner_fund_output(MINER_FUND_ADDR)

        # Invalidate top block.
        node.invalidateblock(node.getbestblockhash())

        def check_bad_miner_fund(prev_hash, time, coinbase=None):
            if coinbase is None:
                coinbase = create_coinbase(node.getblockcount() + 1)

            block = create_block(prev_hash, coinbase, time, version=4)
            block.solve()

            assert_equal(node.submitblock(ToHex(block)), 'bad-cb-minerfund')

        # A block with no miner fund coinbase should be rejected.
        check_bad_miner_fund(gluon_fork_block_hash, GLUON_ACTIVATION_TIME + 1)

        def create_cb_pay_to_address(address):
            _, _, script_hash = decode(address)

            miner_fund_amount = int(
                block_reward * XEC * MINER_FUND_RATIO / 100)

            # Build a coinbase with no miner fund
            cb = create_coinbase(node.getblockcount() + 1)
            # Keep only the block reward output
            cb.vout = cb.vout[:1]
            # Change the block reward to account for the miner fund
            cb.vout[0].nValue = int(block_reward * XEC - miner_fund_amount)
            # Add the miner fund output
            cb.vout.append(CTxOut(nValue=miner_fund_amount, scriptPubKey=CScript(
                [OP_HASH160, script_hash, OP_EQUAL])))

            pad_tx(cb)
            cb.calc_sha256()

            return cb

        # Build a custom coinbase that spend to the legacy miner fund address
        # and check it is rejected.
        check_bad_miner_fund(
            gluon_fork_block_hash,
            GLUON_ACTIVATION_TIME + 1,
            create_cb_pay_to_address(MINER_FUND_ADDR_AXION))

        # Build a custom coinbase that spend to the new miner fund address
        # and check it is accepted.
        good_block = create_block(
            gluon_fork_block_hash,
            create_cb_pay_to_address(MINER_FUND_ADDR),
            GLUON_ACTIVATION_TIME + 1,
            version=4)
        good_block.solve()

        node.submitblock(ToHex(good_block))
        assert_equal(node.getbestblockhash(), good_block.hash)


if __name__ == '__main__':
    MinerFundTest().main()
