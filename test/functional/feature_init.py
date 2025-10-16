# Copyright (c) 2021 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Stress tests related to node initialization."""
import os
import shutil
from pathlib import Path

from test_framework.test_framework import BitcoinTestFramework, SkipTest
from test_framework.test_node import ErrorMatch
from test_framework.util import assert_equal


class InitStressTest(BitcoinTestFramework):
    """
    Ensure that initialization can be interrupted at a number of points and not
    impair subsequent starts.
    """

    def set_test_params(self):
        self.setup_clean_chain = False
        self.num_nodes = 1

    def run_test(self):
        """
        - test terminating initialization after seeing a certain log line.
        - test removing certain essential files to test startup error paths.
        """
        # TODO: skip Windows for now since it isn't clear how to SIGTERM.
        #
        # Windows doesn't support `process.terminate()`.
        # and other approaches (like below) don't work:
        #
        #   os.kill(node.process.pid, signal.CTRL_C_EVENT)
        if os.name == "nt":
            raise SkipTest("can't SIGTERM on Windows")

        self.stop_node(0)
        node = self.nodes[0]

        def sigterm_node():
            node.process.terminate()
            node.process.wait()

        def start_expecting_error(err_fragment, args):
            node.assert_start_raises_init_error(
                extra_args=args,
                expected_msg=err_fragment,
                match=ErrorMatch.PARTIAL_REGEX,
                timeout=600,
            )

        def check_clean_start(extra_args):
            """Ensure that node restarts successfully after various interrupts."""
            node.start(extra_args)
            node.wait_for_rpc_connection()
            height = node.getblockcount()
            assert_equal(200, height)
            self.wait_until(
                lambda: all(
                    i["synced"] and i["best_block_height"] == height
                    for i in node.getindexinfo().values()
                )
            )

        lines_to_terminate_after = [
            b"Validating signatures for all blocks",
            b"scheduler thread start",
            b"Starting HTTP server",
            b"Loading P2P addresses",
            b"Loading banlist",
            b"Loading block index",
            b"Checking all blk files are present",
            b"Loaded best chain:",
            b"init message: Verifying blocks",
            b"init message: Starting network threads",
            b"net thread start",
            b"addcon thread start",
            b"initload thread start",
            b"txindex thread start",
            b"block filter index thread start",
            b"coinstatsindex thread start",
            b"msghand thread start",
            b"net thread start",
            b"addcon thread start",
        ]
        if self.is_wallet_compiled():
            lines_to_terminate_after.append(b"Verifying wallet")

        args = ["-txindex=1", "-blockfilterindex=1", "-coinstatsindex=1"]
        for terminate_line in lines_to_terminate_after:
            self.log.info(
                f"Starting node and will terminate after line {terminate_line}"
            )
            with node.wait_for_debug_log([terminate_line]):
                node.start(extra_args=args)
            self.log.debug("Terminating node after terminate line was found")
            sigterm_node()

        # Prior to deleting/perturbing index files, start node with all indexes enabled.
        # 'check_clean_start' will ensure indexes are synchronized (i.e., data exists to modify)
        check_clean_start(args)
        self.stop_node(0)

        self.log.info("Test startup errors after removing certain essential files")

        deletion_rounds = [
            {
                "filepath_glob": "blocks/index/*.ldb",
                "error_message": "Error opening block database.",
                "startup_args": [],
            },
            {
                "filepath_glob": "chainstate/*.ldb",
                "error_message": "Error opening block database.",
                "startup_args": ["-checklevel=4"],
            },
            {
                "filepath_glob": "blocks/blk*.dat",
                "error_message": "Error loading block database.",
                "startup_args": ["-checkblocks=200", "-checklevel=4"],
            },
            {
                "filepath_glob": "indexes/txindex/MANIFEST*",
                "error_message": "Fatal LevelDB error: IO error:",
                "startup_args": ["-txindex=1"],
            },
            # Removing these files does not result in a startup error:
            # 'indexes/blockfilter/basic/*.dat', 'indexes/blockfilter/basic/db/*.*', 'indexes/coinstats/db/*.*',
            # 'indexes/txindex/*.log', 'indexes/txindex/CURRENT', 'indexes/txindex/LOCK'
        ]

        perturbation_rounds = [
            {
                "filepath_glob": "blocks/index/*.ldb",
                "error_message": "Error loading block database.",
                "startup_args": [],
            },
            {
                "filepath_glob": "chainstate/*.ldb",
                "error_message": "Error opening block database.",
                "startup_args": [],
            },
            {
                "filepath_glob": "blocks/blk*.dat",
                "error_message": "Corrupted block database detected.",
                "startup_args": ["-checkblocks=200", "-checklevel=4"],
            },
            {
                "filepath_glob": "indexes/blockfilter/basic/db/*.*",
                "error_message": "LevelDB error: Corruption",
                "startup_args": ["-blockfilterindex=1"],
            },
            {
                "filepath_glob": "indexes/coinstats/db/*.*",
                "error_message": "LevelDB error: Corruption",
                "startup_args": ["-coinstatsindex=1"],
            },
            {
                "filepath_glob": "indexes/txindex/*.log",
                "error_message": "LevelDB error: Corruption",
                "startup_args": ["-txindex=1"],
            },
            {
                "filepath_glob": "indexes/txindex/CURRENT",
                "error_message": "LevelDB error: Corruption",
                "startup_args": ["-txindex=1"],
            },
            # Perturbing these files does not result in a startup error:
            # 'indexes/blockfilter/basic/*.dat', 'indexes/txindex/MANIFEST*', 'indexes/txindex/LOCK'
        ]

        for round_info in deletion_rounds:
            file_patt = round_info["filepath_glob"]
            err_fragment = round_info["error_message"]
            startup_args = round_info["startup_args"]
            target_files = list(node.chain_path.glob(file_patt))

            for target_file in target_files:
                self.log.info(f"Deleting file to ensure failure {target_file}")
                bak_path = f"{target_file}.bak"
                target_file.rename(bak_path)

            start_expecting_error(err_fragment, startup_args)

            for target_file in target_files:
                bak_path = f"{target_file}.bak"
                self.log.debug(f"Restoring file from {bak_path} and restarting")
                Path(bak_path).rename(target_file)

            check_clean_start(args)
            self.stop_node(0)

        self.log.info("Test startup errors after perturbing certain essential files")
        dirs = ["blocks", "chainstate", "indexes"]
        for round_info in perturbation_rounds:
            file_patt = round_info["filepath_glob"]
            err_fragment = round_info["error_message"]
            startup_args = round_info["startup_args"]

            for dir_ in dirs:
                shutil.copytree(node.chain_path / dir_, node.chain_path / f"{dir_}_bak")
            target_files = list(node.chain_path.glob(file_patt))

            for target_file in target_files:
                self.log.info(f"Perturbing file to ensure failure {target_file}")
                with open(target_file, "r+b") as tf:
                    # Since the genesis block is not checked by -checkblocks, the
                    # perturbation window must be chosen such that a higher block
                    # in blk*.dat is affected.
                    tf.seek(150)
                    tf.write(b"1" * 200)

            start_expecting_error(err_fragment, startup_args)

            for dir_ in dirs:
                shutil.rmtree(node.chain_path / dir_)
                shutil.move(node.chain_path / f"{dir_}_bak", node.chain_path / dir_)


if __name__ == "__main__":
    InitStressTest().main()
