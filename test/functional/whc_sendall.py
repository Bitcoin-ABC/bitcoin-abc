#!/usr/bin/env python3

from test_framework.test_framework import BitcoinTestFramework


class WHC_SendAll_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def token_create_test(self):
        # step 1 get whc
        addr0 = self.nodes[0].getnewaddress("")
        self.nodes[0].generatetoaddress(101, addr0)
        self.nodes[0].whc_burnbchgetwhc(6)
        self.nodes[0].generatetoaddress(1, addr0)

        # create token
        ret = self.nodes[0].listunspent(1)
        rawtx = self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
        payload = self.nodes[0].whc_createpayload_sendall(1)
        pecosystem = payload[:-1] + "4"
        optx = self.nodes[0].whc_createrawtx_opreturn(rawtx, pecosystem)
        comtx = self.nodes[0].whc_createrawtx_reference(optx, addr0, float(ret[0]["amount"]) - 0.05)
        oktx = self.nodes[0].signrawtransactionwithwallet(comtx)
        txhash = self.nodes[0].sendrawtransaction(oktx["hex"])

        self.nodes[0].generatetoaddress(1, addr0)

        ret = self.nodes[0].whc_gettransaction(txhash)
        assert ret["valid"] is False
        assert ret["invalidreason"] == "Ecosystem is invalid"

    def run_test(self):
        self.token_create_test()


if __name__ == '__main__':
    WHC_SendAll_Test().main()

