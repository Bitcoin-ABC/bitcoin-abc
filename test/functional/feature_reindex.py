#!/usr/bin/env python3
# Copyright (c) 2014-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

#
# Test -reindex and -reindex-chainstate with CheckBlockIndex
#
import time

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ReindexTest(BitcoinTestFramework):

    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1

    def reindex(self, justchainstate=False):
        self.nodes[0].generate(3)
        blockcount = self.nodes[0].getblockcount()
        self.stop_nodes()
        extra_args = [
            ["-reindex-chainstate" if justchainstate else "-reindex", "-checkblockindex=1"]]
        self.start_nodes(extra_args)
        while self.nodes[0].getblockcount() < blockcount:
            time.sleep(0.1)
        assert_equal(self.nodes[0].getblockcount(), blockcount)
        self.log.info("Success")

    def run_test(self):
        self.reindex(False)
        self.reindex(True)
        self.reindex(False)
        self.reindex(True)


if __name__ == '__main__':
    ReindexTest().main()
