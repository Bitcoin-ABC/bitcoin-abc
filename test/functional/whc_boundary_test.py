#!/usr/bin/env python3
# Copyleft (c) 2017 eric sun

import datetime
import time

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_array_result, sync_chain, sync_blocks, assert_notemptylist)
from test_framework.authproxy import JSONRPCException


class WhcNegtiveTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def run_test(self):
        addr0 = self.nodes[0].getnewaddress("")
        self.nodes[0].generatetoaddress(101, addr0)

        '''
        whc_burnbchgetwhc test
        '''
        try:
            ret = self.nodes[0].whc_burnbchgetwhc(0.5)
        except JSONRPCException as e:
            assert str(e) == "burn amount less 1BCH  (-3)"

        try:
            ret = self.nodes[0].whc_burnbchgetwhc(210000)
        except JSONRPCException as e:
            print(e)
            assert str(e) == "Insufficient funds (-6)"

        try:
            ret = self.nodes[0].whc_burnbchgetwhc(1.0123456789)
        except JSONRPCException as e:
            assert str(e) == "Invalid amount (-3)"

        ret = self.nodes[0].whc_burnbchgetwhc(1.01234)
        self.nodes[0].generatetoaddress(1, addr0)
        ret = self.nodes[0].whc_getproperty(1)
        assert ret["totaltokens"] == '101.23400000'

        '''
        whc_createrawtx_reference test
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            rawtx = self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            ret = self.nodes[0].whc_createrawtx_reference(rawtx, addr0, "abcd")
            self.nodes[0].whc_createrawtx_opreturn(rawtx, ret)
        except JSONRPCException as e:
            assert str(e) == "Invalid amount (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            rawtx = self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            # more than 8 precision decimal amount
            self.nodes[0].whc_createrawtx_reference(rawtx, addr0, 1.5333333333333)
        except JSONRPCException as e:
            assert str(e) == "Invalid amount (-3)"

        # invalid whc_createrawtx_opreturn params
        try:
            rawtx = self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            self.nodes[0].whc_createrawtx_reference(rawtx, addr0, 1.53)
            self.nodes[0].whc_createrawtx_opreturn("", "")
        except JSONRPCException as e:
            assert str(e) == "payload must be hexadecimal string (not '') (-8)"

        '''
        whc_createpayload_simplesend test
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            # test a non-exist propertyid
            self.nodes[0].whc_createpayload_simplesend(999, 1.5333)
        except JSONRPCException as e:
            assert str(e) == "Property identifier does not exist (-8)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            self.nodes[0].whc_createpayload_simplesend(1, "1.5333333333333333333")
        except JSONRPCException as e:
            assert str(e) == "Invalid amount (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            self.nodes[0].whc_createpayload_simplesend(1, 1.53)
        except JSONRPCException as e:
            assert str(e) == "JSON value is not a string as expected (-1)"

        '''
        whc_createpayload_sendall test
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            self.nodes[0].whc_createpayload_sendall(10)
        except JSONRPCException as e:
            assert str(e) == "Invalid ecosystem (1 = main, 2 = test only) (-8)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            self.nodes[0].whc_createpayload_sendall("abc")
        except JSONRPCException as e:
            assert str(e) == "JSON value is not an integer as expected (-1)"

        '''
        whc_createpayload_issuancefixed 
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_issuancefixed(1, 3, 0, "", "", "2ec", "", "", "")
        except JSONRPCException as e:
            assert str(e) == "Invalid amount (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_issuancefixed(1, 3, 0, "", "", "", "", "", "100000")
        except JSONRPCException as e:
            assert str(e) == "Property name must not be empty (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_issuancefixed(1, 2, 1, "", "", "data", "", "", "100000")
        except JSONRPCException as e:
            assert str(e) == "Property appends/replaces are not yet supported (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_issuancefixed(3, 2, 1, "", "", "data", "", "", "100000")
        except JSONRPCException as e:
            assert str(e) == "Invalid ecosystem (1 = main, 2 = test only) (-8)"


        '''
        whc_createpayload_issuancecrowdsale test
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            deadline = int(time.mktime(datetime.datetime.now().timetuple())) + 86400
            tx = self.nodes[0].whc_sendissuancecrowdsale(addr0, 1, 3, 0, "",
                                                         "", "asdqw", "",
                                                         "", 1, "100000000", deadline,
                                                         10, 0, "")
        except JSONRPCException as e:
            assert str(e) == "Invalid amount (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            deadline = int(time.mktime(datetime.datetime.now().timetuple())) + 86400
            tx = self.nodes[0].whc_sendissuancecrowdsale(addr0, 1, 3, 0, "",
                                                         "", "", "",
                                                         "", 1, "100000000", deadline,
                                                         10, 1, "100000000000")
        except JSONRPCException as e:
            assert str(e) == "undefiend field must be 0 (-8)"


        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            deadline = int(time.mktime(datetime.datetime.now().timetuple())) + 86400
            tx = self.nodes[0].whc_sendissuancecrowdsale(addr0, 1, 3, 0, "",
                                                         "", "", "",
                                                         "", 1, "100000000", deadline,
                                                         10, 0, "100000000000")
        except JSONRPCException as e:
            assert str(e) == "Property name must not be empty (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            deadline = int(time.mktime(datetime.datetime.now().timetuple())) - 86400
            tx = self.nodes[0].whc_createpayload_issuancecrowdsale(4, 3, 0, "",
                                                         "", "name", "",
                                                         "", 1, "100000000", deadline,
                                                         10, 0, "100000000000")
        except JSONRPCException as e:
            assert str(e) == "Invalid ecosystem (1 = main, 2 = test only) (-8)"


        '''
        whc_createpayload_issuancecrowdsale test
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_particrowdsale(1.11111111)
        except JSONRPCException as e:
            assert str(e) == "JSON value is not a string as expected (-1)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            self.nodes[0].whc_createpayload_particrowdsale("-100")
        except JSONRPCException as e:
            assert str(e) == "Invalid amount (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_particrowdsale("")
        except JSONRPCException as e:
            assert str(e) == "Invalid amount (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_particrowdsale("abcd")
        except JSONRPCException as e:
            assert str(e) == "Invalid amount (-3)"


        '''
        whc_createpayload_closecrowdsale
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_closecrowdsale("")
        except JSONRPCException as e:
            assert str(e) == "JSON value is not an integer as expected (-1)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_closecrowdsale(-100)
        except JSONRPCException as e:
            assert str(e) == "Property identifier is out of range (-8)"

        '''
        whc_createpayload_issuancemanaged
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_issuancemanaged(1, 2, 0, "", "", "", "", "")
        except JSONRPCException as e:
            assert str(e) == "Property name must not be empty (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_issuancemanaged(1, 2, 10, "", "", "name", "", "")
        except JSONRPCException as e:
            assert str(e) == "Property appends/replaces are not yet supported (-3)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_issuancemanaged(1, -1, 0, "", "", "name", "", "")
            print(tx)
        except JSONRPCException as e:
            assert str(e) == "Invalid property type, type range must be [0, 8] (-8)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_issuancemanaged(1, 9, 0, "", "", "name", "", "")
        except JSONRPCException as e:
            assert str(e) == "Invalid property type, type range must be [0, 8] (-8)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_issuancemanaged(3, 3, 0, "", "", "name", "", "")
        except JSONRPCException as e:
            assert str(e) == "Invalid ecosystem (1 = main, 2 = test only) (-8)"

        '''
        whc_createpayload_grant test
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_grant(1000, "10000")
        except JSONRPCException as e:
            assert str(e) == "Property identifier does not exist (-8)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_grant(1, "10000")
        except JSONRPCException as e:
            assert str(e) == "Property identifier does not refer to a managed property (-8)"

        '''
        whc_createpayload_revoke
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_revoke(1000, "10000")
        except JSONRPCException as e:
            assert str(e) == "Property identifier does not exist (-8)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_revoke(1, "10000")
        except JSONRPCException as e:
            assert str(e) == "Property identifier does not refer to a managed property (-8)"


        '''
        whc_createpayload_sto
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_sto(1000, "10000")
        except JSONRPCException as e:
            assert str(e) == "Property identifier does not exist (-8)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_sto(1, "10000")
        except JSONRPCException as e:
            assert str(e) == "Property identifier does not refer to a managed property (-8)"

        '''
        whc_createpayload_sto
        '''
        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_changeissuer(1000)
        except JSONRPCException as e:
            assert str(e) == "Property identifier does not exist (-8)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_changeissuer(1)
        except JSONRPCException as e:
            assert str(e) == "Property identifier does not refer to a managed property (-8)"

        try:
            ret = self.nodes[0].listunspent(1)
            self.nodes[0].whc_createrawtx_input("", ret[0]["txid"], ret[0]["vout"])
            tx = self.nodes[0].whc_createpayload_changeissuer("abc")
        except JSONRPCException as e:
            assert str(e) == "JSON value is not an integer as expected (-1)"


if __name__ == '__main__':
    WhcNegtiveTest().main()
