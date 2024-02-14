# Copyright (c) 2020 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test the dumpcoins RPCs call.
"""

from decimal import Decimal

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class DumpCoinsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        node = self.nodes[0]
        assert_equal(node.dumpcoins(), {})

        address0 = node.getnewaddress()
        address1 = node.getnewaddress()

        coinbases = []

        def generate_and_get_txid(address, expected_coins):
            blockhash = self.generatetoaddress(node, 1, address, sync_fun=self.no_op)[0]
            assert_equal(node.dumpcoins(), expected_coins)

            # Get the coinbase txid
            coinbases.append(node.getblock(blockhash)["tx"][0])

        generate_and_get_txid(address0, {})

        for _ in range(99):
            generate_and_get_txid(address1, {})

        # Coinbases reach maturity and start to show up.
        generate_and_get_txid(
            address1,
            {
                address0: [
                    {
                        "txid": coinbases[0],
                        "vout": 0,
                        "depth": 101,
                        "value": Decimal("50000000.00"),
                    }
                ],
            },
        )

        # And now on address1
        generate_and_get_txid(
            address1,
            {
                address0: [
                    {
                        "txid": coinbases[0],
                        "vout": 0,
                        "depth": 102,
                        "value": Decimal("50000000.00"),
                    }
                ],
                address1: [
                    {
                        "txid": coinbases[1],
                        "vout": 0,
                        "depth": 101,
                        "value": Decimal("50000000.00"),
                    }
                ],
            },
        )


if __name__ == "__main__":
    DumpCoinsTest().main()
