#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Exercise the command line functions specific to ABC functionality.
Currently:

-excessiveblocksize=<blocksize_in_bytes>
"""

import re

from test_framework.cdefs import LEGACY_MAX_BLOCK_SIZE
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

MAX_GENERATED_BLOCK_SIZE_ERROR = (
    'Max generated block size (blockmaxsize) cannot exceed the excessive block size (excessiveblocksize)')


class ABC_CmdLine_Test (BitcoinTestFramework):

    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = False

    def check_excessive(self, expected_value):
        'Check that the excessiveBlockSize is as expected'
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, expected_value)

    def check_subversion(self, pattern_str):
        'Check that the subversion is set as expected'
        netinfo = self.nodes[0].getnetworkinfo()
        subversion = netinfo['subversion']
        pattern = re.compile(pattern_str)
        assert(pattern.match(subversion))

    def excessiveblocksize_test(self):
        self.log.info("Testing -excessiveblocksize")

        self.log.info("  Set to twice the default, i.e. {} bytes".format(
            2 * LEGACY_MAX_BLOCK_SIZE))
        self.stop_node(0)
        self.start_node(0, ["-excessiveblocksize={}".format(
            2 * LEGACY_MAX_BLOCK_SIZE)])
        self.check_excessive(2 * LEGACY_MAX_BLOCK_SIZE)
        # Check for EB correctness in the subver string
        self.check_subversion("/Bitcoin ABC:.*\(EB2\.0; .*\)/")

        self.log.info("  Attempt to set below legacy limit of 1MB - try {} bytes".format(
            LEGACY_MAX_BLOCK_SIZE))
        self.stop_node(0)
        self.assert_start_raises_init_error(
            0, ["-excessiveblocksize={}".format(LEGACY_MAX_BLOCK_SIZE)],
            'Error: Excessive block size must be > 1,000,000 bytes (1MB)')
        self.log.info("  Attempt to set below blockmaxsize (mining limit)")
        self.assert_start_raises_init_error(
            0, ['-blockmaxsize=1500000', '-excessiveblocksize=1300000'], 'Error: ' + MAX_GENERATED_BLOCK_SIZE_ERROR)

        # Make sure we leave the test with a node running as this is what thee
        # framework expects.
        self.start_node(0, [])

    def run_test(self):
        # Run tests on -excessiveblocksize option
        self.excessiveblocksize_test()


if __name__ == '__main__':
    ABC_CmdLine_Test().main()
