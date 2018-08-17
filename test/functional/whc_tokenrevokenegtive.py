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

        fixed_trans_id = self.nodes[0].whc_sendissuancefixed(address, 1, 1, 0, "", "", "whctoken", "", "", "500")
        managed_trans_id = self.nodes[0].whc_sendissuancemanaged(address, 1, 1, 0, "", "", "managede token", "", "")
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)

        fixed_trans = self.nodes[0].whc_gettransaction(fixed_trans_id)
        fixed_property_id = fixed_trans["propertyid"]

        managed_trans = self.nodes[0].whc_gettransaction(managed_trans_id)
        managed_property_id = managed_trans["propertyid"]

        # exp3: token value exceed max
        ret = self.nodes[0].whc_createrawtx_input("", managed_trans_id, 1)
        payload = self.nodes[0].whc_createpayload_grant(managed_property_id, "50", "")
        p = payload[:16] + "ffffffffffffffff" + payload[32:]
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, p)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.99)
        ret = self.nodes[0].signrawtransaction(ret)
        trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        assert trans["valid"] is False
        assert trans["invalidreason"] == "Value out of range or zero"

        # exp3: token value exceed max
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 1)
        payload = self.nodes[0].whc_createpayload_grant(managed_property_id, "50", "")
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.989)
        ret = self.nodes[0].signrawtransaction(ret)
        trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        assert trans["valid"] is True

        # not managed token
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 1)
        payload = self.nodes[0].whc_createpayload_revoke(managed_property_id, "20", "")
        p = payload[:15] + '3' + payload[16:]
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, p)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.988)
        ret = self.nodes[0].signrawtransaction(ret)
        trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        assert trans["valid"] is False

        # not managed token issuer
        ret = self.nodes[1].whc_createrawtx_input("", trans_id1, 2)
        payload = self.nodes[1].whc_createpayload_revoke(managed_property_id, "20", "")
        ret = self.nodes[1].whc_createrawtx_opreturn(ret, payload)
        ret = self.nodes[1].whc_createrawtx_reference(ret, address_dst, 45.987)
        ret = self.nodes[1].signrawtransaction(ret)
        trans_id2 = self.nodes[1].sendrawtransaction(ret["hex"])
        self.nodes[1].generatetoaddress(10, address)
        time.sleep(1)
        trans = self.nodes[1].whc_gettransaction(trans_id2)
        assert trans["valid"] is False
        assert trans["invalidreason"] == "Sender is not the issuer of the property"

        # no issuer raise a change issuer action
        ret = self.nodes[1].whc_createrawtx_input("", trans_id2, 1)
        payload = self.nodes[1].whc_createpayload_changeissuer(managed_property_id)
        ret = self.nodes[1].whc_createrawtx_opreturn(ret, payload)
        ret = self.nodes[1].whc_createrawtx_reference(ret, address, 45.986)
        ret = self.nodes[1].signrawtransaction(ret)
        ret = self.nodes[1].sendrawtransaction(ret["hex"])
        self.nodes[1].generatetoaddress(10, address)
        time.sleep(1)
        trans = self.nodes[1].whc_gettransaction(ret)
        assert trans["valid"] is False
        assert trans["invalidreason"] == "Sender is not the issuer of the property"

        # issuer is himself
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 1)
        payload = self.nodes[0].whc_createpayload_changeissuer(managed_property_id)
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.987)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address)
        ret = self.nodes[0].signrawtransaction(ret)
        trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        # assert trans["valid"] is True

        # property id not exit
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 1)
        payload = self.nodes[0].whc_createpayload_changeissuer(managed_property_id)
        p = payload[:15] + 'f'
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, p)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.986)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address_dst)
        ret = self.nodes[0].signrawtransaction(ret)
        trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        assert trans["valid"] is False
        assert trans["invalidreason"] == "Property does not exist"

        # token revoke > token left
        ret = self.nodes[0].whc_createrawtx_input("", trans_id, 1)
        payload = self.nodes[0].whc_createpayload_revoke(managed_property_id, "60", "")
        ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.985)
        ret = self.nodes[0].signrawtransaction(ret)
        trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(10, address)
        time.sleep(1)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        assert trans["valid"] is False
        assert trans["invalidreason"] == "Sender has insufficient balance"

    def run_test(self):
        self.token_manage_test()


if __name__ == '__main__':
    WHC_TOKEN_MANAGE().main()
