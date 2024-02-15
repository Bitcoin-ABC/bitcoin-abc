# Copyright (c) 2021 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""RPCs that handle raw transaction packages."""

import random
from decimal import Decimal

from test_framework.address import ADDRESS_ECREG_P2SH_OP_TRUE, SCRIPTSIG_OP_TRUE
from test_framework.messages import CTransaction, FromHex, ToHex
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal
from test_framework.wallet import (
    create_child_with_parents,
    create_raw_chain,
    make_chain,
)


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
        self.log.info("Generate blocks to create UTXOs")
        node = self.nodes[0]
        self.privkeys = [node.get_deterministic_priv_key().key]
        self.address = node.get_deterministic_priv_key().address
        self.coins = []
        # The last 100 coinbase transactions are premature
        for b in self.generatetoaddress(node, 300, self.address)[:100]:
            coinbase = node.getblock(blockhash=b, verbosity=2)["tx"][0]
            self.coins.append(
                {
                    "txid": coinbase["txid"],
                    "amount": coinbase["vout"][0]["value"],
                    "scriptPubKey": coinbase["vout"][0]["scriptPubKey"],
                }
            )

        # Create some transactions that can be reused throughout the test.
        # Never submit these to mempool.
        self.independent_txns_hex = []
        self.independent_txns_testres = []
        for _ in range(3):
            coin = self.coins.pop()
            rawtx = node.createrawtransaction(
                [{"txid": coin["txid"], "vout": 0}],
                {self.address: coin["amount"] - Decimal("100.00")},
            )
            signedtx = node.signrawtransactionwithkey(
                hexstring=rawtx, privkeys=self.privkeys
            )
            assert signedtx["complete"]
            testres = node.testmempoolaccept([signedtx["hex"]])
            assert testres[0]["allowed"]
            self.independent_txns_hex.append(signedtx["hex"])
            # testmempoolaccept returns a list of length one, avoid creating a
            # 2D list
            self.independent_txns_testres.append(testres[0])
        self.independent_txns_testres_blank = [
            {
                "txid": res["txid"],
            }
            for res in self.independent_txns_testres
        ]

        self.test_independent()
        self.test_chain()
        self.test_multiple_children()
        self.test_multiple_parents()
        self.test_conflicting()

    def test_independent(self):
        self.log.info("Test multiple independent transactions in a package")
        node = self.nodes[0]
        # For independent transactions, order doesn't matter.
        self.assert_testres_equal(
            self.independent_txns_hex, self.independent_txns_testres
        )

        self.log.info(
            "Test an otherwise valid package with an extra garbage tx appended"
        )
        garbage_tx = node.createrawtransaction(
            [{"txid": "00" * 32, "vout": 5}], {self.address: 1_000_000}
        )
        tx = FromHex(CTransaction(), garbage_tx)
        pad_tx(tx)
        garbage_tx = ToHex(tx)

        # This particular test differs from Core, because we do not test the
        # missing inputs separately from the signature verification for a given
        # transaction. Both are done in validation as part of PreChecks.
        # See https://reviews.bitcoinabc.org/D8203
        testres_bad = node.testmempoolaccept(self.independent_txns_hex + [garbage_tx])
        assert_equal(
            testres_bad,
            self.independent_txns_testres
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
        coin = self.coins.pop()
        tx_bad_sig_hex = node.createrawtransaction(
            [{"txid": coin["txid"], "vout": 0}],
            {self.address: coin["amount"] - Decimal("100.00")},
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
            self.independent_txns_testres
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
        coin = self.coins.pop()
        tx_high_fee_raw = node.createrawtransaction(
            [{"txid": coin["txid"], "vout": 0}],
            {self.address: coin["amount"] - Decimal("999_000")},
        )
        tx_high_fee_signed = node.signrawtransactionwithkey(
            hexstring=tx_high_fee_raw, privkeys=self.privkeys
        )
        assert tx_high_fee_signed["complete"]
        tx_high_fee = FromHex(CTransaction(), tx_high_fee_signed["hex"])
        testres_high_fee = node.testmempoolaccept([tx_high_fee_signed["hex"]])
        assert_equal(
            testres_high_fee,
            [
                {
                    "txid": tx_high_fee.get_id(),
                    "allowed": False,
                    "reject-reason": "max-fee-exceeded",
                }
            ],
        )
        package_high_fee = [tx_high_fee_signed["hex"]] + self.independent_txns_hex
        testres_package_high_fee = node.testmempoolaccept(package_high_fee)
        assert_equal(
            testres_package_high_fee,
            testres_high_fee + self.independent_txns_testres_blank,
        )

    def test_chain(self):
        node = self.nodes[0]
        first_coin = self.coins.pop()
        (chain_hex, chain_txns) = create_raw_chain(
            node, first_coin, self.address, self.privkeys
        )

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
        first_coin = self.coins.pop()
        # Deduct reasonable fee and make 2 outputs
        value = (first_coin["amount"] - Decimal("200.00")) / 2
        inputs = [{"txid": first_coin["txid"], "vout": 0}]
        outputs = [{self.address: value}, {ADDRESS_ECREG_P2SH_OP_TRUE: value}]
        rawtx = node.createrawtransaction(inputs, outputs)

        parent_signed = node.signrawtransactionwithkey(
            hexstring=rawtx, privkeys=self.privkeys
        )
        assert parent_signed["complete"]
        parent_tx = FromHex(CTransaction(), parent_signed["hex"])
        parent_txid = parent_tx.get_id()
        assert node.testmempoolaccept([parent_signed["hex"]])[0]["allowed"]

        parent_locking_script_a = parent_tx.vout[0].scriptPubKey.hex()
        child_value = value - Decimal("100.00")

        # Child A
        (_, tx_child_a_hex, _, _) = make_chain(
            node,
            self.address,
            self.privkeys,
            parent_txid,
            value,
            0,
            parent_locking_script_a,
        )
        assert not node.testmempoolaccept([tx_child_a_hex])[0]["allowed"]

        # Child B
        rawtx_b = node.createrawtransaction(
            [{"txid": parent_txid, "vout": 1}], {self.address: child_value}
        )
        tx_child_b = FromHex(CTransaction(), rawtx_b)
        tx_child_b.vin[0].scriptSig = SCRIPTSIG_OP_TRUE
        pad_tx(tx_child_b)
        tx_child_b_hex = ToHex(tx_child_b)
        assert not node.testmempoolaccept([tx_child_b_hex])[0]["allowed"]

        self.log.info(
            "Testmempoolaccept with entire package, should work with children in either"
            " order"
        )
        testres_multiple_ab = node.testmempoolaccept(
            rawtxs=[parent_signed["hex"], tx_child_a_hex, tx_child_b_hex]
        )
        testres_multiple_ba = node.testmempoolaccept(
            rawtxs=[parent_signed["hex"], tx_child_b_hex, tx_child_a_hex]
        )

        assert all(
            testres["allowed"] for testres in testres_multiple_ab + testres_multiple_ba
        )

        testres_single = []
        # Test accept and then submit each one individually, which should be
        # identical to package testaccept
        for rawtx in [parent_signed["hex"], tx_child_a_hex, tx_child_b_hex]:
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
            package_hex = []
            parents_tx = []
            values = []
            parent_locking_scripts = []
            for _ in range(num_parents):
                parent_coin = self.coins.pop()
                value = parent_coin["amount"]
                (tx, txhex, value, parent_locking_script) = make_chain(
                    node, self.address, self.privkeys, parent_coin["txid"], value
                )
                package_hex.append(txhex)
                parents_tx.append(tx)
                values.append(value)
                parent_locking_scripts.append(parent_locking_script)
            child_hex = create_child_with_parents(
                node,
                self.address,
                self.privkeys,
                parents_tx,
                values,
                parent_locking_scripts,
            )
            # Package accept should work with the parents in any order
            # (as long as parents come before child)
            for _ in range(10):
                random.shuffle(package_hex)
                testres_multiple = node.testmempoolaccept(
                    rawtxs=package_hex + [child_hex]
                )
                assert all(testres["allowed"] for testres in testres_multiple)

            testres_single = []
            # Test accept and then submit each one individually, which should be
            # identical to package testaccept
            for rawtx in package_hex + [child_hex]:
                testres_single.append(node.testmempoolaccept([rawtx])[0])
                # Submit the transaction now so its child should have no problem
                # validating
                node.sendrawtransaction(rawtx)
            assert_equal(testres_single, testres_multiple)

    def test_conflicting(self):
        node = self.nodes[0]
        prevtx = self.coins.pop()
        inputs = [{"txid": prevtx["txid"], "vout": 0}]
        output1 = {node.get_deterministic_priv_key().address: 50_000_000 - 1250}
        output2 = {ADDRESS_ECREG_P2SH_OP_TRUE: 50_000_000 - 1250}

        # tx1 and tx2 share the same inputs
        rawtx1 = node.createrawtransaction(inputs, output1)
        rawtx2 = node.createrawtransaction(inputs, output2)
        signedtx1 = node.signrawtransactionwithkey(
            hexstring=rawtx1, privkeys=self.privkeys
        )
        signedtx2 = node.signrawtransactionwithkey(
            hexstring=rawtx2, privkeys=self.privkeys
        )
        tx1 = FromHex(CTransaction(), signedtx1["hex"])
        tx2 = FromHex(CTransaction(), signedtx2["hex"])
        assert signedtx1["complete"]
        assert signedtx2["complete"]

        # Ensure tx1 and tx2 are valid by themselves
        assert node.testmempoolaccept([signedtx1["hex"]])[0]["allowed"]
        assert node.testmempoolaccept([signedtx2["hex"]])[0]["allowed"]

        self.log.info("Test duplicate transactions in the same package")
        testres = node.testmempoolaccept([signedtx1["hex"], signedtx1["hex"]])
        assert_equal(
            testres,
            [
                {"txid": tx1.get_id(), "package-error": "conflict-in-package"},
                {"txid": tx1.get_id(), "package-error": "conflict-in-package"},
            ],
        )

        self.log.info("Test conflicting transactions in the same package")
        testres = node.testmempoolaccept([signedtx1["hex"], signedtx2["hex"]])
        assert_equal(
            testres,
            [
                {"txid": tx1.get_id(), "package-error": "conflict-in-package"},
                {"txid": tx2.get_id(), "package-error": "conflict-in-package"},
            ],
        )


if __name__ == "__main__":
    RPCPackagesTest().main()
