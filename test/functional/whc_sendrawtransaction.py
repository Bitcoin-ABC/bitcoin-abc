#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

from test_framework.test_framework import BitcoinTestFramework
from test_framework.authproxy import JSONRPCException


class WHC_SendRawTx_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def run_test(self):
        addr0 = self.nodes[0].getnewaddress("")
        addr1 = self.nodes[0].getnewaddress("")
        addr2 = self.nodes[0].getnewaddress("")
        self.nodes[0].generatetoaddress(101, addr0)
        self.nodes[0].whc_burnbchgetwhc(6)
        self.nodes[0].generatetoaddress(1, addr0)
        tx1 = self.nodes[0].whc_sendissuancefixed(addr0, 1, 3, 0, "dqw", "dwgyw", "ghsdy", "www.bndsyg", "csacbqyge",
                                                  "100000000")
        self.nodes[0].generatetoaddress(1, addr0)
        ret = self.nodes[0].whc_gettransaction(tx1)
        assert ret["valid"] is True

        tx1 = self.nodes[0].whc_sendsto(addr0, 3, "25671")
        self.nodes[0].generatetoaddress(1, addr0)
        ret = self.nodes[0].whc_gettransaction(tx1)
        assert ret["valid"] is False

        tx2 = self.nodes[0].whc_send(addr0, addr1, 3, "1000", addr1)
        self.nodes[0].generatetoaddress(1, addr0)
        ret = self.nodes[0].whc_gettransaction(tx2)
        assert ret["valid"] is True

        tx2 = self.nodes[0].whc_send(addr0, addr2, 3, "1000")
        self.nodes[0].generatetoaddress(101, addr1)
        ret = self.nodes[0].whc_gettransaction(tx2)
        assert ret["valid"] is True

        tx2 = self.nodes[0].whc_sendsto(addr1, 3, "1000", addr1, 4)
        self.nodes[0].generatetoaddress(1, addr0)
        ret = self.nodes[0].whc_gettransaction(tx2)
        assert ret["valid"] is False

        tx1 = self.nodes[0].whc_sendsto(addr1, 3, "1000")
        self.nodes[0].generatetoaddress(1, addr0)
        ret = self.nodes[0].whc_gettransaction(tx1)
        assert ret["valid"] is False

        ret = self.nodes[0].listunspent()
        spent = 0
        for item in ret:
            if item["address"] == addr1:
                if item["amount"] > 1:
                    spent = item

        tx = self.nodes[0].whc_createrawtx_input("", spent["txid"], spent["vout"])
        payload = self.nodes[0].whc_createpayload_sto(3, "1000", 3)
        p1 = payload[:28] + '1' + payload[29:]
        tx2 = self.nodes[0].whc_createrawtx_opreturn(tx, p1)
        tx3 = self.nodes[0].whc_createrawtx_reference(tx2, addr1, round(float(spent["amount"]) - 0.01, 8))
        tx4 = self.nodes[0].signrawtransaction(tx3)

        # test whc_sendrawtransaction
        try:
            self.nodes[0].whc_sendrawtransaction(tx4["hex"])
        except JSONRPCException as e:
            assert len(str(e)) != ""

        txhash = self.nodes[0].sendrawtransaction(tx4["hex"])
        self.nodes[0].generatetoaddress(1, addr0)
        ret = self.nodes[0].whc_gettransaction(txhash)
        assert ret["valid"] is False


if __name__ == '__main__':
    WHC_SendRawTx_Test().main()
