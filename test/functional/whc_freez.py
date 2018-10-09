#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)
from test_framework.authproxy import JSONRPCException
import time

class WHC_TOKEN_FREEZE(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.tip = None
        self.setup_clean_chain = True

    def token_freeze_test(self):
        # generate 200whc for node[0]
        address = self.nodes[0].getnewaddress("")
        address_dst = self.nodes[1].getnewaddress("")
        self.nodes[0].generatetoaddress(12, address)
        self.nodes[1].generatetoaddress(12, address_dst)
        time.sleep(3)
        self.nodes[0].generatetoaddress(100, address)
        time.sleep(3)
        trans_id = self.nodes[0].whc_burnbchgetwhc(4)
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)
        trans_id1 = self.nodes[1].whc_burnbchgetwhc(4)
        self.nodes[1].generatetoaddress(1, address_dst)
        time.sleep(1)

        balanceb = self.nodes[0].whc_getbalance(address_dst, 1)
        fixed_trans_id = self.nodes[0].whc_sendissuancefixed(address, 1, 1, 0, "", "", "whctoken", "", "", "500")
        managed_trans_id = self.nodes[0].whc_sendissuancemanaged(address, 1, 1, 1, "", "", "managede token", "", "")
        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)

        managed_trans = self.nodes[0].whc_gettransaction(managed_trans_id)
        managed_property_id = managed_trans["propertyid"]
        managed_trans_id = self.nodes[0].whc_sendgrant(address, address, managed_property_id, "1000")

        self.nodes[0].generatetoaddress(1, address)
        time.sleep(1)
        managed_trans = self.nodes[0].whc_gettransaction(managed_trans_id)
        managed_property_id = managed_trans["propertyid"]

        tx = self.nodes[0].whc_sendgrant(address, address_dst, managed_property_id, "200", "")
        self.nodes[0].generatetoaddress(1, address_dst)
        ret = self.nodes[0].whc_gettransaction(tx)
        assert ret["valid"] is True

        trans_id = self.nodes[0].whc_sendfreeze(address, managed_property_id, "100", address_dst)
        self.nodes[0].generatetoaddress(12, address_dst)
        time.sleep(2)

        trans_id = self.nodes[0].whc_sendfreeze(address, managed_property_id, "100", address_dst)
        self.nodes[0].generatetoaddress(12, address_dst)
        time.sleep(2)
        try:
            trans_id = self.nodes[0].whc_sendfreeze(address, managed_property_id, "100", address)
        except JSONRPCException as e:
            assert str(e) == "Sender cannot be same with the address will be freezed (-3)"

        self.nodes[0].generatetoaddress(12, address_dst)
        time.sleep(2)
        trans_id = self.nodes[0].whc_send(address, address_dst, managed_property_id, "10")
        self.nodes[0].generatetoaddress(1, address)

        trans_id = self.nodes[1].whc_send(address_dst, address, managed_property_id, "10")
        self.nodes[1].generatetoaddress(2, address_dst)
        managed_trans = self.nodes[1].whc_gettransaction(trans_id)
        assert managed_trans["invalidreason"] == "Sender is frozen for the property"

        trans_id1 = self.nodes[0].whc_sendunfreeze(address, managed_property_id, "100", address_dst)
        self.nodes[0].generatetoaddress(2, address)

        trans_id = self.nodes[1].whc_send(address_dst, address, managed_property_id, "10")
        self.nodes[1].generatetoaddress(2, address_dst)
        managed_trans = self.nodes[1].whc_gettransaction(trans_id)
        assert managed_trans["valid"] is True

        managed_trans = self.nodes[1].getrawtransaction(trans_id1)
        tx = self.nodes[0].whc_createrawtx_input("", trans_id1, 1)
        payload = self.nodes[0].whc_createpayload_freeze(address_dst, managed_property_id, "10")
        ret = self.nodes[0].whc_createrawtx_opreturn(tx, payload)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.999)
        ret = self.nodes[0].signrawtransaction(ret)
        txid = self.nodes[0].whc_sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(2, address)

        trans_idd = self.nodes[0].whc_sendfreeze(address, managed_property_id, "10", address_dst)
        self.nodes[0].generatetoaddress(12, address_dst)
        time.sleep(2)

        trans_id = self.nodes[1].whc_send(address_dst, address, managed_property_id, "10")
        self.nodes[1].generatetoaddress(2, address_dst)
        managed_trans = self.nodes[1].whc_gettransaction(trans_id)
        assert managed_trans["invalidreason"] == "Sender is frozen for the property"

        trans_id = self.nodes[1].whc_getfrozenbalance(address_dst, managed_property_id)
        self.nodes[1].generatetoaddress(2, address_dst)
        assert trans_id["frozen"] is True

        trans_id = self.nodes[1].whc_getfrozenbalanceforid(managed_property_id)
        self.nodes[1].generatetoaddress(2, address_dst)
        assert float(trans_id[0]["balance"]) == 200.0
        trans_id = self.nodes[1].whc_getfrozenbalanceforaddress(address_dst)
        self.nodes[1].generatetoaddress(2, address_dst)
        assert float(trans_id[0]["balance"]) == 200.0

        tx = self.nodes[0].whc_createrawtx_input("", trans_idd, 1)
        payload = self.nodes[0].whc_createpayload_unfreeze(address_dst, managed_property_id, "10")
        ret = self.nodes[0].whc_createrawtx_opreturn(tx, payload)
        ret = self.nodes[0].whc_createrawtx_reference(ret, address, 49.998)
        ret = self.nodes[0].signrawtransaction(ret)
        txid = self.nodes[0].whc_sendrawtransaction(ret["hex"])
        self.nodes[0].generatetoaddress(2, address)

        trans_id = self.nodes[1].whc_send(address_dst, address, managed_property_id, "10")
        self.nodes[1].generatetoaddress(2, address_dst)
        managed_trans = self.nodes[1].whc_gettransaction(trans_id)
        assert managed_trans["valid"] is True
        try:
            trans_id = self.nodes[1].whc_sendfreeze(address_dst, managed_property_id, "100", address)
        except JSONRPCException as e:
            assert str(e) == "Sender is not authorized to manage the property (-3)"

    def run_test(self):
        self.token_freeze_test()


if __name__ == '__main__':
    WHC_TOKEN_FREEZE().main()
