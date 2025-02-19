# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /script/:type/:payload/unconfirmed-txs endpoint.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import (
    GENESIS_CB_PK,
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikScriptUnconfirmedTxsTest(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]
        self.rpc_timeout = 240

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        peer = node.add_p2p_connection(P2PDataStore())
        mocktime = 1300000000
        node.setmocktime(mocktime)

        assert_equal(
            chronik.script("", "").unconfirmed_txs().err(400).msg,
            "400: Unknown script type: ",
        )
        assert_equal(
            chronik.script(
                "foo",
                "",
            )
            .unconfirmed_txs()
            .err(400)
            .msg,
            "400: Unknown script type: foo",
        )
        assert_equal(
            chronik.script("p2pkh", "LILALI").unconfirmed_txs().err(400).msg,
            "400: Invalid hex: Invalid character 'L' at position 0",
        )
        assert_equal(
            chronik.script("other", "LILALI").unconfirmed_txs().err(400).msg,
            "400: Invalid hex: Invalid character 'L' at position 0",
        )
        assert_equal(
            chronik.script(
                "p2pkh",
                "",
            )
            .unconfirmed_txs()
            .err(400)
            .msg,
            "400: Invalid payload for P2PKH: Invalid length, "
            + "expected 20 bytes but got 0 bytes",
        )
        assert_equal(
            chronik.script("p2pkh", "aA").unconfirmed_txs().err(400).msg,
            "400: Invalid payload for P2PKH: Invalid length, "
            + "expected 20 bytes but got 1 bytes",
        )
        assert_equal(
            chronik.script("p2sh", "aaBB").unconfirmed_txs().err(400).msg,
            "400: Invalid payload for P2SH: Invalid length, "
            + "expected 20 bytes but got 2 bytes",
        )
        assert_equal(
            chronik.script("p2pk", "aaBBcc").unconfirmed_txs().err(400).msg,
            "400: Invalid payload for P2PK: Invalid length, "
            + "expected one of [33, 65] but got 3 bytes",
        )

        from test_framework.chronik.client import pb

        # No txs in mempool for the genesis pubkey
        assert_equal(
            chronik.script("p2pk", GENESIS_CB_PK).unconfirmed_txs().ok(),
            pb.TxHistoryPage(num_pages=0, num_txs=0),
        )

        script_type = "p2sh"
        payload_hex = P2SH_OP_TRUE[2:-1].hex()

        # Generate 110 blocks to some address
        blockhashes = self.generatetoaddress(node, 110, ADDRESS_ECREG_P2SH_OP_TRUE)

        # No txs in mempool for that address
        assert_equal(
            chronik.script(script_type, payload_hex).unconfirmed_txs().ok(),
            pb.TxHistoryPage(num_pages=0, num_txs=0),
        )

        coinvalue = 5000000000
        cointxids = []
        for coinblockhash in blockhashes[:10]:
            coinblock = node.getblock(coinblockhash)
            cointxids.append(coinblock["tx"][0])

        mempool_txs = []
        mempool_proto_txs = []
        # Send 10 mempool txs, each with their own mocktime
        mocktime_offsets = [0, 10, 10, 5, 0, 0, 12, 12, 10, 5]
        for mocktime_offset in mocktime_offsets:
            cointxid = cointxids.pop(0)
            time_first_seen = mocktime + mocktime_offset
            pad_script = CScript([OP_RETURN, bytes(100)])

            tx = CTransaction()
            tx.nVersion = 1
            tx.vin = [
                CTxIn(
                    outpoint=COutPoint(int(cointxid, 16), 0),
                    scriptSig=SCRIPTSIG_OP_TRUE,
                    nSequence=0xFFFFFFFF,
                )
            ]
            tx.vout = [
                CTxOut(coinvalue - 1000, P2SH_OP_TRUE),
                CTxOut(0, pad_script),
            ]
            tx.nLockTime = 1

            node.setmocktime(time_first_seen)
            txid = node.sendrawtransaction(tx.serialize().hex())
            mempool_txs.append(tx)
            mempool_proto_txs.append(
                pb.Tx(
                    txid=bytes.fromhex(txid)[::-1],
                    version=1,
                    inputs=[
                        pb.TxInput(
                            prev_out=pb.OutPoint(
                                txid=bytes.fromhex(cointxid)[::-1],
                                out_idx=0,
                            ),
                            input_script=bytes(SCRIPTSIG_OP_TRUE),
                            output_script=bytes(P2SH_OP_TRUE),
                            value=coinvalue,
                            sequence_no=0xFFFFFFFF,
                        )
                    ],
                    outputs=[
                        pb.TxOutput(
                            value=coinvalue - 1000,
                            output_script=bytes(P2SH_OP_TRUE),
                        ),
                        pb.TxOutput(
                            value=0,
                            output_script=bytes(pad_script),
                        ),
                    ],
                    lock_time=1,
                    size=len(tx.serialize()),
                    time_first_seen=time_first_seen,
                )
            )

        # Sort txs by time_first_seen and then by txid
        def sorted_txs(txs):
            return sorted(txs, key=lambda tx: (tx.time_first_seen, tx.txid[::-1]))

        assert_equal(
            chronik.script(script_type, payload_hex).unconfirmed_txs().ok(),
            pb.TxHistoryPage(
                txs=sorted_txs(mempool_proto_txs), num_pages=1, num_txs=len(mempool_txs)
            ),
        )

        # Mine 5 transactions, with 2 conflicts, leave 5 others unconfirmed
        mine_txs = mempool_txs[:3]
        mine_proto_txs = mempool_proto_txs[:3]
        for conflict_tx, conflict_proto_tx in zip(
            mempool_txs[3:5], mempool_proto_txs[3:5]
        ):
            conflict_tx.nLockTime = 2
            conflict_tx.rehash()
            mine_txs.append(conflict_tx)
            conflict_proto_tx.txid = bytes.fromhex(conflict_tx.hash)[::-1]
            conflict_proto_tx.lock_time = 2
            mine_proto_txs.append(conflict_proto_tx)

        height = 111
        coinbase_tx = create_coinbase(height)
        coinbase_tx.vout[0].scriptPubKey = P2SH_OP_TRUE
        coinbase_tx.rehash()
        block = create_block(int(blockhashes[-1], 16), coinbase_tx, mocktime + 1100)
        block.vtx += mine_txs
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()

        # Only unconfirmed txs remain, conflict txs are removed
        assert_equal(
            chronik.script(script_type, payload_hex).unconfirmed_txs().ok(),
            pb.TxHistoryPage(
                txs=sorted_txs(mempool_proto_txs[5:]), num_pages=1, num_txs=5
            ),
        )


if __name__ == "__main__":
    ChronikScriptUnconfirmedTxsTest().main()
