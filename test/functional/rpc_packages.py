# Copyright (c) 2021 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""RPCs that handle raw transaction packages."""

import random
from decimal import Decimal

from test_framework.blocktools import COINBASE_MATURITY
from test_framework.messages import CTransaction, FromHex, ToHex
from test_framework.p2p import P2PTxInvStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, assert_fee_amount, assert_raises_rpc_error
from test_framework.wallet import DEFAULT_FEE, MiniWallet


class RPCPackagesTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True

    def assert_testres_equal(self, package_hex, testres_expected):
        """Shuffle package_hex and assert that the testmempoolaccept result
        matches testres_expected. This should only be used to test packages
        where the order does not matter. The ordering of transactions in
        package_hex and testres_expected must match.
        """
        shuffled_indices = list(range(len(package_hex)))
        random.shuffle(shuffled_indices)
        shuffled_package = [package_hex[i] for i in shuffled_indices]
        shuffled_testres = [testres_expected[i] for i in shuffled_indices]
        assert_equal(
            shuffled_testres, self.nodes[0].testmempoolaccept(shuffled_package)
        )

    def run_test(self):
        node = self.nodes[0]

        # get an UTXO that requires signature to be spent
        deterministic_address = node.get_deterministic_priv_key().address
        blockhash = self.generatetoaddress(node, 1, deterministic_address)[0]
        coinbase = node.getblock(blockhash=blockhash, verbosity=2)["tx"][0]
        coin = {
            "txid": coinbase["txid"],
            "amount": coinbase["vout"][0]["value"],
            "scriptPubKey": coinbase["vout"][0]["scriptPubKey"],
            "vout": 0,
            "height": 0,
        }

        self.wallet = MiniWallet(node)
        # blocks generated for inputs
        self.generate(self.wallet, COINBASE_MATURITY + 120)

        self.log.info("Create some transactions")
        # Create some transactions that can be reused throughout the test.
        # Never submit these to mempool.
        self.independent_txns_hex = []
        self.independent_txns_testres = []
        for _ in range(3):
            tx_hex = self.wallet.create_self_transfer(fee_rate=Decimal("100"))["hex"]
            testres = node.testmempoolaccept([tx_hex])
            assert testres[0]["allowed"]
            self.independent_txns_hex.append(tx_hex)
            # testmempoolaccept returns a list of length one, avoid creating a
            # 2D list
            self.independent_txns_testres.append(testres[0])
        self.independent_txns_testres_blank = [
            {
                "txid": res["txid"],
            }
            for res in self.independent_txns_testres
        ]

        self.test_independent(coin)
        self.test_chain()
        self.test_multiple_children()
        self.test_multiple_parents()
        self.test_conflicting()
        self.test_submitpackage()

    def test_independent(self, coin):
        self.log.info("Test multiple independent transactions in a package")
        node = self.nodes[0]
        # For independent transactions, order doesn't matter.
        self.assert_testres_equal(
            self.independent_txns_hex, self.independent_txns_testres
        )

        self.log.info(
            "Test an otherwise valid package with an extra garbage tx appended"
        )
        address = node.get_deterministic_priv_key().address
        garbage_tx = node.createrawtransaction(
            [{"txid": "00" * 32, "vout": 5}], {address: 1_000_000}
        )
        tx = FromHex(CTransaction(), garbage_tx)
        pad_tx(tx)
        garbage_tx = ToHex(tx)

        # This particular test differs from Core, because we do not test the
        # missing inputs separately from the signature verification for a given
        # transaction. Both are done in validation as part of PreChecks, and the
        # node returns the result once it reaches the first failure to save
        # resource. This means that we only have the result details for the
        # failed transaction below.
        # See https://reviews.bitcoinabc.org/D8203
        testres_bad = node.testmempoolaccept(self.independent_txns_hex + [garbage_tx])
        assert_equal(
            testres_bad,
            self.independent_txns_testres_blank
            + [
                {
                    "txid": tx.get_id(),
                    "allowed": False,
                    "reject-reason": "missing-inputs",
                }
            ],
        )

        self.log.info(
            "Check testmempoolaccept tells us when some transactions completed"
            " validation successfully"
        )
        tx_bad_sig_hex = node.createrawtransaction(
            [{"txid": coin["txid"], "vout": 0}],
            {address: coin["amount"] - Decimal("100.00")},
        )
        tx_bad_sig = FromHex(CTransaction(), tx_bad_sig_hex)
        pad_tx(tx_bad_sig)
        tx_bad_sig_hex = ToHex(tx_bad_sig)
        testres_bad_sig = node.testmempoolaccept(
            self.independent_txns_hex + [tx_bad_sig_hex]
        )
        # By the time the signature for the last transaction is checked, all the
        # other transactions have been fully validated, which is why the node
        # returns full validation results for all transactions here but empty
        # results in other cases.
        assert_equal(
            testres_bad_sig,
            self.independent_txns_testres_blank
            + [
                {
                    "txid": tx_bad_sig.get_id(),
                    "allowed": False,
                    "reject-reason": (
                        "mandatory-script-verify-flag-failed (Operation not valid with"
                        " the current stack size)"
                    ),
                }
            ],
        )

        self.log.info(
            "Check testmempoolaccept reports txns in packages that exceed max feerate"
        )
        tx_high_fee = self.wallet.create_self_transfer(fee=Decimal("999_000"))
        testres_high_fee = node.testmempoolaccept([tx_high_fee["hex"]])
        assert_equal(
            testres_high_fee,
            [
                {
                    "txid": tx_high_fee["txid"],
                    "allowed": False,
                    "reject-reason": "max-fee-exceeded",
                }
            ],
        )
        package_high_fee = [tx_high_fee["hex"]] + self.independent_txns_hex
        testres_package_high_fee = node.testmempoolaccept(package_high_fee)
        assert_equal(
            testres_package_high_fee,
            testres_high_fee + self.independent_txns_testres_blank,
        )

    def test_chain(self):
        node = self.nodes[0]

        chain = self.wallet.create_self_transfer_chain(chain_length=25)
        chain_hex = [t["hex"] for t in chain]
        chain_txns = [t["tx"] for t in chain]

        self.log.info(
            "Check that testmempoolaccept requires packages to be sorted by dependency"
        )
        assert_equal(
            node.testmempoolaccept(rawtxs=chain_hex[::-1]),
            [
                {"txid": tx.get_id(), "package-error": "package-not-sorted"}
                for tx in chain_txns[::-1]
            ],
        )

        self.log.info("Testmempoolaccept a chain of 50 transactions")
        testres_multiple = node.testmempoolaccept(rawtxs=chain_hex)

        testres_single = []
        # Test accept and then submit each one individually, which should be
        # identical to package test accept
        for rawtx in chain_hex:
            testres = node.testmempoolaccept([rawtx])
            testres_single.append(testres[0])
            # Submit the transaction now so its child should have no problem
            # validating
            node.sendrawtransaction(rawtx)
        assert_equal(testres_single, testres_multiple)

        # Clean up by clearing the mempool
        self.generate(node, 1)

    def test_multiple_children(self):
        node = self.nodes[0]

        self.log.info(
            "Testmempoolaccept a package in which a transaction has two children within"
            " the package"
        )

        parent_tx = self.wallet.create_self_transfer_multi(num_outputs=2)
        assert node.testmempoolaccept([parent_tx["hex"]])[0]["allowed"]

        # Child A
        child_a_tx = self.wallet.create_self_transfer(
            utxo_to_spend=parent_tx["new_utxos"][0]
        )
        assert not node.testmempoolaccept([child_a_tx["hex"]])[0]["allowed"]

        # Child B
        child_b_tx = self.wallet.create_self_transfer(
            utxo_to_spend=parent_tx["new_utxos"][1]
        )
        assert not node.testmempoolaccept([child_b_tx["hex"]])[0]["allowed"]

        self.log.info(
            "Testmempoolaccept with entire package, should work with children in either order"
        )
        testres_multiple_ab = node.testmempoolaccept(
            rawtxs=[parent_tx["hex"], child_a_tx["hex"], child_b_tx["hex"]]
        )
        testres_multiple_ba = node.testmempoolaccept(
            rawtxs=[parent_tx["hex"], child_b_tx["hex"], child_a_tx["hex"]]
        )

        assert all(
            testres["allowed"] for testres in testres_multiple_ab + testres_multiple_ba
        )

        testres_single = []
        # Test accept and then submit each one individually, which should be
        # identical to package testaccept
        for rawtx in [parent_tx["hex"], child_a_tx["hex"], child_b_tx["hex"]]:
            testres = node.testmempoolaccept([rawtx])
            testres_single.append(testres[0])
            # Submit the transaction now so its child should have no problem
            # validating
            node.sendrawtransaction(rawtx)
        assert_equal(testres_single, testres_multiple_ab)

    def test_multiple_parents(self):
        node = self.nodes[0]

        self.log.info(
            "Testmempoolaccept a package in which a transaction has multiple parents"
            " within the package"
        )
        for num_parents in [2, 10, 49]:
            # Test a package with num_parents parents and 1 child transaction.
            parent_coins = []
            package_hex = []

            for _ in range(num_parents):
                # Package accept should work with the parents in any order (as long as parents come before child)
                parent_tx = self.wallet.create_self_transfer()
                parent_coins.append(parent_tx["new_utxo"])
                package_hex.append(parent_tx["hex"])

            child_tx = self.wallet.create_self_transfer_multi(
                utxos_to_spend=parent_coins, fee_per_output=4000
            )

            for _ in range(10):
                random.shuffle(package_hex)
                testres_multiple = node.testmempoolaccept(
                    rawtxs=package_hex + [child_tx["hex"]]
                )
                assert all(testres["allowed"] for testres in testres_multiple)

            testres_single = []
            # Test accept and then submit each one individually, which should be
            # identical to package testaccept
            for rawtx in package_hex + [child_tx["hex"]]:
                testres_single.append(node.testmempoolaccept([rawtx])[0])
                # Submit the transaction now so its child should have no problem
                # validating
                node.sendrawtransaction(rawtx)
            assert_equal(testres_single, testres_multiple)

    def test_conflicting(self):
        node = self.nodes[0]
        coin = self.wallet.get_utxo()

        # tx1 and tx2 share the same inputs
        tx1 = self.wallet.create_self_transfer(utxo_to_spend=coin, fee_rate=DEFAULT_FEE)
        tx2 = self.wallet.create_self_transfer(
            utxo_to_spend=coin, fee_rate=2 * DEFAULT_FEE
        )

        # Ensure tx1 and tx2 are valid by themselves
        assert node.testmempoolaccept([tx1["hex"]])[0]["allowed"]
        assert node.testmempoolaccept([tx2["hex"]])[0]["allowed"]

        self.log.info("Test duplicate transactions in the same package")
        testres = node.testmempoolaccept([tx1["hex"], tx1["hex"]])
        assert_equal(
            testres,
            [
                {"txid": tx1["txid"], "package-error": "package-contains-duplicates"},
                {"txid": tx1["txid"], "package-error": "package-contains-duplicates"},
            ],
        )

        self.log.info("Test conflicting transactions in the same package")
        testres = node.testmempoolaccept([tx1["hex"], tx2["hex"]])
        assert_equal(
            testres,
            [
                {"txid": tx1["txid"], "package-error": "conflict-in-package"},
                {"txid": tx2["txid"], "package-error": "conflict-in-package"},
            ],
        )

    def assert_equal_package_results(
        self, node, testmempoolaccept_result, submitpackage_result
    ):
        """Assert that a successful submitpackage result is consistent with testmempoolaccept
        results and getmempoolentry info. Note that the result structs are different and, due to
        policy differences between testmempoolaccept and submitpackage (i.e. package feerate),
        some information may be different.
        """
        # FIXME This is using a mix of size/vsize because the RPC don't return
        # the same value. This is working because the vsize is never increased
        # by the sigchecks in the test, but this is brittle and this is needs to
        # be fixed.
        for testres_tx in testmempoolaccept_result:
            # Grab this result from the submitpackage_result
            txid = testres_tx["txid"]
            submitres_tx = submitpackage_result["tx-results"][txid]
            # No "allowed" if the tx was already in the mempool
            if "allowed" in testres_tx and testres_tx["allowed"]:
                assert_equal(submitres_tx["vsize"], testres_tx["size"])
                assert_equal(submitres_tx["fees"]["base"], testres_tx["fees"]["base"])
            entry_info = node.getmempoolentry(txid)
            assert_equal(submitres_tx["vsize"], entry_info["size"])
            assert_equal(submitres_tx["fees"]["base"], entry_info["fees"]["base"])

    def test_submit_child_with_parents(self, num_parents, partial_submit):
        node = self.nodes[0]
        peer = node.add_p2p_connection(P2PTxInvStore())

        package_txns = []
        presubmitted_txids = set()
        for _ in range(num_parents):
            parent_tx = self.wallet.create_self_transfer(fee=DEFAULT_FEE)
            package_txns.append(parent_tx)
            if partial_submit and random.choice([True, False]):
                txid = node.sendrawtransaction(parent_tx["hex"])
                presubmitted_txids.add(txid)

        child_tx = self.wallet.create_self_transfer_multi(
            utxos_to_spend=[tx["new_utxo"] for tx in package_txns], fee_per_output=10000
        )
        package_txns.append(child_tx)

        testmempoolaccept_result = node.testmempoolaccept(
            rawtxs=[tx["hex"] for tx in package_txns]
        )
        submitpackage_result = node.submitpackage(
            package=[tx["hex"] for tx in package_txns]
        )

        # Check that each result is present, with the correct size and fees
        assert_equal(submitpackage_result["package_msg"], "success")
        for package_txn in package_txns:
            tx = package_txn["tx"]
            assert (txid := tx.get_id()) in submitpackage_result["tx-results"]
            tx_result = submitpackage_result["tx-results"][txid]
            assert_equal(tx_result["vsize"], tx.billable_size())
            assert_equal(tx_result["fees"]["base"], DEFAULT_FEE)
            if txid not in presubmitted_txids:
                assert_fee_amount(
                    DEFAULT_FEE,
                    tx.billable_size(),
                    tx_result["fees"]["effective-feerate"],
                )
                assert_equal(tx_result["fees"]["effective-includes"], [txid])

        # submitpackage result should be consistent with testmempoolaccept and getmempoolentry
        self.assert_equal_package_results(
            node, testmempoolaccept_result, submitpackage_result
        )

        # The node should announce each transaction. No guarantees for propagation.
        peer.wait_for_broadcast([tx["tx"].get_id() for tx in package_txns])
        self.generate(node, 1)

    def test_submitpackage(self):
        node = self.nodes[0]

        self.log.info(
            "Submitpackage valid packages with 1 child and some number of parents"
        )
        for num_parents in [1, 2, 24]:
            self.test_submit_child_with_parents(num_parents, False)
            self.test_submit_child_with_parents(num_parents, True)

        self.log.info("Submitpackage only allows packages of 1 child with its parents")
        # Chain of 3 transactions has too many generations
        legacy_pool = node.getrawmempool()
        chain_hex = [
            t["hex"] for t in self.wallet.create_self_transfer_chain(chain_length=25)
        ]
        assert_raises_rpc_error(
            -25, "package topology disallowed", node.submitpackage, chain_hex
        )
        assert_equal(legacy_pool, node.getrawmempool())

        # Create a transaction chain such as only the parent gets accepted (by
        # making the child's version non-standard). Make sure the parent does
        # get broadcast.
        self.log.info(
            "If a package is partially submitted, transactions included in mempool get broadcast"
        )
        peer = node.add_p2p_connection(P2PTxInvStore())
        txs = self.wallet.create_self_transfer_chain(chain_length=2)
        bad_child = FromHex(CTransaction(), txs[1]["hex"])
        bad_child.nVersion = -1
        hex_partial_acceptance = [txs[0]["hex"], bad_child.serialize().hex()]
        res = node.submitpackage(hex_partial_acceptance)
        assert_equal(res["package_msg"], "transaction failed")
        first_txid = txs[0]["txid"]
        assert "error" not in res["tx-results"][first_txid]
        sec_txid = bad_child.get_id()
        assert_equal(res["tx-results"][sec_txid]["error"], "version")
        peer.wait_for_broadcast([first_txid])


if __name__ == "__main__":
    RPCPackagesTest().main()
