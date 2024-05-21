# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik whether WS are emitted in deterministic order.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.avatools import AvaP2PInterface, can_find_inv_in_poll
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_CHECKSIG, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, chronik_sub_script, chronik_sub_to_blocks

QUORUM_NODE_COUNT = 16


class ChronikWsOrdering(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                "-chronik",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-persistavapeers=0",
                "-acceptnonstdtxn=1",
            ]
        ]
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

        node = self.nodes[0]
        node.add_p2p_connection(P2PDataStore())
        chronik = node.get_chronik_client()

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointxid = coinblock["tx"][0]

        self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000
        balance = coinvalue
        current_txid = cointxid

        def send_to_script(script) -> str:
            nonlocal balance, current_txid
            balance -= 2000
            tx = CTransaction()
            tx.vin = [
                CTxIn(
                    outpoint=COutPoint(int(current_txid, 16), 0),
                    scriptSig=SCRIPTSIG_OP_TRUE,
                )
            ]
            tx.vout = [
                CTxOut(balance, P2SH_OP_TRUE),
                CTxOut(1000, script),
            ]
            pad_tx(tx)
            current_txid = node.sendrawtransaction(tx.serialize().hex())
            return current_txid

        def ws_tx_msg(txid: str, msg_type):
            return pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=msg_type,
                    txid=bytes.fromhex(txid)[::-1],
                )
            )

        def ws_block_msg(block_hash: str, block_height: int, msg_type):
            return pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=msg_type,
                    block_hash=bytes.fromhex(block_hash)[::-1],
                    block_height=block_height,
                )
            )

        ifp_hash = "d37c4c809fe9840e7bfa77b86bd47163f6fb6c60"
        # 1 P2PKH script, just the IFP address
        p2pkh_script = CScript(bytes.fromhex(f"76a914{ifp_hash}88ac"))
        # 16 P2SH scripts, 0000...000i for i = 0, ... 14, and IFP address hash
        p2sh_hashes = []
        for i in range(15):
            p2sh_hashes.append(i.to_bytes(20, "big").hex())
        p2sh_hashes.append(ifp_hash)
        p2sh_scripts = [
            (CScript(bytes.fromhex(f"a914{p2sh_hash}87"))) for p2sh_hash in p2sh_hashes
        ]
        # 1 P2PK script
        pubkey = bytes.fromhex(
            "047fa64f6874fb7213776b24c40bc915451b57ef7f17ad7b982561f99f7cdc7010d141b856a092ee169c5405323895e1962c6b0d7c101120d360164c9e4b3997bd"
        )
        p2pk_script = CScript([pubkey, OP_CHECKSIG])
        # 1 non-standard script
        other_script = CScript(bytes.fromhex("deadbeef"))

        # Build a fake Avalanche quorum of nodes.
        def get_quorum():
            return [
                node.add_p2p_connection(AvaP2PInterface(self, node))
                for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()

        def is_quorum_established():
            return node.getavalancheinfo()["ready_to_poll"] is True

        def is_finalblock(blockhash):
            can_find_inv_in_poll(quorum, int(blockhash, 16))
            return node.isfinalblock(blockhash)

        self.wait_until(is_quorum_established)
        tip = node.getbestblockhash()
        self.wait_until(lambda: is_finalblock(tip))

        # Subscribe to all scripts in the test, and to blocks
        ws = chronik.ws(timeout=240)
        chronik_sub_script(ws, node, "p2pkh", bytes.fromhex(ifp_hash))
        for p2sh_hash in p2sh_hashes:
            chronik_sub_script(ws, node, "p2sh", bytes.fromhex(p2sh_hash))
        chronik_sub_script(ws, node, "p2pk", pubkey)
        chronik_sub_script(ws, node, "other", bytes(other_script))
        chronik_sub_to_blocks(ws, node)

        # Mine block, which will be finalized
        finalized_blockhash = self.generatetoaddress(
            node, 1, ADDRESS_ECREG_UNSPENDABLE
        )[0]
        cb_txid = node.getblock(finalized_blockhash)["tx"][0]
        assert not node.isfinalblock(finalized_blockhash)
        assert not node.isfinaltransaction(cb_txid, finalized_blockhash)
        finalized_height = node.getblock(finalized_blockhash, 1)["height"]

        assert_equal(
            ws.recv(),
            ws_block_msg(finalized_blockhash, finalized_height, pb.BLK_CONNECTED),
        )

        with node.assert_debug_log(
            [f"Avalanche finalized block {finalized_blockhash}"]
        ):
            self.wait_until(lambda: is_finalblock(finalized_blockhash))

        assert_equal(
            ws.recv(),
            ws_block_msg(finalized_blockhash, finalized_height, pb.BLK_FINALIZED),
        )

        assert node.isfinaltransaction(cb_txid, finalized_blockhash)

        # Send 1 tx to p2pkh
        p2pkh_txid = send_to_script(p2pkh_script)
        assert_equal(ws.recv(), ws_tx_msg(p2pkh_txid, pb.TX_ADDED_TO_MEMPOOL))

        # Send 240 txs to the p2sh scripts, 15 to each script
        p2sh_txids = []
        for p2sh_script in p2sh_scripts:
            for i in range(15):
                p2sh_txid = send_to_script(p2sh_script)
                p2sh_txids.append(p2sh_txid)
                assert_equal(ws.recv(), ws_tx_msg(p2sh_txid, pb.TX_ADDED_TO_MEMPOOL))

        # Send 1 tx to p2pk
        p2pk_txid = send_to_script(p2pk_script)
        assert_equal(ws.recv(), ws_tx_msg(p2pk_txid, pb.TX_ADDED_TO_MEMPOOL))

        # Send 1 tx to "other" non-standard script
        other_txid = send_to_script(other_script)
        assert_equal(ws.recv(), ws_tx_msg(other_txid, pb.TX_ADDED_TO_MEMPOOL))

        # Mine all txs in a block
        next_blockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        assert_equal(node.getblockcount(), finalized_height + 1)

        # BLK_CONNECTED always comes first
        assert_equal(
            ws.recv(),
            ws_block_msg(next_blockhash, finalized_height + 1, pb.BLK_CONNECTED),
        )

        # Then come the TX_CONFIRMED msgs, but in indeterministic order.
        # When a block is connected, Chronik is sending TX_CONFIRMED into all kinds of
        # different broadcast channels, and they are per-script.
        # Then these txs are sorted into the channels, one by one, in *block order*.
        # In the WS futures, messages are pulled in from the receiving ends of those
        # channels, but in *script order* (i.e. Ord of ScriptVariant).
        # So a WS future may pull in a message for a script while handle_block_connected
        # is still sending txs, but in a different order.
        # It's sort-of comparable to a mailman sorting mail into mailboxes and some
        # people are opening their mailboxes and taking mail out while the mailman
        # is still sorting stuff in, changing the order in which the mail would've
        # been received if they had waited.
        actual_ws_msgs = [ws.recv() for i in range(len(p2sh_txids) + 3)]
        actual_ws_msgs = sorted(actual_ws_msgs, key=lambda m: m.tx.txid[::-1])

        expected_ws_txids = sorted([p2pkh_txid, p2pk_txid, other_txid] + p2sh_txids)
        expected_ws_msgs = [
            ws_tx_msg(txid, pb.TX_CONFIRMED) for txid in expected_ws_txids
        ]

        assert_equal(actual_ws_msgs, expected_ws_msgs)

        # Identical for finalization
        self.wait_until(lambda: is_finalblock(next_blockhash))
        # BLK_FINALIZED always comes first
        assert_equal(
            ws.recv(),
            ws_block_msg(next_blockhash, finalized_height + 1, pb.BLK_FINALIZED),
        )
        # TX_FINALIZED come next
        actual_ws_msgs = [ws.recv() for i in range(len(p2sh_txids) + 3)]
        actual_ws_msgs = sorted(actual_ws_msgs, key=lambda m: m.tx.txid[::-1])

        expected_ws_txids = sorted([p2pkh_txid, p2pk_txid, other_txid] + p2sh_txids)
        expected_ws_msgs = [
            ws_tx_msg(txid, pb.TX_FINALIZED) for txid in expected_ws_txids
        ]


if __name__ == "__main__":
    ChronikWsOrdering().main()
