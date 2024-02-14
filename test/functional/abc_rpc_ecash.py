# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test the getcurrencyinfo RPC.
Test the effect of the -ecash command line parameter on amounts in RPC
commands.
"""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ECashRPCTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1

    def test_currency(self, *, ticker: str, satoshis_per_unit: int, decimals: int):
        info = self.nodes[0].getcurrencyinfo()
        assert_equal(info["ticker"], ticker)
        assert_equal(info["satoshisperunit"], satoshis_per_unit)
        assert_equal(info["decimals"], decimals)

        # Test a RPC command with an Amount output
        decodedproof = self.nodes[0].decodeavalancheproof(
            "0b000000000000000c0000000000000021030b4c866585dd868a9d62348a9cd008"
            "d6a312937048fff31670e7e920cfc7a7440105c5f72f5d6da3085583e75ee79340"
            "eb4eff208c89988e7ed0efb30b87298fa30000000000f2052a0100000003000000"
            "210227d85ba011276cf25b51df6a188b75e604b38770a462b2d0e9fb2fc839ef5d"
            "3f5699fa4fbfcbb847fadbab9103b15774cacbafc07b827a63a37989a8b6e2fda7"
            "c5d9b2d92795d1f5f6ea16f05d0872f26bc135958496383a88fdeb2f2486be6719"
            "76a914000000000000000000000000000000000000000088acbb0023e3cb6f1fec"
            "64678afa48490daedab1f822a4dbbeb81909339940d2383a4cc268391be5339d17"
            "477735025535bceea91c7ba40ec79818dccb164871b16e"
        )
        expected_sats = 5_000_000_000
        assert_equal(
            decodedproof["stakes"][0]["amount"], expected_sats / satoshis_per_unit
        )

    def run_test(self):
        self.log.info("Test with -ecash enabled (default setting)")
        self.test_currency(ticker="XEC", satoshis_per_unit=100, decimals=2)

        self.log.info("Test with -ecash disabled")
        # Disable fallbackfee, because its default setting for tests
        # is adapted to XEC only.
        # In BCHA mode, it triggers a "-fallbackfee is set very high!" error.
        self.restart_node(0, ["-ecash=0", "-fallbackfee=0"])
        self.test_currency(ticker="BCHA", satoshis_per_unit=100_000_000, decimals=8)


if __name__ == "__main__":
    ECashRPCTest().main()
