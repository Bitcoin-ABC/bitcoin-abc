# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-ilncense.php.

import time

from test_framework.blocktools import create_block, create_coinbase
from test_framework.p2p import P2PDataStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class InvalidChainsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.noban_tx_relay = True
        self.tip = None
        self.blocks = {}
        self.block_heights = {}
        self.extra_args = [["-automaticunparking=1"]]

    def next_block(self, number):
        if self.tip is None:
            base_block_hash = self.genesis_hash
            block_time = int(time.time()) + 1
        else:
            base_block_hash = self.tip.hash_int
            block_time = self.tip.nTime + 1

        height = self.block_heights[base_block_hash] + 1
        coinbase = create_coinbase(height)
        block = create_block(base_block_hash, coinbase, block_time)

        block.solve()
        self.tip = block
        self.block_heights[block.hash_int] = height
        assert number not in self.blocks
        self.blocks[number] = block
        return block

    def set_tip(self, number: int):
        """
        Move the tip back to a previous block.
        """
        self.tip = self.blocks[number]

    def run_test(self):
        node = self.nodes[0]
        peer = node.add_p2p_connection(P2PDataStore())

        self.genesis_hash = int(node.getbestblockhash(), 16)
        self.block_heights[self.genesis_hash] = 0

        # shorthand for functions
        block = self.next_block

        # Reference for blocks mined in this test:
        #
        #       11  21   -- 221 - 222
        #      /   /    /
        # 0 - 1 - 2  - 22 - 23 - 24 - 25
        #     \
        #      -- 12 - 13 - 14
        #               \
        #                -- 15 - 16 - 17 - 18

        # Generate some valid blocks
        peer.send_blocks_and_test([block(0), block(1), block(2)], node)

        # Explicitly invalidate blocks 1 and 2
        # See below for why we do this
        node.invalidateblock(self.blocks[1].hash)
        assert_equal(self.blocks[0].hash, node.getbestblockhash())
        node.invalidateblock(self.blocks[2].hash)
        assert_equal(self.blocks[0].hash, node.getbestblockhash())

        # Mining on top of blocks 1 or 2 is rejected
        self.set_tip(1)
        peer.send_blocks_and_test(
            [block(11)],
            node,
            success=False,
            force_send=True,
            reject_reason="bad-prevblk",
        )

        self.set_tip(2)
        peer.send_blocks_and_test(
            [block(21)],
            node,
            success=False,
            force_send=True,
            reject_reason="bad-prevblk",
        )

        # Reconsider block 2 to remove invalid status from *both* 1 and 2
        # The goal is to test that block 1 is not retaining any internal state
        # that prevents us from accepting blocks building on top of block 1
        node.reconsiderblock(self.blocks[2].hash)
        assert_equal(self.blocks[2].hash, node.getbestblockhash())

        # Mining on the block 1 chain should be accepted
        # (needs to mine two blocks because less-work chains are not processed)
        self.set_tip(1)
        peer.send_blocks_and_test([block(12), block(13)], node)

        # Mining on the block 2 chain should still be accepted
        # (needs to mine two blocks because less-work chains are not processed)
        self.set_tip(2)
        peer.send_blocks_and_test([block(22), block(221)], node)

        # Mine more blocks from block 22 to be longest chain
        self.set_tip(22)
        peer.send_blocks_and_test([block(23), block(24)], node)

        # Sanity checks
        assert_equal(self.blocks[24].hash, node.getbestblockhash())
        assert any(
            self.blocks[221].hash == chaintip["hash"]
            for chaintip in node.getchaintips()
        )

        # Invalidating the block 2 chain should reject new blocks on that chain
        node.invalidateblock(self.blocks[2].hash)
        assert_equal(self.blocks[13].hash, node.getbestblockhash())

        # Mining on the block 2 chain should be rejected
        self.set_tip(24)
        peer.send_blocks_and_test(
            [block(25)],
            node,
            success=False,
            force_send=True,
            reject_reason="bad-prevblk",
        )

        # Continued mining on the block 1 chain is still ok
        self.set_tip(13)
        peer.send_blocks_and_test([block(14)], node)

        # Mining on a once-valid chain forking from block 2's longest chain,
        # which is now invalid, should also be rejected.
        self.set_tip(221)
        peer.send_blocks_and_test(
            [block(222)],
            node,
            success=False,
            force_send=True,
            reject_reason="bad-prevblk",
        )

        self.log.info(
            "Make sure that reconsidering a block behaves correctly when cousin chains"
            " (neither ancestors nor descendants) become available as a result"
        )

        # Reorg out 14 with four blocks.
        self.set_tip(13)
        peer.send_blocks_and_test([block(15), block(16), block(17), block(18)], node)

        # Invalidate 17 (so 18 now has failed parent)
        node.invalidateblock(self.blocks[17].hash)
        assert_equal(self.blocks[16].hash, node.getbestblockhash())

        # Invalidate 13 (so 14 and 15 and 16 now also have failed parent)
        node.invalidateblock(self.blocks[13].hash)
        assert_equal(self.blocks[12].hash, node.getbestblockhash())

        # Reconsider 14, which should reconsider 13 and remove failed parent
        # from our cousins 15 and 16 as well. Even though we reconsidered
        # 14, we end up on a different chain because 15/16 have more work.
        # (But, this shouldn't undo our invalidation of 17)
        node.reconsiderblock(self.blocks[14].hash)
        assert_equal(self.blocks[16].hash, node.getbestblockhash())


if __name__ == "__main__":
    InvalidChainsTest().main()
