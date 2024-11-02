# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /script/scripthash/:payload/* endpoints.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
)
from test_framework.blocktools import GENESIS_CB_PK, GENESIS_CB_SCRIPT_PUBKEY
from test_framework.hash import hex_be_sha256
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet, MiniWalletMode

GENESIS_CB_SCRIPTHASH = hex_be_sha256(GENESIS_CB_SCRIPT_PUBKEY)


class ChronikScriptHashTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik", "-chronikscripthashindex=1"]]
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        self.node = self.nodes[0]
        self.chronik = self.node.get_chronik_client()
        self.wallet = MiniWallet(self.node, mode=MiniWalletMode.ADDRESS_OP_TRUE)

        self.test_invalid_requests()
        self.test_valid_requests()
        self.test_wipe_index()

    def test_invalid_requests(self):
        for payload in ("lorem_ipsum", "", "deadbeef", "deadbee", 31 * "ff", 33 * "ff"):
            err_msg = f'400: Unable to parse script hash "{payload}"'
            assert_equal(
                self.chronik.script("scripthash", payload).confirmed_txs().err(400).msg,
                err_msg,
            )
            assert_equal(
                self.chronik.script("scripthash", payload).history().err(400).msg,
                err_msg,
            )
            assert_equal(
                self.chronik.script("scripthash", payload)
                .unconfirmed_txs()
                .err(400)
                .msg,
                err_msg,
            )

        # Potentially valid sha256 hash, but unlikely to collide with any existing
        # scripthash
        valid_payload = 32 * "ff"
        err_msg = f'404: Script hash "{valid_payload}" not found'
        assert_equal(
            self.chronik.script("scripthash", valid_payload)
            .confirmed_txs()
            .err(404)
            .msg,
            err_msg,
        )
        assert_equal(
            self.chronik.script("scripthash", valid_payload)
            .confirmed_txs()
            .err(404)
            .msg,
            err_msg,
        )
        assert_equal(
            self.chronik.script("scripthash", valid_payload)
            .confirmed_txs()
            .err(404)
            .msg,
            err_msg,
        )

    def test_valid_requests(self):
        from test_framework.chronik.client import pb
        from test_framework.chronik.test_data import genesis_cb_tx

        expected_cb_history = pb.TxHistoryPage(
            txs=[genesis_cb_tx()], num_pages=1, num_txs=1
        )
        assert_equal(
            self.chronik.script("scripthash", GENESIS_CB_SCRIPTHASH)
            .confirmed_txs()
            .ok(),
            expected_cb_history,
        )
        assert_equal(
            self.chronik.script("scripthash", GENESIS_CB_SCRIPTHASH).history().ok(),
            expected_cb_history,
        )
        # No txs in mempool for the genesis pubkey
        assert_equal(
            self.chronik.script("scripthash", GENESIS_CB_SCRIPTHASH)
            .unconfirmed_txs()
            .ok(),
            pb.TxHistoryPage(num_pages=0, num_txs=0),
        )

        scripthash_payload_hex = hex_be_sha256(P2SH_OP_TRUE)

        def check_num_txs(num_block_txs, num_mempool_txs):
            page_size = 200
            page_num = 0
            script_conf_txs = (
                self.chronik.script("scripthash", scripthash_payload_hex)
                .confirmed_txs(page_num, page_size)
                .ok()
            )
            assert_equal(script_conf_txs.num_txs, num_block_txs)
            script_history = (
                self.chronik.script("scripthash", scripthash_payload_hex)
                .history(page_num, page_size)
                .ok()
            )
            assert_equal(script_history.num_txs, num_block_txs + num_mempool_txs)
            script_unconf_txs = (
                self.chronik.script("scripthash", scripthash_payload_hex)
                .unconfirmed_txs()
                .ok()
            )
            assert_equal(script_unconf_txs.num_txs, num_mempool_txs)

        # Generate blocks to some address and verify the history
        blockhashes = self.generatetoaddress(self.node, 10, ADDRESS_ECREG_P2SH_OP_TRUE)
        check_num_txs(num_block_txs=len(blockhashes), num_mempool_txs=0)

        # Undo last block & check history
        self.node.invalidateblock(blockhashes[-1])
        check_num_txs(num_block_txs=len(blockhashes) - 1, num_mempool_txs=0)

        # Create a replacement block (use a different destination address to ensure it
        # has a hash different from the invalidated one)
        blockhashes[-1] = self.generatetoaddress(
            self.node, 1, ADDRESS_ECREG_UNSPENDABLE
        )[0]

        # Mature 10 coinbase outputs
        blockhashes += self.generatetoaddress(
            self.node, 101, ADDRESS_ECREG_P2SH_OP_TRUE
        )
        check_num_txs(num_block_txs=len(blockhashes) - 1, num_mempool_txs=0)

        # Add mempool txs
        self.wallet.rescan_utxos()
        num_mempool_txs = 0
        for _ in range(10):
            self.wallet.send_self_transfer(from_node=self.node)
            num_mempool_txs += 1
            check_num_txs(
                num_block_txs=len(blockhashes) - 1, num_mempool_txs=num_mempool_txs
            )

        # Mine mempool txs, now they're in confirmed-txs
        blockhashes += self.generatetoaddress(self.node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)
        check_num_txs(
            num_block_txs=len(blockhashes) + num_mempool_txs - 1, num_mempool_txs=0
        )

    def test_wipe_index(self):
        self.log.info("Restarting with chronikscripthashindex=0 wipes the index")
        self.restart_node(0, ["-chronik", "-chronikscripthashindex=0"])
        assert_equal(
            self.chronik.script("scripthash", GENESIS_CB_SCRIPTHASH)
            .confirmed_txs()
            .err(400)
            .msg,
            "400: Script hash index disabled",
        )

        self.log.info("Restarting with chronikscripthashindex=1 restores the index")
        self.restart_node(0, ["-chronik", "-chronikscripthashindex=1"])
        assert_equal(
            self.chronik.script("p2pk", GENESIS_CB_PK).confirmed_txs().ok(),
            self.chronik.script("scripthash", GENESIS_CB_SCRIPTHASH)
            .confirmed_txs()
            .ok(),
        )


if __name__ == "__main__":
    ChronikScriptHashTest().main()
