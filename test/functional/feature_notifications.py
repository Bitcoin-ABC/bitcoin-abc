#!/usr/bin/env python3
# Copyright (c) 2014-2019 The Bitcoin Core developers
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the -alertnotify, -blocknotify and -walletnotify options."""
import os

from test_framework.address import ADDRESS_BCHREG_UNSPENDABLE
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import (
    assert_equal,
    connect_nodes,
    wait_until
)

FORK_WARNING_MESSAGE = "Warning: Large-work fork detected, forking after block {}"


class NotificationsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True

    def setup_network(self):
        self.alertnotify_dir = os.path.join(self.options.tmpdir, "alertnotify")
        self.blocknotify_dir = os.path.join(self.options.tmpdir, "blocknotify")
        self.walletnotify_dir = os.path.join(
            self.options.tmpdir, "walletnotify")
        os.mkdir(self.alertnotify_dir)
        os.mkdir(self.blocknotify_dir)
        os.mkdir(self.walletnotify_dir)

        # -alertnotify and -blocknotify on node0, walletnotify on node1
        self.extra_args = [["-alertnotify=echo > {}".format(
            os.path.join(self.alertnotify_dir, '%s')),
            "-blocknotify=echo > {}".format(os.path.join(self.blocknotify_dir, '%s'))],
            ["-blockversion=211",
             "-rescan",
             "-walletnotify=echo > {}".format(os.path.join(self.walletnotify_dir, '%s'))]]
        super().setup_network()

    def run_test(self):
        self.log.info("test -blocknotify")
        block_count = 10
        blocks = self.nodes[1].generatetoaddress(
            block_count,
            self.nodes[1].getnewaddress() if self.is_wallet_compiled()
            else ADDRESS_BCHREG_UNSPENDABLE
        )

        # wait at most 10 seconds for expected number of files before reading
        # the content
        wait_until(
            lambda: len(
                os.listdir(
                    self.blocknotify_dir)) == block_count,
            timeout=10)

        # directory content should equal the generated blocks hashes
        assert_equal(sorted(blocks), sorted(os.listdir(self.blocknotify_dir)))

        if self.is_wallet_compiled():
            self.log.info("test -walletnotify")
            # wait at most 10 seconds for expected number of files before reading
            # the content
            wait_until(
                lambda: len(
                    os.listdir(
                        self.walletnotify_dir)) == block_count,
                timeout=10)

            # directory content should equal the generated transaction hashes
            txids_rpc = list(
                map(lambda t: t['txid'], self.nodes[1].listtransactions("*", block_count)))
            assert_equal(
                sorted(txids_rpc), sorted(
                    os.listdir(
                        self.walletnotify_dir)))
            self.stop_node(1)
            for tx_file in os.listdir(self.walletnotify_dir):
                os.remove(os.path.join(self.walletnotify_dir, tx_file))

            self.log.info("test -walletnotify after rescan")
            # restart node to rescan to force wallet notifications
            self.start_node(1)
            connect_nodes(self.nodes[0], self.nodes[1])

            wait_until(
                lambda: len(
                    os.listdir(
                        self.walletnotify_dir)) == block_count,
                timeout=10)

            # directory content should equal the generated transaction hashes
            txids_rpc = list(
                map(lambda t: t['txid'], self.nodes[1].listtransactions("*", block_count)))
            assert_equal(
                sorted(txids_rpc), sorted(
                    os.listdir(
                        self.walletnotify_dir)))

        # Create an invalid chain and ensure the node warns.
        self.log.info("test -alertnotify for forked chain")
        fork_block = self.nodes[0].getbestblockhash()
        self.nodes[0].generatetoaddress(1, ADDRESS_BCHREG_UNSPENDABLE)
        invalid_block = self.nodes[0].getbestblockhash()
        self.nodes[0].generatetoaddress(7, ADDRESS_BCHREG_UNSPENDABLE)

        # Invalidate a large branch, which should trigger an alert.
        self.nodes[0].invalidateblock(invalid_block)

        # Give bitcoind 10 seconds to write the alert notification
        wait_until(lambda: len(os.listdir(self.alertnotify_dir)), timeout=10)

        # The notification command is unable to properly handle the spaces on
        # windows. Skip the content check in this case.
        if os.name != 'nt':
            assert FORK_WARNING_MESSAGE.format(
                fork_block) in os.listdir(self.alertnotify_dir)

        for notify_file in os.listdir(self.alertnotify_dir):
            os.remove(os.path.join(self.alertnotify_dir, notify_file))


if __name__ == '__main__':
    NotificationsTest().main()
