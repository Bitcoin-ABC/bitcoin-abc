#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)
from test_framework.authproxy import JSONRPCException
import time

class WHC_TOKEN_FREEZE(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def frozen_token_test(self):

        # get new address
        address_if = self.nodes[0].getnewaddress("enable freezing issuer")
        address_f = self.nodes[0].getnewaddress("frozen address")
        address_u = self.nodes[0].getnewaddress("unfrozen address")
        address_i = self.nodes[0].getnewaddress("disable freezing issuer")
        self.nodes[0].generatetoaddress(112, address_if)

        # get and distribute WHC
        trans_id = self.nodes[0].whc_burnbchgetwhc(10)
        self.nodes[0].generatetoaddress(1, address_if)
        trans = self.nodes[0].whc_gettransaction(trans_id)
        self.nodes[0].sendtoaddress(address_f, "100")
        self.nodes[0].sendtoaddress(address_u, "100")
        self.nodes[0].sendtoaddress(address_i, "100")
        self.nodes[0].whc_send(address_if, address_f, 1, "100")
        self.nodes[0].whc_send(address_if, address_u, 1, "100")
        self.nodes[0].whc_send(address_if, address_i, 1, "100")
        self.nodes[0].generatetoaddress(1, address_if)

        # view balance of WHC
        balance_if = self.nodes[0].whc_getbalance(address_if, 1)
        balance_f = self.nodes[0].whc_getbalance(address_f, 1)
        balance_u = self.nodes[0].whc_getbalance(address_u, 1)
        balance_i = self.nodes[0].whc_getbalance(address_i, 1)
        print("WHC balances: \n", balance_if, balance_f, balance_u, balance_i)
        assert float(balance_if['balance']) == 700.0
        assert float(balance_f['balance']) == 100.0
        assert float(balance_u['balance']) == 100.0
        assert float(balance_i['balance']) == 100.0

        # issurate manageable property
        trans_if = self.nodes[0].whc_sendissuancemanaged(address_if, 1, 8, 1, "s", "s", "s", "s", "s")
        trans_i = self.nodes[0].whc_sendissuancemanaged(address_i, 1, 8, 0, "s", "s", "s", "s", "s")
        self.nodes[0].generatetoaddress(1, address_if)
        managed_trans_if = self.nodes[0].whc_gettransaction(trans_if)
        token_if = managed_trans_if["propertyid"]
        managed_trans_i = self.nodes[0].whc_gettransaction(trans_i)
        token_i = managed_trans_i["propertyid"]
        print("token id: \n", token_if, token_i)

        # grant token
        self.nodes[0].whc_sendgrant(address_if, "", token_if, "1000")
        self.nodes[0].whc_sendgrant(address_if, address_f, token_if, "1000")
        self.nodes[0].whc_sendgrant(address_if, address_u, token_if, "1000")
        self.nodes[0].whc_sendgrant(address_if, address_i, token_if, "1000")
        self.nodes[0].whc_sendgrant(address_i, "", token_i, "1000")
        self.nodes[0].whc_sendgrant(address_i, address_f, token_i, "1000")
        self.nodes[0].whc_sendgrant(address_i, address_u, token_i, "1000")
        self.nodes[0].whc_sendgrant(address_i, address_if, token_i, "1000")
        self.nodes[0].generatetoaddress(1, address_if)

        # view balance of freezing enabled manageable property
        balance_if = self.nodes[0].whc_getbalance(address_if, token_if)
        balance_f = self.nodes[0].whc_getbalance(address_f, token_if)
        balance_u = self.nodes[0].whc_getbalance(address_u, token_if)
        balance_i = self.nodes[0].whc_getbalance(address_i, token_if)
        print("freezing enabled balances: \n", balance_if, balance_f, balance_u, balance_i)
        assert float(balance_if['balance']) == 1000.0
        assert float(balance_f['balance']) == 1000.0
        assert float(balance_u['balance']) == 1000.0
        assert float(balance_i['balance']) == 1000.0

        # view balance of freezing disabled manageable property
        balance_if = self.nodes[0].whc_getbalance(address_if, token_i)
        balance_f = self.nodes[0].whc_getbalance(address_f, token_i)
        balance_u = self.nodes[0].whc_getbalance(address_u, token_i)
        balance_i = self.nodes[0].whc_getbalance(address_i, token_i)
        print("freezing disabled balances: \n", balance_if, balance_f, balance_u, balance_i)
        assert float(balance_if['balance']) == 1000.0
        assert float(balance_f['balance']) == 1000.0
        assert float(balance_u['balance']) == 1000.0
        assert float(balance_i['balance']) == 1000.0

        # test case: freeze address
        # case 1: who not a issuer send a freeze tx
        try:
            trans_id_case1 = self.nodes[0].whc_sendfreeze(address_u, token_if, "10", address_f)
        except JSONRPCException as e:
            assert str(e) == "Sender is not authorized to manage the property (-3)"

        # case 2: who not this token issuer send a freeze tx
        trans_id_case2 = self.nodes[0].whc_sendfreeze(address_i, token_i, "10", address_f)
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case2)
        assert ret["invalidreason"] == "Freezing is not enabled for the property"

        # case 3: who is the token issuer send a freeze tx
        trans_id_case3 = self.nodes[0].whc_sendfreeze(address_if, token_if, "10", address_f)
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case3)
        assert ret["valid"] is True

        # test case: transfer frozen token
        # case 1: transfer the token to another address
        trans_id_case1 = self.nodes[0].whc_send(address_f, address_i, token_if, "10")
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case1)
        assert ret["invalidreason"] == "Sender is frozen for the property"

        # case 2: send the frozen tokens to owners
        trans_id_case2 = self.nodes[0].whc_sendsto(address_f, token_if, "100", "", 1)
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case2)
        assert ret["invalidreason"] == "Sender is frozen for the property"

        # case 3: send all the properties to another address
        trans_id_case3 = self.nodes[0].whc_sendall(address_f, address_if, 1)
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case3)
        assert ret["valid"] is True
        balance_f = self.nodes[0].whc_getbalance(address_f, token_if)
        assert float(balance_f["balance"]) == 1000.0;
        balance_1 = self.nodes[0].whc_getbalance(address_f, 1)
        assert float(balance_1["balance"]) == 0.0;

        # test case: transfer to a frozen address
        # case 1: transfer token to a frozen address
        trans_id_case1 = self.nodes[0].whc_send(address_if, address_f, token_if, "10")
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case1)
        assert ret["invalidreason"] == "Receiver is frozen for the property"

        # case 2: send tokens to frozen token held owners
        self.nodes[0].whc_send(address_if, address_f, 1, "100")
        self.nodes[0].generatetoaddress(1, address_if)
        balance_f = self.nodes[0].whc_getbalance(address_f, 1)
        balance_u = self.nodes[0].whc_getbalance(address_u, 1)
        balance_i = self.nodes[0].whc_getbalance(address_i, 1)
        print("balance before sto: ", balance_f, balance_u, balance_i)
        assert float(balance_f['balance']) == 100.0
        assert float(balance_u['balance']) == 100.0
        assert float(balance_i['balance']) == 99.0
        trans_id_case2 = self.nodes[0].whc_sendsto(address_if, token_if, "100", "", 1)
        self.nodes[0].generatetoaddress(1, address_f)
        ret = self.nodes[0].whc_gettransaction(trans_id_case2)
        assert ret["valid"] is True
        balance_f = self.nodes[0].whc_getbalance(address_f, token_if)
        print("balance_f: ", balance_f)
        assert float(balance_f["balance"]) == 1000.0;
        balance_i = self.nodes[0].whc_getbalance(address_i, token_if)
        print("balance_i: ", balance_i)
        assert float(balance_i["balance"]) == 1049.25373135;

        # case 3: send all properties to frozen address
        balance_f1 = self.nodes[0].whc_getbalance(address_f, token_i)
        print("balance_ii ", balance_f)
        balance_i1 = self.nodes[0].whc_getbalance(address_i, token_i)
        print("balance_ii ", balance_i)
        trans_id_case3 = self.nodes[0].whc_sendall(address_u, address_f, 1)
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case3)
        assert ret["valid"] is True
        balance_f = self.nodes[0].whc_getbalance(address_f, token_if)
        assert float(balance_f["balance"]) == 1000.0;
        balance_i = self.nodes[0].whc_getbalance(address_f, token_i)
        print("balance_ii ", balance_i)
        assert float(balance_i["balance"]) == float(balance_i1["balance"]) + float(balance_f1["balance"]);

        # case 4: grant frozen token to frozen address
        trans_id_case4 = self.nodes[0].whc_sendgrant(address_if, address_f, token_if, "10")
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case4)
        assert ret["invalidreason"] == "Receiver is frozen for the property"

        # test case: repeat freeze
        # case 1: repeat freeze a frozen address
        trans_id_case1 = self.nodes[0].whc_sendfreeze(address_if, token_if, "10", address_f)
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case1)
        assert ret["valid"] is True

        # test case: change issuer to a frozen address
        # case 1: change frozen token issuer to a frozen address
        trans_id_case1 = self.nodes[0].whc_sendchangeissuer(address_if, address_f, token_if)
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case1)
        assert ret["invalidreason"] == "Attempt to change issuer to a frozen receiver"

        # test case: unfreeze tx
        # case 1: unfreeze a unfrozen address
        trans_id_case1 = self.nodes[0].whc_sendunfreeze(address_if, token_if, "10", address_u)
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case1)
        assert ret["valid"] is True

        # case 2: unfreeze a frozen address
        trans_id_case2 = self.nodes[0].whc_sendunfreeze(address_if, token_if, "10", address_f)
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case2)
        assert ret["valid"] is True

        # test case: repeat unfreeze tx
        # case 1: repeat unfreeze the address already unfrozen by a earlier unfreeze tx
        trans_id_case1 = self.nodes[0].whc_sendunfreeze(address_if, token_if, "10", address_f)
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case1)
        assert ret["valid"] is True

        # test case: transfer into or out tokens to unfrozen address
        # case 1: transfer tokens into unfrozen address
        trans_id_case1 = self.nodes[0].whc_send(address_if, address_f, token_if, "10")
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case1)
        assert ret["valid"] is True

        # case 2: transfer tokens from unfrozen address to others
        trans_id_case2 = self.nodes[0].whc_send(address_f, address_if, token_if, "10")
        self.nodes[0].generatetoaddress(1, address_if)
        ret = self.nodes[0].whc_gettransaction(trans_id_case2)
        assert ret["valid"] is True

    def run_test(self):
        self.frozen_token_test()


if __name__ == '__main__':
    WHC_TOKEN_FREEZE().main()
