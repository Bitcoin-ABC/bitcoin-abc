#!/usr/bin/env python3
# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the isfinalxxx RPCS."""
import random

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import AvaP2PInterface
from test_framework.messages import AvalancheVote, AvalancheVoteError
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_raises_rpc_error, uint256_hex

QUORUM_NODE_COUNT = 16


class AvalancheIsFinalTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                '-avalanche=1',
                '-avaproofstakeutxodustthreshold=1000000',
                '-avaproofstakeutxoconfirmations=1',
                '-avacooldown=0',
                '-avaminquorumstake=0',
                '-avaminavaproofsnodecount=0',
            ]
        ]

    def run_test(self):
        node = self.nodes[0]

        # Build a fake quorum of nodes.
        def get_quorum():
            return [node.add_p2p_connection(AvaP2PInterface(node))
                    for _ in range(0, QUORUM_NODE_COUNT)]

        # Pick on node from the quorum for polling.
        quorum = get_quorum()

        def is_quorum_established():
            return node.getavalancheinfo()['ready_to_poll'] is True
        self.wait_until(is_quorum_established)

        def can_find_block_in_poll(
                blockhash, resp=AvalancheVoteError.ACCEPTED):
            found_hash = False
            for n in quorum:
                poll = n.get_avapoll_if_available()

                # That node has not received a poll
                if poll is None:
                    continue

                # We got a poll, check for the hash and repond
                votes = []
                for inv in poll.invs:
                    # Vote yes to everything
                    r = AvalancheVoteError.ACCEPTED

                    # Look for what we expect
                    if inv.hash == int(blockhash, 16):
                        r = resp
                        found_hash = True

                    votes.append(AvalancheVote(r, inv.hash))

                n.send_avaresponse(poll.round, votes, n.delegated_privkey)

            return found_hash

        blockhash = node.generate(1)[0]
        cb_txid = node.getblock(blockhash)['tx'][0]
        assert not node.isfinalblock(blockhash)
        assert not node.isfinaltransaction(cb_txid, blockhash)

        def is_finalblock(blockhash):
            can_find_block_in_poll(blockhash)
            return node.isfinalblock(blockhash)

        with node.assert_debug_log([f"Avalanche finalized block {blockhash}"]):
            self.wait_until(lambda: is_finalblock(blockhash))
        assert node.isfinaltransaction(cb_txid, blockhash)

        self.log.info("Check block ancestors are finalized as well")
        tip_height = node.getblockheader(blockhash)['height']
        for height in range(0, tip_height):
            hash = node.getblockhash(height)
            assert node.isfinalblock(hash)
            txid = node.getblock(hash)['tx'][0]
            assert node.isfinaltransaction(txid, hash)

        if self.is_wallet_compiled():
            self.log.info("Check mempool transactions are not finalized")
            # Mature some utxos
            node.generate(100)
            wallet_txid = node.sendtoaddress(
                ADDRESS_ECREG_UNSPENDABLE, 1_000_000)
            assert wallet_txid in node.getrawmempool()
            assert not node.isfinaltransaction(
                wallet_txid, node.getbestblockhash())

            self.log.info(
                "A transaction is only finalized if the containing block is finalized")
            tip = node.generate(1)[0]
            assert wallet_txid not in node.getrawmempool()
            assert not node.isfinaltransaction(wallet_txid, tip)
            self.wait_until(lambda: is_finalblock(tip))
            assert node.isfinaltransaction(wallet_txid, tip)
            # Needs -txindex
            assert not node.isfinaltransaction(wallet_txid)

            self.log.info(
                "Repeat with -txindex so we don't need the blockhash")
            self.restart_node(0, self.extra_args[0] + ['-txindex'])

            quorum = get_quorum()
            self.wait_until(is_quorum_established)
            self.wait_until(lambda: node.getindexinfo()[
                            'txindex']['synced'] is True)

            self.wait_until(lambda: is_finalblock(tip))
            assert node.isfinaltransaction(wallet_txid)

            wallet_txid = node.sendtoaddress(
                ADDRESS_ECREG_UNSPENDABLE, 1_000_000)
            assert wallet_txid in node.getrawmempool()
            assert not node.isfinaltransaction(wallet_txid)

            assert not node.isfinaltransaction(
                uint256_hex(random.randint(0, 2**256 - 1)))

        self.log.info("Check unknown item")
        for _ in range(10):
            assert_raises_rpc_error(
                -8,
                "Block not found",
                node.isfinalblock,
                uint256_hex(random.randint(0, 2**256 - 1)),
            )
            assert_raises_rpc_error(
                -8,
                "Block not found",
                node.isfinaltransaction,
                uint256_hex(random.randint(0, 2**256 - 1)),
                uint256_hex(random.randint(0, 2**256 - 1)),
            )


if __name__ == '__main__':
    AvalancheIsFinalTest().main()
