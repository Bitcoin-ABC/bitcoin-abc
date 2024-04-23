# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the parkblock and unparkblock RPC calls."""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ParkedChainTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [
            [
                "-noparkdeepreorg",
                "-noautomaticunparking",
                "-whitelist=noban@127.0.0.1",
            ],
            [
                "-automaticunparking=1",
            ],
        ]

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    # There should only be one chaintip, which is expected_tip
    def only_valid_tip(self, expected_tip, other_tip_status=None):
        node = self.nodes[0]
        assert_equal(node.getbestblockhash(), expected_tip)
        for tip in node.getchaintips():
            if tip["hash"] == expected_tip:
                assert_equal(tip["status"], "active")
            else:
                assert_equal(tip["status"], other_tip_status)

    def run_test(self):
        def wait_for_tip(node, tip):
            def check_tip():
                return node.getbestblockhash() == tip

            self.wait_until(check_tip)

        node = self.nodes[0]
        parking_node = self.nodes[1]

        self.log.info("Test chain parking...")
        self.generate(node, 10, sync_fun=self.no_op)
        tip = node.getbestblockhash()
        self.generate(node, 1, sync_fun=self.no_op)
        block_to_park = node.getbestblockhash()
        self.generate(node, 10)
        parked_tip = node.getbestblockhash()
        parked_height = node.getblockcount()

        # Let's park the chain.
        assert parked_tip != tip
        assert block_to_park != tip
        assert block_to_park != parked_tip
        with node.assert_debug_log(
            [
                "Warning: Large fork found",
                f"lasting to height {parked_height} ({parked_tip})",
            ]
        ):
            node.parkblock(block_to_park)
        assert_equal(node.getbestblockhash(), tip)

        # When the chain is unparked, the node reorg into its original chain.
        node.unparkblock(parked_tip)
        assert_equal(node.getbestblockhash(), parked_tip)

        # The "Warning: Large fork found" is no longer printed on new blocks
        with node.assert_debug_log(
            expected_msgs=["UpdateTip: new best=", f" height={parked_height + 1}"],
            unexpected_msgs=["Warning: Large fork found"],
        ):
            self.generate(node, 1)

        # Parking and then unparking a block should not change its validity,
        # and invaliding and reconsidering a block should not change its
        # parked state.  See the following test cases:
        self.log.info("Test invalidate, park, unpark, reconsider...")
        self.generate(node, 1, sync_fun=self.no_op)
        tip = node.getbestblockhash()
        self.generate(node, 1, sync_fun=self.no_op)
        bad_tip = node.getbestblockhash()
        # Generate an extra block to check that children are invalidated as
        # expected and do not produce dangling chaintips
        self.generate(node, 1)
        good_tip = node.getbestblockhash()

        node.invalidateblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.parkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.unparkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.reconsiderblock(bad_tip)
        self.only_valid_tip(good_tip)

        self.log.info("Test park, invalidate, reconsider, unpark")
        self.generate(node, 1, sync_fun=self.no_op)
        tip = node.getbestblockhash()
        self.generate(node, 1, sync_fun=self.no_op)
        bad_tip = node.getbestblockhash()
        self.generate(node, 1)
        good_tip = node.getbestblockhash()

        node.parkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="parked")
        node.invalidateblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.reconsiderblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="parked")
        node.unparkblock(bad_tip)
        self.only_valid_tip(good_tip)

        self.log.info("Test invalidate, park, reconsider, unpark...")
        self.generate(node, 1, sync_fun=self.no_op)
        tip = node.getbestblockhash()
        self.generate(node, 1, sync_fun=self.no_op)
        bad_tip = node.getbestblockhash()
        self.generate(node, 1)
        good_tip = node.getbestblockhash()

        node.invalidateblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.parkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.reconsiderblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="parked")
        node.unparkblock(bad_tip)
        self.only_valid_tip(good_tip)

        self.log.info("Test park, invalidate, unpark, reconsider")
        self.generate(node, 1, sync_fun=self.no_op)
        tip = node.getbestblockhash()
        self.generate(node, 1, sync_fun=self.no_op)
        bad_tip = node.getbestblockhash()
        self.generate(node, 1)
        good_tip = node.getbestblockhash()

        node.parkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="parked")
        node.invalidateblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.unparkblock(bad_tip)
        self.only_valid_tip(tip, other_tip_status="invalid")
        node.reconsiderblock(bad_tip)
        self.only_valid_tip(good_tip)

        # To get ready for next testset, make sure both nodes are in sync.
        wait_for_tip(parking_node, good_tip)
        assert_equal(node.getbestblockhash(), parking_node.getbestblockhash())

        # Wait for node 1 to park the chain.
        def wait_for_parked_block(block):
            def check_block():
                for tip in parking_node.getchaintips():
                    if tip["hash"] == block:
                        assert tip["status"] != "active"
                        return tip["status"] == "parked"
                return False

            self.wait_until(check_block)

        def check_reorg_protection(depth, extra_blocks):
            self.log.info(f"Test deep reorg parking, {depth} block deep")

            # Invalidate the tip on node 0, so it doesn't follow node 1.
            node.invalidateblock(node.getbestblockhash())
            # Mine block to create a fork of proper depth
            self.generatetoaddress(
                parking_node,
                nblocks=depth - 1,
                address=parking_node.getnewaddress(label="coinbase"),
                sync_fun=self.no_op,
            )
            self.generatetoaddress(
                node,
                nblocks=depth,
                address=node.getnewaddress(label="coinbase"),
                sync_fun=self.no_op,
            )
            # extra block should now find themselves parked
            for _ in range(extra_blocks):
                self.generate(node, 1, sync_fun=self.no_op)
                wait_for_parked_block(node.getbestblockhash())

            # If we mine one more block, the node reorgs (generate also waits
            # for chain sync).
            self.generate(node, 1)

        check_reorg_protection(1, 0)
        check_reorg_protection(2, 0)
        check_reorg_protection(3, 1)
        check_reorg_protection(4, 4)
        check_reorg_protection(5, 5)
        check_reorg_protection(6, 6)
        check_reorg_protection(100, 100)

        # try deep reorg with a log check.
        with parking_node.assert_debug_log(["Park block"]):
            check_reorg_protection(3, 1)

        self.log.info(
            "Accepting many blocks at once (possibly out of order) should not park if"
            " there is no reorg."
        )
        # rewind one block to make a reorg that is shallow.
        node.invalidateblock(parking_node.getbestblockhash())
        # generate a ton of blocks at once.
        try:
            with parking_node.assert_debug_log(["Park block"]):
                # Also waits for chain sync
                self.generatetoaddress(
                    node, nblocks=20, address=node.getnewaddress(label="coinbase")
                )
        except AssertionError as exc:
            # good, we want an absence of "Park block" messages
            assert "does not partially match the above log" in exc.args[0]
        else:
            raise AssertionError("Parked block when there was no deep reorg")

        self.log.info("Test that unparking works when -parkdeepreorg=0")
        # Set up parking node height = fork + 4, node height = fork + 5
        node.invalidateblock(node.getbestblockhash())
        self.generate(parking_node, 3, sync_fun=self.no_op)
        self.generatetoaddress(
            node,
            nblocks=5,
            address=node.getnewaddress(label="coinbase"),
            sync_fun=self.no_op,
        )
        wait_for_parked_block(node.getbestblockhash())
        # Restart the parking node without parkdeepreorg.
        self.restart_node(1, self.extra_args[1] + ["-parkdeepreorg=0"])
        parking_node = self.nodes[1]
        self.connect_nodes(node.index, parking_node.index)
        # The other chain should still be marked 'parked'.
        wait_for_parked_block(node.getbestblockhash())
        # Three more blocks is not enough to unpark. Even though its PoW is
        # larger, we are still following the delayed-unparking rules.
        self.generate(node, 3, sync_fun=self.no_op)
        wait_for_parked_block(node.getbestblockhash())
        # Final block pushes over the edge, and should unpark (generate also
        # waits for chain sync).
        self.generate(node, 1)

        # Do not append tests after this point without restarting node again.
        # Parking node is no longer parking.


if __name__ == "__main__":
    ParkedChainTest().main()
