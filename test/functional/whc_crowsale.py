#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)
import time


class WHC_TOKEN_CROW(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.tip = None
        self.setup_clean_chain = True

    def token_crow_test(self):

        # generate 200whc for node[0]
        address = self.nodes[0].getnewaddress("")
        address_dst = self.nodes[1].getnewaddress("")
        self.nodes[0].generatetoaddress(201, address)
        self.nodes[1].generatetoaddress(11, address_dst)
        time.sleep(3)
        trans_id = self.nodes[0].whc_burnbchgetwhc(40, address)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)

        # issue crowd-sale
        trans_id = self.nodes[0].whc_sendissuancecrowdsale(address, 1, 1, 0, "lhr test", "lhr", "whccoin",
                                                           "www.lhr.com",
                                                           "test crowd", 1, "100", 3034937279, 10, 0, "1000000")
        time.sleep(1)
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        assert_equal(float(rpc_response["balance"]), 4000.00000000)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        rpc_response_dst = self.nodes[1].whc_getbalance(address_dst, 1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        property_id = trans["propertyid"]
        sale = self.nodes[0].whc_getcrowdsale(property_id)
        assert_equal(sale["active"], True)
        assert_equal(float(rpc_response["balance"]), 3999.00000000)
        assert_equal(float(rpc_response_dst["balance"]), 0.00000000)
        ret = self.nodes[0].whc_getproperty(property_id)

        # participate the crowd-sale
        trans_id = self.nodes[0].whc_send(address, address_dst, 1, "100")
        self.nodes[0].sendtoaddress(address_dst, 100)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)
        trans_id = self.nodes[1].whc_particrowsale(address_dst, address, "10")
        time.sleep(4)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(4)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        balance = self.nodes[1].whc_getbalance(address_dst, property_id)
        assert float(balance["balance"]) > 1000.0

        # shutdown the crowd
        trans_id = self.nodes[0].whc_sendclosecrowdsale(address, property_id)
        self.nodes[0].generatetoaddress(1, address)
        self.nodes[1].generatetoaddress(1, address_dst)
        time.sleep(1)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        sale = self.nodes[0].whc_getcrowdsale(property_id)
        assert_equal(sale["active"], False)

    def run_test(self):
        self.token_crow_test()


if __name__ == '__main__':
    WHC_TOKEN_CROW().main()
