#!/usr/bin/env python3
# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik broadcasts a batch of txs correctly.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.chronik.alp import alp_genesis, alp_opreturn, alp_send
from test_framework.chronik.token_tx import TokenTx
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.script import CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikTokenBroadcastTxs(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

        def alp_token(token_type=None, **kwargs) -> pb.Token:
            return pb.Token(
                token_type=token_type or pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                **kwargs,
            )

        node = self.nodes[0]
        chronik = node.get_chronik_client()

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000

        txs = []

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            alp_opreturn(
                alp_genesis(
                    mint_amounts=[1000, 2000, 3000, 4000, 5000, 6000],
                    num_batons=0,
                ),
            ),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
        ]
        tx.rehash()
        genesis = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.hash,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.GENESIS,
                    actual_burn_amount="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                alp_token(token_id=tx.hash, amount=1000),
                alp_token(token_id=tx.hash, amount=2000),
                alp_token(token_id=tx.hash, amount=3000),
                alp_token(token_id=tx.hash, amount=4000),
                alp_token(token_id=tx.hash, amount=5000),
                alp_token(token_id=tx.hash, amount=6000),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                genesis_info=pb.GenesisInfo(),
            ),
        )
        txs.append(genesis)
        genesis.send(chronik)
        genesis.test(chronik)

        ok_tx = CTransaction()
        ok_tx.vin = [CTxIn(COutPoint(int(genesis.txid, 16), 1), SCRIPTSIG_OP_TRUE)]
        ok_tx.vout = [
            alp_opreturn(alp_send(genesis.txid, [1000])),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        ok_tx.rehash()

        burn_tx = CTransaction()
        burn_tx.vin = [CTxIn(COutPoint(int(genesis.txid, 16), 2), SCRIPTSIG_OP_TRUE)]
        burn_tx.vout = [
            alp_opreturn(alp_send(genesis.txid, [1999])),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        burn_tx.rehash()

        burn2_tx = CTransaction()
        burn2_tx.vin = [CTxIn(COutPoint(int(genesis.txid, 16), 3), SCRIPTSIG_OP_TRUE)]
        burn2_tx.vout = [
            alp_opreturn(alp_send(genesis.txid, [3001])),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        burn2_tx.rehash()

        wrong_sig_tx = CTransaction()
        wrong_sig_tx.vin = [CTxIn(COutPoint(int(genesis.txid, 16), 4), CScript())]
        wrong_sig_tx.vout = [
            alp_opreturn(alp_send(genesis.txid, [4000])),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        wrong_sig_tx.rehash()

        ok2_tx = CTransaction()
        ok2_tx.vin = [CTxIn(COutPoint(int(genesis.txid, 16), 5), SCRIPTSIG_OP_TRUE)]
        ok2_tx.vout = [
            alp_opreturn(alp_send(genesis.txid, [5000])),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        ok2_tx.rehash()

        ok3_tx = CTransaction()
        ok3_tx.vin = [CTxIn(COutPoint(int(genesis.txid, 16), 6), SCRIPTSIG_OP_TRUE)]
        ok3_tx.vout = [
            alp_opreturn(alp_send(genesis.txid, [6000])),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        ok3_tx.rehash()

        error = chronik.broadcast_txs(
            [
                ok_tx.serialize(),
                burn_tx.serialize(),
                burn2_tx.serialize(),
                wrong_sig_tx.serialize(),
            ]
        ).err(400)

        assert_equal(
            error.msg,
            f"""\
400: Tx {burn_tx.hash} failed token checks: Unexpected burn: Burns 1 base tokens. Tx \
{burn2_tx.hash} failed token checks: Unexpected burn: Burns 3000 base tokens. \
Reason(s): Insufficient token input output sum: 3000 < 3001.""",
        )

        # Token checks succeed but invalid sig -> broadcasts ok_tx anyway
        error = chronik.broadcast_txs(
            [
                ok_tx.serialize(),
                wrong_sig_tx.serialize(),
                ok2_tx.serialize(),
            ]
        ).err(400)
        assert_equal(
            error.msg,
            """\
400: Broadcast failed: Transaction rejected by mempool: \
mandatory-script-verify-flag-failed (Operation not valid with the current stack size)\
""",
        )
        chronik.tx(ok_tx.hash).ok()
        chronik.tx(ok2_tx.hash).err(404)

        # Broadcast multiple txs successfully
        txids = (
            chronik.broadcast_txs(
                [ok2_tx.serialize(), ok3_tx.serialize()],
            )
            .ok()
            .txids
        )
        assert_equal(
            txids,
            [bytes.fromhex(ok2_tx.hash)[::-1], bytes.fromhex(ok3_tx.hash)[::-1]],
        )

        # Skip token checks, broadcast burns without complaining
        txids = (
            chronik.broadcast_txs(
                [burn_tx.serialize(), burn2_tx.serialize()],
                skip_token_checks=True,
            )
            .ok()
            .txids
        )
        assert_equal(
            txids,
            [bytes.fromhex(burn_tx.hash)[::-1], bytes.fromhex(burn2_tx.hash)[::-1]],
        )


if __name__ == "__main__":
    ChronikTokenBroadcastTxs().main()
