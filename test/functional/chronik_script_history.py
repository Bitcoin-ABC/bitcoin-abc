# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /script/:type/:payload/history endpoint.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import GENESIS_CB_PK, create_block, create_coinbase
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, iter_chunks


class ChronikScriptHistoryTest(BitcoinTestFramework):
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
            chronik.script("", "").history().err(400).msg, "400: Unknown script type: "
        )
        assert_equal(
            chronik.script("foo", "").history().err(400).msg,
            "400: Unknown script type: foo",
        )
        assert_equal(
            chronik.script("p2pkh", "LILALI").history().err(400).msg,
            "400: Invalid hex: Invalid character 'L' at position 0",
        )
        assert_equal(
            chronik.script("other", "LILALI").history().err(400).msg,
            "400: Invalid hex: Invalid character 'L' at position 0",
        )
        assert_equal(
            chronik.script("p2pkh", "").history().err(400).msg,
            "400: Invalid payload for P2PKH: Invalid length, "
            + "expected 20 bytes but got 0 bytes",
        )
        assert_equal(
            chronik.script("p2pkh", "aA").history().err(400).msg,
            "400: Invalid payload for P2PKH: Invalid length, "
            + "expected 20 bytes but got 1 bytes",
        )
        assert_equal(
            chronik.script("p2sh", "aaBB").history().err(400).msg,
            "400: Invalid payload for P2SH: Invalid length, "
            + "expected 20 bytes but got 2 bytes",
        )
        assert_equal(
            chronik.script("p2pk", "aaBBcc").history().err(400).msg,
            "400: Invalid payload for P2PK: Invalid length, "
            + "expected one of [33, 65] but got 3 bytes",
        )

        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK)
            .history(page=0, page_size=201)
            .err(400)
            .msg,
            "400: Requested page size 201 is too big, maximum is 200",
        )
        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK)
            .history(page=0, page_size=0)
            .err(400)
            .msg,
            "400: Requested page size 0 is too small, minimum is 1",
        )
        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK)
            .history(page=0, page_size=2**32)
            .err(400)
            .msg,
            "400: Invalid param page_size: 4294967296, "
            + "number too large to fit in target type",
        )
        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK)
            .history(page=2**32, page_size=1)
            .err(400)
            .msg,
            "400: Invalid param page: 4294967296, "
            + "number too large to fit in target type",
        )

        from test_framework.chronik.client import pb

        # Handle overflow gracefully on 32-bit
        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK)
            .history(page=2**32 - 1, page_size=200)
            .ok(),
            pb.TxHistoryPage(num_pages=1, num_txs=1),
        )

        genesis_db_script_history = chronik.script("p2pk", GENESIS_CB_PK).history().ok()
        from test_framework.chronik.test_data import genesis_cb_tx

        assert_equal(
            genesis_db_script_history,
            pb.TxHistoryPage(txs=[genesis_cb_tx()], num_pages=1, num_txs=1),
        )

        script_type = "p2sh"
        payload_hex = P2SH_OP_TRUE[2:-1].hex()

        def check_tx_history(mempooltxs, blocktxs, *, page_size=25):
            pages = list(iter_chunks(mempooltxs + blocktxs, page_size))
            for page_num, page_txs in enumerate(pages):
                script_history = (
                    chronik.script(script_type, payload_hex)
                    .history(page=page_num, page_size=page_size)
                    .ok()
                )
                assert_equal(script_history.num_pages, len(pages))
                assert_equal(script_history.num_txs, len(mempooltxs) + len(blocktxs))
                for tx_idx, entry in enumerate(page_txs):
                    script_tx = script_history.txs[tx_idx]
                    if "txid" in entry:
                        assert_equal(script_tx.txid[::-1].hex(), entry["txid"])
                    if "time_first_seen" in entry:
                        assert_equal(
                            script_tx.time_first_seen, entry["time_first_seen"]
                        )
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

        # Generate 101 blocks to some address and verify pages
        blockhashes = self.generatetoaddress(node, 101, ADDRESS_ECREG_P2SH_OP_TRUE)
        blocktxs = [{"block": (i, blockhashes[i - 1])} for i in range(101, 0, -1)]
        check_tx_history([], blocktxs)
        check_tx_history([], blocktxs, page_size=200)

        # Undo last block & check history
        node.invalidateblock(blockhashes[-1])
        check_tx_history([], blocktxs[1:])
        check_tx_history([], blocktxs[1:], page_size=200)

        # Create 1 block manually (with out-of-order block time)
        coinbase_tx = create_coinbase(101)
        coinbase_tx.vout[0].scriptPubKey = P2SH_OP_TRUE
        block = create_block(int(blockhashes[-2], 16), coinbase_tx, mocktime + 1000)
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()
        blockhashes[-1] = block.hash_hex

        # Blocks still ordered by block height
        blocktxs = [{"block": (i, blockhashes[i - 1])} for i in range(101, 0, -1)]
        check_tx_history([], blocktxs)
        check_tx_history([], blocktxs, page_size=200)

        # Generate 900 more blocks and verify
        # Total of 1001 txs for this script (a page in the DB is 1000 entries long)
        blockhashes += self.generatetoaddress(node, 900, ADDRESS_ECREG_P2SH_OP_TRUE)
        blocktxs = [{"block": (i, blockhashes[i - 1])} for i in range(1001, 0, -1)]
        check_tx_history([], blocktxs, page_size=200)

        coinvalue = 5000000000
        cointxids = []
        for coinblockhash in blockhashes[:100]:
            coinblock = node.getblock(coinblockhash)
            cointxids.append(coinblock["tx"][0])

        op_return_script = CScript([OP_RETURN, b"hello"])
        mempool_txs = []
        mempool_txids = []
        # Send 10 mempool txs, each with their own mocktime
        mocktime_offsets = [0, 10, 10, 5, 0, 0, 12, 12, 10, 5]
        for mocktime_offset in mocktime_offsets:
            cointxid = cointxids.pop(0)
            tx = CTransaction()
            tx.nVersion = 1
            tx.vin = [
                CTxIn(
                    outpoint=COutPoint(int(cointxid, 16), 0),
                    scriptSig=SCRIPTSIG_OP_TRUE,
                )
            ]
            tx.vout = [
                CTxOut(coinvalue - 1000, P2SH_OP_TRUE),
                CTxOut(0, op_return_script),
            ]
            pad_tx(tx)
            mempool_txs.append(tx)
            node.setmocktime(mocktime + mocktime_offset)
            txid = node.sendrawtransaction(tx.serialize().hex())
            mempool_txids.append(txid)

        assert_equal(
            chronik.script("other", op_return_script.hex()).history().ok(),
            pb.TxHistoryPage(),
        )

        def tx_sort_key(entry):
            time_first_seen = entry["time_first_seen"]
            txid = entry["txid"]
            if time_first_seen == 0:
                time_first_seen = 1 << 64
            if entry.get("is_coinbase", False):
                txid = ""
            return (time_first_seen, txid)

        mempooltxs = sorted(
            [
                {"time_first_seen": mocktime + offset, "txid": txid}
                for (offset, txid) in zip(mocktime_offsets, mempool_txids)
            ],
            key=tx_sort_key,
            reverse=True,
        )
        page_sizes = [1, 5, 7, 25, 111, 200]
        for page_size in page_sizes:
            check_tx_history(mempooltxs, blocktxs, page_size=page_size)

        # Mine block with 5 conflicting txs
        mine_txs = mempool_txs[5:]
        newblocktxs = [
            entry for entry in mempooltxs if entry["txid"] not in mempool_txids[:5]
        ]
        for idx, tx in enumerate(mempool_txs[:5]):
            tx.nLockTime = 12
            mine_txs.append(tx)
            newblocktxs.append({"time_first_seen": 0, "txid": tx.txid_hex})

        height = 1002
        coinbase_tx = create_coinbase(height)
        coinbase_tx.vout[0].scriptPubKey = P2SH_OP_TRUE
        block = create_block(
            int(blockhashes[-1], 16),
            coinbase_tx,
            mocktime + 1100,
            version=5,
            txlist=mine_txs,
        )
        block.solve()
        peer.send_blocks_and_test([block], node)

        newblocktxs.append(
            {"time_first_seen": 0, "txid": coinbase_tx.txid_hex, "is_coinbase": True}
        )

        newblocktxs.sort(key=tx_sort_key, reverse=True)
        for blocktx in newblocktxs:
            blocktx["block"] = (height, block.hash_hex)

        node.syncwithvalidationinterfacequeue()

        check_tx_history([], newblocktxs + blocktxs, page_size=25)
        check_tx_history([], newblocktxs + blocktxs, page_size=200)

        # Still no OP_RETURN outputs indexed
        assert_equal(
            chronik.script("other", op_return_script.hex()).history().ok(),
            pb.TxHistoryPage(),
        )

        # Order for different page sizes is not guaranteed within blocks.
        txs_individually = [
            chronik.script(script_type, payload_hex)
            .history(page=i, page_size=1)
            .ok()
            .txs[0]
            for i in range(20)
        ]
        txs_bulk = list(
            chronik.script(script_type, payload_hex)
            .history(page=0, page_size=20)
            .ok()
            .txs
        )
        # Contain the same txs, but not necessarily in the same order
        assert_equal(
            sorted(txs_individually, key=lambda tx: tx.txid),
            sorted(txs_bulk, key=lambda tx: tx.txid),
        )


if __name__ == "__main__":
    ChronikScriptHistoryTest().main()
