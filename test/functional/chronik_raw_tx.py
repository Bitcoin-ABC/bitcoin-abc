# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /raw-tx/:txid endpoint.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY, GENESIS_CB_TXID
from test_framework.hash import hash160
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.script import OP_EQUAL, OP_HASH160, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikRawTxTest(BitcoinTestFramework):
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

        from test_framework.chronik.client import pb

        # Verify queried genesis tx matches
        # Note: unlike getrawtransaction, this also works on the Genesis coinbase
        assert_equal(
            chronik.raw_tx(GENESIS_CB_TXID).ok(),
            pb.RawTx(
                raw_tx=bytes.fromhex(
                    "0100000001000000000000000000000000000000000000000000000000000000000000"
                    "0000ffffffff4d04ffff001d0104455468652054696d65732030332f4a616e2f323030"
                    "39204368616e63656c6c6f72206f6e206272696e6b206f66207365636f6e6420626169"
                    "6c6f757420666f722062616e6b73ffffffff0100f2052a01000000434104678afdb0fe"
                    "5548271967f1a67130b7105cd6a828e03909a67962e0ea1f61deb649f6bc3f4cef38c4"
                    "f35504e51ec112de5c384df7ba0b8d578a4c702b6bf11d5fac00000000"
                )
            ),
        )

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
        raw_tx = tx.serialize()
        txid = node.sendrawtransaction(raw_tx.hex())
        assert_equal(chronik.raw_tx(txid).ok(), pb.RawTx(raw_tx=raw_tx))

        # Mined block still works
        self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)
        assert_equal(chronik.raw_tx(txid).ok(), pb.RawTx(raw_tx=raw_tx))


if __name__ == "__main__":
    ChronikRawTxTest().main()
