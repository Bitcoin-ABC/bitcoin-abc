#!/usr/bin/env python3
# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's ALP integration.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import (
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.chronik.alp import (
    alp_burn,
    alp_genesis,
    alp_mint,
    alp_opreturn,
    alp_send,
)
from test_framework.chronik.token_tx import TokenTx
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx


class ChronikTokenAlp(BitcoinTestFramework):
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

        peer = node.add_p2p_connection(P2PDataStore())
        mocktime = 1300000000
        node.setmocktime(mocktime)

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        block_hashes = self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000

        txs = []
        tx_names = []

        # ALP GENESIS tx
        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            alp_opreturn(
                alp_genesis(
                    token_ticker=b"TEST",
                    token_name=b"Test Token",
                    url=b"http://example.com",
                    data=b"Token Data",
                    auth_pubkey=b"Token Pubkey",
                    decimals=4,
                    mint_amounts=[10, 20, 30, 0],
                    num_batons=2,
                )
            ),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
            CTxOut(5000, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
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
                alp_token(token_id=tx.hash, amount=10),
                alp_token(token_id=tx.hash, amount=20),
                alp_token(token_id=tx.hash, amount=30),
                pb.Token(),
                alp_token(token_id=tx.hash, is_mint_baton=True),
                alp_token(token_id=tx.hash, is_mint_baton=True),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                genesis_info=pb.GenesisInfo(
                    token_ticker=b"TEST",
                    token_name=b"Test Token",
                    url=b"http://example.com",
                    data=b"Token Data",
                    auth_pubkey=b"Token Pubkey",
                    decimals=4,
                ),
            ),
        )
        txs.append(genesis)
        tx_names.append("genesis")
        genesis.send(chronik)
        genesis.test(chronik)

        # ALP MINT tx
        tx = CTransaction()
        tx.vin = [
            CTxIn(
                COutPoint(int(genesis.txid, 16), 5),
                SCRIPTSIG_OP_TRUE,
            )
        ]
        tx.vout = [
            alp_opreturn(
                alp_mint(
                    token_id=genesis.txid,
                    mint_amounts=[5, 0],
                    num_batons=1,
                ),
            ),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        mint = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.MINT,
                    actual_burn_amount="0",
                )
            ],
            inputs=[alp_token(token_id=genesis.txid, is_mint_baton=True)],
            outputs=[
                pb.Token(),
                alp_token(token_id=genesis.txid, amount=5),
                pb.Token(),
                alp_token(token_id=genesis.txid, is_mint_baton=True),
            ],
        )
        txs.append(mint)
        tx_names.append("mint")
        mint.send(chronik)
        mint.test(chronik)

        # ALP SEND tx
        tx = CTransaction()
        tx.vin = [
            CTxIn(
                COutPoint(int(genesis.txid, 16), 1),
                SCRIPTSIG_OP_TRUE,
            ),
            CTxIn(COutPoint(int(mint.txid, 16), 1), SCRIPTSIG_OP_TRUE),
        ]
        tx.vout = [
            alp_opreturn(
                alp_send(
                    token_id=genesis.txid,
                    output_amounts=[3, 12],
                ),
            ),
            CTxOut(5000, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        send = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.SEND,
                    actual_burn_amount="0",
                )
            ],
            inputs=[
                alp_token(token_id=genesis.txid, amount=10),
                alp_token(token_id=genesis.txid, amount=5),
            ],
            outputs=[
                pb.Token(),
                alp_token(token_id=genesis.txid, amount=3),
                alp_token(token_id=genesis.txid, amount=12),
            ],
        )
        txs.append(send)
        tx_names.append("send")
        send.send(chronik)
        send.test(chronik)

        # Another ALP GENESIS
        tx = CTransaction()
        tx.vin = [
            CTxIn(
                COutPoint(int(genesis.txid, 16), 4),
                SCRIPTSIG_OP_TRUE,
            )
        ]
        tx.vout = [
            alp_opreturn(
                alp_genesis(
                    mint_amounts=[100],
                    num_batons=2,
                ),
            ),
            CTxOut(5000, P2SH_OP_TRUE),
            CTxOut(5000, P2SH_OP_TRUE),
            CTxOut(5000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 200000, P2SH_OP_TRUE),
        ]
        tx.rehash()
        genesis2 = TokenTx(
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
                alp_token(token_id=tx.hash, amount=100),
                alp_token(token_id=tx.hash, is_mint_baton=True),
                alp_token(token_id=tx.hash, is_mint_baton=True),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                genesis_info=pb.GenesisInfo(),
            ),
        )
        txs.append(genesis2)
        tx_names.append("genesis2")
        genesis2.send(chronik)
        genesis2.test(chronik)

        # ALP GENESIS + MINT + SEND all in one
        tx = CTransaction()
        tx.vin = [
            CTxIn(COutPoint(int(send.txid, 16), 1), SCRIPTSIG_OP_TRUE),
            CTxIn(
                COutPoint(int(genesis2.txid, 16), 2),
                SCRIPTSIG_OP_TRUE,
            ),
        ]
        tx.vout = [
            alp_opreturn(
                alp_genesis(
                    token_ticker=b"MULTI",
                    mint_amounts=[0xFFFF_FFFF_FFFF, 0],
                    num_batons=1,
                ),
                alp_mint(
                    token_id=genesis2.txid,
                    mint_amounts=[0, 5],
                    num_batons=0,
                ),
                alp_burn(
                    token_id=genesis.txid,
                    burn_amount=1,
                ),
                alp_send(
                    token_id=genesis.txid,
                    output_amounts=[0, 0, 0, 0, 2],
                ),
            ),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        tx.rehash()
        multi = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.hash,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.GENESIS,
                    actual_burn_amount="0",
                ),
                pb.TokenEntry(
                    token_id=genesis2.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.MINT,
                    actual_burn_amount="0",
                ),
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.SEND,
                    intentional_burn=1,
                    actual_burn_amount="1",
                ),
            ],
            inputs=[
                alp_token(token_id=genesis.txid, amount=3, entry_idx=2),
                alp_token(token_id=genesis2.txid, is_mint_baton=True, entry_idx=1),
            ],
            outputs=[
                pb.Token(),
                alp_token(token_id=tx.hash, amount=0xFFFF_FFFF_FFFF),
                alp_token(token_id=genesis2.txid, amount=5, entry_idx=1),
                alp_token(token_id=tx.hash, is_mint_baton=True),
                pb.Token(),
                alp_token(token_id=genesis.txid, amount=2, entry_idx=2),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                genesis_info=pb.GenesisInfo(token_ticker=b"MULTI"),
            ),
        )
        txs.append(multi)
        tx_names.append("multi")
        multi.send(chronik)
        multi.test(chronik)

        # ALP tx with all kinds of things (so big it must be mined in a block manually)
        tx = CTransaction()
        tx.vin = [
            CTxIn(
                COutPoint(int(genesis2.txid, 16), 3),
                SCRIPTSIG_OP_TRUE,
            ),
            CTxIn(
                COutPoint(int(genesis.txid, 16), 6),
                SCRIPTSIG_OP_TRUE,
            ),
            CTxIn(COutPoint(int(multi.txid, 16), 1), SCRIPTSIG_OP_TRUE),
        ]
        tx.vout = [
            alp_opreturn(
                # 0: success GENESIS
                alp_genesis(
                    token_ticker=b"ALL",
                    mint_amounts=[0, 7, 0, 0, 1],
                    num_batons=2,
                ),
                # 1: fail GENESIS: must be first
                alp_genesis(mint_amounts=[], num_batons=0),
                # 2: fail MINT: Too few outputs
                alp_mint(genesis.txid, [0, 0, 0, 0, 0, 0, 0], 99),
                # 3: fail MINT: Overlapping amounts
                alp_mint(genesis.txid, [0, 0xFFFF_FFFF_FFFF], 0),
                # 4: fail MINT: Overlapping batons
                alp_mint(genesis.txid, [0], 1),
                # 5: success BURN: token ID 2
                alp_burn(genesis.txid, 2),
                # 6: success MINT: token ID 3
                alp_mint(genesis2.txid, [3, 0], 1),
                # 7: success MINT: token ID 2
                alp_mint(genesis.txid, [0, 0, 0, 2, 0, 0, 0], 1),
                # 8: fail MINT: Duplicate token ID 2
                alp_mint(genesis.txid, [], 0),
                # 9: fail BURN: Duplicate burn token ID 2
                alp_burn(genesis.txid, 0),
                # 10: fail SEND: Too few outputs
                alp_send(multi.txid, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 123]),
                # 11: success SEND: token ID 4
                alp_send(
                    multi.txid,
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0xFFFF_FFFF_FFFF],
                ),
                # 12: fail MINT: Duplicate token ID 4
                alp_mint(multi.txid, [], 0),
                # 13: success UNKNOWN
                b"SLP2\x89",
                # 14: fail BURN: Descending token type
                alp_burn(multi.txid, 0),
                # 15: success UNKNOWN
                b"SLP2\x9a",
            ),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        tx.rehash()
        all_things = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NOT_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.hash,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.GENESIS,
                    actual_burn_amount="0",
                    burn_summary="Invalid coloring at pushdata idx 1: GENESIS must be the first pushdata",
                    failed_colorings=[
                        pb.TokenFailedColoring(
                            pushdata_idx=1,
                            error="GENESIS must be the first pushdata",
                        )
                    ],
                ),
                pb.TokenEntry(
                    token_id=genesis2.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.MINT,
                    actual_burn_amount="0",
                ),
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.MINT,
                    intentional_burn=2,
                    actual_burn_amount="0",
                    burn_summary=f"""\
Invalid coloring at pushdata idx 2: Too few outputs, expected 107 but got 11. Invalid \
coloring at pushdata idx 3: Overlapping amount when trying to color 281474976710655 at \
index 2, output is already colored with 7 of {tx.hash} (ALP STANDARD (V0)). Invalid \
coloring at pushdata idx 4: Overlapping mint baton when trying to color mint baton at \
index 2, output is already colored with 7 of {tx.hash} (ALP STANDARD (V0)). Invalid \
coloring at pushdata idx 8: Duplicate token_id {genesis.txid}, found in section 2. \
Invalid coloring at pushdata idx 9: Duplicate intentional burn token_id \
{genesis.txid}, found in burn #0 and #1""",
                    failed_colorings=[
                        pb.TokenFailedColoring(
                            pushdata_idx=2,
                            error="Too few outputs, expected 107 but got 11",
                        ),
                        pb.TokenFailedColoring(
                            pushdata_idx=3,
                            error=f"""\
Overlapping amount when trying to color 281474976710655 at index 2, output is already \
colored with 7 of {tx.hash} (ALP STANDARD (V0))""",
                        ),
                        pb.TokenFailedColoring(
                            pushdata_idx=4,
                            error=f"""\
Overlapping mint baton when trying to color mint baton at index 2, output is already \
colored with 7 of {tx.hash} (ALP STANDARD (V0))""",
                        ),
                        pb.TokenFailedColoring(
                            pushdata_idx=8,
                            error=f"Duplicate token_id {genesis.txid}, found in section 2",
                        ),
                        pb.TokenFailedColoring(
                            pushdata_idx=9,
                            error=f"Duplicate intentional burn token_id {genesis.txid}, found in burn #0 and #1",
                        ),
                    ],
                ),
                pb.TokenEntry(
                    token_id=multi.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.SEND,
                    actual_burn_amount="0",
                    burn_summary=f"""\
Invalid coloring at pushdata idx 10: Too few outputs, expected 13 but got 11. Invalid \
coloring at pushdata idx 12: Duplicate token_id {multi.txid}, found in section 3. \
Invalid coloring at pushdata idx 14: Descending token type: 137 > 0, token types must \
be in ascending order""",
                    failed_colorings=[
                        pb.TokenFailedColoring(
                            pushdata_idx=10,
                            error="Too few outputs, expected 13 but got 11",
                        ),
                        pb.TokenFailedColoring(
                            pushdata_idx=12,
                            error=f"Duplicate token_id {multi.txid}, found in section 3",
                        ),
                        pb.TokenFailedColoring(
                            pushdata_idx=14,
                            error="Descending token type: 137 > 0, token types must be in ascending order",
                        ),
                    ],
                ),
                pb.TokenEntry(
                    token_id="00" * 32,
                    token_type=pb.TokenType(alp=0x89),
                    tx_type=pb.UNKNOWN,
                    actual_burn_amount="0",
                ),
                pb.TokenEntry(
                    token_id="00" * 32,
                    token_type=pb.TokenType(alp=0x9A),
                    tx_type=pb.UNKNOWN,
                    actual_burn_amount="0",
                ),
            ],
            inputs=[
                alp_token(token_id=genesis2.txid, is_mint_baton=True, entry_idx=1),
                alp_token(token_id=genesis.txid, is_mint_baton=True, entry_idx=2),
                alp_token(token_id=multi.txid, amount=0xFFFF_FFFF_FFFF, entry_idx=3),
            ],
            outputs=[
                pb.Token(),
                # success MINT: token ID 3
                alp_token(token_id=genesis2.txid, amount=3, entry_idx=1),
                # success GENESIS
                alp_token(token_id=tx.hash, amount=7),
                # success MINT: token ID 3
                alp_token(token_id=genesis2.txid, is_mint_baton=True, entry_idx=1),
                # success MINT: token ID 2
                alp_token(token_id=genesis.txid, amount=2, entry_idx=2),
                # success GENESIS
                alp_token(token_id=tx.hash, amount=1),
                # success GENESIS
                alp_token(token_id=tx.hash, is_mint_baton=True),
                # success GENESIS
                alp_token(token_id=tx.hash, is_mint_baton=True),
                # success MINT: token ID 2
                alp_token(token_id=genesis.txid, is_mint_baton=True, entry_idx=2),
                # success UNKNOWN
                alp_token(
                    token_id="00" * 32, token_type=pb.TokenType(alp=0x89), entry_idx=4
                ),
                # success SEND: token ID 4
                alp_token(
                    token_id=multi.txid,
                    amount=0xFFFF_FFFF_FFFF,
                    entry_idx=3,
                ),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                genesis_info=pb.GenesisInfo(token_ticker=b"ALL"),
            ),
        )
        block_height = 102
        block = create_block(
            int(block_hashes[-1], 16),
            create_coinbase(block_height, b"\x03" * 33),
            1300000500,
        )
        block.vtx += [
            genesis.tx,
            send.tx,
            mint.tx,
            genesis2.tx,
            multi.tx,
            all_things.tx,
        ]
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)
        all_things.test(chronik, block.hash)

        # After being mined, all previous txs still work fine:
        for tx in txs:
            tx.test(chronik, block.hash)

        # Undo block + test again
        node.invalidateblock(block.hash)
        for tx in txs:
            tx.test(chronik)

        # "all_things" not in the mempool (violates policy)
        chronik.tx(all_things.txid).err(404)

        # Mining txs one-by-one works
        block_height = 102
        prev_hash = block_hashes[-1]
        tx_block_hashes = [None] * len(txs)
        for block_idx, mined_tx in enumerate(txs):
            block = create_block(
                int(prev_hash, 16),
                create_coinbase(block_height + block_idx, b"\x03" * 33),
                1300000500 + block_idx,
            )
            block.vtx += [mined_tx.tx]
            block.hashMerkleRoot = block.calc_merkle_root()
            block.solve()
            prev_hash = block.hash
            peer.send_blocks_and_test([block], node)
            tx_block_hashes[block_idx] = block.hash

            # All txs still work on every block
            for tx, block_hash in zip(txs, tx_block_hashes):
                tx.test(chronik, block_hash)

        # Also mine all_things and test again
        block = create_block(
            int(prev_hash, 16),
            create_coinbase(block_height + len(txs), b"\x03" * 33),
            1300000500 + len(txs),
        )
        block.vtx += [all_things.tx]
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)
        all_things.test(chronik, block.hash)
        for tx, block_hash in zip(txs, tx_block_hashes):
            tx.test(chronik, block_hash)

        # Undo that block again + test
        node.invalidateblock(block.hash)
        for tx, block_hash in zip(txs, tx_block_hashes):
            tx.test(chronik, block_hash)

        # Invalidating all blocks one-by-one works
        for block_idx in reversed(range(len(txs))):
            node.invalidateblock(tx_block_hashes[block_idx])
            tx_block_hashes[block_idx] = None
            # All txs still work on every invalidation
            for tx, block_hash in zip(txs, tx_block_hashes):
                tx.test(chronik, block_hash)

        # Kicking out all txs from the mempool by mining 1 conflict
        conflict_tx = CTransaction()
        conflict_tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        pad_tx(conflict_tx)
        block = create_block(
            int(block_hashes[-1], 16),
            create_coinbase(block_height, b"\x03" * 33),
            1300000500,
        )
        block.vtx += [conflict_tx]
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)
        for tx in txs:
            chronik.tx(tx.txid).err(404)


if __name__ == "__main__":
    ChronikTokenAlp().main()
