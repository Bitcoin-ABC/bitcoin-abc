# Copyright (c) 2020 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test blockfilterindex in conjunction with prune."""
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_raises_rpc_error,
)


class FeatureBlockfilterindexPruneTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-fastprune", "-prune=1", "-blockfilterindex=1"]]
        # Mining 1000 blocks sometimes causes a timeout for the generatetoaddress RPC
        self.rpc_timeout = 120

    def sync_index(self, height):
        expected = {
            "basic block filter index": {"synced": True, "best_block_height": height}
        }
        self.wait_until(lambda: self.nodes[0].getindexinfo() == expected)

    def run_test(self):
        node = self.nodes[0]

        self.log.info(
            "check if we can access a blockfilter when pruning is "
            "enabled but no blocks are actually pruned"
        )
        self.sync_index(200)
        assert_greater_than(
            len(node.getblockfilter(node.getbestblockhash())["filter"]), 0
        )
        self.generate(node, 500)
        self.sync_index(height=700)

        self.log.info("prune some blocks")
        pruneheight = node.pruneblockchain(400)
        # The prune heights used here and below are magic numbers that are
        # determined by the thresholds at which block files wrap, so they depend
        # on disk serialization and default block file size.
        # The difference in number of blocks per block file between Bitcoin ABC
        # and Bitcoin Core is caused by additional witness data in coinbase
        # transactions for core.
        assert_equal(pruneheight, 346)

        self.log.info(
            "check if we can access the tips blockfilter when we have"
            " pruned some blocks"
        )
        assert_greater_than(
            len(node.getblockfilter(node.getbestblockhash())["filter"]), 0
        )

        self.log.info("check if we can access the blockfilter of a pruned block")
        assert_greater_than(len(node.getblockfilter(node.getblockhash(2))["filter"]), 0)

        # mine and sync index up to a height that will later be the pruneheight
        self.generate(node, 338)
        # Backport note: 3 blk?????.dat file with 346 blocks each makes 1038.
        self.sync_index(height=1038)

        self.log.info("start node without blockfilterindex")
        self.restart_node(0, extra_args=["-fastprune", "-prune=1"])

        self.log.info("make sure accessing the blockfilters throws an error")
        assert_raises_rpc_error(
            -1,
            "Index is not enabled for filtertype basic",
            node.getblockfilter,
            node.getblockhash(2),
        )
        self.generate(node, 462)

        self.log.info(
            "prune exactly up to the blockfilterindexes best block "
            "while blockfilters are disabled"
        )
        pruneheight_2 = self.nodes[0].pruneblockchain(1040)
        assert_equal(pruneheight_2, 1038)
        self.restart_node(
            0, extra_args=["-fastprune", "-prune=1", "-blockfilterindex=1"]
        )
        self.log.info(
            "make sure that we can continue with the partially synced"
            " index after having pruned up to the index height"
        )
        self.sync_index(height=1500)

        self.log.info(
            "prune below the blockfilterindexes best block while "
            "blockfilters are disabled"
        )
        self.restart_node(0, extra_args=["-fastprune", "-prune=1"])
        self.generate(node, 1000)
        pruneheight_3 = self.nodes[0].pruneblockchain(2000)
        assert_greater_than(pruneheight_3, pruneheight_2)
        self.stop_node(0)

        self.log.info(
            "make sure we get an init error when starting the node "
            "again with block filters"
        )
        self.nodes[0].assert_start_raises_init_error(
            extra_args=["-fastprune", "-prune=1", "-blockfilterindex=1"],
            expected_msg=(
                "Error: basic block filter index best block of the index goes beyond"
                " pruned data. Please disable the index or reindex (which will download"
                " the whole blockchain again)"
            ),
        )

        self.log.info("make sure the node starts again with the -reindex arg")
        self.start_node(
            0, extra_args=["-fastprune", "-prune=1", "-blockfilterindex", "-reindex"]
        )


if __name__ == "__main__":
    FeatureBlockfilterindexPruneTest().main()
