#!/usr/bin/env python3
# Copyright (c) 2015-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#
# Test PrioritiseTransaction code
#

from test_framework.blocktools import (
    create_confirmed_utxos,
    send_big_transactions,
)
# FIXME: review how this test needs to be adapted w.r.t _LEGACY_MAX_BLOCK_SIZE
from test_framework.cdefs import LEGACY_MAX_BLOCK_SIZE
from test_framework.messages import COIN
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


class PrioritiseTransactionTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-printpriority=1"]]

    def run_test(self):
        self.relayfee = self.nodes[0].getnetworkinfo()['relayfee']

        utxo_count = 90
        utxos = create_confirmed_utxos(self.nodes[0], utxo_count)
        # our transactions are smaller than 100kb
        base_fee = self.relayfee * 100
        txids = []

        # Create 3 batches of transactions at 3 different fee rate levels
        range_size = utxo_count // 3
        for i in range(3):
            txids.append([])
            start_range = i * range_size
            end_range = start_range + range_size
            txids[i] = send_big_transactions(self.nodes[0], utxos[start_range:end_range],
                                             end_range - start_range, 10 * (i + 1))

        # Make sure that the size of each group of transactions exceeds
        # LEGACY_MAX_BLOCK_SIZE -- otherwise the test needs to be revised to create
        # more transactions.
        mempool = self.nodes[0].getrawmempool(True)
        sizes = [0, 0, 0]
        for i in range(3):
            for j in txids[i]:
                assert(j in mempool)
                sizes[i] += mempool[j]['size']
            # Fail => raise utxo_count
            assert(sizes[i] > LEGACY_MAX_BLOCK_SIZE)

        # add a fee delta to something in the cheapest bucket and make sure it gets mined
        # also check that a different entry in the cheapest bucket is NOT mined (lower
        # the priority to ensure its not mined due to priority)
        self.nodes[0].prioritisetransaction(
            txids[0][0], 0, 100 * self.nodes[0].calculate_fee_from_txid(txids[0][0]))
        self.nodes[0].prioritisetransaction(txids[0][1], -1e15, 0)

        self.nodes[0].generate(1)

        mempool = self.nodes[0].getrawmempool()
        self.log.info("Assert that prioritised transaction was mined")
        assert(txids[0][0] not in mempool)
        assert(txids[0][1] in mempool)

        confirmed_transactions = self.nodes[0].getblock(
            self.nodes[0].getbestblockhash())['tx']

        # Pull the highest fee-rate transaction from a block
        high_fee_tx = confirmed_transactions[1]

        # Something high-fee should have been mined!
        assert(high_fee_tx != None)

        # Add a prioritisation before a tx is in the mempool (de-prioritising a
        # high-fee transaction so that it's now low fee).
        #
        # NOTE WELL: gettransaction returns the fee as a negative number and
        # as fractional coins. However, the prioritisetransaction expects a
        # number of satoshi to add or subtract from the actual fee.
        # Thus the conversation here is simply int(tx_fee*COIN) to remove all fees, and then
        # we add the minimum fee back.
        tx_fee = self.nodes[0].gettransaction(high_fee_tx)['fee']
        self.nodes[0].prioritisetransaction(
            high_fee_tx, -1e15, int(tx_fee*COIN) + self.nodes[0].calculate_fee_from_txid(high_fee_tx))

        # Add everything back to mempool
        self.nodes[0].invalidateblock(self.nodes[0].getbestblockhash())

        # Check to make sure our high fee rate tx is back in the mempool
        mempool = self.nodes[0].getrawmempool()
        assert(high_fee_tx in mempool)

        # Now verify the modified-high feerate transaction isn't mined before
        # the other high fee transactions. Keep mining until our mempool has
        # decreased by all the high fee size that we calculated above.
        while (self.nodes[0].getmempoolinfo()['bytes'] > sizes[0] + sizes[1]):
            self.nodes[0].generate(1)

        # High fee transaction should not have been mined, but other high fee rate
        # transactions should have been.
        mempool = self.nodes[0].getrawmempool()
        self.log.info(
            "Assert that de-prioritised transaction is still in mempool")
        assert(high_fee_tx in mempool)
        for x in txids[2]:
            if (x != high_fee_tx):
                assert(x not in mempool)

        # Create a free, low priority transaction.  Should be rejected.
        utxo_list = self.nodes[0].listunspent()
        assert(len(utxo_list) > 0)
        utxo = utxo_list[0]

        inputs = []
        outputs = {}
        inputs.append({"txid": utxo["txid"], "vout": utxo["vout"]})
        outputs[self.nodes[0].getnewaddress()] = utxo["amount"] - self.relayfee
        raw_tx = self.nodes[0].createrawtransaction(inputs, outputs)
        tx_hex = self.nodes[0].signrawtransactionwithwallet(raw_tx)["hex"]
        txid = self.nodes[0].sendrawtransaction(tx_hex)

        # A tx that spends an in-mempool tx has 0 priority, so we can use it to
        # test the effect of using prioritise transaction for mempool
        # acceptance
        inputs = []
        inputs.append({"txid": txid, "vout": 0})
        outputs = {}
        outputs[self.nodes[0].getnewaddress()] = utxo["amount"] - self.relayfee
        raw_tx2 = self.nodes[0].createrawtransaction(inputs, outputs)
        tx2_hex = self.nodes[0].signrawtransactionwithwallet(raw_tx2)["hex"]
        tx2_id = self.nodes[0].decoderawtransaction(tx2_hex)["txid"]

        # This will raise an exception due to min relay fee not being met
        assert_raises_rpc_error(-26, "66: insufficient priority",
                                self.nodes[0].sendrawtransaction, tx2_hex)
        assert(tx2_id not in self.nodes[0].getrawmempool())

        # This is a less than 1000-byte transaction, so just set the fee
        # to be the minimum for a 1000 byte transaction and check that it is
        # accepted.
        self.nodes[0].prioritisetransaction(
            tx2_id, 0, int(self.relayfee * COIN))

        self.log.info(
            "Assert that prioritised free transaction is accepted to mempool")
        assert_equal(self.nodes[0].sendrawtransaction(tx2_hex), tx2_id)
        assert(tx2_id in self.nodes[0].getrawmempool())


if __name__ == '__main__':
    PrioritiseTransactionTest().main()
