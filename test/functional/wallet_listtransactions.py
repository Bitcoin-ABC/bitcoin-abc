# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the listtransactions API."""

from decimal import Decimal

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_array_result, assert_equal


class ListTransactionsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        # This test isn't testing txn relay/timing, so set whitelist on the
        # peers for instant txn relay. This speeds up the test run time 2-3x.
        self.extra_args = [["-whitelist=noban@127.0.0.1"]] * self.num_nodes

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        # Leave IBD
        self.generate(self.nodes[0], 1)
        # Simple send, 0 to 1:
        txid = self.nodes[0].sendtoaddress(self.nodes[1].getnewaddress(), 100000)
        self.sync_all()
        assert_array_result(
            self.nodes[0].listtransactions(),
            {"txid": txid},
            {"category": "send", "amount": Decimal("-100000"), "confirmations": 0},
        )
        assert_array_result(
            self.nodes[1].listtransactions(),
            {"txid": txid},
            {"category": "receive", "amount": Decimal("100000"), "confirmations": 0},
        )
        # mine a block, confirmations should change:
        blockhash = self.generate(self.nodes[0], 1)[0]
        blockheight = self.nodes[0].getblockheader(blockhash)["height"]
        assert_array_result(
            self.nodes[0].listtransactions(),
            {"txid": txid},
            {
                "category": "send",
                "amount": Decimal("-100000"),
                "confirmations": 1,
                "blockhash": blockhash,
                "blockheight": blockheight,
            },
        )
        assert_array_result(
            self.nodes[1].listtransactions(),
            {"txid": txid},
            {
                "category": "receive",
                "amount": Decimal("100000"),
                "confirmations": 1,
                "blockhash": blockhash,
                "blockheight": blockheight,
            },
        )

        # send-to-self:
        txid = self.nodes[0].sendtoaddress(self.nodes[0].getnewaddress(), 200000)
        assert_array_result(
            self.nodes[0].listtransactions(),
            {"txid": txid, "category": "send"},
            {"amount": Decimal("-200000")},
        )
        assert_array_result(
            self.nodes[0].listtransactions(),
            {"txid": txid, "category": "receive"},
            {"amount": Decimal("200000")},
        )

        # sendmany from node1: twice to self, twice to node2:
        send_to = {
            self.nodes[0].getnewaddress(): 110000,
            self.nodes[1].getnewaddress(): 220000,
            self.nodes[0].getnewaddress(): 330000,
            self.nodes[1].getnewaddress(): 440000,
        }
        txid = self.nodes[1].sendmany("", send_to)
        self.sync_all()
        assert_array_result(
            self.nodes[1].listtransactions(),
            {"category": "send", "amount": Decimal("-110000")},
            {"txid": txid},
        )
        assert_array_result(
            self.nodes[0].listtransactions(),
            {"category": "receive", "amount": Decimal("110000")},
            {"txid": txid},
        )
        assert_array_result(
            self.nodes[1].listtransactions(),
            {"category": "send", "amount": Decimal("-220000")},
            {"txid": txid},
        )
        assert_array_result(
            self.nodes[1].listtransactions(),
            {"category": "receive", "amount": Decimal("220000")},
            {"txid": txid},
        )
        assert_array_result(
            self.nodes[1].listtransactions(),
            {"category": "send", "amount": Decimal("-330000")},
            {"txid": txid},
        )
        assert_array_result(
            self.nodes[0].listtransactions(),
            {"category": "receive", "amount": Decimal("330000")},
            {"txid": txid},
        )
        assert_array_result(
            self.nodes[1].listtransactions(),
            {"category": "send", "amount": Decimal("-440000")},
            {"txid": txid},
        )
        assert_array_result(
            self.nodes[1].listtransactions(),
            {"category": "receive", "amount": Decimal("440000")},
            {"txid": txid},
        )

        if not self.options.descriptors:
            # include_watchonly is a legacy wallet feature, so don't test it
            # for descriptor wallets
            pubkey = self.nodes[1].getaddressinfo(self.nodes[1].getnewaddress())[
                "pubkey"
            ]
            multisig = self.nodes[1].createmultisig(1, [pubkey])
            self.nodes[0].importaddress(
                multisig["redeemScript"], "watchonly", False, True
            )
            txid = self.nodes[1].sendtoaddress(multisig["address"], 100000)
            self.generate(self.nodes[1], 1)
            assert_equal(
                len(
                    self.nodes[0].listtransactions(
                        label="watchonly", include_watchonly=True
                    )
                ),
                1,
            )
            assert_equal(
                len(
                    self.nodes[0].listtransactions(
                        dummy="watchonly", include_watchonly=True
                    )
                ),
                1,
            )
            assert (
                len(
                    self.nodes[0].listtransactions(
                        label="watchonly", count=100, include_watchonly=False
                    )
                )
                == 0
            )
            assert_array_result(
                self.nodes[0].listtransactions(
                    label="watchonly", count=100, include_watchonly=True
                ),
                {"category": "receive", "amount": Decimal("100000")},
                {"txid": txid, "label": "watchonly"},
            )


if __name__ == "__main__":
    ListTransactionsTest().main()
