# Copyright (c) 2020 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""Test generateblock rpc."""

from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal, assert_raises_rpc_error


class GenerateBlockTest(BitcoinTestFramework):
    def set_test_params(self):
        self.num_nodes = 1

    def skip_test_if_missing_module(self):
        self.skip_if_no_wallet()

    def run_test(self):
        node = self.nodes[0]

        self.log.info("Generate an empty block to address")
        address = node.getnewaddress()
        blockhash = self.generateblock(node, output=address, transactions=[])["hash"]
        block = node.getblock(blockhash=blockhash, verbose=2)
        assert_equal(len(block["tx"]), 1)
        assert_equal(block["tx"][0]["vout"][0]["scriptPubKey"]["addresses"][0], address)

        self.log.info("Generate an empty block to a descriptor")
        blockhash = self.generateblock(node, f"addr({address})", [])["hash"]
        block = node.getblock(blockhash=blockhash, verbosity=2)
        assert_equal(len(block["tx"]), 1)
        assert_equal(block["tx"][0]["vout"][0]["scriptPubKey"]["addresses"][0], address)

        self.log.info(
            "Generate an empty block to a combo descriptor with compressed pubkey"
        )
        combo_key = "0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798"
        combo_address = "ecregtest:qp63uahgrxged4z5jswyt5dn5v3lzsem6c49crxznd"
        blockhash = self.generateblock(node, f"combo({combo_key})", [])["hash"]
        block = node.getblock(blockhash, 2)
        assert_equal(len(block["tx"]), 1)
        assert_equal(
            block["tx"][0]["vout"][0]["scriptPubKey"]["addresses"][0], combo_address
        )

        self.log.info(
            "Generate an empty block to a combo descriptor with uncompressed pubkey"
        )
        combo_key = "0408ef68c46d20596cc3f6ddf7c8794f71913add807f1dc55949fa805d764d191c0b7ce6894c126fce0babc6663042f3dde9b0cf76467ea315514e5a6731149c67"
        combo_address = "ecregtest:qqmagqc48ln8p7zk6ez2h64amcamr86qwqku5075py"
        blockhash = self.generateblock(node, f"combo({combo_key})", [])["hash"]
        block = node.getblock(blockhash, 2)
        assert_equal(len(block["tx"]), 1)
        assert_equal(
            block["tx"][0]["vout"][0]["scriptPubKey"]["addresses"][0], combo_address
        )

        # Generate 110 blocks to spend
        self.generatetoaddress(node, 110, address)

        # Generate some extra mempool transactions to verify they don't get
        # mined
        for _ in range(10):
            node.sendtoaddress(address, 1000)

        self.log.info("Generate block with txid")
        txid = node.sendtoaddress(address, 1000000)
        blockhash = self.generateblock(node, address, [txid])["hash"]
        block = node.getblock(blockhash, 1)
        assert_equal(len(block["tx"]), 2)
        assert_equal(block["tx"][1], txid)

        self.log.info("Generate block with raw tx")
        utxos = node.listunspent(addresses=[address])
        raw = node.createrawtransaction(
            [{"txid": utxos[0]["txid"], "vout": utxos[0]["vout"]}], [{address: 1000000}]
        )
        signed_raw = node.signrawtransactionwithwallet(raw)["hex"]
        blockhash = self.generateblock(node, address, [signed_raw])["hash"]
        block = node.getblock(blockhash, 1)
        assert_equal(len(block["tx"]), 2)
        txid = block["tx"][1]
        assert_equal(node.gettransaction(txid)["hex"], signed_raw)

        self.log.info("Fail to generate block with out of order txs")
        raw1 = node.createrawtransaction(
            [{"txid": txid, "vout": 0}], [{address: 999900}]
        )
        signed_raw1 = node.signrawtransactionwithwallet(raw1)["hex"]
        txid1 = node.sendrawtransaction(signed_raw1)
        raw2 = node.createrawtransaction(
            [{"txid": txid1, "vout": 0}], [{address: 999000}]
        )
        signed_raw2 = node.signrawtransactionwithwallet(raw2)["hex"]
        txid2 = node.sendrawtransaction(signed_raw2)
        # Reversed CTOR
        txids = sorted([txid1, txid2], reverse=True)
        assert_raises_rpc_error(
            -25,
            "TestBlockValidity failed: tx-ordering",
            self.generateblock,
            node,
            address,
            txids,
        )

        self.log.info("Fail to generate block with txid not in mempool")
        missing_txid = (
            "0000000000000000000000000000000000000000000000000000000000000000"
        )
        assert_raises_rpc_error(
            -5,
            f"Transaction {missing_txid} not in mempool.",
            self.generateblock,
            node,
            address,
            [missing_txid],
        )

        self.log.info("Fail to generate block with invalid raw tx")
        invalid_raw_tx = "0000"
        assert_raises_rpc_error(
            -22,
            f"Transaction decode failed for {invalid_raw_tx}",
            self.generateblock,
            node,
            address,
            [invalid_raw_tx],
        )

        self.log.info("Fail to generate block with invalid address/descriptor")
        assert_raises_rpc_error(
            -5, "Invalid address or descriptor", self.generateblock, node, "1234", []
        )

        self.log.info("Fail to generate block with a ranged descriptor")
        ranged_descriptor = "pkh(tpubD6NzVbkrYhZ4XgiXtGrdW5XDAPFCL9h7we1vwNCpn8tGbBcgfVYjXyhWo4E1xkh56hjod1RhGjxbaTLV3X4FyWuejifB9jusQ46QzG87VKp/0/*)"
        assert_raises_rpc_error(
            -8,
            "Ranged descriptor not accepted. Maybe pass through deriveaddresses first?",
            self.generateblock,
            node,
            ranged_descriptor,
            [],
        )

        self.log.info("Fail to generate block with a descriptor missing a private key")
        child_descriptor = "pkh(tpubD6NzVbkrYhZ4XgiXtGrdW5XDAPFCL9h7we1vwNCpn8tGbBcgfVYjXyhWo4E1xkh56hjod1RhGjxbaTLV3X4FyWuejifB9jusQ46QzG87VKp/0'/0)"
        assert_raises_rpc_error(
            -5,
            "Cannot derive script without private keys",
            self.generateblock,
            node,
            child_descriptor,
            [],
        )


if __name__ == "__main__":
    GenerateBlockTest().main()
