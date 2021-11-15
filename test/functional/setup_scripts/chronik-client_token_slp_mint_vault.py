# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test chronik-client handles chronik data of SLP type 2 tokens correctly.
Abbreviated form of test/functional/chronik_token_slp_mint_vault.py
Looking to test the formats output by chronik-client, not chronik's indexing
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
from test_framework.blocktools import COINBASE_MATURITY, create_block, create_coinbase
from test_framework.chronik.slp import slp_genesis, slp_mint_vault
from test_framework.hash import hash160
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_12, OP_EQUAL, OP_HASH160, CScript
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal


class ChronikClientTokenSlpMintVault(SetupFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

        node = self.nodes[0]
        peer = node.add_p2p_connection(P2PDataStore())

        mocktime = 1300000000
        node.setmocktime(mocktime)

        yield True

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        block_hashes = self.generatetoaddress(
            node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE
        )

        coinvalue = 5000000000

        # Fan-out UTXOs so we have coins to work with
        fan_tx = CTransaction()
        fan_tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        fan_tx.vout = [
            CTxOut(100000, P2SH_OP_TRUE),
            CTxOut(100000, P2SH_OP_TRUE),
            CTxOut(100000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 500000, P2SH_OP_TRUE),
        ]
        fan_txid = node.sendrawtransaction(fan_tx.serialize().hex())

        self.log.info("Step 1: VAULT script locking MINT txs")

        # VAULT script locking MINT txs
        mint_vault_script = CScript([OP_12])
        mint_vault_scripthash = hash160(mint_vault_script)

        # Setup vault UTXOs
        vault_setup_tx = CTransaction()
        vault_setup_tx.vin = [CTxIn(COutPoint(int(fan_txid, 16), 1), SCRIPTSIG_OP_TRUE)]
        vault_setup_tx.vout = [
            CTxOut(10000, CScript([OP_HASH160, mint_vault_scripthash, OP_EQUAL])),
            CTxOut(10000, CScript([OP_HASH160, mint_vault_scripthash, OP_EQUAL])),
            CTxOut(79000, CScript([OP_HASH160, mint_vault_scripthash, OP_EQUAL])),
        ]
        pad_tx(vault_setup_tx)
        vault_setup_txid = node.sendrawtransaction(vault_setup_tx.serialize().hex())
        send_ipc_message({"vault_setup_txid": vault_setup_txid})
        yield True

        self.log.info("Step 2: Mine the mint vault tx")
        # Mine VAULT setup txs
        block_hashes += self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)
        assert_equal(node.getblockcount(), 102)
        yield True

        self.log.info("Step 3: SLP V2 MINT VAULT GENESIS")
        # SLP V2 MINT VAULT GENESIS
        slp_vault_genesis_tx = CTransaction()
        slp_vault_genesis_tx.vin = [
            CTxIn(COutPoint(int(fan_txid, 16), 0), SCRIPTSIG_OP_TRUE)
        ]
        slp_vault_genesis_tx.vout = [
            CTxOut(
                0,
                slp_genesis(
                    token_type=pb.SLP_TOKEN_TYPE_MINT_VAULT,
                    token_ticker=b"SLPVAULT",
                    token_name=b"0",
                    token_document_url=b"0",
                    token_document_hash=b"x" * 32,
                    mint_vault_scripthash=mint_vault_scripthash,
                    initial_mint_amount=1000,
                ),
            ),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(99000, P2SH_OP_TRUE),
        ]
        slp_vault_genesis_tx_txid = node.sendrawtransaction(
            slp_vault_genesis_tx.serialize().hex()
        )
        send_ipc_message({"slp_vault_genesis_txid": slp_vault_genesis_tx_txid})
        yield True

        self.log.info("Step 4: SLP V2 MINT VAULT MINT")

        # SLP V2 MINT VAULT MINT
        # MINT tx, but invalid because the GENESIS tx isn't mined yet
        slp_mint_vault_mint_tx = CTransaction()
        slp_mint_vault_mint_tx.vin = [
            CTxIn(
                COutPoint(int(vault_setup_txid, 16), 0),
                CScript([bytes(CScript([OP_12]))]),
            )
        ]
        slp_mint_vault_mint_tx.vout = [
            CTxOut(
                0,
                slp_mint_vault(
                    token_id=slp_vault_genesis_tx_txid,
                    mint_amounts=[4000],
                ),
            ),
            CTxOut(9000, P2SH_OP_TRUE),
        ]
        slp_mint_vault_mint_tx_txid = node.sendrawtransaction(
            slp_mint_vault_mint_tx.serialize().hex()
        )
        send_ipc_message({"slp_vault_mint_txid": slp_mint_vault_mint_tx_txid})
        yield True

        self.log.info("Step 5: Mine SLP V2 MINT VAULT MINT")
        # Mine only the GENESIS tx
        block_height = 103
        block = create_block(
            int(block_hashes[-1], 16),
            create_coinbase(block_height, b"\x03" * 33),
            1300000500,
            txlist=[slp_vault_genesis_tx],
        )
        block.solve()
        peer.send_blocks_and_test([block], node)
        assert_equal(node.getblockcount(), 103)
        yield True

        self.log.info("Step 6: Mint vault tx after genesis has confirmed")
        slp_mint_vault_mint_tx_valid = CTransaction()
        slp_mint_vault_mint_tx_valid.vin = [
            CTxIn(
                COutPoint(int(vault_setup_txid, 16), 1),
                CScript([bytes(CScript([OP_12]))]),
            )
        ]
        slp_mint_vault_mint_tx_valid.vout = [
            CTxOut(
                0,
                slp_mint_vault(
                    token_id=slp_vault_genesis_tx_txid,
                    mint_amounts=[5000],
                ),
            ),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        slp_mint_vault_mint_tx_valid.rehash()
        slp_mint_vault_mint_tx_valid_txid = node.sendrawtransaction(
            slp_mint_vault_mint_tx_valid.serialize().hex()
        )
        send_ipc_message(
            {"slp_mint_vault_mint_tx_valid_txid": slp_mint_vault_mint_tx_valid_txid}
        )
        yield True


if __name__ == "__main__":
    ChronikClientTokenSlpMintVault().main()
