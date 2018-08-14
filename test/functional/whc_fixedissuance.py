#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

import json
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_array_result, sync_chain, sync_blocks, assert_notemptylist)


class WHC_FixedIssuance_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
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

        '''
        generate some test coin
        '''
        self.nodes[0].generatetoaddress(101, addr0)
        # burn 3 BCH
        self.nodes[0].whc_burnbchgetwhc(6)
        self.nodes[0].generatetoaddress(1, addr0)
        self.nodes[0].sendtoaddress(addr1, 3)
        self.nodes[0].sendtoaddress(addr4, 3)
        self.nodes[0].generatetoaddress(1, addr0)
        self.nodes[0].whc_send(addr0, addr1, 1, "300")
        self.nodes[0].whc_send(addr0, addr4, 1, "300")
        self.nodes[0].generatetoaddress(1, addr0)

        tx = self.nodes[0].whc_sendissuancefixed(addr1, 1, 3, 0, "reg fix test", "fix",
                                                 "regfix", "http://www.google.com", "reg test fix", "12345.678")
        self.nodes[0].generatetoaddress(1, addr1)
        ret = self.nodes[0].whc_gettransaction(tx)
        assert ret["valid"] == True

        ppid1 = ret["propertyid"]
        self.nodes[0].whc_getproperty(ppid1)

        # check balances
        ret = self.nodes[0].whc_getbalance(addr1, 1)
        assert ret["balance"] == "299.00000000"
        ret = self.nodes[0].whc_getbalance(addr1, ppid1)
        assert ret["balance"] == "12345.678"

        # whc_send test
        self.nodes[0].whc_send(addr1, addr2, ppid1, "10.23")
        self.nodes[0].whc_send(addr1, addr3, ppid1, "1.09")
        self.nodes[0].generatetoaddress(2, addr1)

        ret = self.nodes[0].whc_getbalance(addr1, ppid1)
        assert ret["balance"] == str(eval("12345.678 - 10.23 - 1.09"))
        ret = self.nodes[0].whc_getbalance(addr2, ppid1)
        assert ret["balance"] == "10.230"
        ret = self.nodes[0].whc_getbalance(addr3, ppid1)
        assert ret["balance"] == "1.090"

        '''
        change issuer test
        '''
        tx = self.nodes[0].whc_sendchangeissuer(addr1, issuer_change_addr, ppid1)
        self.nodes[0].generatetoaddress(1, addr1)
        ret = self.nodes[0].whc_gettransaction(tx)
        assert ret["referenceaddress"] == issuer_change_addr

        # whc_sendsto test(same id)
        txid = self.nodes[0].whc_sendsto(addr1, ppid1, "1000", "", ppid1)
        ret = self.nodes[0].whc_gettransaction(txid)
        assert ret["type"] == "Send To Owners" and ret["amount"] == "1000.000"
        ret = self.nodes[0].whc_getallbalancesforid(ppid1)
        assert any(d.get("address") == addr1 and d.get("balance") == "11334.358" for d in ret)
        self.nodes[0].generatetoaddress(2, addr1)
        assert_array_result(self.nodes[0].whc_getallbalancesforid(ppid1),
                            {"address": addr1},
                            {"address": addr1, "balance": "11334.358", "reserved": "0.000"})
        assert_array_result(self.nodes[0].whc_getallbalancesforid(ppid1),
                            {"address": addr2},
                            {"address": addr2, "balance": "913.941", "reserved": "0.000"})
        assert_array_result(self.nodes[0].whc_getallbalancesforid(ppid1),
                            {"address": addr3},
                            {"address": addr3, "balance": "97.379", "reserved": "0.000"})
        '''
        whc_sendsto test(other id)
        '''
        # step1. generate other issuerance
        ret = self.nodes[0].whc_getbalance(addr4, 1)
        tx = self.nodes[0].whc_sendissuancefixed(addr4, 1, 2, 0, "reg fix2", "fix2",
                                                 "regfix2", "http://www.facebook.com", "reg test fix2", "1500000")
        self.nodes[0].generatetoaddress(1, addr4)
        ret = self.nodes[0].whc_gettransaction(tx)
        ppid2 = ret["propertyid"]
        self.nodes[0].whc_send(addr4, addr2, ppid2, "500000")
        self.nodes[0].generatetoaddress(2, addr4)
        ret = self.nodes[0].whc_getallbalancesforid(ppid2)
        # print("whc_getallbalancesforid >>>", ret)

        assert_array_result(self.nodes[0].whc_getallbalancesforid(ppid2),
                            {"address": addr4},
                            {"address": addr4, "balance": "1000000.00", "reserved": "0.00"})
        assert_array_result(self.nodes[0].whc_getallbalancesforid(ppid2),
                            {"address": addr2},
                            {"address": addr2, "balance": "500000.00", "reserved": "0.00"})

        # step2 whc_sendsto
        tx = self.nodes[0].whc_sendsto(addr1, ppid1, "1000.123", "", ppid2)
        self.nodes[0].generatetoaddress(1, addr1)
        assert_array_result(self.nodes[0].whc_getallbalancesforid(ppid1),
                            {"address": addr1},
                            {"address": addr1, "balance": "10334.235", "reserved": "0.000"})
        assert_array_result(self.nodes[0].whc_getallbalancesforid(ppid1),
                            {"address": addr2},
                            {"address": addr2, "balance": "1247.315", "reserved": "0.000"})
        assert_array_result(self.nodes[0].whc_getallbalancesforid(ppid1),
                            {"address": addr3},
                            {"address": addr3, "balance": "97.379", "reserved": "0.000"})
        assert_array_result(self.nodes[0].whc_getallbalancesforid(ppid1),
                            {"address": addr4},
                            {"address": addr4, "balance": "666.749", "reserved": "0.000"})

        '''
        sendall test
        '''
        tx_sa = self.nodes[0].whc_sendall(addr1, sendall_addr, 1)
        ret = self.nodes[0].whc_getallbalancesforaddress(addr1)
        assert_array_result(self.nodes[0].whc_getallbalancesforaddress(addr1),
                            {"propertyid": 1},
                            {"balance": "298.99999996", "reserved": "0.00000000"})
        assert_array_result(self.nodes[0].whc_getallbalancesforaddress(addr1),
                            {"propertyid": ppid1},
                            {"balance": "10334.235", "reserved": "0.000"})
        self.nodes[0].generatetoaddress(1, addr4)
        ret = self.nodes[0].whc_gettransaction(tx_sa)
        assert ret["valid"] == True

        assert_array_result(self.nodes[0].whc_getallbalancesforaddress(sendall_addr),
                            {"propertyid": 1},
                            {"balance": "298.99999996", "reserved": "0.00000000"})
        assert_array_result(self.nodes[0].whc_getallbalancesforaddress(sendall_addr),
                            {"propertyid": ppid1},
                            {"balance": "10334.235", "reserved": "0.000"})
        assert len(self.nodes[0].whc_getallbalancesforaddress(addr1)) == 0


if __name__ == '__main__':
    WHC_FixedIssuance_Test().main()

