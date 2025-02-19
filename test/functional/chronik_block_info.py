# Copyright (c) 2023 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test if the `BlockInfo` fields are set correctly in Chronik.
"""

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
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
from test_framework.script import OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikBlockInfoTest(BitcoinTestFramework):
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

        prev_hash = self.generatetoaddress(
            node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE
        )[-1]

        coinvalue = 5000000000
        tx = CTransaction()
        tx.vin = [
            CTxIn(outpoint=COutPoint(int(cointx, 16), 0), scriptSig=SCRIPTSIG_OP_TRUE)
        ]
        tx.vout = [
            CTxOut(coinvalue - 10000, P2SH_OP_TRUE),
            CTxOut(1000, CScript([OP_RETURN, b"test"])),
        ]
        tx.rehash()

        txid = node.sendrawtransaction(tx.serialize().hex())

        tip_hash = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[-1]

        from test_framework.chronik.client import pb

        assert_equal(
            chronik.block(tip_hash).ok(),
            pb.Block(
                block_info=pb.BlockInfo(
                    hash=bytes.fromhex(tip_hash)[::-1],
                    prev_hash=bytes.fromhex(prev_hash)[::-1],
                    height=102,
                    n_bits=0x207FFFFF,
                    timestamp=1300000018,
                    block_size=281,
                    num_txs=2,
                    num_inputs=2,
                    num_outputs=3,
                    sum_input_sats=coinvalue,
                    sum_coinbase_output_sats=coinvalue + 9000,
                    sum_normal_output_sats=coinvalue - 9000,
                    sum_burned_sats=1000,
                ),
            ),
        )

        node.invalidateblock(tip_hash)
        chronik.block(tip_hash).err(404)

        tx2 = CTransaction()
        tx2.vin = [
            CTxIn(outpoint=COutPoint(int(txid, 16), 0), scriptSig=SCRIPTSIG_OP_TRUE)
        ]
        tx2.vout = [
            CTxOut(3000, CScript([OP_RETURN, b"test"])),
            CTxOut(5000, CScript([OP_RETURN, b"test"])),
            CTxOut(coinvalue - 20000, P2SH_OP_TRUE),
        ]
        tx2.rehash()

        block = create_block(
            int(prev_hash, 16), create_coinbase(102, b"\x03" * 33), 1300000500
        )
        block.vtx += [tx, tx2]
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)
        node.syncwithvalidationinterfacequeue()

        assert_equal(
            chronik.block(block.hash).ok(),
            pb.Block(
                block_info=pb.BlockInfo(
                    hash=bytes.fromhex(block.hash)[::-1],
                    prev_hash=bytes.fromhex(prev_hash)[::-1],
                    height=102,
                    n_bits=0x207FFFFF,
                    timestamp=1300000500,
                    block_size=403,
                    num_txs=3,
                    num_inputs=3,
                    num_outputs=7,
                    sum_input_sats=coinvalue * 2 - 10000,
                    sum_coinbase_output_sats=coinvalue,
                    sum_normal_output_sats=coinvalue * 2 - 21000,
                    sum_burned_sats=9000,
                ),
            ),
        )


if __name__ == "__main__":
    ChronikBlockInfoTest().main()
