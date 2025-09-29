# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik indexes SLP V2 MINT VAULT txs correctly.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY, create_block, create_coinbase
from test_framework.chronik.slp import slp_genesis, slp_mint_vault, slp_send
from test_framework.chronik.token_tx import TokenTx
from test_framework.hash import hash160
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_12, OP_EQUAL, OP_HASH160, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx


class ChronikTokenSlpMintVault(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

        def vault_token(token_type=None, **kwargs) -> pb.Token:
            return pb.Token(
                token_type=token_type or pb.TokenType(slp=pb.SLP_TOKEN_TYPE_MINT_VAULT),
                **kwargs,
            )

        node = self.nodes[0]
        chronik = node.get_chronik_client()

        peer = node.add_p2p_connection(P2PDataStore())
        mocktime = 1300000000
        node.setmocktime(mocktime)

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

        # VAULT script locking MINT txs
        mint_vault_script = CScript([OP_12])
        mint_vault_scripthash = hash160(mint_vault_script)

        # Setup vault UTXOs
        vault_setup_tx = CTransaction()
        vault_setup_tx.vin = [CTxIn(COutPoint(int(fan_txid, 16), 1), SCRIPTSIG_OP_TRUE)]
        vault_setup_tx.vout = [
            CTxOut(10000, CScript([OP_HASH160, mint_vault_scripthash, OP_EQUAL])),
            CTxOut(10000, CScript([OP_HASH160, mint_vault_scripthash, OP_EQUAL])),
            CTxOut(10000, CScript([OP_HASH160, mint_vault_scripthash, OP_EQUAL])),
            CTxOut(69000, CScript([OP_HASH160, mint_vault_scripthash, OP_EQUAL])),
        ]
        pad_tx(vault_setup_tx)
        vault_setup_txid = node.sendrawtransaction(vault_setup_tx.serialize().hex())
        # Mine VAULT setup txs
        block_hashes += self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)

        # SLP V2 MINT VAULT GENESIS
        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(fan_txid, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
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
        genesis = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.txid_hex,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_MINT_VAULT),
                    tx_type=pb.GENESIS,
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                vault_token(token_id=tx.txid_hex, atoms=1000),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.txid_hex,
                token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_MINT_VAULT),
                genesis_info=pb.GenesisInfo(
                    token_ticker=b"SLPVAULT",
                    token_name=b"0",
                    url=b"0",
                    hash=b"x" * 32,
                    mint_vault_scripthash=mint_vault_scripthash,
                ),
            ),
        )
        genesis.send(chronik)
        genesis.test(chronik)

        # SLP V2 MINT VAULT MINT
        tx = CTransaction()
        tx.vin = [
            CTxIn(
                COutPoint(int(vault_setup_txid, 16), 0),
                CScript([bytes(CScript([OP_12]))]),
            )
        ]
        tx.vout = [
            CTxOut(
                0,
                slp_mint_vault(
                    token_id=genesis.txid,
                    mint_amounts=[4000],
                ),
            ),
            CTxOut(9000, P2SH_OP_TRUE),
        ]
        # MINT tx, but invalid because the GENESIS tx isn't mined yet
        mint = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NOT_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_MINT_VAULT),
                    tx_type=pb.MINT,
                    is_invalid=True,
                    burn_summary="Validation error: Missing MINT vault",
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                pb.Token(),
            ],
        )
        mint.send(
            chronik,
            error=f"400: Tx {mint.txid} failed token checks: Validation error: Missing MINT vault.",
        )
        mint.test(chronik)

        # Mine only the GENESIS tx
        block_height = 103
        block = create_block(
            int(block_hashes[-1], 16),
            create_coinbase(block_height, b"\x03" * 33),
            1300000500,
            txlist=[genesis.tx],
        )
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()
        genesis.test(chronik, block.hash)

        # MINT is still invalid, despite GENESIS being mined.
        # This inconsistency is intended behavior, see chronik/chronik-db/src/mem/tokens.rs for details.
        mint.test(chronik)

        # Another SLP V2 MINT VAULT MINT, this time valid because the GENESIS is mined.
        tx = CTransaction()
        tx.vin = [
            CTxIn(
                COutPoint(int(vault_setup_txid, 16), 1),
                CScript([bytes(CScript([OP_12]))]),
            )
        ]
        tx.vout = [
            CTxOut(
                0,
                slp_mint_vault(
                    token_id=genesis.txid,
                    mint_amounts=[5000],
                ),
            ),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        mint2 = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_MINT_VAULT),
                    tx_type=pb.MINT,
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                vault_token(token_id=genesis.txid, atoms=5000),
            ],
        )
        mint2.send(chronik)
        mint2.test(chronik)

        # MINT VAULT with 0 quantity is still indexed correctly
        tx = CTransaction()
        tx.vin = [
            CTxIn(
                COutPoint(int(vault_setup_txid, 16), 2),
                CScript([bytes(CScript([OP_12]))]),
            )
        ]
        tx.vout = [
            CTxOut(
                0,
                slp_mint_vault(
                    token_id=genesis.txid,
                    mint_amounts=[0],
                ),
            ),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        mint3 = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_MINT_VAULT),
                    tx_type=pb.MINT,
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                pb.Token(),
            ],
        )
        mint3.send(chronik)
        mint3.test(chronik)

        # Also still valid even after it's been mined
        block_mint3 = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        mint3.test(chronik, block_mint3)
        node.invalidateblock(block_mint3)

        # Reorg block with the GENESIS tx
        node.invalidateblock(block.hash)

        # GENESIS still valid
        genesis.test(chronik)
        # MINT still invalid (correctly, now)
        mint.test(chronik)

        # mint2 now invalid (disconnect removes and re-adds all mempool txs)
        mint2.status = pb.TOKEN_STATUS_NOT_NORMAL
        mint2.entries[0].is_invalid = True
        mint2.entries[0].burn_summary = "Validation error: Missing MINT vault"
        mint2.outputs = [pb.Token(), pb.Token()]
        mint2.test(chronik)

        # Mine GENESIS and mint2
        block_height = 103
        block = create_block(
            int(block_hashes[-1], 16),
            create_coinbase(block_height, b"\x03" * 33),
            1300000500,
            txlist=[genesis.tx, mint2.tx],
        )
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()
        block_hashes.append(block.hash)

        # GENESIS still valid
        genesis.test(chronik, block.hash)
        # MINTs still invalid
        mint.test(chronik)
        mint2.test(chronik, block.hash)

        # Add SEND to mempool from `mint`
        tx = CTransaction()
        tx.vin = [
            CTxIn(
                COutPoint(int(mint.txid, 16), 1),
                SCRIPTSIG_OP_TRUE,
            )
        ]
        tx.vout = [
            CTxOut(
                0,
                slp_send(
                    token_type=pb.SLP_TOKEN_TYPE_MINT_VAULT,
                    token_id=genesis.txid,
                    amounts=[3000, 1000],
                ),
            ),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        send = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NOT_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_MINT_VAULT),
                    tx_type=pb.SEND,
                    is_invalid=True,
                    actual_burn_atoms="0",
                    burn_summary="Validation error: Insufficient token input output sum: 0 < 4000",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                pb.Token(),
                pb.Token(),
            ],
        )
        send.send(
            chronik,
            error=f"400: Tx {send.txid} failed token checks: Validation error: Insufficient token input output sum: 0 < 4000.",
        )
        send.test(chronik)

        # Mine mint
        block_hashes += self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)
        # Now it becomes valid
        mint.status = pb.TOKEN_STATUS_NORMAL
        mint.entries[0].is_invalid = False
        mint.entries[0].burn_summary = ""
        mint.outputs = [pb.Token(), vault_token(token_id=genesis.txid, atoms=4000)]
        mint.test(chronik, block_hashes[-1])
        # The SEND also transitively becomes valid
        send.status = pb.TOKEN_STATUS_NORMAL
        send.entries[0].is_invalid = False
        send.entries[0].burn_summary = ""
        send.inputs = [vault_token(token_id=genesis.txid, atoms=4000)]
        send.outputs = [
            pb.Token(),
            vault_token(token_id=genesis.txid, atoms=3000),
            vault_token(token_id=genesis.txid, atoms=1000),
        ]
        send.test(chronik, block_hashes[-1])

        # After invalidating the last block, the txs are still valid
        node.invalidateblock(block_hashes[-1])
        mint.test(chronik)
        send.test(chronik)


if __name__ == "__main__":
    ChronikTokenSlpMintVault().main()
