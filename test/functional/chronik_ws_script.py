# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test whether Chronik sends WebSocket messages correctly."""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.blocktools import COINBASE_MATURITY, create_block, create_coinbase
from test_framework.hash import hash160
from test_framework.messages import (
    AvalancheVoteError,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
)
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_EQUAL, OP_HASH160, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, chronik_sub_script, uint256_hex

QUORUM_NODE_COUNT = 16


class ChronikWsScriptTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-avalanchepreconsensus=1",
                "-chronik",
            ],
        ]
        self.supports_cli = False
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()
        node.setmocktime(1300000000)
        peer = node.add_p2p_connection(P2PDataStore())

        # Make us a coin
        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        # Set up Avalanche
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        quorum = get_quorum()

        assert node.getavalancheinfo()["ready_to_poll"] is True

        tip = self.generatetoaddress(
            node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE
        )[-1]

        # Tx sending to 4 different scripts
        coinvalue = 5000000000
        send_values = [coinvalue - 10000, 1000, 1000, 1000]
        send_redeem_scripts = [bytes([i + 0x52]) for i in range(len(send_values))]
        send_script_hashes = [hash160(script) for script in send_redeem_scripts]
        send_scripts = [
            CScript([OP_HASH160, script_hash, OP_EQUAL])
            for script_hash in send_script_hashes
        ]
        tx = CTransaction()
        tx.vin = [
            CTxIn(outpoint=COutPoint(int(cointx, 16), 0), scriptSig=SCRIPTSIG_OP_TRUE)
        ]
        tx.vout = [
            CTxOut(value, script) for (value, script) in zip(send_values, send_scripts)
        ]

        # Connect 2 websocket clients
        ws1 = chronik.ws()
        ws2 = chronik.ws()
        # Subscribe to 2 scripts on ws1 and 1 on ws2
        chronik_sub_script(ws1, node, "p2sh", send_script_hashes[1])
        chronik_sub_script(ws1, node, "p2sh", send_script_hashes[2])
        chronik_sub_script(ws2, node, "p2sh", send_script_hashes[2])

        # Send the tx, will send updates to ws1 and ws2
        txid = node.sendrawtransaction(tx.serialize().hex())
        self.wait_until(lambda: txid in node.getrawmempool())

        from test_framework.chronik.client import pb

        expected_msg = pb.WsMsg(
            tx=pb.MsgTx(
                msg_type=pb.TX_ADDED_TO_MEMPOOL,
                txid=bytes.fromhex(txid)[::-1],
            )
        )
        assert_equal(ws1.recv(), expected_msg)
        assert_equal(ws2.recv(), expected_msg)

        # Unsubscribe ws1 from the other script ws2 is subscribed to
        chronik_sub_script(ws1, node, "p2sh", send_script_hashes[2], is_unsub=True)

        # tx2 is only sent to ws2
        tx2 = CTransaction()
        tx2.vin = [
            CTxIn(
                outpoint=COutPoint(int(txid, 16), 2),
                scriptSig=CScript([send_redeem_scripts[2]]),
            )
        ]
        pad_tx(tx2)
        txid2 = node.sendrawtransaction(tx2.serialize().hex())

        assert_equal(
            ws2.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_ADDED_TO_MEMPOOL,
                    txid=bytes.fromhex(txid2)[::-1],
                )
            ),
        )

        # tx3 is only sent to ws1
        tx3 = CTransaction()
        tx3.vin = [
            CTxIn(
                outpoint=COutPoint(int(txid, 16), 1),
                scriptSig=CScript([send_redeem_scripts[1]]),
            )
        ]
        pad_tx(tx3)
        txid3 = node.sendrawtransaction(tx3.serialize().hex())

        assert_equal(
            ws1.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_ADDED_TO_MEMPOOL,
                    txid=bytes.fromhex(txid3)[::-1],
                )
            ),
        )

        # Tweak tx3 to cause a conflict
        tx3_conflict = CTransaction(tx3)
        tx3_conflict.nLockTime = 1

        # Mine tx, tx2 and tx3_conflict
        height = 102
        block = create_block(
            int(tip, 16),
            create_coinbase(height, b"\x03" * 33),
            1300000500,
            txlist=[tx, tx2, tx3_conflict],
        )
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()

        def check_tx_msgs(ws, msg_type, txids, finalization_type=None):
            for txid in txids:
                tx = (
                    pb.MsgTx(
                        msg_type=msg_type,
                        txid=bytes.fromhex(txid)[::-1],
                        finalization_reason=pb.TxFinalizationReason(
                            finalization_type=finalization_type,
                        ),
                    )
                    if finalization_type is not None
                    else pb.MsgTx(
                        msg_type=msg_type,
                        txid=bytes.fromhex(txid)[::-1],
                    )
                )
                assert_equal(
                    ws.recv(),
                    pb.WsMsg(tx=tx),
                )

        # For ws1, this sends a REMOVED_FROM_MEMPOOL for tx3, and two CONFIRMED
        check_tx_msgs(ws1, pb.TX_REMOVED_FROM_MEMPOOL, [tx3.hash])
        check_tx_msgs(ws1, pb.TX_CONFIRMED, sorted([txid, tx3_conflict.hash]))

        # For ws2, this only sends the CONFIRMED msgs
        check_tx_msgs(ws2, pb.TX_CONFIRMED, sorted([txid, txid2]))

        # Invalidate the block again
        node.invalidateblock(block.hash)

        # Adds the disconnected block's txs back into the mempool
        check_tx_msgs(ws1, pb.TX_ADDED_TO_MEMPOOL, [txid, tx3_conflict.hash])
        check_tx_msgs(ws2, pb.TX_ADDED_TO_MEMPOOL, [txid, txid2])

        # Let's get rid of the proofs vote
        def finalize_proofs(quorum):
            proofids = [q.proof.proofid for q in quorum]
            [can_find_inv_in_poll(quorum, proofid) for proofid in proofids]
            return all(
                node.getrawavalancheproof(uint256_hex(proofid))["finalized"]
                for proofid in proofids
            )

        self.wait_until(lambda: finalize_proofs(quorum))

        # Test Avalanche finalization
        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_tip(tip))

        def finalize_tx(txid):
            def vote_until_final():
                can_find_inv_in_poll(
                    quorum,
                    int(txid, 16),
                    other_response=AvalancheVoteError.UNKNOWN,
                )
                return node.isfinaltransaction(txid)

            self.wait_until(vote_until_final)

        finalize_tx(txid)
        check_tx_msgs(
            ws1,
            pb.TX_FINALIZED,
            sorted([txid]),
            pb.TX_FINALIZATION_REASON_PRE_CONSENSUS,
        )
        check_tx_msgs(
            ws2,
            pb.TX_FINALIZED,
            sorted([txid]),
            pb.TX_FINALIZATION_REASON_PRE_CONSENSUS,
        )

        # Mine txs in a block -> sends CONFIRMED
        tip = self.generate(node, 1)[-1]
        check_tx_msgs(ws1, pb.TX_CONFIRMED, sorted([txid, tx3_conflict.hash]))
        check_tx_msgs(ws2, pb.TX_CONFIRMED, sorted([txid, txid2]))

        # Wait for Avalanche finalization of block -> sends TX_FINALIZED
        self.wait_until(lambda: has_finalized_tip(tip))
        check_tx_msgs(
            ws1,
            pb.TX_FINALIZED,
            sorted([txid, tx3_conflict.hash]),
            pb.TX_FINALIZATION_REASON_POST_CONSENSUS,
        )
        check_tx_msgs(
            ws2,
            pb.TX_FINALIZED,
            sorted([txid, txid2]),
            pb.TX_FINALIZATION_REASON_POST_CONSENSUS,
        )

        # Invalid subscription, payload too short
        ws1.sub_script("p2pkh", b"abc")
        # Chronik responds with an error message
        assert_equal(
            ws1.recv(),
            pb.WsMsg(
                error=pb.Error(
                    msg="400: Invalid payload for P2PKH: Invalid length, expected 20 bytes but got 3 bytes"
                ),
            ),
        )

        ws1.close()
        ws2.close()


if __name__ == "__main__":
    ChronikWsScriptTest().main()
