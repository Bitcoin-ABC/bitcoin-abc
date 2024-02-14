# Copyright (c) 2019 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test getdescriptorinfo RPC.
"""

from test_framework.descriptors import descsum_create
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


class DescriptorTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-disablewallet"]]
        self.wallet_names = []

    def test_desc(self, desc, isrange, issolvable, hasprivatekeys):
        info = self.nodes[0].getdescriptorinfo(desc)
        assert_equal(info, self.nodes[0].getdescriptorinfo(descsum_create(desc)))
        assert_equal(info["descriptor"], descsum_create(desc))
        assert_equal(info["isrange"], isrange)
        assert_equal(info["issolvable"], issolvable)
        assert_equal(info["hasprivatekeys"], hasprivatekeys)

    def run_test(self):
        assert_raises_rpc_error(
            -1, "getdescriptorinfo", self.nodes[0].getdescriptorinfo
        )
        assert_raises_rpc_error(
            -3, "Expected type string", self.nodes[0].getdescriptorinfo, 1
        )
        assert_raises_rpc_error(
            -5,
            "is not a valid descriptor function",
            self.nodes[0].getdescriptorinfo,
            "",
        )

        # P2PK output with the specified public key.
        self.test_desc(
            "pk(0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798)",
            isrange=False,
            issolvable=True,
            hasprivatekeys=False,
        )
        # P2PKH output with the specified public key.
        self.test_desc(
            "pkh(02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5)",
            isrange=False,
            issolvable=True,
            hasprivatekeys=False,
        )
        # Any P2PK, P2PKH output with the specified public key.
        self.test_desc(
            "combo(0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798)",
            isrange=False,
            issolvable=True,
            hasprivatekeys=False,
        )
        # A bare *1-of-2* multisig output with keys in the specified order.
        self.test_desc(
            "multi(1,022f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4,025cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc)",
            isrange=False,
            issolvable=True,
            hasprivatekeys=False,
        )
        # A P2SH *2-of-2* multisig output with keys in the specified order.
        self.test_desc(
            "sh(multi(2,022f01e5e15cca351daff3843fb70f3c2f0a1bdd05e5af888a67784ef3e10a2a01,03acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe))",
            isrange=False,
            issolvable=True,
            hasprivatekeys=False,
        )
        # A P2PK output with the public key of the specified xpub.
        self.test_desc(
            "pk(tpubD6NzVbkrYhZ4WaWSyoBvQwbpLkojyoTZPRsgXELWz3Popb3qkjcJyJUGLnL4qHHoQvao8ESaAstxYSnhyswJ76uZPStJRJCTKvosUCJZL5B)",
            isrange=False,
            issolvable=True,
            hasprivatekeys=False,
        )
        # A P2PKH output with child key *1'/2* of the specified xpub.
        self.test_desc(
            "pkh(tpubD6NzVbkrYhZ4WaWSyoBvQwbpLkojyoTZPRsgXELWz3Popb3qkjcJyJUGLnL4qHHoQvao8ESaAstxYSnhyswJ76uZPStJRJCTKvosUCJZL5B/1'/2)",
            isrange=False,
            issolvable=True,
            hasprivatekeys=False,
        )
        # A set of P2PKH outputs, but additionally specifies that the specified
        # xpub is a child of a master with fingerprint `d34db33f`, and derived
        # using path `44'/0'/0'`.
        self.test_desc(
            "pkh([d34db33f/44'/0'/0']tpubD6NzVbkrYhZ4WaWSyoBvQwbpLkojyoTZPRsgXELWz3Popb3qkjcJyJUGLnL4qHHoQvao8ESaAstxYSnhyswJ76uZPStJRJCTKvosUCJZL5B/1/*)",
            isrange=True,
            issolvable=True,
            hasprivatekeys=False,
        )


if __name__ == "__main__":
    DescriptorTest().main()
