#!/usr/bin/env python3
# Copyright (c) 2014-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

"""Test RPCs related to blockchainstate.

Test the following RPCs:
    - gettxoutsetinfo
    - getdifficulty
    - getbestblockhash
    - getblockhash
    - getblockheader
    - getchaintxstats
    - getnetworkhashps
    - verifychain

Tests correspond to code in rpc/blockchain.cpp.
"""

from decimal import Decimal
import http.client
import subprocess

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_raises,
    assert_raises_rpc_error,
    assert_is_hex_string,
    assert_is_hash_string,
)


class BlockchainTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [['-stopatheight=207', '-prune=1']]

    def run_test(self):
        self._test_getblockchaininfo()
        self._test_getchaintxstats()
        self._test_gettxoutsetinfo()
        self._test_getblockheader()
        self._test_getdifficulty()
        self._test_getnetworkhashps()
        self._test_stopatheight()
        assert self.nodes[0].verifychain(4, 0)

    def _test_getblockchaininfo(self):
        self.log.info("Test getblockchaininfo")

        keys = [
            'bestblockhash',
            'blocks',
            'chain',
            'chainwork',
            'difficulty',
            'headers',
            'mediantime',
            'pruned',
            'softforks',
            'verificationprogress',
        ]
        res = self.nodes[0].getblockchaininfo()
        # result should have pruneheight and default keys if pruning is enabled
        assert_equal(sorted(res.keys()), sorted(['pruneheight'] + keys))
        # pruneheight should be greater or equal to 0
        assert res['pruneheight'] >= 0

        self.restart_node(0, ['-stopatheight=207'])
        res = self.nodes[0].getblockchaininfo()
        # should have exact keys
        assert_equal(sorted(res.keys()), keys)

    def _test_getchaintxstats(self):
        chaintxstats = self.nodes[0].getchaintxstats(1)
        # 200 txs plus genesis tx
        assert_equal(chaintxstats['txcount'], 201)
        # tx rate should be 1 per 10 minutes, or 1/600
        # we have to round because of binary math
        assert_equal(round(chaintxstats['txrate'] * 600, 10), Decimal(1))

        b1 = self.nodes[0].getblock(self.nodes[0].getblockhash(1))
        b200 = self.nodes[0].getblock(self.nodes[0].getblockhash(200))
        time_diff = b200['mediantime'] - b1['mediantime']

        chaintxstats = self.nodes[0].getchaintxstats()
        assert_equal(chaintxstats['time'], b200['time'])
        assert_equal(chaintxstats['txcount'], 201)
        assert_equal(chaintxstats['window_block_count'], 199)
        assert_equal(chaintxstats['window_tx_count'], 199)
        assert_equal(chaintxstats['window_interval'], time_diff)
        assert_equal(
            round(chaintxstats['txrate'] * time_diff, 10), Decimal(199))

        chaintxstats = self.nodes[0].getchaintxstats(blockhash=b1['hash'])
        assert_equal(chaintxstats['time'], b1['time'])
        assert_equal(chaintxstats['txcount'], 2)
        assert_equal(chaintxstats['window_block_count'], 0)
        assert('window_tx_count' not in chaintxstats)
        assert('window_interval' not in chaintxstats)
        assert('txrate' not in chaintxstats)

        assert_raises_rpc_error(-8, "Invalid block count: should be between 0 and the block's height - 1",
                                self.nodes[0].getchaintxstats, 201)

    def _test_gettxoutsetinfo(self):
        node = self.nodes[0]
        res = node.gettxoutsetinfo()

        assert_equal(res['total_amount'], Decimal('8725.00000000'))
        assert_equal(res['transactions'], 200)
        assert_equal(res['height'], 200)
        assert_equal(res['txouts'], 200)
        assert_equal(res['bogosize'], 17000),
        assert_equal(res['bestblock'], node.getblockhash(200))
        size = res['disk_size']
        assert size > 6400
        assert size < 64000
        assert_equal(len(res['bestblock']), 64)
        assert_equal(len(res['hash_serialized']), 64)

        self.log.info(
            "Test that gettxoutsetinfo() works for blockchain with just the genesis block")
        b1hash = node.getblockhash(1)
        node.invalidateblock(b1hash)

        res2 = node.gettxoutsetinfo()
        assert_equal(res2['transactions'], 0)
        assert_equal(res2['total_amount'], Decimal('0'))
        assert_equal(res2['height'], 0)
        assert_equal(res2['txouts'], 0)
        assert_equal(res2['bogosize'], 0),
        assert_equal(res2['bestblock'], node.getblockhash(0))
        assert_equal(len(res2['hash_serialized']), 64)

        self.log.info(
            "Test that gettxoutsetinfo() returns the same result after invalidate/reconsider block")
        node.reconsiderblock(b1hash)

        res3 = node.gettxoutsetinfo()
        assert_equal(res['total_amount'], res3['total_amount'])
        assert_equal(res['transactions'], res3['transactions'])
        assert_equal(res['height'], res3['height'])
        assert_equal(res['txouts'], res3['txouts'])
        assert_equal(res['bogosize'], res3['bogosize'])
        assert_equal(res['bestblock'], res3['bestblock'])
        assert_equal(res['hash_serialized'], res3['hash_serialized'])

    def _test_getblockheader(self):
        node = self.nodes[0]

        assert_raises_rpc_error(-5, "Block not found",
                                node.getblockheader, "nonsense")

        besthash = node.getbestblockhash()
        secondbesthash = node.getblockhash(199)
        header = node.getblockheader(besthash)

        assert_equal(header['hash'], besthash)
        assert_equal(header['height'], 200)
        assert_equal(header['confirmations'], 1)
        assert_equal(header['previousblockhash'], secondbesthash)
        assert_is_hex_string(header['chainwork'])
        assert_is_hash_string(header['hash'])
        assert_is_hash_string(header['previousblockhash'])
        assert_is_hash_string(header['merkleroot'])
        assert_is_hash_string(header['bits'], length=None)
        assert isinstance(header['time'], int)
        assert isinstance(header['mediantime'], int)
        assert isinstance(header['nonce'], int)
        assert isinstance(header['version'], int)
        assert isinstance(int(header['versionHex'], 16), int)
        assert isinstance(header['difficulty'], Decimal)

    def _test_getdifficulty(self):
        difficulty = self.nodes[0].getdifficulty()
        # 1 hash in 2 should be valid, so difficulty should be 1/2**31
        # binary => decimal => binary math is why we do this check
        assert abs(difficulty * 2**31 - 1) < 0.0001

    def _test_getnetworkhashps(self):
        hashes_per_second = self.nodes[0].getnetworkhashps()
        # This should be 2 hashes every 10 minutes or 1/300
        assert abs(hashes_per_second * 300 - 1) < 0.0001

    def _test_stopatheight(self):
        assert_equal(self.nodes[0].getblockcount(), 200)
        self.nodes[0].generate(6)
        assert_equal(self.nodes[0].getblockcount(), 206)
        self.log.debug('Node should not stop at this height')
        assert_raises(subprocess.TimeoutExpired,
                      lambda: self.nodes[0].process.wait(timeout=3))
        try:
            self.nodes[0].generate(1)
        except (ConnectionError, http.client.BadStatusLine):
            pass  # The node already shut down before response
        self.log.debug('Node should stop at this height...')
        self.nodes[0].wait_until_stopped()
        self.start_node(0)
        assert_equal(self.nodes[0].getblockcount(), 207)


if __name__ == '__main__':
    BlockchainTest().main()
