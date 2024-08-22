# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik's /plugin/:plugin_name/groups endpoints.
"""

import os

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
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal


class ChronikPluginGroups(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik_plugins()

    def run_test(self):
        from test_framework.chronik.client import pb

        node = self.nodes[0]
        chronik = node.get_chronik_client()

        # Without a plugins.toml, setting up a plugin context is skipped
        plugins_toml = os.path.join(node.datadir, "plugins.toml")
        plugins_dir = os.path.join(node.datadir, "plugins")

        # Plugin that colors outputs with the corresponding PUSHDATA of the OP_RETURN
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.my_plugin]", file=f)
        os.mkdir(plugins_dir)
        plugin_module = os.path.join(plugins_dir, "my_plugin.py")
        with open(plugin_module, "w", encoding="utf-8") as f:
            print(
                """
from chronik_plugin.plugin import Plugin, PluginOutput
from chronik_plugin.script import OP_RETURN

class MyPluginPlugin(Plugin):
    def lokad_id(self):
        return b'TEST'

    def version(self):
        return '0.1.0'

    def run(self, tx):
        ops = list(tx.outputs[0].script)
        if ops[0] != OP_RETURN:
            return []
        if ops[1] != b'TEST':
            return []
        outputs = []
        for idx, (op, _) in enumerate(zip(ops[2:], tx.outputs[1:])):
            outputs.append(
                PluginOutput(idx=idx + 1, groups=op)
            )
        return outputs
