# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik indexes fungible SLP tokens.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.chronik.slp import slp_genesis, slp_mint, slp_send
from test_framework.chronik.token_tx import TokenTx
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.test_framework import BitcoinTestFramework


class ChronikTokenSlpFungible(BitcoinTestFramework):
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

        node = self.nodes[0]
        chronik = node.get_chronik_client()

        mocktime = 1300000000
        node.setmocktime(mocktime)

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000

        txs = []

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            CTxOut(
                0,
                slp_genesis(
                    token_type=pb.SLP_TOKEN_TYPE_FUNGIBLE,
                    token_ticker=b"SLPTEST",
                    token_name=b"Test SLP Token 3",
                    token_document_url=b"http://example/slp",
                    token_document_hash=b"x" * 32,
                    decimals=4,
                    mint_baton_vout=2,
                    initial_mint_amount=5000,
                ),
            ),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 400000, P2SH_OP_TRUE),
        ]
        tx.rehash()
        genesis = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.hash,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                    tx_type=pb.GENESIS,
                    actual_burn_amount="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                pb.Token(
                    token_id=tx.hash,
                    amount=5000,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                ),
                pb.Token(
                    token_id=tx.hash,
                    is_mint_baton=True,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                ),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                genesis_info=pb.GenesisInfo(
                    token_ticker=b"SLPTEST",
                    token_name=b"Test SLP Token 3",
                    url=b"http://example/slp",
                    hash=b"x" * 32,
                    decimals=4,
                ),
            ),
        )
        txs.append(genesis)
        genesis.send(chronik)
        genesis.test(chronik)

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(genesis.txid, 16), 2), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            CTxOut(
                0,
                slp_mint(
                    token_type=pb.SLP_TOKEN_TYPE_FUNGIBLE,
                    token_id=genesis.txid,
                    mint_baton_vout=3,
                    mint_amount=20,
                ),
            ),
            CTxOut(2000, P2SH_OP_TRUE),
            CTxOut(2000, P2SH_OP_TRUE),
            CTxOut(2000, P2SH_OP_TRUE),
        ]
        mint = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                    tx_type=pb.MINT,
                    actual_burn_amount="0",
                ),
            ],
            inputs=[slp_token(token_id=genesis.txid, is_mint_baton=True)],
            outputs=[
                pb.Token(),
                slp_token(token_id=genesis.txid, amount=20),
                pb.Token(),
                slp_token(token_id=genesis.txid, is_mint_baton=True),
            ],
        )
        txs.append(mint)
        mint.send(chronik)
        mint.test(chronik)

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(genesis.txid, 16), 1), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            CTxOut(
                0,
                slp_send(
                    token_type=pb.SLP_TOKEN_TYPE_FUNGIBLE,
                    token_id=genesis.txid,
                    amounts=[1000, 4000],
                ),
            ),
            CTxOut(4000, P2SH_OP_TRUE),
            CTxOut(4000, P2SH_OP_TRUE),
        ]
        send = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                    tx_type=pb.SEND,
                    actual_burn_amount="0",
                ),
            ],
            inputs=[
                slp_token(token_id=genesis.txid, amount=5000),
            ],
            outputs=[
                pb.Token(),
                slp_token(token_id=genesis.txid, amount=1000),
                slp_token(token_id=genesis.txid, amount=4000),
            ],
        )
        txs.append(send)
        send.send(chronik)
        send.test(chronik)

        # SLP GENESIS with empty GenesisInfo
        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(genesis.txid, 16), 3), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            CTxOut(
                0,
                slp_genesis(
                    token_type=pb.SLP_TOKEN_TYPE_FUNGIBLE,
                    mint_baton_vout=None,
                    initial_mint_amount=0,
                ),
            ),
            CTxOut(coinvalue - 500000, P2SH_OP_TRUE),
        ]
        tx.rehash()
        genesis_empty = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.hash,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                    tx_type=pb.GENESIS,
                    actual_burn_amount="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                genesis_info=pb.GenesisInfo(),
            ),
        )
        txs.append(genesis_empty)
        genesis_empty.send(chronik)
        genesis_empty.test(chronik)

        # After mining, all txs still work fine
        block_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        for tx in txs:
            tx.test(chronik, block_hash)

        # Undo block + test again
        node.invalidateblock(block_hash)
        for tx in txs:
            tx.test(chronik)


if __name__ == "__main__":
    ChronikTokenSlpFungible().main()
