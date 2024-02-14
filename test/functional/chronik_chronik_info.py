# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /chronik-info endpoint.
"""

import os
from pathlib import Path

from test_framework.cdefs import get_srcdir
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


def get_chronik_version():
    """
    Get the chronik package version from Cargo.toml in chronik/chronik-http/

    Assumptions
    chronik version must be the first appearing version in the Cargo.toml file
    Cargo.toml is at toplevel/chronik/chronik-http/Cargo.toml
    """

    # Get chronik version from Cargo.toml
    basePath = get_srcdir()
    cargo_path = os.path.join(basePath, "chronik", "chronik-http", "Cargo.toml")
    chronik_cargo_toml = Path(cargo_path).read_text()
    for line in chronik_cargo_toml.split("\n"):
        if "version =" in line:
            # The chronik version appears at the highest line, between "" marks
            return line.strip().split('"')[1]


class ChronikChronikInfoTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        from test_framework.chronik.client import pb

        assert_equal(
            chronik.chronik_info().ok(),
            pb.ChronikInfo(
                version=get_chronik_version(),
            ),
        )


if __name__ == "__main__":
    ChronikChronikInfoTest().main()
