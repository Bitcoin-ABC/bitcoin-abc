# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import time

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal


class ChronikPauseTest(BitcoinTestFramework):
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

        chronik.pause().err(403)
        chronik.resume().err(403)

        self.log.info("-chronikallowpause cannot be used on mainnet")
        self.stop_node(0)
        node.assert_start_raises_init_error(
            ["-chronik", "-chronikallowpause", "-chain=main", "-regtest=0"],
            expected_msg="Error: Using -chronikallowpause on a mainnet chain is not "
            "allowed for security reasons.",
        )

        self.log.info("Restart to allow pause")
        self.start_node(0, ["-chronik", "-chronikallowpause"])
        node.setmocktime(1300000000)

        peer = node.add_p2p_connection(P2PDataStore())

        self.log.info("Generate coin + mature for testing")
        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]
        coinvalue = 5000000000
        tip = self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)[-1]

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx.vout = [CTxOut(coinvalue - 10_000, P2SH_OP_TRUE)]
        pad_tx(tx)

        self.log.info("Pause Chronik indexing")
        chronik.pause().ok()
        chronik.pause().ok()  # Noop, allowed
        self.log.info("Send using P2P network")
        # sendrawtransaction calls SyncWithValidationInterfaceQueue, which would
        # block forever, using send_txs_and_test avoids this.
        peer.send_txs_and_test([tx], node)

        self.log.info("Tx not yet picked up by chronik")
        time.sleep(0.1)
        chronik.tx(tx.hash).err(404)

        self.log.info("Resume indexing and sync Chronik")
        chronik.resume().ok()
        chronik.resume().ok()  # Noop, allowed
        node.syncwithvalidationinterfacequeue()

        self.log.info("Chronik has now indexed the tx")
        chronik.tx(tx.hash).ok()

        self.log.info("Pause Chronik indexing for block processing")
        chronik.pause().ok()

        self.log.info("Create block with conflicting tx")
        conflict_tx = CTransaction(tx)
        conflict_tx.nVersion = 2
        conflict_tx.rehash()
        blockA = create_block(
            int(tip, 16), create_coinbase(102, b"\x03" * 33), 1300000500
        )
        blockA.vtx += [conflict_tx]
        make_conform_to_ctor(blockA)
        blockA.hashMerkleRoot = blockA.calc_merkle_root()
        blockA.solve()
        peer.send_blocks_and_test([blockA], node, timeout=5)

        self.log.info("Block not indexed yet")
        time.sleep(0.1)
        chronik.block(blockA.hash).err(404)

        self.log.info("Chronik still believes the old tx exists")
        chronik.tx(tx.hash).ok()
        chronik.tx(conflict_tx.hash).err(404)

        self.log.info("Resume indexing and sync Chronik")
        chronik.resume().ok()
        node.syncwithvalidationinterfacequeue()

        self.log.info("Block now indexed and tx conflict resolved")
        chronik.block(blockA.hash).ok()
        chronik.tx(tx.hash).err(404)
        chronik.tx(conflict_tx.hash).ok()

        self.log.info("Pause Chronik for reorg")
        chronik.pause().ok()

        self.log.info("Reorg last block by mining two blocks")
        blockB1 = create_block(
            int(tip, 16), create_coinbase(102, b"\x03" * 33), 1300000500
        )
        blockB1.solve()

        blockB2 = create_block(
            blockB1.sha256, create_coinbase(103, b"\x03" * 33), 1300000500
        )
        blockB2.solve()

        peer.send_blocks_and_test([blockB1, blockB2], node)

        self.log.info("Reorg returns tx to mempool")
        assert (
            conflict_tx.hash in node.getrawmempool()
        ), f"{conflict_tx.hash} not found in mempool"

        self.log.info("Chronik still thinks blockA exists")
        time.sleep(0.1)
        chronik.block(blockA.hash).ok()
        chronik.block(blockB1.hash).err(404)
        chronik.block(blockB2.hash).err(404)

        self.log.info("Add block that mines the tx")
        blockB3 = create_block(
            blockB2.sha256, create_coinbase(104, b"\x03" * 33), 1300000500
        )
        blockB3.vtx += [conflict_tx]
        make_conform_to_ctor(blockB3)
        blockB3.hashMerkleRoot = blockB3.calc_merkle_root()
        blockB3.solve()
        peer.send_blocks_and_test([blockB3], node)

        self.log.info("Resume indexing and sync Chronik")
        chronik.resume().ok()
        node.syncwithvalidationinterfacequeue()

        # Check if spent coins are indexed correctly
        tx_proto = chronik.tx(conflict_tx.hash).ok()
        assert_equal(tx_proto.inputs[0].output_script, bytes(P2SH_OP_TRUE))
        assert_equal(tx_proto.inputs[0].value, coinvalue)


if __name__ == "__main__":
    ChronikPauseTest().main()
