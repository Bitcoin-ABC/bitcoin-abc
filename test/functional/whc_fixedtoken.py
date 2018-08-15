#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)
import time


# self.nodes[0].decoderawtransaction(ret["hex"])
# assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"

class WHC_TOKEN_FIXED(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.tip = None
        self.setup_clean_chain = True

    def token_fixed_test(self):
        # generate 200whc for node[0]
        address = self.nodes[0].getnewaddress("")
        address_dst = self.nodes[1].getnewaddress("")
        self.nodes[0].generatetoaddress(101, address)
        time.sleep(1)
        trans_id = self.nodes[0].whc_burnbchgetwhc(2)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][1]["value"] == 0 and ret["vout"][1]["scriptPubKey"]["asm"][:9] == "OP_RETURN"

        # transfer 100whc to node[1]
        trans_id = self.nodes[0].whc_send(address, address_dst, 1, "100")
        self.nodes[0].generatetoaddress(60, address)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        rpc_response_dst = self.nodes[1].whc_getbalance(address_dst, 1)
        assert_equal(float(rpc_response["balance"]), 100.00000000)
        assert_equal(float(rpc_response_dst["balance"]), 100.00000000)

        # transfer 50whc to node[1]
        trans = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 1)
        payload = self.nodes[0].whc_createpayload_simplesend(1, "50")
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.99)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address_dst)
        ret = self.nodes[0].signrawtransaction(ret)
        self.nodes[0].sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(1)
        ret = self.nodes[0].decoderawtransaction(ret["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        rpc_response_dst = self.nodes[1].whc_getbalance(address_dst, 1)
        assert_equal(float(rpc_response["balance"]), 50.00000000)
        assert_equal(float(rpc_response_dst["balance"]), 150.00000000)

        # drop WHCs to the token holders
        trans_id = self.nodes[0].whc_sendsto(address, 1, "20")
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(1)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        rpc_response_dst = self.nodes[1].whc_getbalance(address_dst, 1)
        # fuel fee is ( num of person * 1 coin )
        assert_equal(float(rpc_response["balance"]), 29.99999999)
        assert_equal(float(rpc_response_dst["balance"]), 170.00000000)

        # issuance fixed token
        trans_id = self.nodes[0].whc_sendissuancefixed(address, 1, 1, 0, "", "", "whctoken", "", "", "500")
        self.nodes[0].generatetoaddress(1, address)
        self.nodes[1].generatetoaddress(1, address_dst)
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        rpc_response_dst = self.nodes[0].whc_getbalance(address_dst, 1)
        assert_equal(float(rpc_response["balance"]), 28.99999999)
        assert_equal(float(rpc_response_dst["balance"]), 170.00000000)

        # transfer all token to node[1]
        trans_id = self.nodes[0].whc_sendall(address, address_dst, 1)
        self.nodes[0].generatetoaddress(10, address)
        self.nodes[1].generatetoaddress(10, address_dst)
        time.sleep(1)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        rpc_response_dst = self.nodes[1].whc_getbalance(address_dst, 1)
        assert_equal(float(rpc_response["balance"]), 0.00000000)
        assert_equal(float(rpc_response_dst["balance"]), 198.99999999)

    def run_test(self):
        self.token_fixed_test()


if __name__ == '__main__':
    WHC_TOKEN_FIXED().main()
