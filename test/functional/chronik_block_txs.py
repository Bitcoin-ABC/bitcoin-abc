# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /block-txs/:hash_or_height endpoint.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import (
    COINBASE_MATURITY,
    GENESIS_BLOCK_HASH,
    create_block,
    create_coinbase,
)
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikBlockTxsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        node.setmocktime(1300000000)
        chronik = node.get_chronik_client()

        peer = node.add_p2p_connection(P2PDataStore())

        # Not a valid hash or height
        assert_equal(
            chronik.block_txs("1234f").err(400).msg, "400: Not a hash or height: 1234f"
        )
        assert_equal(
            chronik.block_txs("00" * 31).err(400).msg,
            f'400: Not a hash or height: {"00" * 31}',
        )
        assert_equal(
            chronik.block_txs("01").err(400).msg, "400: Not a hash or height: 01"
        )
        assert_equal(
            chronik.block_txs("12345678901").err(400).msg,
            "400: Not a hash or height: 12345678901",
        )

        assert_equal(
            chronik.block_txs("00" * 32, page=0, page_size=201).err(400).msg,
            "400: Requested block tx page size 201 is too big, maximum is 200",
        )
        assert_equal(
            chronik.block_txs("00" * 32, page=0, page_size=0).err(400).msg,
            "400: Requested block tx page size 0 is too small, minimum is 1",
        )
        assert_equal(
            chronik.block_txs("00" * 32, page=0, page_size=2**32).err(400).msg,
            "400: Invalid param page_size: 4294967296, "
            + "number too large to fit in target type",
        )
        assert_equal(
            chronik.block_txs("00" * 32, page=2**32, page_size=1).err(400).msg,
            "400: Invalid param page: 4294967296, "
            + "number too large to fit in target type",
        )

        from test_framework.chronik.client import pb

        assert_equal(
            chronik.block_txs(GENESIS_BLOCK_HASH, page=2**32 - 1, page_size=200).ok(),
            pb.TxHistoryPage(txs=[], num_pages=1, num_txs=1),
        )

        from test_framework.chronik.test_data import genesis_cb_tx

        assert_equal(
            chronik.block_txs(GENESIS_BLOCK_HASH).ok(),
            pb.TxHistoryPage(
                txs=[genesis_cb_tx()],
                num_pages=1,
                num_txs=1,
            ),
        )

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        tip = self.generatetoaddress(
            node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE
        )[-1]

        coinvalue = 5000000000
        tx1 = CTransaction()
        tx1.vin = [
            CTxIn(outpoint=COutPoint(int(cointx, 16), 0), scriptSig=SCRIPTSIG_OP_TRUE)
        ]
        tx1.vout = [
            CTxOut(coinvalue - 10000, P2SH_OP_TRUE),
            CTxOut(1000, CScript([OP_RETURN, b"test"])),
        ]

        tx2 = CTransaction()
        tx2.vin = [
            CTxIn(outpoint=COutPoint(int(tx1.hash, 16), 0), scriptSig=SCRIPTSIG_OP_TRUE)
        ]
        tx2.vout = [
            CTxOut(3000, CScript([OP_RETURN, b"test"])),
            CTxOut(coinvalue - 20000, P2SH_OP_TRUE),
        ]

        tx_coinbase = create_coinbase(102, b"\x03" * 33)

        block = create_block(int(tip, 16), tx_coinbase, 1300000500, txlist=[tx1, tx2])
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()

        block_metadata = pb.BlockMetadata(
            height=102,
            hash=bytes.fromhex(block.hash)[::-1],
            timestamp=1300000500,
        )

        proto_coinbase_tx = pb.Tx(
            txid=bytes.fromhex(tx_coinbase.hash)[::-1],
            version=1,
            inputs=[
                pb.TxInput(
                    prev_out=pb.OutPoint(txid=bytes(32), out_idx=0xFFFFFFFF),
                    input_script=bytes(tx_coinbase.vin[0].scriptSig),
                    sequence_no=0xFFFFFFFF,
                ),
            ],
            outputs=[
                pb.TxOutput(
                    sats=coinvalue,
                    output_script=bytes(tx_coinbase.vout[0].scriptPubKey),
                ),
                pb.TxOutput(
                    output_script=bytes(CScript([OP_RETURN])),
                ),
            ],
            lock_time=0,
            block=block_metadata,
            size=len(tx_coinbase.serialize()),
            is_coinbase=True,
        )

        proto_tx1 = pb.Tx(
            txid=bytes.fromhex(tx1.hash)[::-1],
            version=1,
            inputs=[
                pb.TxInput(
                    prev_out=pb.OutPoint(txid=bytes.fromhex(cointx)[::-1], out_idx=0),
                    input_script=bytes(SCRIPTSIG_OP_TRUE),
                    output_script=bytes(P2SH_OP_TRUE),
                    sats=coinvalue,
                    sequence_no=0,
                ),
            ],
            outputs=[
                pb.TxOutput(
                    sats=coinvalue - 10000,
                    output_script=bytes(P2SH_OP_TRUE),
                    spent_by=pb.SpentBy(
                        txid=bytes.fromhex(tx2.hash)[::-1],
                        input_idx=0,
                    ),
                ),
                pb.TxOutput(
                    sats=1000,
                    output_script=bytes(CScript([OP_RETURN, b"test"])),
                ),
            ],
            lock_time=0,
            size=len(tx1.serialize()),
            block=block_metadata,
        )

        proto_tx2 = pb.Tx(
            txid=bytes.fromhex(tx2.hash)[::-1],
            version=1,
            inputs=[
                pb.TxInput(
                    prev_out=pb.OutPoint(txid=bytes.fromhex(tx1.hash)[::-1], out_idx=0),
                    input_script=bytes(SCRIPTSIG_OP_TRUE),
                    output_script=bytes(P2SH_OP_TRUE),
                    sats=coinvalue - 10000,
                    sequence_no=0,
                ),
            ],
            outputs=[
                pb.TxOutput(
                    sats=3000,
                    output_script=bytes(CScript([OP_RETURN, b"test"])),
                ),
                pb.TxOutput(
                    sats=coinvalue - 20000,
                    output_script=bytes(P2SH_OP_TRUE),
                ),
            ],
            lock_time=0,
            size=len(tx2.serialize()),
            block=block_metadata,
        )

        sorted_tx1, sorted_tx2 = sorted(
            [proto_tx1, proto_tx2], key=lambda tx: tx.txid[::-1]
        )

        for page, tx in enumerate([proto_coinbase_tx, sorted_tx1, sorted_tx2]):
            assert_equal(
                chronik.block_txs(block.hash, page=page, page_size=1).ok(),
                pb.TxHistoryPage(
                    txs=[tx],
                    num_pages=3,
                    num_txs=3,
                ),
            )

        assert_equal(
            chronik.block_txs(block.hash).ok(),
            pb.TxHistoryPage(
                txs=[proto_coinbase_tx, sorted_tx1, sorted_tx2],
                num_pages=1,
                num_txs=3,
            ),
        )

        assert_equal(
            chronik.block_txs(block.hash, page=0, page_size=2).ok(),
            pb.TxHistoryPage(
                txs=[proto_coinbase_tx, sorted_tx1],
                num_pages=2,
                num_txs=3,
            ),
        )
        assert_equal(
            chronik.block_txs(block.hash, page=1, page_size=2).ok(),
            pb.TxHistoryPage(
                txs=[sorted_tx2],
                num_pages=2,
                num_txs=3,
            ),
        )

        node.invalidateblock(block.hash)
        chronik.block_txs(block.hash).err(404)


if __name__ == "__main__":
    ChronikBlockTxsTest().main()
