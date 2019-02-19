#!/usr/bin/env python3
# Copyright (c) 2014-2016 The Bitcoin Core developers
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the -alertnotify, -blocknotify and -walletnotify options."""
import os

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, wait_until, connect_nodes_bi

FORK_WARNING_MESSAGE = "Warning: Large-work fork detected, forking after block {}\n"


class NotificationsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True

    def setup_network(self):
        self.alert_filename = os.path.join(self.options.tmpdir, "alert.txt")
        self.block_filename = os.path.join(self.options.tmpdir, "blocks.txt")
        self.tx_filename = os.path.join(
            self.options.tmpdir, "transactions.txt")

        # -alertnotify and -blocknotify on node0, walletnotify on node1
        self.extra_args = [["-blockversion=2",
                            "-alertnotify=echo %s >> {}".format(
                                self.alert_filename),
                            "-blocknotify=echo %s >> {}".format(self.block_filename)],
                           ["-blockversion=211",
                            "-rescan",
                            "-walletnotify=echo %s >> {}".format(self.tx_filename)]]
        super().setup_network()

    def run_test(self):
        self.log.info("test -blocknotify")
        block_count = 10
        blocks = self.nodes[1].generate(block_count)

        # wait at most 10 seconds for expected file size before reading the content
        wait_until(lambda: os.path.isfile(self.block_filename) and os.stat(
            self.block_filename).st_size >= (block_count * 65), timeout=10)

        # file content should equal the generated blocks hashes
        with open(self.block_filename, 'r') as f:
            assert_equal(sorted(blocks), sorted(f.read().splitlines()))

        self.log.info("test -walletnotify")
        # wait at most 10 seconds for expected file size before reading the content
        wait_until(lambda: os.path.isfile(self.tx_filename) and os.stat(
            self.tx_filename).st_size >= (block_count * 65), timeout=10)

        # file content should equal the generated transaction hashes
        txids_rpc = list(
            map(lambda t: t['txid'], self.nodes[1].listtransactions("*", block_count)))
        with open(self.tx_filename, 'r') as f:
            assert_equal(sorted(txids_rpc), sorted(f.read().splitlines()))
        os.remove(self.tx_filename)

        self.log.info("test -walletnotify after rescan")
        # restart node to rescan to force wallet notifications
        self.restart_node(1)
        connect_nodes_bi(self.nodes[0], self.nodes[1])

        wait_until(lambda: os.path.isfile(self.tx_filename) and os.stat(
            self.tx_filename).st_size >= (block_count * 65), timeout=10)

        # file content should equal the generated transaction hashes
        txids_rpc = list(
            map(lambda t: t['txid'], self.nodes[1].listtransactions("*", block_count)))
        with open(self.tx_filename, 'r') as f:
            assert_equal(sorted(txids_rpc), sorted(f.read().splitlines()))

        # Mine another 41 up-version blocks. -alertnotify should trigger on the 51st.
        self.log.info("test -alertnotify for bip9")
        self.nodes[1].generate(41)
        self.sync_all()

        # Give bitcoind 10 seconds to write the alert notification
        wait_until(lambda: os.path.isfile(self.alert_filename)
                   and os.path.getsize(self.alert_filename), timeout=10)

        with open(self.alert_filename, 'r', encoding='utf8') as f:
            alert_text = f.read()

        # Mine more up-version blocks, should not get more alerts:
        self.nodes[1].generate(2)
        self.sync_all()

        with open(self.alert_filename, 'r', encoding='utf8') as f:
            alert_text2 = f.read()
        os.remove(self.alert_filename)

        self.log.info(
            "-alertnotify should not continue notifying for more unknown version blocks")
        assert_equal(alert_text, alert_text2)

        # Create an invalid chain and ensure the node warns.
        self.log.info("test -alertnotify for forked chain")
        fork_block = self.nodes[0].getbestblockhash()
        self.nodes[0].generate(1)
        invalid_block = self.nodes[0].getbestblockhash()
        self.nodes[0].generate(7)

        # Invalidate a large branch, which should trigger an alert.
        self.nodes[0].invalidateblock(invalid_block)

        # Give bitcoind 10 seconds to write the alert notification
        wait_until(lambda: os.path.isfile(self.alert_filename)
                   and os.path.getsize(self.alert_filename), timeout=10)

        self.log.info(self.alert_filename)
        with open(self.alert_filename, 'r', encoding='utf8') as f:
            assert_equal(f.read(), (FORK_WARNING_MESSAGE.format(fork_block)))


if __name__ == '__main__':
    NotificationsTest().main()
