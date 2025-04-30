# Copyright (c) 2020-2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the resolution of forks via avalanche."""
import random
import time

from test_framework.avatools import (
    assert_response,
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
from test_framework.key import ECPubKey
from test_framework.messages import AvalancheVote, AvalancheVoteError, msg_avapoll
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex

QUORUM_NODE_COUNT = 16

ADDRS = [
    "ecregtest:pqv2r67sgz3qumufap3h2uuj0zfmnzuv8v38gtrh5v",
    "ecregtest:qqca3gh95tnjxqja7dt4kfdryyp0d2uss55p4myvzk",
    "ecregtest:qqzkkywqd9xyqgal27hc2wweu47392xywqz0pes57w",
    "ecregtest:qz7xgksy86wnenxf9t4hqc3lyvpjf6tpycfzk2wjml",
    "ecregtest:qq7dt5j42hvj8txm3jc66mp7x029txwp5cmuu4wmxq",
    "ecregtest:qrf5yf3t05hjlax0vl475t5nru29rwtegvzna37wyh",
]


class AvalancheTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 2
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-persistavapeers=0",
            ],
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-noparkdeepreorg",
            ],
        ]
        self.supports_cli = False
        self.rpc_timeout = 120

    def run_test(self):
        node = self.nodes[0]

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()
        poll_node = quorum[0]

        assert node.getavalancheinfo()["ready_to_poll"] is True

        def has_finalized_proof(proofid):
            can_find_inv_in_poll(quorum, proofid)
            return node.getrawavalancheproof(uint256_hex(proofid))["finalized"]

        for peer in quorum:
            self.wait_until(lambda: has_finalized_proof(peer.proof.proofid))

        # Generate many block and poll for them.
        self.generate(node, 100 - node.getblockcount())

        fork_node = self.nodes[1]

        # Get the key so we can verify signatures.
        avakey = ECPubKey()
        avakey.set(bytes.fromhex(node.getavalanchekey()))

        self.log.info("Poll for the chain tip...")
        best_block_hash = int(node.getbestblockhash(), 16)
        poll_node.send_poll([best_block_hash])

        assert_response(
            poll_node,
            avakey,
            [AvalancheVote(AvalancheVoteError.ACCEPTED, best_block_hash)],
        )

        self.log.info("Poll for a selection of blocks...")
        various_block_hashes = [
            int(node.getblockhash(0), 16),
            int(node.getblockhash(1), 16),
            int(node.getblockhash(10), 16),
            int(node.getblockhash(25), 16),
            int(node.getblockhash(42), 16),
            int(node.getblockhash(96), 16),
            int(node.getblockhash(99), 16),
            int(node.getblockhash(100), 16),
        ]

        poll_node.send_poll(various_block_hashes)
        assert_response(
            poll_node,
            avakey,
            [
                AvalancheVote(AvalancheVoteError.ACCEPTED, h)
                for h in various_block_hashes
            ],
        )

        self.log.info("Poll for a selection of blocks, but some are now invalid...")
        invalidated_block = node.getblockhash(76)
        node.invalidateblock(invalidated_block)
        # We need to send the coin to a new address in order to make sure we do
        # not regenerate the same block.
        self.generatetoaddress(node, 26, ADDRS[0], sync_fun=self.no_op)
        node.reconsiderblock(invalidated_block)

        poll_node.send_poll(various_block_hashes)
        assert_response(
            poll_node,
            avakey,
            [
                AvalancheVote(AvalancheVoteError.ACCEPTED, h)
                for h in various_block_hashes[:5]
            ]
            + [
                AvalancheVote(AvalancheVoteError.FORK, h)
                for h in various_block_hashes[-3:]
            ],
        )

        self.log.info("Poll for unknown blocks...")
        various_block_hashes = [
            int(node.getblockhash(0), 16),
            int(node.getblockhash(25), 16),
            int(node.getblockhash(42), 16),
            various_block_hashes[5],
            various_block_hashes[6],
            various_block_hashes[7],
            random.randrange(1 << 255, (1 << 256) - 1),
            random.randrange(1 << 255, (1 << 256) - 1),
            random.randrange(1 << 255, (1 << 256) - 1),
        ]
        poll_node.send_poll(various_block_hashes)
        assert_response(
            poll_node,
            avakey,
            [
                AvalancheVote(AvalancheVoteError.ACCEPTED, h)
                for h in various_block_hashes[:3]
            ]
            + [
                AvalancheVote(AvalancheVoteError.FORK, h)
                for h in various_block_hashes[3:6]
            ]
            + [
                AvalancheVote(AvalancheVoteError.UNKNOWN, h)
                for h in various_block_hashes[-3:]
            ],
        )

        self.log.info("Trigger polling from the node...")

        # Now that we have a peer, we should start polling for the tip.
        hash_tip = int(node.getbestblockhash(), 16)
        self.wait_until(lambda: can_find_inv_in_poll(quorum, hash_tip))

        # Make sure the fork node has synced the blocks
        self.sync_blocks([node, fork_node])

        # Create a fork 2 blocks deep. This should trigger polling.
        fork_node.invalidateblock(fork_node.getblockhash(100))
        self.generate(fork_node, 2, sync_fun=self.no_op)

        # Because the new tip is a deep reorg, the node will not accept it
        # right away, but poll for it.
        def parked_block(blockhash):
            for tip in node.getchaintips():
                if tip["hash"] == blockhash:
                    assert tip["status"] != "active"
                    return tip["status"] == "parked"
            return False

        fork_tip = fork_node.getbestblockhash()
        self.wait_until(lambda: parked_block(fork_tip))

        self.log.info("Answer all polls to finalize...")

        def has_accepted_tip(tip_expected):
            hash_tip_accept = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_accept)
            return node.getbestblockhash() == tip_expected

        # Because everybody answers yes, the node will accept that block.
        with node.assert_debug_log([f"Avalanche accepted block {fork_tip}"]):
            self.wait_until(lambda: has_accepted_tip(fork_tip))

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        # And continuing to answer yes finalizes the block.
        with node.assert_debug_log([f"Avalanche finalized block {fork_tip}"]):
            self.wait_until(lambda: has_finalized_tip(fork_tip))
        assert_equal(node.getbestblockhash(), fork_tip)

        self.log.info("Answer all polls to park...")
        self.generate(node, 1, sync_fun=self.no_op)

        tip_to_park = node.getbestblockhash()
        assert tip_to_park != fork_tip

        def has_parked_tip(tip_park):
            hash_tip_park = int(tip_park, 16)
            can_find_inv_in_poll(quorum, hash_tip_park, AvalancheVoteError.PARKED)

            for tip in node.getchaintips():
                if tip["hash"] == tip_park:
                    return tip["status"] == "parked"
            return False

        # Because everybody answers no, the node will park that block.
        with node.assert_debug_log([f"Avalanche rejected block {tip_to_park}"]):
            self.wait_until(lambda: has_parked_tip(tip_to_park))
        assert_equal(node.getbestblockhash(), fork_tip)

        # Voting yes will switch to accepting the block.
        with node.assert_debug_log([f"Avalanche accepted block {tip_to_park}"]):
            self.wait_until(lambda: has_accepted_tip(tip_to_park))

        # Answer no again and switch back to rejecting the block.
        with node.assert_debug_log([f"Avalanche rejected block {tip_to_park}"]):
            self.wait_until(lambda: has_parked_tip(tip_to_park))
        assert_equal(node.getbestblockhash(), fork_tip)

        # Vote a few more times until the block gets invalidated
        hash_tip_park = int(tip_to_park, 16)
        with node.wait_for_debug_log(
            [f"Avalanche invalidated block {tip_to_park}".encode()],
            chatty_callable=lambda: can_find_inv_in_poll(
                quorum, hash_tip_park, AvalancheVoteError.PARKED
            ),
        ):
            pass

        # Mine on the current chaintip to trigger polling and so we don't reorg
        old_fork_tip = fork_tip
        fork_tip = self.generate(fork_node, 2, sync_fun=self.no_op)[-1]

        # Manually unparking the invalidated block will reset finalization.
        node.unparkblock(tip_to_park)
        assert not node.isfinalblock(old_fork_tip)

        # Wait until the new tip is finalized
        self.sync_blocks([node, fork_node])
        self.wait_until(lambda: has_finalized_tip(fork_tip))
        assert_equal(node.getbestblockhash(), fork_tip)

        # Manually parking the finalized chaintip will reset finalization.
        node.parkblock(fork_tip)
        assert not node.isfinalblock(fork_tip)

        # Trigger polling and finalize a new tip to setup for the next test.
        node.unparkblock(fork_tip)
        fork_tip = self.generate(fork_node, 1)[-1]
        self.wait_until(lambda: has_finalized_tip(fork_tip))
        assert_equal(node.getbestblockhash(), fork_tip)

        self.log.info("Verify finalization sticks...")
        chain_head = fork_tip

        self.log.info("...for a chain 1 block long...")
        # Create a new fork at the chaintip
        fork_node.invalidateblock(chain_head)
        # We need to send the coin to a new address in order to make sure we do
        # not regenerate the same block.
        blocks = self.generatetoaddress(fork_node, 1, ADDRS[1], sync_fun=self.no_op)
        chain_head = blocks[0]
        fork_tip = blocks[0]

        # node does not attempt to connect alternate chaintips so it is not
        # parked. We check for an inactive valid header instead.
        def valid_headers_block(blockhash):
            for tip in node.getchaintips():
                if tip["hash"] == blockhash:
                    assert tip["status"] != "active"
                    return tip["status"] == "valid-headers"
            return False

        self.wait_until(lambda: valid_headers_block(fork_tip))

        # sanity check
        hash_to_find = int(fork_tip, 16)
        poll_node.send_poll([hash_to_find])
        assert_response(
            poll_node, avakey, [AvalancheVote(AvalancheVoteError.FORK, hash_to_find)]
        )

        # Try some longer fork chains
        for numblocks in range(2, len(ADDRS)):
            self.log.info(f"...for a chain {numblocks} blocks long...")

            # Create a new fork N blocks deep
            fork_node.invalidateblock(chain_head)
            # We need to send the coin to a new address in order to make sure we do
            # not regenerate the same block.
            blocks = self.generatetoaddress(
                fork_node, numblocks, ADDRS[numblocks], sync_fun=self.no_op
            )
            chain_head = blocks[0]
            fork_tip = blocks[-1]

            # node should park the block if attempting to connect it because
            # its tip is finalized
            self.wait_until(lambda: parked_block(fork_tip))

            # sanity check
            hash_to_find = int(fork_tip, 16)
            poll_node.send_poll([hash_to_find])
            assert_response(
                poll_node,
                avakey,
                [AvalancheVote(AvalancheVoteError.PARKED, hash_to_find)],
            )

            with node.wait_for_debug_log(
                [f"Avalanche invalidated block {fork_tip}".encode()],
                chatty_callable=lambda: can_find_inv_in_poll(
                    quorum, hash_to_find, AvalancheVoteError.PARKED
                ),
            ):
                pass

        self.log.info("Check the node is discouraging unexpected avaresponses.")

        self.restart_node(0)

        poll_node = get_ava_p2p_interface(self, node)

        now = int(time.time())
        node.setmocktime(now)

        # First we get some tolerance
        for _ in range(12):
            with node.assert_debug_log(
                ["received: avaresponse"],
                ["Misbehaving", "unexpected-ava-response"],
            ):
                # unknown voting round
                poll_node.send_avaresponse(
                    avaround=2**32 - 1, votes=[], privkey=poll_node.delegated_privkey
                )

        # Then we start discouraging
        with node.assert_debug_log(
            ["Repeated failure to register votes from peer", "unexpected-ava-response"]
        ):
            # unknown voting round
            poll_node.send_avaresponse(
                avaround=2**32 - 1, votes=[], privkey=poll_node.delegated_privkey
            )

        # If we stop misbehaving for some time our tolerance counter resets
        # after we sent a good (expected) response message.
        now += 60 * 60 + 1  # 1h + 1s
        node.setmocktime(now)

        quorum = [poll_node] + get_quorum()
        assert node.getavalancheinfo()["ready_to_poll"] is True

        for peer in quorum:
            self.wait_until(lambda: has_finalized_proof(peer.proof.proofid))

        # Make sure our poll node got a poll so the counter has reset
        while len(poll_node.avapolls) == 0:
            tip = self.generate(node, 1, sync_fun=self.no_op)[-1]
            self.wait_until(lambda: has_finalized_tip(tip))

        # Counter has reset
        for _ in range(12):
            with node.assert_debug_log(
                ["received: avaresponse"],
                ["Misbehaving", "unexpected-ava-response"],
            ):
                # unknown voting round
                poll_node.send_avaresponse(
                    avaround=2**32 - 1, votes=[], privkey=poll_node.delegated_privkey
                )

        # Then we start discouraging again
        with node.assert_debug_log(
            ["Repeated failure to register votes from peer", "unexpected-ava-response"]
        ):
            # unknown voting round
            poll_node.send_avaresponse(
                avaround=2**32 - 1, votes=[], privkey=poll_node.delegated_privkey
            )

        self.log.info(
            "Check the maximum number of avapoll items we can send before disconnection"
        )
        # Use a fresh poll node that has a 0 discouragement score
        fresh_poll_node = get_ava_p2p_interface(self, node)
        with node.assert_debug_log(
            ["received: avapoll"], unexpected_msgs=["Misbehaving", "too-many-ava-poll"]
        ):
            fresh_poll_node.send_poll(list(range(msg_avapoll.MAX_ELEMENT_POLL)))

        with node.assert_debug_log(
            [
                f"too-many-ava-poll: poll message size = {msg_avapoll.MAX_ELEMENT_POLL + 1}",
            ]
        ):
            # Too many items in an avapoll would get the interface disconnected if it wasn't
            # for `noban_tx_relay = True`
            fresh_poll_node.send_poll(list(range(msg_avapoll.MAX_ELEMENT_POLL + 1)))


if __name__ == "__main__":
    AvalancheTest().main()
