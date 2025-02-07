# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /script endpoint works well with tokens.
"""

from itertools import zip_longest

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.chronik.alp import alp_genesis, alp_opreturn
from test_framework.chronik.slp import slp_genesis, slp_send
from test_framework.chronik.token_tx import TokenTx
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.script import OP_EQUAL, OP_HASH160, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikTokenScriptGroup(BitcoinTestFramework):
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
            CTxOut(546, CScript([OP_HASH160, b"\x01" * 20, OP_EQUAL])),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
        ]
        tx.rehash()
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
        genesis_slp.send(chronik)
        genesis_slp.test(chronik)

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(genesis_slp.txid, 16), 1), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            CTxOut(
                0,
                slp_send(
                    token_type=pb.SLP_TOKEN_TYPE_FUNGIBLE,
                    token_id=genesis_slp.txid,
                    amounts=[1000, 2000, 1500, 500],
                ),
            ),
            CTxOut(546, CScript([OP_HASH160, b"\x01" * 20, OP_EQUAL])),
            CTxOut(546, CScript([OP_HASH160, b"\x01" * 20, OP_EQUAL])),
            CTxOut(546, CScript([OP_HASH160, b"\x02" * 20, OP_EQUAL])),
            CTxOut(546, CScript([OP_HASH160, b"\x02" * 20, OP_EQUAL])),
        ]
        send_slp = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis_slp.txid,
                    token_type=pb.TokenType(slp=pb.SLP_TOKEN_TYPE_FUNGIBLE),
                    tx_type=pb.SEND,
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[slp_token(token_id=genesis_slp.txid, atoms=5000)],
            outputs=[
                pb.Token(),
                slp_token(token_id=genesis_slp.txid, atoms=1000),
                slp_token(token_id=genesis_slp.txid, atoms=2000),
                slp_token(token_id=genesis_slp.txid, atoms=1500),
                slp_token(token_id=genesis_slp.txid, atoms=500),
            ],
        )
        txs.append(send_slp)
        send_slp.send(chronik)
        send_slp.test(chronik)

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(genesis_slp.txid, 16), 3), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            alp_opreturn(
                alp_genesis(
                    mint_amounts=[10, 20],
                    num_batons=1,
                ),
            ),
            CTxOut(546, CScript([OP_HASH160, b"\x01" * 20, OP_EQUAL])),
            CTxOut(546, CScript([OP_HASH160, b"\x01" * 20, OP_EQUAL])),
            CTxOut(546, CScript([OP_HASH160, b"\x01" * 20, OP_EQUAL])),
            CTxOut(coinvalue - 200000, P2SH_OP_TRUE),
        ]
        tx.rehash()
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
                alp_token(token_id=tx.hash, atoms=10),
                alp_token(token_id=tx.hash, atoms=20),
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
        genesis_alp.send(chronik)
        genesis_alp.test(chronik)

        script1_txs = [genesis_slp, send_slp, genesis_alp]
        script1_txs = sorted(script1_txs, key=lambda tx: tx.txid)
        history_txs = chronik.script("p2sh", "01" * 20).unconfirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(script1_txs, history_txs):
            tx.test_tx(proto_tx)

        script2_txs = [send_slp]
        history_txs = chronik.script("p2sh", "02" * 20).unconfirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(script2_txs, history_txs):
            tx.test_tx(proto_tx)

        script1_utxos = [
            pb.ScriptUtxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(genesis_slp.txid)[::-1], out_idx=2
                ),
                block_height=-1,
                sats=546,
                token=slp_token(
                    token_id=genesis_slp.txid, is_mint_baton=True, entry_idx=-1
                ),
            ),
            pb.ScriptUtxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(send_slp.txid)[::-1], out_idx=1
                ),
                block_height=-1,
                sats=546,
                token=slp_token(token_id=genesis_slp.txid, atoms=1000, entry_idx=-1),
            ),
            pb.ScriptUtxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(send_slp.txid)[::-1], out_idx=2
                ),
                block_height=-1,
                sats=546,
                token=slp_token(token_id=genesis_slp.txid, atoms=2000, entry_idx=-1),
            ),
            pb.ScriptUtxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(genesis_alp.txid)[::-1], out_idx=1
                ),
                block_height=-1,
                sats=546,
                token=alp_token(token_id=genesis_alp.txid, atoms=10, entry_idx=-1),
            ),
            pb.ScriptUtxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(genesis_alp.txid)[::-1], out_idx=2
                ),
                block_height=-1,
                sats=546,
                token=alp_token(token_id=genesis_alp.txid, atoms=20, entry_idx=-1),
            ),
            pb.ScriptUtxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(genesis_alp.txid)[::-1], out_idx=3
                ),
                block_height=-1,
                sats=546,
                token=alp_token(
                    token_id=genesis_alp.txid, is_mint_baton=True, entry_idx=-1
                ),
            ),
        ]
        script1_utxos = sorted(script1_utxos, key=lambda o: o.outpoint.txid[::-1])
        utxos = chronik.script("p2sh", "01" * 20).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(script1_utxos, utxos):
            assert_equal(utxo, proto_utxo)

        script2_utxos = [
            pb.ScriptUtxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(send_slp.txid)[::-1], out_idx=3
                ),
                block_height=-1,
                sats=546,
                token=slp_token(token_id=genesis_slp.txid, atoms=1500, entry_idx=-1),
            ),
            pb.ScriptUtxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(send_slp.txid)[::-1], out_idx=4
                ),
                block_height=-1,
                sats=546,
                token=slp_token(token_id=genesis_slp.txid, atoms=500, entry_idx=-1),
            ),
        ]
        script2_utxos = sorted(script2_utxos, key=lambda o: o.outpoint.txid[::-1])
        utxos = chronik.script("p2sh", "02" * 20).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(script2_utxos, utxos):
            assert_equal(utxo, proto_utxo)

        # After mining, all txs still work fine
        block_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        for tx in txs:
            tx.test(chronik, block_hash)

        history_txs = chronik.script("p2sh", "01" * 20).confirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(script1_txs, history_txs):
            tx.test_tx(proto_tx, block_hash)
        history_txs = chronik.script("p2sh", "02" * 20).confirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(script2_txs, history_txs):
            tx.test_tx(proto_tx, block_hash)

        for utxo in script1_utxos + script2_utxos:
            utxo.block_height = 102
        utxos = chronik.script("p2sh", "01" * 20).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(script1_utxos, utxos):
            assert_equal(utxo, proto_utxo)
        utxos = chronik.script("p2sh", "02" * 20).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(script2_utxos, utxos):
            assert_equal(utxo, proto_utxo)

        # Undo block + test again
        node.invalidateblock(block_hash)
        for tx in txs:
            tx.test(chronik)

        history_txs = chronik.script("p2sh", "01" * 20).unconfirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(script1_txs, history_txs):
            tx.test_tx(proto_tx)
        history_txs = chronik.script("p2sh", "02" * 20).unconfirmed_txs().ok().txs
        for tx, proto_tx in zip_longest(script2_txs, history_txs):
            tx.test_tx(proto_tx)

        for utxo in script1_utxos + script2_utxos:
            utxo.block_height = -1
        utxos = chronik.script("p2sh", "01" * 20).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(script1_utxos, utxos):
            assert_equal(utxo, proto_utxo)
        utxos = chronik.script("p2sh", "02" * 20).utxos().ok().utxos
        for utxo, proto_utxo in zip_longest(script2_utxos, utxos):
            assert_equal(utxo, proto_utxo)


if __name__ == "__main__":
    ChronikTokenScriptGroup().main()
