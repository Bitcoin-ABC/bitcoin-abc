#!/usr/bin/env python3
# Copyright (c) 2014-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#
# Test resurrection of mined transactions when
# the blockchain is re-organized.
#

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, create_tx

# Create one-input, one-output, no-fee transaction:


class MempoolCoinbaseTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-checkmempool"]]

    def run_test(self):
        node0_address = self.nodes[0].getnewaddress()
        # Spend block 1/2/3's coinbase transactions
        # Mine a block.
        # Create three more transactions, spending the spends
        # Mine another block.
        # ... make sure all the transactions are confirmed
        # Invalidate both blocks
        # ... make sure all the transactions are put back in the mempool
        # Mine a new block
        # ... make sure all the transactions are confirmed again.

        b = [self.nodes[0].getblockhash(n) for n in range(1, 4)]
        coinbase_txids = [self.nodes[0].getblock(h)['tx'][0] for h in b]
        spends1_raw = [create_tx(self.nodes[0], txid, node0_address, 49.99)
                       for txid in coinbase_txids]
        spends1_id = [self.nodes[0].sendrawtransaction(tx)
                      for tx in spends1_raw]

        blocks = []
        blocks.extend(self.nodes[0].generate(1))

        spends2_raw = [create_tx(self.nodes[0], txid, node0_address, 49.98)
                       for txid in spends1_id]
        spends2_id = [self.nodes[0].sendrawtransaction(tx)
                      for tx in spends2_raw]

        blocks.extend(self.nodes[0].generate(1))

        # mempool should be empty, all txns confirmed
        assert_equal(set(self.nodes[0].getrawmempool()), set())
        for txid in spends1_id + spends2_id:
            tx = self.nodes[0].gettransaction(txid)
            assert(tx["confirmations"] > 0)

        # Use invalidateblock to re-org back; all transactions should
        # end up unconfirmed and back in the mempool
        for node in self.nodes:
            node.invalidateblock(blocks[0])

        # mempool should be empty, all txns confirmed
        assert_equal(
            set(self.nodes[0].getrawmempool()), set(spends1_id + spends2_id))
        for txid in spends1_id + spends2_id:
            tx = self.nodes[0].gettransaction(txid)
            assert(tx["confirmations"] == 0)

        # Generate another block, they should all get mined
        self.nodes[0].generate(1)
        # mempool should be empty, all txns confirmed
        assert_equal(set(self.nodes[0].getrawmempool()), set())
        for txid in spends1_id + spends2_id:
            tx = self.nodes[0].gettransaction(txid)
            assert(tx["confirmations"] > 0)


if __name__ == '__main__':
    MempoolCoinbaseTest().main()
