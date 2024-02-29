# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test chronik-client handles chronik data of SLP NFT1 tokens correctly.
Based on test/functional/chronik_token_slp_nft1.py
"""

import pathmagic  # noqa
from ipc import send_ipc_message
from setup_framework import SetupFramework
from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.chronik.slp import slp_genesis, slp_mint, slp_send
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.util import assert_equal


class ChronikClientTokenSlpNft1(SetupFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

        node = self.nodes[0]

        mocktime = 1300000000
        node.setmocktime(mocktime)

        yield True

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000

        self.log.info("Step 1: Send an SLP NFT1 genesis tx")
        slp_nft1_genesis_tx = CTransaction()
        slp_nft1_genesis_tx.vin = [
            CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)
        ]
        slp_nft1_genesis_tx.vout = [
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
        slp_nft1_genesis_tx_txid = node.sendrawtransaction(
            slp_nft1_genesis_tx.serialize().hex()
        )

        send_ipc_message({"slp_nft1_genesis_txid": slp_nft1_genesis_tx_txid})
        yield True

        self.log.info("Step 2: Mint a child token")

        slp_nft1_mint_tx = CTransaction()
        slp_nft1_mint_tx.vin = [
            CTxIn(COutPoint(int(slp_nft1_genesis_tx_txid, 16), 2), SCRIPTSIG_OP_TRUE)
        ]
        slp_nft1_mint_tx.vout = [
            CTxOut(
                0,
                slp_mint(
                    token_type=pb.SLP_TOKEN_TYPE_NFT1_GROUP,
                    token_id=slp_nft1_genesis_tx_txid,
                    mint_baton_vout=3,
                    mint_amount=20,
                ),
            ),
            CTxOut(2000, P2SH_OP_TRUE),
            CTxOut(2000, P2SH_OP_TRUE),
            CTxOut(2000, P2SH_OP_TRUE),
        ]
        slp_nft1_mint_tx_txid = node.sendrawtransaction(
            slp_nft1_mint_tx.serialize().hex()
        )
        send_ipc_message({"slp_nft1_mint_txid": slp_nft1_mint_tx_txid})
        yield True

        self.log.info("Step 3: Send a child token")

        slp_nft1_send_tx = CTransaction()
        slp_nft1_send_tx.vin = [
            CTxIn(COutPoint(int(slp_nft1_genesis_tx_txid, 16), 1), SCRIPTSIG_OP_TRUE)
        ]
        slp_nft1_send_tx.vout = [
            CTxOut(
                0,
                slp_send(
                    token_type=pb.SLP_TOKEN_TYPE_NFT1_GROUP,
                    token_id=slp_nft1_genesis_tx_txid,
                    amounts=[1, 99, 900, 4000],
                ),
            ),
            CTxOut(2000, P2SH_OP_TRUE),
            CTxOut(2000, P2SH_OP_TRUE),
            CTxOut(2000, P2SH_OP_TRUE),
            CTxOut(2000, P2SH_OP_TRUE),
        ]
        slp_nft1_send_tx_txid = node.sendrawtransaction(
            slp_nft1_send_tx.serialize().hex()
        )
        send_ipc_message({"slp_nft1_send_txid": slp_nft1_send_tx_txid})
        yield True

        self.log.info("Step 4: NFT 1 child genesis")

        # NFT1 CHILD GENESIS
        slp_nft1_child_genesis1_tx = CTransaction()
        slp_nft1_child_genesis1_tx.vin = [
            CTxIn(COutPoint(int(slp_nft1_send_tx_txid, 16), 1), SCRIPTSIG_OP_TRUE)
        ]
        slp_nft1_child_genesis1_tx.vout = [
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
        slp_nft1_child_genesis1_tx_txid = node.sendrawtransaction(
            slp_nft1_child_genesis1_tx.serialize().hex()
        )
        send_ipc_message(
            {"slp_nft1_child_genesis1_txid": slp_nft1_child_genesis1_tx_txid}
        )
        yield True

        self.log.info("Step 5: Mine a block")
        self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        assert_equal(node.getblockcount(), 102)
        yield True


if __name__ == "__main__":
    ChronikClientTokenSlpNft1().main()
