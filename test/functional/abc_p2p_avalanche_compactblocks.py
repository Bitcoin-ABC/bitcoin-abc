#!/usr/bin/env python3
# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test that avalanche stalled or invalidated transactions are kept for compact block reconstruction."""

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.blocktools import COINBASE_MATURITY, create_block
from test_framework.messages import (
    MSG_BLOCK,
    MSG_CMPCT_BLOCK,
    AvalancheTxVoteError,
    CBlockHeader,
    CInv,
    CTransaction,
    FromHex,
    HeaderAndShortIDs,
    msg_cmpctblock,
    msg_headers,
    msg_inv,
    msg_sendcmpct,
)
from test_framework.p2p import P2PInterface, p2p_lock
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex
from test_framework.wallet import MiniWallet, MiniWalletMode

QUORUM_NODE_COUNT = 16


class CompactRelayPeer(P2PInterface):
    """Minimal P2P peer for BIP152 compact block announcements."""

    def send_header_for_blocks(self, new_blocks):
        headers_message = msg_headers()
        headers_message.headers = [CBlockHeader(b) for b in new_blocks]
        self.send_without_ping(headers_message)


class AvalancheTxCompactBlockTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxoconfirmations=1",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                # Accelerate the test
                "-avacooldown=0",
                "-avastalevotethreshold=256",
                "-avalanchestakingpreconsensus=0",
            ]
        ]

    def check_and_get_reconstructed_block(self, node, compact_peer, block_tx):
        tmpl = node.getblocktemplate()
        tx = FromHex(CTransaction(), block_tx["hex"])
        block = create_block(tmpl=tmpl, txlist=[tx])
        block.solve()

        # Announce the block via inv, wait for the node to request the header
        # then the block. We respond with a compact block that doesn't contain
        # only the coinbase as a prefilled transaction (which is the standard
        # behavior for compact blocks) and check the node reconstruct the block
        # without requesting the tx.
        compact_peer.send_without_ping(msg_inv([CInv(MSG_BLOCK, block.hash_int)]))
        self.wait_until(lambda: "getheaders" in compact_peer.last_message)
        compact_peer.send_header_for_blocks([block])
        compact_peer.wait_for_getdata([block.hash_int])

        # We got a getdata request, make sure it only contains the block
        # (getdata messages request a list of inventories)
        with p2p_lock:
            getdata_request = compact_peer.last_message["getdata"]
            assert_equal(len(getdata_request.inv), 1)
            assert_equal(getdata_request.inv[0].type, MSG_CMPCT_BLOCK)

            # Clear the last message (for the one we are interested in) for all
            # peers
            for peer in node.p2ps:
                while peer.last_message.pop("getdata", None):
                    pass
                while peer.last_message.pop("getblocktxn", None):
                    pass

        comp_block = HeaderAndShortIDs()
        comp_block.initialize_from_block(block)
        compact_peer.send_and_ping(msg_cmpctblock(comp_block.to_p2p()))

        # Wait until the node tip has advanced, which means the block was
        # reconstructed
        self.wait_until(lambda: node.getbestblockhash() == block.hash_hex)

        # Sanity check the node didn't request any of the following:
        #  - The block transaction
        #  - The block as a whole
        # This is the case if there is no getblocktxn nor getdata requests.
        with p2p_lock:
            for peer in node.p2ps:
                assert_equal(peer.last_message.get("getblocktxs", None), None)
                assert_equal(peer.last_message.get("getdata", None), None)

        return block

    def run_test(self):
        node = self.nodes[0]

        wallet = MiniWallet(node, mode=MiniWalletMode.RAW_P2PK)
        self.generate(wallet, COINBASE_MATURITY + 10, sync_fun=self.no_op)

        quorum = [get_ava_p2p_interface(self, node) for _ in range(QUORUM_NODE_COUNT)]
        assert node.getavalancheinfo()["ready_to_poll"]

        def has_finalized_proof(proofid):
            can_find_inv_in_poll(quorum, proofid)
            return node.getrawavalancheproof(uint256_hex(proofid))["finalized"]

        for q in quorum:
            self.wait_until(lambda: has_finalized_proof(q.proof.proofid))

        def has_finalized_block(block_hash):
            can_find_inv_in_poll(quorum, int(block_hash, 16))
            return node.isfinalblock(block_hash)

        tip = self.generate(node, 1, sync_fun=self.no_op)[0]
        self.wait_until(lambda: has_finalized_block(tip))
        assert_equal(node.getrawmempool(), [])

        compact_peer = node.add_p2p_connection(CompactRelayPeer())
        compact_peer.send_and_ping(msg_sendcmpct(announce=True, version=1))

        self.log.info(
            "Check the node doesn't request a stalled tx to reconstruct the compact block"
        )

        stalled_tx = wallet.send_self_transfer(from_node=node)
        stalled_txid = stalled_tx["txid"]
        assert stalled_txid in node.getrawmempool()

        def stale_tx(txid):
            can_find_inv_in_poll(
                quorum,
                int(txid, 16),
                response=AvalancheTxVoteError.UNKNOWN,
                other_response=AvalancheTxVoteError.UNKNOWN,
            )

        with node.wait_for_debug_log(
            [f"Avalanche stalled tx {stalled_txid}".encode()],
            chatty_callable=lambda: stale_tx(stalled_txid),
        ):
            pass

        assert stalled_txid not in node.getrawmempool()

        # Make sure to exhaust the inflight polls
        while can_find_inv_in_poll(
            quorum,
            int(stalled_txid, 16),
            response=AvalancheTxVoteError.UNKNOWN,
        ):
            pass

        block = self.check_and_get_reconstructed_block(node, compact_peer, stalled_tx)

        # Finalize the new block
        self.wait_until(lambda: has_finalized_block(block.hash_hex))

        self.log.info(
            "Check the node doesn't request an invalidated tx to reconstruct the compact block"
        )

        invalidated_tx = wallet.send_self_transfer(from_node=node)
        invalidated_txid = invalidated_tx["txid"]
        assert invalidated_txid in node.getrawmempool()

        def invalidate_tx(txid):
            can_find_inv_in_poll(
                quorum,
                int(txid, 16),
                response=AvalancheTxVoteError.INVALID,
            )

        with node.wait_for_debug_log(
            [f"Avalanche invalidated tx {invalidated_txid}".encode()],
            chatty_callable=lambda: invalidate_tx(invalidated_txid),
        ):
            pass

        assert invalidated_txid not in node.getrawmempool()

        # Make sure to exhaust the inflight polls
        while can_find_inv_in_poll(
            quorum,
            int(invalidated_txid, 16),
            response=AvalancheTxVoteError.INVALID,
        ):
            pass

        block = self.check_and_get_reconstructed_block(
            node, compact_peer, invalidated_tx
        )


if __name__ == "__main__":
    AvalancheTxCompactBlockTest().main()
