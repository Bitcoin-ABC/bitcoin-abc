#!/usr/bin/env python3
# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /script/:type/:payload/unconfirmed-txs endpoint.
"""

import http.client

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikScriptUnconfirmedTxsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [['-chronik']]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        import chronik_pb2 as pb

        def query_script_txs(script_type, payload_hex):
            chronik_port = self.nodes[0].chronik_port
            client = http.client.HTTPConnection('127.0.0.1', chronik_port, timeout=4)
            url = f'/script/{script_type}/{payload_hex}/unconfirmed-txs'
            client.request('GET', url)
            response = client.getresponse()
            assert_equal(response.getheader('Content-Type'),
                         'application/x-protobuf')
            return response

        def query_script_txs_success(*args, **kwargs):
            response = query_script_txs(*args, **kwargs)
            assert_equal(response.status, 200)
            proto_tx = pb.TxHistoryPage()
            proto_tx.ParseFromString(response.read())
            return proto_tx

        def query_script_txs_err(*args, status, **kwargs):
            response = query_script_txs(*args, **kwargs)
            assert_equal(response.status, status)
            proto_error = pb.Error()
            proto_error.ParseFromString(response.read())
            return proto_error

        node = self.nodes[0]
        peer = node.add_p2p_connection(P2PDataStore())
        mocktime = 1300000000
        node.setmocktime(mocktime)

        assert_equal(
            query_script_txs_err('', '', status=400).msg,
            '400: Unknown script type: ')
        assert_equal(
            query_script_txs_err('foo', '', status=400).msg,
            '400: Unknown script type: foo')
        assert_equal(
            query_script_txs_err('p2pkh', 'LILALI', status=400).msg,
            "400: Invalid hex: Invalid character 'L' at position 0")
        assert_equal(
            query_script_txs_err('other', 'LILALI', status=400).msg,
            "400: Invalid hex: Invalid character 'L' at position 0")
        assert_equal(
            query_script_txs_err('p2pkh', '', status=400).msg,
            '400: Invalid payload for P2PKH: Invalid length, ' +
            'expected 20 bytes but got 0 bytes')
        assert_equal(
            query_script_txs_err('p2pkh', 'aA', status=400).msg,
            '400: Invalid payload for P2PKH: Invalid length, ' +
            'expected 20 bytes but got 1 bytes')
        assert_equal(
            query_script_txs_err('p2sh', 'aaBB', status=400).msg,
            '400: Invalid payload for P2SH: Invalid length, ' +
            'expected 20 bytes but got 2 bytes')
        assert_equal(
            query_script_txs_err('p2pk', 'aaBBcc', status=400).msg,
            '400: Invalid payload for P2PK: Invalid length, ' +
            'expected one of [33, 65] but got 3 bytes')

        genesis_pk = (
            '04678afdb0fe5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6'
            'bc3f4cef38c4f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5f'
        )

        # No txs in mempool for the genesis pubkey
        assert_equal(
            query_script_txs_success('p2pk', genesis_pk),
            pb.TxHistoryPage(num_pages=0, num_txs=0))

        script_type = 'p2sh'
        payload_hex = P2SH_OP_TRUE[2:-1].hex()

        # Generate 110 blocks to some address
        blockhashes = self.generatetoaddress(node, 110, ADDRESS_ECREG_P2SH_OP_TRUE)

        # No txs in mempool for that address
        assert_equal(
            query_script_txs_success(script_type, payload_hex),
            pb.TxHistoryPage(num_pages=0, num_txs=0))

        coinvalue = 5000000000
        cointxids = []
        for coinblockhash in blockhashes[:10]:
            coinblock = node.getblock(coinblockhash)
            cointxids.append(coinblock['tx'][0])

        mempool_txs = []
        mempool_proto_txs = []
        # Send 10 mempool txs, each with their own mocktime
        mocktime_offsets = [0, 10, 10, 5, 0, 0, 12, 12, 10, 5]
        for mocktime_offset in mocktime_offsets:
            cointxid = cointxids.pop(0)
            time_first_seen = mocktime + mocktime_offset
            pad_script = CScript([OP_RETURN, bytes(100)])

            tx = CTransaction()
            tx.nVersion = 1
            tx.vin = [CTxIn(outpoint=COutPoint(int(cointxid, 16), 0),
                            scriptSig=SCRIPTSIG_OP_TRUE,
                            nSequence=0xffffffff)]
            tx.vout = [
                CTxOut(coinvalue - 1000, P2SH_OP_TRUE),
                CTxOut(0, pad_script),
            ]
            tx.nLockTime = 1

            node.setmocktime(time_first_seen)
            txid = node.sendrawtransaction(tx.serialize().hex())
            mempool_txs.append(tx)
            mempool_proto_txs.append(pb.Tx(
                txid=bytes.fromhex(txid)[::-1],
                version=1,
                inputs=[pb.TxInput(
                    prev_out=pb.OutPoint(
                        txid=bytes.fromhex(cointxid)[::-1],
                        out_idx=0,
                    ),
                    input_script=bytes(SCRIPTSIG_OP_TRUE),
                    output_script=bytes(P2SH_OP_TRUE),
                    value=coinvalue,
                    sequence_no=0xffffffff,
                )],
                outputs=[
                    pb.TxOutput(
                        value=coinvalue - 1000,
                        output_script=bytes(P2SH_OP_TRUE),
                    ),
                    pb.TxOutput(
                        value=0,
                        output_script=bytes(pad_script),
                    ),
                ],
                lock_time=1,
                time_first_seen=time_first_seen,
            ))

        # Sort txs by time_first_seen and then by txid
        def sorted_txs(txs):
            return sorted(txs, key=lambda tx: (tx.time_first_seen, tx.txid[::-1]))

        assert_equal(
            query_script_txs_success(script_type, payload_hex),
            pb.TxHistoryPage(txs=sorted_txs(mempool_proto_txs),
                             num_pages=1,
                             num_txs=len(mempool_txs)))

        # Mine 5 transactions, with 2 conflicts, leave 5 others unconfirmed
        mine_txs = mempool_txs[:3]
        mine_proto_txs = mempool_proto_txs[:3]
        for conflict_tx, conflict_proto_tx in zip(
                mempool_txs[3:5], mempool_proto_txs[3:5]):
            conflict_tx.nLockTime = 2
            conflict_tx.rehash()
            mine_txs.append(conflict_tx)
            conflict_proto_tx.txid = bytes.fromhex(conflict_tx.hash)[::-1]
            conflict_proto_tx.lock_time = 2
            mine_proto_txs.append(conflict_proto_tx)

        height = 111
        coinbase_tx = create_coinbase(height)
        coinbase_tx.vout[0].scriptPubKey = P2SH_OP_TRUE
        coinbase_tx.rehash()
        block = create_block(int(blockhashes[-1], 16), coinbase_tx,
                             mocktime + 1100)
        block.vtx += mine_txs
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)

        # Only unconfirmed txs remain, conflict txs are removed
        assert_equal(
            query_script_txs_success(script_type, payload_hex),
            pb.TxHistoryPage(txs=sorted_txs(mempool_proto_txs[5:]),
                             num_pages=1,
                             num_txs=5))


if __name__ == '__main__':
    ChronikScriptUnconfirmedTxsTest().main()
