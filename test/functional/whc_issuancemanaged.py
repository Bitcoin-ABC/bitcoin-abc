#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

import json
import time
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_array_result, sync_chain, sync_blocks, assert_notemptylist)


class WHC_IssuanceManaged_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.tip = None
        self.setup_clean_chain = True

    def run_test(self):
        addr0 = self.nodes[0].getnewaddress("")
        addr1 = self.nodes[0].getnewaddress("")
        addr2 = self.nodes[0].getnewaddress("")
        addr3 = self.nodes[0].getnewaddress("")
        addr4 = self.nodes[0].getnewaddress("")
        issuer_change_addr = self.nodes[0].getnewaddress("")
        sendall_addr = self.nodes[0].getnewaddress("")

        self.nodes[0].generatetoaddress(101, addr0)
        # burn 3 BCH
        self.nodes[0].whc_burnbchgetwhc(40)
        self.nodes[0].generatetoaddress(1, addr0)
        self.nodes[0].sendtoaddress(addr1, 3)
        self.nodes[0].sendtoaddress(issuer_change_addr, 3)
        self.nodes[0].generatetoaddress(1, addr0)
        self.nodes[0].whc_send(addr0, addr1, 1, "300")
        self.nodes[0].whc_send(addr0, issuer_change_addr, 1, "300")
        self.nodes[0].generatetoaddress(1, addr0)

        tx = self.nodes[0].whc_sendissuancemanaged(addr1, 1 ,2 , 0 , "reg managed test",
                                                   "regtest", "issuancemanaged", "http://www.google.ca",
                                                   "data")
        self.nodes[0].generatetoaddress(1, addr1)
        ret = self.nodes[0].whc_gettransaction(tx)

        ppid1 = ret["propertyid"]
        ret = self.nodes[0].whc_getproperty(ppid1)
        assert ret["managedissuance"] is True

        ret = self.nodes[0].whc_getbalance(addr1, 1)
        assert ret["balance"] == "299.00000000"

        tx = self.nodes[0].whc_sendgrant(addr1, "", ppid1 , "1000000", "")
        self.nodes[0].generatetoaddress(1, addr1)
        ret = self.nodes[0].whc_gettransaction(tx)
        assert ret["valid"] is True

        tx = self.nodes[0].whc_sendrevoke(addr1, ppid1, "100000", "")
        self.nodes[0].generatetoaddress(1, addr1)
        ret = self.nodes[0].whc_gettransaction(tx)
        assert ret["valid"] is True

        tx = self.nodes[0].whc_sendchangeissuer(addr1, issuer_change_addr, ppid1)
        self.nodes[0].generatetoaddress(1, addr1)
        ret = self.nodes[0].whc_gettransaction(tx)
        assert ret["referenceaddress"] == issuer_change_addr


if __name__ == '__main__':
    WHC_IssuanceManaged_Test().main()
