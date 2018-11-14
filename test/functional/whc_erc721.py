#!/usr/bin/env python3

from test_framework.test_framework import BitcoinTestFramework
from test_framework.authproxy import JSONRPCException

class WHC_erc721_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def erc721_error_featurestart_test(self):
        self.burn_address = "bchreg:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqp0kvc457r8whc"
        self.whcAddress = self.nodes[0].getnewaddress("")
        self.whc = 1
        self.CREATE_TOKEN_FEE = 1
        receiveAddr = self.nodes[0].getnewaddress("")

        # step 1 get whc
        self.nodes[0].generatetoaddress(101, self.whcAddress)
        self.nodes[0].whc_burnbchgetwhc(6)
        self.nodes[0].generatetoaddress(1, self.whcAddress)

        item = self.getSpent(self.whcAddress)
        if item:
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721property("c", "WH", "hello world", "www.wormhole.cash", "100898738618")
            txhash = self.constructCreatePropertyTx(item, payload)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # step 1 the create erc721 property feature is not start.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 1) is True
            assert txnews["invalidreason"] == "Transaction type or version not permitted"
            assert preBalance == endBalance
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721token("0x1", "0x2", "0x9", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item, payload, receiveAddr)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # Step 2 the create erc721 token feature is not start.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 2) is True
            assert txnews["invalidreason"] == "Transaction type or version not permitted"
            assert preBalance == endBalance
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_transferERC721token("0x3", "0x1")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # Step 3 the transfer erc721 token feature is not start.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 3) is True
            assert (txnews["invalidreason"] == "Transaction type or version not permitted")
            assert preBalance == endBalance
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_destroyERC721token("0x3", "0x1")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # step 4 the destroy erc721 token feature is not start.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 4) is True
            assert (txnews["invalidreason"] == "Transaction type or version not permitted")
            assert preBalance == endBalance
        else:
            assert False

    def erc721_normal_feature_test(self):
        # normal step check
        # step 1 get whc
        addr0 = self.whcAddress
        self.nodes[0].generatetoaddress(101, addr0)
        self.nodes[0].whc_burnbchgetwhc(6)
        self.nodes[0].generatetoaddress(1, addr0)

        # step 2 create a new erc721 property
        preBalance = round(float(self.nodes[0].whc_getbalance(addr0, self.whc)["balance"]), 8)
        tx1 = self.nodes[0].whc_issuanceERC721property(addr0, "copernet", "ERC", "wormhole", "www.wormhole.cash", "1000")
        self.nodes[0].generatetoaddress(1, addr0)
        endBalance = round(float(self.nodes[0].whc_getbalance(addr0, self.whc)["balance"]), 8)

        # step 2.1 check transaction of result
        tx1result = self.nodes[0].whc_gettransaction(tx1)
        assert tx1result["valid"] is True
        assert (tx1result["erc721propertyid"] == "1") is True
        assert preBalance - self.CREATE_TOKEN_FEE == endBalance

        ret = self.nodes[0].whc_getERC721PropertyNews("1")
        assert ret["owner"] == addr0
        assert ret["creationtxid"] == tx1
        assert ret["totalTokenNumber"] == 1000
        assert ret["haveIssuedNumber"] == 0
        assert ret["currentValidIssuedNumer"] == 0

        # step 3 create a new erc721 token
        preBalance = round(float(self.nodes[0].whc_getbalance(addr0, self.whc)["balance"]), 8)
        tokentx1 = self.nodes[0].whc_issuanceERC721Token(addr0, addr0, "1", "0x023567", "www.wormhole.cash")
        tokentx3 = self.nodes[0].whc_issuanceERC721Token(addr0, addr0, "1", "2", "0x023567", "www.wormhole.cash")
        self.nodes[0].generatetoaddress(1, addr0)
        endBalance = round(float(self.nodes[0].whc_getbalance(addr0, self.whc)["balance"]), 8)

        # step 3.1 check create token transaction
        tokenResult1 = self.nodes[0].whc_gettransaction(tokentx1)
        tokenResult3 = self.nodes[0].whc_gettransaction(tokentx3)

        assert preBalance  == endBalance
        assert tokenResult1["valid"] is True
        assert (tokenResult1["erc721tokenid"] == "1") is True
        assert tokenResult3["valid"] is True
        assert (tokenResult3["erc721tokenid"] == "2") is True

        ret = self.nodes[0].whc_getERC721TokenNews("1", "1")
        assert ret["owner"] == addr0
        assert ret["creationtxid"] == tokentx1
        assert ret["attribute"] == "0000000000000000000000000000000000000000000000000000000000023567"
        assert ret["tokenurl"]  == "www.wormhole.cash"
        ret = self.nodes[0].whc_getERC721TokenNews("1", "2")
        assert ret["owner"] == addr0
        assert ret["creationtxid"] == tokentx3
        assert ret["attribute"] == "0000000000000000000000000000000000000000000000000000000000023567"
        assert ret["tokenurl"]  == "www.wormhole.cash"

        ret = self.nodes[0].whc_getERC721PropertyNews("1")
        assert ret["owner"] == addr0
        assert ret["totalTokenNumber"] == 1000
        assert ret["haveIssuedNumber"] == 2
        assert ret["currentValidIssuedNumer"] == 2

        addr1 = self.nodes[0].getnewaddress("")
        # step 4 create transfer erc721 token
        preBalance = round(float(self.nodes[0].whc_getbalance(addr0, self.whc)["balance"]), 8)
        transfertx = self.nodes[0].whc_transferERC721Token(addr0, addr1, "1", "1")
        self.nodes[0].sendtoaddress(addr1, 1)
        self.nodes[0].generatetoaddress(1, addr0)
        endBalance = round(float(self.nodes[0].whc_getbalance(addr0, self.whc)["balance"]), 8)

        # step 4.1 check transfer erc721 token transaction
        transferResult = self.nodes[0].whc_gettransaction(transfertx)
        tokenNews = self.nodes[0].whc_getERC721TokenNews("1", "1")
        assert transferResult["valid"] is True
        assert (transferResult["erc721tokenid"] == "1") is True
        assert (tokenNews["owner"] == addr1) is True
        assert tokenNews["creationtxid"] == tokentx1
        assert preBalance  == endBalance

        ret = self.nodes[0].whc_getERC721PropertyNews("1")
        assert ret["owner"] == addr0
        assert ret["totalTokenNumber"] == 1000
        assert ret["haveIssuedNumber"] == 2
        assert ret["currentValidIssuedNumer"] == 2

        # step 5 create new destroy token transaction
        preBalance = round(float(self.nodes[0].whc_getbalance(addr0, self.whc)["balance"]), 8)
        destroytx = self.nodes[0].whc_destroyERC721Token(addr0, "1", "2")
        self.nodes[0].generatetoaddress(1, addr0)
        endBalance = round(float(self.nodes[0].whc_getbalance(addr0, self.whc)["balance"]), 8)

        # step 5.1 check destroy token transaction
        destroyResult = self.nodes[0].whc_gettransaction(destroytx)
        tokenNews = self.nodes[0].whc_getERC721TokenNews("1", "2")
        assert destroyResult["valid"] is True
        assert destroyResult["erc721tokenid"] == "2"
        assert destroyResult["erc721propertyid"] == "1"
        assert (tokenNews["owner"] == self.burn_address) is True
        assert tokenNews["tokenid"] == "2"
        assert preBalance  == endBalance

        ret = self.nodes[0].whc_getERC721PropertyNews("1")
        assert ret["owner"] == addr0
        assert ret["totalTokenNumber"] == 1000
        assert ret["haveIssuedNumber"] == 2
        assert ret["currentValidIssuedNumer"] == 1

    def erc721_payload_feature_test(self):
        receiveAddr = self.nodes[0].getnewaddress("")
        self.nodes[0].sendtoaddress(receiveAddr, 5)

        item = self.getSpent(self.whcAddress)
        if item:
            # step 1 create erc721 property transaction
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721property("copernet", "WH", "hello world", "www.wormhole.cash", "100898738618")
            txhash = self.constructCreatePropertyTx(item, payload)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # step 1.1 check the erc721 property transaction
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["erc721propertyid"] == "2") is True
            assert (txnews["action"] == 1) is True
            assert (txnews["txid"] == txhash) is True
            assert preBalance - self.CREATE_TOKEN_FEE == endBalance

            txnews = self.nodes[0].whc_getERC721PropertyNews("2")
            assert (txnews["creationtxid"] == txhash) is True
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["totalTokenNumber"] == 100898738618
            assert txnews["haveIssuedNumber"] == 0
            assert txnews["currentValidIssuedNumer"] == 0
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # step 2 create erc721 issue token transaction
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721token("1", "0x0323", "www.copernet.com")
            txhash = self.constructReceiveTx(item, payload, self.whcAddress)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # step 2.1 check the erc721 issue token transaction
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["erc721tokenid"] == "3") is True
            assert (txnews["erc721propertyid"] == "1") is True
            assert (txnews["action"] == 2) is True
            assert (txnews["txid"] == txhash) is True
            assert preBalance == endBalance

            txnews = self.nodes[0].whc_getERC721TokenNews("1", "3")
            assert (txnews["creationtxid"] == txhash) is True
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["attribute"] == "0000000000000000000000000000000000000000000000000000000000000323"
            assert txnews["tokenurl"] == "www.copernet.com"

            txnews = self.nodes[0].whc_getERC721PropertyNews("1")
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["totalTokenNumber"] == 1000
            assert txnews["haveIssuedNumber"] == 3
            assert txnews["currentValidIssuedNumer"] == 2
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # step 3 create erc721 transfer token transaction
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_transferERC721token("1", "3")
            txhash = self.constructReceiveTx(item, payload, receiveAddr)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # step 3.1 check the erc721 transfer token transaction
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["erc721propertyid"] == "1") is True
            assert (txnews["erc721tokenid"] == "3") is True
            assert (txnews["action"] == 3) is True
            assert (txnews["txid"] == txhash) is True
            assert preBalance == endBalance

            txnews = self.nodes[0].whc_getERC721TokenNews("1", "3")
            assert (txnews["owner"] == receiveAddr) is True

            txnews = self.nodes[0].whc_getERC721PropertyNews("1")
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["totalTokenNumber"] == 1000
            assert txnews["haveIssuedNumber"] == 3
            assert txnews["currentValidIssuedNumer"] == 2
        else:
            assert False

        item = self.getSpent(receiveAddr)
        if item:
            # step 4 create erc721 destroy token transaction
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_destroyERC721token("1", "3")
            txhash = self.constructCreatePropertyTx(item, payload)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # step 4.1 check the erc721 destroy token transaction
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["erc721propertyid"] == "1") is True
            assert (txnews["erc721tokenid"] == "3") is True
            assert (txnews["action"] == 4) is True
            assert (txnews["txid"] == txhash) is True
            assert preBalance == endBalance

            txnews = self.nodes[0].whc_getERC721TokenNews("1", "3")
            assert txnews["owner"] == self.burn_address

            txnews = self.nodes[0].whc_getERC721PropertyNews("1")
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["totalTokenNumber"] == 1000
            assert txnews["haveIssuedNumber"] == 3
            assert txnews["currentValidIssuedNumer"] == 1
        else:
            assert False

    def erc721_error_test(self):
        receiveAddr = self.nodes[0].getnewaddress("")
        self.nodes[0].sendtoaddress(receiveAddr, 5)

        # issue property error case check.
        item = self.getSpent(self.whcAddress)
        if item:
            # step 1 create a error transaction, this totolNumber is 0.
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721property("c", "WH", "hello world", "www.wormhole.cash", "100898738618")
            payload = payload[:len(payload) - 16] + "0000000000000000"
            txhash = self.constructCreatePropertyTx(item, payload)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # step 1.1 check the erc721 property transaction with totalNumnber is 0.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 1) is True
            assert txnews["invalidreason"] == "Issuer ERC721 tokenNumber out of range or zero"
            assert preBalance == endBalance

            try:
                ret = self.nodes[0].whc_getERC721PropertyNews("3")
            except JSONRPCException as e:
                assert str(e) == "ERC721 property identifier does not exist (-8)"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # step 2 create a error transaction, this property name is empty.
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721property("c", "WH", "hello world", "www.wormhole.cash", "100898738618")
            payload = payload[:10] + payload[12:]
            txhash = self.constructCreatePropertyTx(item, payload)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # step 2.1 check the erc721 property transaction with property name is empty.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 1) is True
            assert txnews["invalidreason"] == "Property name is empty"
            assert preBalance == endBalance

            try:
                ret = self.nodes[0].whc_getERC721PropertyNews("3")
            except JSONRPCException as e:
                assert str(e) == "ERC721 property identifier does not exist (-8)"
        else:
            assert False

        # step 3 create a error transaction, this sender not have enougn whc.
        item = self.getSpent(receiveAddr)
        if item:
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721property("c", "WH", "hello world", "www.wormhole.cash", "100898738618")
            txhash = self.constructCreatePropertyTx(item, payload)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # step 3.1 check the erc721 property transaction with sender not have enough whc.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 1) is True
            assert txnews["invalidreason"] == "No enough WHC to pay for create a New property"
            assert preBalance == endBalance

            try:
                ret = self.nodes[0].whc_getERC721PropertyNews("3")
            except JSONRPCException as e:
                assert str(e) == "ERC721 property identifier does not exist (-8)"
        else:
            assert False

        # issue token error case check.
        item = self.getSpent(self.whcAddress)
        if item:
            # step 4 create erc721 token transaction : property is not exist in BlockChain
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721token("6", "2", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item, payload, receiveAddr)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # Step 4.1 check the error transaction with property is not exist in BlockChain.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 2) is True
            assert txnews["invalidreason"] == "Don't get special ERC721 property in BlockChain"
            assert preBalance == endBalance

        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # Step 5 create erc721 token transaction : token exist in BlockChain
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721token("1", "2", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item, payload, receiveAddr)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # Step 5.1 check the error transaction with tokenid exist in BlockChain.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 2) is True
            assert txnews["invalidreason"] == "The ERC721 token have exist"
            assert preBalance == endBalance

            txnews = self.nodes[0].whc_getERC721PropertyNews("1")
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["totalTokenNumber"] == 1000
            assert txnews["haveIssuedNumber"] == 3
            assert txnews["currentValidIssuedNumer"] == 1
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # Step 6 create erc721 token transaction : receiver is burn_address
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721token("1", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.burn_address)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # Step 6.1 check the error transaction with receiver is burn_address.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert (txnews["referenceaddress"] == item["address"]) is True
            assert txnews["valid"] is True
            assert (txnews["action"] == 2) is True
            assert preBalance == endBalance

            txnews = self.nodes[0].whc_getERC721TokenNews("1", "4")
            assert txnews["owner"] == self.whcAddress

            txnews = self.nodes[0].whc_getERC721PropertyNews("1")
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["totalTokenNumber"] == 1000
            assert txnews["haveIssuedNumber"] == 4
            assert txnews["currentValidIssuedNumer"] == 2
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # Step 7 create erc721 token transaction : receiver is burn_address
            preBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721token("1", "0x09", "www.wormhole.cash")
            txhash = self.constructCreatePropertyTx(item, payload, self.burn_address)
            endBalance = round(float(self.nodes[0].whc_getbalance(item["address"], self.whc)["balance"]), 8)

            # Step 7.1 check the error transaction with receiver is burn_address.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["action"] == 2) is True
            assert preBalance == endBalance

            txnews = self.nodes[0].whc_getERC721TokenNews("1", "5")
            assert txnews["owner"] == item["address"]

            txnews = self.nodes[0].whc_getERC721PropertyNews("1")
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["totalTokenNumber"] == 1000
            assert txnews["haveIssuedNumber"] == 5
            assert txnews["currentValidIssuedNumer"] == 3
        else:
            assert False

        preBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
        self.nodes[0].whc_issuanceERC721property(self.whcAddress, "copernet", "ERC", "wormhole", "www.wormhole.cash", "1")
        self.nodes[0].generatetoaddress(1, self.whcAddress)
        endBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
        assert preBalance - self.CREATE_TOKEN_FEE == endBalance

        preBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
        tokentx = self.nodes[0].whc_issuanceERC721Token(self.whcAddress, self.whcAddress, "3", "0x023567", "www.wormhole.cash")
        self.nodes[0].generatetoaddress(1, self.whcAddress)
        endBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)

        txnews = self.nodes[0].whc_gettransaction(tokentx)
        assert txnews["valid"] is True
        assert (txnews["erc721tokenid"] == "1") is True
        assert (txnews["referenceaddress"] == self.whcAddress) is True
        assert preBalance == endBalance

        item = self.getSpent(self.whcAddress)
        if item:
            # Step 7 create erc721 token transaction : all token have issued in the special property.
            preBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721token("3", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)
            endBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)

            # Step 7.1 check the error transaction with all token have issued in the special property.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 2) is True
            assert txnews["invalidreason"] == "Have issued erc721 token's number exceed"
            assert preBalance == endBalance

            txnews = self.nodes[0].whc_getERC721PropertyNews("3")
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["totalTokenNumber"] == 1
            assert txnews["haveIssuedNumber"] == 1
            assert txnews["currentValidIssuedNumer"] == 1
        else:
            assert False

        item = self.getSpent(receiveAddr)
        if item:
            # step 8 create erc721 token transaction : token issuer isn't property owner.
            preBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_issueERC721token("1", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item, payload, self.whcAddress)
            endBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)

            # step 8.1 check the error transaction with token issuer isn't property owner.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 2) is True
            assert txnews["invalidreason"] == "Only property of issuer could issue ERC721 token"
            assert preBalance == endBalance

            txnews = self.nodes[0].whc_getERC721PropertyNews("1")
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["totalTokenNumber"] == 1000
            assert txnews["haveIssuedNumber"] == 5
            assert txnews["currentValidIssuedNumer"] == 3
        else:
            assert False

        # transfer erc721 token error case check.
        item = self.getSpent(self.whcAddress)
        if item:
            # step 9 create erc721 transfer transaction : the token doesn't exist in BlockChain
            preBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_transferERC721token("3", "3")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=receiveAddr)
            endBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)

            # Step 9.1 check the error transaction with the token doesn't exist in BlockChain.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 3) is True
            assert (txnews["invalidreason"] == "The special ERC721 token doesn't exist in BlockChain")
            assert preBalance == endBalance

        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # step 10 create erc721 transfer transaction : the receiver is burn_address.
            preBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_transferERC721token("3", "1")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.burn_address)
            endBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)

            # step 10.1 check the error transaction with the receiver is burn_address.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["action"] == 3) is True
            assert (txnews["referenceaddress"] == item["address"]) is True
            assert preBalance == endBalance

            txnews = self.nodes[0].whc_getERC721TokenNews("3", "1")
            assert txnews["owner"] == self.whcAddress
        else:
            assert False

        item = self.getSpent(receiveAddr)
        if item:
            # step 11 create erc721 transfer transaction : the sender is not the token owner.
            preBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_transferERC721token("3", "1")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)
            endBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)

            # Step 11.1 check the error transaction with the sender is not the token owner.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 3) is True
            assert (txnews["invalidreason"] == "Sender is not the owner of ERC721 Token ")
            assert preBalance == endBalance
        else:
            assert False

        # destroy erc721 token error case check
        item = self.getSpent(self.whcAddress)
        if item:
            # step 12 create erc721 destroy transaction : the token doesn't exist in BlockChain
            preBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_destroyERC721token("3", "3")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=receiveAddr)
            endBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)

            # step 12.1  check the error transaction with the token doesn't exist in BlockChain.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 4) is True
            assert (txnews["invalidreason"] == "The special ERC721 token doesn't exist in BlockChain")
            assert preBalance == endBalance
        else:
            assert False

        item = self.getSpent(receiveAddr)
        if item:
            # step 13 create erc721 destroy transaction : the sender is not the token owner.
            preBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_destroyERC721token("3", "1")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)
            endBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)

            # step 13.1 check the error transaction with the sender is not the token owner.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 4) is True
            assert (txnews["invalidreason"] == "Sender is not the owner of ERC721 Token ")
            assert preBalance == endBalance
        else:
            assert False

        item = self.getSpent(receiveAddr)
        if item:
            # step 13 create erc721 destroy transaction : the property doesn't exist in BlockChain.
            preBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)
            payload = self.nodes[0].whc_createpayload_destroyERC721token("8", "1")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)
            endBalance = round(float(self.nodes[0].whc_getbalance(self.whcAddress, self.whc)["balance"]), 8)

            # step 13.1 check the error transaction with the property doesn't exist in BlockChain.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 4) is True
            assert (txnews["invalidreason"] == "Don't get special ERC721 property in BlockChain")
            assert preBalance == endBalance
        else:
            assert False

    def constructReceiveTx(self, item, payload, receive, amount = 0.00000546):
        tx = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
        tx = self.nodes[0].whc_createrawtx_opreturn(tx, payload)
        tx = self.nodes[0].whc_createrawtx_reference(tx, item["address"], round(float(item["amount"]) - 0.01, 8))
        tx = self.nodes[0].whc_createrawtx_reference(tx, receive, amount)
        tx = self.nodes[0].signrawtransaction(tx)
        txhash = self.nodes[0].sendrawtransaction(tx["hex"])
        self.nodes[0].generatetoaddress(1, item["address"])
        return txhash


    def constructCreatePropertyTx(self, item, payload, receiver = None):
        tx = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
        tx = self.nodes[0].whc_createrawtx_opreturn(tx, payload)
        if receiver is None:
            tx = self.nodes[0].whc_createrawtx_reference(tx, item["address"], round(float(item["amount"]) - 0.01, 8))
        else:
            tx = self.nodes[0].whc_createrawtx_reference(tx, receiver, round(float(item["amount"]) - 0.01, 8))
        tx = self.nodes[0].signrawtransaction(tx)
        txhash = self.nodes[0].sendrawtransaction(tx["hex"])
        self.nodes[0].generatetoaddress(1, item["address"])
        return txhash


    def getSpent(self, addr):
        item = None
        ret = self.nodes[0].listunspent()
        for it in ret:
            if it["address"] == addr and it["amount"] > 1:
                item = it
                break
        return item

    def run_test(self):
        self.erc721_error_featurestart_test()
        self.erc721_normal_feature_test()
        self.erc721_payload_feature_test()
        self.erc721_error_test()

if __name__ == '__main__':
    WHC_erc721_Test().main()