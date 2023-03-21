# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the avalanche options interactions."""

import os

from test_framework.avatools import gen_proof
from test_framework.test_framework import BitcoinTestFramework
from test_framework.wallet_util import bytes_to_wif


class AvalancheOptionsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [[]]

    def run_test(self):
        node = self.nodes[0]

        privkey, proof = gen_proof(self, node)

        with node.assert_debug_log(
            [
                "Increasing -maxconnections from 10 to 20 to comply with -maxavalancheoutbound"
            ]
        ):
            self.restart_node(
                0,
                extra_args=[
                    "-maxconnections=10",
                    "-maxavalancheoutbound=20",
                ],
            )

        self.stop_node(0)

        # Remove -bind from the datadir so it doesn't conflict with -listen=0
        with open(
            os.path.join(node.datadir, "bitcoin.conf"), "r", encoding="utf8"
        ) as f:
            config_lines = f.readlines()
        with open(
            os.path.join(node.datadir, "bitcoin_nobind.conf"), "w", encoding="utf8"
        ) as f:
            f.writelines(
                [line for line in config_lines if not line.startswith("bind=")]
            )

        node.assert_start_raises_init_error(
            extra_args=[
                f"-avaproof={proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
                f"-conf={os.path.join(node.datadir, 'bitcoin_nobind.conf')}",
                "-allowignoredconf",
                "-listen=0",
            ],
            expected_msg="Error: Running a staking node requires accepting inbound connections. Please enable -listen.",
        )

        node.assert_start_raises_init_error(
            extra_args=[
                f"-avaproof={proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
                "-proxy=127.0.01:9050",
            ],
            expected_msg="Error: Running a staking node behind a proxy is not supported. Please disable -proxy.",
        )

        node.assert_start_raises_init_error(
            extra_args=[
                f"-avaproof={proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
                "-i2psam=127.0.01:7656",
            ],
            expected_msg="Error: Running a staking node behind I2P is not supported. Please disable -i2psam.",
        )

        node.assert_start_raises_init_error(
            extra_args=[
                f"-avaproof={proof.serialize().hex()}",
                f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
                "-onlynet=ipv6",
            ],
            expected_msg="Error: Restricting the outbound network is not supported when running a staking node. Please disable -onlynet.",
        )


if __name__ == "__main__":
    AvalancheOptionsTest().main()
