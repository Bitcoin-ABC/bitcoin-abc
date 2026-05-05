# Copyright (c) 2026 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik POST /script/batch/summary (ScriptBatchSummary protos).
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY, GENESIS_CB_PK
from test_framework.chronik.alp import alp_genesis, alp_opreturn
from test_framework.chronik.token_tx import TokenTx
from test_framework.hash import hash160
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal
from test_framework.wallet import getnewdestination


class ChronikScriptBatchSummaryTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

        node = self.nodes[0]
        chronik = node.get_chronik_client()

        def alp_token(token_id: str, atoms: int) -> pb.Token:
            return pb.Token(
                token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                token_id=token_id,
                atoms=atoms,
            )

        unknown_p2pkh = "11" * 20

        assert_equal(
            chronik.script_batch_summary(
                [
                    ("p2pkh", "dead"),
                ]
            )
            .err(400)
            .msg,
            "400: Invalid payload for P2PKH: Invalid length, expected 20 bytes"
            " but got 2 bytes",
        )

        assert_equal(
            chronik.script_batch_summary(
                [
                    ("p2pk", GENESIS_CB_PK),
                    ("p2pk", GENESIS_CB_PK),
                ]
            )
            .err(400)
            .msg,
            "400: Duplicate script entries in batch request",
        )

        empty_batch = chronik.script_batch_summary([]).err(400)
        assert_equal(
            empty_batch.msg,
            "400: Batch script request must include at least one script",
        )

        too_many = [("p2pkh", "00" * 20)] * 501
        too_large = chronik.script_batch_summary(too_many).err(400)
        assert_equal(
            too_large.msg,
            "400: Too many scripts in batch: max is 500, got 501",
        )

        # P2SH (OP_TRUE redeem) plus a P2PKH output that holds an ALP token UTXO
        node.setmocktime(1300000000)
        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        cointx = node.getblock(coinblockhash)["tx"][0]
        self.generatetoaddress(node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000
        pubkey, token_spk, _token_addr = getnewdestination()
        token_keyhash_hex = hash160(pubkey).hex()

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            alp_opreturn(
                alp_genesis(
                    token_ticker=b"BAT",
                    token_name=b"Batch Tok",
                    url=b"",
                    data=b"",
                    auth_pubkey=b"",
                    decimals=0,
                    mint_amounts=[99],
                    num_batons=0,
                )
            ),
            CTxOut(546, token_spk),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
        ]
        genesis_tok = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.txid_hex,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.GENESIS,
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                alp_token(tx.txid_hex, 99),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.txid_hex,
                token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                genesis_info=pb.GenesisInfo(
                    token_ticker=b"BAT",
                    token_name=b"Batch Tok",
                ),
            ),
        )
        genesis_tok.send(chronik)
        genesis_tok.test(chronik)
        mined_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        genesis_tok.test(chronik, mined_hash)

        p2sh_payload_hex = P2SH_OP_TRUE[2:-1].hex()

        scripts = [
            ("p2pk", GENESIS_CB_PK),
            ("p2pkh", unknown_p2pkh),
            ("p2sh", p2sh_payload_hex),
            ("p2pkh", token_keyhash_hex),
        ]

        batch = chronik.script_batch_summary(scripts).ok()
        assert_equal(len(batch.rows), len(scripts))

        assert_equal(
            [row.num_txs for row in batch.rows],
            [
                1,  # GENESIS_CB_PK
                0,  # unknown_p2pkh
                2,  # p2sh_payload_hex (cointx + genesis_tok)
                1,  # token_keyhash_hex
            ],
        )
        assert_equal(
            [row.num_utxos for row in batch.rows],
            [
                1,  # GENESIS_CB_PK
                0,  # unknown_p2pkh
                1,  # p2sh_payload_hex (change)
                1,  # token_keyhash_hex (token utxo)
            ],
        )

        for idx, (script_type, payload_hex) in enumerate(scripts):
            row = batch.rows[idx]
            hist = chronik.script(script_type, payload_hex).history().ok()
            utxos = chronik.script(script_type, payload_hex).utxos().ok()
            assert_equal(
                row,
                pb.ScriptBatchSummaryRow(
                    script=pb.ScriptRef(
                        script_type=script_type, payload=bytes.fromhex(payload_hex)
                    ),
                    num_txs=hist.num_txs,
                    num_utxos=len(utxos.utxos),
                    latest_tx=hist.txs[0] if hist.num_txs > 0 else None,
                ),
            )


if __name__ == "__main__":
    ChronikScriptBatchSummaryTest().main()
