#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#
# Test HighPriorityTransaction code
#

from test_framework.blocktools import create_confirmed_utxos
from test_framework.messages import COIN
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, satoshi_round


class HighPriorityTransactionTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-blockprioritypercentage=0", "-limitfreerelay=2"]]

    def create_small_transactions(self, node, utxos, num, fee):
        addr = node.getnewaddress()
        txids = []
        for _ in range(num):
            t = utxos.pop()
            inputs = [{"txid": t["txid"], "vout": t["vout"]}]
            outputs = {}
            change = t['amount'] - fee
            outputs[addr] = satoshi_round(change)
            rawtx = node.createrawtransaction(inputs, outputs)
            signresult = node.signrawtransactionwithwallet(
                rawtx, None, "NONE|FORKID")
            txid = node.sendrawtransaction(signresult["hex"], True)
            txids.append(txid)
        return txids

    def generate_high_priotransactions(self, node, count):
        # create 150 simple one input one output hi prio txns
        hiprio_utxo_count = 150
        age = 250
        # be sure to make this utxo aged enough
        hiprio_utxos = create_confirmed_utxos(node, hiprio_utxo_count, age)

        # Create hiprio_utxo_count number of txns with 0 fee
        txids = self.create_small_transactions(
            node, hiprio_utxos, hiprio_utxo_count, 0)
        return txids

    def run_test(self):
        # this is the priority cut off as defined in AllowFreeThreshold() (see: src/txmempool.h)
        # anything above that value is considered an high priority transaction
        hiprio_threshold = COIN * 144 / 250
        self.relayfee = self.nodes[0].getnetworkinfo()['relayfee']

        # first test step: 0 reserved prio space in block
        txids = self.generate_high_priotransactions(self.nodes[0], 150)
        mempool_size_pre = self.nodes[0].getmempoolinfo()['bytes']
        mempool = self.nodes[0].getrawmempool(True)
        # assert that all the txns are in the mempool and that all of them are hi prio
        for i in txids:
            assert i in mempool
            assert mempool[i]['currentpriority'] > hiprio_threshold

        # mine one block
        self.nodes[0].generate(1)

        self.log.info(
            "Assert that all high prio transactions haven't been mined")
        assert_equal(self.nodes[0].getmempoolinfo()['bytes'], mempool_size_pre)

        # restart with default blockprioritypercentage
        self.restart_node(0, ["-limitfreerelay=2"])

        # second test step: default reserved prio space in block (100K).
        # the mempool size is about 25K this means that all txns will be
        # included in the soon to be mined block
        txids = self.generate_high_priotransactions(self.nodes[0], 150)
        mempool_size_pre = self.nodes[0].getmempoolinfo()['bytes']
        mempool = self.nodes[0].getrawmempool(True)
        # assert that all the txns are in the mempool and that all of them are hiprio
        for i in txids:
            assert i in mempool
            assert mempool[i]['currentpriority'] > hiprio_threshold

        # mine one block
        self.nodes[0].generate(1)

        self.log.info("Assert that all high prio transactions have been mined")
        assert self.nodes[0].getmempoolinfo()['bytes'] == 0


if __name__ == '__main__':
    HighPriorityTransactionTest().main()
