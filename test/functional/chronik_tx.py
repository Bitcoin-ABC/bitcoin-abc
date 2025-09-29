# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /tx endpoint.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import (
    COINBASE_MATURITY,
    GENESIS_CB_TXID,
    create_block,
    create_coinbase,
)
from test_framework.hash import hash160
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_EQUAL, OP_HASH160, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikTxTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        peer = node.add_p2p_connection(P2PDataStore())
        node.setmocktime(1333333337)

        assert_equal(chronik.tx("0").err(400).msg, "400: Not a txid: 0")
        assert_equal(chronik.tx("123").err(400).msg, "400: Not a txid: 123")
        assert_equal(chronik.tx("1234f").err(400).msg, "400: Not a txid: 1234f")
        assert_equal(
            chronik.tx("00" * 31).err(400).msg, f'400: Not a txid: {"00" * 31}'
        )
        assert_equal(chronik.tx("01").err(400).msg, "400: Not a txid: 01")
        assert_equal(
            chronik.tx("12345678901").err(400).msg, "400: Not a txid: 12345678901"
        )

        assert_equal(
            chronik.tx("00" * 32).err(404).msg,
            f'404: Transaction {"00" * 32} not found in the index',
        )

        from test_framework.chronik.test_data import genesis_cb_tx

        # Verify queried genesis tx matches
        assert_equal(chronik.tx(GENESIS_CB_TXID).ok(), genesis_cb_tx())

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        self.generatetoaddress(node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000
        send_values = [coinvalue - 10000, 1000, 2000, 3000]
        send_redeem_scripts = [bytes([i + 0x52]) for i in range(len(send_values))]
        send_scripts = [
            CScript([OP_HASH160, hash160(redeem_script), OP_EQUAL])
            for redeem_script in send_redeem_scripts
        ]
        tx = CTransaction()
        tx.nVersion = 2
        tx.vin = [
            CTxIn(
                outpoint=COutPoint(int(cointx, 16), 0),
                scriptSig=SCRIPTSIG_OP_TRUE,
                nSequence=0xFFFFFFFE,
            )
        ]
        tx.vout = [
            CTxOut(value, script) for (value, script) in zip(send_values, send_scripts)
        ]
        tx.nLockTime = 1234567890

        # Submit tx to mempool
        txid = node.sendrawtransaction(tx.serialize().hex())

        from test_framework.chronik.client import pb

        proto_tx = pb.Tx(
            txid=bytes.fromhex(txid)[::-1],
            version=tx.nVersion,
            inputs=[
                pb.TxInput(
                    prev_out=pb.OutPoint(txid=bytes.fromhex(cointx)[::-1], out_idx=0),
                    input_script=bytes(tx.vin[0].scriptSig),
                    output_script=bytes(P2SH_OP_TRUE),
                    sats=coinvalue,
                    sequence_no=0xFFFFFFFE,
                )
            ],
            outputs=[
                pb.TxOutput(
                    sats=value,
                    output_script=bytes(script),
                )
                for value, script in zip(send_values, send_scripts)
            ],
            lock_time=1234567890,
            block=None,
            time_first_seen=1333333337,
            size=len(tx.serialize()),
            is_coinbase=False,
        )

        assert_equal(chronik.tx(txid).ok(), proto_tx)

        # If we mine the block, querying will gives us all the tx details + block
        txblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]

        # Set the `block` field, now that we mined it
        proto_tx.block.CopyFrom(
            pb.BlockMetadata(
                hash=bytes.fromhex(txblockhash)[::-1],
                height=102,
                timestamp=1333333355,
            )
        )
        assert_equal(chronik.tx(txid).ok(), proto_tx)

        node.setmocktime(1333333338)
        tx2 = CTransaction()
        tx2.nVersion = 2
        tx2.vin = [
            CTxIn(
                outpoint=COutPoint(int(txid, 16), i),
                scriptSig=CScript([redeem_script]),
                nSequence=0xFFFFFFF0 + i,
            )
            for i, redeem_script in enumerate(send_redeem_scripts)
        ]
        tx2.vout = [CTxOut(coinvalue - 20000, send_scripts[0])]
        tx2.nLockTime = 12

        # Submit tx to mempool
        txid2 = node.sendrawtransaction(tx2.serialize().hex())

        proto_tx2 = pb.Tx(
            txid=bytes.fromhex(txid2)[::-1],
            version=tx2.nVersion,
            inputs=[
                pb.TxInput(
                    prev_out=pb.OutPoint(txid=bytes.fromhex(txid)[::-1], out_idx=i),
                    input_script=bytes(tx2.vin[i].scriptSig),
                    output_script=bytes(script),
                    sats=value,
                    sequence_no=0xFFFFFFF0 + i,
                )
                for i, (value, script) in enumerate(zip(send_values, send_scripts))
            ],
            outputs=[
                pb.TxOutput(
                    sats=tx2.vout[0].nValue,
                    output_script=bytes(tx2.vout[0].scriptPubKey),
                )
            ],
            lock_time=12,
            block=None,
            time_first_seen=1333333338,
            size=len(tx2.serialize()),
            is_coinbase=False,
        )

        assert_equal(chronik.tx(txid2).ok(), proto_tx2)

        # Mine tx
        tx2blockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        # Invalidate block
        node.invalidateblock(tx2blockhash)

        # Tx back in mempool
        assert_equal(chronik.tx(txid2).ok(), proto_tx2)

        # Mine conflicting tx
        conflict_tx = CTransaction(tx2)
        conflict_tx.nLockTime = 13
        block = create_block(
            int(txblockhash, 16),
            create_coinbase(103, b"\x03" * 33),
            1333333500,
            txlist=[conflict_tx],
        )
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()

        assert_equal(
            chronik.tx(txid2).err(404).msg,
            f"404: Transaction {txid2} not found in the index",
        )
        proto_tx2.txid = bytes.fromhex(conflict_tx.txid_hex)[::-1]
        proto_tx2.lock_time = 13
        proto_tx2.time_first_seen = 0
        proto_tx2.block.CopyFrom(
            pb.BlockMetadata(
                hash=bytes.fromhex(block.hash)[::-1],
                height=103,
                timestamp=1333333500,
            )
        )

        assert_equal(chronik.tx(conflict_tx.txid_hex).ok(), proto_tx2)


if __name__ == "__main__":
    ChronikTxTest().main()
