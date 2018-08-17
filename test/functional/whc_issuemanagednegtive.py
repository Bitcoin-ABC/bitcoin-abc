#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)
from test_framework.authproxy import JSONRPCException
import time

class WHC_TOKEN_MANAGE(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.tip = None
        self.setup_clean_chain = True

    def token_manage_test(self):
        # generate 200whc for node[0]
        address = self.nodes[0].getnewaddress("")
        address_dst = self.nodes[1].getnewaddress("")
        self.nodes[0].generatetoaddress(1, address)
        self.nodes[0].generatetoaddress(1, address_dst)
        time.sleep(5)
        self.nodes[0].generatetoaddress(100, address)
        time.sleep(5)
        trans_id = self.nodes[0].whc_burnbchgetwhc(4)
        trans_id1 = self.nodes[1].whc_burnbchgetwhc(4)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)

        # exp1: Ecosystem is invalid
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 2)
        payload = self.nodes[0].whc_createpayload_issuancemanaged(1, 1, 0, "", "", "l", "", "")
        p = payload[:9] + '3' + payload[10:]
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, p)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 45.99)
        ret = self.nodes[0].signrawtransaction(ret)
        trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        assert trans["valid"] is False
        assert trans["invalidreason"] == "Ecosystem is invalid"

        # exp2: property name is invalid
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 1)
        payload = self.nodes[0].whc_createpayload_issuancemanaged(1, 1, 0, "", "", "l", "", "")
        p = payload[:26] + "00" + payload[28:]
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, p)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 45.98)
        ret = self.nodes[0].signrawtransaction(ret)
        trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        assert trans["valid"] is False
        assert trans["invalidreason"] == "Property name is empty"

    def run_test(self):
        self.token_manage_test()


if __name__ == '__main__':
    WHC_TOKEN_MANAGE().main()
