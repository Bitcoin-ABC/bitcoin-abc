# Copyright (c) 2025 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the activation of the avalanche preconsensus feature."""
from test_framework.avatools import (
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
from test_framework.messages import (
    MSG_TX,
    AvalancheTxVoteError,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import uint256_hex
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16
THE_FUTURE = 2100000000


class AvalanchePreconsensusActivationTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-avalanchepreconsensus=1",
                "-avalanchepreconsensusmining=1",
                f"-shibusawaactivationtime={THE_FUTURE}",
            ],
        ]

    def run_test(self):
        node = self.nodes[0]

        wallet = MiniWallet(node)

        now = THE_FUTURE - 600
        node.setmocktime(now)

        quorum = [
            get_ava_p2p_interface(self, node) for _ in range(0, QUORUM_NODE_COUNT)
        ]
        assert node.getavalancheinfo()["ready_to_poll"]

        def finalize_proof(proofid):
            def has_finalized_proof(proofid):
                can_find_inv_in_poll(
                    quorum,
                    proofid,
                )
                return node.getrawavalancheproof(uint256_hex(proofid))["finalized"]

            self.wait_until(lambda: has_finalized_proof(proofid))

        for peer in quorum:
            finalize_proof(peer.proof.proofid)

        def finalize_tip(tip):
            def has_finalized_block(blockhash):
                can_find_inv_in_poll(
                    quorum,
                    int(blockhash, 16),
                    response_map={MSG_TX: AvalancheTxVoteError.UNKNOWN},
                )
                return node.isfinalblock(blockhash)

            self.wait_until(lambda: has_finalized_block(tip))

        finalize_tip(node.getbestblockhash())

        now = THE_FUTURE
        node.setmocktime(now)

        assert not node.getinfo()["avalanche_preconsensus"]
        assert not node.getinfo()["avalanche_mining_preconsensus"]

        # No tx is polled yet
        def check_tx_is_not_polled(txid):
            assert not can_find_inv_in_poll(quorum, txid)
            # Make sure the block template is refreshed
            nonlocal now
            now += 6
            node.setmocktime(now)
            gbt = node.getblocktemplate()
            assert txid in [tx["txid"] for tx in gbt["transactions"]]

        txid = wallet.send_self_transfer(from_node=node)["txid"]
        assert txid in node.getrawmempool()

        check_tx_is_not_polled(txid)

        for _ in range(5):
            self.generate(node, 1)[0]
            assert not node.getinfo()["avalanche_staking_preconsensus"]
            assert not node.getinfo()["avalanche_mining_preconsensus"]
            txid = wallet.send_self_transfer(from_node=node)["txid"]
            check_tx_is_not_polled(txid)

        # Next block activates preconsensus
        activation_block = self.generate(node, 1)[0]
        assert node.getinfo()["avalanche_preconsensus"]
        assert node.getinfo()["avalanche_mining_preconsensus"]
        txid = wallet.send_self_transfer(from_node=node)["txid"]

        finalize_tip(activation_block)

        # From now on transactions are polled
        def check_tx_is_polled(txid):
            assert not can_find_inv_in_poll(quorum, txid)

        check_tx_is_polled(txid)

        # The tx is no longer in the block template
        gbt = node.getblocktemplate()
        assert txid not in [tx["txid"] for tx in gbt["transactions"]]

        def finalize_tx(txid):
            def has_finalized_tx(txid):
                can_find_inv_in_poll(
                    quorum,
                    txid,
                )
                return node.isfinaltransaction(txid)

            self.wait_until(lambda: has_finalized_tx(txid))

        # Until the transaction is finalized
        finalize_tx(txid)
        # Make sure the block template is refreshed
        now += 6
        node.setmocktime(now)
        gbt = node.getblocktemplate()
        assert txid in [tx["txid"] for tx in gbt["transactions"]]

        # Park the activation block to deactivate
        node.parkblock(activation_block)
        assert not node.getinfo()["avalanche_preconsensus"]
        assert not node.getinfo()["avalanche_mining_preconsensus"]

        # Unpark the activation block to reactivate
        node.unparkblock(activation_block)
        assert node.getinfo()["avalanche_preconsensus"]
        assert node.getinfo()["avalanche_mining_preconsensus"]

        self.restart_node(
            0,
            extra_args=[
                "-avalanchepreconsensus=0",
                "-avalanchepreconsensusmining=1",
                f"-mocktime={now}",
            ],
        )

        assert not node.getinfo()["avalanche_preconsensus"]
        assert not node.getinfo()["avalanche_mining_preconsensus"]

        self.restart_node(
            0,
            extra_args=[
                "-avalanchepreconsensus=1",
                "-avalanchepreconsensusmining=0",
                f"-mocktime={now}",
            ],
        )

        assert node.getinfo()["avalanche_preconsensus"]
        assert not node.getinfo()["avalanche_mining_preconsensus"]

        self.restart_node(
            0,
            extra_args=[
                "-avalanchepreconsensus=0",
                "-avalanchepreconsensusmining=0",
                f"-mocktime={now}",
            ],
        )

        assert not node.getinfo()["avalanche_preconsensus"]
        assert not node.getinfo()["avalanche_mining_preconsensus"]

        self.restart_node(
            0,
            extra_args=[
                "-avalanchepreconsensus=1",
                "-avalanchepreconsensusmining=1",
                f"-mocktime={now}",
            ],
        )

        assert node.getinfo()["avalanche_preconsensus"]
        assert node.getinfo()["avalanche_mining_preconsensus"]


if __name__ == "__main__":
    AvalanchePreconsensusActivationTest().main()
