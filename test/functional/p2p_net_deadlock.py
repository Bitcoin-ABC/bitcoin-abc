# Copyright (c) 2023-present The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test that when two nodes send each-other simultaneously a large amount of data
this does not cause a deadlock.

See https://github.com/bitcoin/bitcoin/pull/27981
"""


import threading

from test_framework.blocktools import create_block
from test_framework.messages import ToHex
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_greater_than
from test_framework.wallet import MiniWallet


class NetDeadlockTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2

    def run_test(self):
        node0 = self.nodes[0]
        node1 = self.nodes[1]

        self.generate(node0, 4)
        wallet = MiniWallet(node0)
        wallet.rescan_utxos()

        txs = [wallet.create_self_transfer()["tx"] for _ in range(4)]
        for tx in txs:
            pad_tx(tx, 999_990)

        block = create_block(tmpl=node0.getblocktemplate(), txlist=txs)
        block.solve()
        hex_block = ToHex(block)
        assert_greater_than(len(hex_block) // 2, 4_000_000)

        self.log.info("Simultaneously send a large message on both sides")

        thread0 = threading.Thread(
            target=node0.sendmsgtopeer, args=(0, "block", hex_block)
        )
        thread1 = threading.Thread(
            target=node1.sendmsgtopeer, args=(0, "block", hex_block)
        )

        thread0.start()
        thread1.start()
        thread0.join()
        thread1.join()

        self.log.info("Check whether a deadlock happened")
        # Make sure node0 successfully processed the net block before mining another one
        self.wait_until(lambda: node0.getbestblockhash() == block.hash)
        self.generate(node0, 1, sync_fun=self.sync_blocks)


if __name__ == "__main__":
    NetDeadlockTest().main()