""",
                file=f,
            )

        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin my_plugin.MyPluginPlugin (version 0.1.0) with LOKAD IDs [b"TEST"]',
            ]
        ):
            self.restart_node(0, ["-chronik", "-chronikreindex"])
        peer = node.add_p2p_connection(P2PDataStore())

        assert_equal(
            chronik.plugin("doesntexist").groups().err(404).msg,
            '404: Plugin "doesntexist" not loaded',
        )

        plugin = chronik.plugin("my_plugin")
        assert_equal(
            plugin.groups(page_size=51).err(400).msg,
            "400: Requested page size 51 is too big, maximum is 50",
        )
        assert_equal(
            plugin.groups(page_size=0).err(400).msg,
            "400: Requested page size 0 is too small, minimum is 1",
        )
        assert_equal(
            plugin.groups(page_size=2**32 - 1).err(400).msg,
            "400: Requested page size 4294967295 is too big, maximum is 50",
        )
        assert_equal(
            plugin.groups(page_size=2**32).err(400).msg,
            "400: Invalid param page_size: 4294967296, "
            + "number too large to fit in target type",
        )

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        block_hashes = self.generatetoaddress(
            node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE
        )

        coinvalue = 5000000000
        tx1 = CTransaction()
        tx1.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx1.vout = [
            CTxOut(
                0, CScript([OP_RETURN, b"TEST", b"aaa", b"aab", b"abb", b"baa", b"bba"])
            ),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 10000, P2SH_OP_TRUE),
        ]
        pad_tx(tx1)
        node.sendrawtransaction(tx1.serialize().hex())

        def make_groups(groups: list[bytes], next_start=b"") -> pb.PluginGroups:
            return pb.PluginGroups(
                groups=[pb.PluginGroup(group=group) for group in groups],
                next_start=next_start,
            )

        assert_equal(
            plugin.groups().ok(),
            make_groups([b"aaa", b"aab", b"abb", b"baa", b"bba"]),
        )
        assert_equal(
            plugin.groups(page_size=2).ok(),
            make_groups([b"aaa", b"aab"], next_start=b"abb"),
        )
        assert_equal(
            plugin.groups(page_size=2, start=b"abb").ok(),
            make_groups([b"abb", b"baa"], next_start=b"bba"),
        )
        assert_equal(
            plugin.groups(page_size=2, start=b"bba").ok(),
            make_groups([b"bba"]),
        )
        assert_equal(
            plugin.groups(prefix=b"aa").ok(),
            make_groups([b"aaa", b"aab"]),
        )
        assert_equal(
            plugin.groups(prefix=b"a", start=b"aab").ok(),
            make_groups([b"aab", b"abb"]),
        )
        assert_equal(
            plugin.groups(start=b"aab").ok(),
            make_groups([b"aab", b"abb", b"baa", b"bba"]),
        )
        assert_equal(
            plugin.groups(prefix=b"a", start=b"aab", page_size=1).ok(),
            make_groups([b"aab"], next_start=b"abb"),
        )

        tx2 = CTransaction()
        tx2.vin = [CTxIn(COutPoint(tx1.sha256, 5), SCRIPTSIG_OP_TRUE)]
        tx2.vout = [
            CTxOut(0, CScript([OP_RETURN, b"TEST", b"aaa", b"bbb", b"aba"])),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 20000, P2SH_OP_TRUE),
        ]
        pad_tx(tx2)
        node.sendrawtransaction(tx2.serialize().hex())

        # bba is spent now
        assert_equal(
            plugin.groups().ok(),
            make_groups([b"aaa", b"aab", b"aba", b"abb", b"baa", b"bbb"]),
        )

        # Mine tx1 and tx2
        block1 = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[-1]

        assert_equal(
            plugin.groups().ok(),
            make_groups([b"aaa", b"aab", b"aba", b"abb", b"baa", b"bbb"]),
        )
        assert_equal(
            plugin.groups(prefix=b"b").ok(),
            make_groups([b"baa", b"bbb"]),
        )

        tx3 = CTransaction()
        tx3.vin = [
            CTxIn(COutPoint(tx2.sha256, 1), SCRIPTSIG_OP_TRUE),
            CTxIn(COutPoint(tx2.sha256, 2), SCRIPTSIG_OP_TRUE),
            CTxIn(COutPoint(tx2.sha256, 3), SCRIPTSIG_OP_TRUE),
        ]
        tx3.vout = [
            CTxOut(0, CScript([OP_RETURN, b"TEST", b"bba"])),
            CTxOut(coinvalue - 30000, P2SH_OP_TRUE),
        ]
        pad_tx(tx3)
        node.sendrawtransaction(tx3.serialize().hex())

        # bba revived, aaa still remaining, aba and bbb fully spent in mempool
        assert_equal(
            plugin.groups().ok(),
            make_groups([b"aaa", b"aab", b"abb", b"baa", b"bba"]),
        )
        assert_equal(
            plugin.groups(page_size=2).ok(),
            make_groups(
                [b"aaa", b"aab"], next_start=b"aba"
            ),  # next_start not guaranteed to be the next entry
        )
        assert_equal(
            plugin.groups(prefix=b"a").ok(),
            make_groups([b"aaa", b"aab", b"abb"]),
        )
        assert_equal(
            plugin.groups(prefix=b"a", start=b"aab").ok(),
            make_groups([b"aab", b"abb"]),
        )
        assert_equal(
            plugin.groups(start=b"aab").ok(),
            make_groups([b"aab", b"abb", b"baa", b"bba"]),
        )
        assert_equal(
            plugin.groups(prefix=b"a", start=b"aab", page_size=1).ok(),
            make_groups([b"aab"], next_start=b"aba"),
        )

        # Mine tx3, groups stay the same
        block2 = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[-1]
        assert_equal(
            plugin.groups().ok(),
            make_groups([b"aaa", b"aab", b"abb", b"baa", b"bba"]),
        )

        # Disconnect block2, groups stay the same
        node.invalidateblock(block2)
        assert_equal(
            plugin.groups().ok(),
            make_groups([b"aaa", b"aab", b"abb", b"baa", b"bba"]),
        )

        # Disconnect block1, groups stay the same
        node.invalidateblock(block1)
        assert_equal(
            plugin.groups().ok(),
            make_groups([b"aaa", b"aab", b"abb", b"baa", b"bba"]),
        )

        # Test DB UTXO lookup limits
        last_txid = tx3.hash
        last_value = tx3.vout[1].nValue
        extra_txs = []
        for i in range(1001):
            last_value -= 10000
            # Tx with a "spent", "all" and integer group
            tx = CTransaction()
            tx.vin = [CTxIn(COutPoint(int(last_txid, 16), 1), SCRIPTSIG_OP_TRUE)]
            tx.vout = [
                CTxOut(
                    0,
                    CScript(
                        [OP_RETURN, b"TEST", b"spent", b"all", i.to_bytes(3, "big")]
                    ),
                ),
                CTxOut(last_value, P2SH_OP_TRUE),
                CTxOut(546, P2SH_OP_TRUE),
                CTxOut(546, P2SH_OP_TRUE),
            ]
            pad_tx(tx)
            extra_txs.append(tx)
            last_txid = tx.hash
        block_height = 102
        block = create_block(
            int(block_hashes[-1], 16),
            create_coinbase(block_height, b"\x03" * 33),
        )
        block.vtx += [tx1, tx2, tx3] + extra_txs
        make_conform_to_ctor(block)
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)

        # Tx that spends all "all" UTXOs
        spend_all = CTransaction()
        spend_all.vin = [
            CTxIn(COutPoint(int(tx.hash, 16), 2), SCRIPTSIG_OP_TRUE) for tx in extra_txs
        ]
        spend_all.vout = [CTxOut(546, P2SH_OP_TRUE)]
        node.sendrawtransaction(spend_all.serialize().hex())

        # All in group "all" are spent (in the mempool)
        assert_equal(plugin.utxos(b"all").ok(), pb.Utxos())
        # But we still get the group in groups, because of our heuristic
        assert_equal(
            plugin.groups(start=b"all", page_size=1).ok(),
            make_groups([b"all"], next_start=b"baa"),
        )

        # If we mine the tx, we don't get group "all" anymore
        block1 = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[-1]
        assert_equal(plugin.utxos(b"all").ok(), pb.Utxos())
        assert_equal(
            plugin.groups(start=b"all", page_size=1).ok(),
            make_groups([b"baa"], next_start=b"spent"),
        )

        # Spend all UTXOs that have an integer as group
        spend_ints = CTransaction()
        spend_ints.vin = [
            CTxIn(COutPoint(int(tx.hash, 16), 3), SCRIPTSIG_OP_TRUE) for tx in extra_txs
        ]
        spend_ints.vout = [CTxOut(546, P2SH_OP_TRUE)]
        node.sendrawtransaction(spend_ints.serialize().hex())
        # We skipped 1000 groups, Chronik refuses to skip more
        # It returns us the 1000th UTXO so we can make progress
        assert_equal(
            plugin.groups().ok(),
            make_groups([], next_start=(1000).to_bytes(3, "big")),
        )
        # Skipped 1000 groups again
        # Starting from the 1st UTXO gives us "aaa" as next start
        assert_equal(
            plugin.groups(start=b"\0\0\x01").ok(),
            make_groups([], next_start=b"aaa"),
        )
        # Only skipped 999 groups, so we get all unspent groups as normal
        assert_equal(
            plugin.groups(start=b"\0\0\x02").ok(),
            make_groups([b"aaa", b"aab", b"abb", b"baa", b"spent"]),
        )
        # Same if we use the suggested next_start of 1000
        assert_equal(
            plugin.groups(start=(1000).to_bytes(3, "big")).ok(),
            make_groups([b"aaa", b"aab", b"abb", b"baa", b"spent"]),
        )


if __name__ == "__main__":
    ChronikPluginGroups().main()
