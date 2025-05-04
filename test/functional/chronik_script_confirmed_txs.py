# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /script/:type/:payload/confirmed-txs endpoint.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import GENESIS_CB_PK, create_block, create_coinbase
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, iter_chunks


class ChronikScriptConfirmedTxsTest(BitcoinTestFramework):
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

        peer = node.add_p2p_connection(P2PDataStore())
        mocktime = 1300000000
        node.setmocktime(mocktime)

        assert_equal(
            chronik.script("", "").confirmed_txs().err(400).msg,
            "400: Unknown script type: ",
        )
        assert_equal(
            chronik.script("foo", "").confirmed_txs().err(400).msg,
            "400: Unknown script type: foo",
        )
        assert_equal(
            chronik.script("p2pkh", "LILALI").confirmed_txs().err(400).msg,
            "400: Invalid hex: Invalid character 'L' at position 0",
        )
        assert_equal(
            chronik.script("other", "LILALI").confirmed_txs().err(400).msg,
            "400: Invalid hex: Invalid character 'L' at position 0",
        )
        assert_equal(
            chronik.script("p2pkh", "").confirmed_txs().err(400).msg,
            "400: Invalid payload for P2PKH: Invalid length, "
            + "expected 20 bytes but got 0 bytes",
        )
        assert_equal(
            chronik.script("p2pkh", "aA").confirmed_txs().err(400).msg,
            "400: Invalid payload for P2PKH: Invalid length, "
            + "expected 20 bytes but got 1 bytes",
        )
        assert_equal(
            chronik.script("p2sh", "aaBB").confirmed_txs().err(400).msg,
            "400: Invalid payload for P2SH: Invalid length, "
            + "expected 20 bytes but got 2 bytes",
        )
        assert_equal(
            chronik.script("p2pk", "aaBBcc").confirmed_txs().err(400).msg,
            "400: Invalid payload for P2PK: Invalid length, "
            + "expected one of [33, 65] but got 3 bytes",
        )

        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK)
            .confirmed_txs(page=0, page_size=201)
            .err(400)
            .msg,
            "400: Requested page size 201 is too big, maximum is 200",
        )
        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK)
            .confirmed_txs(page=0, page_size=0)
            .err(400)
            .msg,
            "400: Requested page size 0 is too small, minimum is 1",
        )
        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK)
            .confirmed_txs(page=0, page_size=2**32)
            .err(400)
            .msg,
            "400: Invalid param page_size: 4294967296, "
            + "number too large to fit in target type",
        )
        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK)
            .confirmed_txs(page=2**32, page_size=1)
            .err(400)
            .msg,
            "400: Invalid param page: 4294967296, "
            + "number too large to fit in target type",
        )

        from test_framework.chronik.client import pb

        # Handle overflow gracefully on 32-bit
        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK)
            .confirmed_txs(page=2**32 - 1, page_size=200)
            .ok(),
            pb.TxHistoryPage(num_pages=1, num_txs=1),
        )

        genesis_db_script_history = (
            chronik.script("p2pk", GENESIS_CB_PK).confirmed_txs().ok()
        )
        from test_framework.chronik.test_data import genesis_cb_tx

        assert_equal(
            genesis_db_script_history,
            pb.TxHistoryPage(txs=[genesis_cb_tx()], num_pages=1, num_txs=1),
        )

        script_type = "p2sh"
        payload_hex = P2SH_OP_TRUE[2:-1].hex()

        # Generate 101 blocks to some address and verify pages
        blockhashes = self.generatetoaddress(node, 101, ADDRESS_ECREG_P2SH_OP_TRUE)

        def check_confirmed_txs(txs, *, page_size=25):
            pages = list(iter_chunks(txs, page_size))
            for page_num, page_txs in enumerate(pages):
                script_history = (
                    chronik.script(script_type, payload_hex)
                    .confirmed_txs(page_num, page_size)
                    .ok()
                )
                for tx_idx, entry in enumerate(page_txs):
                    script_tx = script_history.txs[tx_idx]
                    if "txid" in entry:
                        assert_equal(script_tx.txid[::-1].hex(), entry["txid"])
                    if "block" in entry:
                        block_height, block_hash = entry["block"]
                        assert_equal(
                            script_tx.block,
                            pb.BlockMetadata(
                                hash=bytes.fromhex(block_hash)[::-1],
                                height=block_height,
                                timestamp=script_tx.block.timestamp,
                            ),
                        )

        txs = [{"block": (i + 1, blockhash)} for i, blockhash in enumerate(blockhashes)]
        check_confirmed_txs(txs)
        check_confirmed_txs(txs, page_size=200)

        # Undo last block & check history
        node.invalidateblock(blockhashes[-1])
        check_confirmed_txs(txs[:-1])
        check_confirmed_txs(txs[:-1], page_size=200)

        # Create 1 block manually
        coinbase_tx = create_coinbase(101)
        coinbase_tx.vout[0].scriptPubKey = P2SH_OP_TRUE
        block = create_block(int(blockhashes[-2], 16), coinbase_tx, mocktime + 1000)
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()
        blockhashes[-1] = block.hash

        txs = [{"block": (i + 1, blockhash)} for i, blockhash in enumerate(blockhashes)]
        check_confirmed_txs(txs)
        check_confirmed_txs(txs, page_size=200)

        # Generate 900 more blocks and verify
        # Total of 1001 txs for this script (a page in the DB is 1000 entries long)
        blockhashes += self.generatetoaddress(node, 900, ADDRESS_ECREG_P2SH_OP_TRUE)
        txs = [{"block": (i + 1, blockhash)} for i, blockhash in enumerate(blockhashes)]
        page_sizes = [1, 5, 7, 25, 111, 200]
        for page_size in page_sizes:
            check_confirmed_txs(txs, page_size=page_size)

        coinvalue = 5000000000
        cointxids = []
        for coinblockhash in blockhashes[:10]:
            coinblock = node.getblock(coinblockhash)
            cointxids.append(coinblock["tx"][0])

        mempool_txids = []
        for cointxid in cointxids:
            tx = CTransaction()
            tx.nVersion = 1
            tx.vin = [
                CTxIn(
                    outpoint=COutPoint(int(cointxid, 16), 0),
                    scriptSig=SCRIPTSIG_OP_TRUE,
                )
            ]
            tx.vout = [CTxOut(coinvalue - 1000, P2SH_OP_TRUE)]
            pad_tx(tx)
            txid = node.sendrawtransaction(tx.serialize().hex())
            mempool_txids.append(txid)

        # confirmed-txs completely unaffected by mempool txs
        for page_size in page_sizes:
            check_confirmed_txs(txs, page_size=page_size)

        # Mine mempool txs, now they're in confirmed-txs
        newblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        txs.append({"block": (1002, newblockhash)})
        txs += [
            {"block": (1002, newblockhash), "txid": txid}
            for txid in sorted(mempool_txids)
        ]
        for page_size in page_sizes:
            check_confirmed_txs(txs, page_size=page_size)


if __name__ == "__main__":
    ChronikScriptConfirmedTxsTest().main()
