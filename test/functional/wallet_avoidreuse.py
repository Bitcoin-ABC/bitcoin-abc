# Copyright (c) 2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the avoid_reuse and setwalletflag features."""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_approx, assert_equal, assert_raises_rpc_error


def reset_balance(node, discardaddr):
    """Throw away all owned coins by the node so it gets a balance of 0."""
    balance = node.getbalance(avoid_reuse=False)
    if balance > 500000:
        node.sendtoaddress(
            address=discardaddr,
            amount=balance,
            subtractfeefromamount=True,
            avoid_reuse=False,
        )


def count_unspent(node):
    """Count the unspent outputs for the given node and return various statistics"""
    r = {
        "total": {
            "count": 0,
            "sum": 0,
        },
        "reused": {
            "count": 0,
            "sum": 0,
        },
    }
    supports_reused = True
    for utxo in node.listunspent(minconf=0):
        r["total"]["count"] += 1
        r["total"]["sum"] += utxo["amount"]
        if supports_reused and "reused" in utxo:
            if utxo["reused"]:
                r["reused"]["count"] += 1
                r["reused"]["sum"] += utxo["amount"]
        else:
            supports_reused = False
    r["reused"]["supported"] = supports_reused
    return r


def assert_unspent(
    node,
    total_count=None,
    total_sum=None,
    reused_supported=None,
    reused_count=None,
    reused_sum=None,
):
    """Make assertions about a node's unspent output statistics"""
    stats = count_unspent(node)
    if total_count is not None:
        assert_equal(stats["total"]["count"], total_count)
    if total_sum is not None:
        assert_approx(stats["total"]["sum"], total_sum, 1000)
    if reused_supported is not None:
        assert_equal(stats["reused"]["supported"], reused_supported)
    if reused_count is not None:
        assert_equal(stats["reused"]["count"], reused_count)
    if reused_sum is not None:
        assert_approx(stats["reused"]["sum"], reused_sum, 0.001)


def assert_balances(node, mine):
    """Make assertions about a node's getbalances output"""
    got = node.getbalances()["mine"]
    for k, v in mine.items():
        assert_approx(got[k], v, 1000)


class AvoidReuseTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.noban_tx_relay = True

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        """Set up initial chain and run tests defined below"""

        self.test_persistence()
        self.test_immutable()

        self.generate(self.nodes[0], 110)
        self.test_change_remains_change(self.nodes[1])
        reset_balance(self.nodes[1], self.nodes[0].getnewaddress())
        self.test_sending_from_reused_address_without_avoid_reuse()
        reset_balance(self.nodes[1], self.nodes[0].getnewaddress())
        self.test_sending_from_reused_address_fails()
        reset_balance(self.nodes[1], self.nodes[0].getnewaddress())
        self.test_getbalances_used()
        reset_balance(self.nodes[1], self.nodes[0].getnewaddress())
        self.test_full_destination_group_is_preferred()
        reset_balance(self.nodes[1], self.nodes[0].getnewaddress())
        self.test_all_destination_groups_are_used()

    def test_persistence(self):
        """Test that wallet files persist the avoid_reuse flag."""
        self.log.info("Test wallet files persist avoid_reuse flag")

        # Configure node 1 to use avoid_reuse
        self.nodes[1].setwalletflag("avoid_reuse")

        # Flags should be node1.avoid_reuse=false, node2.avoid_reuse=true
        assert_equal(self.nodes[0].getwalletinfo()["avoid_reuse"], False)
        assert_equal(self.nodes[1].getwalletinfo()["avoid_reuse"], True)

        # Stop and restart node 1
        self.restart_node(1)
        self.connect_nodes(0, 1)

        # Flags should still be node1.avoid_reuse=false, node2.avoid_reuse=true
        assert_equal(self.nodes[0].getwalletinfo()["avoid_reuse"], False)
        assert_equal(self.nodes[1].getwalletinfo()["avoid_reuse"], True)

        # Attempting to set flag to its current state should throw
        assert_raises_rpc_error(
            -8,
            "Wallet flag is already set to false",
            self.nodes[0].setwalletflag,
            "avoid_reuse",
            False,
        )
        assert_raises_rpc_error(
            -8,
            "Wallet flag is already set to true",
            self.nodes[1].setwalletflag,
            "avoid_reuse",
            True,
        )

    def test_immutable(self):
        """Test immutable wallet flags"""
        self.log.info("Test immutable wallet flags")

        # Attempt to set the disable_private_keys flag; this should not work
        assert_raises_rpc_error(
            -8,
            "Wallet flag is immutable",
            self.nodes[1].setwalletflag,
            "disable_private_keys",
        )

        tempwallet = ".wallet_avoidreuse.py_test_immutable_wallet.dat"

        # Create a wallet with disable_private_keys set; this should work
        self.nodes[1].createwallet(wallet_name=tempwallet, disable_private_keys=True)
        w = self.nodes[1].get_wallet_rpc(tempwallet)

        # Attempt to unset the disable_private_keys flag; this should not work
        assert_raises_rpc_error(
            -8,
            "Wallet flag is immutable",
            w.setwalletflag,
            "disable_private_keys",
            False,
        )

        # Unload temp wallet
        self.nodes[1].unloadwallet(tempwallet)

    def test_change_remains_change(self, node):
        self.log.info("Test that change doesn't turn into non-change when spent")

        reset_balance(node, node.getnewaddress())
        addr = node.getnewaddress()
        txid = node.sendtoaddress(addr, 1000000)
        out = node.listunspent(minconf=0, query_options={"minimumAmount": 2000000})
        assert_equal(len(out), 1)
        assert_equal(out[0]["txid"], txid)
        changeaddr = out[0]["address"]

        # Make sure it's starting out as change as expected
        assert node.getaddressinfo(changeaddr)["ischange"]
        for logical_tx in node.listtransactions():
            assert logical_tx.get("address") != changeaddr

        # Spend it
        reset_balance(node, node.getnewaddress())

        # It should still be change
        assert node.getaddressinfo(changeaddr)["ischange"]
        for logical_tx in node.listtransactions():
            assert logical_tx.get("address") != changeaddr

    def test_sending_from_reused_address_without_avoid_reuse(self):
        """
        Test the same as test_sending_from_reused_address_fails, except send
        the 10MM XEC with the avoid_reuse flag set to false. This means the
        10MM XEC send should succeed, where it fails in
        test_sending_from_reused_address_fails.
        """
        self.log.info("Test sending from reused address with avoid_reuse=false")

        fundaddr = self.nodes[1].getnewaddress()
        retaddr = self.nodes[0].getnewaddress()

        self.nodes[0].sendtoaddress(fundaddr, 10000000)
        self.generate(self.nodes[0], 1)

        # listunspent should show 1 single, unused 10MM XEC output
        assert_unspent(
            self.nodes[1],
            total_count=1,
            total_sum=10000000,
            reused_supported=True,
            reused_count=0,
        )
        # getbalances should show no used, 10MM XEC trusted
        assert_balances(self.nodes[1], mine={"used": 0, "trusted": 10000000})
        # node 0 should not show a used entry, as it does not enable
        # avoid_reuse
        assert "used" not in self.nodes[0].getbalances()["mine"]

        self.nodes[1].sendtoaddress(retaddr, 5000000)
        self.generate(self.nodes[0], 1)

        # listunspent should show 1 single, unused 5MM XEC output
        assert_unspent(
            self.nodes[1],
            total_count=1,
            total_sum=5000000,
            reused_supported=True,
            reused_count=0,
        )
        # getbalances should show no used, 5MM XEC trusted
        assert_balances(self.nodes[1], mine={"used": 0, "trusted": 5000000})

        self.nodes[0].sendtoaddress(fundaddr, 10000000)
        self.generate(self.nodes[0], 1)

        # listunspent should show 2 total outputs (5MM, 10MM XEC), one unused
        # (5MM), one reused (10MM)
        assert_unspent(
            self.nodes[1],
            total_count=2,
            total_sum=15000000,
            reused_count=1,
            reused_sum=10000000,
        )
        # getbalances should show 10MM used, 5MM XEC trusted
        assert_balances(self.nodes[1], mine={"used": 10000000, "trusted": 5000000})

        self.nodes[1].sendtoaddress(address=retaddr, amount=10000000, avoid_reuse=False)

        # listunspent should show 1 total outputs (5MM XEC), unused
        assert_unspent(self.nodes[1], total_count=1, total_sum=5000000, reused_count=0)
        # getbalances should show no used, 5MM XEC trusted
        assert_balances(self.nodes[1], mine={"used": 0, "trusted": 5000000})

        # node 1 should now have about 5MM XEC left (for both cases)
        assert_approx(self.nodes[1].getbalance(), 5000000, 1000)
        assert_approx(self.nodes[1].getbalance(avoid_reuse=False), 5000000, 1000)

    def test_sending_from_reused_address_fails(self):
        """
        Test the simple case where [1] generates a new address A, then
        [0] sends 10MM XEC to A.
        [1] spends 5MM XEC from A. (leaving roughly 5MM XEC useable)
        [0] sends 10MM XEC to A again.
        [1] tries to spend 10MM XEC (fails; dirty).
        [1] tries to spend 4MM XEC (succeeds; change address sufficient)
        """
        self.log.info("Test sending from reused address fails")

        fundaddr = self.nodes[1].getnewaddress(label="", address_type="legacy")
        retaddr = self.nodes[0].getnewaddress()

        self.nodes[0].sendtoaddress(fundaddr, 10000000)
        self.generate(self.nodes[0], 1)

        # listunspent should show 1 single, unused 10MM XEC output
        assert_unspent(
            self.nodes[1],
            total_count=1,
            total_sum=10000000,
            reused_supported=True,
            reused_count=0,
        )
        # getbalances should show no used, 10MM XEC trusted
        assert_balances(self.nodes[1], mine={"used": 0, "trusted": 10000000})

        self.nodes[1].sendtoaddress(retaddr, 5000000)
        self.generate(self.nodes[0], 1)

        # listunspent should show 1 single, unused 5MM XEC output
        assert_unspent(
            self.nodes[1],
            total_count=1,
            total_sum=5000000,
            reused_supported=True,
            reused_count=0,
        )
        # getbalances should show no used, 5MM XEC trusted
        assert_balances(self.nodes[1], mine={"used": 0, "trusted": 5000000})

        if not self.options.descriptors:
            # For the second send, we transmute it to a related single-key address
            # to make sure it's also detected as re-use
            # NB: this is not very useful for ABC, but we keep the new variable
            # name for consistency.
            new_fundaddr = fundaddr

            self.nodes[0].sendtoaddress(new_fundaddr, 10000000)
            self.generate(self.nodes[0], 1)

            # listunspent should show 2 total outputs (5MM, 10MM XEC), one unused
            # (5MM), one reused (10MM)
            assert_unspent(
                self.nodes[1],
                total_count=2,
                total_sum=15000000,
                reused_count=1,
                reused_sum=10000000,
            )
            # getbalances should show 10MM used, 5MM XEC trusted
            assert_balances(self.nodes[1], mine={"used": 10000000, "trusted": 5000000})

            # node 1 should now have a balance of 5MM (no dirty) or 15MM
            # (including dirty)
            assert_approx(self.nodes[1].getbalance(), 5000000, 1000)
            assert_approx(self.nodes[1].getbalance(avoid_reuse=False), 15000000, 1000)

            assert_raises_rpc_error(
                -6, "Insufficient funds", self.nodes[1].sendtoaddress, retaddr, 10000000
            )

            self.nodes[1].sendtoaddress(retaddr, 4000000)

            # listunspent should show 2 total outputs (1MM, 10MM XEC), one unused
            # (1MM), one reused (10MM)
            assert_unspent(
                self.nodes[1],
                total_count=2,
                total_sum=11000000,
                reused_count=1,
                reused_sum=10000000,
            )
            # getbalances should show 10MM used, 1MM XEC trusted
            assert_balances(self.nodes[1], mine={"used": 10000000, "trusted": 1000000})

            # node 1 should now have about 1MM XEC left (no dirty) and 11MM
            # (including dirty)
            assert_approx(self.nodes[1].getbalance(), 1000000, 1000)
            assert_approx(self.nodes[1].getbalance(avoid_reuse=False), 11000000, 1000)

    def test_getbalances_used(self):
        """
        getbalances and listunspent should pick up on reused addresses
        immediately, even for address reusing outputs created before the first
        transaction was spending from that address
        """
        self.log.info("Test getbalances used category")

        # node under test should be completely empty
        assert_equal(self.nodes[1].getbalance(avoid_reuse=False), 0)

        new_addr = self.nodes[1].getnewaddress()
        ret_addr = self.nodes[0].getnewaddress()

        # send multiple transactions, reusing one address
        for _ in range(11):
            self.nodes[0].sendtoaddress(new_addr, 1000000)

        self.generate(self.nodes[0], 1)

        # send transaction that should not use all the available outputs
        # per the current coin selection algorithm
        self.nodes[1].sendtoaddress(ret_addr, 5000000)

        # getbalances and listunspent should show the remaining outputs
        # in the reused address as used/reused
        assert_unspent(
            self.nodes[1],
            total_count=2,
            total_sum=6000000,
            reused_count=1,
            reused_sum=1000000,
        )
        assert_balances(self.nodes[1], mine={"used": 1000000, "trusted": 5000000})

    def test_full_destination_group_is_preferred(self):
        """
        Test the case where [1] only has 11 outputs of 1MM XEC in the same
        reused address and tries to send a small payment of 500,000 XEC.
        The wallet should use 10 outputs from the reused address as inputs and
        not a single 1MM XEC input, in order to join several outputs from
        the reused address.
        """
        self.log.info(
            "Test that full destination groups are preferred in coin selection"
        )

        # Node under test should be empty
        assert_equal(self.nodes[1].getbalance(avoid_reuse=False), 0)

        new_addr = self.nodes[1].getnewaddress()
        ret_addr = self.nodes[0].getnewaddress()

        # Send 11 outputs of 1MM XEC to the same, reused address in the wallet
        for _ in range(11):
            self.nodes[0].sendtoaddress(new_addr, 1000000)

        self.generate(self.nodes[0], 1)

        # Sending a transaction that is smaller than each one of the
        # available outputs
        txid = self.nodes[1].sendtoaddress(address=ret_addr, amount=500000)
        inputs = self.nodes[1].getrawtransaction(txid, 1)["vin"]

        # The transaction should use 10 inputs exactly
        assert_equal(len(inputs), 10)

    def test_all_destination_groups_are_used(self):
        """
        Test the case where [1] only has 22 outputs of 1MM XEC in the same
        reused address and tries to send a payment of 20,5MM XEC.
        The wallet should use all 22 outputs from the reused address as inputs.
        """
        self.log.info("Test that all destination groups are used")

        # Node under test should be empty
        assert_equal(self.nodes[1].getbalance(avoid_reuse=False), 0)

        new_addr = self.nodes[1].getnewaddress()
        ret_addr = self.nodes[0].getnewaddress()

        # Send 22 outputs of 1MM XEC to the same, reused address in the wallet
        for _ in range(22):
            self.nodes[0].sendtoaddress(new_addr, 1000000)

        self.generate(self.nodes[0], 1)

        # Sending a transaction that needs to use the full groups
        # of 10 inputs but also the incomplete group of 2 inputs.
        txid = self.nodes[1].sendtoaddress(address=ret_addr, amount=20500000)
        inputs = self.nodes[1].getrawtransaction(txid, 1)["vin"]

        # The transaction should use 22 inputs exactly
        assert_equal(len(inputs), 22)


if __name__ == "__main__":
    AvoidReuseTest().main()
