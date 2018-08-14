#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

import json
import datetime
import time

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

        '''
        generate some test coin
        '''
        self.nodes[0].generatetoaddress(101, addr0)
        # burn 3 BCH
        self.nodes[0].whc_burnbchgetwhc(6)
        self.nodes[0].generatetoaddress(1, addr0)
        self.nodes[0].sendtoaddress(addr1, 3)
        self.nodes[0].sendtoaddress(addr2, 3)
        self.nodes[0].generatetoaddress(1, addr0)
        self.nodes[0].whc_send(addr0, addr1, 1, "300")
        self.nodes[0].whc_send(addr0, addr2, 1, "300")
        self.nodes[0].generatetoaddress(1, addr0)

        # check initial value
        assert_array_result(self.nodes[0].whc_getallbalancesforaddress(addr1),
                            {"propertyid": 1},
                            {"balance": "300.00000000", "reserved": "0.00000000"})

        deadline = int(time.mktime(datetime.datetime.now().timetuple())) + 86400
        tx = self.nodes[0].whc_sendissuancecrowdsale(addr1, 1, 3, 0, "reg crowdsale test",
                                                     "crowdsale test", "reqcrowd", "http://www.google.ca",
                                                     "crowdsale test data", 1, "100000000", deadline,
                                                     10, 0, "10000000000")
        self.nodes[0].generatetoaddress(1, addr1)

        # check valid transaction
        ret = self.nodes[0].whc_gettransaction(tx)
        assert ret["valid"] is True
        assert_array_result(self.nodes[0].whc_getallbalancesforaddress(addr1),
                            {"propertyid": 1},
                            {"balance": "299.00000000", "reserved": "0.00000000"})

        ret = self.nodes[0].whc_gettransaction(tx)
        ppid = ret["propertyid"]

        # check data
        ret = self.nodes[0].whc_getcrowdsale(ppid)
        assert ret["issuer"] == addr1 and \
               ret["tokensperunit"] == "100000000.00000000"\
               and ret["earlybonus"] == 10 and\
               ret["tokensissued"] == "10000000000.000"


        # test participate crowdsale
        assert_array_result(self.nodes[0].whc_getallbalancesforaddress(addr1),
                            {"propertyid": 1},
                            {"balance": "299.00000000", "reserved": "0.00000000"})
        assert_array_result(self.nodes[0].whc_getallbalancesforaddress(addr2),
                            {"propertyid": 1},
                            {"balance": "300.00000000", "reserved": "0.00000000"})
        tx = self.nodes[0].whc_particrowsale(addr2, addr1, "31.12")
        self.nodes[0].generatetoaddress(1, addr1)

        assert_array_result(self.nodes[0].whc_getallbalancesforaddress(addr1),
                            {"propertyid": 1},
                            {"balance": "330.12000000", "reserved": "0.00000000"})
        assert_array_result(self.nodes[0].whc_getallbalancesforaddress(addr2),
                            {"propertyid": 1},
                            {"balance": "268.88000000", "reserved": "0.00000000"})


if __name__ == '__main__':
    WHC_FixedIssuance_Test().main()

