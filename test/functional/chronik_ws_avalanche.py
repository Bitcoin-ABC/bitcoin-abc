# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test whether Chronik sends WebSocket avalanche messages correctly."""

import os
import time

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    SCRIPT_UNSPENDABLE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.chronik.slp import slp_genesis
from test_framework.messages import (
    AvalancheTxVoteError,
    AvalancheVoteError,
    COutPoint,
    CTransaction,
    CTxIn,
    CTxOut,
)
from test_framework.p2p import P2PDataStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import (
    assert_equal,
    chronik_sub_lokad_id,
    chronik_sub_plugin,
    chronik_sub_script,
    chronik_sub_token_id,
    chronik_sub_txid,
    uint256_hex,
)

QUORUM_NODE_COUNT = 16


class ChronikWsTest(BitcoinTestFramework):
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
                "-chronik",
                "-enableminerfund",
            ],
        ]
        self.supports_cli = False

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()
        self.skip_if_no_chronik_plugins()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        # Without a plugins.toml, setting up a plugin context is skipped
        plugins_toml = os.path.join(node.datadir, "plugins.toml")
        plugins_dir = os.path.join(node.datadir, "plugins")

        # This is a dummy plugin that adds some constant data to each output of
        # an SLP tx.
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.avatest]", file=f)
        os.mkdir(plugins_dir)
        plugin_module = os.path.join(plugins_dir, "avatest.py")
        with open(plugin_module, "w", encoding="utf-8") as f:
            # We can't have null bytes in this docstring, so we use bytes([0])
            # to work around that limitation.
            print(
                """
from chronik_plugin.plugin import Plugin, PluginOutput
from chronik_plugin.script import OP_RETURN

class AvatestPlugin(Plugin):
    def lokad_id(self):
        return b'SLP' + bytes([0])

    def version(self):
        return '0.4.2'

    def run(self, tx):
        if len(tx.outputs) < 1:
            return []
        ops = list(tx.outputs[0].script)
        if ops[0] != OP_RETURN:
            return []
        if ops[1] != b'SLP' + bytes([0]):
            return []
        return [PluginOutput(idx=i, data=b"foo", groups=[b"avagrp"]) for i in range(len(tx.outputs))]
""",
                file=f,
            )

        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin avatest.AvatestPlugin (version 0.4.2) with LOKAD IDs [b"SLP\\0"]',
            ]
        ):
            self.restart_node(0, self.extra_args[0] + ["-chronikreindex"])

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        quorum = get_quorum()
        assert node.getavalancheinfo()["ready_to_poll"] is True

        def finalize_proofs(quorum):
            proofids = [q.proof.proofid for q in quorum]
            [can_find_inv_in_poll(quorum, proofid) for proofid in proofids]
            return all(
                node.getrawavalancheproof(uint256_hex(proofid))["finalized"]
                for proofid in proofids
            )

        self.wait_until(lambda: finalize_proofs(quorum))

        # Make sure chronik has synced
        node.syncwithvalidationinterfacequeue()

        now = int(time.time())
        node.setmocktime(now)

        from test_framework.chronik.client import pb

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        coinbase_txid = coinblock["tx"][0]
        tip = self.generatetoaddress(
            node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE
        )[-1]

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        self.wait_until(lambda: has_finalized_tip(tip))

        # Create a pair of conflicting txs that contain some token output and
        # some plugin data.
        coinvalue = 3400000000
        txs = []
        for i in range(1, 3):
            tx = CTransaction()
            tx.vin = [CTxIn(COutPoint(int(coinbase_txid, 16), 0), SCRIPTSIG_OP_TRUE)]
            tx.vout = [
                # SLP + plugin output
                CTxOut(
                    0,
                    slp_genesis(
                        token_type=pb.SLP_TOKEN_TYPE_FUNGIBLE,
                        token_ticker=b"SLPRNG",
                        token_name=b"Random SLP Token",
                        token_document_url=b"http://example/slp",
                        token_document_hash=b"x" * 32,
                        decimals=4,
                        mint_baton_vout=2,
                        initial_mint_amount=5000,
                    ),
                ),
                # Regular XEC output
                CTxOut(coinvalue - (10000 * i), SCRIPT_UNSPENDABLE),
            ]
            pad_tx(tx, 100)
            txs.append(tx)

        tx0, tx1 = txs
        txid0 = txs[0].txid_hex
        txid1 = txs[1].txid_hex
        assert txid0 != txid1

        num_subs = 7
        subs = [chronik.ws() for _ in range(num_subs)]

        # Let's subscribe via various methods to both txs
        # Both txs
        chronik_sub_script(subs[0], node, "p2pkh", bytes.fromhex("00" * 20))
        chronik_sub_lokad_id(subs[1], node, b"SLP\x00")
        chronik_sub_plugin(subs[2], node, "avatest", b"avagrp")
        # Tx 0 only
        chronik_sub_txid(subs[3], node, txid0)
        chronik_sub_token_id(subs[4], node, txid0)
        # Tx 1 only
        chronik_sub_txid(subs[5], node, txid1)
        chronik_sub_token_id(subs[6], node, txid1)

        # Send the first tx. We should get 5 out of the 7 possible messages for
        # transaction added to mempool, only missing the 2 that are for txid1.
        node.sendrawtransaction(tx0.serialize().hex())
        assert txid0 in node.getrawmempool()

        node.syncwithvalidationinterfacequeue()

        for sub in subs[:5]:
            assert_equal(
                sub.recv(),
                pb.WsMsg(
                    tx=pb.MsgTx(
                        msg_type=pb.TX_ADDED_TO_MEMPOOL,
                        txid=bytes.fromhex(txid0)[::-1],
                    )
                ),
            )

        # Now send the second tx. It's a conflicting tx so it goes to the
        # conflicting pool, and we expect no message. We can't just use
        # sendrawtransaction here as the tx will be rejected for conflict.
        peer = node.add_p2p_connection(P2PDataStore())
        peer.send_txs_and_test(
            [tx1], node, success=False, reject_reason="txn-mempool-conflict"
        )
        assert_equal(node.gettransactionstatus(txid1)["pool"], "conflicting")

        def invalidate_tx(txid):
            def vote_until_final():
                can_find_inv_in_poll(
                    quorum,
                    int(txid, 16),
                    response=AvalancheTxVoteError.INVALID,
                    other_response=AvalancheVoteError.UNKNOWN,
                )
                return (
                    txid not in node.getrawmempool()
                    and node.gettransactionstatus(txid)["pool"] == "none"
                )

            self.wait_until(vote_until_final)

        # Let's invalidate our mempool tx0
        invalidate_tx(txid0)

        # We first get the tx0 removal message, then the conflicting tx1 is
        # added to the mempool, and finally tx0 is invalidated:
        #  - 5 first subs get the removal message for tx0
        #  - subs 0, 1, 2, 5 and 6 get the addition message for tx1
        #  - 5 first subs get the invalidation message for tx0
        for sub in subs[:5]:
            assert_equal(
                sub.recv(),
                pb.WsMsg(
                    tx=pb.MsgTx(
                        msg_type=pb.TX_REMOVED_FROM_MEMPOOL,
                        txid=bytes.fromhex(txid0)[::-1],
                    )
                ),
            )

        for sub in subs[:3] + subs[5:]:
            assert_equal(
                sub.recv(),
                pb.WsMsg(
                    tx=pb.MsgTx(
                        msg_type=pb.TX_ADDED_TO_MEMPOOL,
                        txid=bytes.fromhex(txid1)[::-1],
                    )
                ),
            )

        for sub in subs[:5]:
            assert_equal(
                sub.recv(),
                pb.WsMsg(
                    tx=pb.MsgTx(
                        msg_type=pb.TX_INVALIDATED,
                        txid=bytes.fromhex(txid0)[::-1],
                    )
                ),
            )

        def finalize_tx(txid):
            def vote_until_final():
                can_find_inv_in_poll(
                    quorum,
                    int(txid, 16),
                )
                return node.isfinaltransaction(txid)

            self.wait_until(vote_until_final)

        # Now finalize the conflicting tx1. Subs 0, 1, 2, 5 and 6 should get the
        # finalization message.
        finalize_tx(txid1)

        for sub in subs[:3] + subs[5:]:
            assert_equal(
                sub.recv(),
                pb.WsMsg(
                    tx=pb.MsgTx(
                        msg_type=pb.TX_FINALIZED,
                        txid=bytes.fromhex(txid1)[::-1],
                        finalization_reason=pb.TxFinalizationReason(
                            finalization_type=pb.TX_FINALIZATION_REASON_PRE_CONSENSUS
                        ),
                    )
                ),
            )

        # No extra message has been received
        for sub in subs:
            try:
                sub.timeout = 1
                sub.recv()
            except TimeoutError as e:
                assert str(e).startswith("No message received"), (
                    "The websocket did receive an unexpected message"
                )
                pass
            except Exception:
                assert False, "The websocket did not time out as expected"
            else:
                assert False, "The websocket did receive an unexpected message"


if __name__ == "__main__":
    ChronikWsTest().main()
