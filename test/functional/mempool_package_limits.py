#!/usr/bin/env python3
# Copyright (c) 2021 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test logic for limiting mempool and package ancestors/descendants."""

from decimal import Decimal

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.messages import XEC, CTransaction, FromHex, ToHex
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal
from test_framework.wallet import (
    bulk_transaction,
    create_child_with_parents,
    make_chain,
)

FAR_IN_THE_FUTURE = 2000000000


class MempoolPackageLimitsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.extra_args = [[
            # The packages mempool limits are no longer applied after wellington
            # activation.
            f'-wellingtonactivationtime={FAR_IN_THE_FUTURE}',
        ]]

    def run_test(self):
        self.log.info("Generate blocks to create UTXOs")
        node = self.nodes[0]
        self.privkeys = [node.get_deterministic_priv_key().key]
        self.address = node.get_deterministic_priv_key().address
        self.coins = []
        # The last 100 coinbase transactions are premature
        for b in self.generatetoaddress(node, 200, self.address)[:100]:
            coinbase = node.getblock(blockhash=b, verbosity=2)["tx"][0]
            self.coins.append({
                "txid": coinbase["txid"],
                "amount": coinbase["vout"][0]["value"],
                "scriptPubKey": coinbase["vout"][0]["scriptPubKey"],
            })

        self.test_chain_limits()
        self.test_desc_count_limits()
        self.test_desc_count_limits_2()
        self.test_anc_count_limits()
        self.test_anc_count_limits_2()
        self.test_anc_count_limits_bushy()

        # The node will accept our (nonstandard) extra large OP_RETURN outputs
        self.restart_node(0, extra_args=["-acceptnonstdtxn=1"])
        self.test_anc_size_limits()
        self.test_desc_size_limits()

    def test_chain_limits_helper(self, mempool_count, package_count):
        node = self.nodes[0]
        assert_equal(0, node.getmempoolinfo()["size"])
        first_coin = self.coins.pop()
        spk = None
        txid = first_coin["txid"]
        chain_hex = []
        chain_txns = []
        value = first_coin["amount"]

        for i in range(mempool_count + package_count):
            (tx, txhex, value, spk) = make_chain(
                node, self.address, self.privkeys, txid, value, 0, spk)
            txid = tx.get_id()
            if i < mempool_count:
                node.sendrawtransaction(txhex)
            else:
                chain_hex.append(txhex)
                chain_txns.append(tx)
        testres_too_long = node.testmempoolaccept(rawtxs=chain_hex)
        for txres in testres_too_long:
            assert_equal(txres["package-error"], "package-mempool-limits")

        # Clear mempool and check that the package passes now
        self.generate(node, 1)
        assert all([res["allowed"] is True
                    for res in node.testmempoolaccept(rawtxs=chain_hex)])

    def test_chain_limits(self):
        """Create chains from mempool and package transactions that are longer than 50,
        but only if both in-mempool and in-package transactions are considered together.
        This checks that both mempool and in-package transactions are taken into account
        when calculating ancestors/descendant limits.
        """
        self.log.info(
            "Check that in-package ancestors count for mempool ancestor limits")

        self.test_chain_limits_helper(mempool_count=49, package_count=2)
        self.test_chain_limits_helper(mempool_count=2, package_count=49)
        self.test_chain_limits_helper(mempool_count=26, package_count=26)

    def test_desc_count_limits(self):
        """Create an 'A' shaped package with 49 transactions in the mempool and 2 in the package:
                    M1
                   ^  ^
                 M2a  M2b
                .       .
               .         .
             M25a        M25b
            ^              ^
           Pa              Pb
        The top ancestor in the package exceeds descendant limits but only if the in-mempool and in-package
        descendants are all considered together (49 including in-mempool descendants and 51 including both
        package transactions).
        """
        node = self.nodes[0]
        assert_equal(0, node.getmempoolinfo()["size"])
        self.log.info(
            "Check that in-mempool and in-package descendants are calculated properly in packages")
        # Top parent in mempool, M1
        first_coin = self.coins.pop()
        # Deduct reasonable fee and make 2 outputs
        parent_value = (first_coin["amount"] - Decimal("200.00")) / 2
        inputs = [{"txid": first_coin["txid"], "vout": 0}]
        outputs = [{self.address: parent_value},
                   {ADDRESS_ECREG_P2SH_OP_TRUE: parent_value}]
        rawtx = node.createrawtransaction(inputs, outputs)

        parent_signed = node.signrawtransactionwithkey(
            hexstring=rawtx, privkeys=self.privkeys)
        assert parent_signed["complete"]
        parent_tx = FromHex(CTransaction(), parent_signed["hex"])
        parent_txid = parent_tx.rehash()
        node.sendrawtransaction(parent_signed["hex"])

        package_hex = []

        # Chain A
        spk = parent_tx.vout[0].scriptPubKey.hex()
        value = parent_value
        txid = parent_txid
        for i in range(25):
            (tx, txhex, value, spk) = make_chain(
                node, self.address, self.privkeys, txid, value, 0, spk)
            txid = tx.get_id()
            if i < 24:
                # M2a... M25a
                node.sendrawtransaction(txhex)
            else:
                # Pa
                package_hex.append(txhex)

        # Chain B
        value = parent_value - Decimal("100.00")
        rawtx_b = node.createrawtransaction(
            [{"txid": parent_txid, "vout": 1}], {self.address: value})
        # M2b
        tx_child_b = FromHex(CTransaction(), rawtx_b)
        tx_child_b.vin[0].scriptSig = SCRIPTSIG_OP_TRUE
        pad_tx(tx_child_b)
        tx_child_b_hex = ToHex(tx_child_b)
        node.sendrawtransaction(tx_child_b_hex)
        spk = tx_child_b.vout[0].scriptPubKey.hex()
        txid = tx_child_b.rehash()
        for i in range(24):
            (tx, txhex, value, spk) = make_chain(
                node, self.address, self.privkeys, txid, value, 0, spk)
            txid = tx.get_id()
            if i < 23:
                # M3b... M25b
                node.sendrawtransaction(txhex)
            else:
                # Pb
                package_hex.append(txhex)

        assert_equal(49, node.getmempoolinfo()["size"])
        assert_equal(2, len(package_hex))
        testres_too_long = node.testmempoolaccept(rawtxs=package_hex)
        for txres in testres_too_long:
            assert_equal(txres["package-error"], "package-mempool-limits")

        # Clear mempool and check that the package passes now
        self.generate(node, 1)
        assert all([res["allowed"] is True
                    for res in node.testmempoolaccept(rawtxs=package_hex)])

    def test_desc_count_limits_2(self):
        """Create a Package with 49 transactions in mempool and 2 transactions
         in package:
                      M1
                     ^  ^
                   M2    ^
                   .      ^
                  .        ^
                 .          ^
                M49          ^
                              ^
                              P1
                              ^
                              P2
        P1 has M1 as a mempool ancestor, P2 has no in-mempool ancestors, but
        when combined P2 has M1 as an ancestor and M1 exceeds descendant_limits
        (48 in-mempool descendants + 2 in-package descendants, a total of 51
        including itself).
        """

        node = self.nodes[0]
        package_hex = []
        # M1
        first_coin_a = self.coins.pop()
        # Deduct reasonable fee and make 2 outputs
        parent_value = (first_coin_a["amount"] - Decimal('200.0')) / 2
        inputs = [{"txid": first_coin_a["txid"], "vout": 0}]
        outputs = [{self.address: parent_value},
                   {ADDRESS_ECREG_P2SH_OP_TRUE: parent_value}]
        rawtx = node.createrawtransaction(inputs, outputs)

        parent_signed = node.signrawtransactionwithkey(
            hexstring=rawtx, privkeys=self.privkeys)
        assert parent_signed["complete"]
        parent_tx = FromHex(CTransaction(), parent_signed["hex"])
        pad_tx(parent_tx)
        parent_txid = parent_tx.rehash()
        node.sendrawtransaction(parent_signed["hex"])

        # Chain M2...M49
        spk = parent_tx.vout[0].scriptPubKey.hex()
        value = parent_value
        txid = parent_txid
        for _ in range(48):
            (tx, txhex, value, spk) = make_chain(
                node, self.address, self.privkeys, txid, value, 0, spk)
            pad_tx(tx)
            txid = tx.hash
            node.sendrawtransaction(txhex)

        # P1
        value_p1 = parent_value - Decimal('100')
        rawtx_p1 = node.createrawtransaction(
            [{"txid": parent_txid, "vout": 1}], [{self.address: value_p1}])
        tx_child_p1 = FromHex(CTransaction(), rawtx_p1)
        tx_child_p1.vin[0].scriptSig = SCRIPTSIG_OP_TRUE
        pad_tx(tx_child_p1)
        tx_child_p1_hex = tx_child_p1.serialize().hex()
        package_hex.append(tx_child_p1_hex)
        tx_child_p1_spk = tx_child_p1.vout[0].scriptPubKey.hex()

        # P2
        (_, tx_child_p2_hex, _, _) = make_chain(node, self.address,
                                                self.privkeys, tx_child_p1.hash, value_p1, 0, tx_child_p1_spk)
        package_hex.append(tx_child_p2_hex)

        assert_equal(49, node.getmempoolinfo()["size"])
        assert_equal(2, len(package_hex))
        testres = node.testmempoolaccept(rawtxs=package_hex)
        assert_equal(len(testres), len(package_hex))
        for txres in testres:
            assert_equal(txres["package-error"], "package-mempool-limits")

        # Clear mempool and check that the package passes now
        self.generate(node, 1)
        assert all([res["allowed"]
                   for res in node.testmempoolaccept(rawtxs=package_hex)])

    def test_anc_count_limits(self):
        """Create a 'V' shaped chain with 49 transactions in the mempool and 3 in the package:
        M1a
         ^                   M1b
          M2a                ^
           .                M2b
            .               .
             .             .
             M25a        M24b
               ^         ^
                Pa     Pb
                 ^    ^
                   Pc
        The lowest descendant, Pc, exceeds ancestor limits, but only if the in-mempool
        and in-package ancestors are all considered together.
        """
        node = self.nodes[0]
        assert_equal(0, node.getmempoolinfo()["size"])
        package_hex = []
        parents_tx = []
        values = []
        scripts = []

        self.log.info(
            "Check that in-mempool and in-package ancestors are calculated "
            "properly in packages")

        # Two chains of 26 & 25 transactions
        for chain_length in [26, 25]:
            spk = None
            top_coin = self.coins.pop()
            txid = top_coin["txid"]
            value = top_coin["amount"]
            for i in range(chain_length):
                (tx, txhex, value, spk) = make_chain(
                    node, self.address, self.privkeys, txid, value, 0, spk)
                txid = tx.get_id()
                if i < chain_length - 1:
                    node.sendrawtransaction(txhex)
                else:
                    # Save the last transaction for the package
                    package_hex.append(txhex)
                    parents_tx.append(tx)
                    scripts.append(spk)
                    values.append(value)

        # Child Pc
        child_hex = create_child_with_parents(
            node, self.address, self.privkeys, parents_tx, values, scripts)
        package_hex.append(child_hex)

        assert_equal(49, node.getmempoolinfo()["size"])
        assert_equal(3, len(package_hex))
        testres_too_long = node.testmempoolaccept(rawtxs=package_hex)
        for txres in testres_too_long:
            assert_equal(txres["package-error"], "package-mempool-limits")

        # Clear mempool and check that the package passes now
        self.generate(node, 1)
        assert all([res["allowed"] is True
                    for res in node.testmempoolaccept(rawtxs=package_hex)])

    def test_anc_count_limits_2(self):
        """Create a 'Y' shaped chain with 49 transactions in the mempool and 2 in the package:
        M1a
         ^              M1b
          M2a           ^
           .           M2b
            .          .
             .        .
             M25a   M24b
               ^    ^
                 Pc
                 ^
                 Pd
        The lowest descendant, Pc, exceeds ancestor limits, but only if the in-mempool
        and in-package ancestors are all considered together.
        """
        node = self.nodes[0]
        assert_equal(0, node.getmempoolinfo()["size"])
        parents_tx = []
        values = []
        scripts = []

        self.log.info(
            "Check that in-mempool and in-package ancestors are calculated properly in packages")
        # Two chains of 25 & 24 transactions
        for chain_length in [25, 24]:
            spk = None
            top_coin = self.coins.pop()
            txid = top_coin["txid"]
            value = top_coin["amount"]
            for i in range(chain_length):
                (tx, txhex, value, spk) = make_chain(
                    node, self.address, self.privkeys, txid, value, 0, spk)
                txid = tx.get_id()
                node.sendrawtransaction(txhex)
                if i == chain_length - 1:
                    # last 2 transactions will be the parents of Pc
                    parents_tx.append(tx)
                    values.append(value)
                    scripts.append(spk)

        # Child Pc
        pc_hex = create_child_with_parents(
            node, self.address, self.privkeys, parents_tx, values, scripts)
        pc_tx = FromHex(CTransaction(), pc_hex)
        pc_value = sum(values) - Decimal("100.00")
        pc_spk = pc_tx.vout[0].scriptPubKey.hex()

        # Child Pd
        (_, pd_hex, _, _) = make_chain(
            node, self.address, self.privkeys, pc_tx.get_id(), pc_value, 0, pc_spk)

        assert_equal(49, node.getmempoolinfo()["size"])
        testres_too_long = node.testmempoolaccept(rawtxs=[pc_hex, pd_hex])
        for txres in testres_too_long:
            assert_equal(txres["package-error"], "package-mempool-limits")

        # Clear mempool and check that the package passes now
        self.generate(node, 1)
        assert all([res["allowed"] is True
                    for res in node.testmempoolaccept(rawtxs=[pc_hex, pd_hex])])

    def test_anc_count_limits_bushy(self):
        """Create a tree with 45 transactions in the mempool and 6 in the package:
        M1...M9 M10...M18 M19...M27 M28...M36 M37...M45
            ^      ^          ^         ^         ^             (each with 9 parents)
            P0     P1         P2        P3        P4
             ^     ^          ^         ^         ^              (5 parents)
                              PC
        Where M(9i+1)...M+(9i+9) are the parents of Pi and P0, P1, P2, P3, and P4 are the parents of PC.
        P0... P4 individually only have 9 parents each, and PC has no in-mempool parents. But
        combined, PC has 50 in-mempool and in-package parents.
        """
        node = self.nodes[0]
        assert_equal(0, node.getmempoolinfo()["size"])
        package_hex = []
        parent_txns = []
        parent_values = []
        scripts = []
        # Make package transactions P0 ... P4
        for _ in range(5):
            gp_tx = []
            gp_values = []
            gp_scripts = []
            # Make mempool transactions M(9i+1)...M(9i+9)
            for _ in range(9):
                parent_coin = self.coins.pop()
                value = parent_coin["amount"]
                txid = parent_coin["txid"]
                (tx, txhex, value, spk) = make_chain(
                    node, self.address, self.privkeys, txid, value)
                gp_tx.append(tx)
                gp_values.append(value)
                gp_scripts.append(spk)
                node.sendrawtransaction(txhex)
            # Package transaction Pi
            pi_hex = create_child_with_parents(
                node, self.address, self.privkeys, gp_tx, gp_values, gp_scripts)
            package_hex.append(pi_hex)
            pi_tx = FromHex(CTransaction(), pi_hex)
            parent_txns.append(pi_tx)
            parent_values.append(Decimal(pi_tx.vout[0].nValue) / XEC)
            scripts.append(pi_tx.vout[0].scriptPubKey.hex())
        # Package transaction PC
        package_hex.append(
            create_child_with_parents(node, self.address, self.privkeys,
                                      parent_txns, parent_values, scripts))

        assert_equal(45, node.getmempoolinfo()["size"])
        assert_equal(6, len(package_hex))
        testres = node.testmempoolaccept(rawtxs=package_hex)
        for txres in testres:
            assert_equal(txres["package-error"], "package-mempool-limits")

        # Clear mempool and check that the package passes now
        self.generate(node, 1)
        assert all([res["allowed"] is True
                    for res in node.testmempoolaccept(rawtxs=package_hex)])

    def test_anc_size_limits(self):
        """Test Case with 2 independent transactions in the mempool and a parent + child in the
        package, where the package parent is the child of both mempool transactions (30KB each):
              A     B
               ^   ^
                 C
                 ^
                 D
        The lowest descendant, D, exceeds ancestor size limits, but only if the in-mempool
        and in-package ancestors are all considered together.
        """
        node = self.nodes[0]

        assert_equal(0, node.getmempoolinfo()["size"])
        parents_tx = []
        values = []
        scripts = []
        target_size = 30_000
        # 10 sats/B
        high_fee = Decimal("3000.00")
        self.log.info(
            "Check that in-mempool and in-package ancestor size limits are calculated properly in packages")
        # Mempool transactions A and B
        for _ in range(2):
            spk = None
            top_coin = self.coins.pop()
            txid = top_coin["txid"]
            value = top_coin["amount"]
            (tx, _, _, _) = make_chain(
                node, self.address, self.privkeys, txid, value, 0, spk, high_fee)
            bulked_tx = bulk_transaction(tx, node, target_size, self.privkeys)
            node.sendrawtransaction(ToHex(bulked_tx))
            parents_tx.append(bulked_tx)
            values.append(Decimal(bulked_tx.vout[0].nValue) / XEC)
            scripts.append(bulked_tx.vout[0].scriptPubKey.hex())

        # Package transaction C
        small_pc_hex = create_child_with_parents(
            node, self.address, self.privkeys, parents_tx, values, scripts, high_fee)
        pc_tx = bulk_transaction(
            FromHex(CTransaction(), small_pc_hex), node, target_size, self.privkeys)
        pc_value = Decimal(pc_tx.vout[0].nValue) / XEC
        pc_spk = pc_tx.vout[0].scriptPubKey.hex()
        pc_hex = ToHex(pc_tx)

        # Package transaction D
        (small_pd, _, val, spk) = make_chain(
            node, self.address, self.privkeys, pc_tx.rehash(), pc_value, 0, pc_spk, high_fee)
        prevtxs = [{
            "txid": pc_tx.get_id(),
            "vout": 0,
            "scriptPubKey": spk,
            "amount": pc_value,
        }]
        pd_tx = bulk_transaction(
            small_pd, node, target_size, self.privkeys, prevtxs)
        pd_hex = ToHex(pd_tx)

        assert_equal(2, node.getmempoolinfo()["size"])
        testres_too_heavy = node.testmempoolaccept(rawtxs=[pc_hex, pd_hex])
        for txres in testres_too_heavy:
            assert_equal(txres["package-error"], "package-mempool-limits")

        # Clear mempool and check that the package passes now
        self.generate(node, 1)
        assert all([res["allowed"] is True
                    for res in node.testmempoolaccept(rawtxs=[pc_hex, pd_hex])])

    def test_desc_size_limits(self):
        """Create 3 mempool transactions and 2 package transactions (25KB each):
              Ma
             ^ ^
            Mb  Mc
           ^     ^
          Pd      Pe
        The top ancestor in the package exceeds descendant size limits but only if the in-mempool
        and in-package descendants are all considered together.
        """
        node = self.nodes[0]
        assert_equal(0, node.getmempoolinfo()["size"])
        target_size = 21_000
        # 10 sats/vB
        high_fee = Decimal("2100.00")
        self.log.info(
            "Check that in-mempool and in-package descendant sizes are calculated properly in packages")
        # Top parent in mempool, Ma
        first_coin = self.coins.pop()
        # Deduct fee and make 2 outputs
        parent_value = (first_coin["amount"] - high_fee) / 2
        inputs = [{"txid": first_coin["txid"], "vout": 0}]
        outputs = [{self.address: parent_value},
                   {ADDRESS_ECREG_P2SH_OP_TRUE: parent_value}]
        rawtx = node.createrawtransaction(inputs, outputs)
        parent_tx = bulk_transaction(
            FromHex(CTransaction(), rawtx), node, target_size, self.privkeys)
        node.sendrawtransaction(ToHex(parent_tx))

        package_hex = []
        # Two legs (left and right)
        for j in range(2):
            # Mempool transaction (Mb and Mc)
            spk = parent_tx.vout[j].scriptPubKey.hex()
            value = Decimal(parent_tx.vout[j].nValue) / XEC
            txid = parent_tx.get_id()
            prevtxs = [{
                "txid": txid,
                "vout": j,
                "scriptPubKey": spk,
                "amount": value,
            }]
            if j == 0:
                # normal key
                (tx_small, _, _, _) = make_chain(
                    node, self.address, self.privkeys, txid, value, j, spk, high_fee)
                mempool_tx = bulk_transaction(
                    tx_small, node, target_size, self.privkeys, prevtxs)

            else:
                # OP_TRUE
                inputs = [{"txid": txid, "vout": 1}]
                outputs = {self.address: value - high_fee}
                small_tx = FromHex(
                    CTransaction(), node.createrawtransaction(inputs, outputs))
                mempool_tx = bulk_transaction(
                    small_tx, node, target_size, None, prevtxs)
            node.sendrawtransaction(ToHex(mempool_tx))

            # Package transaction (Pd and Pe)
            spk = mempool_tx.vout[0].scriptPubKey.hex()
            value = Decimal(mempool_tx.vout[0].nValue) / XEC
            txid = mempool_tx.get_id()
            (tx_small, _, _, _) = make_chain(
                node, self.address, self.privkeys, txid, value, 0, spk, high_fee)
            prevtxs = [{
                "txid": txid,
                "vout": 0,
                "scriptPubKey": spk,
                "amount": value,
            }]
            package_tx = bulk_transaction(
                tx_small, node, target_size, self.privkeys, prevtxs)
            package_hex.append(ToHex(package_tx))

        assert_equal(3, node.getmempoolinfo()["size"])
        assert_equal(2, len(package_hex))
        testres_too_heavy = node.testmempoolaccept(rawtxs=package_hex)
        for txres in testres_too_heavy:
            assert_equal(txres["package-error"], "package-mempool-limits")

        # Clear mempool and check that the package passes now
        self.generate(node, 1)
        assert all([res["allowed"] is True
                    for res in node.testmempoolaccept(rawtxs=package_hex)])


if __name__ == "__main__":
    MempoolPackageLimitsTest().main()
