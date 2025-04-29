# Copyright (c) The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

"""
Test that an attacker can't degrade compact block relay by sending unsolicited
mutated blocks to clear in-flight blocktxn requests from other honest peers.
"""

import copy

from test_framework.blocktools import COINBASE_MATURITY, create_block
from test_framework.messages import (
    BlockTransactions,
    HeaderAndShortIDs,
    msg_block,
    msg_blocktxn,
    msg_cmpctblock,
)
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet


class MutatedBlocksTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1

    def run_test(self):
        self.wallet = MiniWallet(self.nodes[0])
        self.generate(self.wallet, COINBASE_MATURITY)

        honest_relayer = self.nodes[0].add_outbound_p2p_connection(
            P2PInterface(), p2p_idx=0, connection_type="outbound-full-relay"
        )
        attacker = self.nodes[0].add_p2p_connection(P2PInterface())

        # Create new block with two transactions (coinbase + 1 self-transfer).
        # The self-transfer transaction is needed to trigger a compact block
        # `getblocktxn` roundtrip.
        tx = self.wallet.create_self_transfer()["tx"]
        block = create_block(tmpl=self.nodes[0].getblocktemplate(), txlist=[tx])
        block.solve()

        # Create mutated version of the block by changing the transaction
        # version on the self-transfer.
        mutated_block = copy.deepcopy(block)
        mutated_block.vtx[1].nVersion = 4

        # Announce the new block via a compact block through the honest relayer
        cmpctblock = HeaderAndShortIDs()
        cmpctblock.initialize_from_block(block)
        honest_relayer.send_message(msg_cmpctblock(cmpctblock.to_p2p()))

        # Wait for a `getblocktxn` that attempts to fetch the self-transfer
        def self_transfer_requested():
            if not honest_relayer.last_message.get("getblocktxn"):
                return False

            get_block_txn = honest_relayer.last_message["getblocktxn"]
            return (
                get_block_txn.block_txn_request.blockhash == block.sha256
                and get_block_txn.block_txn_request.indexes == [1]
            )

        honest_relayer.wait_until(self_transfer_requested, timeout=5)

        # Block at height 101 should be the only one in flight from peer 0
        peer_info_prior_to_attack = self.nodes[0].getpeerinfo()
        assert_equal(peer_info_prior_to_attack[0]["id"], 0)
        assert_equal([101], peer_info_prior_to_attack[0]["inflight"])

        # Attempt to clear the honest relayer's download request by sending the
        # mutated block (as the attacker).
        with self.nodes[0].assert_debug_log(
            expected_msgs=["bad-txnmrklroot, hashMerkleRoot mismatch"]
        ):
            attacker.send_message(msg_block(mutated_block))
        # Attacker should get disconnected for sending a mutated block
        attacker.wait_for_disconnect(timeout=5)

        # Block at height 101 should *still* be the only block in-flight from
        # peer 0
        peer_info_after_attack = self.nodes[0].getpeerinfo()
        assert_equal(peer_info_after_attack[0]["id"], 0)
        assert_equal([101], peer_info_after_attack[0]["inflight"])

        # The honest relayer should be able to complete relaying the block by
        # sending the blocktxn that was requested.
        block_txn = msg_blocktxn()
        block_txn.block_transactions = BlockTransactions(
            blockhash=block.sha256, transactions=[tx]
        )
        honest_relayer.send_and_ping(block_txn)
        assert_equal(self.nodes[0].getbestblockhash(), block.hash)


if __name__ == "__main__":
    MutatedBlocksTest().main()
