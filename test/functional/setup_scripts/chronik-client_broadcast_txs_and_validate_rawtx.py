# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client broadcastTx and broadcastTxs methods
Based on test/functional/chronik_token_broadcast_txs.py
"""

import pathmagic  # noqa
from ipc import send_ipc_message
from setup_framework import SetupFramework
from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.chronik.alp import alp_genesis, alp_opreturn, alp_send
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.util import assert_equal


class ChronikClient_Broadcast_Setup(SetupFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        # Init
        node = self.nodes[0]

        yield True

        self.log.info(
            "Step 1: Initialized regtest chain. Build some raw txs for chronik to broadcast"
        )

        # ALP txs

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        self.generatetoaddress(node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 2500000000

        alp_genesis_tx = CTransaction()
        alp_genesis_tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        alp_genesis_tx.vout = [
            alp_opreturn(
                alp_genesis(
                    mint_amounts=[1000, 2000, 3000, 4000, 5000, 6000],
                    num_batons=0,
                ),
            ),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
        ]
        alp_genesis_rawtx = alp_genesis_tx.serialize().hex()
        alp_genesis_txid = self.nodes[0].decoderawtransaction(alp_genesis_rawtx)["txid"]

        send_ipc_message({"alp_genesis_rawtx": alp_genesis_rawtx})
        send_ipc_message({"alp_genesis_txid": alp_genesis_txid})

        # An ok ALP tx to test the broadcastTxs method
        ok_tx = CTransaction()
        ok_tx.vin = [CTxIn(COutPoint(int(alp_genesis_txid, 16), 1), SCRIPTSIG_OP_TRUE)]
        ok_tx.vout = [
            alp_opreturn(alp_send(alp_genesis_txid, [1000])),
            CTxOut(546, P2SH_OP_TRUE),
        ]

        ok_rawtx = ok_tx.serialize().hex()
        ok_txid = self.nodes[0].decoderawtransaction(ok_rawtx)["txid"]

        send_ipc_message({"ok_rawtx": ok_rawtx})
        send_ipc_message({"ok_txid": ok_txid})

        # ALP burn tx
        burn_tx = CTransaction()
        burn_tx.vin = [
            CTxIn(COutPoint(int(alp_genesis_txid, 16), 2), SCRIPTSIG_OP_TRUE)
        ]
        burn_tx.vout = [
            alp_opreturn(alp_send(alp_genesis_txid, [1999])),
            CTxOut(546, P2SH_OP_TRUE),
        ]

        alp_burn_rawtx = burn_tx.serialize().hex()
        alp_burn_txid = self.nodes[0].decoderawtransaction(alp_burn_rawtx)["txid"]

        send_ipc_message({"alp_burn_rawtx": alp_burn_rawtx})
        send_ipc_message({"alp_burn_txid": alp_burn_txid})

        # ALP burn 2 tx
        burn2_tx = CTransaction()
        burn2_tx.vin = [
            CTxIn(COutPoint(int(alp_genesis_txid, 16), 3), SCRIPTSIG_OP_TRUE)
        ]
        burn2_tx.vout = [
            alp_opreturn(alp_send(alp_genesis_txid, [3001])),
            CTxOut(546, P2SH_OP_TRUE),
        ]

        alp_burn_2_rawtx = burn2_tx.serialize().hex()
        alp_burn_2_txid = self.nodes[0].decoderawtransaction(alp_burn_2_rawtx)["txid"]

        send_ipc_message({"alp_burn_2_rawtx": alp_burn_2_rawtx})
        send_ipc_message({"alp_burn_2_txid": alp_burn_2_txid})
        block_height_before_mining = node.getblockcount()
        assert_equal(node.getblockcount(), 301)
        yield True

        self.log.info("Step 2: Mine a block with these txs")
        self.generate(node, 1)
        assert_equal(node.getblockcount(), block_height_before_mining + 1)
        yield True


if __name__ == "__main__":
    ChronikClient_Broadcast_Setup().main()
