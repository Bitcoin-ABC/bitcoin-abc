# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test if the `Tx.spent_by` field is set correctly in Chronik.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import (
    COINBASE_MATURITY,
    create_block,
    create_coinbase,
    make_conform_to_ctor,
)
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_EQUAL, OP_HASH160, CScript, hash160
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal


class ChronikSpentByTest(BitcoinTestFramework):
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

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        tip = self.generatetoaddress(
            node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE
        )[-1]

        coinvalue = 5000000000
        send_values = [coinvalue - 10000, 1000, 1000, 1000]
        send_redeem_scripts = [bytes([i + 0x52]) for i in range(len(send_values))]
        send_script_hashes = [hash160(script) for script in send_redeem_scripts]
        send_scripts = [
            CScript([OP_HASH160, script_hash, OP_EQUAL])
            for script_hash in send_script_hashes
        ]
        tx = CTransaction()
        tx.vin = [
            CTxIn(outpoint=COutPoint(int(cointx, 16), 0), scriptSig=SCRIPTSIG_OP_TRUE)
        ]
        tx.vout = [
            CTxOut(value, script) for (value, script) in zip(send_values, send_scripts)
        ]
        tx.rehash()

        # Submit tx to mempool
        txid = node.sendrawtransaction(tx.serialize().hex())

        def tx_outputs_spent(tx):
            return [output.spent_by for output in tx.outputs]

        def find_tx(txs):
            return [tx for tx in txs if tx.txid[::-1].hex() == txid][0]

        def check_outputs_spent(expected_outpoints, *, has_been_mined):
            assert_equal(
                tx_outputs_spent(chronik.tx(txid).ok()),
                expected_outpoints,
            )
            for script_hash in send_script_hashes:
                chronik_script = chronik.script("p2sh", script_hash.hex())
                if has_been_mined:
                    txs = chronik_script.confirmed_txs().ok()
                else:
                    txs = chronik_script.unconfirmed_txs().ok()
                tx = find_tx(txs.txs)
                assert_equal(tx, find_tx(chronik_script.history().ok().txs))
                assert_equal(
                    tx_outputs_spent(tx),
                    expected_outpoints,
                )

        from test_framework.chronik.client import pb

        # Initially, none of the outputs are spent
        check_outputs_spent([pb.SpentBy()] * len(send_values), has_been_mined=False)

        # Add tx that spends the middle two outputs to mempool
        tx2 = CTransaction()
        tx2.vin = [
            CTxIn(
                outpoint=COutPoint(int(txid, 16), i + 1),
                scriptSig=CScript([redeem_script]),
            )
            for i, redeem_script in enumerate(send_redeem_scripts[1:3])
        ]
        pad_tx(tx2)
        txid2 = node.sendrawtransaction(tx2.serialize().hex())

        middle_two_spent = [
            pb.SpentBy(),
            pb.SpentBy(txid=bytes.fromhex(txid2)[::-1], input_idx=0),
            pb.SpentBy(txid=bytes.fromhex(txid2)[::-1], input_idx=1),
            pb.SpentBy(),
        ]
        check_outputs_spent(middle_two_spent, has_been_mined=False)

        # Mining both txs still works
        block2 = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        check_outputs_spent(middle_two_spent, has_been_mined=True)

        # Add tx that also spends the last output to the mempool
        tx3 = CTransaction()
        tx3.vin = [
            CTxIn(
                outpoint=COutPoint(int(txid, 16), 3),
                scriptSig=CScript([send_redeem_scripts[3]]),
            )
        ]
        pad_tx(tx3)
        txid3 = node.sendrawtransaction(tx3.serialize().hex())

        # 2 outputs spent by a mined tx, 1 output spent by a mempool tx
        last_three_spent = [
            pb.SpentBy(),
            pb.SpentBy(txid=bytes.fromhex(txid2)[::-1], input_idx=0),
            pb.SpentBy(txid=bytes.fromhex(txid2)[::-1], input_idx=1),
            pb.SpentBy(txid=bytes.fromhex(txid3)[::-1], input_idx=0),
        ]
        check_outputs_spent(last_three_spent, has_been_mined=True)

        # Mining tx3 still works
        block3 = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[0]
        check_outputs_spent(last_three_spent, has_been_mined=True)

        # Adding tx3 back to mempool still works
        node.invalidateblock(block3)
        check_outputs_spent(last_three_spent, has_been_mined=True)

        # Adding tx and tx2 back to mempool still works
        node.invalidateblock(block2)
        check_outputs_spent(last_three_spent, has_been_mined=False)

        # Mine a tx conflicting with tx3
        tx3_conflict = CTransaction(tx3)
        tx3_conflict.nLockTime = 1
        tx3_conflict.rehash()

        # Block mines tx, tx2 and tx3_conflict
        block = create_block(
            int(tip, 16), create_coinbase(102, b"\x03" * 33), 1300000500
        )
        block.vtx += [tx, tx2, tx3_conflict]
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)

        conflict_spent = [
            pb.SpentBy(),
            pb.SpentBy(txid=bytes.fromhex(txid2)[::-1], input_idx=0),
            pb.SpentBy(txid=bytes.fromhex(txid2)[::-1], input_idx=1),
            pb.SpentBy(txid=bytes.fromhex(tx3_conflict.hash)[::-1], input_idx=0),
        ]
        check_outputs_spent(conflict_spent, has_been_mined=True)


if __name__ == "__main__":
    ChronikSpentByTest().main()
