# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik resolving the disconnectpool gracefully
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY, create_block, create_coinbase
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal


class ChronikMempoolDisconnectPool(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import ChronikClient, pb

        node = self.nodes[0]
        chronik = ChronikClient("127.0.0.1", node.chronik_port)

        peer = node.add_p2p_connection(P2PDataStore())

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        block_hashes = self.generatetoaddress(
            node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE
        )

        coinvalue = 5000000000

        # Create tx1, which will be mined and stay mined during reorg
        tx1 = CTransaction()
        tx1.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx1.vout = [
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
        ]
        pad_tx(tx1)
        node.sendrawtransaction(tx1.serialize().hex())

        # Mine the tx
        self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[-1]

        # Create tx2, which will stay in the mempool during reorg
        tx2 = CTransaction()
        tx2.vin = [
            CTxIn(
                COutPoint(tx1.txid_int, 1),
                SCRIPTSIG_OP_TRUE,
            )
        ]
        tx2.vout = [
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(coinvalue - 200000, P2SH_OP_TRUE),
        ]
        pad_tx(tx2)
        node.sendrawtransaction(tx2.serialize().hex())

        # Reorg only tx1. tx2 will be removed and then re-added to the mempool
        reorg_block1 = create_block(
            int(block_hashes[-1], 16),
            create_coinbase(node.getblockcount() + 1, b"\x03" * 33),
        )
        reorg_block1.vtx += [tx1]
        reorg_block1.hashMerkleRoot = reorg_block1.calc_merkle_root()
        reorg_block1.solve()

        reorg_block2 = create_block(
            reorg_block1.hash_int,
            create_coinbase(node.getblockcount() + 2, b"\x03" * 33),
        )
        reorg_block2.hashMerkleRoot = reorg_block2.calc_merkle_root()
        reorg_block2.solve()

        # Make sure Chronik handles the reorg gracefully
        peer.send_blocks_and_test([reorg_block1, reorg_block2], node)
        node.syncwithvalidationinterfacequeue()

        assert_equal(
            chronik.tx(tx1.txid_hex).ok().block.hash[::-1].hex(),
            reorg_block1.hash_hex,
        )
        assert_equal(chronik.tx(tx2.txid_hex).ok().block, pb.BlockMetadata())


if __name__ == "__main__":
    ChronikMempoolDisconnectPool().main()
