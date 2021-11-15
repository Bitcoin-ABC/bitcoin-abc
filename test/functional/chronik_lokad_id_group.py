# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik indexes tx by LOKAD ID correctly.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY, create_block, create_coinbase
from test_framework.hash import hash160
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_EQUAL, OP_HASH160, OP_RESERVED, OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, chronik_sub_lokad_id


class ChronikLokadIdGroup(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

        node = self.nodes[0]
        peer = node.add_p2p_connection(P2PDataStore())
        chronik = node.get_chronik_client()
        ws1 = chronik.ws()
        ws2 = chronik.ws()

        mocktime = 1300000000
        node.setmocktime(mocktime)

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]
        coinvalue = 5000000000

        self.generatetoaddress(node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE)

        def p2lokad(lokad_id: bytes):
            return CScript([lokad_id, OP_EQUAL])

        def p2sh_lokad(lokad_id: bytes):
            return CScript([OP_HASH160, hash160(p2lokad(lokad_id)), OP_EQUAL])

        def spend_p2lokad(lokad_id: bytes):
            return CScript([lokad_id, p2lokad(lokad_id)])

        def page_txids(txs):
            return [tx.txid[::-1].hex() for tx in txs]

        def lokad_id_unconf(lokad_id: bytes):
            return page_txids(
                chronik.lokad_id(lokad_id.hex()).unconfirmed_txs().ok().txs
            )

        def lokad_id_conf(lokad_id: bytes):
            return page_txids(chronik.lokad_id(lokad_id.hex()).confirmed_txs().ok().txs)

        def lokad_id_history(lokad_id: bytes):
            return page_txids(chronik.lokad_id(lokad_id.hex()).history().ok().txs)

        def ws_msg(txid: str, msg_type):
            return pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=msg_type,
                    txid=bytes.fromhex(txid)[::-1],
                )
            )

        chronik_sub_lokad_id(ws1, node, b"lok0")
        chronik_sub_lokad_id(ws2, node, b"lok1")
        chronik_sub_lokad_id(ws2, node, b"lok2")
        chronik_sub_lokad_id(ws2, node, b"lok3")

        tx0 = CTransaction()
        tx0.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx0.vout = [
            CTxOut(0, CScript([OP_RETURN, b"lok0"])),
            CTxOut(10000, p2sh_lokad(b"lok1")),
            CTxOut(10000, p2sh_lokad(b"lok2")),
            CTxOut(10000, p2sh_lokad(b"lok3")),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
        ]
        tx0.rehash()
        chronik.broadcast_tx(tx0.serialize()).ok()
        assert_equal(lokad_id_unconf(b"lok0"), [tx0.hash])

        assert_equal(ws1.recv(), ws_msg(tx0.hash, pb.TX_ADDED_TO_MEMPOOL))

        node.setmocktime(mocktime + 1)
        tx1 = CTransaction()
        tx1.vin = [CTxIn(COutPoint(tx0.sha256, 1), spend_p2lokad(b"lok1"))]
        tx1.vout = [CTxOut(0, CScript([OP_RETURN, b"lok0", b"x" * 100]))]
        tx1.rehash()
        chronik.broadcast_tx(tx1.serialize()).ok()
        assert_equal(lokad_id_unconf(b"lok0"), [tx0.hash, tx1.hash])
        assert_equal(lokad_id_unconf(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_unconf(b"xxxx"), [])

        assert_equal(ws1.recv(), ws_msg(tx1.hash, pb.TX_ADDED_TO_MEMPOOL))
        assert_equal(ws2.recv(), ws_msg(tx1.hash, pb.TX_ADDED_TO_MEMPOOL))

        # Unsub ws2 from lok2
        chronik_sub_lokad_id(ws2, node, b"lok2", is_unsub=True)

        node.setmocktime(mocktime + 2)
        tx2 = CTransaction()
        tx2.vin = [CTxIn(COutPoint(tx0.sha256, 2), spend_p2lokad(b"lok2"))]
        tx2.vout = [
            CTxOut(
                0, CScript([OP_RETURN, OP_RESERVED, b"lok2__", b"lok0" + b"x" * 100])
            )
        ]
        tx2.rehash()
        chronik.broadcast_tx(tx2.serialize()).ok()
        assert_equal(lokad_id_unconf(b"lok0"), [tx0.hash, tx1.hash, tx2.hash])
        assert_equal(lokad_id_unconf(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_unconf(b"lok2"), [tx2.hash])

        # Only sent to ws1, not ws2
        assert_equal(ws1.recv(), ws_msg(tx2.hash, pb.TX_ADDED_TO_MEMPOOL))

        # Mine tx0, tx1, tx2
        blockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]

        assert_equal(lokad_id_conf(b"lok0"), sorted([tx0.hash, tx1.hash, tx2.hash]))
        assert_equal(lokad_id_conf(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_conf(b"lok2"), [tx2.hash])

        for txid in sorted([tx0.hash, tx1.hash, tx2.hash]):
            assert_equal(ws1.recv(), ws_msg(txid, pb.TX_CONFIRMED))
        assert_equal(ws2.recv(), ws_msg(tx1.hash, pb.TX_CONFIRMED))

        tx3 = CTransaction()
        tx3.vin = [CTxIn(COutPoint(tx0.sha256, 3), spend_p2lokad(b"lok3"))]
        tx3.vout = [
            CTxOut(0, CScript([OP_RETURN, OP_RESERVED, b"lok2", b"lok0" + b"x" * 100]))
        ]
        tx3.rehash()
        chronik.broadcast_tx(tx3.serialize()).ok()

        assert_equal(ws1.recv(), ws_msg(tx3.hash, pb.TX_ADDED_TO_MEMPOOL))
        assert_equal(ws2.recv(), ws_msg(tx3.hash, pb.TX_ADDED_TO_MEMPOOL))

        # Unconfirmed
        assert_equal(lokad_id_unconf(b"lok0"), [tx3.hash])
        assert_equal(lokad_id_unconf(b"lok1"), [])
        assert_equal(lokad_id_unconf(b"lok2"), [tx3.hash])
        assert_equal(lokad_id_unconf(b"lok3"), [tx3.hash])
        # Confirmed stays unchanged
        assert_equal(lokad_id_conf(b"lok0"), sorted([tx0.hash, tx1.hash, tx2.hash]))
        assert_equal(lokad_id_conf(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_conf(b"lok2"), [tx2.hash])
        assert_equal(lokad_id_conf(b"lok3"), [])
        # History
        assert_equal(
            lokad_id_history(b"lok0"), [tx3.hash, tx2.hash, tx1.hash, tx0.hash]
        )
        assert_equal(lokad_id_history(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_history(b"lok2"), [tx3.hash, tx2.hash])
        assert_equal(lokad_id_history(b"lok3"), [tx3.hash])

        # Mine conflicting tx kicking out tx3
        tx3_conflict = CTransaction()
        tx3_conflict.vin = [CTxIn(COutPoint(tx0.sha256, 3), spend_p2lokad(b"lok3"))]
        tx3_conflict.vout = [
            CTxOut(0, CScript([OP_RETURN, OP_RESERVED, b"lok4" + b"x" * 100]))
        ]
        tx3_conflict.rehash()

        block = create_block(
            int(blockhash, 16),
            create_coinbase(103),
            mocktime + 100,
            txlist=[tx3_conflict],
        )
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()

        assert_equal(ws1.recv(), ws_msg(tx3.hash, pb.TX_REMOVED_FROM_MEMPOOL))
        assert_equal(ws2.recv(), ws_msg(tx3.hash, pb.TX_REMOVED_FROM_MEMPOOL))

        assert_equal(ws2.recv(), ws_msg(tx3_conflict.hash, pb.TX_CONFIRMED))

        # No unconfirmed anymore
        assert_equal(lokad_id_unconf(b"lok0"), [])
        assert_equal(lokad_id_unconf(b"lok1"), [])
        assert_equal(lokad_id_unconf(b"lok2"), [])
        assert_equal(lokad_id_unconf(b"lok3"), [])
        # Confirmed
        assert_equal(lokad_id_conf(b"lok0"), sorted([tx0.hash, tx1.hash, tx2.hash]))
        assert_equal(lokad_id_conf(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_conf(b"lok2"), [tx2.hash])
        assert_equal(lokad_id_conf(b"lok3"), [tx3_conflict.hash])
        assert_equal(lokad_id_conf(b"lok4"), [tx3_conflict.hash])
        # History
        assert_equal(lokad_id_history(b"lok0"), [tx2.hash, tx1.hash, tx0.hash])
        assert_equal(lokad_id_history(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_history(b"lok2"), [tx2.hash])
        assert_equal(lokad_id_history(b"lok3"), [tx3_conflict.hash])
        assert_equal(lokad_id_history(b"lok4"), [tx3_conflict.hash])

        node.invalidateblock(block.hash)

        assert_equal(ws2.recv(), ws_msg(tx3_conflict.hash, pb.TX_ADDED_TO_MEMPOOL))

        # Back to unconfirmed
        assert_equal(lokad_id_unconf(b"lok0"), [])
        assert_equal(lokad_id_unconf(b"lok1"), [])
        assert_equal(lokad_id_unconf(b"lok2"), [])
        assert_equal(lokad_id_unconf(b"lok3"), [tx3_conflict.hash])
        assert_equal(lokad_id_unconf(b"lok4"), [tx3_conflict.hash])
        # Confirmed
        assert_equal(lokad_id_conf(b"lok0"), sorted([tx0.hash, tx1.hash, tx2.hash]))
        assert_equal(lokad_id_conf(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_conf(b"lok2"), [tx2.hash])
        assert_equal(lokad_id_conf(b"lok3"), [])
        assert_equal(lokad_id_conf(b"lok4"), [])
        # History
        assert_equal(lokad_id_history(b"lok0"), [tx2.hash, tx1.hash, tx0.hash])
        assert_equal(lokad_id_history(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_history(b"lok2"), [tx2.hash])
        assert_equal(lokad_id_history(b"lok3"), [tx3_conflict.hash])
        assert_equal(lokad_id_history(b"lok4"), [tx3_conflict.hash])

        # Restarting leaves the LOKAD index intact
        self.restart_node(0, ["-chronik"])
        assert_equal(lokad_id_history(b"lok0"), [tx2.hash, tx1.hash, tx0.hash])
        assert_equal(lokad_id_history(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_history(b"lok2"), [tx2.hash])

        # Restarting with index disabled wipes the DB
        self.restart_node(0, ["-chronik", "-chroniklokadidindex=0"])
        assert_equal(lokad_id_history(b"lok0"), [])
        assert_equal(lokad_id_history(b"lok1"), [])
        assert_equal(lokad_id_history(b"lok2"), [])

        # Restarting with chroniklokadidindex=1 reindexes the LOKAD ID index
        self.restart_node(0, ["-chronik"])
        assert_equal(lokad_id_history(b"lok0"), [tx2.hash, tx1.hash, tx0.hash])
        assert_equal(lokad_id_history(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_history(b"lok2"), [tx2.hash])

        # Restarting again still leaves the index intact
        self.restart_node(0, ["-chronik", "-chroniklokadidindex=1"])
        assert_equal(lokad_id_history(b"lok0"), [tx2.hash, tx1.hash, tx0.hash])
        assert_equal(lokad_id_history(b"lok1"), [tx1.hash])
        assert_equal(lokad_id_history(b"lok2"), [tx2.hash])

        # Wipe index again
        self.restart_node(0, ["-chronik", "-chroniklokadidindex=0"])
        assert_equal(lokad_id_history(b"lok0"), [])
        assert_equal(lokad_id_history(b"lok1"), [])
        assert_equal(lokad_id_history(b"lok2"), [])

        # Restarting with chroniklokadidindex=0 and chroniktokenindex=1 DOES NOT reindex the LOKAD ID index
        self.restart_node(
            0,
            ["-chronik", "-reindex", "-chroniktokenindex=1", "-chroniklokadidindex=0"],
        )
        assert_equal(lokad_id_conf(b"lok0"), [])
        assert_equal(lokad_id_conf(b"lok1"), [])
        assert_equal(lokad_id_conf(b"lok2"), [])


if __name__ == "__main__":
    ChronikLokadIdGroup().main()
