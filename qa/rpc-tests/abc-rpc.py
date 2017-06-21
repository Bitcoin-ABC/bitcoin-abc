#!/usr/bin/env python3
# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

# Exercise the Bitcoin ABC RPC calls.

import time
import random
import re
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import *
from test_framework.cdefs import (ONE_MEGABYTE,
                                  LEGACY_MAX_BLOCK_SIZE,
                                  DEFAULT_MAX_BLOCK_SIZE)

# far into the future
UAHF_START_TIME = 2000000000

class ABC_RPC_Test (BitcoinTestFramework):

    def __init__(self):
        super(ABC_RPC_Test, self).__init__()
        self.num_nodes = 1
        self.tip = None
        self.setup_clean_chain = True

    def setup_network(self):
        self.extra_args = [['-debug',
                            '-norelaypriority',
                            "-mocktime=%d" % UAHF_START_TIME,
                            "-uahfstarttime=%d" % UAHF_START_TIME,
                            '-whitelist=127.0.0.1',
                            '-par=1']]
        self.nodes = start_nodes(self.num_nodes, self.options.tmpdir,
                                 self.extra_args)
        self.genesis_hash = int(self.nodes[0].getbestblockhash(), 16)

    def check_subversion(self, pattern_str):
        'Check that the subversion is set as expected'
        netinfo = self.nodes[0].getnetworkinfo()
        subversion = netinfo['subversion']
        pattern = re.compile(pattern_str)
        assert(pattern.match(subversion))

    def test_excessiveblock(self):
        # Check that we start with DEFAULT_MAX_BLOCK_SIZE
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, DEFAULT_MAX_BLOCK_SIZE)

        # Check that setting to legacy size is ok
        self.nodes[0].setexcessiveblock(LEGACY_MAX_BLOCK_SIZE + 1)
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, LEGACY_MAX_BLOCK_SIZE + 1)

        # Check that going below legacy size is not accepted
        try:
            self.nodes[0].setexcessiveblock(LEGACY_MAX_BLOCK_SIZE)
        except JSONRPCException as e:
            assert("Invalid parameter, excessiveblock must be larger than %d" % LEGACY_MAX_BLOCK_SIZE
                       in e.error['message'])
        else:
            raise AssertionError("Must not accept excessiveblock values <= %d bytes" % LEGACY_MAX_BLOCK_SIZE)
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, LEGACY_MAX_BLOCK_SIZE + 1)

        # Check setting to 2MB
        self.nodes[0].setexcessiveblock(2 * ONE_MEGABYTE)
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, 2 * ONE_MEGABYTE)
        # Check for EB correctness in the subver string
        self.check_subversion("/Bitcoin ABC:.*\(EB2\.0\)/")

        # Check setting to 13MB
        self.nodes[0].setexcessiveblock(13 * ONE_MEGABYTE)
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, 13 * ONE_MEGABYTE)
        # Check for EB correctness in the subver string
        self.check_subversion("/Bitcoin ABC:.*\(EB13\.0\)/")

        # Check setting to 13.14MB
        self.nodes[0].setexcessiveblock(13140000)
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize['excessiveBlockSize']
        assert_equal(ebs, 13.14 * ONE_MEGABYTE)
        # check for EB correctness in the subver string
        self.check_subversion("/Bitcoin ABC:.*\(EB13\.1\)/")

    def test_uahfstarttime(self):
        node = self.nodes[0]
        def check_uahf_starttime_equals(val):
            starttime_reply = node.getuahfstarttime()
            assert_equal(starttime_reply['uahfStartTime'], val)

        # Check that we start with UAHF_START_TIME
        check_uahf_starttime_equals(UAHF_START_TIME)

        # Check that setting <= 2 hours from chain tip MTP is not allowed
        self.tip = node.getblock(node.getbestblockhash())
        tip_mtp = self.tip['mediantime']
        assert(tip_mtp < UAHF_START_TIME - 7201)
        for offset_secs in (-1, 0, 1, 7200):
            try:
                node.setuahfstarttime(tip_mtp + offset_secs)
            except JSONRPCException as e:
                assert("Invalid parameter, uahfStartTime must be greater than chain tip "
                       "MTP+2hrs (%d)" % (tip_mtp + 7200) in e.error['message'])
            else:
                raise AssertionError("Must not accept uahfStartTime values within 2 hrs of chain tip MTP")
            check_uahf_starttime_equals(UAHF_START_TIME)

        # Check that setting to > tip MTP + 2hrs is ok
        node.setuahfstarttime(tip_mtp + 7200 + 1)
        check_uahf_starttime_equals(tip_mtp + 7200 + 1)

        # Activate UAHF to check that updating is no longer allowed
        node.setuahfstarttime(UAHF_START_TIME)
        check_uahf_starttime_equals(UAHF_START_TIME)

        # Add a block at UAHF start time to activate the fork
        # Since we are right on top of genesis block, it only takes one
        # block with the start time to get chain MTP to activation.
        node.generate(1)
        self.tip = node.getblock(node.getbestblockhash())
        tip_size = self.tip['size']
        # Still only waiting for the fork block at this stage.
        assert(tip_size <= LEGACY_MAX_BLOCK_SIZE)

        # Check that we are no longer allowed to update start time.
        def check_cannot_update_starttime():
            '''
            Check that setting > 2 hours from chain tip MTP is no longer allowed
            '''
            try:
                node.setuahfstarttime(tip_mtp + 7200 + 1)
            except JSONRPCException as e:
                assert("UAHF already activated - disallowing start time modification"
                       in e.error['message'])
            else:
                raise AssertionError("Must not accept uahfStartTime modification once UAHF is activated.")
            check_uahf_starttime_equals(UAHF_START_TIME)

        check_cannot_update_starttime()

        # Create the >1MB fork block
        node.generate(1)
        self.tip = node.getblock(node.getbestblockhash())
        tip_size = self.tip['size']
        assert(tip_size > LEGACY_MAX_BLOCK_SIZE)
        # Not allowed to update anymore.
        check_cannot_update_starttime()

    def run_test(self):
        self.test_excessiveblock()
        self.test_uahfstarttime()


if __name__ == '__main__':
    ABC_RPC_Test().main ()
