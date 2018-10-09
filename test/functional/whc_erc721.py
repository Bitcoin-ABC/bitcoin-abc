#!/usr/bin/env python3

from test_framework.test_framework import BitcoinTestFramework

class WHC_erc721_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def erc721_normal_feature_test(self):
        self.burn_address = "bchreg:pqqqqqqqqqqqqqqqqqqqqqqqqqqqqp0kvc457r8whc"
        self.whcAddress = self.nodes[0].getnewaddress("")

        # normal step check
        # step 1 get whc
        addr0 = self.whcAddress
        self.nodes[0].generatetoaddress(101, addr0)
        self.nodes[0].whc_burnbchgetwhc(6)
        self.nodes[0].generatetoaddress(1, addr0)

        # step 2 create a new erc721 property
        tx1 = self.nodes[0].whc_issuanceERC721property(addr0, "copernet", "ERC", "wormhole", "www.wormhole.cash", "1000")
        self.nodes[0].generatetoaddress(1, addr0)

        # step 3 check transaction of result
        tx1result = self.nodes[0].whc_gettransaction(tx1)
        assert tx1result["valid"] is True
        assert (tx1result["propertyid"] == "0000000000000000000000000000000000000000000000000000000000000001") is True

        # step 4 create a new erc721 token
        tokentx1 = self.nodes[0].whc_issuanceERC721Token(addr0, addr0, "0x01", "0x023567", "www.wormhole.cash")
        tokentx3 = self.nodes[0].whc_issuanceERC721Token(addr0, addr0, "0x01", "0x02", "0x023567", "www.wormhole.cash")
        self.nodes[0].generatetoaddress(1, addr0)

        # step 5 check create token transaction
        tokenResult1 = self.nodes[0].whc_gettransaction(tokentx1)
        tokenResult3 = self.nodes[0].whc_gettransaction(tokentx3)

        assert tokenResult1["valid"] is True
        assert (tokenResult1["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000001") is True
        assert tokenResult3["valid"] is True
        assert (tokenResult3["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000002") is True

        # step 5.1 error check about create erc721 token
        tokentx2 = self.nodes[0].whc_issuanceERC721Token(addr0, addr0, "0x01", "0x01", "0x023567", "www.wormhole.cash")
        self.nodes[0].generatetoaddress(1, addr0)
        tokenResult2 = self.nodes[0].whc_gettransaction(tokentx2)
        assert tokenResult2["valid"] is False

        addr1 = self.nodes[0].getnewaddress("")
        # step 6 create transfer erc721 token
        transfertx = self.nodes[0].whc_transferERC721Token(addr0, addr1, "0x01", "0x01")
        self.nodes[0].generatetoaddress(1, addr0)

        # step 7 check transfer erc721 token transaction
        transferResult = self.nodes[0].whc_gettransaction(transfertx)
        tokenNews = self.nodes[0].whc_getERC721TokenNews("0x01", "0x01")
        assert transferResult["valid"] is True
        assert (transferResult["tokenid"] == "0000000000000000000000000000000000000000000000000000000000000001") is True
        assert (tokenNews["owner"] == addr1) is True

        # step 8 create new destroy token transaction
        destroytx = self.nodes[0].whc_destroyERC721Token(addr0, "0x01", "0x02")
        self.nodes[0].generatetoaddress(1, addr0)

        # step 9 check destroy token transaction
        destroyResult = self.nodes[0].whc_gettransaction(destroytx)
        tokenNews = self.nodes[0].whc_getERC721TokenNews("0x01", "0x02")
        assert destroyResult["valid"] is True
        assert (tokenNews["owner"] == self.burn_address) is True


    def erc721_error_feature_test(self):
        items = self.getSpent(self.whcAddress)
        item = items[0] if items else None
        if item:
            # step 1 create erc721 property transaction
            tx = self.nodes[0].whc_createrawtx_input("", item["txid"], item["vout"])
            payload = self.nodes[0].whc_createpayload_issueERC721property("copernet", "WH", "hello world", "www.wormhole.cash", "100898738618")
            tx = self.nodes[0].whc_createrawtx_opreturn(tx, payload)
            tx = self.nodes[0].whc_createrawtx_reference(tx, self.whcAddress, round(float(item["amount"]) - 0.01, 8))
            tx = self.nodes[0].signrawtransaction(tx)
            txhash = self.nodes[0].sendrawtransaction(tx)
            self.nodes[0].generatetoaddress(1, self.whcAddress)

            # step 2 check the erc721 property transaction
            txnews = self.nodes[0].whc_gettransaction(txhash)
            assert txnews["valid"] is True
            assert (txnews["propertyid"] == "0000000000000000000000000000000000000000000000000000000000000002") is True

            # payload = payload[:len(payload) - 16] + "0000000000000000"


    def getSpent(self, addr):
        return [item for item in self.nodes[0].listunspent()
                if item["address"] == addr and item["amount"] > 1]

    def run_test(self):
        self.erc721_normal_feature_test()
        self.erc721_error_feature_test()


if __name__ == '__main__':
    WHC_erc721_Test().main()