# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test mempool limiting together/eviction with the wallet."""

from decimal import Decimal

from test_framework.blocktools import COINBASE_MATURITY
from test_framework.messages import XEC
from test_framework.p2p import P2PTxInvStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_fee_amount,
    assert_greater_than,
    assert_raises_rpc_error,
    create_lots_of_big_transactions,
    gen_return_txouts,
)
from test_framework.wallet import DEFAULT_FEE, MiniWallet


class MempoolLimitTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                "-acceptnonstdtxn=1",
                "-maxmempool=5",
                "-spendzeroconfchange=0",
            ]
        ]
        self.supports_cli = False

    def fill_mempool(self):
        """Fill mempool until eviction."""
        self.log.info(
            "Fill the mempool until eviction is triggered and the mempoolminfee rises"
        )
        txouts = gen_return_txouts()
        node = self.nodes[0]
        miniwallet = self.wallet
        relayfee = node.getnetworkinfo()["relayfee"]

        tx_batch_size = 1
        num_of_batches = 75
        # Generate UTXOs to flood the mempool
        # 1 to create a tx initially that will be evicted from the mempool later
        # 75 transactions each with a fee rate much higher than the previous one
        # And 1 more to verify that this tx does not get added to the mempool
        # with a fee rate less than the mempoolminfee
        # And 2 more for the package cpfp test
        self.generate(miniwallet, 1 + (num_of_batches * tx_batch_size))

        # Mine 99 blocks so that the UTXOs are allowed to be spent
        self.generate(node, COINBASE_MATURITY - 1)

        self.log.debug("Create a mempool tx that will be evicted")
        tx_to_be_evicted_id = miniwallet.send_self_transfer(
            from_node=node, fee_rate=relayfee
        )["txid"]

        # Increase the tx fee rate to give the subsequent transactions a higher
        # priority in the mempool. The tx has an approx. vsize of 65k, i.e.
        # multiplying the previous fee rate (in sats/kvB) by 130 should result
        # in a fee that corresponds to 2x of that fee rate
        base_fee = relayfee * 130

        self.log.debug("Fill up the mempool with txs with higher fee rate")
        with node.assert_debug_log(["rolling minimum fee bumped"]):
            for batch_of_txid in range(num_of_batches):
                fee = (batch_of_txid + 1) * base_fee
                create_lots_of_big_transactions(
                    miniwallet, node, fee, tx_batch_size, txouts
                )

        self.log.debug("The tx should be evicted by now")
        # The number of transactions created should be greater than the ones
        # present in the mempool
        assert_greater_than(tx_batch_size * num_of_batches, len(node.getrawmempool()))
        # Initial tx created should not be present in the mempool anymore as it
        # had a lower fee rate
        assert tx_to_be_evicted_id not in node.getrawmempool()

        self.log.debug("Check that mempoolminfee is larger than minrelaytxfee")
        assert_equal(node.getmempoolinfo()["minrelaytxfee"], Decimal("10.00"))
        assert_greater_than(node.getmempoolinfo()["mempoolminfee"], Decimal("10.00"))

    def test_mid_package_eviction(self):
        node = self.nodes[0]
        self.log.info(
            "Check a package where each parent passes the current mempoolminfee but would cause eviction before package submission terminates"
        )

        self.restart_node(0, extra_args=self.extra_args[0])

        # Restarting the node resets mempool minimum feerate
        assert_equal(node.getmempoolinfo()["minrelaytxfee"], Decimal("10"))
        assert_equal(node.getmempoolinfo()["mempoolminfee"], Decimal("10"))

        self.fill_mempool()
        current_info = node.getmempoolinfo()
        mempoolmin_feerate = current_info["mempoolminfee"]

        package_hex = []
        # UTXOs to be spent by the ultimate child transaction
        parent_utxos = []

        evicted_size = 8000
        # Mempool transaction which is evicted due to being at the "bottom" of the mempool when the
        # mempool overflows and evicts by descendant score. It's important that the eviction doesn't
        # happen in the middle of package evaluation, as it can invalidate the coins cache.
        mempool_evicted_tx = self.wallet.send_self_transfer(
            from_node=node,
            fee=(mempoolmin_feerate / 1000) * evicted_size + Decimal("10"),
            target_size=evicted_size,
            confirmed_only=True,
        )
        # Already in mempool when package is submitted.
        assert mempool_evicted_tx["txid"] in node.getrawmempool()

        # This parent spends the above mempool transaction that exists when its inputs are first
        # looked up, but disappears later. It is rejected for being too low fee (but eligible for
        # reconsideration), and its inputs are cached. When the mempool transaction is evicted, its
        # coin is no longer available, but the cache could still contains the tx.
        cpfp_parent = self.wallet.create_self_transfer(
            utxo_to_spend=mempool_evicted_tx["new_utxo"],
            fee_rate=mempoolmin_feerate - Decimal("10"),
            confirmed_only=True,
        )
        package_hex.append(cpfp_parent["hex"])
        parent_utxos.append(cpfp_parent["new_utxo"])
        assert_equal(
            node.testmempoolaccept([cpfp_parent["hex"]])[0]["reject-reason"],
            "mempool min fee not met",
        )

        self.wallet.rescan_utxos()

        # Series of parents that don't need CPFP and are submitted individually. Each one is large and
        # high feerate, which means they should trigger eviction but not be evicted.
        parent_size = 25000
        num_big_parents = 3
        assert_greater_than(
            parent_size * num_big_parents,
            current_info["maxmempool"] - current_info["usage"],
        )
        parent_fee = (100 * mempoolmin_feerate / 1000) * parent_size

        big_parent_txids = []
        for i in range(num_big_parents):
            parent = self.wallet.create_self_transfer(
                fee=parent_fee, target_size=parent_size, confirmed_only=True
            )
            parent_utxos.append(parent["new_utxo"])
            package_hex.append(parent["hex"])
            big_parent_txids.append(parent["txid"])
            # There is room for each of these transactions independently
            assert node.testmempoolaccept([parent["hex"]])[0]["allowed"]

        # Create a child spending everything, bumping cpfp_parent just above mempool minimum
        # feerate. It's important not to bump too much as otherwise mempool_evicted_tx would not be
        # evicted, making this test much less meaningful.
        approx_child_vsize = self.wallet.create_self_transfer_multi(
            utxos_to_spend=parent_utxos
        )["tx"].billable_size()
        cpfp_fee = (mempoolmin_feerate / 1000) * (
            cpfp_parent["tx"].billable_size() + approx_child_vsize
        ) - cpfp_parent["fee"]
        # Specific number of satoshis to fit within a small window. The parent_cpfp + child package needs to be
        # - When there is mid-package eviction, high enough feerate to meet the new mempoolminfee
        # - When there is no mid-package eviction, low enough feerate to be evicted immediately after submission.
        magic_satoshis = 1200
        cpfp_satoshis = int(cpfp_fee * XEC) + magic_satoshis

        child = self.wallet.create_self_transfer_multi(
            utxos_to_spend=parent_utxos, fee_per_output=cpfp_satoshis
        )
        package_hex.append(child["hex"])

        # Package should be submitted, temporarily exceeding maxmempool, and then evicted.
        with node.assert_debug_log(expected_msgs=["rolling minimum fee bumped"]):
            assert_equal(
                node.submitpackage(package_hex)["package_msg"], "transaction failed"
            )

        # Maximum size must never be exceeded.
        assert_greater_than(
            node.getmempoolinfo()["maxmempool"], node.getmempoolinfo()["bytes"]
        )

        # Evicted transaction and its descendants must not be in mempool.
        resulting_mempool_txids = node.getrawmempool()
        assert mempool_evicted_tx["txid"] not in resulting_mempool_txids
        assert cpfp_parent["txid"] not in resulting_mempool_txids
        assert child["txid"] not in resulting_mempool_txids
        for txid in big_parent_txids:
            assert txid in resulting_mempool_txids

    def run_test(self):
        node = self.nodes[0]
        self.wallet = MiniWallet(node)
        miniwallet = self.wallet

        # Generate coins needed to create transactions in the subtests (excluding coins used in fill_mempool).
        self.generate(miniwallet, 20)

        relayfee = node.getnetworkinfo()["relayfee"]
        self.log.info("Check that mempoolminfee is minrelaytxfee")
        assert_equal(node.getmempoolinfo()["minrelaytxfee"], Decimal("10"))
        assert_equal(node.getmempoolinfo()["mempoolminfee"], Decimal("10"))

        self.fill_mempool()

        # Deliberately try to create a tx with a fee less than the minimum
        # mempool fee to assert that it does not get added to the mempool
        self.log.info("Create a mempool tx that will not pass mempoolminfee")
        assert_raises_rpc_error(
            -26,
            "mempool min fee not met",
            miniwallet.send_self_transfer,
            from_node=node,
            fee_rate=relayfee,
        )

        self.log.info(
            "Check that submitpackage allows cpfp of a parent below mempool min feerate"
        )
        node = self.nodes[0]
        peer = node.add_p2p_connection(P2PTxInvStore())

        # Package with 2 parents and 1 child. One parent has a high feerate due
        # to modified fees, another is below the mempool minimum feerate but
        # bumped by the child.
        tx_poor = miniwallet.create_self_transfer(fee_rate=relayfee)
        tx_rich = miniwallet.create_self_transfer(fee=0, fee_rate=0)
        node.prioritisetransaction(tx_rich["txid"], 0, int(DEFAULT_FEE * XEC))
        package_txns = [tx_rich, tx_poor]
        coins = [tx["new_utxo"] for tx in package_txns]
        # DEFAULT_FEE
        tx_child = miniwallet.create_self_transfer_multi(
            utxos_to_spend=coins, fee_per_output=10000
        )
        package_txns.append(tx_child)

        submitpackage_result = node.submitpackage([tx["hex"] for tx in package_txns])
        assert_equal(submitpackage_result["package_msg"], "success")

        rich_parent_result = submitpackage_result["tx-results"][tx_rich["txid"]]
        poor_parent_result = submitpackage_result["tx-results"][tx_poor["txid"]]
        child_result = submitpackage_result["tx-results"][tx_child["txid"]]
        assert_fee_amount(
            poor_parent_result["fees"]["base"], tx_poor["tx"].billable_size(), relayfee
        )
        assert_equal(rich_parent_result["fees"]["base"], 0)
        assert_equal(child_result["fees"]["base"], DEFAULT_FEE)
        # The "rich" parent does not require CPFP so its effective feerate is
        # just its individual feerate.
        assert_fee_amount(
            DEFAULT_FEE,
            tx_rich["tx"].billable_size(),
            rich_parent_result["fees"]["effective-feerate"],
        )
        assert_equal(
            rich_parent_result["fees"]["effective-includes"], [tx_rich["txid"]]
        )
        # The "poor" parent and child's effective feerates are the same,
        # composed of their total fees divided by their combined vsize.
        # Note that vsize == size in this test
        package_fees = poor_parent_result["fees"]["base"] + child_result["fees"]["base"]
        package_vsize = tx_poor["tx"].billable_size() + tx_child["tx"].billable_size()
        assert_fee_amount(
            package_fees, package_vsize, poor_parent_result["fees"]["effective-feerate"]
        )
        assert_fee_amount(
            package_fees, package_vsize, child_result["fees"]["effective-feerate"]
        )
        assert_equal(
            [tx_poor["txid"], tx_child["txid"]],
            poor_parent_result["fees"]["effective-includes"],
        )
        assert_equal(
            [tx_poor["txid"], tx_child["txid"]],
            child_result["fees"]["effective-includes"],
        )

        # The node will broadcast each transaction, still abiding by its peer's
        # fee filter
        peer.wait_for_broadcast([tx["txid"] for tx in package_txns])

        self.log.info(
            "Check a package that passes mempoolminfee but is evicted immediately after submission"
        )

        # Fill up the mempool until 60k < remaining_mempool_bytes < 90k
        max_mempool = node.getmempoolinfo()["maxmempool"]
        num_txs_to_almost_fill = (max_mempool - 90000) // 30000 + 1
        self.generate(miniwallet, num_txs_to_almost_fill)
        self.generate(node, 1)
        tx_size = 30000
        fee = node.getmempoolinfo()["mempoolminfee"] / 1000 * tx_size
        while (
            remaining_mempool_bytes := max_mempool - node.getmempoolinfo()["usage"]
        ) > 100000:
            miniwallet.send_self_transfer(from_node=node, target_size=tx_size, fee=fee)

        mempoolmin_feerate = node.getmempoolinfo()["mempoolminfee"]
        current_mempool = node.getrawmempool(verbose=False)
        worst_feerate_xecvb = Decimal("21000000000000")
        for txid in current_mempool:
            entry = node.getmempoolentry(txid)
            worst_feerate_xecvb = min(worst_feerate_xecvb, entry["fees"]["modified"])

        # Needs to be large enough to trigger eviction
        target_size_each = 50000
        assert_greater_than(remaining_mempool_bytes, target_size_each)
        assert_greater_than(target_size_each * 2, remaining_mempool_bytes)

        # Should be a true CPFP: parent's feerate is just below mempool min feerate
        parent_fee = mempoolmin_feerate / 1000 * target_size_each - Decimal("10")
        # Parent + child is above mempool minimum feerate
        child_fee = worst_feerate_xecvb / 1000 * target_size_each - Decimal("10")
        # However, when eviction is triggered, these transactions should be at the bottom.
        # This assertion assumes parent and child are the same size.
        tx_parent_just_below = miniwallet.create_self_transfer(
            fee=parent_fee, target_size=target_size_each
        )
        tx_child_just_above = miniwallet.create_self_transfer(
            utxo_to_spend=tx_parent_just_below["new_utxo"],
            fee=child_fee,
            target_size=target_size_each,
        )
        assert not tx_parent_just_below["txid"] in node.getrawmempool()
        assert not tx_child_just_above["txid"] in node.getrawmempool()
        # This package ranks below the lowest tx in the mempool
        assert_greater_than(
            worst_feerate_xecvb,
            (parent_fee + child_fee)
            / (
                tx_parent_just_below["tx"].billable_size()
                + tx_child_just_above["tx"].billable_size()
            ),
        )
        assert_greater_than(
            mempoolmin_feerate,
            (parent_fee) / (tx_parent_just_below["tx"].billable_size()),
        )
        assert_greater_than(
            (parent_fee + child_fee)
            / (
                tx_parent_just_below["tx"].billable_size()
                + tx_child_just_above["tx"].billable_size()
            ),
            mempoolmin_feerate / 1000,
        )
        res = node.submitpackage(
            [tx_parent_just_below["hex"], tx_child_just_above["hex"]]
        )
        for txid in [tx_parent_just_below["txid"], tx_child_just_above["txid"]]:
            assert_equal(res["tx-results"][txid]["error"], "mempool full")

        self.test_mid_package_eviction()


if __name__ == "__main__":
    MempoolLimitTest().main()
