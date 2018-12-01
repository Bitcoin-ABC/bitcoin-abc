#!/usr/bin/env python3

from test_framework.test_framework import BitcoinTestFramework
import time

class  WHC_crowdsalevaruable_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def close_createcrowdsale_test(self):
        self.whcAddress = self.nodes[0].getnewaddress("")
        receive = self.nodes[0].getnewaddress("")
        self.nodes[0].generatetoaddress(102, self.whcAddress)

        # step 1 get whc
        burntx = self.nodes[0].whc_burnbchgetwhc(30, self.whcAddress)
        sendtx = self.nodes[0].sendtoaddress(receive, 20)
        self.nodes[0].generatetoaddress(1, self.whcAddress)

        # step 1.1 check the tx for get whc and sendBCH
        burnret = self.nodes[0].whc_gettransaction(burntx)
        assert burnret["valid"] is True

        # send whc to receive
        self.nodes[0].whc_send(self.whcAddress, receive, 1, "10")
        self.nodes[0].generatetoaddress(1, self.whcAddress)

        # step 2 create a crowdsale property
        propertyid = self.createCrowdsale(receive, 3)

        # step 3 create purchase crowdsale transaction
        purchase = self.createParticalcrowdsale(self.whcAddress, receive, propertyid, 1)

        # step 4 check property status
        ret = self.nodes[0].whc_getcrowdsale(propertyid)
        assert ret["active"] is True

        # step 5 create a close crowdsale transaction
        txid = self.nodes[0].whc_sendclosecrowdsale(receive, propertyid)
        self.nodes[0].generatetoaddress(1, self.whcAddress)

        # step 5.1 check close transaction
        ret = self.nodes[0].whc_gettransaction(txid)
        assert ret["valid"] is True

        # step 6 check property status
        ret = self.nodes[0].whc_getcrowdsale(propertyid)
        assert ret["active"] is False

        # step 7 compare crowd fund, should be equal
        ret = self.nodes[0].whc_getbalance(receive, propertyid)
        assert float(ret["balance"]) + float(purchase) == 10000

    def purchase_all_test(self):
        # step 1 send whc and BCH to receive
        receive = self.prepare()
        ret = self.nodes[0].whc_getbalance(receive, 1)
        assert float(ret["balance"]) == 2

        # step 2 create a crowdsale property
        propertyid = self.createCrowdsale(receive, 4)

        ret = self.nodes[0].whc_getbalance(receive, 1)
        assert float(ret["balance"]) == 1

        # step 3 create purchase crowdsale transaction
        purchase = self.createParticalcrowdsale(self.whcAddress, receive, propertyid, 1000)

        # step 4 check property status
        ret = self.nodes[0].whc_getcrowdsale(propertyid)
        assert ret["active"] is False

        # step 5 check two address balance for crowdToken
        issueRet = self.nodes[0].whc_getbalance(receive, propertyid)
        assert (float(issueRet["balance"]) == 0)
        userRet = self.nodes[0].whc_getbalance(self.whcAddress, propertyid)
        assert float(userRet["balance"]) == 10000
        assert float(issueRet["balance"]) + float(purchase) == 10000

    def expired_crowdsale_test(self):
        # step 1 send whc and BCH to receive
        receive = self.prepare()
        ret = self.nodes[0].whc_getbalance(receive, 1)
        assert float(ret["balance"]) == 2

        # step 2 create a crowdsale property
        propertyid = self.createCrowdsale(receive, 5, 20)
        time.sleep(30)

        # step 3 check property status
        txhash = self.nodes[0].getbestblockhash()
        ret = self.nodes[0].getblock(txhash)

        self.nodes[0].generatetoaddress(10, self.whcAddress)
        ret = self.nodes[0].whc_getcrowdsale(propertyid)
        assert ret["active"] is False

        # step 7 compare crowd fund, should be equal
        ret = self.nodes[0].whc_getbalance(receive, propertyid)
        assert float(ret["balance"]) == 10000

    def prepare(self):
        # send whc and BCH to receive
        receive = self.nodes[0].getnewaddress("")
        self.nodes[0].whc_send(self.whcAddress, receive, 1, "2")
        self.nodes[0].sendtoaddress(receive, 20)
        self.nodes[0].generatetoaddress(1, self.whcAddress)
        return receive

    def createParticalcrowdsale(self, sender, crowdAddr, id, amount):
        # step 1  create a purchase transaction
        str = "%d"%amount
        createTx = self.nodes[0].whc_particrowsale(sender, crowdAddr, str)
        self.nodes[0].generatetoaddress(1, self.whcAddress)

        ret = self.nodes[0].whc_gettransaction(createTx)
        if ret["valid"] is False:
            print ("invalidReason : %s"%ret["invalidreason"])
        assert ret["valid"] is True
        assert ret["purchasedpropertyid"] == id
        assert ret["sendingaddress"] == sender
        assert ret["referenceaddress"] == crowdAddr
        assert ret["propertyid"] == 1
        return ret["purchasedtokens"]

    def createCrowdsale(self, sender, id, addtime = 100):
        # step 1 create a crowdsal transaction
        createTx = self.nodes[0].whc_sendissuancecrowdsale(sender, 1, 1, 0, "ni", "hao", "lu", "www", "hah", 1, "10", int(time.time()) + addtime, 10, 0, "10000")
        self.nodes[0].generatetoaddress(1, self.whcAddress)

        # step 1.1 check create a crowdsal transaction
        ret = self.nodes[0].whc_gettransaction(createTx)
        if ret["valid"] is False:
            print ("invalidReason : %s"%ret["invalidreason"])
        assert ret["valid"] is True
        assert ret["amount"] == "10000.0"
        assert ret["sendingaddress"] == sender
        assert ret["propertyid"] == id

        # step 1.2 check property state
        ret = self.nodes[0].whc_getcrowdsale(id)
        assert ret["active"] is True

        return ret["propertyid"]

    def run_test(self):
        self.close_createcrowdsale_test()
        self.purchase_all_test()
        self.expired_crowdsale_test()

if __name__ == '__main__':
    WHC_crowdsalevaruable_Test().main()