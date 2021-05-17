# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik indexes parse failures correctly.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.chronik.token_tx import TokenTx
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.script import OP_RESERVED, OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework


class ChronikTokenParseFailure(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        from test_framework.chronik.client import pb

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
        invalid_slp_script = CScript([OP_RETURN, b"SLP\0", b"\x01", b"GENESIS", b""])
        tx.vout = [
            CTxOut(0, invalid_slp_script),
            CTxOut(coinvalue - 100000, P2SH_OP_TRUE),
        ]
        tx.rehash()
        invalid_slp = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NOT_NORMAL,
            entries=[],
            inputs=[pb.Token()],
            outputs=[pb.Token(), pb.Token()],
            failed_parsings=[
                pb.TokenFailedParsing(
                    pushdata_idx=-1,
                    bytes=bytes(invalid_slp_script),
                    error="SLP error: Disallowed push: OP_0 at op 4",
                )
            ],
        )
        txs.append(invalid_slp)
        invalid_slp.send(
            chronik,
            error=f"400: Tx {invalid_slp.txid} failed token checks: Parsing failed: SLP error: Disallowed push: OP_0 at op 4.",
        )
        invalid_slp.test(chronik)

        tx = CTransaction()
        tx.vin = [CTxIn(COutPoint(int(invalid_slp.txid, 16), 1), SCRIPTSIG_OP_TRUE)]
        invalid_alp_script = CScript(
            [OP_RETURN, OP_RESERVED, b"SLP2\0\x07GENESIS", b"OK", b"SLP\0"]
        )
        tx.vout = [
            CTxOut(0, invalid_alp_script),
            CTxOut(coinvalue - 200000, P2SH_OP_TRUE),
        ]
        tx.rehash()
        invalid_alp = TokenTx(
            tx=tx,
            status=pb.TOKEN_STATUS_NOT_NORMAL,
            entries=[],
            inputs=[pb.Token()],
            outputs=[pb.Token(), pb.Token()],
            failed_parsings=[
                pb.TokenFailedParsing(
                    pushdata_idx=0,
                    bytes=b"SLP2\0\x07GENESIS",
                    error="ALP error: Not enough bytes: expected 1 more bytes but got 0 for field token_ticker",
                ),
                pb.TokenFailedParsing(
                    pushdata_idx=2,
                    bytes=b"SLP\0",
                    error='ALP error: Invalid LOKAD ID "SLP\\0", did you accidentally use eMPP?',
                ),
            ],
        )
        txs.append(invalid_alp)
        invalid_alp.send(
            chronik,
            error=f"""\
400: Tx {invalid_alp.txid} failed token checks: Parsing failed at pushdata idx 0: ALP \
error: Not enough bytes: expected 1 more bytes but got 0 for field token_ticker. \
Parsing failed at pushdata idx 2: ALP error: Invalid LOKAD ID \"SLP\\0\", did you \
accidentally use eMPP?.""",
        )
        invalid_alp.test(chronik)

        # After mining, all txs still work fine
        block_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        for tx in txs:
            tx.test(chronik, block_hash)

        # Undo block + test again
        node.invalidateblock(block_hash)
        for tx in txs:
            tx.test(chronik)


if __name__ == "__main__":
    ChronikTokenParseFailure().main()
