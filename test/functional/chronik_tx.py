#!/usr/bin/env python3
# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /tx endpoint.
"""

import http.client

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import (
    GENESIS_BLOCK_HASH,
    GENESIS_CB_TXID,
    TIME_GENESIS_BLOCK,
)
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.script import OP_EQUAL, OP_HASH160, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikTxTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [['-chronik']]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        import chronik_pb2 as pb

        def query_tx(txid):
            chronik_port = self.nodes[0].chronik_port
            client = http.client.HTTPConnection('127.0.0.1', chronik_port, timeout=4)
            client.request('GET', f'/tx/{txid}')
            response = client.getresponse()
            assert_equal(response.getheader('Content-Type'),
                         'application/x-protobuf')
            return response

        def query_tx_success(txid):
            response = query_tx(txid)
            assert_equal(response.status, 200)
            proto_tx = pb.Tx()
            proto_tx.ParseFromString(response.read())
            return proto_tx

        def query_tx_err(txid, status):
            response = query_tx(txid)
            assert_equal(response.status, status)
            proto_error = pb.Error()
            proto_error.ParseFromString(response.read())
            return proto_error

        node = self.nodes[0]
        node.setmocktime(1333333337)

        assert_equal(query_tx_err('0', 400).msg, '400: Not a txid: 0')
        assert_equal(query_tx_err('123', 400).msg, '400: Not a txid: 123')
        assert_equal(query_tx_err('1234f', 400).msg, '400: Not a txid: 1234f')
        assert_equal(query_tx_err('00' * 31, 400).msg, f'400: Not a txid: {"00"*31}')
        assert_equal(query_tx_err('01', 400).msg, '400: Not a txid: 01')
        assert_equal(query_tx_err('12345678901', 400).msg,
                     '400: Not a txid: 12345678901')

        assert_equal(query_tx_err('00' * 32, 404).msg,
                     f'404: Transaction {"00"*32} not found in the index')

        genesis_tx = pb.Tx(
            txid=bytes.fromhex(GENESIS_CB_TXID)[::-1],
            version=1,
            inputs=[pb.TxInput(
                prev_out=pb.OutPoint(txid=bytes(32), out_idx=0xffffffff),
                input_script=(
                    b'\x04\xff\xff\x00\x1d\x01\x04EThe Times 03/Jan/2009 Chancellor '
                    b'on brink of second bailout for banks'
                ),
                sequence_no=0xffffffff,
            )],
            outputs=[pb.TxOutput(
                value=5000000000,
                output_script=bytes.fromhex(
                    '4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61'
                    'deb649f6bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf1'
                    '1d5fac'
                ),
            )],
            lock_time=0,
            block=pb.BlockMetadata(
                hash=bytes.fromhex(GENESIS_BLOCK_HASH)[::-1],
                height=0,
                timestamp=TIME_GENESIS_BLOCK,
            ),
            time_first_seen=0,
            is_coinbase=True,
        )

        # Verify queried genesis tx matches
        assert_equal(query_tx_success(GENESIS_CB_TXID), genesis_tx)

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock['tx'][0]

        self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000
        send_values = [coinvalue - 10000, 1000, 2000, 3000]
        send_scripts = [CScript([OP_HASH160, bytes([i]) * 20, OP_EQUAL])
                        for i in range(len(send_values))]
        tx = CTransaction()
        tx.nVersion = 2
        tx.vin = [CTxIn(outpoint=COutPoint(int(cointx, 16), 0),
                        scriptSig=SCRIPTSIG_OP_TRUE,
                        nSequence=0xfffffffe)]
        tx.vout = [CTxOut(value, script)
                   for (value, script) in zip(send_values, send_scripts)]
        tx.nLockTime = 1234567890

        # Submit tx to mempool
        txid = node.sendrawtransaction(tx.serialize().hex())

        proto_tx = pb.Tx(
            txid=bytes.fromhex(txid)[::-1],
            version=tx.nVersion,
            inputs=[pb.TxInput(
                prev_out=pb.OutPoint(txid=bytes.fromhex(cointx)[::-1], out_idx=0),
                input_script=bytes(tx.vin[0].scriptSig),
                output_script=bytes(P2SH_OP_TRUE),
                value=coinvalue,
                sequence_no=0xfffffffe,
            )],
            outputs=[pb.TxOutput(
                value=value,
                output_script=bytes(script),
            ) for (value, script) in zip(send_values, send_scripts)],
            lock_time=1234567890,
            block=None,
            time_first_seen=0,
            is_coinbase=False,
        )

        # Currently, the mempool is not implemented yet, so we get a 404.
        # Once the mempool is implemented, this test will fail.
        assert_equal(query_tx_err(txid, 404).msg,
                     f'404: Transaction {txid} not found in the index')

        # If we mine the block, querying will gives us all the tx details + block
        txblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]

        # Set the `block` field, now that we mined it
        proto_tx.block.CopyFrom(pb.BlockMetadata(
            hash=bytes.fromhex(txblockhash)[::-1],
            height=102,
            timestamp=1333333355,
        ))
        assert_equal(query_tx_success(txid), proto_tx)


if __name__ == '__main__':
    ChronikTxTest().main()
