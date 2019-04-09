#!/usr/bin/env python3
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-ilncense.php.

import time

from test_framework.test_framework import BitcoinTestFramework
from test_framework.comptool import RejectResult, TestInstance, TestManager
from test_framework.mininode import network_thread_start
from test_framework.util import assert_equal
from test_framework.blocktools import (
    create_block,
    create_coinbase,
)


class InvalidChainsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.tip = None
        self.blocks = {}
        self.block_heights = {}
        self.extra_args = [["-whitelist=127.0.0.1"]]

    def next_block(self, number):
        if self.tip == None:
            base_block_hash = self.genesis_hash
            block_time = int(time.time()) + 1
        else:
            base_block_hash = self.tip.sha256
            block_time = self.tip.nTime + 1

        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height)
        coinbase.rehash()
        block = create_block(base_block_hash, coinbase, block_time)

        block.solve()
        self.tip = block
        self.block_heights[block.sha256] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block

    def run_test(self):
        self.test = TestManager(self, self.options.tmpdir)
        self.test.add_all_connections(self.nodes)
        network_thread_start()
        self.test.run()

    def get_tests(self):
        node = self.nodes[0]
        self.genesis_hash = int(node.getbestblockhash(), 16)
        self.block_heights[self.genesis_hash] = 0

        # returns a test case that asserts that the current tip was accepted
        def accepted(expectedTipHash=None):
            if expectedTipHash is None:
                return TestInstance([[self.tip, True]])
            else:
                return TestInstance([[self.tip, True, expectedTipHash]])

        # returns a test case that asserts that the current tip was rejected
        def rejected(reject=None):
            if reject is None:
                return TestInstance([[self.tip, False]])
            else:
                return TestInstance([[self.tip, reject]])

        # move the tip back to a previous block
        def tip(number):
            self.tip = self.blocks[number]

        # shorthand for functions
        block = self.next_block

        # Reference for blocks mined in this test:
        #
        #       11  21   -- 221 - 222
        #      /   /    /
        # 0 - 1 - 2  - 22 - 23 - 24 - 25
        #     \
        #      -- 12 - 13 - 14

        # Generate some valid blocks
        block(0)
        yield accepted()
        block(1)
        yield accepted()
        block(2)
        yield accepted()

        # Explicitly invalidate blocks 1 and 2
        # See below for why we do this
        node.invalidateblock(self.blocks[1].hash)
        assert_equal(self.blocks[0].hash, node.getbestblockhash())
        node.invalidateblock(self.blocks[2].hash)
        assert_equal(self.blocks[0].hash, node.getbestblockhash())

        # Mining on top of blocks 1 or 2 is rejected
        tip(1)
        block(11)
        yield rejected(RejectResult(16, b'bad-prevblk'))

        tip(2)
        block(21)
        yield rejected(RejectResult(16, b'bad-prevblk'))

        # Reconsider block 2 to remove invalid status from *both* 1 and 2
        # The goal is to test that block 1 is not retaining any internal state
        # that prevents us from accepting blocks building on top of block 1
        node.reconsiderblock(self.blocks[2].hash)
        assert_equal(self.blocks[2].hash, node.getbestblockhash())

        # Mining on the block 1 chain should be accepted
        # (needs to mine two blocks because less-work chains are not processed)
        test = TestInstance(sync_every_block=False)
        tip(1)
        block(12)
        test.blocks_and_transactions.append([self.tip, None])
        block(13)
        test.blocks_and_transactions.append([self.tip, None])
        yield test

        # Mining on the block 2 chain should still be accepted
        # (needs to mine two blocks because less-work chains are not processed)
        test = TestInstance(sync_every_block=False)
        tip(2)
        block(22)
        test.blocks_and_transactions.append([self.tip, None])
        # Mine block 221 for later
        block(221)
        test.blocks_and_transactions.append([self.tip, None])
        yield test

        # Mine more blocks from block 22 to be longest chain
        test = TestInstance(sync_every_block=False)
        tip(22)
        block(23)
        test.blocks_and_transactions.append([self.tip, None])
        block(24)
        test.blocks_and_transactions.append([self.tip, None])
        yield test

        # Sanity checks
        assert_equal(self.blocks[24].hash, node.getbestblockhash())
        assert any(self.blocks[221].hash == chaintip["hash"]
                   for chaintip in node.getchaintips())

        # Invalidating the block 2 chain should reject new blocks on that chain
        node.invalidateblock(self.blocks[2].hash)
        assert_equal(self.blocks[13].hash, node.getbestblockhash())

        # Mining on the block 2 chain should be rejected
        tip(24)
        block(25)
        yield rejected(RejectResult(16, b'bad-prevblk'))

        # Continued mining on the block 1 chain is still ok
        tip(13)
        block(14)
        yield accepted()

        # Mining on a once-valid chain forking from block 2's longest chain,
        # which is now invalid, should also be rejected.
        tip(221)
        block(222)
        yield rejected(RejectResult(16, b'bad-prevblk'))


if __name__ == '__main__':
    InvalidChainsTest().main()
