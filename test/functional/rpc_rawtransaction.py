#!/usr/bin/env python3
# Copyright (c) 2014-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""rawtranscation RPCs QA test.

# Tests the following RPCs:
#    - createrawtransaction
#    - signrawtransactionwithwallet
#    - sendrawtransaction
#    - decoderawtransaction
#    - getrawtransaction
"""
from decimal import Decimal

from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_raw_tx
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_raises_rpc_error,
    connect_nodes_bi,
)

# Create one-input, one-output, no-fee transaction:


class RawTransactionsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 3

    def setup_network(self, split=False):
        super().setup_network()
        connect_nodes_bi(self.nodes[0], self.nodes[2])

    def run_test(self):
        # prepare some coins for multiple *rawtransaction commands
        self.nodes[2].generate(1)
        self.sync_all()
        self.nodes[0].generate(101)
        self.sync_all()
        self.nodes[0].sendtoaddress(self.nodes[2].getnewaddress(), 1.5)
        self.nodes[0].sendtoaddress(self.nodes[2].getnewaddress(), 1.0)
        self.nodes[0].sendtoaddress(self.nodes[2].getnewaddress(), 5.0)
        self.sync_all()
        self.nodes[0].generate(5)
        self.sync_all()

        #
        # sendrawtransaction with missing input #
        #
        inputs = [
            {'txid': "1d1d4e24ed99057e84c3f80fd8fbec79ed9e1acee37da269356ecea000000000", 'vout': 1}]
        # won't exists
        outputs = {self.nodes[0].getnewaddress(): 4.998}
        rawtx = self.nodes[2].createrawtransaction(inputs, outputs)
        rawtx = pad_raw_tx(rawtx)
        rawtx = self.nodes[2].signrawtransactionwithwallet(rawtx)

        # This will raise an exception since there are missing inputs
        assert_raises_rpc_error(
            -25, "Missing inputs", self.nodes[2].sendrawtransaction, rawtx['hex'])

        #
        # RAW TX MULTISIG TESTS #
        #
        # 2of2 test
        addr1 = self.nodes[2].getnewaddress()
        addr2 = self.nodes[2].getnewaddress()

        addr1Obj = self.nodes[2].validateaddress(addr1)
        addr2Obj = self.nodes[2].validateaddress(addr2)

        mSigObj = self.nodes[2].addmultisigaddress(
            2, [addr1Obj['pubkey'], addr2Obj['pubkey']])

        # use balance deltas instead of absolute values
        bal = self.nodes[2].getbalance()

        # send 1.2 BTC to msig adr
        txId = self.nodes[0].sendtoaddress(mSigObj, 1.2)
        self.sync_all()
        self.nodes[0].generate(1)
        self.sync_all()
        # node2 has both keys of the 2of2 ms addr., tx should affect the
        # balance
        assert_equal(self.nodes[2].getbalance(), bal + Decimal('1.20000000'))

        # 2of3 test from different nodes
        bal = self.nodes[2].getbalance()
        addr1 = self.nodes[1].getnewaddress()
        addr2 = self.nodes[2].getnewaddress()
        addr3 = self.nodes[2].getnewaddress()

        addr1Obj = self.nodes[1].validateaddress(addr1)
        addr2Obj = self.nodes[2].validateaddress(addr2)
        addr3Obj = self.nodes[2].validateaddress(addr3)

        mSigObj = self.nodes[2].addmultisigaddress(
            2, [addr1Obj['pubkey'], addr2Obj['pubkey'], addr3Obj['pubkey']])

        txId = self.nodes[0].sendtoaddress(mSigObj, 2.2)
        decTx = self.nodes[0].gettransaction(txId)
        rawTx = self.nodes[0].decoderawtransaction(decTx['hex'])
        sPK = rawTx['vout'][0]['scriptPubKey']['hex']
        self.sync_all()
        self.nodes[0].generate(1)
        self.sync_all()

        # THIS IS A INCOMPLETE FEATURE
        # NODE2 HAS TWO OF THREE KEY AND THE FUNDS SHOULD BE SPENDABLE AND
        # COUNT AT BALANCE CALCULATION
        # for now, assume the funds of a 2of3 multisig tx are not marked as
        # spendable
        assert_equal(self.nodes[2].getbalance(), bal)

        txDetails = self.nodes[0].gettransaction(txId, True)
        rawTx = self.nodes[0].decoderawtransaction(txDetails['hex'])
        vout = False
        for outpoint in rawTx['vout']:
            if outpoint['value'] == Decimal('2.20000000'):
                vout = outpoint
                break

        bal = self.nodes[0].getbalance()
        inputs = [{
            "txid": txId,
            "vout": vout['n'],
            "scriptPubKey": vout['scriptPubKey']['hex'],
            "amount": vout['value'],
        }]
        outputs = {self.nodes[0].getnewaddress(): 2.19}
        rawTx = self.nodes[2].createrawtransaction(inputs, outputs)
        rawTxPartialSigned = self.nodes[1].signrawtransactionwithwallet(
            rawTx, inputs)
        # node1 only has one key, can't comp. sign the tx
        assert_equal(rawTxPartialSigned['complete'], False)

        rawTxSigned = self.nodes[2].signrawtransactionwithwallet(rawTx, inputs)
        # node2 can sign the tx compl., own two of three keys
        assert_equal(rawTxSigned['complete'], True)
        self.nodes[2].sendrawtransaction(rawTxSigned['hex'])
        rawTx = self.nodes[0].decoderawtransaction(rawTxSigned['hex'])
        self.sync_all()
        self.nodes[0].generate(1)
        self.sync_all()
        assert_equal(self.nodes[0].getbalance(), bal + Decimal(
            '50.00000000') + Decimal('2.19000000'))  # block reward + tx

        rawTxBlock = self.nodes[0].getblock(self.nodes[0].getbestblockhash())

        # 2of2 test for combining transactions
        bal = self.nodes[2].getbalance()
        addr1 = self.nodes[1].getnewaddress()
        addr2 = self.nodes[2].getnewaddress()

        addr1Obj = self.nodes[1].validateaddress(addr1)
        addr2Obj = self.nodes[2].validateaddress(addr2)

        self.nodes[1].addmultisigaddress(
            2, [addr1Obj['pubkey'], addr2Obj['pubkey']])
        mSigObj = self.nodes[2].addmultisigaddress(
            2, [addr1Obj['pubkey'], addr2Obj['pubkey']])
        mSigObjValid = self.nodes[2].validateaddress(mSigObj)

        txId = self.nodes[0].sendtoaddress(mSigObj, 2.2)
        decTx = self.nodes[0].gettransaction(txId)
        rawTx2 = self.nodes[0].decoderawtransaction(decTx['hex'])
        self.sync_all()
        self.nodes[0].generate(1)
        self.sync_all()

        # the funds of a 2of2 multisig tx should not be marked as spendable
        assert_equal(self.nodes[2].getbalance(), bal)

        txDetails = self.nodes[0].gettransaction(txId, True)
        rawTx2 = self.nodes[0].decoderawtransaction(txDetails['hex'])
        vout = False
        for outpoint in rawTx2['vout']:
            if outpoint['value'] == Decimal('2.20000000'):
                vout = outpoint
                break

        bal = self.nodes[0].getbalance()
        inputs = [{"txid": txId, "vout": vout['n'], "scriptPubKey": vout['scriptPubKey']
                   ['hex'], "redeemScript": mSigObjValid['hex'], "amount": vout['value']}]
        outputs = {self.nodes[0].getnewaddress(): 2.19}
        rawTx2 = self.nodes[2].createrawtransaction(inputs, outputs)
        rawTxPartialSigned1 = self.nodes[1].signrawtransactionwithwallet(
            rawTx2, inputs)
        self.log.info(rawTxPartialSigned1)
        # node1 only has one key, can't comp. sign the tx
        assert_equal(rawTxPartialSigned['complete'], False)

        rawTxPartialSigned2 = self.nodes[2].signrawtransactionwithwallet(
            rawTx2, inputs)
        self.log.info(rawTxPartialSigned2)
        # node2 only has one key, can't comp. sign the tx
        assert_equal(rawTxPartialSigned2['complete'], False)
        rawTxComb = self.nodes[2].combinerawtransaction(
            [rawTxPartialSigned1['hex'], rawTxPartialSigned2['hex']])
        self.log.info(rawTxComb)
        self.nodes[2].sendrawtransaction(rawTxComb)
        rawTx2 = self.nodes[0].decoderawtransaction(rawTxComb)
        self.sync_all()
        self.nodes[0].generate(1)
        self.sync_all()
        assert_equal(self.nodes[0].getbalance(
        ), bal+Decimal('50.00000000')+Decimal('2.19000000'))  # block reward + tx

        # getrawtransaction tests
        # 1. valid parameters - only supply txid
        txHash = rawTx["hash"]
        assert_equal(
            self.nodes[0].getrawtransaction(txHash), rawTxSigned['hex'])

        # 2. valid parameters - supply txid and 0 for non-verbose
        assert_equal(
            self.nodes[0].getrawtransaction(txHash, 0), rawTxSigned['hex'])

        # 3. valid parameters - supply txid and False for non-verbose
        assert_equal(self.nodes[0].getrawtransaction(
            txHash, False), rawTxSigned['hex'])

        # 4. valid parameters - supply txid and 1 for verbose.
        # We only check the "hex" field of the output so we don't need to
        # update this test every time the output format changes.
        assert_equal(self.nodes[0].getrawtransaction(
            txHash, 1)["hex"], rawTxSigned['hex'])

        # 5. valid parameters - supply txid and True for non-verbose
        assert_equal(self.nodes[0].getrawtransaction(
            txHash, True)["hex"], rawTxSigned['hex'])

        # 6. invalid parameters - supply txid and string "Flase"
        assert_raises_rpc_error(
            -3, "Invalid type", self.nodes[0].getrawtransaction, txHash, "False")

        # 7. invalid parameters - supply txid and empty array
        assert_raises_rpc_error(
            -3, "Invalid type", self.nodes[0].getrawtransaction, txHash, [])

        # 8. invalid parameters - supply txid and empty dict
        assert_raises_rpc_error(
            -3, "Invalid type", self.nodes[0].getrawtransaction, txHash, {})

        # Sanity checks on verbose getrawtransaction output
        rawTxOutput = self.nodes[0].getrawtransaction(txHash, True)
        assert_equal(rawTxOutput["hex"], rawTxSigned["hex"])
        assert_equal(rawTxOutput["txid"], txHash)
        assert_equal(rawTxOutput["hash"], txHash)
        assert_greater_than(rawTxOutput["size"], 300)
        assert_equal(rawTxOutput["version"], 0x02)
        assert_equal(rawTxOutput["locktime"], 0)
        assert_equal(len(rawTxOutput["vin"]), 1)
        assert_equal(len(rawTxOutput["vout"]), 1)
        assert_equal(rawTxOutput["blockhash"], rawTxBlock["hash"])
        assert_equal(rawTxOutput["confirmations"], 3)
        assert_equal(rawTxOutput["time"], rawTxBlock["time"])
        assert_equal(rawTxOutput["blocktime"], rawTxBlock["time"])

        inputs = [
            {'txid': "1d1d4e24ed99057e84c3f80fd8fbec79ed9e1acee37da269356ecea000000000", 'sequence': 1000}]
        outputs = {self.nodes[0].getnewaddress(): 1}
        assert_raises_rpc_error(
            -8, 'Invalid parameter, missing vout key',
            self.nodes[0].createrawtransaction, inputs, outputs)

        inputs[0]['vout'] = "1"
        assert_raises_rpc_error(
            -8, 'Invalid parameter, vout must be a number',
            self.nodes[0].createrawtransaction, inputs, outputs)

        inputs[0]['vout'] = -1
        assert_raises_rpc_error(
            -8, 'Invalid parameter, vout must be positive',
            self.nodes[0].createrawtransaction, inputs, outputs)

        inputs[0]['vout'] = 1
        rawtx = self.nodes[0].createrawtransaction(inputs, outputs)
        decrawtx = self.nodes[0].decoderawtransaction(rawtx)
        assert_equal(decrawtx['vin'][0]['sequence'], 1000)

        # 9. invalid parameters - sequence number out of range
        inputs[0]['sequence'] = -1
        assert_raises_rpc_error(
            -8, 'Invalid parameter, sequence number is out of range',
            self.nodes[0].createrawtransaction, inputs, outputs)

        # 10. invalid parameters - sequence number out of range
        inputs[0]['sequence'] = 4294967296
        assert_raises_rpc_error(
            -8, 'Invalid parameter, sequence number is out of range',
            self.nodes[0].createrawtransaction, inputs, outputs)

        inputs[0]['sequence'] = 4294967294
        rawtx = self.nodes[0].createrawtransaction(inputs, outputs)
        decrawtx = self.nodes[0].decoderawtransaction(rawtx)
        assert_equal(decrawtx['vin'][0]['sequence'], 4294967294)


if __name__ == '__main__':
    RawTransactionsTest().main()
