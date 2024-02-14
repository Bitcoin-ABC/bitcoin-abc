# Copyright (c) 2018 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from test_framework.blocktools import TIME_GENESIS_BLOCK
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


class CreateTxWalletTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        self.log.info("Create some old blocks")
        self.nodes[0].setmocktime(TIME_GENESIS_BLOCK)
        self.generate(self.nodes[0], 200)
        self.nodes[0].setmocktime(0)

        self.test_anti_fee_sniping_disabled()
        self.test_tx_size_too_large()

    def test_anti_fee_sniping_disabled(self):
        # Wallet transactions used to set locktime to the current block height
        # to prevent fee-sniping. This feature is now disabled because it hurts
        # privacy and fee-sniping is now mitigated by avalanche post-consensus.
        self.log.info(
            "Check that we have some (old) blocks and that anti-fee-sniping is disabled"
        )
        assert_equal(self.nodes[0].getblockchaininfo()["blocks"], 200)
        txid = self.nodes[0].sendtoaddress(self.nodes[0].getnewaddress(), 1000000)
        tx = self.nodes[0].gettransaction(txid=txid, verbose=True)["decoded"]
        assert_equal(tx["locktime"], 0)

        self.log.info(
            "Check that anti-fee-sniping is still disabled when we mine a recent block"
        )
        self.generate(self.nodes[0], 1)
        txid = self.nodes[0].sendtoaddress(self.nodes[0].getnewaddress(), 1000000)
        tx = self.nodes[0].gettransaction(txid=txid, verbose=True)["decoded"]
        assert_equal(tx["locktime"], 0)

    def test_tx_size_too_large(self):
        # More than 10kB of outputs, so that we hit -maxtxfee with a high
        # feerate
        outputs = {self.nodes[0].getnewaddress(): 25 for _ in range(400)}
        raw_tx = self.nodes[0].createrawtransaction(inputs=[], outputs=outputs)

        for fee_setting in [
            "-minrelaytxfee=10000",
            "-mintxfee=10000",
            "-paytxfee=10000",
        ]:
            self.log.info(f"Check maxtxfee in combination with {fee_setting}")
            self.restart_node(0, extra_args=[fee_setting])
            assert_raises_rpc_error(
                -6,
                "Fee exceeds maximum configured by user (e.g. -maxtxfee, maxfeerate)",
                lambda: self.nodes[0].sendmany(dummy="", amounts=outputs),
            )
            assert_raises_rpc_error(
                -4,
                "Fee exceeds maximum configured by user (e.g. -maxtxfee, maxfeerate)",
                lambda: self.nodes[0].fundrawtransaction(hexstring=raw_tx),
            )

        self.log.info("Check maxtxfee in combination with settxfee")
        self.restart_node(0)
        self.nodes[0].settxfee(10000)
        assert_raises_rpc_error(
            -6,
            "Fee exceeds maximum configured by user (e.g. -maxtxfee, maxfeerate)",
            lambda: self.nodes[0].sendmany(dummy="", amounts=outputs),
        )
        assert_raises_rpc_error(
            -4,
            "Fee exceeds maximum configured by user (e.g. -maxtxfee, maxfeerate)",
            lambda: self.nodes[0].fundrawtransaction(hexstring=raw_tx),
        )
        self.nodes[0].settxfee(0)


if __name__ == "__main__":
    CreateTxWalletTest().main()
