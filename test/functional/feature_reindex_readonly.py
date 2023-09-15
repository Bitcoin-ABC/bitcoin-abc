# Copyright (c) 2023-present The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test running bitcoind with -reindex from a read-only blockstore
- Start a node, generate blocks, then restart with -reindex after setting blk files to read-only
"""

import os
import stat
import subprocess

from test_framework.test_framework import BitcoinTestFramework, SkipTest


class BlockstoreReindexTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-fastprune"]]

    def reindex_readonly(self):
        self.log.debug("Generate block big enough to start second block file")
        fastprune_blockfile_size = 0x10000
        opreturn = "6a"
        nulldata = fastprune_blockfile_size * "ff"
        self.generateblock(
            self.nodes[0], output=f"raw({opreturn}{nulldata})", transactions=[]
        )
        block_count = self.nodes[0].getblockcount()
        self.stop_node(0)

        assert (self.nodes[0].chain_path / "blocks" / "blk00000.dat").exists()
        assert (self.nodes[0].chain_path / "blocks" / "blk00001.dat").exists()

        self.log.debug("Make the first block file read-only")
        filename = self.nodes[0].chain_path / "blocks" / "blk00000.dat"

        # Detect command to make file immutable
        try:
            # Available on Linux
            subprocess.run(
                ["chattr"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
            )
            make_immutable_command = ["chattr", "+i"]
            undo_immutable_command = ["chattr", "-i"]
        except Exception:
            # Available and macOS, and *BSD
            try:
                subprocess.run(
                    ["chflags"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
                )
                make_immutable_command = ["chflags", "uchg"]
                undo_immutable_command = ["chflags", "nouchg"]
            except Exception:
                # No command available
                raise SkipTest(
                    "Couldn't find command to make file immutable (chattr or chflags)"
                )

        filename.chmod(stat.S_IREAD)
        command_name = make_immutable_command[0]

        try:
            subprocess.run(
                make_immutable_command + [filename], capture_output=True, check=True
            )
            self.log.info(f"Made file immutable with {command_name}")
        except subprocess.CalledProcessError as e:
            self.log.warning(str(e))
            if e.stdout:
                self.log.warning(f"stdout: {e.stdout}")
            if e.stderr:
                self.log.warning(f"stderr: {e.stderr}")
            if os.getuid() == 0:
                self.log.warning(
                    f"Return early under root, because {command_name} failed. "
                    "This can happen due to missing capabilities in a container. "
                    "Make sure to --cap-add LINUX_IMMUTABLE if you want to run this test."
                )
                undo_immutable_command = []

        if undo_immutable_command:
            self.log.debug(
                "Attempt to restart and reindex the node with the unwritable block file"
            )
            with self.nodes[0].wait_for_debug_log(b"Reindexing finished"):
                self.start_node(0, extra_args=["-reindex", "-fastprune"])
            assert block_count == self.nodes[0].getblockcount()
            subprocess.check_call(undo_immutable_command + [filename])

        filename.chmod(0o777)

    def run_test(self):
        self.reindex_readonly()


if __name__ == "__main__":
    BlockstoreReindexTest().main()
