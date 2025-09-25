# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test avalanche transaction finalization."""

from test_framework.avatools import (
    assert_response,
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
from test_framework.blocktools import COINBASE_MATURITY, create_block, create_coinbase
from test_framework.key import ECPubKey
from test_framework.messages import (
    MSG_TX,
    AvalancheTxVoteError,
    AvalancheVote,
    CTransaction,
    FromHex,
    ToHex,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_greater_than_or_equal, uint256_hex
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16
THE_FUTURE = 2100000000
REPLAY_PROTECTION = THE_FUTURE + 100000000


class AvalancheTransactionFinalizationTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avacooldown=0",
                "-avaproofstakeutxoconfirmations=1",
                # Low enough for coinbase transactions to be staked in valid proofs
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                # So we can build arbitrary size txs using several OP_RETURN outputs
                "-acceptnonstdtxn",
                # So we can reinit between the tests
                "-persistavapeers=0",
                # Make the test faster by avoiding unwanted polls
                "-avalanchestakingpreconsensus=0",
                f"-shibusawaactivationtime={THE_FUTURE}",
                f"-replayprotectionactivationtime={REPLAY_PROTECTION}",
            ]
        ]

    def finalize_tip(self, **kwargs):
        tip = self.nodes[0].getbestblockhash()

        def vote_until_final():
            can_find_inv_in_poll(
                self.quorum,
                int(tip, 16),
                response=AvalancheTxVoteError.ACCEPTED,
                other_response=AvalancheTxVoteError.UNKNOWN,
                **kwargs,
            )
            return self.nodes[0].isfinalblock(tip)

        self.wait_until(vote_until_final)

    def finalize_tx(self, txid, other_response=AvalancheTxVoteError.ACCEPTED, **kwargs):
        def vote_until_final():
            can_find_inv_in_poll(
                self.quorum,
                txid,
                response=AvalancheTxVoteError.ACCEPTED,
                other_response=other_response,
                **kwargs,
            )
            return self.nodes[0].isfinaltransaction(uint256_hex(txid))

        self.wait_until(vote_until_final)

    def test_simple_txs(self):
        self.log.info("Check the finalization of simple non-chained txs")

        node = self.nodes[0]

        # Make some valid txs
        num_txs = 5
        self.generate(self.wallet, num_txs)
        self.finalize_tip()

        assert_equal(node.getmempoolinfo()["size"], 0)
        txids = [
            int(self.wallet.send_self_transfer(from_node=node)["txid"], 16)
            for _ in range(num_txs)
        ]
        assert_equal(node.getmempoolinfo()["size"], num_txs)

        for txid in txids:
            self.finalize_tx(txid)

        # Mine one more block, wait for it to be finalized while checking none
        # of the finalized txs are part of the polled items
        self.generate(self.wallet, 1)
        self.finalize_tip(unexpected_hashes=txids)

    def test_chained_txs(self):
        self.log.info("Check the finalization of chained txs")

        node = self.nodes[0]

        # Make some valid chained txs
        num_txs = 5
        self.generate(self.wallet, num_txs)
        self.finalize_tip()

        assert_equal(node.getmempoolinfo()["size"], 0)
        txs = self.wallet.send_self_transfer_chain(from_node=node, chain_length=num_txs)
        assert_equal(node.getmempoolinfo()["size"], num_txs)

        # Keep the chain ordering. We only vote for the penultimate child tx
        txids = [tx["txid"] for tx in txs]
        with node.assert_debug_log(
            [f"Avalanche finalized tx {txid}" for txid in txids[:-1]], timeout=60
        ):
            self.finalize_tx(
                int(txids[-2], 16), other_response=AvalancheTxVoteError.UNKNOWN
            )

        # The ancestors should all be final as well
        assert all(node.isfinaltransaction(txid) for txid in txids[:-1])
        # But not the descendant
        assert not node.isfinaltransaction(txids[-1])

        # Mine one more block, wait for it to be finalized while checking none
        # of the finalized txs are part of the polled items
        self.generate(self.wallet, 1)
        self.finalize_tip(unexpected_hashes=txids[:-1])

    def test_diamond_txs(self):
        self.log.info("Check the finalization of diamond shaped tx chains")

        node = self.nodes[0]

        #       --> tx2 --
        #     /            \
        # tx1                --> tx4
        #     \            /
        #       --> tx3 --
        #               \
        #                 --> tx5
        num_txs = 5
        self.generate(self.wallet, num_txs)
        self.finalize_tip()

        assert_equal(node.getmempoolinfo()["size"], 0)
        tx1 = self.wallet.create_self_transfer_multi(num_outputs=2)
        tx2 = self.wallet.create_self_transfer(utxo_to_spend=tx1["new_utxos"][0])
        tx3 = self.wallet.create_self_transfer_multi(
            utxos_to_spend=[tx1["new_utxos"][1]], num_outputs=2
        )
        tx4 = self.wallet.create_self_transfer_multi(
            utxos_to_spend=[tx2["new_utxo"], tx3["new_utxos"][0]]
        )
        tx5 = self.wallet.create_self_transfer(utxo_to_spend=tx3["new_utxos"][1])

        txids = [
            self.wallet.sendrawtransaction(from_node=node, tx_hex=tx["hex"])
            for tx in (tx1, tx2, tx3, tx4, tx5)
        ]
        assert_equal(node.getmempoolinfo()["size"], num_txs)

        # Finalizing tx4 should finalize all the ancestors as well
        self.finalize_tx(
            int(txids[-2], 16), other_response=AvalancheTxVoteError.UNKNOWN
        )
        assert all(node.isfinaltransaction(txid) for txid in txids[:-1])

        # But not tx5
        assert not node.isfinaltransaction(txids[-1])

        # Mine one more block, wait for it to be finalized while checking none
        # of the finalized txs are part of the polled items
        self.generate(self.wallet, 1)
        self.finalize_tip(unexpected_hashes=txids[:-1])

    def test_block_full(self):
        self.log.info("Check the finalization of tx when the next block is full")

        # Anything below 14241 will prevent transaction from being added
        # to blocks. This is because the block reserves 100 sigchecks
        # for the coinbase transaction, and max sigchecks is computed as
        # 141 x block size. So we need at least 101 sigchecks >= 14241
        # bytes as block size.
        blockmaxsize = 15000
        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [
                f"-blockmaxsize={blockmaxsize}",
                f"-mocktime={self.now}",
            ],
        )
        self.init()

        node = self.nodes[0]

        self.generate(self.wallet, 30)
        self.finalize_tip()

        # The block has 1000 bytes reserved for the coinbase tx, and the block
        # max size is 15000 bytes. Let's build 13 txs of size 1000 and finalize
        # them so we fill up to 14000/15000
        num_txs = 13
        assert_equal(node.getmempoolinfo()["size"], 0)
        filler_txs = [
            self.wallet.send_self_transfer(from_node=node, target_size=1000)
            for _ in range(num_txs)
        ]

        for tx in filler_txs:
            self.finalize_tx(int(tx["txid"], 16))

        assert_equal(node.getmempoolinfo()["size"], num_txs)
        assert_equal(node.getmempoolinfo()["bytes"], 13000)
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], 13000)

        # Lets build a chain of 8 txs of size 200 each. Each individual tx would
        # fit the block, but the chain would not. Only 4 txs can make it into
        # the block (size should be < 15000 but not equal).
        chained_txs = self.wallet.send_self_transfer_chain(
            from_node=node, chain_length=8, target_size=200
        )
        assert_equal(node.getmempoolinfo()["size"], num_txs + 8)
        assert_equal(node.getmempoolinfo()["bytes"], 14600)
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], 13000)

        # We can finalize the first 4 txs but not the last 4
        mempool = node.getrawmempool()
        for tx in chained_txs[:4]:
            assert tx["txid"] in mempool
            self.finalize_tx(int(tx["txid"], 16))
        for tx in chained_txs[4:]:
            assert tx["txid"] in mempool
            assert not node.isfinaltransaction(tx["txid"])

        assert_equal(node.getmempoolinfo()["size"], num_txs + 8)
        assert_equal(node.getmempoolinfo()["bytes"], 14600)
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], 13800)

        # Add another tx to the chain. This tx size is 100 bytes, so it gets
        # polled and will be dropped upon finalization because the chain
        # (this tx + the last 4 txs from the chain) won't fit the next block.
        last_tx = self.wallet.send_self_transfer(
            from_node=node, target_size=100, utxo_to_spend=chained_txs[-1]["new_utxo"]
        )
        last_txid = last_tx["txid"]
        with node.wait_for_debug_log(
            [
                f"Delay storing finalized tx {last_txid} as it won't fit in the next block".encode()
            ],
            chatty_callable=lambda: can_find_inv_in_poll(
                self.quorum,
                int(last_txid, 16),
                response=AvalancheTxVoteError.ACCEPTED,
            ),
        ):
            pass

        mempool = node.getrawmempool()
        tx_list = chained_txs[4:] + [last_tx]
        for tx in tx_list:
            assert tx["txid"] in mempool
            assert not node.isfinaltransaction(tx["txid"])

        assert_equal(node.getmempoolinfo()["size"], num_txs + 9)
        assert_equal(node.getmempoolinfo()["bytes"], 14700)
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], 13800)

        # Add a transaction that will not get polled because it doesn't fit
        big_tx = self.wallet.send_self_transfer(
            from_node=node,
            target_size=2000,
        )
        assert big_tx["txid"] in node.getrawmempool()
        assert_equal(node.getmempoolinfo()["size"], num_txs + 10)
        assert_equal(node.getmempoolinfo()["bytes"], 16700)
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], 13800)

        # This tx will not be polled. We can check this by looking at the vote
        # status from the node
        poll_node = self.quorum[0]
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))
        txid = int(big_tx["txid"], 16)
        poll_node.send_poll([txid], MSG_TX)
        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(-3, txid)],
        )

        # Mine the finalized txs
        txs_to_mine = [
            FromHex(CTransaction(), tx["hex"]) for tx in filler_txs + chained_txs[:4]
        ]
        coinbase = create_coinbase(node.getblockcount() + 1)
        block = create_block(
            hashprev=int(node.getbestblockhash(), 16),
            coinbase=coinbase,
            txlist=txs_to_mine,
            ntime=self.now + 600,
        )
        block.calc_merkle_root()
        block.solve()
        node.submitblock(ToHex(block))
        assert_equal(node.getbestblockhash(), block.hash_hex)

        self.finalize_tip()

        assert_equal(node.getmempoolinfo()["size"], 6)
        assert_equal(node.getmempoolinfo()["bytes"], 4 * 200 + 100 + 2000)
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], 0)

        mempool = node.getrawmempool()
        for tx in tx_list:
            assert tx["txid"] in mempool
            self.finalize_tx(
                int(tx["txid"], 16),
                unexpected_hashes=[
                    int(bad_tx["txid"], 16) for bad_tx in (filler_txs + chained_txs[:4])
                ],
            )

        assert_equal(node.getmempoolinfo()["size"], 6)
        assert_equal(node.getmempoolinfo()["bytes"], 4 * 200 + 100 + 2000)
        assert_equal(node.getmempoolinfo()["finalized_txs_bytes"], 4 * 200 + 100 + 2000)

    def test_blockmintxfee(self):
        self.log.info(
            "Check the finalization of tx when the fee is below blockmintxfee"
        )

        # Fee rate in XEC/kB
        blockmintxfee = 20
        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [
                f"-blockmintxfee={blockmintxfee}",
                f"-mocktime={self.now}",
            ],
        )
        self.init()

        node = self.nodes[0]

        self.generate(self.wallet, 10)
        self.finalize_tip()

        txs = []
        # Fee rate in XEC/kB
        for fee_rate in range(blockmintxfee - 5, blockmintxfee + 5, 1):
            # Make sure to not include unconfirmed utxos! Otherwise may create
            # unexpected tx dependencies
            tx = self.wallet.send_self_transfer(
                from_node=node, target_size=100, fee_rate=fee_rate, confirmed_only=True
            )
            assert tx["txid"] in node.getrawmempool()
            txs.append(tx)

        # Only the last 5 txs are polled, the first 5 are not because they won't
        # make it into the next block
        for tx in txs[5:]:
            self.finalize_tx(
                int(tx["txid"], 16),
                unexpected_hashes=[
                    int(low_fee_tx["txid"], 16) for low_fee_tx in txs[:5]
                ],
            )

        # Mine the block: only the last 5 txs are mined as expected since the 5
        # first are below blockmintxfee
        self.generate(self.wallet, 1)
        assert_equal(
            sorted(node.getrawmempool()), sorted([tx["txid"] for tx in txs[:5]])
        )

    def test_expiry(self):
        self.log.info("Check the finalized txs can't expire")

        mempool_expiry_hours = 1
        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [f"-mempoolexpiry={mempool_expiry_hours}", f"-mocktime={self.now}"],
        )
        self.init()

        node = self.nodes[0]

        # Make some valid chained txs
        num_txs = 3
        self.generate(self.wallet, num_txs + 1)
        self.finalize_tip()

        assert_equal(node.getmempoolinfo()["size"], 0)
        txs = self.wallet.send_self_transfer_chain(from_node=node, chain_length=num_txs)
        assert_equal(node.getmempoolinfo()["size"], num_txs)

        # Finalize them all by finalizing the last tx in the chain
        txids = [tx["txid"] for tx in txs]
        self.finalize_tx(
            int(txids[-1], 16), other_response=AvalancheTxVoteError.UNKNOWN
        )
        assert all(node.isfinaltransaction(txid) for txid in txids)

        # Move the time forward so all the chain is eligible for expiration
        self.now += mempool_expiry_hours * 3600 + 1
        node.setmocktime(self.now)

        # Add another transaction to the mempool to trigger the expiration check
        with node.assert_debug_log(
            [f"Not expiring {len(txids)} finalized transaction"]
        ):
            trigger_tx = self.wallet.send_self_transfer(from_node=node)
            assert_equal(node.getmempoolinfo()["size"], num_txs + 1)
            assert trigger_tx["txid"] in node.getrawmempool()

    def test_mempool_full(self):
        self.log.info(
            "Check the finalized txs can't be evicted when the mempool is full"
        )

        max_mempool_mb = 5
        self.restart_node(
            0,
            extra_args=self.extra_args[0]
            + [
                f"-maxmempool={max_mempool_mb}",
                f"-mocktime={self.now}",
            ],
        )
        self.init()

        node = self.nodes[0]

        max_mempool = 1_000_000 * max_mempool_mb
        big_tx_size = 100_000

        num_finalized_txs = 10
        # We create num_finalized_txs finalized txs + enough big txs to overflow the mempool.
        # This number is overestimated because of the memory overhead of the mempool data structures.
        num_txs = num_finalized_txs + max_mempool // big_tx_size + 1

        self.generate(self.wallet, num_txs)
        self.finalize_tip()

        low_feerate = 1000
        high_feerate = 2 * low_feerate
        very_high_feerate = 2 * high_feerate

        assert_equal(node.getmempoolinfo()["size"], 0)

        # Add some txs with a low feerate
        txs = []
        for _ in range(5):
            txs.append(
                self.wallet.send_self_transfer(
                    from_node=node, target_size=1000, fee_rate=low_feerate
                )
            )

        # Also a chain of high fee txs with a low fee child
        txs.extend(
            self.wallet.send_self_transfer_chain(
                from_node=node,
                target_size=1000,
                fee_rate=very_high_feerate,
                chain_length=4,
            )
        )
        txs.append(
            self.wallet.send_self_transfer(
                from_node=node,
                utxo_to_spend=txs[-1]["new_utxo"],
                target_size=1000,
                fee_rate=low_feerate,
            )
        )

        assert_equal(node.getmempoolinfo()["size"], num_finalized_txs)

        # Finalize them all
        finalized_txids = [tx["txid"] for tx in txs]
        [self.finalize_tx(int(txid, 16)) for txid in finalized_txids]

        assert_equal(node.getmempoolinfo()["bytes"], 1000 * num_finalized_txs)

        # Time to fill up our mempool with high feerate txs
        while node.getmempoolinfo()["usage"] + big_tx_size < max_mempool:
            self.wallet.send_self_transfer(
                from_node=node, target_size=big_tx_size, fee_rate=high_feerate
            )

        assert_greater_than_or_equal(
            node.getmempoolinfo()["usage"], max_mempool - big_tx_size
        )

        # The next big tx will overflow the mempool and trigger eviction
        mempool_num_txs = node.getmempoolinfo()["size"]
        # 4 of the finalized txs are very high fee and are not even considered
        with node.assert_debug_log(
            [f"Not evicting {num_finalized_txs - 4} finalized txn for low fee"]
        ):
            # Make sure this tx isn't getting evicted by bumping its fee rate
            self.wallet.send_self_transfer(
                from_node=node, target_size=big_tx_size, fee_rate=very_high_feerate
            )

        assert_greater_than_or_equal(node.getmempoolinfo()["size"], mempool_num_txs)
        assert_greater_than_or_equal(
            node.getmempoolinfo()["usage"], max_mempool - big_tx_size
        )

        raw_mempool = node.getrawmempool()
        assert all(txid in raw_mempool for txid in finalized_txids)

        # Cleanup: empty the mempool
        while node.getmempoolinfo()["size"] > 0:
            self.generate(self.wallet, 1)

    def init(self):
        # Activate preconsensus
        self.now = THE_FUTURE
        self.nodes[0].setmocktime(self.now)

        self.generate(self.nodes[0], 6)
        assert self.nodes[0].getinfo()["avalanche_preconsensus"]

        def get_quorum():
            return [
                get_ava_p2p_interface(self, self.nodes[0])
                for _ in range(0, QUORUM_NODE_COUNT)
            ]

        self.quorum = get_quorum()
        assert self.nodes[0].getavalancheinfo()["ready_to_poll"]

        # Let's clean up the non transaction inventories from our avalanche polls
        def has_finalized_proof(proofid):
            can_find_inv_in_poll(self.quorum, proofid)
            return self.nodes[0].getrawavalancheproof(uint256_hex(proofid))["finalized"]

        for q in self.quorum:
            self.wait_until(lambda: has_finalized_proof(q.proof.proofid))

        self.finalize_tip()

        self.wallet = MiniWallet(self.nodes[0])
        # Mature the coinbases
        self.generate(self.wallet, COINBASE_MATURITY)

    def run_test(self):
        self.init()

        self.test_simple_txs()
        self.test_chained_txs()
        self.test_diamond_txs()
        self.test_block_full()
        self.test_blockmintxfee()
        self.test_expiry()
        self.test_mempool_full()


if __name__ == "__main__":
    AvalancheTransactionFinalizationTest().main()
