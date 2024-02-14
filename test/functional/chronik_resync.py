# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

import os
import shutil

from test_framework.address import ADDRESS_ECREG_P2SH_OP_TRUE, ADDRESS_ECREG_UNSPENDABLE
from test_framework.blocktools import GENESIS_BLOCK_HASH
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, get_datadir_path


class ChronikResyncTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        # Mine 100 blocks, that Chronik doesn't index
        block_hashes = [GENESIS_BLOCK_HASH] + self.generatetoaddress(
            node, 100, ADDRESS_ECREG_P2SH_OP_TRUE
        )

        # Restart with Chronik: syncs blocks from genesis
        with node.assert_debug_log(
            [
                f"Chronik database empty, syncing to block {block_hashes[100]} "
                + "at height 100.",
            ]
        ):
            self.restart_node(0, ["-chronik"])

        for i in range(0, 101):
            proto_block = chronik.block(i).ok()
            assert_equal(proto_block.block_info.hash[::-1].hex(), block_hashes[i])

        chronik.block(101).err(404)

        self.restart_node(0, [])

        # Without Chronik: Undo last 50 blocks, then add 100 new ones
        node.invalidateblock(block_hashes[50])
        chronik_hash = block_hashes[100]
        del block_hashes[50:]
        block_hashes += self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        # Restart with Chronik: Undoes last 50 blocks, then adds node's next 100
        with node.assert_debug_log(
            [
                f"Node and Chronik diverged, node is on block {block_hashes[149]} "
                + f"at height 149, and Chronik is on block {chronik_hash} at height"
                " 100.",
                f"The last common block is {block_hashes[49]} at height 49.",
                "Reverting Chronik blocks 50 to 100",
            ]
        ):
            self.restart_node(0, ["-chronik"])

        for i in range(0, 150):
            proto_block = chronik.block(i).ok()
            assert_equal(proto_block.block_info.hash[::-1].hex(), block_hashes[i])

        chronik.block(150).err(404)

        # Reset node blockchain back to genesis
        # Leave Chronik untouched
        node.stop_node()
        datadir = get_datadir_path(self.options.tmpdir, 0)
        shutil.rmtree(os.path.join(datadir, self.chain, "blocks"))
        shutil.rmtree(os.path.join(datadir, self.chain, "chainstate"))

        # Chronik cannot sync because the node doesn't have the old blocks anymore
        # It needs the node's block data to undo the stale blocks.
        init_error_msg = (
            f"Error: Cannot rewind Chronik, it contains block {block_hashes[149]} "
            + "that the node doesn't have. You may need to use -reindex/"
            + "-chronikreindex, or delete indexes/chronik and restart"
        )
        node.assert_start_raises_init_error(["-chronik"], init_error_msg)

        # Reindexing results in the same error (different code path)
        self.restart_node(0, ["-reindex"])
        assert_equal(node.getbestblockhash(), GENESIS_BLOCK_HASH)

        node.stop_node()
        node.assert_start_raises_init_error(["-chronik"], init_error_msg)

        # Reindexing with -chronik now works, as it wipes the Chronik data
        with node.assert_debug_log(["Wiping Chronik at "]):
            self.restart_node(0, ["-chronik", "-reindex"])
        chronik.block(0).ok()
        chronik.block(1).err(404)

        # Generate 100 blocks without chronik
        self.restart_node(0, [])
        self.generatetoaddress(node, 100, ADDRESS_ECREG_P2SH_OP_TRUE)

        # Reindexing indexes 100 blocks
        self.restart_node(0, ["-chronik", "-reindex"])
        chronik.block(100).ok()

        # Test -chronikreindex
        with node.assert_debug_log(["Wiping Chronik at "]):
            self.restart_node(0, ["-chronik", "-chronikreindex"])
        chronik.block(0).ok()
        chronik.block(100).ok()
        chronik.block(101).err(404)

        # Simply restarting the node fully synced doesn't log any divergence
        with node.assert_debug_log(
            ["Chronik completed re-syncing with the node"],
            unexpected_msgs=["Node and Chronik diverged"],
        ):
            self.restart_node(0, ["-chronik"])


if __name__ == "__main__":
    ChronikResyncTest().main()
