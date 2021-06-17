#!/usr/bin/env python3
# Copyright (c) 2021-present The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test for assumeutxo, a means of quickly bootstrapping a node using
a serialized version of the UTXO set at a certain height, which corresponds
to a hash that has been compiled into bitcoind.

The assumeutxo value generated and used here is committed to in
`CRegTestParams::m_assumeutxo_data` in `src/chainparams.cpp`.

## Possible test improvements

- TODO: test what happens with -reindex and -reindex-chainstate before the
      snapshot is validated, and make sure it's deleted successfully.

Interesting test cases could be loading an assumeutxo snapshot file with:

- TODO: Valid hash but invalid snapshot file (bad coin height or
      bad other serialization)
- TODO: Valid snapshot file, but referencing a snapshot block that turns out to be
      invalid, or has an invalid parent
- TODO: Valid snapshot file and snapshot block, but the block is not on the
      most-work chain

Interesting starting states could be loading a snapshot when the current chain tip is:

- TODO: An ancestor of snapshot block
- TODO: Not an ancestor of the snapshot block but has less work
- TODO: The snapshot block
- TODO: A descendant of the snapshot block
- TODO: Not an ancestor or a descendant of the snapshot block and has more work

"""
from test_framework.messages import CTransaction, FromHex
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error
from test_framework.wallet import getnewdestination

START_HEIGHT = 199
SNAPSHOT_BASE_HEIGHT = 299
FINAL_HEIGHT = 399
COMPLETE_IDX = {"synced": True, "best_block_height": FINAL_HEIGHT}


class AssumeutxoTest(BitcoinTestFramework):

    def set_test_params(self):
        """Use the pregenerated, deterministic chain up to height 199."""
        self.num_nodes = 3
        self.rpc_timeout = 120
        self.extra_args = [
            [],
            ["-fastprune", "-prune=1", "-blockfilterindex=1", "-coinstatsindex=1"],
            ["-txindex=1", "-blockfilterindex=1", "-coinstatsindex=1"],
        ]

    def setup_network(self):
        """Start with the nodes disconnected so that one can generate a snapshot
        including blocks the other hasn't yet seen."""
        self.add_nodes(3)
        self.start_nodes(extra_args=self.extra_args)

    def test_invalid_snapshot_scenarios(self, valid_snapshot_path):
        self.log.info("Test different scenarios of loading invalid snapshot files")
        with open(valid_snapshot_path, "rb") as f:
            valid_snapshot_contents = f.read()
        bad_snapshot_path = valid_snapshot_path + ".mod"

        def expected_error(log_msg="", rpc_details=""):
            with self.nodes[1].assert_debug_log([log_msg]):
                assert_raises_rpc_error(
                    -32603,
                    f"Unable to load UTXO snapshot{rpc_details}",
                    self.nodes[1].loadtxoutset,
                    bad_snapshot_path,
                )

        self.log.info(
            "  - snapshot file refering to a block that is not in the assumeutxo parameters"
        )
        prev_block_hash = self.nodes[0].getblockhash(SNAPSHOT_BASE_HEIGHT - 1)
        # Represents any unknown block hash
        bogus_block_hash = "0" * 64
        for bad_block_hash in [bogus_block_hash, prev_block_hash]:
            with open(bad_snapshot_path, "wb") as f:
                # block hash of the snapshot base is stored right at the start (first 32 bytes)
                f.write(
                    bytes.fromhex(bad_block_hash)[::-1] + valid_snapshot_contents[32:]
                )
            error_details = f", assumeutxo block hash in snapshot metadata not recognized ({bad_block_hash})"
            expected_error(rpc_details=error_details)

        self.log.info("  - snapshot file with wrong number of coins")
        valid_num_coins = int.from_bytes(valid_snapshot_contents[32 : 32 + 8], "little")
        for off in [-1, +1]:
            with open(bad_snapshot_path, "wb") as f:
                f.write(valid_snapshot_contents[:32])
                f.write((valid_num_coins + off).to_bytes(8, "little"))
                f.write(valid_snapshot_contents[32 + 8 :])
            expected_error(
                log_msg=(
                    "bad snapshot - coins left over after deserializing 298 coins"
                    if off == -1
                    else "bad snapshot format or truncated snapshot after deserializing 299 coins"
                )
            )

        self.log.info("  - snapshot file with alternated UTXO data")
        cases = [
            # wrong outpoint hash
            [
                b"\xff" * 32,
                0,
                "7070f482d79786f4cd3aa5dc6490d9ef599a4a110e00103bf1ac5770e7d7de1a",
            ],
            # wrong outpoint index
            [
                (1).to_bytes(4, "little"),
                32,
                "e5bff0b5f6758d90cff6a56f060d605a5f8ac02d804cbd23adb0fc0834bcfac3",
            ],
            # wrong coin code VARINT((coinbase ? 1 : 0) | (height << 1))
            [
                b"\x81",
                36,
                "d631a0dbf1bba8536d1dd7aba0881a0ad83bdb4a8502f53fec8b89c549659633",
            ],
            # another wrong coin code
            [
                b"\x83",
                36,
                "a288fcbbe1da8d04ad92d8d565ddaf3221c76ea0b8afb1bd58334477e9351a68",
            ],
        ]

        for content, offset, wrong_hash in cases:
            with open(bad_snapshot_path, "wb") as f:
                f.write(valid_snapshot_contents[: (32 + 8 + offset)])
                f.write(content)
                f.write(valid_snapshot_contents[(32 + 8 + offset + len(content)) :])
            expected_error(
                log_msg=f"[snapshot] bad snapshot content hash: expected 5e2a15df4f3bca0253b969a9759de891ed51230bba5f35eec5417833059a11bf, got {wrong_hash}"
            )

    def run_test(self):
        """
        Bring up two (disconnected) nodes, mine some new blocks on the first,
        and generate a UTXO snapshot.

        Load the snapshot into the second, ensure it syncs to tip and completes
        background validation when connected to the first.
        """
        n0 = self.nodes[0]
        n1 = self.nodes[1]
        n2 = self.nodes[2]

        # Mock time for a deterministic chain
        for n in self.nodes:
            n.setmocktime(n.getblockheader(n.getbestblockhash())["time"])

        self.sync_blocks()

        # Generate a series of blocks that `n0` will have in the snapshot,
        # but that n1 doesn't yet see. In order for the snapshot to activate,
        # though, we have to ferry over the new headers to n1 so that it
        # isn't waiting forever to see the header of the snapshot's base block
        # while disconnected from n0.
        for i in range(100):
            self.generate(n0, nblocks=1, sync_fun=self.no_op)
            newblock = n0.getblock(n0.getbestblockhash(), 0)

            # make n1 aware of the new header, but don't give it the block.
            n1.submitheader(newblock)
            n2.submitheader(newblock)

        # Ensure everyone is seeing the same headers.
        for n in self.nodes:
            assert_equal(n.getblockchaininfo()["headers"], SNAPSHOT_BASE_HEIGHT)

        self.log.info("-- Testing assumeutxo + some indexes + pruning")

        assert_equal(n0.getblockcount(), SNAPSHOT_BASE_HEIGHT)
        assert_equal(n1.getblockcount(), START_HEIGHT)

        self.log.info(f"Creating a UTXO snapshot at height {SNAPSHOT_BASE_HEIGHT}")
        dump_output = n0.dumptxoutset("utxos.dat")

        assert_equal(
            dump_output["txoutset_hash"],
            "5e2a15df4f3bca0253b969a9759de891ed51230bba5f35eec5417833059a11bf",
        )
        assert_equal(dump_output["nchaintx"], 300)
        assert_equal(n0.getblockchaininfo()["blocks"], SNAPSHOT_BASE_HEIGHT)

        # Mine more blocks on top of the snapshot that n1 hasn't yet seen. This
        # will allow us to test n1's sync-to-tip on top of a snapshot.
        self.generate(n0, nblocks=100, sync_fun=self.no_op)

        assert_equal(n0.getblockcount(), FINAL_HEIGHT)
        assert_equal(n1.getblockcount(), START_HEIGHT)

        assert_equal(n0.getblockchaininfo()["blocks"], FINAL_HEIGHT)

        self.test_invalid_snapshot_scenarios(dump_output["path"])

        self.log.info(f"Loading snapshot into second node from {dump_output['path']}")
        loaded = n1.loadtxoutset(dump_output["path"])
        assert_equal(loaded["coins_loaded"], SNAPSHOT_BASE_HEIGHT)
        assert_equal(loaded["base_height"], SNAPSHOT_BASE_HEIGHT)

        normal, snapshot = n1.getchainstates()["chainstates"]
        assert_equal(normal["blocks"], START_HEIGHT)
        assert_equal(normal.get("snapshot_blockhash"), None)
        assert_equal(normal["validated"], True)
        assert_equal(snapshot["blocks"], SNAPSHOT_BASE_HEIGHT)
        assert_equal(snapshot["snapshot_blockhash"], dump_output["base_hash"])
        assert_equal(snapshot["validated"], False)

        assert_equal(n1.getblockchaininfo()["blocks"], SNAPSHOT_BASE_HEIGHT)

        self.log.info(
            "Submit a spending transaction for a snapshot chainstate coin to the mempool"
        )
        # spend the coinbase output of the first block that is not available on node1
        spend_coin_blockhash = n1.getblockhash(START_HEIGHT + 1)
        assert_raises_rpc_error(
            -1, "Block not found on disk", n1.getblock, spend_coin_blockhash
        )
        prev_tx = n0.getblock(spend_coin_blockhash, 3)["tx"][0]
        prevout = {
            "txid": prev_tx["txid"],
            "vout": 0,
            "scriptPubKey": prev_tx["vout"][0]["scriptPubKey"]["hex"],
            "amount": prev_tx["vout"][0]["value"],
        }
        privkey = n0.get_deterministic_priv_key().key
        raw_tx = n1.createrawtransaction(
            [prevout], {getnewdestination()[2]: 24_990_000}
        )
        signed_tx = n1.signrawtransactionwithkey(raw_tx, [privkey], [prevout])["hex"]
        signed_txid = FromHex(CTransaction(), signed_tx).rehash()

        assert n1.gettxout(prev_tx["txid"], 0) is not None
        n1.sendrawtransaction(signed_tx)
        assert signed_txid in n1.getrawmempool()
        assert not n1.gettxout(prev_tx["txid"], 0)

        PAUSE_HEIGHT = FINAL_HEIGHT - 40

        self.log.info("Restarting node to stop at height %d", PAUSE_HEIGHT)
        self.restart_node(
            1, extra_args=[f"-stopatheight={PAUSE_HEIGHT}", *self.extra_args[1]]
        )

        # Finally connect the nodes and let them sync.
        #
        # Set `wait_for_connect=False` to avoid a race between performing connection
        # assertions and the -stopatheight tripping.
        self.connect_nodes(0, 1, wait_for_connect=False)

        n1.wait_until_stopped(timeout=5)

        self.log.info("Checking that blocks are segmented on disk")
        assert self.has_blockfile(n1, "00000"), "normal blockfile missing"
        assert self.has_blockfile(n1, "00001"), "assumed blockfile missing"
        assert not self.has_blockfile(n1, "00002"), "too many blockfiles"

        self.log.info(
            "Restarted node before snapshot validation completed, reloading..."
        )
        self.restart_node(1, extra_args=self.extra_args[1])
        self.connect_nodes(0, 1)

        self.log.info(f"Ensuring snapshot chain syncs to tip. ({FINAL_HEIGHT})")
        self.wait_until(
            lambda: n1.getchainstates()["chainstates"][-1]["blocks"] == FINAL_HEIGHT
        )
        self.sync_blocks(nodes=(n0, n1))

        self.log.info("Ensuring background validation completes")
        self.wait_until(lambda: len(n1.getchainstates()["chainstates"]) == 1)

        # Ensure indexes have synced.
        completed_idx_state = {
            "basic block filter index": COMPLETE_IDX,
            "coinstatsindex": COMPLETE_IDX,
        }
        self.wait_until(lambda: n1.getindexinfo() == completed_idx_state)

        for i in (0, 1):
            n = self.nodes[i]
            self.log.info(
                f"Restarting node {i} to ensure (Check|Load)BlockIndex passes"
            )
            self.restart_node(i, extra_args=self.extra_args[i])

            assert_equal(n.getblockchaininfo()["blocks"], FINAL_HEIGHT)

            (chainstate,) = n.getchainstates()["chainstates"]
            assert_equal(chainstate["blocks"], FINAL_HEIGHT)

            if i != 0:
                # Ensure indexes have synced for the assumeutxo node
                self.wait_until(lambda: n.getindexinfo() == completed_idx_state)

        # Node 2: all indexes + reindex
        # -----------------------------

        self.log.info("-- Testing all indexes + reindex")
        assert_equal(n2.getblockcount(), START_HEIGHT)

        self.log.info(f"Loading snapshot into third node from {dump_output['path']}")
        loaded = n2.loadtxoutset(dump_output["path"])
        assert_equal(loaded["coins_loaded"], SNAPSHOT_BASE_HEIGHT)
        assert_equal(loaded["base_height"], SNAPSHOT_BASE_HEIGHT)

        normal, snapshot = n2.getchainstates()["chainstates"]
        assert_equal(normal["blocks"], START_HEIGHT)
        assert_equal(normal.get("snapshot_blockhash"), None)
        assert_equal(normal["validated"], True)
        assert_equal(snapshot["blocks"], SNAPSHOT_BASE_HEIGHT)
        assert_equal(snapshot["snapshot_blockhash"], dump_output["base_hash"])
        assert_equal(snapshot["validated"], False)

        self.connect_nodes(0, 2)
        self.wait_until(
            lambda: n2.getchainstates()["chainstates"][-1]["blocks"] == FINAL_HEIGHT
        )
        self.sync_blocks()

        self.log.info("Ensuring background validation completes")
        self.wait_until(lambda: len(n2.getchainstates()["chainstates"]) == 1)

        completed_idx_state = {
            "basic block filter index": COMPLETE_IDX,
            "coinstatsindex": COMPLETE_IDX,
            "txindex": COMPLETE_IDX,
        }
        self.wait_until(lambda: n2.getindexinfo() == completed_idx_state)

        for i in (0, 2):
            n = self.nodes[i]
            self.log.info(
                f"Restarting node {i} to ensure (Check|Load)BlockIndex passes"
            )
            self.restart_node(i, extra_args=self.extra_args[i])

            assert_equal(n.getblockchaininfo()["blocks"], FINAL_HEIGHT)

            (chainstate,) = n.getchainstates()["chainstates"]
            assert_equal(chainstate["blocks"], FINAL_HEIGHT)

            if i != 0:
                # Ensure indexes have synced for the assumeutxo node
                self.wait_until(lambda: n.getindexinfo() == completed_idx_state)

        self.log.info("Test -reindex-chainstate of an assumeutxo-synced node")
        self.restart_node(2, extra_args=["-reindex-chainstate=1", *self.extra_args[2]])
        assert_equal(n2.getblockchaininfo()["blocks"], FINAL_HEIGHT)
        self.wait_until(lambda: n2.getblockcount() == FINAL_HEIGHT)

        self.log.info("Test -reindex of an assumeutxo-synced node")
        self.restart_node(2, extra_args=["-reindex=1", *self.extra_args[2]])
        self.connect_nodes(0, 2)
        self.wait_until(lambda: n2.getblockcount() == FINAL_HEIGHT)


if __name__ == "__main__":
    AssumeutxoTest().main()
