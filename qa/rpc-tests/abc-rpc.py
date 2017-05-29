#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Exercise the Bitcoin ABC RPC calls.

import time
import random
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.util import *
from test_framework.mininode import MAX_BLOCK_BASE_SIZE as LEGACY_MAX_BLOCK_BASE_SIZE


class ABC_RPC_Test (BitcoinTestFramework):

    def __init__(self):
        super(ABC_RPC_Test, self).__init__()
        self.num_nodes = 1
        self.setup_clean_chain = True

    def setup_network(self):
        self.nodes = self.setup_nodes()

    def run_test (self):
        # check that we start with legacy size
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, LEGACY_MAX_BLOCK_BASE_SIZE)

        # check that setting to legacy size is ok
        self.nodes[0].setexcessiveblock(LEGACY_MAX_BLOCK_BASE_SIZE)
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, LEGACY_MAX_BLOCK_BASE_SIZE)

        # check that going below legacy size is not accepted
        try:
            self.nodes[0].setexcessiveblock(LEGACY_MAX_BLOCK_BASE_SIZE - 1)
        except JSONRPCException as e:
            assert("Invalid parameter, excessiveblock must be larger than %d" % LEGACY_MAX_BLOCK_BASE_SIZE
                       in e.error['message'])
        else:
            raise AssertionError("Must not accept excessiveblock values < %d bytes" % LEGACY_MAX_BLOCK_BASE_SIZE)
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, LEGACY_MAX_BLOCK_BASE_SIZE)

        # check setting to 8 times legacy size
        self.nodes[0].setexcessiveblock(8 * LEGACY_MAX_BLOCK_BASE_SIZE)
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, 8 * LEGACY_MAX_BLOCK_BASE_SIZE)

if __name__ == '__main__':
    ABC_RPC_Test().main ()
