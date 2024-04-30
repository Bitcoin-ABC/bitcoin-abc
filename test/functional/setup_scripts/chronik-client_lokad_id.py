# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library endpoints that query LOKAD ID

Based on test/functional/chronik_lokad_id_group.py
"""

import pathmagic  # noqa
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
from test_framework.script import (
    OP_EQUAL,
    OP_HASH160,
    OP_RESERVED,
    OP_RETURN,
    CScript,
    hash160,
)
from test_framework.util import assert_equal, chronik_sub_lokad_id


class ChronikLokadIdGroup(SetupFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

        # Init

        node = self.nodes[0]

        yield True
        peer = node.add_p2p_connection(P2PDataStore())

        # Init chronik and websockets here so we can confirm msgs are sent server-side
        chronik = node.get_chronik_client()
        ws1 = chronik.ws()
        ws2 = chronik.ws()

        # Match websocket subscriptions from chronik_lokad_id_group.py
        # We assert expected websocket msgs are sent in chronik before we end steps
        # This helps ensure chronik-client receives websocket messages at expected steps
        chronik_sub_lokad_id(ws1, node, b"lok0")
        chronik_sub_lokad_id(ws2, node, b"lok1")
        chronik_sub_lokad_id(ws2, node, b"lok2")
        chronik_sub_lokad_id(ws2, node, b"lok3")

        mocktime = 1300000000
        node.setmocktime(mocktime)
        self.log.info("Step 0: New regtest chain")
        yield True

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]
        coinvalue = 5000000000

        self.log.info("Step 1: Broadcast a tx with lok0 LOKAD id in OP_RETURN")

        self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        def p2lokad(lokad_id: bytes):
            return CScript([lokad_id, OP_EQUAL])

        def p2sh_lokad(lokad_id: bytes):
            return CScript([OP_HASH160, hash160(p2lokad(lokad_id)), OP_EQUAL])

        def spend_p2lokad(lokad_id: bytes):
            return CScript([lokad_id, p2lokad(lokad_id)])

        def ws_msg(txid: str, msg_type):
            return pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=msg_type,
                    txid=bytes.fromhex(txid)[::-1],
                )
            )

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

        assert_equal(ws1.recv(), ws_msg(tx0.hash, pb.TX_ADDED_TO_MEMPOOL))
        yield True

        self.log.info("Step 2: We detect 'lok1' LOKAD from an input script")

        node.setmocktime(mocktime + 1)
        tx1 = CTransaction()
        tx1.vin = [CTxIn(COutPoint(tx0.sha256, 1), spend_p2lokad(b"lok1"))]
        tx1.vout = [CTxOut(0, CScript([OP_RETURN, b"lok0", b"x" * 100]))]
        tx1.rehash()
        chronik.broadcast_tx(tx1.serialize()).ok()

        assert_equal(ws1.recv(), ws_msg(tx1.hash, pb.TX_ADDED_TO_MEMPOOL))
        assert_equal(ws2.recv(), ws_msg(tx1.hash, pb.TX_ADDED_TO_MEMPOOL))

        # Unsub ws2 from lok2
        chronik_sub_lokad_id(ws2, node, b"lok2", is_unsub=True)
        yield True

        self.log.info(
            "Step 3: We detect 'lok2' and 'lok0' LOKAD IDs when both are in EMPP"
        )

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
        # Only sent to ws1, not ws2
        assert_equal(ws1.recv(), ws_msg(tx2.hash, pb.TX_ADDED_TO_MEMPOOL))
        yield True

        self.log.info("Step 4: Mine lokad txs")

        # Mine tx0, tx1, tx2
        blockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        assert_equal(node.getblockcount(), 102)
        for txid in sorted([tx0.hash, tx1.hash, tx2.hash]):
            assert_equal(ws1.recv(), ws_msg(txid, pb.TX_CONFIRMED))
        assert_equal(ws2.recv(), ws_msg(tx1.hash, pb.TX_CONFIRMED))
        yield True

        self.log.info("Step 5: EMPP lok0 and lok2 spending from lok3 p2sh")

        tx3 = CTransaction()
        tx3.vin = [CTxIn(COutPoint(tx0.sha256, 3), spend_p2lokad(b"lok3"))]
        tx3.vout = [
            CTxOut(0, CScript([OP_RETURN, OP_RESERVED, b"lok2", b"lok0" + b"x" * 100]))
        ]
        tx3.rehash()
        chronik.broadcast_tx(tx3.serialize()).ok()

        assert_equal(ws1.recv(), ws_msg(tx3.hash, pb.TX_ADDED_TO_MEMPOOL))
        assert_equal(ws2.recv(), ws_msg(tx3.hash, pb.TX_ADDED_TO_MEMPOOL))
        yield True

        self.log.info(
            "Step 6: We get REMOVED FROM MEMPOOl if a conflicting tx is mined"
        )

        # Mine conflicting tx kicking out tx3
        tx3_conflict = CTransaction()
        tx3_conflict.vin = [CTxIn(COutPoint(tx0.sha256, 3), spend_p2lokad(b"lok3"))]
        tx3_conflict.vout = [
            CTxOut(0, CScript([OP_RETURN, OP_RESERVED, b"lok4" + b"x" * 100]))
        ]
        tx3_conflict.rehash()

        block = create_block(int(blockhash, 16), create_coinbase(103), mocktime + 100)
        block.vtx += [tx3_conflict]
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)

        assert_equal(ws1.recv(), ws_msg(tx3.hash, pb.TX_REMOVED_FROM_MEMPOOL))
        assert_equal(ws2.recv(), ws_msg(tx3.hash, pb.TX_REMOVED_FROM_MEMPOOL))

        assert_equal(ws2.recv(), ws_msg(tx3_conflict.hash, pb.TX_CONFIRMED))

        yield True

        self.log.info(
            "Step 7: If block is invalidated, tx is restored to the mempool and lokad ws picks this up"
        )

        node.invalidateblock(block.hash)
        assert_equal(node.getblockcount(), 102)
        assert_equal(ws2.recv(), ws_msg(tx3_conflict.hash, pb.TX_ADDED_TO_MEMPOOL))
        yield True


if __name__ == "__main__":
    ChronikLokadIdGroup().main()
