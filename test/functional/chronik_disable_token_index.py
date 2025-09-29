# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's -chroniktokenindex=0 works properly.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.chronik.alp import alp_genesis, alp_opreturn, alp_send
from test_framework.chronik.token_tx import TokenTx
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.test_framework import BitcoinTestFramework


class ChronikDisableTokenIndex(BitcoinTestFramework):
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

        mocktime = 1300000000
        node.setmocktime(mocktime)

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        self.generatetoaddress(node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE)

        coinvalue = 5000000000

        # ALP GENESIS tx
        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx.vout = [
            alp_opreturn(
                alp_genesis(
                    mint_amounts=[1000],
                    num_batons=1,
                ),
            ),
            CTxOut(20000, P2SH_OP_TRUE),
            CTxOut(10000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
        ]
        genesis = TokenTx(
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
        genesis_not_token = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NON_TOKEN,
            entries=[],
            inputs=[pb.Token()],
            outputs=[pb.Token(), pb.Token(), pb.Token(), pb.Token()],
        )
        genesis.send(chronik)
        genesis.test(chronik)

        # ALP SEND tx
        tx = CTransaction()
        tx.vin = [
            CTxIn(
                COutPoint(int(genesis.txid, 16), 1),
                SCRIPTSIG_OP_TRUE,
            ),
        ]
        tx.vout = [
            alp_opreturn(
                alp_send(
                    token_id=genesis.txid,
                    output_amounts=[300, 700],
                ),
            ),
            CTxOut(10000, P2SH_OP_TRUE),
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
                    actual_burn_atoms="0",
                ),
            ],
            inputs=[
                alp_token(token_id=genesis.txid, atoms=1000),
            ],
            outputs=[
                pb.Token(),
                alp_token(token_id=genesis.txid, atoms=300),
                alp_token(token_id=genesis.txid, atoms=700),
            ],
        )
        send_not_token = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NON_TOKEN,
            entries=[],
            inputs=[pb.Token()],
            outputs=[pb.Token(), pb.Token(), pb.Token()],
        )
        send.send(chronik)
        send.test(chronik)
        send_not_token = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NON_TOKEN,
            entries=[],
            inputs=[pb.Token()],
            outputs=[pb.Token(), pb.Token(), pb.Token()],
        )

        tx = CTransaction()
        tx.vin = [
            CTxIn(COutPoint(int(send.txid, 16), 1), SCRIPTSIG_OP_TRUE),
        ]
        tx.vout = [
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
            CTxOut(546, P2SH_OP_TRUE),
        ]
        burn = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NOT_NORMAL,
            entries=[
                pb.TokenEntry(
                    token_id=genesis.txid,
                    token_type=pb.TokenType(alp=pb.ALP_TOKEN_TYPE_STANDARD),
                    is_invalid=True,
                    burn_summary="Unexpected burn: Burns 300 atoms",
                    actual_burn_atoms="300",
                ),
            ],
            inputs=[alp_token(token_id=genesis.txid, atoms=300)],
            outputs=[pb.Token(), pb.Token(), pb.Token()],
        )
        burn_not_token = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NON_TOKEN,
            entries=[],
            inputs=[pb.Token()],
            outputs=[pb.Token(), pb.Token(), pb.Token()],
        )
        burn_error = f"400: Tx {burn.txid} failed token checks: Unexpected burn: Burns 300 atoms."
        burn.send(chronik, error=burn_error)
        burn.test(chronik)

        # With -chroniktokenindex=0, txs now have no token data anymore
        self.restart_node(0, ["-chronik", "-chroniktokenindex=0"])
        genesis_not_token.send(chronik)
        genesis_not_token.test(chronik)
        send_not_token.send(chronik)
        send_not_token.test(chronik)
        # No burn error reported anymore
        burn_not_token.send(chronik)
        burn_not_token.test(chronik)

        # If we enable it again, we get an error
        self.stop_node(0)
        node.assert_start_raises_init_error(
            extra_args=["-chronik", "-chroniktokenindex"],
            expected_msg=(
                "Error: Cannot enable -chroniktokenindex on a DB that previously had "
                + "it disabled. Provide -reindex/-chronikreindex to reindex the "
                + "database with token data, or specify -chroniktokenindex=0 to "
                + "disable the token index again."
            ),
        )

        # Specifying -chronikreindex makes it work
        self.restart_node(0, ["-chronik", "-chroniktokenindex", "-chronikreindex"])
        genesis.send(chronik)
        genesis.test(chronik)
        send.send(chronik)
        send.test(chronik)
        burn.send(chronik, error=burn_error)
        burn.test(chronik)

        # Mine txs to test token indexing for block txs
        block_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        genesis.test(chronik, block_hash)
        send.test(chronik, block_hash)
        burn.test(chronik, block_hash)

        # Restarting with -chroniktokenindex=0 wipes the token DB
        with node.assert_debug_log(
            [
                "Warning: Wiping existing token index, since -chroniktokenindex=0",
            ]
        ):
            self.restart_node(0, ["-chronik", "-chroniktokenindex=0"])
        genesis_not_token.test(chronik, block_hash)
        send_not_token.test(chronik, block_hash)
        burn_not_token.test(chronik, block_hash)

        # Invalidating the block sends txs back to the mempool
        node.invalidateblock(block_hash)
        genesis_not_token.test(chronik)
        send_not_token.test(chronik)
        burn_not_token.test(chronik)


if __name__ == "__main__":
    ChronikDisableTokenIndex().main()
