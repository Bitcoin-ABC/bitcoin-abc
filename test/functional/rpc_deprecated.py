# Copyright (c) 2017-2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test deprecation of RPC calls."""
from test_framework.avatools import gen_proof
from test_framework.test_framework import BitcoinTestFramework
from test_framework.wallet_util import bytes_to_wif


class DeprecatedRpcTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 2
        self.extra_args = [
            [
                "-avaproofstakeutxodustthreshold=1000000",
            ],
            [
                "-avaproofstakeutxodustthreshold=1000000",
                "-deprecatedrpc=getavalancheinfo_sharing",
            ],
        ]

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        # This test should be used to verify correct behaviour of deprecated
        # RPC methods with and without the -deprecatedrpc flags. For example:
        #
        # In set_test_params:
        # self.extra_args = [[], ["-deprecatedrpc=generate"]]
        #
        # In run_test:
        # self.log.info("Test generate RPC")
        # assert_raises_rpc_error(-32, 'The wallet generate rpc method is deprecated', self.nodes[0].rpc.generate, 1)
        # self.nodes[1].generate(1)
        privkey, proof = gen_proof(self, self.nodes[0])
        proof_args = [
            f"-avaproof={proof.serialize().hex()}",
            f"-avamasterkey={bytes_to_wif(privkey.get_bytes())}",
        ]

        self.restart_node(0, extra_args=self.extra_args[0] + proof_args)
        self.restart_node(1, extra_args=self.extra_args[1] + proof_args)

        info0 = self.nodes[0].getavalancheinfo()
        info1 = self.nodes[1].getavalancheinfo()

        assert "local" in info0
        assert "local" in info1
        assert "sharing" not in info0["local"]
        assert "sharing" in info1["local"]


if __name__ == "__main__":
    DeprecatedRpcTest().main()
