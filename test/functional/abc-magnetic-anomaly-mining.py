#!/usr/bin/env python3
# Copyright (c) 2014-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test that mining RPC continues to supply correct transaction metadata after
the Nov 2018 protocol upgrade which engages canonical transaction ordering
"""

import time
import random
import decimal

from test_framework.test_framework import BitcoinTestFramework


class CTORMiningTest(BitcoinTestFramework):
    def set_test_params(self):
        # Setup two nodes so we can getblocktemplate
        # it errors out if it is not connected to other nodes
        self.num_nodes = 2
        self.setup_clean_chain = True
        self.block_heights = {}
        self.tip = None
        self.blocks = {}
        self.mocktime = int(time.time()) - 600 * 100

        extra_arg = ['-spendzeroconfchange=0', '-whitelist=127.0.0.1',
                     "-replayprotectionactivationtime={}".format(10 * self.mocktime)]
        self.extra_args = [extra_arg, extra_arg]

    def run_test(self):
        mining_node = self.nodes[0]

        # Helper for updating the times
        def update_time():
            mining_node.setmocktime(self.mocktime)
            self.mocktime = self.mocktime + 600

        mining_node.getnewaddress()

        # Generate some unspent utxos and also
        # activate magnetic anomaly
        for x in range(150):
            update_time()
            mining_node.generate(1)

        update_time()
        unspent = mining_node.listunspent()

        transactions = {}
        # Spend all our coinbases
        while len(unspent):
            inputs = []
            # Grab a random number of inputs
            for _ in range(random.randrange(1, 5)):
                txin = unspent.pop()
                inputs.append({
                    'txid': txin['txid'],
                    'vout': 0  # This is a coinbase
                })
                if len(unspent) == 0:
                    break

            outputs = {}
            # Calculate a unique fee for this transaction
            fee = decimal.Decimal(random.randint(
                1000, 2000)) / decimal.Decimal(1e8)
            # Spend to the same number of outputs as inputs, so we can leave
            # the amounts unchanged and avoid rounding errors.
            #
            # NOTE: There will be 1 sigop per output (which equals the number
            # of inputs now).  We need this randomization to ensure the
            # numbers are properly following the transactions in the block
            # template metadata
            addr = ""
            for _ in range(len(inputs)):
                addr = mining_node.getnewaddress()
                output = {
                    # 50 BCH per coinbase
                    addr: decimal.Decimal(50)
                }
                outputs.update(output)

            # Take the fee off the last output to avoid rounding errors we
            # need the exact fee later for assertions
            outputs[addr] -= fee

            rawtx = mining_node.createrawtransaction(inputs, outputs)
            signedtx = mining_node.signrawtransaction(rawtx)
            txid = mining_node.sendrawtransaction(signedtx['hex'])
            # number of outputs is the same as the number of sigops in this
            # case
            transactions.update({txid: {'fee': fee, 'sigops': len(outputs)}})

        tmpl = mining_node.getblocktemplate()
        assert 'proposal' in tmpl['capabilities']
        assert 'coinbasetxn' not in tmpl

        # Check the template transaction metadata and ordering
        last_txid = 0
        for txn in tmpl['transactions'][1:]:
            txid = txn['txid']
            txnMetadata = transactions[txid]
            expectedFeeSats = int(txnMetadata['fee'] * 10**8)
            expectedSigOps = txnMetadata['sigops']

            txid_decoded = int(txid, 16)

            # Assert we got the expected metadata
            assert(expectedFeeSats == txn['fee'])
            assert(expectedSigOps == txn['sigops'])
            # Assert transaction ids are in order
            assert(last_txid == 0 or last_txid < txid_decoded)
            last_txid = txid_decoded


if __name__ == '__main__':
    CTORMiningTest().main()
