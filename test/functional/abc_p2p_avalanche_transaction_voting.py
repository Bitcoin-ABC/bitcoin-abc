# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test avalanche transaction voting."""
import random
import time
from decimal import Decimal

from test_framework.avatools import (
    assert_response,
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
from test_framework.blocktools import (
    COINBASE_MATURITY,
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.key import ECPubKey
from test_framework.messages import (
    MSG_TX,
    AvalancheTxVoteError,
    AvalancheVote,
    CInv,
    CTransaction,
    FromHex,
    msg_inv,
    msg_tx,
)
from test_framework.p2p import P2PDataStore, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_raises_rpc_error,
    uint256_hex,
)
from test_framework.wallet import MiniWallet, MiniWalletMode

QUORUM_NODE_COUNT = 16


class AvalancheTransactionVotingTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avalanchepreconsensus=1",
                "-avacooldown=0",
                "-avaproofstakeutxoconfirmations=1",
                # Low enough for coinbase transactions to be staked in valid proofs
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-avastalevotethreshold=256",
            ]
        ]

    def run_test(self):
        node = self.nodes[0]
        poll_node = get_ava_p2p_interface(self, node)
        peer = node.add_p2p_connection(P2PDataStore())

        # Create helper to check expected poll responses
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        # Make some valid txs
        num_txs = 5
        wallet = MiniWallet(node, mode=MiniWalletMode.RAW_P2PK)
        self.generate(wallet, num_txs, sync_fun=self.no_op)

        # Mature the coinbases
        self.generate(node, COINBASE_MATURITY, sync_fun=self.no_op)

        assert_equal(node.getmempoolinfo()["size"], 0)
        tx_ids = [
            int(wallet.send_self_transfer(from_node=node)["txid"], 16)
            for _ in range(num_txs)
        ]
        assert_equal(node.getmempoolinfo()["size"], num_txs)

        self.log.info("Check the votes are unknown while the quorum is not established")

        poll_node.send_poll(tx_ids, MSG_TX)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheTxVoteError.UNKNOWN, txid) for txid in tx_ids],
        )

        # Now disconnect the poll_node. It's not part of the quorum and will be
        # polled but never respond which could cause requests timeouts.
        poll_node.peer_disconnect()
        poll_node.wait_for_disconnect()

        self.log.info("Check the votes on valid mempool transactions")

        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        quorum = get_quorum()
        assert node.getavalancheinfo()["ready_to_poll"]

        poll_node = quorum[0]
        poll_node.send_poll(tx_ids, MSG_TX)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheTxVoteError.ACCEPTED, txid) for txid in tx_ids],
        )

        self.log.info("Check the votes on recently mined transactions")

        self.generate(node, 1, sync_fun=self.no_op)
        assert_equal(node.getmempoolinfo()["size"], 0)

        poll_node.send_poll(tx_ids, MSG_TX)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheTxVoteError.ACCEPTED, txid) for txid in tx_ids],
        )

        for _ in range(10):
            self.generate(node, 1, sync_fun=self.no_op)
            poll_node.send_poll(tx_ids, MSG_TX)
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(AvalancheTxVoteError.ACCEPTED, txid) for txid in tx_ids],
            )

        self.log.info("Check the votes on unknown transactions")

        tx_ids = [random.randint(0, 2**256) for _ in range(10)]
        poll_node.send_poll(tx_ids, MSG_TX)

        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheTxVoteError.UNKNOWN, txid) for txid in tx_ids],
        )

        self.log.info("Check the votes on invalid transactions")

        invalid_tx = CTransaction()
        invalid_txid = int(invalid_tx.rehash(), 16)

        # The node has the NOBAN whitelist flag, so it remains connected
        peer.send_txs_and_test(
            [invalid_tx], node, success=False, reject_reason="bad-txns-vin-empty"
        )
        poll_node.send_poll([invalid_txid], MSG_TX)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheTxVoteError.INVALID, invalid_txid)],
        )

        self.log.info("Check the votes on orphan transactions")

        def from_wallet_tx(tx):
            return FromHex(CTransaction(), tx["hex"])

        orphan_tx = wallet.create_self_transfer_chain(chain_length=2)[-1]
        orphan_txid = int(orphan_tx["txid"], 16)
        peer.send_txs_and_test(
            [from_wallet_tx(orphan_tx)],
            node,
            success=False,
            reject_reason="bad-txns-inputs-missingorspent",
        )
        poll_node.send_poll([orphan_txid], MSG_TX)
        assert_response(
            poll_node, avakey, [AvalancheVote(AvalancheTxVoteError.ORPHAN, orphan_txid)]
        )

        # Let's clean up the non transaction inventories from our avalanche polls
        def has_finalized_proof(proofid):
            can_find_inv_in_poll(quorum, proofid)
            return node.getrawavalancheproof(uint256_hex(proofid))["finalized"]

        for q in quorum:
            self.wait_until(lambda: has_finalized_proof(q.proof.proofid))

        def has_finalized_block(block_hash):
            can_find_inv_in_poll(quorum, int(block_hash, 16))
            return node.isfinalblock(block_hash)

        tip = node.getbestblockhash()
        self.wait_until(lambda: has_finalized_block(tip))

        assert_equal(node.getmempoolinfo()["bytes"], 0)
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], 0)
        assert_equal(node.getmempoolinfo()["finalized_txs_sigchecks"], 0)

        # Now we can focus on transactions
        self.log.info("Check the votes on conflicting transactions")

        utxo = wallet.get_utxo()
        mempool_tx = wallet.create_self_transfer(utxo_to_spend=utxo)
        peer.send_txs_and_test([from_wallet_tx(mempool_tx)], node, success=True)

        assert_equal(len(node.getrawmempool()), 1)
        assert mempool_tx["txid"] in node.getrawmempool()
        mempool_tx_size = node.getmempoolinfo()["bytes"]
        mempool_tx_sigchecks = node.getblocktemplate()["transactions"][0]["sigchecks"]
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], 0)
        assert_equal(node.getmempoolinfo()["finalized_txs_sigchecks"], 0)

        conflicting_tx = wallet.create_self_transfer(utxo_to_spend=utxo)
        conflicting_txid = int(conflicting_tx["txid"], 16)
        peer.send_txs_and_test(
            [from_wallet_tx(conflicting_tx)],
            node,
            success=False,
            reject_reason="txn-mempool-conflict",
        )
        poll_node.send_poll([conflicting_txid], MSG_TX)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheTxVoteError.CONFLICTING, conflicting_txid)],
        )

        self.log.info("Check the node polls for transactions added to the mempool")

        def has_accepted_tx(txid):
            can_find_inv_in_poll(
                quorum,
                int(txid, 16),
                response=AvalancheTxVoteError.ACCEPTED,
                other_response=AvalancheTxVoteError.UNKNOWN,
            )
            return txid in node.getrawmempool()

        def has_finalized_tx(txid):
            return has_accepted_tx(txid) and node.isfinaltransaction(txid)

        def has_rejected_tx(txid):
            can_find_inv_in_poll(
                quorum,
                int(txid, 16),
                response=AvalancheTxVoteError.CONFLICTING,
                other_response=AvalancheTxVoteError.UNKNOWN,
            )
            return txid not in node.getrawmempool()

        def has_invalidated_tx(txid):
            return (
                has_rejected_tx(txid)
                and node.gettransactionstatus(txid)["pool"] == "none"
            )

        self.wait_until(lambda: has_finalized_tx(mempool_tx["txid"]))

        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], mempool_tx_size)
        assert_equal(
            node.getmempoolinfo()["finalized_txs_sigchecks"], mempool_tx_sigchecks
        )

        self.log.info("Check the node rejects txs that conflict with a finalized tx")

        another_conflicting_tx = wallet.create_self_transfer(utxo_to_spend=utxo)
        another_conflicting_txid = int(another_conflicting_tx["txid"], 16)
        peer.send_txs_and_test(
            [from_wallet_tx(another_conflicting_tx)],
            node,
            success=False,
            reject_reason="finalized-tx-conflict",
        )
        # This transaction is plain invalid, so it is NOT stored in the
        # conflicting pool
        assert_equal(
            node.gettransactionstatus(another_conflicting_tx["txid"])["pool"], "none"
        )
        poll_node.send_poll([another_conflicting_txid], MSG_TX)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheTxVoteError.INVALID, another_conflicting_txid)],
        )

        self.log.info("Check the node can mine a finalized tx")

        txid = wallet.send_self_transfer(from_node=node)["txid"]
        assert txid in node.getrawmempool()
        assert not node.isfinaltransaction(txid)
        self.wait_until(lambda: has_finalized_tx(txid))
        assert txid in node.getrawmempool()

        # Bump the time by 5s so we add the new tx to the block template
        now = int(time.time())
        node.setmocktime(now)
        node.bumpmocktime(5)

        finalized_txs_size = node.getmempoolinfo()["finalized_txs_bytes"]
        finalized_tx_sigchecks = sum(
            tx["sigchecks"] for tx in node.getblocktemplate()["transactions"]
        )
        assert_greater_than(finalized_txs_size, mempool_tx_size)
        assert_greater_than(
            node.getmempoolinfo()["finalized_txs_sigchecks"], mempool_tx_sigchecks
        )

        tip = self.generate(node, 1)[0]

        self.log.info("The transaction remains finalized after it's mined")

        assert node.isfinaltransaction(txid, tip)
        assert txid not in node.getrawmempool()
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], finalized_txs_size)
        assert_equal(
            node.getmempoolinfo()["finalized_txs_sigchecks"], finalized_tx_sigchecks
        )

        self.log.info("The transaction remains finalized even when reorg'ed")

        node.parkblock(tip)
        assert node.getbestblockhash() != tip
        assert node.isfinaltransaction(txid)
        assert txid in node.getrawmempool()
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], finalized_txs_size)
        assert_equal(
            node.getmempoolinfo()["finalized_txs_sigchecks"], finalized_tx_sigchecks
        )

        node.unparkblock(tip)
        assert_equal(node.getbestblockhash(), tip)
        assert node.isfinaltransaction(txid, tip)
        assert txid not in node.getrawmempool()
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], finalized_txs_size)
        assert_equal(
            node.getmempoolinfo()["finalized_txs_sigchecks"], finalized_tx_sigchecks
        )

        self.log.info("The transaction remains finalized after the block is finalized")

        self.wait_until(lambda: has_finalized_block(tip))
        assert node.isfinaltransaction(txid, tip)
        assert txid not in node.getrawmempool()
        # At this stage the final transactions live in the block and are removed
        # from the mempool
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], 0)
        assert_equal(node.getmempoolinfo()["finalized_txs_sigchecks"], 0)

        self.log.info("Check the node drops transactions invalidated by avalanche")

        parent_tx = wallet.send_self_transfer(from_node=node)
        parent_txid = parent_tx["txid"]
        child_tx = wallet.send_self_transfer(
            from_node=node, utxo_to_spend=parent_tx["new_utxo"]
        )
        child_txid = child_tx["txid"]

        assert parent_txid in node.getrawmempool()
        assert child_txid in node.getrawmempool()
        assert not node.isfinaltransaction(parent_txid)
        assert not node.isfinaltransaction(child_txid)

        self.wait_until(lambda: has_invalidated_tx(parent_txid))

        assert parent_txid not in node.getrawmempool()
        assert child_txid not in node.getrawmempool()
        assert_raises_rpc_error(
            -5, "No such transaction", node.isfinaltransaction, parent_txid
        )
        assert_raises_rpc_error(
            -5, "No such transaction", node.isfinaltransaction, child_txid
        )

        self.log.info(
            "The node rejects blocks that contains tx conflicting with a finalized one"
        )

        utxo = wallet.get_utxo()
        txid = wallet.send_self_transfer(from_node=node, utxo_to_spend=utxo)["txid"]
        assert txid in node.getrawmempool()
        assert not node.isfinaltransaction(txid)
        self.wait_until(lambda: has_finalized_tx(txid))
        assert txid in node.getrawmempool()

        conflicting_block = create_block(
            int(node.getbestblockhash(), 16),
            create_coinbase(node.getblockcount() - 1),
        )
        conflicting_tx = wallet.create_self_transfer(utxo_to_spend=utxo)["tx"]
        assert conflicting_tx.get_id() != txid

        conflicting_block.vtx.append(conflicting_tx)
        make_conform_to_ctor(conflicting_block)
        conflicting_block.hashMerkleRoot = conflicting_block.calc_merkle_root()
        conflicting_block.solve()

        peer.send_blocks_and_test(
            [conflicting_block],
            node,
            success=False,
            reject_reason="finalized-tx-conflict",
        )

        # The tx is still finalized as the block is rejected
        assert node.isfinaltransaction(txid)
        assert txid in node.getrawmempool()

        # The block is accepted if we remove the offending transaction
        conflicting_block.vtx.remove(conflicting_tx)
        conflicting_block.hashMerkleRoot = conflicting_block.calc_merkle_root()
        conflicting_block.solve()

        peer.send_blocks_and_test(
            [conflicting_block],
            node,
        )

        self.log.info("Check the node stores the conflicting txs")

        tip = self.generate(node, 1)[0]
        assert_equal(node.getrawmempool(), [])

        self.wait_until(lambda: has_finalized_block(tip))

        utxo = wallet.get_utxo()
        mempool_tx = wallet.create_self_transfer(
            utxo_to_spend=utxo, fee_rate=Decimal("2000")
        )
        conflicting_tx = wallet.create_self_transfer(
            utxo_to_spend=utxo, fee_rate=Decimal("3000")
        )

        mempool_tx_obj = from_wallet_tx(mempool_tx)
        peer.send_txs_and_test(
            [mempool_tx_obj],
            node,
            success=True,
        )
        assert mempool_tx["txid"] in node.getrawmempool()

        conflicting_tx_obj = from_wallet_tx(conflicting_tx)
        with node.assert_debug_log([f"stored conflicting tx {conflicting_tx['txid']}"]):
            peer.send_txs_and_test(
                [conflicting_tx_obj],
                node,
                success=False,
                reject_reason="txn-mempool-conflict",
            )

        assert mempool_tx["txid"] in node.getrawmempool()
        assert conflicting_tx["txid"] not in node.getrawmempool()

        self.log.info("Check the node can pull back conflicting txs via avalanche")

        self.wait_until(lambda: has_rejected_tx(mempool_tx["txid"]))
        assert mempool_tx["txid"] not in node.getrawmempool()
        assert conflicting_tx["txid"] in node.getrawmempool()

        self.log.info("Check the node can accept/reject conflicting txs via avalanche")

        self.wait_until(lambda: has_rejected_tx(conflicting_tx["txid"]))
        # The previously rejected transaction is pulled back to the mempool
        assert mempool_tx["txid"] in node.getrawmempool()
        assert conflicting_tx["txid"] not in node.getrawmempool()

        # Rinse and repeat
        self.wait_until(lambda: has_accepted_tx(conflicting_tx["txid"]))
        assert mempool_tx["txid"] not in node.getrawmempool()
        assert conflicting_tx["txid"] in node.getrawmempool()
        self.wait_until(lambda: has_rejected_tx(conflicting_tx["txid"]))
        assert mempool_tx["txid"] in node.getrawmempool()
        assert conflicting_tx["txid"] not in node.getrawmempool()

        # Accept again and finalize
        self.wait_until(lambda: has_finalized_tx(conflicting_tx["txid"]))
        assert mempool_tx["txid"] not in node.getrawmempool()
        assert conflicting_tx["txid"] in node.getrawmempool()

        self.log.info("Check the node can invalidate conflicting txs via avalanche")

        # This is very similar to the previous tests but will end with
        # conflicting_tx being invalidated instead of finalized
        utxo = wallet.get_utxo()
        mempool_tx = wallet.create_self_transfer(
            utxo_to_spend=utxo, fee_rate=Decimal("2000")
        )
        conflicting_tx = wallet.create_self_transfer(
            utxo_to_spend=utxo, fee_rate=Decimal("3000")
        )

        # Send the conflicting tx first so it makes it into the mempool and will
        # be rejected by avalanche.
        conflicting_tx_obj = from_wallet_tx(conflicting_tx)
        peer.send_txs_and_test(
            [conflicting_tx_obj],
            node,
            success=True,
        )
        assert conflicting_tx["txid"] in node.getrawmempool()

        mempool_tx_obj = from_wallet_tx(mempool_tx)
        with node.assert_debug_log([f"stored conflicting tx {mempool_tx['txid']}"]):
            peer.send_txs_and_test(
                [mempool_tx_obj],
                node,
                success=False,
                reject_reason="txn-mempool-conflict",
            )

        assert mempool_tx["txid"] not in node.getrawmempool()
        assert conflicting_tx["txid"] in node.getrawmempool()

        self.wait_until(lambda: has_rejected_tx(conflicting_tx["txid"]))
        assert mempool_tx["txid"] in node.getrawmempool()
        assert conflicting_tx["txid"] not in node.getrawmempool()

        # Also reject the mempool_tx so the conflicting_tx is pulled back to the
        # mempool
        self.wait_until(lambda: has_rejected_tx(mempool_tx["txid"]))
        assert mempool_tx["txid"] not in node.getrawmempool()
        assert conflicting_tx["txid"] in node.getrawmempool()

        self.wait_until(lambda: has_invalidated_tx(conflicting_tx["txid"]))
        assert mempool_tx["txid"] in node.getrawmempool()
        assert conflicting_tx["txid"] not in node.getrawmempool()

        # Now that the conflicting_tx has been invalidated, it will be ignored
        # if submitted again because it's in the recent rejects
        peer.send_txs_and_test(
            [conflicting_tx_obj], node, success=False, expect_disconnect=False
        )

        # mempool_tx is not finalized so we accept another conflicting tx
        another_conflicting_tx = wallet.create_self_transfer(
            utxo_to_spend=utxo, fee_rate=Decimal("4000")
        )
        another_conflicting_tx_obj = from_wallet_tx(another_conflicting_tx)
        with node.assert_debug_log(
            [f"stored conflicting tx {another_conflicting_tx['txid']}"]
        ):
            peer.send_txs_and_test(
                [another_conflicting_tx_obj],
                node,
                success=False,
                expect_disconnect=False,
                reject_reason="txn-mempool-conflict",
            )

        assert mempool_tx["txid"] in node.getrawmempool()
        assert another_conflicting_tx["txid"] not in node.getrawmempool()

        # We can now invalidate both transactions and they will both be removed
        # from all the pools independently of where they used to be. The
        # mempool_tx is polled first, then the conflicting tx once it reaches
        # the mempool
        self.wait_until(lambda: has_rejected_tx(mempool_tx["txid"]))
        assert mempool_tx["txid"] not in node.getrawmempool()
        assert another_conflicting_tx["txid"] in node.getrawmempool()

        self.wait_until(lambda: has_invalidated_tx(mempool_tx["txid"]))
        assert mempool_tx["txid"] not in node.getrawmempool()
        assert another_conflicting_tx["txid"] in node.getrawmempool()

        self.wait_until(lambda: has_rejected_tx(another_conflicting_tx["txid"]))
        assert mempool_tx["txid"] not in node.getrawmempool()
        assert another_conflicting_tx["txid"] not in node.getrawmempool()

        self.wait_until(lambda: has_invalidated_tx(another_conflicting_tx["txid"]))
        assert mempool_tx["txid"] not in node.getrawmempool()
        assert another_conflicting_tx["txid"] not in node.getrawmempool()

        self.log.info("Check all conflicting txs are erased upon finalization")

        wallet.rescan_utxos(include_mempool=True)
        utxo = wallet.get_utxo()
        mempool_tx = wallet.create_self_transfer(
            utxo_to_spend=utxo, fee_rate=Decimal("2000")
        )
        conflicting_txs = [
            wallet.create_self_transfer(utxo_to_spend=utxo, fee_rate=Decimal("3000"))
            for _ in range(5)
        ]

        mempool_tx_obj = from_wallet_tx(mempool_tx)
        peer.send_txs_and_test(
            [mempool_tx_obj],
            node,
            success=True,
        )
        assert mempool_tx["txid"] in node.getrawmempool()

        for conflicting_tx in conflicting_txs:
            conflicting_tx_obj = from_wallet_tx(conflicting_tx)
            with node.assert_debug_log(
                [f"stored conflicting tx {conflicting_tx['txid']}"]
            ):
                peer.send_txs_and_test(
                    [conflicting_tx_obj],
                    node,
                    success=False,
                    reject_reason="txn-mempool-conflict",
                )
            assert conflicting_tx["txid"] not in node.getrawmempool()
            assert_equal(
                node.gettransactionstatus(conflicting_tx["txid"])["pool"], "conflicting"
            )

        self.wait_until(lambda: has_accepted_tx(mempool_tx["txid"]))
        assert mempool_tx["txid"] in node.getrawmempool()
        for conflicting_tx in conflicting_txs:
            assert conflicting_tx["txid"] not in node.getrawmempool()
            assert_equal(
                node.gettransactionstatus(conflicting_tx["txid"])["pool"], "conflicting"
            )

        self.wait_until(lambda: has_finalized_tx(mempool_tx["txid"]))
        assert mempool_tx["txid"] in node.getrawmempool()
        for conflicting_tx in conflicting_txs:
            assert conflicting_tx["txid"] not in node.getrawmempool()
            assert_equal(
                node.gettransactionstatus(conflicting_tx["txid"])["pool"], "none"
            )

            # Sending them again will not add them back because they're all in
            # the recent_reject
            conflicting_tx_obj = from_wallet_tx(conflicting_tx)
            peer.send_txs_and_test(
                [conflicting_tx_obj], node, success=False, expect_disconnect=False
            )

        # A new conflict is rejected because it conflicts with the finalized tx
        another_conflicting_tx = wallet.create_self_transfer(
            utxo_to_spend=utxo, fee_rate=Decimal("4000")
        )
        another_conflicting_tx_obj = from_wallet_tx(another_conflicting_tx)
        with node.assert_debug_log(
            ["finalized-tx-conflict"],
            [f"stored conflicting tx {another_conflicting_tx['txid']}"],
        ):
            peer.send_txs_and_test(
                [another_conflicting_tx_obj],
                node,
                success=False,
                expect_disconnect=False,
                reject_reason="finalized-tx-conflict",
            )

        self.log.info("Check the node drops staled transactions")

        tip = self.generate(wallet, 1)[0]
        assert_equal(node.getrawmempool(), [])

        self.wait_until(lambda: has_finalized_block(tip))

        stalled_tx = wallet.send_self_transfer(from_node=node)
        stalled_txid = stalled_tx["txid"]

        def stale_txid(txid):
            with node.wait_for_debug_log(
                [f"Avalanche stalled tx {txid}".encode()],
                chatty_callable=lambda: can_find_inv_in_poll(
                    quorum,
                    int(txid, 16),
                    response=AvalancheTxVoteError.UNKNOWN,
                    other_response=AvalancheTxVoteError.UNKNOWN,
                ),
            ):
                pass

        stale_txid(stalled_txid)
        assert stalled_txid not in node.getrawmempool()

        # Exhaust the inflight polls
        while can_find_inv_in_poll(
            quorum,
            int(stalled_txid, 16),
            response=AvalancheTxVoteError.UNKNOWN,
            other_response=AvalancheTxVoteError.UNKNOWN,
        ):
            pass

        self.log.info("Check the node can re-download a stalled transaction")

        with p2p_lock:
            [p.last_message.clear() for p in quorum]

        announcing_peer = node.add_p2p_connection(P2PDataStore())
        announcing_peer.send_message(
            msg_inv(
                [
                    CInv(MSG_TX, int(stalled_txid, 16)),
                ]
            )
        )
        announcing_peer.sync_with_ping()
        announcing_peer.wait_for_getdata([int(stalled_txid, 16)])
        announcing_peer.send_and_ping(
            msg_tx(FromHex(CTransaction(), stalled_tx["hex"]))
        )

        self.wait_until(lambda: stalled_txid in node.getrawmempool())

        # It is also relayed by the node
        [p.wait_for_inv([CInv(MSG_TX, int(stalled_txid, 16))]) for p in quorum]

        # It will be polled again and can now be finalized
        self.wait_until(lambda: has_finalized_tx(stalled_txid))


if __name__ == "__main__":
    AvalancheTransactionVotingTest().main()
