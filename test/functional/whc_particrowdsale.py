#!/usr/bin/env python3

from test_framework.test_framework import BitcoinTestFramework


class WHC_PartiCrowdsale_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def token_create_test(self):
        addr0 = self.nodes[0].getnewaddress("")
        addr1 = self.nodes[0].getnewaddress("")
        addr2 = self.nodes[0].getnewaddress("")

        self.nodes[0].generatetoaddress(101, addr0)
        # burn 6 BCH
        self.nodes[0].whc_burnbchgetwhc(9)
        self.nodes[0].generatetoaddress(1, addr0)
        self.nodes[0].sendtoaddress(addr1, 6)
        self.nodes[0].sendtoaddress(addr2, 3)
        self.nodes[0].generatetoaddress(1, addr0)
        self.nodes[0].whc_send(addr0, addr1, 1, "200")
        self.nodes[0].generatetoaddress(1, addr0)

        # addr generate a crowdsale
        tx = self.nodes[0].whc_sendissuancecrowdsale(addr1, 1, 1, 0, "lhr test", "lhr", "whccoin",
                                                     "www.lhr.com",
                                                     "test crowd", 1, "0.00000001", 3034937279, 10, 0, "1000000")
        self.nodes[0].generatetoaddress(1, addr1)
        ret = self.nodes[0].whc_gettransaction(tx)
        ppid = ret["propertyid"]

        ## 参与众筹
        # 1. 创建WHC
        # 2. 创建众筹资产
        # 3. 创建参与众筹的payload
        # 4.
        # 修改payload，修改目标：
        # 1. 向不存在众筹的地址购买众筹token；
        # 2. 使用超过众筹发送者所拥有的资金去购买众筹；
        # 3. 参与的资金量不足以购买最小精度；


        # create token
        ret = self.nodes[0].listunspent(1)

        rawtx = self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
        payload = self.nodes[0].whc_createpayload_particrowdsale(1)
        # pecosystem = payload[:-1] + "4"
        optx = self.nodes[0].whc_createrawtx_opreturn(rawtx, pecosystem)
        # comtx = self.nodes[0].whc_createrawtx_reference(optx, addr0, float(ret[0]["amount"]) - 0.05)
        # oktx = self.nodes[0].signrawtransaction(comtx)
        # txhash = self.nodes[0].sendrawtransaction(oktx["hex"])
        #
        # self.nodes[0].generatetoaddress(1, addr0)
        #
        # ret = self.nodes[0].whc_gettransaction(txhash)
        # assert ret["valid"] is False
        # assert ret["invalidreason"] == "Ecosystem is invalid"

    def run_test(self):
        self.token_create_test()


if __name__ == '__main__':
    WHC_PartiCrowdsale_Test().main()

