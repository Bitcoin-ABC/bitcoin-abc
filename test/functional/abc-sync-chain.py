# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

"""
Test that a node receiving many (potentially out of order) blocks exits
initial block download (IBD; this occurs once it has passed minimumchainwork)
and continues to sync without seizing.
"""

import random

from test_framework.blocktools import create_block, create_coinbase
from test_framework.messages import CBlockHeader, msg_block, msg_headers
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework

NUM_IBD_BLOCKS = 50


class BaseNode(P2PInterface):
    def send_header(self, block):
        msg = msg_headers()
        msg.headers = [CBlockHeader(block)]
        self.send_message(msg)

    def send_block(self, block):
        self.send_message(msg_block(block))


class SyncChainTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        # Setting minimumchainwork makes sure we test IBD as well as post-IBD
        self.extra_args = [[f"-minimumchainwork={202 + 2 * NUM_IBD_BLOCKS:#x}"]]

    def run_test(self):
        node0 = self.nodes[0]
        node0conn = node0.add_p2p_connection(BaseNode())

        tip = int(node0.getbestblockhash(), 16)
        height = node0.getblockcount() + 1
        time = node0.getblock(node0.getbestblockhash())["time"] + 1

        blocks = []
        for _ in range(NUM_IBD_BLOCKS * 2):
            block = create_block(tip, create_coinbase(height), time)
            block.solve()
            blocks.append(block)
            tip = block.hash_int
            height += 1
            time += 1

        # Headers need to be sent in-order
        for b in blocks:
            node0conn.send_header(b)

        # Send blocks in some random order
        for b in random.sample(blocks, len(blocks)):
            node0conn.send_block(b)

        # The node should eventually, completely sync without getting stuck
        def node_synced():
            return node0.getbestblockhash() == blocks[-1].hash_hex

        self.wait_until(node_synced)


if __name__ == "__main__":
    SyncChainTest().main()
