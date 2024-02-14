# Copyright (c) 2021 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test the buildavalancheproof RPC"""

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.avatools import create_coinbase_stakes
from test_framework.key import ECKey
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_raises_rpc_error
from test_framework.wallet_util import bytes_to_wif


class BuildAvalancheProofTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1
        self.extra_args = [["-avaproofstakeutxoconfirmations=1", "-avacooldown=0"]]

    def run_test(self):
        node = self.nodes[0]

        addrkey0 = node.get_deterministic_priv_key()
        blockhashes = self.generatetoaddress(
            node, 2, addrkey0.address, sync_fun=self.no_op
        )
        stakes = create_coinbase_stakes(node, [blockhashes[0]], addrkey0.key)

        privkey = ECKey()
        privkey.generate()
        wif_privkey = bytes_to_wif(privkey.get_bytes())

        def check_buildavalancheproof_error(
            error_code, error_message, stakes, master_key=wif_privkey
        ):
            assert_raises_rpc_error(
                error_code,
                error_message,
                node.buildavalancheproof,
                # Sequence
                0,
                # Expiration
                0,
                master_key,
                stakes,
            )

        good_stake = stakes[0]

        self.log.info("Error cases")

        check_buildavalancheproof_error(
            -8, "Invalid master key", [good_stake], master_key=bytes_to_wif(b"f00")
        )

        negative_vout = good_stake.copy()
        negative_vout["vout"] = -1
        check_buildavalancheproof_error(
            -22,
            "vout cannot be negative",
            [negative_vout],
        )

        zero_height = good_stake.copy()
        zero_height["height"] = 0
        check_buildavalancheproof_error(
            -22,
            "height must be positive",
            [zero_height],
        )
        negative_height = good_stake.copy()
        negative_height["height"] = -1
        check_buildavalancheproof_error(
            -22,
            "height must be positive",
            [negative_height],
        )

        missing_amount = good_stake.copy()
        del missing_amount["amount"]
        check_buildavalancheproof_error(
            -8,
            "Missing amount",
            [missing_amount],
        )

        invalid_privkey = good_stake.copy()
        invalid_privkey["privatekey"] = "foobar"
        check_buildavalancheproof_error(
            -8,
            "Invalid private key",
            [invalid_privkey],
        )

        duplicate_stake = [good_stake] * 2
        check_buildavalancheproof_error(
            -8,
            "Duplicated stake",
            duplicate_stake,
        )

        self.log.info("Happy path")
        assert node.buildavalancheproof(0, 0, wif_privkey, [good_stake])

        self.log.info("Check the payout address")
        assert_raises_rpc_error(
            -8,
            "Invalid payout address",
            node.buildavalancheproof,
            0,
            0,
            wif_privkey,
            [good_stake],
            "ecregtest:qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqcrl5mqkq",
        )

        # Happy path
        node.buildavalancheproof(
            0, 0, wif_privkey, [good_stake], ADDRESS_ECREG_UNSPENDABLE
        )


if __name__ == "__main__":
    BuildAvalancheProofTest().main()
