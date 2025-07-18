# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test mining with avalanche preconsensus."""
import random

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.messages import AvalancheTxVoteError
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, uint256_hex
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16


class AvalancheMiningPreconsensusTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avacooldown=0",
                "-avaproofstakeutxoconfirmations=1",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                # Each node only connects to 50% of the avalanche peers
                "-avaminquorumconnectedstakeratio=0.5",
                # Preconsensus disabled
                "-avalanchepreconsensus=0",
            ],
            [
                "-avacooldown=0",
                "-avaproofstakeutxoconfirmations=1",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-avaminquorumconnectedstakeratio=0.5",
                # Preconsensus enabled
                "-avalanchepreconsensus=1",
                # Preconsensus mining enabled
                "-avalanchepreconsensusmining=1",
            ],
        ]

    def run_test(self):
        node_non_preconsensus = self.nodes[0]
        node_preconsensus = self.nodes[1]

        def get_quorum(node):
            return [
                get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Both nodes get a quorum and are ready to poll
        quorum_non_preconsensus = get_quorum(node_non_preconsensus)
        quorum_preconsensus = get_quorum(node_preconsensus)

        assert node_non_preconsensus.getavalancheinfo()["ready_to_poll"]
        assert node_preconsensus.getavalancheinfo()["ready_to_poll"]

        def finalize_proofs(node, quorum):
            proofids = [
                q.proof.proofid for q in quorum_non_preconsensus + quorum_preconsensus
            ]
            [can_find_inv_in_poll(quorum, proofid) for proofid in proofids]
            return all(
                node.getrawavalancheproof(uint256_hex(proofid))["finalized"]
                for proofid in proofids
            )

        finalize_proofs(node_non_preconsensus, quorum_non_preconsensus)
        finalize_proofs(node_preconsensus, quorum_preconsensus)

        # Get some coins so we can generate transactions
        wallet = MiniWallet(node_non_preconsensus)
        tip = self.generate(wallet, 10)[-1]

        def finalize_tip(tip, **kwargs):
            def vote_until_final(node, quorum):
                can_find_inv_in_poll(
                    quorum,
                    int(tip, 16),
                    response=AvalancheTxVoteError.ACCEPTED,
                    other_response=AvalancheTxVoteError.ACCEPTED,
                    **kwargs,
                )
                return node.isfinalblock(tip)

            self.wait_until(
                lambda: vote_until_final(node_non_preconsensus, quorum_non_preconsensus)
            )
            self.wait_until(
                lambda: vote_until_final(node_preconsensus, quorum_preconsensus)
            )

        finalize_tip(tip)

        # Create a bunch of transactions and finalize half of them
        txs = []
        for _ in range(5):
            txs.append(wallet.send_self_transfer(from_node=node_non_preconsensus))
        self.sync_mempools()

        def finalize_tx(txid, other_response=AvalancheTxVoteError.ACCEPTED, **kwargs):
            def vote_until_final():
                can_find_inv_in_poll(
                    quorum_preconsensus,
                    int(txid, 16),
                    response=AvalancheTxVoteError.ACCEPTED,
                    other_response=other_response,
                    **kwargs,
                )
                return node_preconsensus.isfinaltransaction(txid)

            self.wait_until(vote_until_final)

        # Finalize the first 5 transactions for the preconsensus node
        [finalize_tx(tx["txid"]) for tx in txs]

        for _ in range(5):
            txs.append(wallet.send_self_transfer(from_node=node_non_preconsensus))
        self.sync_mempools()

        for tx in txs[:5]:
            assert node_preconsensus.isfinaltransaction(tx["txid"])
            assert not node_non_preconsensus.isfinaltransaction(tx["txid"])
        for tx in txs[5:]:
            assert not node_preconsensus.isfinaltransaction(tx["txid"])
            assert not node_non_preconsensus.isfinaltransaction(tx["txid"])

        # Only the first 5 transactions should be in the block template
        gbt_preconsensus = node_preconsensus.getblocktemplate()
        assert_equal(
            [tx["txid"] for tx in gbt_preconsensus["transactions"]],
            sorted([tx["txid"] for tx in txs[:5]]),
        )

        # On the non preconsensus node, all the transactions are in the block
        # template
        gbt_non_preconsensus = node_non_preconsensus.getblocktemplate()
        assert_equal(
            [tx["txid"] for tx in gbt_non_preconsensus["transactions"]],
            sorted([tx["txid"] for tx in txs]),
        )

        # Both blocks are valid and can be mined. Note the generate function
        # calls self.sync_all() so the blocks and mempools are synced between
        # the 2 nodes.
        tip = self.generate(node_preconsensus, 1)[0]
        assert_equal(
            sorted(node_preconsensus.getrawmempool()),
            sorted([tx["txid"] for tx in txs[5:]]),
        )

        node_preconsensus.parkblock(tip)
        node_non_preconsensus.parkblock(tip)

        # The blocks are different because they don't contain the same
        # transactions
        tip = self.generate(node_non_preconsensus, 1)[0]
        assert_equal(node_preconsensus.getrawmempool(), [])

        NUM_CHAIN = 10
        MAX_CHAIN_LENGTH = 5

        tip = self.generate(wallet, NUM_CHAIN * MAX_CHAIN_LENGTH)[-1]

        finalize_tip(tip)

        finalized_txids = []
        # Let randomly build transaction chains and finalize some txs
        for _ in range(NUM_CHAIN):
            chain_length = random.randint(1, MAX_CHAIN_LENGTH)
            chain = wallet.send_self_transfer_chain(
                from_node=node_preconsensus, chain_length=chain_length
            )
            if (index := random.randint(0, chain_length + 1)) < chain_length:
                finalize_tx(
                    chain[index]["txid"], other_response=AvalancheTxVoteError.UNKNOWN
                )
                # Not only this tx is finalized, but all its ancestors are
                finalized_txids.extend([tx["txid"] for tx in chain[: index + 1]])

        self.sync_mempools()

        # The block is valid
        tip = self.generate(node_preconsensus, 1)[0]

        # Check the block contains all the finalized transactions
        assert_equal(
            sorted(node_preconsensus.getblock(tip)["tx"][1:]),
            sorted(finalized_txids),
        )

        # Mempool and block template only contain the transactions that are not
        # final
        mempool = node_preconsensus.getrawmempool()
        gbt_txids = [
            tx["txid"] for tx in node_preconsensus.getblocktemplate()["transactions"]
        ]
        for txid in finalized_txids:
            assert txid not in mempool
            assert txid not in gbt_txids


if __name__ == "__main__":
    AvalancheMiningPreconsensusTest().main()
