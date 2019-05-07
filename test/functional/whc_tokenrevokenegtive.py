#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)
from test_framework.authproxy import JSONRPCException
import time


class WHC_TOKEN_MANAGE(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def token_manage_test(self):
        # generate 200whc for node[0]
        address = self.nodes[0].getnewaddress("")
        address_dst = self.nodes[0].getnewaddress("")
        self.nodes[0].generatetoaddress(110, address)
        self.nodes[0].whc_burnbchgetwhc(4)
        self.nodes[0].sendtoaddress(address_dst, 10)
        self.nodes[0].generatetoaddress(1, address)

        self.nodes[0].whc_sendissuancefixed(address, 1, 1, 0, "", "", "whctoken", "", "", "500")
        managed_trans_id = self.nodes[0].whc_sendissuancemanaged(address, 1, 1, 0, "", "", "managede token", "", "")
        self.nodes[0].generatetoaddress(1, address)

        managed_trans = self.nodes[0].whc_gettransaction(managed_trans_id)
        managed_property_id = managed_trans["propertyid"]

        # exp3: token value exceed max
        item = self.getSpent(address)
        if item:
            ret = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
            payload = self.nodes[0].whc_createpayload_grant(managed_property_id, "50", "")
            p = payload[:16] + "ffffffffffffffff" + payload[32:]
            ret = self.nodes[0].whc_createrawtx_opreturn(ret, p)
            ret = self.nodes[0].whc_createrawtx_reference(ret, item["address"], round(float(item["amount"]) - 0.01, 8))
            ret = self.nodes[0].signrawtransactionwithwallet(ret)
            trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
            self.nodes[0].generatetoaddress(1, address)
            trans = self.nodes[0].whc_gettransaction(trans_id)
            assert trans["valid"] is False
            assert trans["invalidreason"] == "Value out of range or zero"
        else:
            assert False

        # exp3: token value exceed max
        item = self.getSpent(address)
        if item:
            ret = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
            payload = self.nodes[0].whc_createpayload_grant(managed_property_id, "50", "")
            ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
            ret = self.nodes[0].whc_createrawtx_reference(ret, item["address"], round(float(item["amount"]) - 0.01, 8))
            ret = self.nodes[0].signrawtransactionwithwallet(ret)
            trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
            self.nodes[0].generatetoaddress(1, address)
            trans = self.nodes[0].whc_gettransaction(trans_id)
            assert trans["valid"] is True
        else:
            assert False

        # not managed token
        item = self.getSpent(address)
        if item:
            ret = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
            payload = self.nodes[0].whc_createpayload_revoke(managed_property_id, "20", "")
            p = payload[:15] + '6' + payload[16:]
            ret = self.nodes[0].whc_createrawtx_opreturn(ret, p)
            ret = self.nodes[0].whc_createrawtx_reference(ret, item["address"], round(float(item["amount"]) - 0.01, 8))
            ret = self.nodes[0].signrawtransactionwithwallet(ret)
            trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
            self.nodes[0].generatetoaddress(1, address)
            trans = self.nodes[0].whc_gettransaction(trans_id)
            assert trans["valid"] is False
        else:
            assert False

        # not managed token issuer
        item = self.getSpent(address_dst)
        if item:
            ret = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
            payload = self.nodes[0].whc_createpayload_revoke(managed_property_id, "20", "")
            ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
            ret = self.nodes[0].whc_createrawtx_reference(ret, item["address"], round(float(item["amount"]) - 0.01, 8))
            ret = self.nodes[0].signrawtransactionwithwallet(ret)
            trans_id2 = self.nodes[0].sendrawtransaction(ret["hex"])
            self.nodes[0].generatetoaddress(1, address)
            trans = self.nodes[0].whc_gettransaction(trans_id2)
            assert trans["valid"] is False
            assert trans["invalidreason"] == "Sender is not the issuer of the property"
        else:
            assert False

        # no issuer raise a change issuer action
        item = self.getSpent(address_dst)
        if item:
            ret = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
            payload = self.nodes[0].whc_createpayload_changeissuer(managed_property_id)
            ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
            ret = self.nodes[0].whc_createrawtx_reference(ret, item["address"], round(float(item["amount"]) - 0.01, 8))
            ret = self.nodes[0].signrawtransactionwithwallet(ret)
            ret = self.nodes[0].sendrawtransaction(ret["hex"])
            self.nodes[0].generatetoaddress(1, address)
            trans = self.nodes[0].whc_gettransaction(ret)
            assert trans["valid"] is False
            assert trans["invalidreason"] == "Sender is not the issuer of the property"
        else:
            assert False

        # issuer is himself
        item = self.getSpent(address)
        if item:
            ret = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
            payload = self.nodes[0].whc_createpayload_changeissuer(managed_property_id)
            ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
            ret = self.nodes[0].whc_createrawtx_reference(ret, item["address"], round(float(item["amount"]) - 0.01, 8))
            ret = self.nodes[0].whc_createrawtx_reference(ret, address)
            ret = self.nodes[0].signrawtransactionwithwallet(ret)
            trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
            self.nodes[0].generatetoaddress(1, address)
            trans = self.nodes[0].whc_gettransaction(trans_id)
            assert trans["valid"] is True
        else:
            assert False

        # property id not exit
        item = self.getSpent(address)
        if item:
            ret = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
            payload = self.nodes[0].whc_createpayload_changeissuer(managed_property_id)
            p = payload[:15] + 'f'
            ret = self.nodes[0].whc_createrawtx_opreturn(ret, p)
            ret = self.nodes[0].whc_createrawtx_reference(ret, item["address"], round(float(item["amount"]) - 0.01, 8))
            ret = self.nodes[0].whc_createrawtx_reference(ret, address_dst)
            ret = self.nodes[0].signrawtransactionwithwallet(ret)
            trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
            self.nodes[0].generatetoaddress(1, address)
            trans = self.nodes[0].whc_gettransaction(trans_id)
            assert trans["valid"] is False
            assert trans["invalidreason"] == "Property does not exist"
        else:
            assert False

        # token revoke > token left
        item = self.getSpent(address)
        if item:
            ret = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
            payload = self.nodes[0].whc_createpayload_revoke(managed_property_id, "60", "")
            ret = self.nodes[0].whc_createrawtx_opreturn(ret, payload)
            ret = self.nodes[0].whc_createrawtx_reference(ret, item["address"], round(float(item["amount"]) - 0.01, 8))
            ret = self.nodes[0].signrawtransactionwithwallet(ret)
            trans_id = self.nodes[0].sendrawtransaction(ret["hex"])
            self.nodes[0].generatetoaddress(1, address)
            trans = self.nodes[0].whc_gettransaction(trans_id)
            assert trans["valid"] is False
            assert trans["invalidreason"] == "Sender has insufficient balance"
        else:
            assert False

    def getSpent(self, addr):
        item = None
        ret = self.nodes[0].listunspent()
        for it in ret:
            if it["address"] == addr and it["amount"] > 1:
                item = it
                break
        return item
    def run_test(self):
        self.token_manage_test()


if __name__ == '__main__':
    WHC_TOKEN_MANAGE().main()
