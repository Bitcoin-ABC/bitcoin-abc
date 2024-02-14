# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik indexes SLP NFT1 tokens correctly.
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


class ChronikTokenSlpNft1(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

        def group_token(token_type=None, **kwargs) -> pb.Token:
            return pb.Token(
                token_type=token_type or pb.TokenType(slp=pb.SLP_TOKEN_TYPE_NFT1_GROUP),
                **kwargs,
            )

        def child_token(token_type=None, **kwargs) -> pb.Token:
            return pb.Token(
                token_type=token_type or pb.TokenType(slp=pb.SLP_TOKEN_TYPE_NFT1_CHILD),
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
                    token_type=pb.SLP_TOKEN_TYPE_NFT1_GROUP,
                    token_ticker=b"SLP NFT GROUP",
                    token_name=b"Slp NFT GROUP token",
                    token_document_url=b"http://slp.nft",
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
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_NFT1_GROUP),
                    tx_type=pb.GENESIS,
                    actual_burn_amount="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                group_token(token_id=tx.hash, amount=5000),
                group_token(token_id=tx.hash, is_mint_baton=True),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_NFT1_GROUP),
                genesis_info=pb.GenesisInfo(
                    token_ticker=b"SLP NFT GROUP",
                    token_name=b"Slp NFT GROUP token",
                    url=b"http://slp.nft",
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
                    token_type=pb.SLP_TOKEN_TYPE_NFT1_GROUP,
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
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_NFT1_GROUP),
                    tx_type=pb.MINT,
                    actual_burn_amount="0",
                ),
            ],
            inputs=[group_token(token_id=genesis.txid, is_mint_baton=True)],
            outputs=[
                pb.Token(),
                group_token(token_id=genesis.txid, amount=20),
                pb.Token(),
                group_token(token_id=genesis.txid, is_mint_baton=True),
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
                    token_type=pb.SLP_TOKEN_TYPE_NFT1_GROUP,
                    token_id=genesis.txid,
                    amounts=[1, 99, 900, 4000],
                ),
            ),
            CTxOut(2000, P2SH_OP_TRUE),
            CTxOut(2000, P2SH_OP_TRUE),
            CTxOut(2000, P2SH_OP_TRUE),
            CTxOut(2000, P2SH_OP_TRUE),
        ]
        send = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_NFT1_GROUP),
                    tx_type=pb.SEND,
                    actual_burn_amount="0",
                ),
            ],
            inputs=[
                group_token(token_id=genesis.txid, amount=5000),
            ],
            outputs=[
                pb.Token(),
                group_token(token_id=genesis.txid, amount=1),
                group_token(token_id=genesis.txid, amount=99),
                group_token(token_id=genesis.txid, amount=900),
                group_token(token_id=genesis.txid, amount=4000),
            ],
        )
        txs.append(send)
        send.send(chronik)
        send.test(chronik)

        # NFT1 CHILD GENESIS
        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(send.txid, 16), 1), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            CTxOut(
                0,
                slp_genesis(
                    token_type=pb.SLP_TOKEN_TYPE_NFT1_CHILD,
                    token_ticker=b"SLP NFT CHILD",
                    token_name=b"Slp NFT CHILD token",
                    decimals=0,
                    initial_mint_amount=1,
                ),
            ),
            CTxOut(1400, P2SH_OP_TRUE),
        ]
        tx.rehash()
        child_genesis1 = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.hash,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_NFT1_CHILD),
                    tx_type=pb.GENESIS,
                    group_token_id=genesis.txid,
                    actual_burn_amount="0",
                ),
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_NFT1_GROUP),
                    actual_burn_amount="0",
                ),
            ],
            inputs=[group_token(token_id=genesis.txid, entry_idx=1, amount=1)],
            outputs=[
                pb.Token(),
                child_token(token_id=tx.hash, amount=1),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_NFT1_CHILD),
                genesis_info=pb.GenesisInfo(
                    token_ticker=b"SLP NFT CHILD",
                    token_name=b"Slp NFT CHILD token",
                ),
            ),
        )
        txs.append(child_genesis1)
        child_genesis1.send(chronik)
        child_genesis1.test(chronik)

        # After mining, all txs still work fine
        block_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        for tx in txs:
            tx.test(chronik, block_hash)

        # Undo block + test again
        node.invalidateblock(block_hash)
        for tx in txs:
            tx.test(chronik)


if __name__ == "__main__":
    ChronikTokenSlpNft1().main()
