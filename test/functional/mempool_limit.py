#!/usr/bin/env python3
# Copyright (c) 2014-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Test mempool limiting together/eviction with the wallet

from test_framework.blocktools import (
    create_confirmed_utxos,
    send_big_transactions,
)
from test_framework.test_framework import BitcoinTestFramework


class MempoolLimitTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1

        self.extra_args = [["-maxmempool=5", "-spendzeroconfchange=0"]]

    def run_test(self):
        relayfee = self.nodes[0].getnetworkinfo()['relayfee']

        txids = []
        utxo_groups = 4
        utxos = create_confirmed_utxos(self.nodes[0], 1 + 30 * utxo_groups)

        # create a mempool tx that will be evicted
        us0 = utxos.pop()
        inputs = [{"txid": us0["txid"], "vout": us0["vout"]}]
        outputs = {self.nodes[0].getnewaddress(): 0.0001}
        tx = self.nodes[0].createrawtransaction(inputs, outputs)
        # specifically fund this tx with low fee
        self.nodes[0].settxfee(relayfee)
        txF = self.nodes[0].fundrawtransaction(tx)
        # return to automatic fee selection
        self.nodes[0].settxfee(0)
        txFS = self.nodes[0].signrawtransactionwithwallet(txF['hex'])
        txid = self.nodes[0].sendrawtransaction(txFS['hex'])

        for i in range(utxo_groups):
            txids.append([])
            txids[i] = send_big_transactions(
                self.nodes[0], utxos[30 * i:30 * i + 30], 30, 10 * (i + 1))

        # by now, the tx should be evicted, check confirmation state
        assert(txid not in self.nodes[0].getrawmempool())
        txdata = self.nodes[0].gettransaction(txid)
        assert(txdata['confirmations'] == 0)  # confirmation should still be 0


if __name__ == '__main__':
    MempoolLimitTest().main()
