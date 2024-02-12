# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Setup script to exercise the chronik-client js library endpoints that receive the Tx type
for token-specific txs
Based on test/functional/chronik_token_alp.py
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
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.util import assert_equal


class ChronikClientTokenAlp(SetupFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.ipc_timeout = 10

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def send_chronik_info(self):
        send_ipc_message({"chronik": f"http://127.0.0.1:{self.nodes[0].chronik_port}"})

    def run_test(self):

        # Init
        node = self.nodes[0]
        peer = node.add_p2p_connection(P2PDataStore())
        mocktime = 1300000000
        node.setmocktime(mocktime)

        self.send_chronik_info()

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        block_hashes = self.generatetoaddress(node, 100, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000

        self.log.info("Step 1: Send an ALP genesis tx")

        # ALP GENESIS tx
        alp_genesis_tx = CTransaction()
        alp_genesis_tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        alp_genesis_tx.vout = [
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
        alp_genesis_tx_txid = node.sendrawtransaction(alp_genesis_tx.serialize().hex())
        send_ipc_message({"alp_genesis_txid": alp_genesis_tx_txid})
        yield True

        self.log.info("Step 2: Send an ALP mint tx")

        # ALP MINT tx
        alp_mint_tx = CTransaction()
        alp_mint_tx.vin = [
            CTxIn(
                COutPoint(int(alp_genesis_tx_txid, 16), 5),
                SCRIPTSIG_OP_TRUE,
            )
        ]
        alp_mint_tx.vout = [
            alp_opreturn(
                alp_mint(
                    token_id=alp_genesis_tx_txid,
                    mint_amounts=[5, 0],
                    num_batons=1,
                ),
            ),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        alp_mint_tx_txid = node.sendrawtransaction(alp_mint_tx.serialize().hex())
        send_ipc_message({"alp_mint_txid": alp_mint_tx_txid})
        yield True

        self.log.info("Step 3: Send an ALP send tx")

        # ALP SEND tx
        alp_send_tx = CTransaction()
        alp_send_tx.vin = [
            CTxIn(
                COutPoint(int(alp_genesis_tx_txid, 16), 1),
                SCRIPTSIG_OP_TRUE,
            ),
            CTxIn(COutPoint(int(alp_mint_tx_txid, 16), 1), SCRIPTSIG_OP_TRUE),
        ]
        alp_send_tx.vout = [
            alp_opreturn(
                alp_send(
                    token_id=alp_genesis_tx_txid,
                    output_amounts=[3, 12],
                ),
            ),
            CTxOut(5000, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        alp_send_tx_txid = node.sendrawtransaction(alp_send_tx.serialize().hex())
        send_ipc_message({"alp_send_txid": alp_send_tx_txid})
        yield True

        self.log.info("Step 4: Send another ALP genesis tx")

        # Another ALP GENESIS
        another_alp_genesis_tx = CTransaction()
        another_alp_genesis_tx.vin = [
            CTxIn(
                COutPoint(int(alp_genesis_tx_txid, 16), 4),
                SCRIPTSIG_OP_TRUE,
            )
        ]
        another_alp_genesis_tx.vout = [
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

        another_alp_genesis_tx_txid = node.sendrawtransaction(
            another_alp_genesis_tx.serialize().hex()
        )
        send_ipc_message({"alp_genesis2_txid": another_alp_genesis_tx_txid})
        yield True

        self.log.info("Step 5: Send an ALP genesis + mint + send all in one")

        # ALP GENESIS + MINT + SEND all in one
        multi_tx = CTransaction()
        multi_tx.vin = [
            CTxIn(COutPoint(int(alp_send_tx_txid, 16), 1), SCRIPTSIG_OP_TRUE),
            CTxIn(
                COutPoint(int(another_alp_genesis_tx_txid, 16), 2),
                SCRIPTSIG_OP_TRUE,
            ),
        ]
        multi_tx.vout = [
            alp_opreturn(
                alp_genesis(
                    token_ticker=b"MULTI",
                    mint_amounts=[0xFFFF_FFFF_FFFF, 0],
                    num_batons=1,
                ),
                alp_mint(
                    token_id=another_alp_genesis_tx_txid,
                    mint_amounts=[0, 5],
                    num_batons=0,
                ),
                alp_burn(
                    token_id=alp_genesis_tx_txid,
                    burn_amount=1,
                ),
                alp_send(
                    token_id=alp_genesis_tx_txid,
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
        multi_tx_txid = node.sendrawtransaction(multi_tx.serialize().hex())
        send_ipc_message({"alp_multi_txid": multi_tx_txid})
        yield True

        self.log.info("Step 6: Send wild oversized ALP tx")
        # ALP tx with all kinds of things (so big it must be mined in a block manually)
        mega_tx = CTransaction()
        mega_tx.vin = [
            CTxIn(
                COutPoint(int(another_alp_genesis_tx_txid, 16), 3),
                SCRIPTSIG_OP_TRUE,
            ),
            CTxIn(
                COutPoint(int(alp_genesis_tx_txid, 16), 6),
                SCRIPTSIG_OP_TRUE,
            ),
            CTxIn(COutPoint(int(multi_tx_txid, 16), 1), SCRIPTSIG_OP_TRUE),
        ]
        mega_tx.vout = [
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
                alp_mint(alp_genesis_tx_txid, [0, 0, 0, 0, 0, 0, 0], 99),
                # 3: fail MINT: Overlapping amounts
                alp_mint(alp_genesis_tx_txid, [0, 0xFFFF_FFFF_FFFF], 0),
                # 4: fail MINT: Overlapping batons
                alp_mint(alp_genesis_tx_txid, [0], 1),
                # 5: success BURN: token ID 2
                alp_burn(alp_genesis_tx_txid, 2),
                # 6: success MINT: token ID 3
                alp_mint(another_alp_genesis_tx_txid, [3, 0], 1),
                # 7: success MINT: token ID 2
                alp_mint(alp_genesis_tx_txid, [0, 0, 0, 2, 0, 0, 0], 1),
                # 8: fail MINT: Duplicate token ID 2
                alp_mint(alp_genesis_tx_txid, [], 0),
                # 9: fail BURN: Duplicate burn token ID 2
                alp_burn(alp_genesis_tx_txid, 0),
                # 10: fail SEND: Too few outputs
                alp_send(multi_tx_txid, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 123]),
                # 11: success SEND: token ID 4
                alp_send(
                    multi_tx_txid,
                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0xFFFF_FFFF_FFFF],
                ),
                # 12: fail MINT: Duplicate token ID 4
                alp_mint(multi_tx_txid, [], 0),
                # 13: success UNKNOWN
                b"SLP2\x89",
                # 14: fail BURN: Descending token type
                alp_burn(multi_tx_txid, 0),
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
        mega_tx_txid = node.decoderawtransaction(mega_tx.serialize().hex())["txid"]

        send_ipc_message({"alp_mega_txid": mega_tx_txid})
        block_height = 102
        block = create_block(
            int(block_hashes[-1], 16),
            create_coinbase(block_height, b"\x03" * 33),
            1300000500,
        )
        block.vtx += [
            alp_genesis_tx,
            alp_send_tx,
            alp_mint_tx,
            another_alp_genesis_tx,
            multi_tx,
            mega_tx,
        ]
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)
        self.log.info(f"node.getblockcount(): {node.getblockcount()}")
        assert_equal(node.getblockcount(), 102)
        yield True

        self.log.info("Step 7: Send wild oversized ALP tx")
        assert_equal(node.getblockcount(), 102)
        yield True


if __name__ == "__main__":
    ChronikClientTokenAlp().main()
