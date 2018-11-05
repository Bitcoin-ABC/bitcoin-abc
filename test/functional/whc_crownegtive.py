#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
import time


class WHC_TOKEN_MANAGE(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def issue_crowdproperty_test(self):
        self.whcAddress = self.nodes[0].getnewaddress("")
        receive = self.nodes[0].getnewaddress("")
        self.nodes[0].generatetoaddress(110, self.whcAddress)

        # step 1 get whc
        burntx = self.nodes[0].whc_burnbchgetwhc(30, self.whcAddress)
        self.nodes[0].sendtoaddress(receive, 20)
        self.nodes[0].generatetoaddress(1, self.whcAddress)

        # step 1.1 check the tx for get whc and sendBCH
        burnret = self.nodes[0].whc_gettransaction(burntx)
        assert burnret["valid"] is True

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 2 ecosystem is not 1
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "", "name", "", "", 1, "100",
                                                                        int(time.time()) + 1000, 10, 0, "1000000")
            payload = payload[:9] + '3' + payload[10:]
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 2.1 check the error transaction with ecosystem is not 1.
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "Ecosystem is invalid"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 3 pricison not in range. [0, 8]
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "", "name", "", "", 1, "100",
                                                                        int(time.time()) + 1000, 10, 0, "1000000")
            payload = payload[:13] + '9' + payload[14:]
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 3.1 check the error transaction with pricison not in range. [0, 8]
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "Invalid property precision"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 4 per Unit Invested not in range [1, 10000000000000000]
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "", "l", "", "", 1, "100",
                                                                int(time.time()) + 1000, 10, 0, "1000000")
            payload = payload[:42] + '00ffffffffffffff' + payload[58:]
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 4.1 check the error transaction with per Unit Invested not in range [1, 10000000000000000]
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "Value out of range or zero"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 4 per Unit Invested not in range [1, 10000000000000000]
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "", "l", "", "", 1, "100",
                                                                        int(time.time()) + 1000, 10, 0, "1000000")
            payload = payload[:42] + '0000000000000000' + payload[58:]
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 4.1 check the error transaction with per Unit Invested not in range [1, 10000000000000000]
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "Value out of range or zero"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 5 issue total Token number not in range [1, 9223372036854775807]
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "", "l", "", "", 1, "100",
                                                                        int(time.time()) + 1000, 10, 0, "1000000")
            payload = payload[:len(payload) - 16] + '8fffffffffffffff'
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 5.1 check the error transaction with per Unit Invested not in range [1, 10000000000000000]
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "TotalCrowsToken out of range or zero"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 6 issue total Token number not in range [1, 9223372036854775807]
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "", "l", "", "", 1, "100",
                                                                        int(time.time()) + 1000, 10, 0, "1000000")
            payload = payload[:len(payload) - 16] + '0000000000000000'
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 6.1 check the error transaction with issue total Token number not in range [1, 9223372036854775807]
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "TotalCrowsToken out of range or zero"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 7 Invalid desired property id
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "", "l", "", "", 1, "100",
                                                                        int(time.time()) + 1000, 10, 0, "1000000")
            payload = payload[:41] + '9' + payload[42:]
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 7.1 check the error transaction with Invalid desired property id.
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "Invalid desired property id"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 8 property name is empty
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "l", "l", "", "", 1, "100",
                                                                        int(time.time()) + 1000, 10, 0, "1000000")
            payload = payload[:28] + payload[30:]
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 8.1 check the error transaction with property name is empty.
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "Property name is empty"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 9 previous property id must be 0
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "l", "l", "", "", 1, "100",
                                                                        int(time.time()) + 1000, 10, 0, "1000000")
            payload = payload[:21] + '3' + payload[22:]
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 9.1 check the error transaction with previous property id must be 0
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "property prev_prop_id value should equal 0"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 9 Deadline is in the past
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "l", "l", "", "", 1, "100",
                                                                        int(time.time()) - 1000, 10, 0, "1000000")
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 9.1 check the error transaction with Deadline is in the past
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "Deadline is in the past"
        else:
            assert False

        # step 10 create a valid crowd property
        txhash = self.nodes[0].whc_sendissuancecrowdsale(self.whcAddress, 1, 1, 0, "s", "s", "s", "s", "s", 1, "100", int(time.time()) + 1000000, 10, 0, "100000")
        self.nodes[0].generatetoaddress(1, self.whcAddress)
        ret = self.nodes[0].whc_gettransaction(txhash)
        assert ret["valid"] is True

        item = self.getSpent(self.whcAddress)
        if item:
            #  step 11 one address only have a crowdsale in special time.
            payload = self.nodes[0].whc_createpayload_issuancecrowdsale(1, 1, 0, "", "l", "l", "", "", 1, "100",
                                                                        int(time.time()) + 1000, 10, 0, "1000000")
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 11.1 check the error transaction with one address only have a crowdsale in special time.
            ret = self.nodes[0].whc_gettransaction(txhash)
            assert ret["valid"] is False
            assert ret["invalidreason"] == "Sender has an active crowdsale already"
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

    def constructCreatePropertyTx(self, item, payload):
        tx = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
        tx = self.nodes[0].whc_createrawtx_opreturn(tx, payload)
        tx = self.nodes[0].whc_createrawtx_reference(tx, item["address"], round(float(item["amount"]) - 0.01, 8))
        tx = self.nodes[0].signrawtransaction(tx)
        txhash = self.nodes[0].sendrawtransaction(tx["hex"])
        self.nodes[0].generatetoaddress(1, item["address"])
        return txhash


    def run_test(self):
        self.issue_crowdproperty_test()

if __name__ == '__main__':
    WHC_TOKEN_MANAGE().main()
