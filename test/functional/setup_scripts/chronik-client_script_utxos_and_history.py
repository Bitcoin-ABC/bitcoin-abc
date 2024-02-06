#!/usr/bin/env python3
# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library script endpoints
"""

import pathmagic  # noqa
from ipc import send_ipc_message
from setup_framework import SetupFramework
from test_framework.avatools import AvaP2PInterface, can_find_inv_in_poll
from test_framework.messages import CTransaction, CTxOut, FromHex, ToHex
from test_framework.script import OP_CHECKSIG, CScript
from test_framework.util import assert_equal

QUORUM_NODE_COUNT = 16


class ChronikClient_Block_Setup(SetupFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-chronik",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-persistavapeers=0",
                "-acceptnonstdtxn=1",
            ]
        ]
        self.ipc_timeout = 10

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()
        self.skip_if_no_wallet()

    def send_chronik_info(self):
        send_ipc_message({"chronik": f"http://127.0.0.1:{self.nodes[0].chronik_port}"})

    def run_test(self):
        # Init
        node = self.nodes[0]

        self.send_chronik_info()

        # p2pkh
        # IFP address p2pkh
        # Note: we use this instead of node.getnewaddress() so we don't get change
        # to our p2pkh address from p2sh txs, causing chronik to give hard-to-predict
        # results (txs with mixed script outputs will come up in each)
        p2pkh_address = "ecregtest:qrfhcnyqnl5cgrnmlfmms675w93ld7mvvqjh9pgptw"
        p2pkh_output_script = bytes.fromhex(
            "76a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6088ac"
        )
        send_ipc_message({"p2pkh_address": p2pkh_address})

        # p2sh
        # use IFP address p2sh
        p2sh_address = "ecregtest:prfhcnyqnl5cgrnmlfmms675w93ld7mvvq9jcw0zsn"
        p2sh_output_script = bytes.fromhex(
            "a914d37c4c809fe9840e7bfa77b86bd47163f6fb6c6087"
        )
        send_ipc_message({"p2sh_address": p2sh_address})

        # p2pk
        # See coinbase tx of coinbase tx output from https://explorer.e.cash/block/00000000000000002328cef155f92bf149cfbe365eecf4e428f2c11f25fcce56
        pubkey = bytes.fromhex(
            "047fa64f6874fb7213776b24c40bc915451b57ef7f17ad7b982561f99f7cdc7010d141b856a092ee169c5405323895e1962c6b0d7c101120d360164c9e4b3997bd"
        )
        send_ipc_message({"p2pk_script": pubkey.hex()})
        p2pk_script_for_tx_building = CScript([pubkey, OP_CHECKSIG])

        # other
        # Use hex deadbeef
        other_script = "deadbeef"
        send_ipc_message({"other_script": other_script})
        other_script_for_tx_building = bytes.fromhex(other_script)
        yield True

        self.log.info("Step 1: Broadcast txs to a p2pk, p2pkh, and p2sh address")
        # Set the number of txs you wish to broadcast
        # Tested up to 100, takes 25s
        # 200 goes over regtest 60s timeout
        # Must be <= 200 since the JS tests match items on first page and
        # this is chronik's max per-page count
        # 25 takes about 10s. Default page size for chronik.
        txs_broadcast = 25
        send_ipc_message({"txs_broadcast": txs_broadcast})

        # p2pkh
        p2pkh_txids = []
        for x in range(txs_broadcast):
            p2pkh_txid = node.sendtoaddress(p2pkh_address, (x + 1) * 1000)
            p2pkh_txids.append(p2pkh_txid)
        send_ipc_message({"p2pkh_txids": p2pkh_txids})

        # p2sh
        p2sh_txids = []
        for x in range(txs_broadcast):
            p2sh_txid = node.sendtoaddress(p2sh_address, (x + 1) * 1000)
            p2sh_txids.append(p2sh_txid)
        send_ipc_message({"p2sh_txids": p2sh_txids})

        # p2pk
        p2pk_txids = []
        for x in range(txs_broadcast):
            tx = CTransaction()
            tx.vout.append(CTxOut((x + 1) * 1000, p2pk_script_for_tx_building))
            rawtx = node.fundrawtransaction(
                ToHex(tx),
            )["hex"]
            FromHex(tx, rawtx)
            rawtx = node.signrawtransactionwithwallet(ToHex(tx))["hex"]
            p2pk_txid = node.sendrawtransaction(rawtx)
            p2pk_txids.append(p2pk_txid)
        send_ipc_message({"p2pk_txids": p2pk_txids})

        # other
        other_txids = []
        for x in range(txs_broadcast):
            tx = CTransaction()
            tx.vout.append(CTxOut((x + 1) * 1000, other_script_for_tx_building))
            rawtx = node.fundrawtransaction(
                ToHex(tx),
            )["hex"]
            FromHex(tx, rawtx)
            rawtx = node.signrawtransactionwithwallet(ToHex(tx))["hex"]
            other_txid = node.sendrawtransaction(rawtx)
            other_txids.append(other_txid)
        send_ipc_message({"other_txids": other_txids})
        assert_equal(node.getblockcount(), 200)
        yield True

        self.log.info("Step 2: Mine a block with these txs")
        self.generate(node, 1)
        assert_equal(node.getblockcount(), 201)
        yield True

        self.log.info("Step 3: Avalanche finalize a block with these txs")

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                node.add_p2p_connection(AvaP2PInterface(self, node))
                for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()

        def is_quorum_established():
            return node.getavalancheinfo()["ready_to_poll"] is True

        self.wait_until(is_quorum_established)

        blockhash = self.generate(node, 1, sync_fun=self.no_op)[0]
        cb_txid = node.getblock(blockhash)["tx"][0]
        assert not node.isfinalblock(blockhash)
        assert not node.isfinaltransaction(cb_txid, blockhash)

        def is_finalblock(blockhash):
            can_find_inv_in_poll(quorum, int(blockhash, 16))
            return node.isfinalblock(blockhash)

        with node.assert_debug_log([f"Avalanche finalized block {blockhash}"]):
            self.wait_until(lambda: is_finalblock(blockhash))
        assert node.isfinaltransaction(cb_txid, blockhash)
        yield True

        self.log.info("Step 4: Broadcast a tx with mixed outputs")
        mixed_output_tx = CTransaction()
        mixed_output_tx.vout.append(CTxOut(1000000, p2pkh_output_script))
        mixed_output_tx.vout.append(CTxOut(1000000, p2sh_output_script))
        mixed_output_tx.vout.append(CTxOut(1000000, p2pk_script_for_tx_building))
        mixed_output_tx.vout.append(CTxOut(1000000, other_script_for_tx_building))
        mixed_output_rawtx = node.fundrawtransaction(
            ToHex(mixed_output_tx),
        )["hex"]
        FromHex(mixed_output_tx, mixed_output_rawtx)
        mixed_output_rawtx = node.signrawtransactionwithwallet(ToHex(mixed_output_tx))[
            "hex"
        ]
        mixed_output_txid = node.sendrawtransaction(mixed_output_rawtx)
        send_ipc_message({"mixed_output_txid": mixed_output_txid})
        yield True


if __name__ == "__main__":
    ChronikClient_Block_Setup().main()
