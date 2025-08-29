# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test whether Chronik sends WebSocket messages correctly."""
import time

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.blocktools import create_block, create_coinbase
from test_framework.cashaddr import decode
from test_framework.messages import (
    XEC,
    AvalancheTxVoteError,
    AvalancheVoteError,
    CTransaction,
    CTxOut,
    FromHex,
    msg_block,
)
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_EQUAL, OP_HASH160, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import (
    assert_equal,
    chronik_sub_to_blocks,
    chronik_sub_txid,
    uint256_hex,
)
from test_framework.wallet import MiniWallet

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
                "-avalanchepreconsensus=1",
                "-chronik",
                "-enableminerfund",
            ],
        ]
        self.supports_cli = False

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        # Connect, but don't subscribe yet
        ws = chronik.ws()

        # Pick one node from the quorum for polling.
        # ws will not receive msgs because it's not subscribed to blocks yet.
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

        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_tip(tip))

        # Make sure chronik has synced
        node.syncwithvalidationinterfacequeue()

        # Now subscribe to blocks, we'll get block updates from now on
        chronik_sub_to_blocks(ws, node)

        now = int(time.time())
        node.setmocktime(now)

        # Mine block
        tip = self.generate(node, 1)[-1]
        height = node.getblockcount()

        from test_framework.chronik.client import pb

        # We get a CONNECTED msg
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_CONNECTED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                )
            ),
        )

        # After we wait, we get a FINALIZED msg
        self.wait_until(lambda: has_finalized_tip(tip))
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_FINALIZED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                )
            ),
        )

        def coinbase_data_from_block(blockhash):
            coinbase = node.getblock(blockhash, 2)["tx"][0]
            coinbase_scriptsig = bytes.fromhex(coinbase["vin"][0]["coinbase"])
            coinbase_outputs = [
                {
                    "sats": int(txout["value"] * XEC),
                    "output_script": bytes.fromhex(txout["scriptPubKey"]["hex"]),
                }
                for txout in coinbase["vout"]
            ]
            return pb.CoinbaseData(
                coinbase_scriptsig=coinbase_scriptsig, coinbase_outputs=coinbase_outputs
            )

        coinbase_data = coinbase_data_from_block(tip)

        # When we invalidate, we get a DISCONNECTED msg
        node.invalidateblock(tip)
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_DISCONNECTED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                    coinbase_data=coinbase_data,
                )
            ),
        )

        now += 1
        node.setmocktime(now)

        tip = self.generate(node, 1)[-1]
        height = node.getblockcount()

        # We get a CONNECTED msg
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_CONNECTED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                )
            ),
        )

        # Reject the block via avalanche
        with node.wait_for_debug_log(
            [f"Avalanche rejected block {tip}".encode()],
            chatty_callable=lambda: can_find_inv_in_poll(
                quorum, int(tip, 16), AvalancheVoteError.INVALID
            ),
        ):
            pass

        coinbase_data = coinbase_data_from_block(tip)

        # We get a DISCONNECTED msg
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_DISCONNECTED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                    coinbase_data=coinbase_data,
                )
            ),
        )

        # Keep rejected the block until it gets invalidated
        with node.wait_for_debug_log(
            [f"Avalanche invalidated block {tip}".encode()],
            chatty_callable=lambda: can_find_inv_in_poll(
                quorum, int(tip, 16), AvalancheVoteError.INVALID
            ),
        ):
            pass

        # We get an INVALIDATED msg
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_INVALIDATED,
                    block_hash=bytes.fromhex(tip)[::-1],
                    block_height=height,
                    block_timestamp=now,
                    coinbase_data=coinbase_data,
                )
            ),
        )

        now += 1
        node.setmocktime(now)
        tip = node.getbestblockhash()

        # Create a block that will be immediately parked by the node so it will
        # not even disconnect.
        # This coinbase is missing the miner fund output
        height = node.getblockcount() + 1
        cb1 = create_coinbase(height)
        block1 = create_block(int(tip, 16), cb1, now, version=4)
        block1.solve()

        # And a second block that builds on top of the first one, which will
        # also be rejected
        cb2 = create_coinbase(height + 1)
        block2 = create_block(int(block1.hash, 16), cb2, now, version=4)
        block2.solve()

        # Send the first block and invalidate it
        with node.assert_debug_log(["policy-bad-miner-fund"]):
            quorum[0].send_message(msg_block(block1))
        with node.wait_for_debug_log(
            [f"Avalanche invalidated block {block1.hash}".encode()],
            chatty_callable=lambda: can_find_inv_in_poll(
                quorum, int(block1.hash, 16), AvalancheVoteError.INVALID
            ),
        ):
            pass

        # Then the second one
        quorum[0].send_message(msg_block(block2))
        with node.wait_for_debug_log(
            [f"Avalanche invalidated block {block2.hash}".encode()],
            chatty_callable=lambda: can_find_inv_in_poll(
                quorum, int(block2.hash, 16), AvalancheVoteError.INVALID
            ),
        ):
            pass

        # We get an INVALIDATED msg for the first block ...
        coinbase_data1 = coinbase_data_from_block(block1.hash)
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                block=pb.MsgBlock(
                    msg_type=pb.BLK_INVALIDATED,
                    block_hash=bytes.fromhex(block1.hash)[::-1],
                    block_height=height,
                    block_timestamp=now,
                    coinbase_data=coinbase_data1,
                )
            ),
        )

        # ... but not for the second one
        ws.timeout = 2
        try:
            ws.recv()
        except TimeoutError as e:
            assert str(e).startswith(
                "No message received"
            ), "The websocket did receive an unexpected message"
            pass
        except Exception:
            assert False, "The websocket did not time out as expected"
            raise
        else:
            assert False, "The websocket did receive an unexpected message"
            raise

        # From now on we stop receiving the block events
        chronik_sub_to_blocks(ws, node, is_unsub=True)

        self.log.info("Testing the subscription to a txid")

        # Mature some coinbase outputs
        wallet = MiniWallet(node)
        tip = self.generate(wallet, 101)[-1]
        self.wait_until(lambda: has_finalized_tip(tip))

        utxo = wallet.get_utxo()
        tx = wallet.create_self_transfer(utxo_to_spend=utxo)
        txid = tx["txid"]

        chronik_sub_txid(ws, node, txid)

        # Tx added to the mempool
        wallet.sendrawtransaction(from_node=node, tx_hex=tx["hex"])
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_ADDED_TO_MEMPOOL,
                    txid=bytes.fromhex(txid)[::-1],
                )
            ),
        )

        # Tx confirmed
        tip = self.generate(wallet, 1)[0]
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_CONFIRMED,
                    txid=bytes.fromhex(txid)[::-1],
                )
            ),
        )

        node.parkblock(tip)
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_ADDED_TO_MEMPOOL,
                    txid=bytes.fromhex(txid)[::-1],
                )
            ),
        )

        conflicting_tx = wallet.create_self_transfer(utxo_to_spend=utxo, fee_rate=1000)

        now += 101
        node.setmocktime(now)

        gbt = node.getblocktemplate()

        miner_fund_amount = gbt["coinbasetxn"]["minerfund"]["minimumvalue"]
        _, _, script_hash = decode(gbt["coinbasetxn"]["minerfund"]["addresses"][0])

        cb = create_coinbase(node.getblockcount() + 1)
        cb.vout = cb.vout[:1]
        cb.vout[0].nValue -= miner_fund_amount
        cb.vout.append(
            CTxOut(
                nValue=miner_fund_amount,
                scriptPubKey=CScript([OP_HASH160, script_hash, OP_EQUAL]),
            )
        )
        pad_tx(cb)

        block = create_block(
            int(node.getbestblockhash(), 16),
            cb,
            now,
            txlist=[FromHex(CTransaction(), conflicting_tx["hex"])],
        )
        block.solve()

        peer = node.add_p2p_connection(P2PDataStore())
        peer.send_blocks_and_test([block], node)

        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_REMOVED_FROM_MEMPOOL,
                    txid=bytes.fromhex(txid)[::-1],
                )
            ),
        )

        node.parkblock(block.hash)
        node.unparkblock(tip)
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_CONFIRMED,
                    txid=bytes.fromhex(txid)[::-1],
                )
            ),
        )

        self.wait_until(lambda: has_finalized_tip(tip))
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_FINALIZED,
                    txid=bytes.fromhex(txid)[::-1],
                    finalization_reason=pb.TxFinalizationReason(
                        finalization_type=pb.TX_FINALIZATION_REASON_POST_CONSENSUS
                    ),
                )
            ),
        )

        chronik_sub_txid(ws, node, txid, is_unsub=True)

        # Build another tx to check the unsubscription
        tx = wallet.create_self_transfer()
        txid = tx["txid"]

        chronik_sub_txid(ws, node, txid)

        # Tx added to the mempool
        wallet.sendrawtransaction(from_node=node, tx_hex=tx["hex"])
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_ADDED_TO_MEMPOOL,
                    txid=bytes.fromhex(txid)[::-1],
                )
            ),
        )

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
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_FINALIZED,
                    txid=bytes.fromhex(txid)[::-1],
                    finalization_reason=pb.TxFinalizationReason(
                        finalization_type=pb.TX_FINALIZATION_REASON_PRE_CONSENSUS
                    ),
                )
            ),
        )

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

        # Create a new tx that will be invalidated
        utxo = wallet.get_utxo()
        tx2 = wallet.create_self_transfer(utxo_to_spend=utxo, fee_rate=1000)
        txid2 = tx2["txid"]
        chronik_sub_txid(ws, node, txid2)

        tx3 = wallet.create_self_transfer(utxo_to_spend=utxo, fee_rate=2000)
        txid3 = tx3["txid"]
        chronik_sub_txid(ws, node, txid3)

        wallet.sendrawtransaction(from_node=node, tx_hex=tx2["hex"])
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_ADDED_TO_MEMPOOL,
                    txid=bytes.fromhex(txid2)[::-1],
                )
            ),
        )

        # It's a conflicting tx so it goes to the conflicting pool, and we
        # expect no message. We can't just use sendrawtransaction here as the tx
        # will be rejected for conflict.
        peer.send_txs_and_test(
            [tx3["tx"]], node, success=False, reject_reason="txn-mempool-conflict"
        )
        assert_equal(node.gettransactionstatus(txid3)["pool"], "conflicting")

        invalidate_tx(txid2)
        # We first get the tx2 removal message, then the conflicting tx3 is
        # added to the mempool, then tx2 is invalidated
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_REMOVED_FROM_MEMPOOL,
                    txid=bytes.fromhex(txid2)[::-1],
                )
            ),
        )
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_ADDED_TO_MEMPOOL,
                    txid=bytes.fromhex(txid3)[::-1],
                )
            ),
        )
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_INVALIDATED,
                    txid=bytes.fromhex(txid2)[::-1],
                )
            ),
        )

        finalize_tx(txid3)
        assert_equal(
            ws.recv(),
            pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=pb.TX_FINALIZED,
                    txid=bytes.fromhex(txid3)[::-1],
                    finalization_reason=pb.TxFinalizationReason(
                        finalization_type=pb.TX_FINALIZATION_REASON_PRE_CONSENSUS
                    ),
                )
            ),
        )

        # Unsubscribe
        chronik_sub_txid(ws, node, txid, is_unsub=True)
        chronik_sub_txid(ws, node, txid2, is_unsub=True)
        chronik_sub_txid(ws, node, txid3, is_unsub=True)

        # Tx confirmed
        tip = self.generate(wallet, 1)[0]
        assert_equal(len(node.getrawmempool()), 0)

        try:
            ws.recv()
        except TimeoutError as e:
            assert str(e).startswith(
                "No message received"
            ), "The websocket did receive an unexpected message"
            pass
        except Exception:
            assert False, "The websocket did not time out as expected"
            raise
        else:
            assert False, "The websocket did receive an unexpected message"
            raise

        ws.close()


if __name__ == "__main__":
    ChronikWsTest().main()
