#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Exercise the command line functions specific to ABC functionality.
Currently:

-excessiveblocksize=<blocksize_in_bytes>
"""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (start_node,
                                 stop_node,
                                 assert_equal)
from test_framework.cdefs import DEFAULT_MAX_BLOCK_SIZE
from test_framework.mininode import LEGACY_MAX_BLOCK_SIZE


class ABC_CmdLine_Test (BitcoinTestFramework):

    def __init__(self):
        super(ABC_CmdLine_Test, self).__init__()
        self.num_nodes = 1
        self.setup_clean_chain = False

    def setup_network(self):
        self.nodes = self.setup_nodes()

    def check_excessive(self, expected_value):
        'Check that the excessiveBlockSize is as expected'
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, expected_value)

    def excessiveblocksize_test(self):
        print("Testing -excessiveblocksize")

        print("  Set to twice the default, i.e. %d bytes" %
              (2 * DEFAULT_MAX_BLOCK_SIZE))
        stop_node(self.nodes[0], 0)
        self.extra_args = [["-excessiveblocksize=%d" %
                            (2 * DEFAULT_MAX_BLOCK_SIZE)]]
        self.nodes[0] = start_node(0, self.options.tmpdir,
                                   self.extra_args[0])
        self.check_excessive(2 * DEFAULT_MAX_BLOCK_SIZE)

        print("  Attempt to set below legacy limit of 1MB - try %d bytes" %
              (LEGACY_MAX_BLOCK_SIZE - 1))
        stop_node(self.nodes[0], 0)
        try:
            self.extra_args = [["-excessiveblocksize=%d" %
                                (LEGACY_MAX_BLOCK_SIZE - 1)]]
            self.nodes[0] = start_node(0, self.options.tmpdir,
                                   self.extra_args[0])
        except Exception as e:
            assert_equal('bitcoind exited with status 1 during '
                         'initialization', str(e))
        else:
            raise AssertionError("Must not accept excessiveblocksize"
                                " value < %d bytes" % LEGACY_MAX_BLOCK_SIZE)

        print("  Attempt to set below blockmaxsize (mining limit)")
        try:
            self.extra_args = [['-blockmaxsize=1500000',
                                '-excessiveblocksize=1300000']]
            self.nodes[0] = start_node(0, self.options.tmpdir,
                                   self.extra_args[0])
        except Exception as e:
            assert_equal('bitcoind exited with status 1 during '
                         'initialization', str(e))
        else:
            raise AssertionError("Must not accept excessiveblocksize"
                                " below blockmaxsize")

    def run_test(self):

        # Run tests on -excessiveblocksize option
        self.excessiveblocksize_test()

        # Start up default because test framework expects running node
        # at end of test.
        self.nodes[0] = start_node(0, self.options.tmpdir)

if __name__ == '__main__':
    ABC_CmdLine_Test().main()
