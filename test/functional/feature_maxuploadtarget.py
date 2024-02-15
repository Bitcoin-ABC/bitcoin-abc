# Copyright (c) 2015-2016 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test behavior of -maxuploadtarget.

* Verify that getdata requests for old blocks (>1week) are dropped
if uploadtarget has been reached.
* Verify that getdata requests for recent blocks are respected even
if uploadtarget has been reached.
* Verify that the upload counters are reset after 24 hours.
"""

import time
from collections import defaultdict

from test_framework.blocktools import mine_big_block
from test_framework.cdefs import LEGACY_MAX_BLOCK_SIZE
from test_framework.messages import MSG_BLOCK, CInv, msg_getdata
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class TestP2PConn(P2PInterface):
    def __init__(self):
        super().__init__()
        self.block_receive_map = defaultdict(int)

    def on_inv(self, message):
        pass

    def on_block(self, message):
        message.block.calc_sha256()
        self.block_receive_map[message.block.sha256] += 1


class MaxUploadTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        # Start a node with maxuploadtarget of 200 MB (/24h)
        self.extra_args = [
            [
                "-maxuploadtarget=200",
                "-acceptnonstdtxn=1",
            ]
        ]
        self.supports_cli = False

        # Cache for utxos, as the listunspent may take a long time later in the
        # test
        self.utxo_cache = []

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        # Before we connect anything, we first set the time on the node
        # to be in the past, otherwise things break because the CNode
        # time counters can't be reset backward after initialization
        old_time = int(time.time() - 2 * 60 * 60 * 24 * 7)
        self.nodes[0].setmocktime(old_time)

        # Generate some old blocks
        self.generate(self.nodes[0], 130)

        # p2p_conns[0] will only request old blocks
        # p2p_conns[1] will only request new blocks
        # p2p_conns[2] will test resetting the counters
        p2p_conns = []

        for _ in range(3):
            p2p_conns.append(self.nodes[0].add_p2p_connection(TestP2PConn()))

        # Now mine a big block
        mine_big_block(self, self.nodes[0], self.utxo_cache)

        # Store the hash; we'll request this later
        big_old_block = self.nodes[0].getbestblockhash()
        old_block_size = self.nodes[0].getblock(big_old_block, True)["size"]
        big_old_block = int(big_old_block, 16)

        # Advance to two days ago
        self.nodes[0].setmocktime(int(time.time()) - 2 * 60 * 60 * 24)

        # Mine one more block, so that the prior block looks old
        mine_big_block(self, self.nodes[0], self.utxo_cache)

        # We'll be requesting this new block too
        big_new_block = self.nodes[0].getbestblockhash()
        big_new_block = int(big_new_block, 16)

        # p2p_conns[0] will test what happens if we just keep requesting the
        # the same big old block too many times (expect: disconnect)

        getdata_request = msg_getdata()
        getdata_request.inv.append(CInv(MSG_BLOCK, big_old_block))

        max_bytes_per_day = 200 * 1024 * 1024
        daily_buffer = 144 * LEGACY_MAX_BLOCK_SIZE
        max_bytes_available = max_bytes_per_day - daily_buffer
        success_count = max_bytes_available // old_block_size

        # 144MB will be reserved for relaying new blocks, so expect this to
        # succeed for ~70 tries.
        for i in range(success_count):
            p2p_conns[0].send_and_ping(getdata_request)
            assert_equal(p2p_conns[0].block_receive_map[big_old_block], i + 1)

        assert_equal(len(self.nodes[0].getpeerinfo()), 3)
        # At most a couple more tries should succeed (depending on how long
        # the test has been running so far).
        for _ in range(3):
            p2p_conns[0].send_message(getdata_request)
        p2p_conns[0].wait_for_disconnect()
        assert_equal(len(self.nodes[0].getpeerinfo()), 2)
        self.log.info("Peer 0 disconnected after downloading old block too many times")

        # Requesting the current block on p2p_conns[1] should succeed indefinitely,
        # even when over the max upload target.
        # We'll try 200 times
        getdata_request.inv = [CInv(MSG_BLOCK, big_new_block)]
        for i in range(200):
            p2p_conns[1].send_and_ping(getdata_request)
            assert_equal(p2p_conns[1].block_receive_map[big_new_block], i + 1)

        self.log.info("Peer 1 able to repeatedly download new block")

        # But if p2p_conns[1] tries for an old block, it gets disconnected
        # too.
        getdata_request.inv = [CInv(MSG_BLOCK, big_old_block)]
        p2p_conns[1].send_message(getdata_request)
        p2p_conns[1].wait_for_disconnect()
        assert_equal(len(self.nodes[0].getpeerinfo()), 1)

        self.log.info("Peer 1 disconnected after trying to download old block")

        self.log.info("Advancing system time on node to clear counters...")

        # If we advance the time by 24 hours, then the counters should reset,
        # and p2p_conns[2] should be able to retrieve the old block.
        self.nodes[0].setmocktime(int(time.time()))
        p2p_conns[2].sync_with_ping()
        p2p_conns[2].send_and_ping(getdata_request)
        assert_equal(p2p_conns[2].block_receive_map[big_old_block], 1)

        self.log.info("Peer 2 able to download old block")

        self.nodes[0].disconnect_p2ps()

        self.log.info(
            "Restarting node 0 with download permission and 1MB maxuploadtarget"
        )
        self.restart_node(
            0,
            [
                "-whitelist=download@127.0.0.1",
                "-maxuploadtarget=1",
                "-blockmaxsize=999000",
            ],
        )

        # Reconnect to self.nodes[0]
        peer = self.nodes[0].add_p2p_connection(TestP2PConn())

        # retrieve 20 blocks which should be enough to break the 1MB limit
        getdata_request.inv = [CInv(MSG_BLOCK, big_new_block)]
        for i in range(20):
            peer.send_and_ping(getdata_request)
            assert_equal(peer.block_receive_map[big_new_block], i + 1)

        getdata_request.inv = [CInv(MSG_BLOCK, big_old_block)]
        peer.send_and_ping(getdata_request)

        self.log.info(
            "Peer still connected after trying to download old block (download"
            " permission)"
        )
        peer_info = self.nodes[0].getpeerinfo()
        # node is still connected
        assert_equal(len(peer_info), 1)
        assert_equal(peer_info[0]["permissions"], ["download"])


if __name__ == "__main__":
    MaxUploadTest().main()
