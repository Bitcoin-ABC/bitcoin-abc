#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)


class WHC_SimpleSend_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.tip = None
        self.setup_clean_chain = True

    def test_case(self):
        addressA = self.nodes[0].getnewaddress("")
        addressB = self.nodes[0].getnewaddress("")
        self.nodes[0].generatetoaddress(101, addressA)
        self.nodes[0].whc_burnbchgetwhc(2)
        self.nodes[0].generatetoaddress(1, addressA)
        self.nodes[0].whc_sendissuancefixed(addressA, 1, 1, 0, "Companies", "Bitcoin Mining", "Quantum Miner", "", "",
                                            "1000000")
        self.nodes[0].generatetoaddress(1, addressA)
        propertylist = self.nodes[0].whc_listproperties()
        assert any(d.get("propertyid") == 3 for d in propertylist)

        pty = self.nodes[0].whc_getproperty(3)
        assert_equal(addressA, pty["issuer"])
        assert_equal(float(pty["totaltokens"]), float(1000000))

        self.nodes[0].whc_send(addressA,addressB,3,"100000")
        self.nodes[0].generatetoaddress(1, addressA)

        balanceA = self.nodes[0].whc_getbalance(addressA, 3)
        balanceB = self.nodes[0].whc_getbalance(addressB, 3)

        assert float(balanceA["balance"])==float(900000.0) and float(balanceB["balance"])==float(100000.0)


    def run_test(self):
        self.test_case()


if __name__ == '__main__':
    WHC_SimpleSend_Test().main()
