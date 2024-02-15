# Copyright (c) 2014-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the wallet backup features.

Test case is:
4 nodes. 1 2 and 3 send transactions between each other,
fourth node is a miner.
1 2 3 each mine a block to start, then
Miner creates 100 blocks so 1 2 3 each have 50 mature
coins to spend.
Then 5 iterations of 1/2/3 sending coins amongst
themselves to get transactions in the wallets,
and the miner mining one block.

Wallets are backed up using dumpwallet/backupwallet.
Then 5 more iterations of transactions and mining a block.

Miner then generates 101 more blocks, so any
transaction fees paid mature.

Sanity check:
  Sum(1,2,3,4 balances) == 114*50

1/2/3 are shutdown, and their wallets erased.
Then restore using wallet.dat backup. And
confirm 1/2/3/4 balances are same as before.

Shutdown again, restore using importwallet,
and confirm again balances are correct.
"""
import os
import shutil
from decimal import Decimal
from random import randint

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


class WalletBackupTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 4
        self.setup_clean_chain = True
        # nodes 1, 2,3 are spenders, let's give them a keypool=100
        # whitelist all peers to speed up tx relay / mempool sync
        self.extra_args = [
            ["-whitelist=noban@127.0.0.1", "-keypool=100"],
            ["-whitelist=noban@127.0.0.1", "-keypool=100"],
            ["-whitelist=noban@127.0.0.1", "-keypool=100"],
            ["-whitelist=noban@127.0.0.1"],
        ]
        self.rpc_timeout = 120

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def setup_network(self):
        self.setup_nodes()
        self.connect_nodes(0, 3)
        self.connect_nodes(1, 3)
        self.connect_nodes(2, 3)
        self.connect_nodes(2, 0)
        self.sync_all()

    def one_send(self, from_node, to_address):
        if randint(1, 2) == 1:
            amount = Decimal(randint(1, 10)) * Decimal(100000)
            self.nodes[from_node].sendtoaddress(to_address, amount)

    def do_one_round(self):
        a0 = self.nodes[0].getnewaddress()
        a1 = self.nodes[1].getnewaddress()
        a2 = self.nodes[2].getnewaddress()

        self.one_send(0, a1)
        self.one_send(0, a2)
        self.one_send(1, a0)
        self.one_send(1, a2)
        self.one_send(2, a0)
        self.one_send(2, a1)

        # Have the miner (node3) mine a block.
        # Must sync mempools before mining.
        self.sync_mempools()
        self.generate(self.nodes[3], 1)

    # As above, this mirrors the original bash test.
    def start_three(self, args=()):
        self.start_node(0, self.extra_args[0] + list(args))
        self.start_node(1, self.extra_args[1] + list(args))
        self.start_node(2, self.extra_args[2] + list(args))
        self.connect_nodes(0, 3)
        self.connect_nodes(1, 3)
        self.connect_nodes(2, 3)
        self.connect_nodes(2, 0)

    def stop_three(self):
        self.stop_node(0)
        self.stop_node(1)
        self.stop_node(2)

    def erase_three(self):
        os.remove(
            os.path.join(
                self.nodes[0].datadir,
                self.chain,
                "wallets",
                self.default_wallet_name,
                self.wallet_data_filename,
            )
        )
        os.remove(
            os.path.join(
                self.nodes[1].datadir,
                self.chain,
                "wallets",
                self.default_wallet_name,
                self.wallet_data_filename,
            )
        )
        os.remove(
            os.path.join(
                self.nodes[2].datadir,
                self.chain,
                "wallets",
                self.default_wallet_name,
                self.wallet_data_filename,
            )
        )

    def restore_nonexistent_wallet(self):
        node = self.nodes[3]
        nonexistent_wallet_file = os.path.join(
            self.nodes[0].datadir, "nonexistent_wallet.bak"
        )
        wallet_name = "res0"
        assert_raises_rpc_error(
            -8,
            "Backup file does not exist",
            node.restorewallet,
            wallet_name,
            nonexistent_wallet_file,
        )

    def restore_wallet_existent_name(self):
        node = self.nodes[3]
        wallet_file = os.path.join(self.nodes[0].datadir, "wallet.bak")
        wallet_name = "res0"
        assert_raises_rpc_error(
            -8,
            "Wallet name already exists.",
            node.restorewallet,
            wallet_name,
            wallet_file,
        )

    def init_three(self):
        self.init_wallet(0)
        self.init_wallet(1)
        self.init_wallet(2)

    def run_test(self):
        self.log.info("Generating initial blockchain")
        self.generate(self.nodes[0], 1)
        self.generate(self.nodes[1], 1)
        self.generate(self.nodes[2], 1)
        self.generate(self.nodes[3], 100)

        assert_equal(self.nodes[0].getbalance(), 50000000)
        assert_equal(self.nodes[1].getbalance(), 50000000)
        assert_equal(self.nodes[2].getbalance(), 50000000)
        assert_equal(self.nodes[3].getbalance(), 0)

        self.log.info("Creating transactions")
        # Five rounds of sending each other transactions.
        for _ in range(5):
            self.do_one_round()

        self.log.info("Backing up")
        self.nodes[0].backupwallet(os.path.join(self.nodes[0].datadir, "wallet.bak"))
        self.nodes[0].dumpwallet(os.path.join(self.nodes[0].datadir, "wallet.dump"))
        self.nodes[1].backupwallet(os.path.join(self.nodes[1].datadir, "wallet.bak"))
        self.nodes[1].dumpwallet(os.path.join(self.nodes[1].datadir, "wallet.dump"))
        self.nodes[2].backupwallet(os.path.join(self.nodes[2].datadir, "wallet.bak"))
        self.nodes[2].dumpwallet(os.path.join(self.nodes[2].datadir, "wallet.dump"))

        self.log.info("More transactions")
        for _ in range(5):
            self.do_one_round()

        # Generate 101 more blocks, so any fees paid mature
        self.generate(self.nodes[3], 101)

        balance0 = self.nodes[0].getbalance()
        balance1 = self.nodes[1].getbalance()
        balance2 = self.nodes[2].getbalance()
        balance3 = self.nodes[3].getbalance()
        total = balance0 + balance1 + balance2 + balance3

        # At this point, there are 214 blocks (103 for setup, then 10 rounds, then 101.)
        # 114 are mature, so the sum of all wallets should be 114 * 50 = 5700.
        assert_equal(total, 5700000000)

        ##
        # Test restoring spender wallets from backups
        ##
        self.log.info("Restoring wallets on node 3 using backup files")

        self.restore_nonexistent_wallet()

        backup_file_0 = os.path.join(self.nodes[0].datadir, "wallet.bak")
        backup_file_1 = os.path.join(self.nodes[1].datadir, "wallet.bak")
        backup_file_2 = os.path.join(self.nodes[2].datadir, "wallet.bak")

        self.nodes[3].restorewallet("res0", backup_file_0)
        self.nodes[3].restorewallet("res1", backup_file_1)
        self.nodes[3].restorewallet("res2", backup_file_2)

        res0_rpc = self.nodes[3].get_wallet_rpc("res0")
        res1_rpc = self.nodes[3].get_wallet_rpc("res1")
        res2_rpc = self.nodes[3].get_wallet_rpc("res2")

        assert_equal(res0_rpc.getbalance(), balance0)
        assert_equal(res1_rpc.getbalance(), balance1)
        assert_equal(res2_rpc.getbalance(), balance2)

        self.restore_wallet_existent_name()

        self.log.info("Restoring using dumped wallet")
        self.stop_three()
        self.erase_three()

        # start node2 with no chain
        shutil.rmtree(os.path.join(self.nodes[2].datadir, self.chain, "blocks"))
        shutil.rmtree(os.path.join(self.nodes[2].datadir, self.chain, "chainstate"))

        self.start_three(["-nowallet"])
        self.init_three()

        assert_equal(self.nodes[0].getbalance(), 0)
        assert_equal(self.nodes[1].getbalance(), 0)
        assert_equal(self.nodes[2].getbalance(), 0)

        self.nodes[0].importwallet(os.path.join(self.nodes[0].datadir, "wallet.dump"))
        self.nodes[1].importwallet(os.path.join(self.nodes[1].datadir, "wallet.dump"))
        self.nodes[2].importwallet(os.path.join(self.nodes[2].datadir, "wallet.dump"))

        self.sync_blocks()

        assert_equal(self.nodes[0].getbalance(), balance0)
        assert_equal(self.nodes[1].getbalance(), balance1)
        assert_equal(self.nodes[2].getbalance(), balance2)

        # Backup to source wallet file must fail
        sourcePaths = [
            os.path.join(
                self.nodes[0].datadir,
                self.chain,
                "wallets",
                self.default_wallet_name,
                self.wallet_data_filename,
            ),
            os.path.join(
                self.nodes[0].datadir,
                self.chain,
                ".",
                "wallets",
                self.default_wallet_name,
                self.wallet_data_filename,
            ),
            os.path.join(
                self.nodes[0].datadir, self.chain, "wallets", self.default_wallet_name
            ),
            os.path.join(self.nodes[0].datadir, self.chain, "wallets"),
        ]

        for sourcePath in sourcePaths:
            assert_raises_rpc_error(
                -4, "backup failed", self.nodes[0].backupwallet, sourcePath
            )


if __name__ == "__main__":
    WalletBackupTest().main()
