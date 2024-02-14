# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Exercise the Bitcoin ABC RPC calls.

import re

from test_framework.cdefs import (
    DEFAULT_MAX_BLOCK_SIZE,
    LEGACY_MAX_BLOCK_SIZE,
    ONE_MEGABYTE,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

BLOCKSIZE_TOO_LOW = (
    f"Error: Excessive block size must be > {LEGACY_MAX_BLOCK_SIZE:,} bytes"
)


class ExcessiveBlockSizeRPCTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True
        self.extra_args = [[f"-blockmaxsize={LEGACY_MAX_BLOCK_SIZE}"]]

    def check_subversion(self, pattern_str):
        # Check that the subversion is set as expected
        netinfo = self.nodes[0].getnetworkinfo()
        subversion = netinfo["subversion"]
        pattern = re.compile(pattern_str)
        assert pattern.match(subversion)

    def test_excessiveblock(self):
        node = self.nodes[0]

        # Check that we start with DEFAULT_MAX_BLOCK_SIZE
        getsize = node.getexcessiveblock()
        ebs = getsize["excessiveBlockSize"]
        assert_equal(ebs, DEFAULT_MAX_BLOCK_SIZE)

        def setexcessiveblock(block_size):
            self.restart_node(
                0, self.extra_args[0] + [f"-excessiveblocksize={block_size}"]
            )

        # Check that setting to legacy size is ok
        setexcessiveblock(LEGACY_MAX_BLOCK_SIZE + 1)
        getsize = node.getexcessiveblock()
        ebs = getsize["excessiveBlockSize"]
        assert_equal(ebs, LEGACY_MAX_BLOCK_SIZE + 1)

        # Check setting to 2MB
        setexcessiveblock(2 * ONE_MEGABYTE)
        getsize = node.getexcessiveblock()
        ebs = getsize["excessiveBlockSize"]
        assert_equal(ebs, 2 * ONE_MEGABYTE)
        # Check for EB correctness in the subver string
        self.check_subversion(r"/Bitcoin ABC:.*\(EB2\.0; .*\)/")

        # Check setting to 13MB
        setexcessiveblock(13 * ONE_MEGABYTE)
        getsize = node.getexcessiveblock()
        ebs = getsize["excessiveBlockSize"]
        assert_equal(ebs, 13 * ONE_MEGABYTE)
        # Check for EB correctness in the subver string
        self.check_subversion(r"/Bitcoin ABC:.*\(EB13\.0; .*\)/")

        # Check setting to 13.14MB
        setexcessiveblock(13140000)
        getsize = node.getexcessiveblock()
        ebs = getsize["excessiveBlockSize"]
        assert_equal(ebs, 13.14 * ONE_MEGABYTE)
        # check for EB correctness in the subver string
        self.check_subversion(r"/Bitcoin ABC:.*\(EB13\.1; .*\)/")

    def run_test(self):
        self.test_excessiveblock()


if __name__ == "__main__":
    ExcessiveBlockSizeRPCTest().main()
