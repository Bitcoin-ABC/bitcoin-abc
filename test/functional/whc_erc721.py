#!/usr/bin/env python3

from test_framework.test_framework import BitcoinTestFramework

class WHC_erc721_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def erc721_error_featurestart_test(self):
        self.burn_address = "bchreg:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqp0kvc457r8whc"
        self.whcAddress = self.nodes[0].getnewaddress("")
        receiveAddr = self.nodes[0].getnewaddress("")

        # step 1 get whc
        addr0 = self.whcAddress
        self.nodes[0].generatetoaddress(101, addr0)
        self.nodes[0].whc_burnbchgetwhc(6)
        self.nodes[0].generatetoaddress(1, addr0)

        item = self.getSpent(self.whcAddress)
        if item:
            payload = self.nodes[0].whc_createpayload_issueERC721property("c", "WH", "hello world", "www.wormhole.cash", "100898738618")
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 1.1 check the erc721 property transaction with totalNumnber is 0.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 1) is True
            assert txnews["invalidreason"] == "Transaction type or version not permitted"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            payload = self.nodes[0].whc_createpayload_issueERC721token("0x01", "0x02", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item, payload, receiveAddr)

            # Step 5.1 check the error transaction with tokenid exist in BlockChain.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 2) is True
            assert txnews["invalidreason"] == "Transaction type or version not permitted"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            payload = self.nodes[0].whc_createpayload_transferERC721token("0x03", "0x01")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)

            # Step 11.1 check the error transaction with the sender is not the token owner.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 3) is True
            assert (txnews["invalidreason"] == "Transaction type or version not permitted")
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            payload = self.nodes[0].whc_createpayload_destroyERC721token("0x03", "0x01")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)

            # step 13.1 check the error transaction with the sender is not the token owner.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 4) is True
            assert (txnews["invalidreason"] == "Transaction type or version not permitted")
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
        tx1 = self.nodes[0].whc_issuanceERC721property(addr0, "copernet", "ERC", "wormhole", "www.wormhole.cash", "1000")
        self.nodes[0].generatetoaddress(1, addr0)

        # step 2.1 check transaction of result
        tx1result = self.nodes[0].whc_gettransaction(tx1)
        assert tx1result["valid"] is True
        assert (tx1result["propertyid"] == "0000000000000000000000000000000000000000000000000000000000000001") is True

        ret = self.nodes[0].whc_getERC721PropertyNews("0x01")
        assert ret["owner"] == addr0
        assert ret["creationtxid"] == tx1
        assert ret["totalTokenNumber"] == 1000

        # step 3 create a new erc721 token
        tokentx1 = self.nodes[0].whc_issuanceERC721Token(addr0, addr0, "0x01", "0x023567", "www.wormhole.cash")
        tokentx3 = self.nodes[0].whc_issuanceERC721Token(addr0, addr0, "0x01", "0x02", "0x023567", "www.wormhole.cash")
        self.nodes[0].generatetoaddress(1, addr0)

        # step 3.1 check create token transaction
        tokenResult1 = self.nodes[0].whc_gettransaction(tokentx1)
        tokenResult3 = self.nodes[0].whc_gettransaction(tokentx3)

        assert tokenResult1["valid"] is True
        assert (tokenResult1["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000001") is True
        assert tokenResult3["valid"] is True
        assert (tokenResult3["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000002") is True

        ret = self.nodes[0].whc_getERC721TokenNews("0x01", "0x01")
        assert ret["owner"] == addr0
        assert ret["creationtxid"] == tokentx1
        ret = self.nodes[0].whc_getERC721TokenNews("0x01", "0x02")
        assert ret["owner"] == addr0
        assert ret["creationtxid"] == tokentx3

        addr1 = self.nodes[0].getnewaddress("")
        # step 4 create transfer erc721 token
        transfertx = self.nodes[0].whc_transferERC721Token(addr0, addr1, "0x01", "0x01")
        self.nodes[0].sendtoaddress(addr1, 1)
        self.nodes[0].generatetoaddress(1, addr0)

        # step 4.1 check transfer erc721 token transaction
        transferResult = self.nodes[0].whc_gettransaction(transfertx)
        tokenNews = self.nodes[0].whc_getERC721TokenNews("0x01", "0x01")
        assert transferResult["valid"] is True
        assert (transferResult["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000001") is True
        assert (tokenNews["owner"] == addr1) is True
        assert tokenNews["creationtxid"] == tokentx1

        # step 5 create new destroy token transaction
        destroytx = self.nodes[0].whc_destroyERC721Token(addr0, "0x01", "0x02")
        self.nodes[0].generatetoaddress(1, addr0)

        # step 5.1 check destroy token transaction
        destroyResult = self.nodes[0].whc_gettransaction(destroytx)
        tokenNews = self.nodes[0].whc_getERC721TokenNews("0x01", "0x02")
        assert destroyResult["valid"] is True
        assert destroyResult["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000002"
        assert destroyResult["propertyid"] == "0000000000000000000000000000000000000000000000000000000000000001"
        assert (tokenNews["owner"] == self.burn_address) is True
        assert tokenNews["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000002"

    def erc721_payload_feature_test(self):
        receiveAddr = self.nodes[0].getnewaddress("")
        self.nodes[0].sendtoaddress(receiveAddr, 5)

        item = self.getSpent(self.whcAddress)
        if item:
            # step 1 create erc721 property transaction
            payload = self.nodes[0].whc_createpayload_issueERC721property("copernet", "WH", "hello world", "www.wormhole.cash", "100898738618")
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 1.1 check the erc721 property transaction
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["propertyid"] == "0000000000000000000000000000000000000000000000000000000000000002") is True

            txnews = self.nodes[0].whc_getERC721PropertyNews("0x02")
            assert (txnews["creationtxid"] == txhash) is True
            assert (txnews["owner"] == self.whcAddress) is True
            assert txnews["totalTokenNumber"] == 100898738618
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # step 2 create erc721 issue token transaction
            payload = self.nodes[0].whc_createpayload_issueERC721token("0x01", "0x0323", "www.copernet.com")
            txhash = self.constructReceiveTx(item, payload, self.whcAddress)

            # step 2.1 check the erc721 issue token transaction
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000003") is True
            assert (txnews["propertyid"] == "0000000000000000000000000000000000000000000000000000000000000001") is True

            txnews = self.nodes[0].whc_getERC721TokenNews("0x01", "0x03")
            assert (txnews["creationtxid"] == txhash) is True
            assert (txnews["owner"] == self.whcAddress) is True
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # step 3 create erc721 transfer token transaction
            payload = self.nodes[0].whc_createpayload_transferERC721token("0x01", "0x03")
            txhash = self.constructReceiveTx(item, payload, receiveAddr)

            # step 3.1 check the erc721 issue token transaction
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["propertyid"] == "0000000000000000000000000000000000000000000000000000000000000001") is True
            assert (txnews["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000003") is True

            txnews = self.nodes[0].whc_getERC721TokenNews("0x01", "0x03")
            assert (txnews["owner"] == receiveAddr) is True
        else:
            assert False

        item = self.getSpent(receiveAddr)
        if item:
            # step 4 create erc721 destroy token transaction
            payload = self.nodes[0].whc_createpayload_destroyERC721token("0x01", "0x03")
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 4.1 check the erc721 destroy token transaction
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["propertyid"] == "0000000000000000000000000000000000000000000000000000000000000001") is True
            assert (txnews["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000003") is True
            assert (txnews["action"] == 4) is True
            assert (txnews["txid"] == txhash) is True
        else:
            assert False

    def erc721_error_test(self):
        receiveAddr = self.nodes[0].getnewaddress("")
        self.nodes[0].sendtoaddress(receiveAddr, 5)

        # issue property error case check.
        item = self.getSpent(self.whcAddress)
        if item:
            # step 1 create a error transaction, this totolNumber is 0.
            payload = self.nodes[0].whc_createpayload_issueERC721property("c", "WH", "hello world", "www.wormhole.cash", "100898738618")
            payload = payload[:len(payload) - 16] + "0000000000000000"
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 1.1 check the erc721 property transaction with totalNumnber is 0.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 1) is True
            assert txnews["invalidreason"] == "Issuer ERC721 tokenNumber out of range or zero"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # step 2 create a error transaction, this property name is empty.
            payload = self.nodes[0].whc_createpayload_issueERC721property("c", "WH", "hello world", "www.wormhole.cash", "100898738618")
            payload = payload[:10] + payload[12:]
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 2.1 check the erc721 property transaction with property name is empty.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 1) is True
            assert txnews["invalidreason"] == "Property name is empty"
        else:
            assert False

        # step 3 create a error transaction, this sender not have enougn whc.
        item = self.getSpent(receiveAddr)
        if item:
            payload = self.nodes[0].whc_createpayload_issueERC721property("c", "WH", "hello world", "www.wormhole.cash", "100898738618")
            txhash = self.constructCreatePropertyTx(item, payload)

            # step 3.1 check the erc721 property transaction with sender not have enough whc.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 1) is True
            assert txnews["invalidreason"] == "No enough WHC to pay for create a New property"
        else:
            assert False

        # issue token error case check.
        item = self.getSpent(self.whcAddress)
        if item:
            # step 4 create erc721 token transaction : property is not exist in BlockChain
            payload = self.nodes[0].whc_createpayload_issueERC721token("0x06", "0x02", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item, payload, receiveAddr)

            # Step 4.1 check the error transaction with property is not exist in BlockChain.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 2) is True
            assert txnews["invalidreason"] == "Don't get special ERC721 property in BlockChain"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # Step 5 create erc721 token transaction : token exist in BlockChain
            payload = self.nodes[0].whc_createpayload_issueERC721token("0x01", "0x02", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item, payload, receiveAddr)

            # Step 5.1 check the error transaction with tokenid exist in BlockChain.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 2) is True
            assert txnews["invalidreason"] == "The ERC721 token have exist"
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # Step 6 create erc721 token transaction : receiver is burn_address
            payload = self.nodes[0].whc_createpayload_issueERC721token("0x01", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.burn_address)

            # Step 6.1 check the error transaction with receiver is burn_address.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert (txnews["referenceaddress"] == item["address"]) is True
            assert txnews["valid"] is True
            assert (txnews["action"] == 2) is True
        else:
            assert False

        self.nodes[0].whc_issuanceERC721property(self.whcAddress, "copernet", "ERC", "wormhole", "www.wormhole.cash", "1")
        self.nodes[0].generatetoaddress(1, self.whcAddress)
        tokentx = self.nodes[0].whc_issuanceERC721Token(self.whcAddress, self.whcAddress, "0x03", "0x023567", "www.wormhole.cash")
        self.nodes[0].generatetoaddress(1, self.whcAddress)
        txnews = self.nodes[0].whc_gettransaction(tokentx)
        assert txnews["valid"] is True
        assert (txnews["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000001") is True
        assert (txnews["referenceaddress"] == self.whcAddress) is True


        item = self.getSpent(self.whcAddress)
        if item:
            # Step 7 create erc721 token transaction : all token have issued in the special property.
            payload = self.nodes[0].whc_createpayload_issueERC721token("0x03", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)

            # Step 7.1 check the error transaction with all token have issued in the special property.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 2) is True
            assert txnews["invalidreason"] == "Have issued erc721 token's number exceed"
        else:
            assert False

        item = self.getSpent(receiveAddr)
        if item:
            # step 8 create erc721 token transaction : token issuer isn't property owner.
            payload = self.nodes[0].whc_createpayload_issueERC721token("0x01", "0x09", "www.wormhole.cash")
            txhash = self.constructReceiveTx(item, payload, self.whcAddress)

            # step 8.1 check the error transaction with token issuer isn't property owner.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 2) is True
            assert txnews["invalidreason"] == "Only property of issuer could issue ERC721 token"
        else:
            assert False

        # transfer erc721 token error case check.
        item = self.getSpent(self.whcAddress)
        if item:
            # step 9 create erc721 transfer transaction : the token doesn't exist in BlockChain
            payload = self.nodes[0].whc_createpayload_transferERC721token("0x03", "0x03")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=receiveAddr)

            # Step 9.1 check the error transaction with the token doesn't exist in BlockChain.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 3) is True
            assert (txnews["invalidreason"] == "The special ERC721 token doesn't exist in BlockChain")
        else:
            assert False

        item = self.getSpent(self.whcAddress)
        if item:
            # step 10 create erc721 transfer transaction : the receiver is burn_address.
            payload = self.nodes[0].whc_createpayload_transferERC721token("0x03", "0x01")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.burn_address)

            # step 10.1 check the error transaction with the receiver is burn_address.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["action"] == 3) is True
            assert (txnews["referenceaddress"] == item["address"]) is True
        else:
            assert False

        item = self.getSpent(receiveAddr)
        if item:
            # step 11 create erc721 transfer transaction : the sender is not the token owner.
            payload = self.nodes[0].whc_createpayload_transferERC721token("0x03", "0x01")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)

            # Step 11.1 check the error transaction with the sender is not the token owner.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 3) is True
            assert (txnews["invalidreason"] == "Sender is not the owner of ERC721 Token ")
        else:
            assert False

        # destroy erc721 token error case check
        item = self.getSpent(self.whcAddress)
        if item:
            # step 12 create erc721 destroy transaction : the token doesn't exist in BlockChain
            payload = self.nodes[0].whc_createpayload_destroyERC721token("0x03", "0x03")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=receiveAddr)

            # step 12.1  check the error transaction with the token doesn't exist in BlockChain.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 4) is True
            assert (txnews["invalidreason"] == "The special ERC721 token doesn't exist in BlockChain")
        else:
            assert False

        item = self.getSpent(receiveAddr)
        if item:
            # step 13 create erc721 destroy transaction : the sender is not the token owner.
            payload = self.nodes[0].whc_createpayload_destroyERC721token("0x03", "0x01")
            txhash = self.constructReceiveTx(item=item, payload=payload, receive=self.whcAddress)

            # step 13.1 check the error transaction with the sender is not the token owner.
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is False
            assert (txnews["action"] == 4) is True
            assert (txnews["invalidreason"] == "Sender is not the owner of ERC721 Token ")
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

    def constructCreatePropertyTx(self, item, payload):
        tx = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
        tx = self.nodes[0].whc_createrawtx_opreturn(tx, payload)
        tx = self.nodes[0].whc_createrawtx_reference(tx, item["address"], round(float(item["amount"]) - 0.01, 8))
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