#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)

class WHC_GetBalance_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def run_test(self):
        address = self.nodes[0].getnewaddress("")
        self.nodes[0].generatetoaddress(101, address)
        self.nodes[0].whc_burnbchgetwhc(2)
        self.nodes[0].generatetoaddress(1, address)
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        assert_equal(float(rpc_response["balance"]), 200.00000000)

        address = self.nodes[0].getnewaddress("")
        self.nodes[0].generatetoaddress(101, address)
        self.nodes[0].whc_burnbchgetwhc(10)
        self.nodes[0].generatetoaddress(1, address)
        response = self.nodes[0].whc_getbalance(address, 1)


if __name__ == '__main__':
    WHC_GetBalance_Test().main()