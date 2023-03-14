# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test longpolling with getblocktemplate."""

import random
import threading
from decimal import Decimal

from test_framework.avatools import (
    AvalancheVoteError,
    can_find_inv_in_poll,
    get_ava_p2p_interface,
)
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import get_rpc_proxy
from test_framework.wallet import MiniWallet

QUORUM_NODE_COUNT = 16


class LongpollThread(threading.Thread):
    def __init__(self, node):
        threading.Thread.__init__(self)
        # query current longpollid
        templat = node.getblocktemplate()
        self.longpollid = templat["longpollid"]
        # create a new connection to the node, we can't use the same
        # connection from two threads
        self.node = get_rpc_proxy(
            node.url, 1, timeout=600, coveragedir=node.coverage_dir
        )

    def run(self):
        self.node.getblocktemplate({"longpollid": self.longpollid})


class GetBlockTemplateLPTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.supports_cli = False
        self.noban_tx_relay = True
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-avaproofstakeutxoconfirmations=1",
                "-avacooldown=0",
                "-avaminquorumstake=0",
                "-avaminavaproofsnodecount=0",
            ],
            [],
        ]

    def run_test(self):
        self.log.info(
            "Test that longpollid doesn't change between successive getblocktemplate()"
            " invocations if nothing else happens"
        )
        self.generate(self.nodes[0], 10)
        templat = self.nodes[0].getblocktemplate()
        longpollid = templat["longpollid"]
        # longpollid should not change between successive invocations if
        # nothing else happens
        templat2 = self.nodes[0].getblocktemplate()
        assert templat2["longpollid"] == longpollid

        self.log.info("Test that longpoll waits if we do nothing")
        thr = LongpollThread(self.nodes[0])
        thr.start()
        # check that thread still lives
        # wait 5 seconds or until thread exits
        thr.join(5)
        assert thr.is_alive()

        miniwallets = [MiniWallet(node) for node in self.nodes]
        self.log.info(
            "Test that longpoll will terminate if another node generates a block"
        )
        # generate a block on another node
        self.generate(miniwallets[1], 1)
        # check that thread will exit now that new transaction entered mempool
        # wait 5 seconds or until thread exits
        thr.join(5)
        assert not thr.is_alive()

        self.log.info(
            "Test that longpoll will terminate if we generate a block ourselves"
        )
        thr = LongpollThread(self.nodes[0])
        thr.start()
        # generate a block on own node
        self.generate(miniwallets[0], 1)
        # wait 5 seconds or until thread exits
        thr.join(5)
        assert not thr.is_alive()

        self.log.info(
            "Test that introducing a new transaction into the mempool will terminate"
            " the longpoll"
        )
        thr = LongpollThread(self.nodes[0])
        thr.start()
        # generate a random transaction and submit it
        min_relay_fee = self.nodes[0].getnetworkinfo()["relayfee"]
        fee_rate = min_relay_fee + Decimal("0.10") * random.randint(0, 20)
        miniwallets[0].send_self_transfer(
            from_node=random.choice(self.nodes), fee_rate=fee_rate
        )
        # after 5 seconds (1 minute on mainnet and testnet), every second (10s
        # on mainnet and testnet) the mempool is probed, so in 7 seconds it
        # should have returned
        thr.join(7)
        assert not thr.is_alive()

        self.log.info("Test that avalanche rejecting a block terminates the longpoll")

        # Build a quorum
        quorum = [
            get_ava_p2p_interface(self, self.nodes[0]) for _ in range(QUORUM_NODE_COUNT)
        ]
        assert self.nodes[0].getavalancheinfo()["ready_to_poll"] is True

        tip = self.nodes[0].getbestblockhash()

        def has_rejected_tip():
            return (
                can_find_inv_in_poll(
                    quorum, int(tip, 16), response=AvalancheVoteError.PARKED
                )
                and self.nodes[0].getbestblockhash() != tip
            )

        thr = LongpollThread(self.nodes[0])
        thr.start()

        self.wait_until(has_rejected_tip)

        # wait 5 seconds or until thread exits
        thr.join(5)
        assert not thr.is_alive()

        self.log.info(
            "Test that avalanche reconsidering a block terminates the longpoll"
        )

        def has_accepted_tip():
            return (
                can_find_inv_in_poll(
                    quorum, int(tip, 16), response=AvalancheVoteError.ACCEPTED
                )
                and self.nodes[0].getbestblockhash() == tip
            )

        thr = LongpollThread(self.nodes[0])
        thr.start()

        self.wait_until(has_accepted_tip)

        # wait 5 seconds or until thread exits
        thr.join(5)
        assert not thr.is_alive()

        self.log.info(
            "Test that avalanche rejecting/reconsidering quickly a block terminates the longpoll"
        )

        thr = LongpollThread(self.nodes[0])
        thr.start()

        self.wait_until(has_rejected_tip)
        self.wait_until(has_accepted_tip)

        # wait 5 seconds or until thread exits
        thr.join(5)
        assert not thr.is_alive()

        self.log.info(
            "Test that avalanche accepting/rejecting quickly a block terminates the longpoll"
        )

        thr = LongpollThread(self.nodes[0])
        thr.start()

        tip = self.generate(self.nodes[0], 1, sync_fun=self.no_op)[0]
        self.wait_until(has_rejected_tip)

        # wait 5 seconds or until thread exits
        thr.join(5)
        assert not thr.is_alive()


if __name__ == "__main__":
    GetBlockTemplateLPTest().main()
