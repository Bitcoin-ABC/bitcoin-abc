#!/usr/bin/env python3
# Copyright (c) 2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the scantxoutset rpc call."""
import os
import shutil

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (assert_equal, assert_raises_rpc_error)


class ScantxoutsetTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True

    def run_test(self):
        self.log.info("Mining blocks...")
        self.nodes[0].generate(110)

        addr = self.nodes[0].getnewaddress("")
        pubkey = self.nodes[0].getaddressinfo(addr)['pubkey']
        self.nodes[0].sendtoaddress(addr, 2)
        self.nodes[0].generate(1)

        self.log.info("Stop node, remove wallet, mine again some blocks...")
        self.stop_node(0)
        shutil.rmtree(os.path.join(
            self.nodes[0].datadir, "regtest", 'wallets'))
        self.start_node(0)
        self.nodes[0].generate(110)

        self.restart_node(0, ['-nowallet'])
        self.log.info("Test if we have found the non HD unspent outputs.")
        assert_equal(self.nodes[0].scantxoutset(
            "start", [{"pubkey": {"pubkey": pubkey}}])['total_amount'], 2)

        self.log.info("Test invalid parameters.")
        # missing pubkey object
        assert_raises_rpc_error(-8, 'Scanobject "pubkey" must contain an object as value',
                                self.nodes[0].scantxoutset, "start", [{"pubkey": pubkey}])
        # invalid object for address object
        assert_raises_rpc_error(-8, 'Scanobject "address" must contain a single string as value', self.nodes[0].scantxoutset, "start", [
                                {"address": {"address": addr}}])


if __name__ == '__main__':
    ScantxoutsetTest().main()
