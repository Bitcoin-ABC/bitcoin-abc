# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Exercise the chronik-client js library unconfirmedTxs() function
"""

import time

import pathmagic  # noqa
from ipc import send_ipc_message
from setup_framework import SetupFramework
from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import create_block, create_coinbase
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_RETURN, CScript
from test_framework.util import assert_equal


class ChronikClient_UnconfirmedTxs_Setup(SetupFramework):
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

        mocktime = int(time.time())
        node.setmocktime(mocktime)

        self.log.info("Step 1: New clean chain, no txs in mempool")
        assert_equal(node.getblockcount(), 0)
        assert_equal(node.getrawmempool(), [])
        yield True

        self.log.info("Step 2: Generate 110 blocks and create 10 mempool txs")
        # Generate 110 blocks to some address
        blockhashes = self.generatetoaddress(node, 110, ADDRESS_ECREG_P2SH_OP_TRUE)

        coinvalue = 5000000000
        cointxids = []
        for coinblockhash in blockhashes[:10]:
            coinblock = node.getblock(coinblockhash)
            cointxids.append(coinblock["tx"][0])

        mempool_txs = []
        mempool_txids = []
        mempool_time_first_seen = []
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
            mempool_txids.append(txid)
            mempool_time_first_seen.append(time_first_seen)

        send_ipc_message({"mempool_txids": mempool_txids})
        send_ipc_message({"mempool_time_first_seen": mempool_time_first_seen})
        assert_equal(len(node.getrawmempool()), 10)
        yield True

        self.log.info(
            "Step 3: Mine 5 transactions, with 2 conflicts, leave 5 others unconfirmed"
        )
        # Mine 5 transactions, with 2 conflicts, leave 5 others unconfirmed
        mine_txs = mempool_txs[:3]
        # Create conflict txs for txids 3 and 4 (spend same inputs but with nLockTime = 2)
        for conflict_tx in mempool_txs[3:5]:
            conflict_tx.nLockTime = 2
            mine_txs.append(conflict_tx)

        height = 111
        coinbase_tx = create_coinbase(height)
        coinbase_tx.vout[0].scriptPubKey = P2SH_OP_TRUE
        block = create_block(
            int(blockhashes[-1], 16), coinbase_tx, mocktime + 1100, txlist=mine_txs
        )
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()

        # Only unconfirmed txs remain (txids 5-9), conflict txs are removed
        remaining_txids = mempool_txids[5:]
        remaining_time_first_seen = mempool_time_first_seen[5:]
        send_ipc_message({"remaining_txids": remaining_txids})
        send_ipc_message({"remaining_time_first_seen": remaining_time_first_seen})
        assert_equal(len(node.getrawmempool()), 5)
        yield True


if __name__ == "__main__":
    ChronikClient_UnconfirmedTxs_Setup().main()
