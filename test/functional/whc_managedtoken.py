#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)
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
        self.nodes[0].generatetoaddress(101, address)
        time.sleep(3)
        trans_id = self.nodes[0].whc_burnbchgetwhc(2)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)
        # issue managed token
        trans_id = self.nodes[0].whc_sendissuancemanaged(address, 1, 1, 0, "", "", "managede token", "", "")
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        rpc_response = self.nodes[0].whc_getbalance(address, 1)
        rpc_response_dst = self.nodes[0].whc_getbalance(address_dst, 1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        propert_id = trans["propertyid"]
        balance = self.nodes[0].whc_getproperty(propert_id)
        # issue not generate any token
        assert_equal(float(balance["totaltokens"]), 0.0)
        assert_equal(float(rpc_response["balance"]), 199.00000000)
        assert_equal(float(rpc_response_dst["balance"]), 0.00000000)

        # raise 100 token to node[0]
        trans_id = self.nodes[0].whc_sendgrant(address, address, propert_id, "100", "")
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        balance = self.nodes[0].whc_getbalance(address, propert_id)
        balance_pro = self.nodes[0].whc_getproperty(propert_id)
        assert_equal(float(balance["balance"]), 100.0)
        assert_equal(float(balance_pro["totaltokens"]), 100.0)
        assert_equal(balance_pro["managedissuance"], True)

        # revoke tokens
        trans_id = self.nodes[0].whc_sendrevoke(address, propert_id, "10", "")
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        balance = self.nodes[0].whc_getbalance(address, propert_id)
        balance_pro = self.nodes[0].whc_getproperty(propert_id)
        assert_equal(float(balance["balance"]), 90.0)
        assert_equal(float(balance_pro["totaltokens"]), 90.0)

        # change issuer
        trans_id = self.nodes[0].whc_sendchangeissuer(address, address_dst, propert_id)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)
        raw = self.nodes[0].gettransaction(trans_id)
        ret = self.nodes[0].decoderawtransaction(raw["hex"])
        assert ret["vout"][0]["value"] == 0 and ret["vout"][0]["scriptPubKey"]["asm"][:9] == "OP_RETURN"
        balance_pro = self.nodes[0].whc_getproperty(propert_id)
        balance = self.nodes[0].whc_getbalance(address, propert_id)
        assert_equal(float(balance["balance"]), 90.0)
        assert_equal(balance_pro["issuer"], address_dst)

    def run_test(self):
        self.token_manage_test()


if __name__ == '__main__':
    WHC_TOKEN_MANAGE().main()
