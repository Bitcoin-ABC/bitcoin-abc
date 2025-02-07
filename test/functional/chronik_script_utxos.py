# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /script/:type/:payload/utxos endpoint.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import (
    COINBASE_MATURITY,
    GENESIS_CB_PK,
    GENESIS_CB_TXID,
    create_block,
    create_coinbase,
)
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal


class ChronikScriptUtxosTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        node.setmocktime(1300000000)
        chronik = node.get_chronik_client()

        peer = node.add_p2p_connection(P2PDataStore())

        assert_equal(
            chronik.script("", "").utxos().err(400).msg, "400: Unknown script type: "
        )
        assert_equal(
            chronik.script("foo", "").utxos().err(400).msg,
            "400: Unknown script type: foo",
        )
        assert_equal(
            chronik.script("p2pkh", "LILALI").utxos().err(400).msg,
            "400: Invalid hex: Invalid character 'L' at position 0",
        )
        assert_equal(
            chronik.script("other", "LILALI").utxos().err(400).msg,
            "400: Invalid hex: Invalid character 'L' at position 0",
        )
        assert_equal(
            chronik.script("p2pkh", "").utxos().err(400).msg,
            "400: Invalid payload for P2PKH: Invalid length, "
            + "expected 20 bytes but got 0 bytes",
        )
        assert_equal(
            chronik.script("p2pkh", "aA").utxos().err(400).msg,
            "400: Invalid payload for P2PKH: Invalid length, "
            + "expected 20 bytes but got 1 bytes",
        )
        assert_equal(
            chronik.script("p2sh", "aaBB").utxos().err(400).msg,
            "400: Invalid payload for P2SH: Invalid length, "
            + "expected 20 bytes but got 2 bytes",
        )
        assert_equal(
            chronik.script("p2pk", "aaBBcc").utxos().err(400).msg,
            "400: Invalid payload for P2PK: Invalid length, "
            + "expected one of [33, 65] but got 3 bytes",
        )

        from test_framework.chronik.client import pb

        # Test Genesis pubkey UTXO
        coinvalue = 5000000000
        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK).utxos().ok(),
            pb.ScriptUtxos(
                script=bytes.fromhex(f"41{GENESIS_CB_PK}ac"),
                utxos=[
                    pb.ScriptUtxo(
                        outpoint=pb.OutPoint(
                            txid=bytes.fromhex(GENESIS_CB_TXID)[::-1],
                            out_idx=0,
                        ),
                        block_height=0,
                        is_coinbase=True,
                        sats=coinvalue,
                        is_final=False,
                    )
                ],
            ),
        )

        script_type = "p2sh"
        payload_hex = P2SH_OP_TRUE[2:-1].hex()

        # Generate us a coin, creates a UTXO
        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        assert_equal(
            chronik.script(script_type, payload_hex).utxos().ok(),
            pb.ScriptUtxos(
                script=bytes(P2SH_OP_TRUE),
                utxos=[
                    pb.ScriptUtxo(
                        outpoint=pb.OutPoint(
                            txid=bytes.fromhex(cointx)[::-1],
                            out_idx=0,
                        ),
                        block_height=1,
                        is_coinbase=True,
                        sats=coinvalue,
                        is_final=False,
                    )
                ],
            ),
        )

        self.generatetoaddress(node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE)

        # Make tx creating 4 UTXOs, spending the coinbase UTXO
        send_values = [coinvalue - 10000, 1000, 2000, 3000]
        tx = CTransaction()
        tx.vin = [
            CTxIn(outpoint=COutPoint(int(cointx, 16), 0), scriptSig=SCRIPTSIG_OP_TRUE)
        ]
        tx.vout = [CTxOut(value, P2SH_OP_TRUE) for value in send_values]
        txid = node.sendrawtransaction(tx.serialize().hex())

        expected_utxos = [
            pb.ScriptUtxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(txid)[::-1],
                    out_idx=i,
                ),
                block_height=-1,
                is_coinbase=False,
                sats=value,
                is_final=False,
            )
            for i, value in enumerate(send_values)
        ]

        assert_equal(
            chronik.script(script_type, payload_hex).utxos().ok(),
            pb.ScriptUtxos(script=bytes(P2SH_OP_TRUE), utxos=expected_utxos),
        )

        # Mine tx, which adds the blockheight to the UTXO
        tip = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[-1]
        for expected_utxo in expected_utxos:
            expected_utxo.block_height = 102
        assert_equal(
            chronik.script(script_type, payload_hex).utxos().ok(),
            pb.ScriptUtxos(script=bytes(P2SH_OP_TRUE), utxos=expected_utxos),
        )

        # Make tx spending the 3rd UTXO, and creating 1 UTXO, and one OP_RETURN
        op_return_script = CScript([OP_RETURN, b"hello"])
        tx2 = CTransaction()
        tx2.vin = [
            CTxIn(outpoint=COutPoint(int(txid, 16), 3), scriptSig=SCRIPTSIG_OP_TRUE)
        ]
        tx2.vout = [CTxOut(2500, P2SH_OP_TRUE), CTxOut(0, op_return_script)]
        pad_tx(tx2)
        txid2 = node.sendrawtransaction(tx2.serialize().hex())

        del expected_utxos[3]
        expected_utxos.append(
            pb.ScriptUtxo(
                outpoint=pb.OutPoint(
                    txid=bytes.fromhex(txid2)[::-1],
                    out_idx=0,
                ),
                block_height=-1,
                is_coinbase=False,
                sats=2500,
                is_final=False,
            )
        )

        assert_equal(
            chronik.script(script_type, payload_hex).utxos().ok(),
            pb.ScriptUtxos(script=bytes(P2SH_OP_TRUE), utxos=expected_utxos),
        )

        assert_equal(
            chronik.script("other", op_return_script.hex()).utxos().ok(),
            pb.ScriptUtxos(script=bytes(op_return_script), utxos=[]),
        )

        # Make tx spending a DB UTXO and a mempool UTXO
        tx3 = CTransaction()
        tx3.vin = [
            CTxIn(outpoint=COutPoint(int(txid, 16), 2), scriptSig=SCRIPTSIG_OP_TRUE),
            CTxIn(outpoint=COutPoint(int(txid2, 16), 0), scriptSig=SCRIPTSIG_OP_TRUE),
        ]
        pad_tx(tx3)
        node.sendrawtransaction(tx3.serialize().hex())

        assert_equal(
            chronik.script(script_type, payload_hex).utxos().ok(),
            pb.ScriptUtxos(script=bytes(P2SH_OP_TRUE), utxos=expected_utxos[:2]),
        )

        # Make a tx which conflicts with tx3, by spending the same DB UTXO
        tx3_conflict = CTransaction()
        tx3_conflict.vin = [
            CTxIn(outpoint=COutPoint(int(txid, 16), 2), scriptSig=SCRIPTSIG_OP_TRUE)
        ]
        pad_tx(tx3_conflict)

        # Mining conflicting tx returns the mempool UTXO spent by tx3 to the mempool
        block = create_block(
            int(tip, 16),
            create_coinbase(103, b"\x03" * 33),
            1300000500,
            txlist=[tx3_conflict],
        )
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()

        del expected_utxos[2]
        assert_equal(
            chronik.script(script_type, payload_hex).utxos().ok(),
            pb.ScriptUtxos(script=bytes(P2SH_OP_TRUE), utxos=expected_utxos),
        )

        # Invalidating the last block doesn't change UTXOs
        node.invalidateblock(block.hash)
        assert_equal(
            chronik.script(script_type, payload_hex).utxos().ok(),
            pb.ScriptUtxos(script=bytes(P2SH_OP_TRUE), utxos=expected_utxos),
        )

        # Invalidating the next last block returns all UTXOs back to the mempool
        node.invalidateblock(tip)
        for expected_utxo in expected_utxos:
            expected_utxo.block_height = -1

        # Mempool UTXOs are sorted by txid:out_idx. Note: `sorted` is stable.
        assert_equal(
            list(chronik.script(script_type, payload_hex).utxos().ok().utxos),
            sorted(expected_utxos, key=lambda utxo: utxo.outpoint.txid[::-1]),
        )


if __name__ == "__main__":
    ChronikScriptUtxosTest().main()
