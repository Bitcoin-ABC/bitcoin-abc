# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Tests for Bitcoin ABC mining with heartbeat
"""

import threading
import time

from test_framework.avatools import can_find_inv_in_poll, get_ava_p2p_interface
from test_framework.messages import uint256_from_compact
from test_framework.p2p import P2PInterface
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    assert_greater_than,
    assert_greater_than_or_equal,
    get_rpc_proxy,
)
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16


class LongpollThread(threading.Thread):
    def __init__(self, node, longpollid):
        threading.Thread.__init__(self)
        self.longpollid = longpollid
        # create a new connection to the node, we can't use the same
        # connection from two threads
        self.node = get_rpc_proxy(
            node.url, 1, timeout=600, coveragedir=node.coverage_dir
        )

    def run(self):
        self.longpoll_template = self.node.getblocktemplate(
            {"longpollid": self.longpollid}
        )


class AbcMiningHeartbeatTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-enablertt",
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
                "-persistavapeers=0",
            ],
        ]

    def check_rtt(self):
        node = self.nodes[0]

        now = int(time.time())

        node.add_p2p_connection(P2PInterface())

        node.setmocktime(now)

        self.log.info("Check the block template is updated with the relevant RTT info")

        def check_gbt_rtt(gbt, prev_header_time):
            tiphash = node.getbestblockhash()
            tip_verbose = node.getblock(tiphash, 2)
            assert "rtt" in gbt
            assert_equal(gbt["previousblockhash"], tiphash)
            assert_equal(gbt["rtt"]["prevheadertime"], prev_header_time)
            assert_equal(gbt["rtt"]["prevbits"], tip_verbose["bits"])
            assert_equal(gbt["rtt"]["nodetime"], node.gettime()["adjusted"])
            assert "nexttarget" in gbt["rtt"]

        self.generate(node, 20)

        node.bumpmocktime(10)
        check_gbt_rtt(node.getblocktemplate(), [now] * 5)
        node.bumpmocktime(10)
        check_gbt_rtt(node.getblocktemplate(), [now] * 5)

        self.generate(node, 1)
        now += 20
        gbt = node.getblocktemplate()
        # The last block (indice 1) is at now, the previous ones (indices 2, 5,
        # 11, 17) are at now - 20
        check_gbt_rtt(gbt, [now] + [now - 20] * 4)

        self.log.info(
            "Check the node tries to mine blocks with the real time difficulty"
        )

        def get_quorum():
            quorum = []
            for _ in range(QUORUM_NODE_COUNT):
                node.bumpmocktime(600)
                quorum.append(get_ava_p2p_interface(self, node))

            return quorum

        quorum = get_quorum()
        assert node.getavalancheinfo()["ready_to_poll"] is True

        def has_finalized_tip(tip_expected):
            hash_tip_final = int(tip_expected, 16)
            can_find_inv_in_poll(quorum, hash_tip_final)
            return node.isfinalblock(tip_expected)

        tip = self.generate(node, 1)[0]
        self.wait_until(lambda: has_finalized_tip(tip))

        # Mining while the difficulty is high causes the block to be parked
        with node.assert_debug_log(["policy-bad-rtt"]):
            self.generate(node, 1)
        assert_equal(node.getbestblockhash(), tip)

        # The target should decrease over time
        last_target = uint256_from_compact(int(gbt["rtt"]["nexttarget"], 16))
        for _ in range(10):
            node.bumpmocktime(10)
            gbt = node.getblocktemplate()

            assert_greater_than(
                (target := uint256_from_compact(int(gbt["rtt"]["nexttarget"], 16))),
                last_target,
            )
            assert_greater_than_or_equal(int(gbt["target"], 16), target)

            last_target = target

        # After some time the difficulty remain constant
        node.bumpmocktime(600)
        last_target = uint256_from_compact(
            int(node.getblocktemplate()["rtt"]["nexttarget"], 16)
        )
        for _ in range(10):
            node.bumpmocktime(10)
            gbt = node.getblocktemplate()

            assert_equal(
                (target := uint256_from_compact(int(gbt["rtt"]["nexttarget"], 16))),
                last_target,
            )
            assert_equal(int(gbt["target"], 16), target)

            last_target = target

        # Now we manage to mine the block at mininum difficulty
        assert_equal(len(self.generate(node, 1)), 1)

        self.log.info("Check the RTT is updated when longpoll returns")

        node.bumpmocktime(200)

        now = node.gettime()["adjusted"]

        wallet = MiniWallet(node)
        self.generate(wallet, 1)

        # Note that get_ava_p2p_interface mines a block to generate the proof
        # associated with the peer, so there is one block mined for each peer in
        # the quorum.
        prev_header_times = [
            # Block N-1
            now,
            # Block N-2: 200s
            now - 200,
            # Block N-5: 200s + 100s + 600s + 100s from the test + 600s from the quorum
            now - 1600,
            # Block N-11: 200s + 100s + 600s + 100s from the test + 6 * 600s from the quorum
            now - 5200,
            # Block N-17: 200s + 100s + 600s + 100s from the test + 12 * 600s from the quorum
            now - 8800,
        ]

        gbt = node.getblocktemplate()
        check_gbt_rtt(gbt, prev_header_times)

        thr = LongpollThread(node, gbt["longpollid"])
        thr.start()

        node.bumpmocktime(60)
        mempool_tx = wallet.send_self_transfer(from_node=node)
        assert mempool_tx["txid"] in node.getrawmempool()

        # after 5 seconds (1 minute on mainnet and testnet), every second (10s
        # on mainnet and testnet) the mempool is probed, so in 7 seconds it
        # should have returned
        thr.join(7)
        assert not thr.is_alive()

        check_gbt_rtt(thr.longpoll_template, prev_header_times)
        # The difficulty should be strictly lower after 60s
        assert_greater_than(
            uint256_from_compact(int(thr.longpoll_template["rtt"]["nexttarget"], 16)),
            uint256_from_compact(int(gbt["rtt"]["nexttarget"], 16)),
        )

    def run_test(self):
        self.check_rtt()


if __name__ == "__main__":
    AbcMiningHeartbeatTest().main()
