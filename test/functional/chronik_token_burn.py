# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik indexes token burns correctly.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.chronik.alp import alp_burn, alp_genesis, alp_opreturn, alp_send
from test_framework.chronik.slp import slp_burn, slp_genesis
from test_framework.chronik.token_tx import TokenTx
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.test_framework import BitcoinTestFramework


class ChronikTokenBurn(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

        def slp_token(token_type=None, **kwargs) -> pb.Token:
            return pb.Token(
                token_type=token_type or pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                **kwargs,
            )

        def alp_token(token_type=None, **kwargs) -> pb.Token:
            return pb.Token(
                token_type=token_type or pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                **kwargs,
            )

        node = self.nodes[0]
        chronik = node.get_chronik_client()

        mocktime = 1300000000
        node.setmocktime(mocktime)

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        self.generatetoaddress(node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000

        # Make a normal non-token tx
        non_token_tx = CTransaction()
        non_token_tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        non_token_tx.vout = [
            CTxOut(coinvalue - 1000, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        node.sendrawtransaction(non_token_tx.serialize().hex())

        txs = []

        tx = CTransaction()
        tx.vin = [
            CTxIn(COutPoint(int(non_token_tx.txid_hex, 16), 0), SCRIPTSIG_OP_TRUE)
        ]
        tx.vout = [
            CTxOut(
                0,
                slp_genesis(
                    token_type=pb.SLP_TOKEN_TYPE_FUNGIBLE,
                    mint_baton_vout=2,
                    initial_mint_amount=5000,
                ),
            ),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
        ]
        genesis_slp = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.txid_hex,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                    tx_type=pb.GENESIS,
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                slp_token(token_id=tx.txid_hex, atoms=5000),
                slp_token(token_id=tx.txid_hex, is_mint_baton=True),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.txid_hex,
                token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                genesis_info=pb.GenesisInfo(),
            ),
        )
        txs.append(genesis_slp)
        genesis_slp.send(chronik)
        genesis_slp.test(chronik)

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(genesis_slp.txid, 16), 1), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            CTxOut(
                0,
                slp_burn(
                    token_type=pb.SLP_TOKEN_TYPE_FUNGIBLE,
                    token_id=genesis_slp.txid,
                    amount=5000,
                ),
            ),
        ]
        burn_slp = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis_slp.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                    tx_type=pb.BURN,
                    actual_burn_atoms="5000",
                    intentional_burn_atoms=5000,
                ),
            ],
            inputs=[slp_token(token_id=genesis_slp.txid, atoms=5000)],
            outputs=[pb.Token()],
        )
        txs.append(burn_slp)
        burn_slp.send(chronik)
        burn_slp.test(chronik)

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(genesis_slp.txid, 16), 3), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            alp_opreturn(
                alp_genesis(
                    mint_amounts=[1000],
                    num_batons=1,
                ),
            ),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 200000, P2SH_OP_TRUE),
        ]
        genesis_alp = TokenTx(
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
                alp_token(token_id=tx.txid_hex, atoms=1000),
                alp_token(token_id=tx.txid_hex, is_mint_baton=True),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.txid_hex,
                token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                genesis_info=pb.GenesisInfo(),
            ),
        )
        txs.append(genesis_alp)
        genesis_alp.send(chronik)
        genesis_alp.test(chronik)

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(genesis_alp.txid, 16), 1), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            alp_opreturn(
                alp_send(genesis_alp.txid, [400]),
                alp_burn(genesis_alp.txid, 500),
            ),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        burn_alp = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NOT_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis_alp.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.SEND,
                    burn_summary="Unexpected burn: Burns 600 atoms, but intended to burn 500; burned 100 too many",
                    actual_burn_atoms="600",
                    intentional_burn_atoms=500,
                ),
            ],
            inputs=[alp_token(token_id=genesis_alp.txid, atoms=1000)],
            outputs=[
                pb.Token(),
                alp_token(token_id=genesis_alp.txid, atoms=400),
            ],
        )
        txs.append(burn_alp)
        burn_alp.send(
            chronik,
            error=f"400: Tx {burn_alp.txid} failed token checks: Unexpected burn: Burns 600 atoms, but intended to burn 500; burned 100 too many.",
        )
        burn_alp.test(chronik)

        # Burns SLP mint baton + ALP tokens without any OP_RETURN
        tx = CTransaction()
        tx.vin = [
            CTxIn(COutPoint(int(non_token_tx.txid_hex, 16), 1), SCRIPTSIG_OP_TRUE),
            CTxIn(COutPoint(int(genesis_slp.txid, 16), 2), SCRIPTSIG_OP_TRUE),
            CTxIn(COutPoint(int(burn_alp.txid, 16), 1), SCRIPTSIG_OP_TRUE),
        ]
        tx.vout = [
            CTxOut(546, P2SH_OP_TRUE),
        ]
        bare_burn = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NOT_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis_slp.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                    is_invalid=True,
                    burn_summary="Unexpected burn: Burns mint baton(s)",
                    actual_burn_atoms="0",
                    burns_mint_batons=True,
                ),
                pb.TokenEntry(
                    token_id=genesis_alp.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    is_invalid=True,
                    burn_summary="Unexpected burn: Burns 400 atoms",
                    actual_burn_atoms="400",
                ),
            ],
            inputs=[
                pb.Token(),
                slp_token(token_id=genesis_slp.txid, is_mint_baton=True),
                alp_token(token_id=genesis_alp.txid, atoms=400, entry_idx=1),
            ],
            outputs=[
                pb.Token(),
            ],
        )
        txs.append(bare_burn)
        bare_burn.send(
            chronik,
            error=f"400: Tx {bare_burn.txid} failed token checks: Unexpected burn: Burns mint baton(s). Unexpected burn: Burns 400 atoms.",
        )
        bare_burn.test(chronik)

        # After mining, all txs still work fine
        block_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        for tx in txs:
            tx.test(chronik, block_hash)

        # Undo block + test again
        node.invalidateblock(block_hash)
        for tx in txs:
            tx.test(chronik)


if __name__ == "__main__":
    ChronikTokenBurn().main()
