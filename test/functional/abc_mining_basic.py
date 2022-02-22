#!/usr/bin/env python3
# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Tests for Bitcoin ABC mining RPCs
"""

from decimal import Decimal

from test_framework.cdefs import (
    BLOCK_MAXBYTES_MAXSIGCHECKS_RATIO,
    DEFAULT_MAX_BLOCK_SIZE,
)
from test_framework.messages import XEC
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_greater_than_or_equal

GLUON_ACTIVATION_TIME = 2100000600

MINER_FUND_ADDR_AXION = 'ecregtest:pqnqv9lt7e5vjyp0w88zf2af0l92l8rxdgz0wv9ltl'
MINER_FUND_LEGACY_ADDR_AXION = '2MviGxxFciGeWTgkUgYgjqehWt18c4ZsShd'

MINER_FUND_ADDR_GLUON = 'ecregtest:prfhcnyqnl5cgrnmlfmms675w93ld7mvvq9jcw0zsn'
MINER_FUND_LEGACY_ADDR_GLUON = '2NCXTUCFd1Q3EteVpVVDTrBBoKqvMPAoeEn'


class AbcMiningRPCTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 4
        self.extra_args = [
            [
                '-enableminerfund',
                '-gluonactivationtime={}'.format(GLUON_ACTIVATION_TIME),
            ], [
                '-enableminerfund',
                '-usecashaddr=0',
                '-gluonactivationtime={}'.format(GLUON_ACTIVATION_TIME),
            ],
        ] * 2

    def setup_network(self):
        self.setup_nodes()
        # Don't connect the nodes

    def run_for_node(self, node, beforedMinerFundAddress,
                     afterMinerFundAddress):
        # Connect to a peer so getblocktemplate will return results
        # (getblocktemplate has a sanity check that ensures it's connected to a
        # network).
        node.add_p2p_connection(P2PInterface())

        address = node.get_deterministic_priv_key().address

        # Assert the results of getblocktemplate have expected values. Keys not
        # in 'expected' are not checked.
        def assert_getblocktemplate(expected):
            # Always test these values in addition to those passed in
            expected = {**expected, **{
                'sigoplimit': DEFAULT_MAX_BLOCK_SIZE // BLOCK_MAXBYTES_MAXSIGCHECKS_RATIO,
            }}

            blockTemplate = node.getblocktemplate()
            for key, value in expected.items():
                assert_equal(blockTemplate[key], value)

        # Move block time to just before axion activation
        node.setmocktime(GLUON_ACTIVATION_TIME)
        node.generatetoaddress(5, address)

        def get_best_coinbase():
            return node.getblock(node.getbestblockhash(), 2)['tx'][0]

        coinbase = get_best_coinbase()
        assert_greater_than_or_equal(len(coinbase['vout']), 2)
        block_reward = sum([vout['value'] for vout in coinbase['vout']])

        assert_getblocktemplate({
            'coinbasetxn': {
                'minerfund': {
                    'addresses': [beforedMinerFundAddress],
                    'minimumvalue': block_reward * 8 // 100 * XEC,
                },
            },
        })

        # Move MTP forward to activation
        node.generatetoaddress(1, address)
        assert_equal(
            node.getblockchaininfo()['mediantime'],
            GLUON_ACTIVATION_TIME)

        # We don't need to test all fields in getblocktemplate since many of
        # them are covered in mining_basic.py
        assert_equal(node.getmempoolinfo()['size'], 0)
        assert_getblocktemplate({
            'coinbasetxn': {
                # We expect to start seeing the miner fund addresses since the
                # next block will start enforcing them.
                'minerfund': {
                    'addresses': [afterMinerFundAddress],
                    'minimumvalue': block_reward * 8 // 100 * XEC,
                },
            },
            # Although the coinbase value need not necessarily be the same as
            # the last block due to halvings and fees, we know this to be true
            # since we are not crossing a halving boundary and there are no
            # transactions in the mempool.
            'coinbasevalue': block_reward * XEC,
            'mintime': GLUON_ACTIVATION_TIME + 1,
        })

        # First block with the new rules
        node.generatetoaddress(1, address)

        # We expect the coinbase to have multiple outputs now
        coinbase = get_best_coinbase()
        assert_greater_than_or_equal(len(coinbase['vout']), 2)
        total = Decimal()
        for o in coinbase['vout']:
            total += o['value']

        assert_equal(total, block_reward)
        assert_getblocktemplate({
            'coinbasetxn': {
                'minerfund': {
                    'addresses': [afterMinerFundAddress],
                    'minimumvalue': block_reward * 8 // 100 * XEC,
                },
            },
            # Again, we assume the coinbase value is the same as prior blocks.
            'coinbasevalue': block_reward * XEC,
            'mintime': GLUON_ACTIVATION_TIME + 1,
        })

        # Move MTP forward
        node.setmocktime(GLUON_ACTIVATION_TIME + 1)
        node.generatetoaddress(6, address)
        assert_getblocktemplate({
            'coinbasetxn': {
                'minerfund': {
                    'addresses': [afterMinerFundAddress],
                    'minimumvalue': block_reward * 8 // 100 * XEC,
                },
            },
            'coinbasevalue': block_reward * XEC,
            'mintime': GLUON_ACTIVATION_TIME + 2,
        })

    def run_test(self):
        self.run_for_node(
            self.nodes[0],
            MINER_FUND_ADDR_AXION,
            MINER_FUND_ADDR_GLUON)
        self.run_for_node(
            self.nodes[1],
            MINER_FUND_LEGACY_ADDR_AXION,
            MINER_FUND_LEGACY_ADDR_GLUON)


if __name__ == '__main__':
    AbcMiningRPCTest().main()
