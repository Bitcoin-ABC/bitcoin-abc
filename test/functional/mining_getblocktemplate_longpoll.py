# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test longpolling with getblocktemplate."""

import random
import threading
from decimal import Decimal

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import get_rpc_proxy
from test_framework.wallet import MiniWallet


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

    def run_test(self):
        self.log.info(
            "Warning: this test will take about 70 seconds in the best case. Be"
            " patient."
        )
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
        # after one minute, every 10 seconds the mempool is probed, so in 80
        # seconds it should have returned
        thr.join(60 + 20)
        assert not thr.is_alive()


if __name__ == "__main__":
    GetBlockTemplateLPTest().main()
