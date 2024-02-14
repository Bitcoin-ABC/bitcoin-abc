# Copyright (c) 2017 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Exercise the command line functions specific to ABC functionality.
Currently:

-excessiveblocksize=<blocksize_in_bytes>
"""

import re
import time

from test_framework.cdefs import LEGACY_MAX_BLOCK_SIZE
from test_framework.messages import msg_getaddr
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_greater_than

MAX_GENERATED_BLOCK_SIZE_ERROR = (
    "Max generated block size (blockmaxsize) cannot exceed the excessive block size"
    " (excessiveblocksize)"
)

MAX_PCT_ADDR_TO_SEND = 23


class AddrCounter(P2PInterface):
    def __init__(self):
        super().__init__()
        self.addr_count = 0

    def on_addr(self, message):
        self.addr_count = len(message.addrs)

    def addr_received(self):
        return self.addr_count > 0


class ABC_CmdLine_Test(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1

    def maxaddrtosend_test(self, max_addr_to_send):
        node = self.nodes[0]
        self.restart_node(0, extra_args=[f"-maxaddrtosend={max_addr_to_send}"])

        self.log.info(f"Testing -maxaddrtosend={max_addr_to_send}")

        # Fill addrman with enough entries
        for i in range(10000):
            addr = f"{(i >> 8) % 256}.{i % 256}.1.1"
            node.addpeeraddress(addr, 8333)

        assert_greater_than(
            len(node.getnodeaddresses(0)),
            int(max_addr_to_send / (MAX_PCT_ADDR_TO_SEND / 100)),
        )

        mock_time = int(time.time())

        peer = node.add_p2p_connection(AddrCounter())
        peer.send_message(msg_getaddr())

        mock_time += 5 * 60
        node.setmocktime(mock_time)

        peer.wait_until(peer.addr_received)
        assert_equal(peer.addr_count, max_addr_to_send)

    def check_excessive(self, expected_value):
        """Check that the excessiveBlockSize is as expected"""
        getsize = self.nodes[0].getexcessiveblock()
        ebs = getsize["excessiveBlockSize"]
        assert_equal(ebs, expected_value)

    def check_subversion(self, pattern_str):
        """Check that the subversion is set as expected"""
        netinfo = self.nodes[0].getnetworkinfo()
        subversion = netinfo["subversion"]
        pattern = re.compile(pattern_str)
        assert pattern.match(subversion)

    def excessiveblocksize_test(self):
        self.log.info("Testing -excessiveblocksize")

        self.log.info(
            f"  Set to twice the default, i.e. {2 * LEGACY_MAX_BLOCK_SIZE} bytes"
        )
        self.stop_node(0)
        self.start_node(0, [f"-excessiveblocksize={2 * LEGACY_MAX_BLOCK_SIZE}"])
        self.check_excessive(2 * LEGACY_MAX_BLOCK_SIZE)
        # Check for EB correctness in the subver string
        self.check_subversion(r"/Bitcoin ABC:.*\(EB2\.0; .*\)/")

        self.log.info(
            "  Attempt to set below legacy limit of 1MB - try "
            f"{LEGACY_MAX_BLOCK_SIZE} bytes"
        )
        self.stop_node(0)
        self.nodes[0].assert_start_raises_init_error(
            [f"-excessiveblocksize={LEGACY_MAX_BLOCK_SIZE}"],
            "Error: Excessive block size must be > 1,000,000 bytes (1MB)",
        )
        self.nodes[0].assert_start_raises_init_error(
            ["-excessiveblocksize=0"],
            "Error: Excessive block size must be > 1,000,000 bytes (1MB)",
        )
        self.nodes[0].assert_start_raises_init_error(
            ["-excessiveblocksize=-1"],
            "Error: Excessive block size must be > 1,000,000 bytes (1MB)",
        )
        self.log.info("  Attempt to set below blockmaxsize (mining limit)")
        self.nodes[0].assert_start_raises_init_error(
            ["-blockmaxsize=1500000", "-excessiveblocksize=1300000"],
            f"Error: {MAX_GENERATED_BLOCK_SIZE_ERROR}",
        )
        self.nodes[0].assert_start_raises_init_error(
            ["-blockmaxsize=0"],
            "Error: Max generated block size must be greater than 0",
        )
        self.nodes[0].assert_start_raises_init_error(
            ["-blockmaxsize=-1"],
            "Error: Max generated block size must be greater than 0",
        )

        # Make sure we leave the test with a node running as this is what thee
        # framework expects.
        self.start_node(0, [])

    def run_test(self):
        # Run tests on -maxaddrtosend option
        for max_addr_to_send in [10, 100, 1000]:
            self.maxaddrtosend_test(max_addr_to_send)

        # Run tests on -excessiveblocksize option
        self.excessiveblocksize_test()


if __name__ == "__main__":
    ABC_CmdLine_Test().main()
