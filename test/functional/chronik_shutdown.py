# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test if Chronik properly shuts down.

This tests a case where, when processing large blocks with lots of ins/outs, Chronik
would lag behind. When shutting down at that moment, Chronik would continue to process
blocks which, if we're not careful, might have been freed in the node already, resulting
in a segfault.
"""

from test_framework.blocktools import GENESIS_BLOCK_HASH, create_block, create_coinbase
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut, msg_block
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_TRUE, CScript
from test_framework.test_framework import BitcoinTestFramework


class ChronikShutdown(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        mocktime = 1300000000
        node = self.nodes[0]
        node.setmocktime(mocktime)
        peer = node.add_p2p_connection(P2PDataStore())
        self.wait_until(lambda: peer.is_connected, timeout=10)

        last_block_hash = GENESIS_BLOCK_HASH
        coinbase_txs = []
        for i in range(1, 200):
            coinbase_tx = create_coinbase(i)
            coinbase_tx.vout[0].scriptPubKey = CScript([OP_TRUE])
            coinbase_tx.rehash()
            coinbase_txs.append(coinbase_tx)
            txs = []
            if i > 101:
                txid = coinbase_txs[i - 101].sha256
                fan_tx = CTransaction()
                fan_tx.vin = [CTxIn(COutPoint(txid, 0))]
                fan_tx.vout = [CTxOut(1000, CScript([OP_TRUE]))] * 8000
                fan_tx.rehash()
                txs.append(fan_tx)
                for j in range(0, 7997, 3):
                    tx = CTransaction()
                    tx.vin = [
                        CTxIn(COutPoint(fan_tx.sha256, k)) for k in range(j, j + 3)
                    ]
                    tx.vout = [CTxOut(1000, CScript([OP_TRUE]))]
                    tx.rehash()
                    txs.append(tx)
            block = create_block(
                int(last_block_hash, 16), coinbase_tx, mocktime + i, txlist=txs
            )
            block.solve()
            last_block_hash = block.hash
            peer.send_message(msg_block(block))

        self.stop_nodes()


if __name__ == "__main__":
    ChronikShutdown().main()
