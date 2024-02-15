# Copyright (c) 2020 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test fee filters during and after IBD."""

from decimal import Decimal

from test_framework.messages import XEC
from test_framework.test_framework import BitcoinTestFramework

MAX_FEE_FILTER = Decimal(9170997) / XEC
NORMAL_FEE_FILTER = Decimal(100) / XEC


class P2PIBDTxRelayTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.extra_args = [
            [f"-minrelaytxfee={NORMAL_FEE_FILTER}"],
            [f"-minrelaytxfee={NORMAL_FEE_FILTER}"],
        ]

    def run_test(self):
        self.log.info("Check that nodes set minfilter to MAX_MONEY while still in IBD")
        for node in self.nodes:
            assert node.getblockchaininfo()["initialblockdownload"]
            self.wait_until(
                lambda: all(
                    peer["minfeefilter"] == MAX_FEE_FILTER
                    for peer in node.getpeerinfo()
                )
            )

        # Come out of IBD by generating a block
        self.generate(self.nodes[0], 1)

        self.log.info("Check that nodes reset minfilter after coming out of IBD")
        for node in self.nodes:
            assert not node.getblockchaininfo()["initialblockdownload"]
            self.wait_until(
                lambda: all(
                    peer["minfeefilter"] == NORMAL_FEE_FILTER
                    for peer in node.getpeerinfo()
                )
            )


if __name__ == "__main__":
    P2PIBDTxRelayTest().main()
