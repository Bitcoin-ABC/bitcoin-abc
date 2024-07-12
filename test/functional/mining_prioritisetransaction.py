# Copyright (c) 2015-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the prioritisetransaction mining RPC."""

import time
from decimal import Decimal

# FIXME: review how this test needs to be adapted w.r.t _LEGACY_MAX_BLOCK_SIZE
from test_framework.cdefs import LEGACY_MAX_BLOCK_SIZE
from test_framework.messages import COIN, XEC
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_raises_rpc_error,
    create_lots_of_big_transactions,
    gen_return_txouts,
)
from test_framework.wallet import MiniWallet


class PrioritiseTransactionTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        # TODO: remove -txindex. Currently required for getrawtransaction call
        # (called by calculate_fee_from_txid)
        self.extra_args = [["-printpriority=1", "-acceptnonstdtxn=1", "-txindex"]]
        self.supports_cli = False

    def test_diamond(self):
        self.log.info("Test diamond-shape package with priority")
        mock_time = int(time.time())
        self.nodes[0].setmocktime(mock_time)

        #      tx_a
        #      / \
        #     /   \
        #   tx_b  tx_c
        #     \   /
        #      \ /
        #      tx_d

        tx_o_a = self.wallet.send_self_transfer_multi(
            from_node=self.nodes[0],
            num_outputs=2,
        )
        txid_a = tx_o_a["txid"]

        tx_o_b, tx_o_c = [
            self.wallet.send_self_transfer(
                from_node=self.nodes[0],
                utxo_to_spend=u,
            )
            for u in tx_o_a["new_utxos"]
        ]
        txid_b = tx_o_b["txid"]
        txid_c = tx_o_c["txid"]

        tx_o_d = self.wallet.send_self_transfer_multi(
            from_node=self.nodes[0],
            utxos_to_spend=[
                self.wallet.get_utxo(txid=txid_b),
                self.wallet.get_utxo(txid=txid_c),
            ],
        )
        txid_d = tx_o_d["txid"]

        self.log.info("Test priority while txs are in mempool")
        raw_before = self.nodes[0].getrawmempool(verbose=True)
        assert_equal(
            raw_before[txid_a]["fees"]["base"], raw_before[txid_a]["fees"]["modified"]
        )
        assert_equal(
            raw_before[txid_b]["fees"]["base"], raw_before[txid_b]["fees"]["modified"]
        )
        assert_equal(
            raw_before[txid_c]["fees"]["base"], raw_before[txid_c]["fees"]["modified"]
        )
        assert_equal(
            raw_before[txid_d]["fees"]["base"], raw_before[txid_d]["fees"]["modified"]
        )
        fee_delta_b = Decimal(9999) / XEC
        fee_delta_c_1 = Decimal(-1234) / XEC
        fee_delta_c_2 = Decimal(8888) / XEC
        self.nodes[0].prioritisetransaction(
            txid=txid_b, fee_delta=int(fee_delta_b * XEC)
        )
        self.nodes[0].prioritisetransaction(
            txid=txid_c, fee_delta=int(fee_delta_c_1 * XEC)
        )
        self.nodes[0].prioritisetransaction(
            txid=txid_c, fee_delta=int(fee_delta_c_2 * XEC)
        )
        raw_after = self.nodes[0].getrawmempool(verbose=True)
        assert_equal(
            raw_after[txid_a]["fees"]["modified"], raw_before[txid_a]["fees"]["base"]
        )
        assert_equal(
            raw_after[txid_b]["fees"]["modified"],
            raw_before[txid_b]["fees"]["base"] + fee_delta_b,
        )
        assert_equal(
            raw_after[txid_c]["fees"]["modified"],
            raw_before[txid_c]["fees"]["base"] + fee_delta_c_1 + fee_delta_c_2,
        )
        assert_equal(
            raw_after[txid_d]["fees"]["modified"], raw_before[txid_d]["fees"]["base"]
        )

        self.log.info("Test priority while txs are not in mempool")
        self.restart_node(0, extra_args=["-nopersistmempool"])
        self.nodes[0].setmocktime(mock_time)
        assert_equal(self.nodes[0].getmempoolinfo()["size"], 0)
        self.nodes[0].prioritisetransaction(
            txid=txid_b, fee_delta=int(fee_delta_b * XEC)
        )
        self.nodes[0].prioritisetransaction(
            txid=txid_c, fee_delta=int(fee_delta_c_1 * XEC)
        )
        self.nodes[0].prioritisetransaction(
            txid=txid_c, fee_delta=int(fee_delta_c_2 * XEC)
        )
        for t in [tx_o_a["hex"], tx_o_b["hex"], tx_o_c["hex"], tx_o_d["hex"]]:
            self.nodes[0].sendrawtransaction(t)
        raw_after = self.nodes[0].getrawmempool(verbose=True)
        assert_equal(raw_before[txid_a], raw_after[txid_a])
        assert_equal(
            raw_after[txid_a]["fees"]["modified"], raw_before[txid_a]["fees"]["base"]
        )
        assert_equal(
            raw_after[txid_b]["fees"]["modified"],
            raw_before[txid_b]["fees"]["base"] + fee_delta_b,
        )
        assert_equal(
            raw_after[txid_c]["fees"]["modified"],
            raw_before[txid_c]["fees"]["base"] + fee_delta_c_1 + fee_delta_c_2,
        )
        assert_equal(
            raw_after[txid_d]["fees"]["modified"], raw_before[txid_d]["fees"]["base"]
        )

        # Clear mempool
        self.generate(self.nodes[0], 1)
        assert_equal(len(self.nodes[0].getrawmempool()), 0)

        # Use default extra_args
        self.restart_node(0)

    def run_test(self):
        self.wallet = MiniWallet(self.nodes[0])
        self.wallet.rescan_utxos()

        # Test `prioritisetransaction` required parameters
        assert_raises_rpc_error(
            -1, "prioritisetransaction", self.nodes[0].prioritisetransaction
        )
        assert_raises_rpc_error(
            -1, "prioritisetransaction", self.nodes[0].prioritisetransaction, ""
        )
        assert_raises_rpc_error(
            -1, "prioritisetransaction", self.nodes[0].prioritisetransaction, "", 0
        )

        # Test `prioritisetransaction` invalid extra parameters
        assert_raises_rpc_error(
            -1,
            "prioritisetransaction",
            self.nodes[0].prioritisetransaction,
            "",
            0,
            0,
            0,
        )

        # Test `prioritisetransaction` invalid `txid`
        assert_raises_rpc_error(
            -8,
            "txid must be of length 64 (not 3, for 'foo')",
            self.nodes[0].prioritisetransaction,
            txid="foo",
            fee_delta=0,
        )
        assert_raises_rpc_error(
            -8,
            "txid must be hexadecimal string (not"
            " 'Zd1d4e24ed99057e84c3f80fd8fbec79ed9e1acee37da269356ecea000000000')",
            self.nodes[0].prioritisetransaction,
            txid="Zd1d4e24ed99057e84c3f80fd8fbec79ed9e1acee37da269356ecea000000000",
            fee_delta=0,
        )

        # Test `prioritisetransaction` invalid `dummy`
        txid = "1d1d4e24ed99057e84c3f80fd8fbec79ed9e1acee37da269356ecea000000000"
        assert_raises_rpc_error(
            -3,
            "not of expected type number",
            self.nodes[0].prioritisetransaction,
            txid,
            "foo",
            0,
        )
        assert_raises_rpc_error(
            -8,
            "Priority is no longer supported, dummy argument to"
            " prioritisetransaction must be 0.",
            self.nodes[0].prioritisetransaction,
            txid,
            1,
            0,
        )

        # Test `prioritisetransaction` invalid `fee_delta`
        assert_raises_rpc_error(
            -3,
            "not of expected type number",
            self.nodes[0].prioritisetransaction,
            txid=txid,
            fee_delta="foo",
        )

        self.test_diamond()

        self.txouts = gen_return_txouts()
        self.relayfee = self.nodes[0].getnetworkinfo()["relayfee"]

        utxo_count = 90
        utxos = self.wallet.send_self_transfer_multi(
            from_node=self.nodes[0], num_outputs=utxo_count
        )["new_utxos"]
        self.generate(self.wallet, 1)
        assert_equal(len(self.nodes[0].getrawmempool()), 0)

        # our transactions are smaller than 100kb
        base_fee = self.relayfee * 100
        txids = []

        # Create 3 batches of transactions at 3 different fee rate levels
        range_size = utxo_count // 3
        for i in range(3):
            txids.append([])
            start_range = i * range_size
            end_range = start_range + range_size
            txids[i] = create_lots_of_big_transactions(
                self.wallet,
                self.nodes[0],
                (i + 1) * base_fee,
                end_range - start_range,
                self.txouts,
                utxos[start_range:end_range],
            )

        # Make sure that the size of each group of transactions exceeds
        # LEGACY_MAX_BLOCK_SIZE -- otherwise the test needs to be revised to create
        # more transactions.
        mempool = self.nodes[0].getrawmempool(True)
        sizes = [0, 0, 0]
        for i in range(3):
            for j in txids[i]:
                assert j in mempool
                sizes[i] += mempool[j]["size"]
            # Fail => raise utxo_count
            assert sizes[i] > LEGACY_MAX_BLOCK_SIZE

        # add a fee delta to something in the cheapest bucket and make sure it gets mined
        # also check that a different entry in the cheapest bucket is NOT mined
        self.nodes[0].prioritisetransaction(
            txid=txids[0][0],
            fee_delta=100 * self.nodes[0].calculate_fee_from_txid(txids[0][0]),
        )

        self.generate(self.nodes[0], 1)

        mempool = self.nodes[0].getrawmempool()
        self.log.info("Assert that prioritised transaction was mined")
        assert txids[0][0] not in mempool
        assert txids[0][1] in mempool

        confirmed_transactions = self.nodes[0].getblock(
            self.nodes[0].getbestblockhash()
        )["tx"]

        # Pull the highest fee-rate transaction from a block
        high_fee_tx = confirmed_transactions[1]

        # Something high-fee should have been mined!
        assert high_fee_tx is not None

        # Add a prioritisation before a tx is in the mempool (de-prioritising a
        # high-fee transaction so that it's now low fee).
        self.nodes[0].prioritisetransaction(
            txid=high_fee_tx,
            fee_delta=-int(2 * base_fee * COIN)
            + self.nodes[0].calculate_fee_from_txid(high_fee_tx),
        )

        # Add everything back to mempool
        self.nodes[0].invalidateblock(self.nodes[0].getbestblockhash())

        # Check to make sure our high fee rate tx is back in the mempool
        mempool = self.nodes[0].getrawmempool()
        assert high_fee_tx in mempool

        # Now verify the modified-high feerate transaction isn't mined before
        # the other high fee transactions. Keep mining until our mempool has
        # decreased by all the high fee size that we calculated above.
        while self.nodes[0].getmempoolinfo()["bytes"] > sizes[0] + sizes[1]:
            self.generate(self.nodes[0], 1, sync_fun=self.no_op)

        # High fee transaction should not have been mined, but other high fee rate
        # transactions should have been.
        mempool = self.nodes[0].getrawmempool()
        self.log.info("Assert that de-prioritised transaction is still in mempool")
        assert high_fee_tx in mempool
        for x in txids[2]:
            if x != high_fee_tx:
                assert x not in mempool

        # Create a free transaction. Should be rejected.
        tx_res = self.wallet.create_self_transfer(fee_rate=0)
        tx_hex = tx_res["hex"]
        tx_id = tx_res["txid"]

        # This will raise an exception due to min relay fee not being met
        assert_raises_rpc_error(
            -26, "min relay fee not met", self.nodes[0].sendrawtransaction, tx_hex
        )
        assert tx_id not in self.nodes[0].getrawmempool()

        # This is a less than 1000-byte transaction, so just set the fee
        # to be the minimum for a 1000-byte transaction and check that it is
        # accepted.
        self.nodes[0].prioritisetransaction(
            txid=tx_id, fee_delta=int(self.relayfee * COIN)
        )

        self.log.info("Assert that prioritised free transaction is accepted to mempool")
        assert_equal(self.nodes[0].sendrawtransaction(tx_hex), tx_id)
        assert tx_id in self.nodes[0].getrawmempool()

        # Test that calling prioritisetransaction is sufficient to trigger
        # getblocktemplate to (eventually) return a new block.
        mock_time = int(time.time())
        self.nodes[0].setmocktime(mock_time)
        self.nodes[0].add_p2p_connection(P2PInterface())
        template = self.nodes[0].getblocktemplate()
        self.nodes[0].prioritisetransaction(
            txid=tx_id, fee_delta=-int(self.relayfee * COIN)
        )
        self.nodes[0].setmocktime(mock_time + 10)
        new_template = self.nodes[0].getblocktemplate()

        assert template != new_template


if __name__ == "__main__":
    PrioritiseTransactionTest().main()
