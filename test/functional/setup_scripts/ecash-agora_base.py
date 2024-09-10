# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to test the ecash-agora js library
"""

import os
import shutil

import pathmagic  # noqa
from setup_framework import SetupFramework
from test_framework.address import ADDRESS_ECREG_P2SH_OP_TRUE, ADDRESS_ECREG_UNSPENDABLE
from test_framework.blocktools import COINBASE_MATURITY


class EcashAgoraSetup(SetupFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.setup_clean_chain = True
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik_plugins()

    def run_test(self):
        node = self.nodes[0]

        self.generatetoaddress(node, 149, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        self.generatetoaddress(node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE)

        plugins_toml = os.path.join(node.datadir, "plugins.toml")
        plugins_dir = os.path.join(node.datadir, "plugins")
        os.mkdir(plugins_dir)

        agora_script_path = os.path.join(
            os.path.dirname(__file__),
            "..",
            "..",
            "..",
            "modules",
            "ecash-agora",
            "agora.py",
        )
        shutil.copyfile(agora_script_path, os.path.join(plugins_dir, "agora.py"))

        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.agora]", file=f)

        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin agora.AgoraPlugin (version 0.1.0) with LOKAD IDs [b"AGR0"]',
            ]
        ):
            self.restart_node(0, ["-chronik", "-chronikreindex"])

        mocktime = 1300000000
        node.setmocktime(mocktime)

        yield True


if __name__ == "__main__":
    EcashAgoraSetup().main()
