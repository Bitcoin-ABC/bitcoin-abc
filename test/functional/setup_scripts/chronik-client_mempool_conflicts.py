# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library script endpoints
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
from test_framework.blocktools import create_block, create_coinbase
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal


# Modeled on chronik_mempool_conflicts.py
class ChronikClient_Mempool_Conflict_Setup(SetupFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        # Init
        node = self.nodes[0]
        peer = node.add_p2p_connection(P2PDataStore())

        yield True

        self.log.info("Step 1: New clean chain. Send subscription script to jest")
        assert_equal(node.getblockcount(), 0)
        yield True

        self.log.info("Step 2: Broadcast some txs")
        # Send some txs
        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]
        send_ipc_message({"cointx": cointx})

        block_hashes = self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000

        tx1 = CTransaction()
        tx1.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx1.vout = [
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
        ]
        tx1.rehash()
        tx1_txid = node.sendrawtransaction(tx1.serialize().hex())
        send_ipc_message({"tx1_txid": tx1_txid})

        tx2 = CTransaction()
        tx2.vin = [
            CTxIn(
                COutPoint(int(tx1.hash, 16), 1),
                SCRIPTSIG_OP_TRUE,
            )
        ]
        tx2.vout = [
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(coinvalue - 200000, P2SH_OP_TRUE),
        ]
        tx2.rehash()
        tx2_txid = node.sendrawtransaction(tx2.serialize().hex())
        send_ipc_message({"tx2_txid": tx2_txid})

        tx3 = CTransaction()
        tx3.vin = [
            CTxIn(
                COutPoint(int(tx1.hash, 16), 0),
                SCRIPTSIG_OP_TRUE,
            ),
            CTxIn(COutPoint(int(tx2.hash, 16), 0), SCRIPTSIG_OP_TRUE),
        ]
        tx3.vout = [CTxOut(546, P2SH_OP_TRUE)]
        tx3.rehash()
        tx3_txid = node.sendrawtransaction(tx3.serialize().hex())
        send_ipc_message({"tx3_txid": tx3_txid})
        assert_equal(node.getblockcount(), 101)
        yield True

        self.log.info("Step 3: Mine a conflicting block")
        block_height = 102
        conflict_tx = CTransaction()
        conflict_tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        pad_tx(conflict_tx)
        block = create_block(
            int(block_hashes[-1], 16),
            create_coinbase(block_height, b"\x03" * 33),
        )
        block.vtx += [conflict_tx]
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)
        yield True


if __name__ == "__main__":
    ChronikClient_Mempool_Conflict_Setup().main()
