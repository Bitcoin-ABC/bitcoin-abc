#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_array_result, sync_chain, sync_blocks, assert_notemptylist)
from test_framework.authproxy import JSONRPCException


class WhcNegtiveTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def run_test(self):
        addr0 = self.nodes[0].getnewaddress("")
        self.nodes[0].generatetoaddress(101, addr0)

        # less than 1 BCH
        # try:
        ret = self.nodes[0].whc_burnbchgetwhc(0.5)
        # except JSONRPCException as e:
        #     assert str(e) == "burn amount less 1BCH  (-3)"
        #
        # # more than 8 pricision
        # try:
        #     ret = self.nodes[0].whc_burnbchgetwhc(1.0123456789)
        # except JSONRPCException as e:
        #     assert str(e) == "Invalid amount (-3)"
        #
        # ret = self.nodes[0].whc_burnbchgetwhc(1.01234)
        # self.nodes[0].generatetoaddress(1, addr0)
        # ret = self.nodes[0].whc_getproperty(1)
        # assert ret["totaltokens"] == '101.23400000'



if __name__ == '__main__':
    WhcNegtiveTest().main()
