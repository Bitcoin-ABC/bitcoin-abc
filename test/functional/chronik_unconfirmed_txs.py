# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /unconfirmed-txs endpoint.
"""

import time

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import create_block, create_coinbase
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikUnconfirmedTxsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        mocktime = int(time.time())
        node.setmocktime(mocktime)

        from test_framework.chronik.client import pb

        # No txs in mempool
        assert_equal(node.getrawmempool(), [])
        assert_equal(
            chronik.unconfirmed_txs().ok(),
            pb.TxHistoryPage(num_pages=0, num_txs=0),
        )

        # Generate 110 blocks to some address
        blockhashes = self.generatetoaddress(node, 110, ADDRESS_ECREG_P2SH_OP_TRUE)

        coinvalue = 5000000000
        cointxids = []
        for coinblockhash in blockhashes[:10]:
            coinblock = node.getblock(coinblockhash)
            cointxids.append(coinblock["tx"][0])

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
            tx.vin = [
                CTxIn(
                    outpoint=COutPoint(int(cointxid, 16), 0),
                    scriptSig=SCRIPTSIG_OP_TRUE,
                    nSequence=0xFFFFFFFF,
                )
            ]
            tx.vout = [
                CTxOut(coinvalue - 1000, P2SH_OP_TRUE),
                CTxOut(0, pad_script),
            ]
            tx.nLockTime = 1

            node.setmocktime(time_first_seen)
            txid = node.sendrawtransaction(tx.serialize().hex())
            mempool_txs.append(tx)
            mempool_proto_txs.append(
                pb.Tx(
                    txid=bytes.fromhex(txid)[::-1],
                    version=1,
                    inputs=[
                        pb.TxInput(
                            prev_out=pb.OutPoint(
                                txid=bytes.fromhex(cointxid)[::-1],
                                out_idx=0,
                            ),
                            input_script=bytes(SCRIPTSIG_OP_TRUE),
                            output_script=bytes(P2SH_OP_TRUE),
                            sats=coinvalue,
                            sequence_no=0xFFFFFFFF,
                        )
                    ],
                    outputs=[
                        pb.TxOutput(
                            sats=coinvalue - 1000,
                            output_script=bytes(P2SH_OP_TRUE),
                        ),
                        pb.TxOutput(
                            sats=0,
                            output_script=bytes(pad_script),
                        ),
                    ],
                    lock_time=1,
                    size=len(tx.serialize()),
                    time_first_seen=time_first_seen,
                )
            )

        # Sort txs by time_first_seen and then by txid
        def sorted_txs(txs):
            return sorted(txs, key=lambda tx: (tx.time_first_seen, tx.txid[::-1]))

        assert_equal(
            chronik.unconfirmed_txs().ok(),
            pb.TxHistoryPage(
                txs=sorted_txs(mempool_proto_txs), num_pages=1, num_txs=len(mempool_txs)
            ),
        )

        # Mine 5 transactions, with 2 conflicts, leave 5 others unconfirmed
        mine_txs = mempool_txs[:3]
        mine_proto_txs = mempool_proto_txs[:3]
        for conflict_tx, conflict_proto_tx in zip(
            mempool_txs[3:5], mempool_proto_txs[3:5]
        ):
            conflict_tx.nLockTime = 2
            mine_txs.append(conflict_tx)
            conflict_proto_tx.txid = bytes.fromhex(conflict_tx.txid_hex)[::-1]
            conflict_proto_tx.lock_time = 2
            mine_proto_txs.append(conflict_proto_tx)

        height = 111
        coinbase_tx = create_coinbase(height)
        coinbase_tx.vout[0].scriptPubKey = P2SH_OP_TRUE
        block = create_block(
            int(blockhashes[-1], 16), coinbase_tx, mocktime + 1100, txlist=mine_txs
        )
        block.solve()
        peer = node.add_p2p_connection(P2PDataStore())
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()

        # Only unconfirmed txs remain, conflict txs are removed
        assert_equal(
            chronik.unconfirmed_txs().ok(),
            pb.TxHistoryPage(
                txs=sorted_txs(mempool_proto_txs[5:]), num_pages=1, num_txs=5
            ),
        )


if __name__ == "__main__":
    ChronikUnconfirmedTxsTest().main()
