#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)
from test_framework.authproxy import JSONRPCException
import time


class WHC_TOKEN_CROW(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.tip = None
        self.setup_clean_chain = True

    def token_crow_test(self):

        # part1: generate 200whc for node[0]
        address = self.nodes[0].getnewaddress("")
        address_dst = self.nodes[1].getnewaddress("")
        self.nodes[0].generatetoaddress(201, address)
        self.nodes[1].generatetoaddress(11, address_dst)
        time.sleep(3)
        trans_id = self.nodes[0].whc_burnbchgetwhc(40, address)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)

        trans_id = self.nodes[0].whc_sendissuancecrowdsale(address, 1, 1, 0, "lhr test", "lhr", "whccoin",
                                                           "www.lhr.com",
                                                           "test crowd", 1, "100", 3034937279, 10, 0, "1000000")
        time.sleep(2)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(2)
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        rpc_response_dst = self.nodes[1].whc_getbalance(address_dst, 1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        property_id = trans["propertyid"]
        print(property_id)
        sale = self.nodes[0].whc_getcrowdsale(property_id)
        assert_equal(sale["active"], True)
        assert_equal(float(rpc_response["balance"]), 3999.00000000)
        assert_equal(float(rpc_response_dst["balance"]), 0.00000000)

        # active crowd sale cannot change issuer
        bala = self.nodes[0].getbalance()
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 1)
        payload = self.nodes[0].whc_createpayload_changeissuer(property_id)
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.986)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address_dst)
        ret = self.nodes[0].signrawtransaction(ret)
        trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(2)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        assert trans["valid"] is False
        assert trans["invalidreason"] == "Sender has an active crowdsale"


        # participate the crowd-sale
        trans_id = self.nodes[0].whc_send(address, address_dst, 1, "100")
        self.nodes[0].sendtoaddress(address_dst, 100)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(2)
        # exception: Invalid inputs for the send transaction
        try:
            self.nodes[0].whc_particrowsale(address_dst, address, "10")
        except JSONRPCException as e:
            assert str(e) == "Error with selected inputs for the send transaction (-206)"

        trans_id = self.nodes[1].whc_particrowsale(address_dst, address, "10")
        time.sleep(4)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(3)
        raw = self.nodes[1].gettransaction(trans_id)
        ret = self.nodes[1].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        balance = self.nodes[1].whc_getbalance(address_dst, property_id)
        print(balance)
        assert float(balance["balance"]) >= 1000.0

        # shutdown the crowd
        # exception: Invalid amount
        try:
            self.nodes[0].whc_sendclosecrowdsale(address, property_id+1)
        except JSONRPCException as e:
            assert str(e) == "Property identifier does not exist (-8)"

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
