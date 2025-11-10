# Copyright (c) 2022 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the isfinalxxx RPCS."""

import random

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.authproxy import JSONRPCException
from test_framework.avatools import AvaP2PInterface, can_find_inv_in_poll
from test_framework.blocktools import COINBASE_MATURITY, create_block, create_coinbase
from test_framework.messages import CBlockHeader, msg_headers
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_raises_rpc_error,
    sync_txindex,
    uint256_hex,
)

QUORUM_NODE_COUNT = 16


class AvalancheIsFinalTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-persistavapeers=0",
            ]
        ]

    def run_test(self):
        node = self.nodes[0]

        tip = node.getbestblockhash()

        assert_raises_rpc_error(
            -1,
            "Avalanche is not ready to poll yet.",
            self.nodes[0].isfinalblock,
            tip,
        )
        assert_raises_rpc_error(
            -1,
            "Avalanche is not ready to poll yet.",
            self.nodes[0].isfinaltransaction,
            node.getblock(tip)["tx"][0],
            tip,
        )

        # Build a fake quorum of nodes.
        def get_quorum():
            return [
                node.add_p2p_connection(AvaP2PInterface(self, node))
                for _ in range(0, QUORUM_NODE_COUNT)
            ]

        # Pick one node from the quorum for polling.
        quorum = get_quorum()

        def is_quorum_established():
            return node.getavalancheinfo()["ready_to_poll"] is True

        self.wait_until(is_quorum_established)

        blockhash = self.generate(node, 1, sync_fun=self.no_op)[0]
        cb_txid = node.getblock(blockhash)["tx"][0]
        assert not node.isfinalblock(blockhash)
        assert not node.isfinaltransaction(cb_txid, blockhash)

        def is_finalblock(blockhash):
            can_find_inv_in_poll(quorum, int(blockhash, 16))
            return node.isfinalblock(blockhash)

        with node.assert_debug_log([f"Avalanche finalized block {blockhash}"]):
            self.wait_until(lambda: is_finalblock(blockhash))
        assert node.isfinaltransaction(cb_txid, blockhash)

        self.log.info("Check block ancestors are finalized as well")
        tip_height = node.getblockheader(blockhash)["height"]
        for height in range(0, tip_height):
            blockhash = node.getblockhash(height)
            assert node.isfinalblock(blockhash)
            txid = node.getblock(blockhash)["tx"][0]
            assert node.isfinaltransaction(txid, blockhash)

        if self.is_wallet_compiled():
            self.import_deterministic_coinbase_privkeys()

            self.log.info("Check mempool transactions are not finalized")
            # Mature some utxos
            tip = self.generate(node, COINBASE_MATURITY, sync_fun=self.no_op)[-1]
            wallet_txid = node.sendtoaddress(ADDRESS_ECREG_UNSPENDABLE, 1_000_000)
            assert wallet_txid in node.getrawmempool()
            assert_raises_rpc_error(
                -5,
                "No such transaction found in the provided block.",
                node.isfinaltransaction,
                wallet_txid,
                tip,
            )

            self.log.info(
                "A transaction is only finalized if the containing block is finalized"
            )
            tip = self.generate(node, 1, sync_fun=self.no_op)[0]
            assert wallet_txid not in node.getrawmempool()
            assert not node.isfinaltransaction(wallet_txid, tip)
            self.wait_until(lambda: is_finalblock(tip))
            assert node.isfinaltransaction(wallet_txid, tip)

            # Needs -txindex
            assert_raises_rpc_error(
                -5,
                "No such transaction. Use -txindex or provide a block hash to"
                " enable blockchain transaction queries.",
                node.isfinaltransaction,
                wallet_txid,
            )

            self.log.info("Repeat with -txindex so we don't need the blockhash")
            self.restart_node(0, self.extra_args[0] + ["-txindex"])
            quorum = get_quorum()
            self.wait_until(is_quorum_established)

            # Try to raise a -txindex not synced yet error. This is not
            # guaranteed because syncing is fast!
            try:
                node.isfinaltransaction(
                    uint256_hex(random.randint(0, 2**256 - 1)),
                )
            except JSONRPCException as e:
                assert_equal(e.error["code"], -5)

                if e.error["message"] == "No such mempool or blockchain transaction.":
                    # If we got a regular  "not found" error, the txindex should
                    # have synced.
                    assert node.getindexinfo()["txindex"]["synced"] is True
                else:
                    # Otherwise we might have successfully raised before the
                    # indexer completed. Checking the status now is useless as
                    # the indexer might have completed the synchronization in
                    # the meantime and the status is no longer relevant.
                    assert (
                        e.error["message"]
                        == "No such transaction. Blockchain transactions are still in"
                        " the process of being indexed."
                    )
            else:
                assert (
                    False
                ), "The isfinaltransaction RPC call did not throw as expected."

            sync_txindex(self, node)

            self.wait_until(lambda: is_finalblock(tip))
            assert node.isfinaltransaction(wallet_txid)

            wallet_txid = node.sendtoaddress(ADDRESS_ECREG_UNSPENDABLE, 1_000_000)
            assert wallet_txid in node.getrawmempool()
            assert not node.isfinaltransaction(wallet_txid)

            assert_raises_rpc_error(
                -5,
                "No such mempool or blockchain transaction.",
                node.isfinaltransaction,
                uint256_hex(random.randint(0, 2**256 - 1)),
            )

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

        tip = node.getbestblockhash()
        height = node.getblockcount() + 1
        time = node.getblock(tip)["time"] + 1
        block = create_block(int(tip, 16), create_coinbase(height), time)
        block.solve()

        peer = node.add_p2p_connection(AvaP2PInterface())
        msg = msg_headers()
        msg.headers = [CBlockHeader(block)]
        peer.send_message(msg)

        self.wait_until(lambda: node.getchaintips()[0]["height"] == height)
        assert_raises_rpc_error(
            -1,
            "Block data not downloaded yet.",
            node.isfinaltransaction,
            uint256_hex(random.randint(0, 2**256 - 1)),
            uint256_hex(block.hash_int),
        )


if __name__ == "__main__":
    AvalancheIsFinalTest().main()
