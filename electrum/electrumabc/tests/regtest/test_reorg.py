#!/usr/bin/env python3
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

import pytest
from jsonrpcclient import request

from .util import docker_compose_command  # noqa: F401
from .util import docker_compose_file  # noqa: F401
from .util import fulcrum_service  # noqa: F401
from .util import (
    EC_DAEMON_RPC_URL,
    SUPPORTED_PLATFORM,
    bitcoind_rpc_connection,
    poll_for_answer,
    wait_for_len,
    wait_until,
)

if not SUPPORTED_PLATFORM:
    pytest.skip(allow_module_level=True)


def test_reorg(fulcrum_service):  # noqa: F811
    """
    Mine a wallet tx on the chain tip, then reorg 3 blocks, mine it again (at
    previous height - 2), check that Electrum ABC is notified of everything that is
    happening on the chain and properly updates the transaction history.
    """
    # Get a wallet address
    addr = poll_for_answer(EC_DAEMON_RPC_URL, request("getunusedaddress"))

    # An address that will not affect the wallet's history
    address_not_mine = "ecregtest:qz5j83ez703wvlwpqh94j6t45f8dn2afjgr4q2cuzz"
    poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("ismine", params={"address": address_not_mine}),
        expected_answer=("$", False),
    )

    bitcoind = bitcoind_rpc_connection()

    # Mine 2 empty blocks
    blockhash_to_invalidate = bitcoind.generatetoaddress(2, address_not_mine)[0]

    # Add a transaction to the wallet's history
    bitcoind.sendtoaddress(addr, 1_000)

    hist = wait_for_len(request("history"), 1)
    # Electrum ABC assigns a block height of 0 for mempool transactions with confirmed
    # parents.
    tx_height = hist[0]["height"]
    assert tx_height == 0
    txid = hist[0]["txid"]

    # Mine the tx into a block
    bitcoind.generatetoaddress(1, address_not_mine)
    blockheight = bitcoind.getblockchaininfo()["blocks"]

    def is_block_height_set_for_tx() -> bool:
        hist = poll_for_answer(EC_DAEMON_RPC_URL, request("history"))
        return hist[0]["height"] == blockheight

    wait_until(is_block_height_set_for_tx)

    # Now lets invalidate a few blocks and check the tx is still there, but the block
    # height is reverted to 0 as the tx is added back to the mempool.
    bitcoind.invalidateblock(blockhash_to_invalidate)
    hist = poll_for_answer(
        EC_DAEMON_RPC_URL, request("history"), expected_answer=("[0].height", 0)
    )
    assert hist[0]["txid"] == txid

    # Mine the tx again, then mine a few more empty blocks to advance the chain past the
    # previous tip, check that the height is correctly updated.
    bitcoind.generatetoaddress(4, address_not_mine)
    poll_for_answer(
        EC_DAEMON_RPC_URL,
        request("history"),
        expected_answer=("[0].height", blockheight - 2),
    )
