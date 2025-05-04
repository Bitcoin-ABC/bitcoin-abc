# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik indexes tx by token ID correctly.
"""

from itertools import zip_longest

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.chronik.alp import alp_genesis, alp_opreturn, alp_send
from test_framework.chronik.slp import slp_genesis
from test_framework.chronik.token_tx import TokenTx
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, chronik_sub_token_id


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

        def ws_msg(txid: str, msg_type):
            return pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=msg_type,
                    txid=bytes.fromhex(txid)[::-1],
                )
            )

        node = self.nodes[0]
        chronik = node.get_chronik_client()
        ws1 = chronik.ws()
        ws2 = chronik.ws()

        mocktime = 1300000000
        node.setmocktime(mocktime)

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        self.generatetoaddress(node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000

        txs = []

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
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
                    token_id=tx.hash,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                    tx_type=pb.GENESIS,
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                slp_token(token_id=tx.hash, atoms=5000),
                slp_token(token_id=tx.hash, is_mint_baton=True),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                genesis_info=pb.GenesisInfo(),
            ),
        )
        txs.append(genesis_slp)
        chronik_sub_token_id(ws1, node, genesis_slp.txid)
        genesis_slp.send(chronik)
        genesis_slp.test(chronik)
        assert_equal(ws1.recv(), ws_msg(genesis_slp.txid, pb.TX_ADDED_TO_MEMPOOL))

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(genesis_slp.txid, 16), 3), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            alp_opreturn(
                alp_genesis(
                    mint_amounts=[1000, 2000],
                    num_batons=1,
                ),
            ),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 200000, P2SH_OP_TRUE),
        ]
        genesis_alp = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.hash,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.GENESIS,
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                alp_token(token_id=tx.hash, atoms=1000),
                alp_token(token_id=tx.hash, atoms=2000),
                alp_token(token_id=tx.hash, is_mint_baton=True),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                genesis_info=pb.GenesisInfo(),
            ),
        )
        txs.append(genesis_alp)
        chronik_sub_token_id(ws1, node, genesis_alp.txid)
        genesis_alp.send(chronik)
        genesis_alp.test(chronik)
        assert_equal(ws1.recv(), ws_msg(genesis_alp.txid, pb.TX_ADDED_TO_MEMPOOL))

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(genesis_alp.txid, 16), 4), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            alp_opreturn(
                alp_genesis(
                    mint_amounts=[10, 20],
                    num_batons=0,
                ),
            ),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 300000, P2SH_OP_TRUE),
        ]
        genesis2_alp = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=tx.hash,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.GENESIS,
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[pb.Token()],
            outputs=[
                pb.Token(),
                alp_token(token_id=tx.hash, atoms=10),
                alp_token(token_id=tx.hash, atoms=20),
                pb.Token(),
            ],
            token_info=pb.TokenInfo(
                token_id=tx.hash,
                token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                genesis_info=pb.GenesisInfo(),
            ),
        )
        txs.append(genesis2_alp)
        chronik_sub_token_id(ws2, node, genesis2_alp.txid)
        genesis2_alp.send(chronik)
        genesis2_alp.test(chronik)
        assert_equal(ws2.recv(), ws_msg(genesis2_alp.txid, pb.TX_ADDED_TO_MEMPOOL))

        tx = CTransaction()
        tx.vin = [
            CTxIn(COutPoint(int(genesis_slp.txid, 16), 1), SCRIPTSIG_OP_TRUE),
            CTxIn(COutPoint(int(genesis_alp.txid, 16), 1), SCRIPTSIG_OP_TRUE),
            CTxIn(COutPoint(int(genesis2_alp.txid, 16), 1), SCRIPTSIG_OP_TRUE),
        ]
        tx.vout = [
            alp_opreturn(
                alp_send(genesis_alp.txid, [400, 600]),
                alp_send(genesis2_alp.txid, [0, 0, 3, 7]),
            ),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        send_alp = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NOT_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis_alp.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.SEND,
                    actual_burn_atoms="0",
                ),
                pb.TokenEntry(
                    token_id=genesis2_alp.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    tx_type=pb.SEND,
                    actual_burn_atoms="0",
                ),
                pb.TokenEntry(
                    token_id=genesis_slp.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                    is_invalid=True,
                    burn_summary="Unexpected burn: Burns 5000 atoms",
                    actual_burn_atoms="5000",
                ),
            ],
            inputs=[
                slp_token(token_id=genesis_slp.txid, atoms=5000, entry_idx=2),
                alp_token(token_id=genesis_alp.txid, atoms=1000),
                alp_token(token_id=genesis2_alp.txid, atoms=10, entry_idx=1),
            ],
            outputs=[
                pb.Token(),
                alp_token(token_id=genesis_alp.txid, atoms=400),
                alp_token(token_id=genesis_alp.txid, atoms=600),
                alp_token(token_id=genesis2_alp.txid, atoms=3, entry_idx=1),
                alp_token(token_id=genesis2_alp.txid, atoms=7, entry_idx=1),
            ],
        )
        txs.append(send_alp)
        send_alp.send(
            chronik,
            error=f"400: Tx {send_alp.txid} failed token checks: Unexpected burn: Burns 5000 atoms.",
        )
        send_alp.test(chronik)
        expected_msg = ws_msg(send_alp.txid, pb.TX_ADDED_TO_MEMPOOL)
        assert_equal(ws1.recv(), expected_msg)
        assert_equal(ws2.recv(), expected_msg)

        slp_txs = sorted([genesis_slp, send_alp], key=lambda tx: tx.txid)
        history_txs = chronik.token_id(genesis_slp.txid).unconfirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(slp_txs, history_txs):
            tx.test_tx(proto_tx)

        alp_txs = sorted([genesis_alp, send_alp], key=lambda tx: tx.txid)
        history_txs = chronik.token_id(genesis_alp.txid).unconfirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(alp_txs, history_txs):
            tx.test_tx(proto_tx)

        alp2_txs = sorted([genesis2_alp, send_alp], key=lambda tx: tx.txid)
        history_txs = chronik.token_id(genesis2_alp.txid).unconfirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(alp2_txs, history_txs):
            tx.test_tx(proto_tx)

        slp_utxos = [
            pb.Utxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(genesis_slp.txid)[::-1], out_idx=2
                ),
                block_height=-1,
                sats=10000,
                script=bytes(P2SH_OP_TRUE),
                token=slp_token(
                    token_id=genesis_slp.txid, is_mint_baton=True, entry_idx=-1
                ),
            ),
        ]
        utxos = chronik.token_id(genesis_slp.txid).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(slp_utxos, utxos):
            assert_equal(utxo, proto_utxo)

        alp_utxos = [
            pb.Utxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(genesis_alp.txid)[::-1], out_idx=2
                ),
                block_height=-1,
                sats=10000,
                script=bytes(P2SH_OP_TRUE),
                token=alp_token(token_id=genesis_alp.txid, atoms=2000, entry_idx=-1),
            ),
            pb.Utxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(genesis_alp.txid)[::-1], out_idx=3
                ),
                block_height=-1,
                sats=10000,
                script=bytes(P2SH_OP_TRUE),
                token=alp_token(
                    token_id=genesis_alp.txid, is_mint_baton=True, entry_idx=-1
                ),
            ),
            pb.Utxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(send_alp.txid)[::-1], out_idx=1
                ),
                block_height=-1,
                sats=546,
                script=bytes(P2SH_OP_TRUE),
                token=alp_token(token_id=genesis_alp.txid, atoms=400, entry_idx=-1),
            ),
            pb.Utxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(send_alp.txid)[::-1], out_idx=2
                ),
                block_height=-1,
                sats=546,
                script=bytes(P2SH_OP_TRUE),
                token=alp_token(token_id=genesis_alp.txid, atoms=600, entry_idx=-1),
            ),
        ]
        alp_utxos = sorted(alp_utxos, key=lambda o: o.outpoint.txid[::-1])
        utxos = chronik.token_id(genesis_alp.txid).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(alp_utxos, utxos):
            assert_equal(utxo, proto_utxo)

        alp2_utxos = [
            pb.Utxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(genesis2_alp.txid)[::-1], out_idx=2
                ),
                block_height=-1,
                sats=10000,
                script=bytes(P2SH_OP_TRUE),
                token=alp_token(token_id=genesis2_alp.txid, atoms=20, entry_idx=-1),
            ),
            pb.Utxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(send_alp.txid)[::-1], out_idx=3
                ),
                block_height=-1,
                sats=546,
                script=bytes(P2SH_OP_TRUE),
                token=alp_token(token_id=genesis2_alp.txid, atoms=3, entry_idx=-1),
            ),
            pb.Utxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(send_alp.txid)[::-1], out_idx=4
                ),
                block_height=-1,
                sats=546,
                script=bytes(P2SH_OP_TRUE),
                token=alp_token(token_id=genesis2_alp.txid, atoms=7, entry_idx=-1),
            ),
        ]
        alp2_utxos = sorted(alp2_utxos, key=lambda o: o.outpoint.txid[::-1])
        utxos = chronik.token_id(genesis2_alp.txid).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(alp2_utxos, utxos):
            assert_equal(utxo, proto_utxo)

        # Resubscribe so ws1=genesis_slp.txid, ws2=genesis_alp.txid, ws3=genesis2_alp.txid
        chronik_sub_token_id(ws1, node, genesis_alp.txid, is_unsub=True)
        chronik_sub_token_id(ws2, node, genesis2_alp.txid, is_unsub=True)
        chronik_sub_token_id(ws2, node, genesis_alp.txid)
        ws3 = chronik.ws()
        chronik_sub_token_id(ws3, node, genesis2_alp.txid)

        # After mining, all txs still work fine
        block_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        for tx in txs:
            tx.test(chronik, block_hash)

        history_txs = chronik.token_id(genesis_slp.txid).confirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(slp_txs, history_txs):
            tx.test_tx(proto_tx, block_hash)

        history_txs = chronik.token_id(genesis_alp.txid).confirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(alp_txs, history_txs):
            tx.test_tx(proto_tx, block_hash)

        history_txs = chronik.token_id(genesis2_alp.txid).confirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(alp2_txs, history_txs):
            tx.test_tx(proto_tx, block_hash)

        for utxo in slp_utxos + alp_utxos + alp2_utxos:
            utxo.block_height = 102

        utxos = chronik.token_id(genesis_slp.txid).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(slp_utxos, utxos):
            assert_equal(utxo, proto_utxo)
        utxos = chronik.token_id(genesis_alp.txid).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(alp_utxos, utxos):
            assert_equal(utxo, proto_utxo)
        utxos = chronik.token_id(genesis2_alp.txid).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(alp2_utxos, utxos):
            assert_equal(utxo, proto_utxo)

        for tx in slp_txs:
            assert_equal(ws1.recv(), ws_msg(tx.txid, pb.TX_CONFIRMED))
        for tx in alp_txs:
            assert_equal(ws2.recv(), ws_msg(tx.txid, pb.TX_CONFIRMED))
        for tx in alp2_txs:
            assert_equal(ws3.recv(), ws_msg(tx.txid, pb.TX_CONFIRMED))

        # Undo block + test again
        node.invalidateblock(block_hash)
        for tx in txs:
            tx.test(chronik)

        history_txs = chronik.token_id(genesis_slp.txid).unconfirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(slp_txs, history_txs):
            tx.test_tx(proto_tx)
        history_txs = chronik.token_id(genesis_alp.txid).unconfirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(alp_txs, history_txs):
            tx.test_tx(proto_tx)
        history_txs = chronik.token_id(genesis2_alp.txid).unconfirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(alp2_txs, history_txs):
            tx.test_tx(proto_tx)

        for utxo in slp_utxos + alp_utxos + alp2_utxos:
            utxo.block_height = -1

        utxos = chronik.token_id(genesis_slp.txid).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(slp_utxos, utxos):
            assert_equal(utxo, proto_utxo)
        utxos = chronik.token_id(genesis_alp.txid).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(alp_utxos, utxos):
            assert_equal(utxo, proto_utxo)
        utxos = chronik.token_id(genesis2_alp.txid).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(alp2_utxos, utxos):
            assert_equal(utxo, proto_utxo)

        # TX_ADDED_TO_MEMPOOL are coming in topologically
        for tx in [genesis_slp, send_alp]:
            assert_equal(ws1.recv(), ws_msg(tx.txid, pb.TX_ADDED_TO_MEMPOOL))
        for tx in [genesis_alp, send_alp]:
            assert_equal(ws2.recv(), ws_msg(tx.txid, pb.TX_ADDED_TO_MEMPOOL))
        for tx in [genesis2_alp, send_alp]:
            assert_equal(ws3.recv(), ws_msg(tx.txid, pb.TX_ADDED_TO_MEMPOOL))


if __name__ == "__main__":
    ChronikTokenBurn().main()
