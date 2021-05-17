# Copyright (c) 2014-2019 The Bitcoin Core developers
# Copyright (c) 2018 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the -alertnotify, -blocknotify and -walletnotify options."""
import os

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE, keyhash_to_p2pkh
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal

FORK_WARNING_MESSAGE = "Warning: Large-work fork detected, forking after block {}"

# Linux allow all characters other than \x00
# Windows disallow control characters (0-31) and /\?%:|"<>
FILE_CHAR_START = 32 if os.name == "nt" else 1
FILE_CHAR_END = 128
FILE_CHAR_BLACKLIST = '/\\?%*:|"<>' if os.name == "nt" else "/"


def notify_outputname(walletname, txid):
    return txid if os.name == "nt" else f"{walletname}_{txid}"


class NotificationsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.setup_clean_chain = True

    def setup_network(self):
        self.wallet = "".join(
            chr(i)
            for i in range(FILE_CHAR_START, FILE_CHAR_END)
            if chr(i) not in FILE_CHAR_BLACKLIST
        )
        self.alertnotify_dir = os.path.join(self.options.tmpdir, "alertnotify")
        self.blocknotify_dir = os.path.join(self.options.tmpdir, "blocknotify")
        self.walletnotify_dir = os.path.join(self.options.tmpdir, "walletnotify")
        os.mkdir(self.alertnotify_dir)
        os.mkdir(self.blocknotify_dir)
        os.mkdir(self.walletnotify_dir)

        # -alertnotify and -blocknotify on node0, walletnotify on node1
        self.extra_args = [
            [
                f"-alertnotify=echo > {os.path.join(self.alertnotify_dir, '%s')}",
                f"-blocknotify=echo > {os.path.join(self.blocknotify_dir, '%s')}",
            ],
            [
                "-rescan",
                (
                    "-walletnotify=echo >"
                    f" {os.path.join(self.walletnotify_dir, notify_outputname('%w', '%s'))}"
                ),
            ],
        ]
        self.wallet_names = [self.default_wallet_name, self.wallet]
        super().setup_network()

    def run_test(self):
        self.log.info("test -blocknotify")
        block_count = 10
        blocks = self.generatetoaddress(
            self.nodes[1],
            block_count,
            (
                self.nodes[1].getnewaddress()
                if self.is_wallet_compiled()
                else ADDRESS_ECREG_UNSPENDABLE
            ),
        )

        # wait at most 10 seconds for expected number of files before reading
        # the content
        self.wait_until(
            lambda: len(os.listdir(self.blocknotify_dir)) == block_count, timeout=10
        )

        # directory content should equal the generated blocks hashes
        assert_equal(sorted(blocks), sorted(os.listdir(self.blocknotify_dir)))

        if self.is_wallet_compiled():
            self.log.info("test -walletnotify")
            # wait at most 10 seconds for expected number of files before
            # reading the content
            self.wait_until(
                lambda: len(os.listdir(self.walletnotify_dir)) == block_count,
                timeout=10,
            )

            # directory content should equal the generated transaction hashes
            txids_rpc = [
                notify_outputname(self.wallet, t["txid"])
                for t in self.nodes[1].listtransactions("*", block_count)
            ]
            assert_equal(sorted(txids_rpc), sorted(os.listdir(self.walletnotify_dir)))
            self.stop_node(1)
            for tx_file in os.listdir(self.walletnotify_dir):
                os.remove(os.path.join(self.walletnotify_dir, tx_file))

            self.log.info("test -walletnotify after rescan")
            # restart node to rescan to force wallet notifications
            self.start_node(1)
            self.connect_nodes(0, 1)

            self.wait_until(
                lambda: len(os.listdir(self.walletnotify_dir)) == block_count,
                timeout=10,
            )

            # directory content should equal the generated transaction hashes
            txids_rpc = [
                notify_outputname(self.wallet, t["txid"])
                for t in self.nodes[1].listtransactions("*", block_count)
            ]
            assert_equal(sorted(txids_rpc), sorted(os.listdir(self.walletnotify_dir)))
            for tx_file in os.listdir(self.walletnotify_dir):
                os.remove(os.path.join(self.walletnotify_dir, tx_file))

            # Conflicting transactions tests. Give node 0 same wallet seed as
            # node 1, generate spends from node 0, and check notifications
            # triggered by node 1
            self.log.info("test -walletnotify with conflicting transactions")
            self.nodes[0].sethdseed(
                seed=self.nodes[1].dumpprivkey(
                    keyhash_to_p2pkh(
                        bytes.fromhex(self.nodes[1].getwalletinfo()["hdseedid"])[::-1]
                    )
                )
            )
            self.nodes[0].rescanblockchain()
            self.generatetoaddress(
                self.nodes[0], COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE
            )

            # Generate transaction on node 0, sync mempools, and check for
            # notification on node 1.
            tx1 = self.nodes[0].sendtoaddress(
                address=ADDRESS_ECREG_UNSPENDABLE, amount=100
            )
            assert_equal(tx1 in self.nodes[0].getrawmempool(), True)
            self.sync_mempools()
            self.expect_wallet_notify([tx1])

            # Add tx1 transaction to new block, checking for a notification
            # and the correct number of confirmations.
            self.generatetoaddress(self.nodes[0], 1, ADDRESS_ECREG_UNSPENDABLE)
            self.sync_blocks()
            self.expect_wallet_notify([tx1])
            assert_equal(self.nodes[1].gettransaction(tx1)["confirmations"], 1)

            # Generate conflicting transactions with the nodes disconnected.
            # Sending almost the entire available balance on each node, but
            # with a slightly different amount, ensures that there will be
            # a conflict.
            balance = self.nodes[0].getbalance()
            self.disconnect_nodes(0, 1)
            tx2_node0 = self.nodes[0].sendtoaddress(
                address=ADDRESS_ECREG_UNSPENDABLE, amount=balance - 20
            )
            tx2_node1 = self.nodes[1].sendtoaddress(
                address=ADDRESS_ECREG_UNSPENDABLE, amount=balance - 21
            )
            assert tx2_node0 != tx2_node1
            self.expect_wallet_notify([tx2_node1])
            # So far tx2_node1 has no conflicting tx
            assert not self.nodes[1].gettransaction(tx2_node1)["walletconflicts"]

            # Mine a block on node0, reconnect the nodes, check that tx2_node1
            # has a conflicting tx after syncing with node0.
            self.generatetoaddress(
                self.nodes[0], 1, ADDRESS_ECREG_UNSPENDABLE, sync_fun=self.no_op
            )
            self.connect_nodes(0, 1)
            self.sync_blocks()
            assert (
                tx2_node0 in self.nodes[1].gettransaction(tx2_node1)["walletconflicts"]
            )

            # node1's wallet will notify of the new confirmed transaction tx2_0
            # and about the conflicted transaction tx2_1.
            self.expect_wallet_notify([tx2_node0, tx2_node1])

        # Create an invalid chain and ensure the node warns.
        self.log.info("test -alertnotify for forked chain")
        fork_block = self.nodes[0].getbestblockhash()
        self.generatetoaddress(self.nodes[0], 1, ADDRESS_ECREG_UNSPENDABLE)
        invalid_block = self.nodes[0].getbestblockhash()
        self.generatetoaddress(self.nodes[0], 7, ADDRESS_ECREG_UNSPENDABLE)

        # Invalidate a large branch, which should trigger an alert.
        self.nodes[0].invalidateblock(invalid_block)

        # Give bitcoind 10 seconds to write the alert notification
        self.wait_until(lambda: len(os.listdir(self.alertnotify_dir)), timeout=10)

        # The notification command is unable to properly handle the spaces on
        # windows. Skip the content check in this case.
        if os.name != "nt":
            assert FORK_WARNING_MESSAGE.format(fork_block) in os.listdir(
                self.alertnotify_dir
            )

        for notify_file in os.listdir(self.alertnotify_dir):
            os.remove(os.path.join(self.alertnotify_dir, notify_file))

    def expect_wallet_notify(self, tx_ids):
        self.wait_until(
            lambda: len(os.listdir(self.walletnotify_dir)) >= len(tx_ids), timeout=10
        )
        assert_equal(
            sorted(notify_outputname(self.wallet, tx_id) for tx_id in tx_ids),
            sorted(os.listdir(self.walletnotify_dir)),
        )
        for tx_file in os.listdir(self.walletnotify_dir):
            os.remove(os.path.join(self.walletnotify_dir, tx_file))


if __name__ == "__main__":
    NotificationsTest().main()
