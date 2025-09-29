# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test Chronik runs plugins on txs.
"""

import os
import time

from test_framework.address import (
    ADDRESS_ECREG_P2SH_OP_TRUE,
    ADDRESS_ECREG_UNSPENDABLE,
    P2SH_OP_TRUE,
    SCRIPTSIG_OP_TRUE,
)
from test_framework.blocktools import COINBASE_MATURITY
from test_framework.messages import COutPoint, CTransaction, CTxIn, CTxOut
from test_framework.script import OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.txtools import pad_tx
from test_framework.util import assert_equal, chronik_sub_plugin


class ChronikPlugins(BitcoinTestFramework):
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

        # Set the mocktime so we don't have to account for the time first seen
        # sorting when checking the transactions
        now = int(time.time())
        node.setmocktime(now)

        def ws_msg(txid: str, msg_type):
            return pb.WsMsg(
                tx=pb.MsgTx(
                    msg_type=msg_type,
                    txid=bytes.fromhex(txid)[::-1],
                )
            )

        # Without a plugins.toml, setting up a plugin context is skipped
        plugins_toml = os.path.join(node.datadir, "plugins.toml")
        plugins_dir = os.path.join(node.datadir, "plugins")

        # Plugin that colors outputs with the corresponding PUSHDATA of the OP_RETURN,
        # concatenated with the existing plugin data of the corresponding input
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
            data = [op]
            groups = []
            if op:
                groups = [op[:1]]
            if idx < len(tx.inputs):
                tx_input = tx.inputs[idx]
                if 'my_plugin' in tx_input.plugin:
                    data += tx_input.plugin['my_plugin'].data
            outputs.append(
                PluginOutput(idx=idx + 1, data=data, groups=groups)
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

        ws1 = chronik.ws()
        ws2 = chronik.ws()

        assert_equal(
            chronik.plugin("doesntexist").utxos(b"").err(404).msg,
            '404: Plugin "doesntexist" not loaded',
        )

        coinblockhash = self.generatetoaddress(node, 1, ADDRESS_ECREG_P2SH_OP_TRUE)[0]
        coinblock = node.getblock(coinblockhash)
        cointx = coinblock["tx"][0]

        # Make sure we can query coinbase txs without error
        chronik.tx(cointx).ok()

        self.generatetoaddress(node, COINBASE_MATURITY, ADDRESS_ECREG_UNSPENDABLE)

        chronik_sub_plugin(ws1, node, "my_plugin", b"a")
        chronik_sub_plugin(ws2, node, "my_plugin", b"b")

        plugin = chronik.plugin("my_plugin")

        coinvalue = 5000000000
        tx1 = CTransaction()
        tx1.vin = [CTxIn(COutPoint(int(cointx, 16), 0), SCRIPTSIG_OP_TRUE)]
        tx1.vout = [
            CTxOut(0, CScript([OP_RETURN, b"TEST", b"argo", b"alef", b"abc"])),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 10000, P2SH_OP_TRUE),
        ]
        pad_tx(tx1)
        node.sendrawtransaction(tx1.serialize().hex())

        assert_equal(ws1.recv(), ws_msg(tx1.txid_hex, pb.TX_ADDED_TO_MEMPOOL))

        # Plugin ran on the mempool tx
        proto_tx1 = chronik.tx(tx1.txid_hex).ok()
        tx1_plugin_outputs = [
            {},
            {"my_plugin": pb.PluginEntry(data=[b"argo"], groups=[b"a"])},
            {"my_plugin": pb.PluginEntry(data=[b"alef"], groups=[b"a"])},
            {"my_plugin": pb.PluginEntry(data=[b"abc"], groups=[b"a"])},
        ]
        assert_equal([inpt.plugins for inpt in proto_tx1.inputs], [{}])
        assert_equal(
            [output.plugins for output in proto_tx1.outputs],
            tx1_plugin_outputs,
        )
        proto_utxos1 = plugin.utxos(b"a").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos1],
            tx1_plugin_outputs[1:],
        )

        assert_equal(list(plugin.unconfirmed_txs(b"a").ok().txs), [proto_tx1])
        assert_equal(list(plugin.confirmed_txs(b"a").ok().txs), [])
        assert_equal(list(plugin.history(b"a").ok().txs), [proto_tx1])
        assert_equal(list(plugin.unconfirmed_txs(b"b").ok().txs), [])
        assert_equal(list(plugin.confirmed_txs(b"b").ok().txs), [])
        assert_equal(list(plugin.history(b"b").ok().txs), [])

        tx2 = CTransaction()
        tx2.vin = [CTxIn(COutPoint(tx1.txid_int, 3), SCRIPTSIG_OP_TRUE)]
        tx2.vout = [
            CTxOut(0, CScript([OP_RETURN, b"TEST", b"blub", b"borg", b"bjork"])),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(1000, P2SH_OP_TRUE),
            CTxOut(coinvalue - 20000, P2SH_OP_TRUE),
        ]
        pad_tx(tx2)
        node.sendrawtransaction(tx2.serialize().hex())

        assert_equal(ws1.recv(), ws_msg(tx2.txid_hex, pb.TX_ADDED_TO_MEMPOOL))
        assert_equal(ws2.recv(), ws_msg(tx2.txid_hex, pb.TX_ADDED_TO_MEMPOOL))

        proto_tx2 = chronik.tx(tx2.txid_hex).ok()
        tx2_plugin_inputs = [tx1_plugin_outputs[3]]
        tx2_plugin_outputs = [
            {},
            {"my_plugin": pb.PluginEntry(data=[b"blub", b"abc"], groups=[b"b"])},
            {"my_plugin": pb.PluginEntry(data=[b"borg"], groups=[b"b"])},
            {"my_plugin": pb.PluginEntry(data=[b"bjork"], groups=[b"b"])},
        ]
        assert_equal(
            [inpt.plugins for inpt in proto_tx2.inputs],
            tx2_plugin_inputs,
        )
        assert_equal(
            [output.plugins for output in proto_tx2.outputs],
            tx2_plugin_outputs,
        )
        proto_utxos1 = chronik.plugin("my_plugin").utxos(b"a").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos1],
            [tx1_plugin_outputs[1], tx1_plugin_outputs[2]],  # "abc" spent
        )
        proto_utxos2 = chronik.plugin("my_plugin").utxos(b"b").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos2],
            tx2_plugin_outputs[1:],
        )

        proto_tx1 = chronik.tx(tx1.txid_hex).ok()
        txs = sorted([proto_tx1, proto_tx2], key=lambda t: t.txid[::-1])
        assert_equal(list(plugin.unconfirmed_txs(b"a").ok().txs), txs)
        assert_equal(list(plugin.confirmed_txs(b"a").ok().txs), [])
        assert_equal(list(plugin.history(b"a").ok().txs), txs[::-1])
        assert_equal(list(plugin.unconfirmed_txs(b"b").ok().txs), [proto_tx2])
        assert_equal(list(plugin.confirmed_txs(b"b").ok().txs), [])
        assert_equal(list(plugin.history(b"b").ok().txs), [proto_tx2])

        # Mine tx1 and tx2
        block1 = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[-1]

        # Lexicographic order
        txids = sorted([tx1.txid_hex, tx2.txid_hex])
        assert_equal(ws1.recv(), ws_msg(txids[0], pb.TX_CONFIRMED))
        assert_equal(ws1.recv(), ws_msg(txids[1], pb.TX_CONFIRMED))
        assert_equal(ws2.recv(), ws_msg(tx2.txid_hex, pb.TX_CONFIRMED))

        proto_tx1 = chronik.tx(tx1.txid_hex).ok()
        assert_equal([inpt.plugins for inpt in proto_tx1.inputs], [{}])
        assert_equal(
            [output.plugins for output in proto_tx1.outputs],
            tx1_plugin_outputs,
        )

        proto_tx2 = chronik.tx(tx2.txid_hex).ok()
        assert_equal(
            [inpt.plugins for inpt in proto_tx2.inputs],
            tx2_plugin_inputs,
        )
        assert_equal(
            [output.plugins for output in proto_tx2.outputs],
            tx2_plugin_outputs,
        )
        proto_utxos1 = chronik.plugin("my_plugin").utxos(b"a").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos1],
            [tx1_plugin_outputs[1], tx1_plugin_outputs[2]],  # "abc" spent
        )
        proto_utxos2 = chronik.plugin("my_plugin").utxos(b"b").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos2],
            tx2_plugin_outputs[1:],
        )

        txs = sorted([proto_tx1, proto_tx2], key=lambda t: t.txid[::-1])
        assert_equal(list(plugin.unconfirmed_txs(b"a").ok().txs), [])
        assert_equal(list(plugin.confirmed_txs(b"a").ok().txs), txs)
        assert_equal(list(plugin.history(b"a").ok().txs), txs[::-1])
        assert_equal(list(plugin.unconfirmed_txs(b"b").ok().txs), [])
        assert_equal(list(plugin.confirmed_txs(b"b").ok().txs), [proto_tx2])
        assert_equal(list(plugin.history(b"b").ok().txs), [proto_tx2])

        tx3 = CTransaction()
        tx3.vin = [
            CTxIn(COutPoint(tx2.txid_int, 1), SCRIPTSIG_OP_TRUE),
            CTxIn(COutPoint(tx2.txid_int, 3), SCRIPTSIG_OP_TRUE),
        ]
        tx3.vout = [
            CTxOut(0, CScript([OP_RETURN, b"TEST", b"carp"])),
            CTxOut(coinvalue - 30000, P2SH_OP_TRUE),
        ]
        pad_tx(tx3)
        node.sendrawtransaction(tx3.serialize().hex())

        assert_equal(ws2.recv(), ws_msg(tx3.txid_hex, pb.TX_ADDED_TO_MEMPOOL))

        proto_tx3 = chronik.tx(tx3.txid_hex).ok()
        tx3_plugin_inputs = [tx2_plugin_outputs[1], tx2_plugin_outputs[3]]
        tx3_plugin_outputs = [
            {},
            {
                "my_plugin": pb.PluginEntry(
                    data=[b"carp", b"blub", b"abc"], groups=[b"c"]
                ),
            },
        ]
        assert_equal(
            [inpt.plugins for inpt in proto_tx3.inputs],
            tx3_plugin_inputs,
        )
        assert_equal(
            [output.plugins for output in proto_tx3.outputs],
            tx3_plugin_outputs,
        )
        proto_utxos2 = chronik.plugin("my_plugin").utxos(b"b").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos2],
            [tx2_plugin_outputs[2]],  # only "borg" remaining
        )
        proto_utxos3 = chronik.plugin("my_plugin").utxos(b"c").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos3],
            tx3_plugin_outputs[1:],
        )

        proto_tx2 = chronik.tx(tx2.txid_hex).ok()
        txs = sorted([proto_tx2, proto_tx3], key=lambda t: t.txid[::-1])
        assert_equal(list(plugin.unconfirmed_txs(b"b").ok().txs), [proto_tx3])
        assert_equal(list(plugin.confirmed_txs(b"b").ok().txs), [proto_tx2])
        assert_equal(list(plugin.history(b"b").ok().txs), txs[::-1])

        # Mine tx3
        block2 = self.generatetoaddress(node, 1, ADDRESS_ECREG_UNSPENDABLE)[-1]

        assert_equal(ws2.recv(), ws_msg(tx3.txid_hex, pb.TX_CONFIRMED))

        proto_tx3 = chronik.tx(tx3.txid_hex).ok()
        assert_equal(
            [inpt.plugins for inpt in proto_tx3.inputs],
            tx3_plugin_inputs,
        )
        assert_equal(
            [output.plugins for output in proto_tx3.outputs],
            tx3_plugin_outputs,
        )
        proto_utxos3 = chronik.plugin("my_plugin").utxos(b"c").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos3],
            tx3_plugin_outputs[1:],
        )

        proto_tx3 = chronik.tx(tx3.txid_hex).ok()
        txs = sorted([proto_tx2, proto_tx3], key=lambda t: t.txid[::-1])
        assert_equal(list(plugin.unconfirmed_txs(b"b").ok().txs), [])
        assert_equal(list(plugin.confirmed_txs(b"b").ok().txs), txs)
        assert_equal(list(plugin.history(b"b").ok().txs), txs[::-1])

        # Disconnect block2, inputs + outputs still work
        node.invalidateblock(block2)
        assert_equal(ws2.recv(), ws_msg(tx3.txid_hex, pb.TX_ADDED_TO_MEMPOOL))
        proto_tx3 = chronik.tx(tx3.txid_hex).ok()
        assert_equal(
            [inpt.plugins for inpt in proto_tx3.inputs],
            tx3_plugin_inputs,
        )
        assert_equal(
            [output.plugins for output in proto_tx3.outputs],
            tx3_plugin_outputs,
        )
        proto_utxos3 = chronik.plugin("my_plugin").utxos(b"c").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos3],
            tx3_plugin_outputs[1:],
        )

        # Disconnect block1
        node.invalidateblock(block1)

        # Topological order
        assert_equal(ws1.recv(), ws_msg(tx1.txid_hex, pb.TX_ADDED_TO_MEMPOOL))
        assert_equal(ws1.recv(), ws_msg(tx2.txid_hex, pb.TX_ADDED_TO_MEMPOOL))
        # Reorg first clears the mempool and then adds back in topological order
        assert_equal(ws2.recv(), ws_msg(tx3.txid_hex, pb.TX_REMOVED_FROM_MEMPOOL))
        assert_equal(ws2.recv(), ws_msg(tx2.txid_hex, pb.TX_ADDED_TO_MEMPOOL))
        assert_equal(ws2.recv(), ws_msg(tx3.txid_hex, pb.TX_ADDED_TO_MEMPOOL))

        proto_tx1 = chronik.tx(tx1.txid_hex).ok()
        assert_equal([inpt.plugins for inpt in proto_tx1.inputs], [{}])
        assert_equal(
            [output.plugins for output in proto_tx1.outputs],
            tx1_plugin_outputs,
        )
        proto_utxos1 = chronik.plugin("my_plugin").utxos(b"a").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos1],
            [tx1_plugin_outputs[1], tx1_plugin_outputs[2]],
        )

        proto_tx2 = chronik.tx(tx2.txid_hex).ok()
        assert_equal(
            [inpt.plugins for inpt in proto_tx2.inputs],
            tx2_plugin_inputs,
        )
        assert_equal(
            [output.plugins for output in proto_tx2.outputs],
            tx2_plugin_outputs,
        )
        proto_utxos2 = chronik.plugin("my_plugin").utxos(b"b").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos2],
            [tx2_plugin_outputs[2]],
        )

        proto_tx3 = chronik.tx(tx3.txid_hex).ok()
        assert_equal(
            [inpt.plugins for inpt in proto_tx3.inputs],
            tx3_plugin_inputs,
        )
        assert_equal(
            [output.plugins for output in proto_tx3.outputs],
            tx3_plugin_outputs,
        )
        proto_utxos3 = chronik.plugin("my_plugin").utxos(b"c").ok().utxos
        assert_equal(
            [utxo.plugins for utxo in proto_utxos3],
            tx3_plugin_outputs[1:],
        )


if __name__ == "__main__":
    ChronikPlugins().main()
