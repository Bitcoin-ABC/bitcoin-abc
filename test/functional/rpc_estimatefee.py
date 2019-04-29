#!/usr/bin/env python3
# Copyright (c) 2019 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from decimal import Decimal

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


class EstimateFeeTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 3
        self.extra_args = [[], ["-minrelaytxfee=0.001"],
                           ["-deprecatedrpc=estimatefee"]]

    def run_test(self):
        default_node = self.nodes[0]
        diff_relay_fee_node = self.nodes[1]
        deprecated_node = self.nodes[2]
        for i in range(5):
            self.nodes[0].generate(1)

            # estimatefee is 0.00001 by default, regardless of block contents
            assert_equal(default_node.estimatefee(), Decimal('0.00001'))
            assert_equal(deprecated_node.estimatefee(), Decimal('0.00001'))

            # estimatefee may be different for nodes that set it in their config
            assert_equal(diff_relay_fee_node.estimatefee(), Decimal('0.001'))

        # nblocks arg is no longer supported. Make sure the error message
        # indicates this.
        assert_raises_rpc_error(-32, "estimatefee with the nblocks argument is no longer supported",
                                default_node.estimatefee, 1)

        # When marked as deprecated, estimatfee with nblocks set succeeds
        assert_equal(deprecated_node.estimatefee(1), Decimal('0.00001'))
        # Also test named arguments
        assert_equal(deprecated_node.estimatefee(
            nblocks=1), Decimal('0.00001'))


if __name__ == '__main__':
    EstimateFeeTest().main()
