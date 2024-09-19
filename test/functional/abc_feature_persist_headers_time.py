# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test dumping/loading the headers receive time to/from file."""
import time

from test_framework.messages import uint256_from_compact
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_greater_than


class PersistHeadersTimeTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [
            [
                "-enablertt=1",
                "-persistrecentheaderstime=1",
            ]
        ]

    def run_test(self):
        node = self.nodes[0]
        now = int(time.time())

        node.add_p2p_connection(P2PInterface())
        node.setmocktime(now)

        # RTT should kick in after this block
        # Note that we don't have any finalized block, so the block parking
        # policy is not triggered and the blocks are still connected.
        tip = self.generate(node, 17)[-1]

        self.log.info("Check we have a low RTT after mining 17 blocks in a row")

        gbt = node.getblocktemplate()
        assert_equal(gbt["previousblockhash"], tip)
        assert "rtt" in gbt
        for t in gbt["rtt"]["prevheadertime"]:
            assert_greater_than(t, 0)
        # RTT is lower than DAA
        assert_greater_than(
            int(gbt["target"], 16),
            uint256_from_compact(int(gbt["rtt"]["nexttarget"], 16)),
        )

        self.log.info(
            "After a restart with -persistrecentheaderstime=1 the headers are read back from the file and the RTT is computed"
        )

        self.restart_node(0)

        node.add_p2p_connection(P2PInterface())
        node.setmocktime(now)

        gbt_restart = node.getblocktemplate()
        assert_equal(gbt_restart["previousblockhash"], tip)
        assert "rtt" in gbt_restart
        assert_equal(gbt_restart["rtt"]["prevheadertime"], gbt["rtt"]["prevheadertime"])
        assert_equal(gbt_restart["rtt"]["nexttarget"], gbt["rtt"]["nexttarget"])

        self.log.info(
            "After a restart with -persistrecentheaderstime=0 the headers time are lost and the RTT is equal to DAA"
        )

        self.restart_node(
            0,
            extra_args=[
                "-enablertt=1",
                "-persistrecentheaderstime=0",
            ],
        )

        node.add_p2p_connection(P2PInterface())
        node.setmocktime(now)

        gbt_nopersist = node.getblocktemplate()
        assert_equal(gbt_nopersist["previousblockhash"], tip)
        assert "rtt" in gbt_nopersist
        for t in gbt_nopersist["rtt"]["prevheadertime"]:
            assert_equal(t, 0)
        # RTT is equal to DAA
        assert_equal(
            int(gbt["target"], 16),
            uint256_from_compact(int(gbt_nopersist["rtt"]["nexttarget"], 16)),
        )


if __name__ == "__main__":
    PersistHeadersTimeTest().main()
