#!/usr/bin/env python3
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
This test checks activation of larger op_return
"""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import satoshi_round, assert_equal, assert_raises_rpc_error
from test_framework.blocktools import *
from test_framework.script import *

# far into the future
MONOLITH_START_TIME = 2000000000


class OpReturnActivationTest(BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [['-whitelist=127.0.0.1',
                            '-acceptnonstdtxn=0',
                            "-monolithactivationtime=%d" % MONOLITH_START_TIME,
                            "-replayprotectionactivationtime=%d" % (2 * MONOLITH_START_TIME)]]

    def create_null_data_tx(self, data_size):
        node = self.nodes[0]
        utxos = node.listunspent()
        assert(len(utxos) > 0)
        utxo = utxos[0]
        tx = CTransaction()
        value = int(satoshi_round(utxo["amount"] - self.relayfee) * COIN)
        tx.vin = [CTxIn(COutPoint(int(utxo["txid"], 16), utxo["vout"]))]
        script = CScript([OP_RETURN, b'x' * data_size])
        tx.vout = [CTxOut(value, script)]
        tx_signed = node.signrawtransaction(ToHex(tx))["hex"]
        return tx_signed

    def run_test(self):
        node = self.nodes[0]
        self.relayfee = self.nodes[0].getnetworkinfo()["relayfee"]

        # First, we generate some coins to spend.
        node.generate(125)

        # Check that large opreturn are not accepted yet.
        self.log.info("Running null-data test, before large data activation")

        # 80 bytes opreturn are ok.
        tx = self.create_null_data_tx(80)
        txid = node.sendrawtransaction(tx)
        assert(txid in set(node.getrawmempool()))

        # 81 bytes opreturn is non standard
        tx = self.create_null_data_tx(81)
        assert_raises_rpc_error(-26, 'scriptpubkey',
                                node.sendrawtransaction, tx)

        # Push MTP forward just before activation.
        self.log.info("Pushing MTP just before the activation")
        node.setmocktime(MONOLITH_START_TIME)

        def next_block(block_time):
            # get block height
            blockchaininfo = node.getblockchaininfo()
            height = int(blockchaininfo['blocks'])

            # create the block
            coinbase = create_coinbase(height)
            coinbase.rehash()
            block = create_block(
                int(node.getbestblockhash(), 16), coinbase, block_time)

            # Do PoW, which is cheap on regnet
            block.solve()
            node.submitblock(ToHex(block))

        for i in range(6):
            next_block(MONOLITH_START_TIME + i - 1)

        # Check we are just before the activation time
        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     MONOLITH_START_TIME - 1)

        # Check that large opreturn are not accepted yet.
        self.log.info("Re-running null-data test just before activation")

        # 80 bytes opreturn are ok.
        tx = self.create_null_data_tx(80)
        txid = node.sendrawtransaction(tx)
        assert(txid in set(node.getrawmempool()))

        # 81 bytes opreturn is non standard
        tx = self.create_null_data_tx(81)
        assert_raises_rpc_error(-26, 'scriptpubkey',
                                node.sendrawtransaction, tx)

        # Activate larger opreturn.
        self.log.info("Running null-data test, after large data activation")
        next_block(MONOLITH_START_TIME + 6)

        assert_equal(node.getblockheader(node.getbestblockhash())['mediantime'],
                     MONOLITH_START_TIME)

        # 81 bytes is now accepted.
        tx = self.create_null_data_tx(81)
        txid = node.sendrawtransaction(tx)
        assert(txid in set(node.getrawmempool()))

        # 220 bytes are now accepted.
        tx = self.create_null_data_tx(220)
        txid = node.sendrawtransaction(tx)
        assert(txid in set(node.getrawmempool()))

        # 221 bytes are rejected.
        tx = self.create_null_data_tx(221)
        assert_raises_rpc_error(-26, 'scriptpubkey',
                                node.sendrawtransaction, tx)

        # Because these transaction are valid regardless, there is
        # no point checking for reorg. Worst case scenario if a reorg
        # happens, we have a fe transaction in the mempool that won't
        # propagate to node that aren't aware of them already.


if __name__ == '__main__':
    OpReturnActivationTest().main()
