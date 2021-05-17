# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test whether txs are removed in the right order when disconnecting blocks.

When disconnecting a block, the node first removes all txs from the mempool and
then adds them back in.

Chronik depends on the removal to happen in reverse-topological order (i.e.
children first), and the insertion to happen in topological order (i.e. parents
first).

Otherwise, it might remove UTXOs from the index before they're added, crashing
Chronik.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal


class ChronikTxRemovalOrder(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]

        mocktime = 1300000000
        node.setmocktime(mocktime)

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        self.generate(node, COINBASE_MATURITY)

        coinvalue = 5000000000

        # Add chain of 10 txs all dependent on each other to the mempool
        next_value = coinvalue
        next_txid = cointx
        for _ in range(10):
            next_value -= 1000
            tx = CTransaction()
            tx.vin = [
                CTxIn(
                    outpoint=COutPoint(int(next_txid, 16), 0),
                    scriptSig=SCRIPTSIG_OP_TRUE,
                )
            ]
            tx.vout = [CTxOut(next_value, P2SH_OP_TRUE)]
            pad_tx(tx)
            next_txid = node.sendrawtransaction(tx.serialize().hex())

        # Mine those txs
        self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)

        # Add a chain of 10 txs dependent on the mined txs
        for _ in range(10):
            next_value -= 1000
            tx = CTransaction()
            tx.vin = [
                CTxIn(
                    outpoint=COutPoint(int(next_txid, 16), 0),
                    scriptSig=SCRIPTSIG_OP_TRUE,
                )
            ]
            tx.vout = [CTxOut(next_value, P2SH_OP_TRUE)]
            pad_tx(tx)
            next_txid = node.sendrawtransaction(tx.serialize().hex())

        assert_equal(len(node.getrawmempool()), 10)

        # If we park the block now, it should correctly move all txs back to the
        # mempool. Note: This first removes all 10 tx from the mempool and then
        # adds in the 20.
        node.parkblock(node.getbestblockhash())
        assert_equal(len(node.getrawmempool()), 20)


if __name__ == "__main__":
    ChronikTxRemovalOrder().main()
