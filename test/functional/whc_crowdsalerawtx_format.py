#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

import datetime
import time

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)


class WHC_RawTx_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.tip = None
        self.setup_clean_chain = True

    def run_test(self):
        # generate 200whc for node[0]
        address = self.nodes[0].getnewaddress("")
        address_dst = self.nodes[1].getnewaddress("")
        self.nodes[0].generatetoaddress(101, address)
        trans_id = self.nodes[0].whc_burnbchgetwhc(2)
        self.nodes[0].generatetoaddress(1, address)

        # transfer 100whc to node[1]
        trans_id = self.nodes[0].whc_send(address, address_dst, 1, "100")
        self.nodes[0].generatetoaddress(60, address)
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        rpc_response_dst = self.nodes[1].whc_getbalance(address_dst, 1)
        assert_equal(float(rpc_response["balance"]), 100.00000000)
        assert_equal(float(rpc_response_dst["balance"]), 100.00000000)

        # Test issuancecrowdsale vout
        trans = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 1)
        deadline = int(time.mktime(datetime.datetime.now().timetuple())) + 86400
        payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 3, 0, "reg crowdsale test",
                                                                    "crowdsale test", "reqcrowd",
                                                                    "http://www.google.ca",
                                                                    "crowdsale test data", 1, "100000000",
                                                                    deadline, 10, 0, "10000000000")
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.99)
        ret = self.nodes[0].signrawtransaction(ret)
        self.nodes[0].sendrawtransaction(ret["hex"])
        ret = self.nodes[0].decoderawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(1, address)
        assert ret["vout"][0]["n"] == 0
        assert ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"

        # Test simplesend vout
        trans = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 1)
        payload = self.nodes[0].whc_createpayload_simplesend(1, "50")
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.99)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address_dst)
        ret = self.nodes[0].signrawtransaction(ret)
        ret = self.nodes[0].decoderawtransaction(ret["hex"])
        assert ret["vout"][0]["n"] == 0
        assert ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"


if __name__ == '__main__':
    WHC_RawTx_Test().main()
