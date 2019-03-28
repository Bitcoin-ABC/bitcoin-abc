#!/usr/bin/env python3
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from decimal import Decimal

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class EstimateFeeTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.extra_args = [[], ["-minrelaytxfee=0.001"]]

    def run_test(self):
        for i in range(5):
            self.nodes[0].generate(1)

            # estimatefee is 0.00001 by default, regardless of block contents
            assert_equal(self.nodes[0].estimatefee(i), Decimal('0.00001'))
            # Also test named arguments
            assert_equal(self.nodes[0].estimatefee(
                nblocks=i), Decimal('0.00001'))

            # estimatefee may be different for nodes that set it in their config
            assert_equal(self.nodes[1].estimatefee(i), Decimal('0.001'))


if __name__ == '__main__':
    EstimateFeeTest().main()
