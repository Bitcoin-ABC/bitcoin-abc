#
# Electrum ABC - lightweight eCash client
# Copyright (C) 2023 The Electrum ABC developers
#
# Permission is hereby granted, free of charge, to any person
# obtaining a copy of this software and associated documentation files
# (the "Software"), to deal in the Software without restriction,
# including without limitation the rights to use, copy, modify, merge,
# publish, distribute, sublicense, and/or sell copies of the Software,
# and to permit persons to whom the Software is furnished to do so,
# subject to the following conditions:
#
# The above copyright notice and this permission notice shall be
# included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
# EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
# MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
# NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
# BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
# ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
# CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.
"""
Test how the software behaves in a reorg
"""

import time
import unittest

from jsonrpcclient import request

from .framework import ElectrumABCTestCase
from .util import (
    COINBASE_MATURITY,
    EC_DAEMON_RPC_URL,
    poll_for_answer,
    wait_for_len,
    wait_until,
)

# An address that will not affect the wallet's history
ADDRESS_NOT_MINE = "ecregtest:qz5j83ez703wvlwpqh94j6t45f8dn2afjgr4q2cuzz"


class TestReorg(ElectrumABCTestCase):
    def check_tip_height(
        self, bitcoind_height: int, server_height: int, local_height: int
    ) -> bool:
        """Check that we get the expected tip heights.
        The server_height field returned by the `getinfo` RPC is usually fulcrum's tip,
        but it could be 0 if Electrum ABC is not connected to any server.
        """
        info = poll_for_answer(EC_DAEMON_RPC_URL, request("getinfo"))
        return (
            self.node.getblockchaininfo()["blocks"],
            info["server_height"],
            info["blockchain_height"],
        ) == (bitcoind_height, server_height, local_height)

    def test_1_block_reorg(self):
        """
        Historically in Bitcoin (Cash) a reorg meant that a branch of the blockchain
        was replaced with a strictly longer branch of blocks.
        With Avalanche on eCash, a single block initially accepted can be parked and
        reorg-ed by a single other block, which leaves Electrum in a state that was not
        expected by the initial developers until another block is mined to make one chain
        longer. From the perspective of Electrum ABC, all the servers are on a potentially
        shorter or same length fork.
        """
        now = int(time.time())
        self.node.setmocktime(now)
        height = self.node.getblockchaininfo()["blocks"]
        wait_until(lambda: self.check_tip_height(height, height, height))

        blockhash_to_park = self.generatetoaddress(1, ADDRESS_NOT_MINE)[0]
        wait_until(lambda: self.check_tip_height(height + 1, height + 1, height + 1))

        self.node.parkblock(blockhash_to_park)
        # Sync fulcrum and Electrum. The local height is the longest local chain.
        wait_until(
            lambda: self.check_tip_height(
                bitcoind_height=height, server_height=height, local_height=height + 1
            )
        )

        # bump the mocktime so the block hash will be different for this height
        self.node.setmocktime(now + 100)
        self.generatetoaddress(1, ADDRESS_NOT_MINE)
        wait_until(lambda: self.check_tip_height(height + 1, height + 1, height + 1))

        # Advance the chain past the previous tip
        self.generatetoaddress(1, ADDRESS_NOT_MINE)
        wait_until(lambda: self.check_tip_height(height + 2, height + 2, height + 2))

    def test_reorg(self):
        """
        Mine a wallet tx on the chain tip, then reorg 3 blocks, mine it again (at
        previous height - 2), check that Electrum ABC is notified of everything that is
        happening on the chain and properly updates the transaction history.
        """
        # Get a wallet address
        addr = poll_for_answer(EC_DAEMON_RPC_URL, request("getunusedaddress"))

        poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("ismine", params={"address": ADDRESS_NOT_MINE}),
            expected_answer=("$", False),
        )

        # Mine a transaction, send the block reward to the Electrum ABC wallet
        self.generatetoaddress(1, addr)
        hist = wait_for_len(request("history"), 1)
        parent_txid = hist[0]["txid"]
        parent_height = hist[0]["height"]

        assert self.check_tip_height(
            bitcoind_height=parent_height,
            server_height=parent_height,
            local_height=parent_height,
        )

        # Make the parent coinbase UTXO mature
        self.generatetoaddress(COINBASE_MATURITY, ADDRESS_NOT_MINE)
        # Note that the "confirmations" field in the history is the number of confirmations
        # for the tx, not for the block. The block containing the tx counts for +1.
        wait_until(
            lambda: poll_for_answer(EC_DAEMON_RPC_URL, request("history"))[0][
                "confirmations"
            ]
            == COINBASE_MATURITY + 1
        )

        # Mine 2 empty blocks. The first one will be invalidated
        blockhash_to_park = self.generatetoaddress(2, ADDRESS_NOT_MINE)[0]

        # Add another transaction to the wallet's history, spending the previous UTXO
        tx_hex = poll_for_answer(
            EC_DAEMON_RPC_URL,
            request(
                "payto",
                params={"destination": addr, "amount": 1_000, "addtransaction": True},
            ),
        )["hex"]
        success, txid = poll_for_answer(
            EC_DAEMON_RPC_URL, request("broadcast", params={"tx": tx_hex})
        )
        assert success

        hist = wait_for_len(request("history"), 2)
        # The history is in reverse block height order, with mempool txs first, then
        # txs from the most recent blocks first.
        # Electrum ABC assigns a block height of 0 for mempool transactions with confirmed
        # parents.
        assert hist[0]["txid"] == txid
        assert hist[0]["height"] == 0
        assert hist[1]["txid"] == parent_txid
        assert hist[1]["height"] == parent_height

        # Mine the new tx into a block
        self.generatetoaddress(1, ADDRESS_NOT_MINE)
        blockheight = self.node.getblockchaininfo()["blocks"]

        # Invalidating 2 blocks prior to the one containing the child tx should not
        # affect the maturity of the parent tx, so the tx will remain a valid mempool
        # tx.
        assert blockheight == parent_height + COINBASE_MATURITY + 3

        def is_block_height_set_for_tx() -> bool:
            hist = poll_for_answer(EC_DAEMON_RPC_URL, request("history"))
            return hist[0]["height"] == blockheight

        wait_until(is_block_height_set_for_tx)
        assert self.check_tip_height(blockheight, blockheight, blockheight)

        # Now lets invalidate a few blocks and check the tx is still there, but its block
        # height is reverted to 0 as the tx is added back to the mempool.
        self.node.parkblock(blockhash_to_park)
        hist = poll_for_answer(
            EC_DAEMON_RPC_URL, request("history"), expected_answer=("[0].height", 0)
        )
        assert hist[0]["txid"] == txid

        # We invalidated 3 blocks. The wallet is aware that the server height changed
        # by now, but the local tip is still the highest block we know of.
        assert self.check_tip_height(
            bitcoind_height=blockheight - 3,
            server_height=blockheight - 3,
            local_height=blockheight,
        )

        # Mine the tx again, then mine a few more empty blocks to advance the chain past the
        # previous tip, check that the height is correctly updated for the transaction,
        # the server and the local headers chain.
        self.generatetoaddress(4, ADDRESS_NOT_MINE)
        poll_for_answer(
            EC_DAEMON_RPC_URL,
            request("history"),
            expected_answer=("[0].height", blockheight - 2),
        )
        wait_until(
            lambda: self.check_tip_height(
                blockheight + 1, blockheight + 1, blockheight + 1
            )
        )


if __name__ == "__main__":
    unittest.main()
