#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from test_framework.blocktools import (create_block, create_coinbase)
from test_framework.messages import ToHex
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than_or_equal,
)

from decimal import Decimal

PHONON_ACTIVATION_TIME = 1589544000
VERSION_BASE = 536870912

MINER_FUND_RATIO = 20

MINER_FUND_ADDR = 'bchreg:pqv2r67sgz3qumufap3h2uuj0zfmnzuv8v7ej0fffv'
MINER_FUND_ABC_ADDR = 'bchreg:qzvz0es48sf8wrqy7kn5j5cugka95ztskcra2r7ee7'
MINER_FUND_BCHD_ADDR = 'bchreg:qrhea03074073ff3zv9whh0nggxc7k03ssffq2ylju'
MINER_FUND_ELECTRON_CASH_ADDR = 'bchreg:pp8d685l8kecnmtyy52ndvq625arz2qwmutyjlcyav'


class MinerFundTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            ['-enableminerfund', "-phononactivationtime={}".format(PHONON_ACTIVATION_TIME)]]

    def check_bip9_state(self, name, status):
        miner_fund_info = self.nodes[0].getblockchaininfo()['softforks'][name]
        assert_equal(miner_fund_info['bip9'], status)

    def run_test(self):
        node = self.nodes[0]
        address = node.get_deterministic_priv_key().address

        # Get the vote started.
        node.setmocktime(1580000000)

        def check_all_bip9_state(status):
            self.check_bip9_state('minerfund', status)
            self.check_bip9_state('minerfundabc', status)
            self.check_bip9_state('minerfundbchd', status)
            self.check_bip9_state('minerfundelectroncash', status)

        # We need to finish the current period and move the MTP forward.
        while ((node.getblockchaininfo()['blocks'] + 2) % 144) != 0:
            node.generatetoaddress(1, address)
            check_all_bip9_state({
                'status': 'defined',
                'start_time': 1573819200,
                'timeout': 1589544000,
                'since': 0,
            })

        height = node.getblockcount()
        self.run_no_miner_fund_test()

        def run_test_for(bit, name, address):
            # Make sure we have a clean slate.
            node.invalidateblock(node.getblockhash(height + 1))
            node.setmocktime(1580000000)
            self.run_miner_fund_test(bit, name, address)

        run_test_for(0, 'minerfund', MINER_FUND_ADDR)
        run_test_for(1, 'minerfundabc', MINER_FUND_ABC_ADDR)
        run_test_for(2, 'minerfundbchd', MINER_FUND_BCHD_ADDR)
        run_test_for(3, 'minerfundelectroncash', MINER_FUND_ELECTRON_CASH_ADDR)

    def run_no_miner_fund_test(self):
        node = self.nodes[0]
        address = node.get_deterministic_priv_key().address

        # Move MTP forward to phonon activation
        node.setmocktime(PHONON_ACTIVATION_TIME)
        node.generatetoaddress(6, address)
        assert_equal(
            node.getblockchaininfo()['mediantime'],
            PHONON_ACTIVATION_TIME)

        # First block with the new rules.
        node.generatetoaddress(1, address)

        def get_best_coinbase():
            return node.getblock(node.getbestblockhash(), 2)['tx'][0]

        # No money goes to the fund.
        coinbase = get_best_coinbase()
        assert_equal(len(coinbase['vout']), 1)

    def run_miner_fund_test(self, bit, name, fund_address):
        self.log.info("Testing miner fund {} on bit {}.".format(name, bit))

        version = VERSION_BASE | (1 << bit)

        self.stop_node(0)
        self.start_node(0,
                        ['-enableminerfund', "-blockversion={}".format(version), "-phononactivationtime={}".format(PHONON_ACTIVATION_TIME)])

        node = self.nodes[0]
        address = node.get_deterministic_priv_key().address

        for i in range(144):
            node.generatetoaddress(1, address)
            self.check_bip9_state(name, {
                'status': 'started',
                'bit': bit,
                'start_time': 1573819200,
                'timeout': 1589544000,
                'since': 288,
                'statistics': {
                    'period': 144,
                    'threshold': 96,
                    'elapsed': i,
                    'count': i,
                    'possible': True,
                },
            })

        for i in range(144):
            node.generatetoaddress(1, address)
            self.check_bip9_state(name, {
                'status': 'locked_in',
                'start_time': 1573819200,
                'timeout': 1589544000,
                'since': 432,
            })

        # Now this should be active.
        node.generatetoaddress(1, address)
        self.check_bip9_state(name, {
            'status': 'active',
            'start_time': 1573819200,
            'timeout': 1589544000,
            'since': 576,
        })

        # Move MTP forward to phonon activation
        node.setmocktime(PHONON_ACTIVATION_TIME)
        node.generatetoaddress(6, address)
        assert_equal(
            node.getblockchaininfo()['mediantime'],
            PHONON_ACTIVATION_TIME)

        self.check_bip9_state(name, {
            'status': 'active',
            'start_time': 1573819200,
            'timeout': 1589544000,
            'since': 576,
        })

        # Let's remember the hash of this block for later use.
        fork_block_hash = int(node.getbestblockhash(), 16)

        def get_best_coinbase():
            return node.getblock(node.getbestblockhash(), 2)['tx'][0]

        # Check that we do not send anything to the fund yet.
        assert_equal(len(get_best_coinbase()['vout']), 1)

        # Now the miner fund is enforced
        node.generatetoaddress(1, address)

        # Now we send part of the coinbase to the fund.
        coinbase = get_best_coinbase()
        assert_equal(len(coinbase['vout']), 2)
        assert_equal(
            coinbase['vout'][1]['scriptPubKey']['addresses'][0],
            fund_address)

        total = Decimal()
        for o in coinbase['vout']:
            total += o['value']

        assert_greater_than_or_equal(
            total / MINER_FUND_RATIO,
            coinbase['vout'][1]['value'])

        # Invalidate top block, submit a custom block that do not send anything
        # to the fund and check it is rejected.
        node.invalidateblock(node.getbestblockhash())

        block_height = node.getblockcount()
        block = create_block(
            fork_block_hash, create_coinbase(block_height), PHONON_ACTIVATION_TIME + 99)
        block.solve()

        assert_equal(node.submitblock(ToHex(block)), 'bad-cb-minerfund')


if __name__ == '__main__':
    MinerFundTest().main()
