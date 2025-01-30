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
from test_framework.blocktools import (
    GENESIS_CB_PK,
    GENESIS_CB_SCRIPT_PUBKEY,
    GENESIS_CB_TXID,
    create_block,
    make_conform_to_ctor,
)
from test_framework.hash import hex_be_sha256
from test_framework.messages import XEC, CTransaction, FromHex, ToHex
from test_framework.p2p import P2PDataStore
from test_framework.script import CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import MiniWallet, MiniWalletMode

GENESIS_CB_SCRIPTHASH = hex_be_sha256(GENESIS_CB_SCRIPT_PUBKEY)
SCRIPTHASH_P2SH_OP_TRUE_HEX = hex_be_sha256(P2SH_OP_TRUE)


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
        self.op_true_wallet = MiniWallet(self.node, mode=MiniWalletMode.ADDRESS_OP_TRUE)

        # We add a connection to make getblocktemplate work
        self.node.add_p2p_connection(P2PDataStore())

        self.test_invalid_requests()
        self.test_valid_requests()
        self.test_conflicts()
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
            assert_equal(
                self.chronik.script("scripthash", payload).utxos().err(400).msg,
                err_msg,
            )

        # Potentially valid sha256 hash, but unlikely to collide with any existing
        # scripthash
        valid_payload = 32 * "ff"
        assert_equal(
            self.chronik.script("scripthash", valid_payload).utxos().err(404).msg,
            f'404: Script hash "{valid_payload}" not found',
        )

    def test_valid_requests(self):
        from test_framework.chronik.client import pb
        from test_framework.chronik.test_data import genesis_cb_tx

        # Unknown scripthash yields an empty history
        valid_payload = 32 * "ff"
        for resp in (
            self.chronik.script("scripthash", valid_payload).confirmed_txs(),
            self.chronik.script("scripthash", valid_payload).unconfirmed_txs(),
        ):
            assert_equal(
                resp.ok(),
                pb.TxHistoryPage(),
            )

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
        assert_equal(
            self.chronik.script("scripthash", GENESIS_CB_SCRIPTHASH).utxos().ok(),
            pb.ScriptUtxos(
                script=bytes.fromhex(f"41{GENESIS_CB_PK}ac"),
                utxos=[
                    pb.ScriptUtxo(
                        outpoint=pb.OutPoint(
                            txid=bytes.fromhex(GENESIS_CB_TXID)[::-1],
                            out_idx=0,
                        ),
                        block_height=0,
                        is_coinbase=True,
                        value=50_000_000 * XEC,
                        is_final=False,
                    )
                ],
            ),
        )
        # No txs in mempool for the genesis pubkey
        assert_equal(
            self.chronik.script("scripthash", GENESIS_CB_SCRIPTHASH)
            .unconfirmed_txs()
            .ok(),
            pb.TxHistoryPage(num_pages=0, num_txs=0),
        )

        def check_num_txs(num_block_txs, num_mempool_txs, num_utxos):
            page_size = 200
            page_num = 0
            script_conf_txs = (
                self.chronik.script("scripthash", SCRIPTHASH_P2SH_OP_TRUE_HEX)
                .confirmed_txs(page_num, page_size)
                .ok()
            )
            assert_equal(script_conf_txs.num_txs, num_block_txs)
            script_history = (
                self.chronik.script("scripthash", SCRIPTHASH_P2SH_OP_TRUE_HEX)
                .history(page_num, page_size)
                .ok()
            )
            assert_equal(script_history.num_txs, num_block_txs + num_mempool_txs)
            script_unconf_txs = (
                self.chronik.script("scripthash", SCRIPTHASH_P2SH_OP_TRUE_HEX)
                .unconfirmed_txs()
                .ok()
            )
            assert_equal(script_unconf_txs.num_txs, num_mempool_txs)
            script_utxos = (
                self.chronik.script("scripthash", SCRIPTHASH_P2SH_OP_TRUE_HEX)
                .utxos()
                .ok()
            )
            assert_equal(len(script_utxos.utxos), num_utxos)

        # Generate blocks to some address and verify the history
        blockhashes = self.generatetoaddress(self.node, 10, ADDRESS_ECREG_P2SH_OP_TRUE)
        check_num_txs(
            num_block_txs=len(blockhashes),
            num_mempool_txs=0,
            num_utxos=len(blockhashes),
        )

        # Undo last block & check history
        self.node.invalidateblock(blockhashes[-1])
        check_num_txs(
            num_block_txs=len(blockhashes) - 1,
            num_mempool_txs=0,
            num_utxos=len(blockhashes) - 1,
        )

        # Create a replacement block (use a different destination address to ensure it
        # has a hash different from the invalidated one)
        blockhashes[-1] = self.generatetoaddress(
            self.node, 1, ADDRESS_ECREG_UNSPENDABLE
        )[0]

        # Mature 10 coinbase outputs
        blockhashes += self.generatetoaddress(
            self.node, 101, ADDRESS_ECREG_P2SH_OP_TRUE
        )
        check_num_txs(
            num_block_txs=len(blockhashes) - 1,
            num_mempool_txs=0,
            num_utxos=len(blockhashes) - 1,
        )

        # Add mempool txs
        self.op_true_wallet.rescan_utxos()
        num_mempool_txs = 0
        # the number of utxos remains constant throughout the loop because we
        # spend one to create another one
        num_utxos = len(blockhashes) - 1
        for _ in range(10):
            self.op_true_wallet.send_self_transfer(from_node=self.node)
            num_mempool_txs += 1
            check_num_txs(
                num_block_txs=len(blockhashes) - 1,
                num_mempool_txs=num_mempool_txs,
                num_utxos=num_utxos,
            )

        # Mine mempool txs, now they're in confirmed-txs
        blockhashes += self.generatetoaddress(self.node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)
        check_num_txs(
            num_block_txs=len(blockhashes) + num_mempool_txs - 1,
            num_mempool_txs=0,
            num_utxos=num_utxos + 1,
        )

        self.log.info(
            "Test a mempool transaction whose script is not already in the confirmed db"
        )
        # This is the example used in the ElectrumX protocol documentation.
        script = CScript(
            bytes.fromhex("76a91462e907b15cbf27d5425399ebf6f0fb50ebb88f1888ac")
        )
        scripthash_hex = hex_be_sha256(script)
        assert_equal(
            scripthash_hex,
            "8b01df4e368ea28f8dc0423bcf7a4923e3a12d307c875e47a0cfbf90b5c39161",
        )

        # Ensure that this script was never seen before.
        assert_equal(
            self.chronik.script("scripthash", scripthash_hex).unconfirmed_txs().ok(),
            pb.TxHistoryPage(),
        )
        assert_equal(
            self.chronik.script("scripthash", scripthash_hex).utxos().err(404).msg,
            f'404: Script hash "{scripthash_hex}" not found',
        )

        txid = self.op_true_wallet.send_to(
            from_node=self.node, scriptPubKey=script, amount=1337
        )[0]

        # There is no confirmed history for this script, but we do have its scripthash
        # in the mempool so it no longer triggers a 404 error.
        assert_equal(
            self.chronik.script("scripthash", scripthash_hex).confirmed_txs().ok(),
            pb.TxHistoryPage(num_pages=0, num_txs=0),
        )
        # We do have one such unconfirmed tx.
        proto = self.chronik.script("scripthash", scripthash_hex).unconfirmed_txs().ok()
        assert_equal(proto.num_txs, 1)
        assert_equal(proto.txs[0].txid, bytes.fromhex(txid)[::-1])

        proto = self.chronik.script("scripthash", scripthash_hex).utxos().ok()
        assert_equal(len(proto.utxos), 1)
        assert_equal(proto.utxos[0].block_height, -1)
        assert_equal(proto.utxos[0].value, 1337)

    def test_conflicts(self):
        self.log.info("A mempool transaction is replaced by a mined transaction")

        # Use a different wallet to have a clean history
        wallet = MiniWallet(self.node, mode=MiniWalletMode.RAW_P2PK)
        script_pubkey = wallet.get_scriptPubKey()
        scripthash_hex1 = hex_be_sha256(script_pubkey)

        def assert_blank_history(scripthash_hex):
            assert_equal(
                self.chronik.script("scripthash", scripthash_hex)
                .confirmed_txs()
                .ok()
                .num_txs,
                0,
            )
            assert_equal(
                self.chronik.script("scripthash", scripthash_hex).utxos().err(404).msg,
                f'404: Script hash "{scripthash_hex}" not found',
            )

        assert_blank_history(scripthash_hex1)

        # Create two spendable utxos with this script and confirm them. Fund them with
        # the OP_TRUE wallet used in the previous test which should have plenty of
        # spendable utxos, so we don't need to create and mature additional coinbase
        # utxos.
        def get_utxo():
            funding_txid, _ = self.op_true_wallet.send_to(
                from_node=self.node, scriptPubKey=script_pubkey, amount=25_000_000
            )
            wallet.rescan_utxos()
            utxo_to_spend = wallet.get_utxo(txid=funding_txid)
            return utxo_to_spend

        utxo_to_spend1 = get_utxo()
        utxo_to_spend2 = get_utxo()

        self.generate(self.node, 1)

        def is_txid_in_history(txid: str, history_page) -> bool:
            return any(tx.txid[::-1].hex() == txid for tx in history_page.txs)

        def is_utxo_in_utxos(utxo: dict, script_utxos) -> bool:
            return any(
                txo.outpoint.txid[::-1].hex() == utxo["txid"]
                and txo.outpoint.out_idx == utxo["vout"]
                for txo in script_utxos.utxos
            )

        def check_history(
            scripthash_hex: str,
            conf_txids: list[str],
            unconf_txids: list[str],
            utxos=None,
        ):
            unconf_txs = (
                self.chronik.script("scripthash", scripthash_hex).unconfirmed_txs().ok()
            )
            conf_txs = (
                self.chronik.script("scripthash", scripthash_hex)
                .confirmed_txs(page_size=200)
                .ok()
            )
            script_utxos = (
                self.chronik.script("scripthash", scripthash_hex).utxos().ok()
            )
            assert_equal(conf_txs.num_txs, len(conf_txids))
            assert_equal(unconf_txs.num_txs, len(unconf_txids))
            assert_equal(len(script_utxos.utxos), len(utxos))
            assert all(is_txid_in_history(txid, conf_txs) for txid in conf_txids)
            assert all(is_txid_in_history(txid, unconf_txs) for txid in unconf_txids)
            assert all(is_utxo_in_utxos(utxo, script_utxos) for utxo in utxos)

            # Consistency check: None of the txids should be duplicated
            all_txids = conf_txids + unconf_txids
            assert len(all_txids) == len(set(all_txids))

        check_history(
            scripthash_hex1,
            conf_txids=[utxo_to_spend1["txid"], utxo_to_spend2["txid"]],
            unconf_txids=[],
            utxos=[utxo_to_spend1, utxo_to_spend2],
        )

        # Create 2 mempool txs, one of which will later conflict with a block tx.
        mempool_tx_to_be_replaced = wallet.send_self_transfer(
            from_node=self.nodes[0], utxo_to_spend=utxo_to_spend1
        )
        other_mempool_tx = wallet.send_self_transfer(
            from_node=self.nodes[0], utxo_to_spend=utxo_to_spend2
        )
        check_history(
            scripthash_hex1,
            conf_txids=[utxo_to_spend1["txid"], utxo_to_spend2["txid"]],
            unconf_txids=[
                mempool_tx_to_be_replaced["txid"],
                other_mempool_tx["txid"],
            ],
            utxos=[mempool_tx_to_be_replaced["new_utxo"], other_mempool_tx["new_utxo"]],
        )

        replacement_tx = wallet.create_self_transfer(utxo_to_spend=utxo_to_spend1)
        assert replacement_tx["txid"] != mempool_tx_to_be_replaced["txid"]

        block = create_block(tmpl=self.node.getblocktemplate())
        block.vtx.append(replacement_tx["tx"])
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        self.node.submitblock(ToHex(block))

        # The replaced mempool tx was dropped from both histories.
        # The other one is still in the unconfirmed txs.
        # The replacement tx is confirmed.
        check_history(
            scripthash_hex1,
            conf_txids=[
                utxo_to_spend1["txid"],
                utxo_to_spend2["txid"],
                replacement_tx["txid"],
            ],
            unconf_txids=[other_mempool_tx["txid"]],
            utxos=[other_mempool_tx["new_utxo"], replacement_tx["new_utxo"]],
        )

        self.log.info(
            "A mempool transaction is replaced by a mined transaction to a different "
            "script, leaving the first script's history blank."
        )
        script_pubkey = b"\x21\x03" + 32 * b"\xff" + b"\xac"
        scripthash_hex2 = hex_be_sha256(script_pubkey)

        funding_txid, funding_out_idx = self.op_true_wallet.send_to(
            from_node=self.node, scriptPubKey=script_pubkey, amount=50_000_000
        )
        check_history(
            scripthash_hex2,
            conf_txids=[],
            unconf_txids=[funding_txid],
            utxos=[{"txid": funding_txid, "vout": funding_out_idx}],
        )

        # Mine a tx spending the same input to a different output.
        replacement_tx = FromHex(
            CTransaction(), self.node.getrawtransaction(funding_txid)
        )
        for out_idx, txout in enumerate(replacement_tx.vout):
            if txout.scriptPubKey == script_pubkey:
                break
        replacement_tx.vout[out_idx].scriptPubKey = b"\x21\x03" + 32 * b"\xee" + b"\xac"
        replacement_tx.rehash()

        block = create_block(tmpl=self.node.getblocktemplate())
        block.vtx.append(replacement_tx)
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        self.node.submitblock(ToHex(block))

        # There is no transaction left for this script.
        assert_blank_history(scripthash_hex2)

    def test_wipe_index(self):
        self.log.info("Restarting with chronikscripthashindex=0 wipes the index")
        with self.node.assert_debug_log(
            [
                " Warning: Wiping existing scripthash index, since -chronikscripthashindex=0",
            ]
        ):
            self.restart_node(0, ["-chronik", "-chronikscripthashindex=0"])
        assert_equal(
            self.chronik.script("scripthash", GENESIS_CB_SCRIPTHASH)
            .confirmed_txs()
            .err(400)
            .msg,
            "400: Script hash index disabled",
        )
        assert_equal(
            self.chronik.script("scripthash", GENESIS_CB_SCRIPTHASH)
            .utxos()
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
