# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test the Chronik plugin system gets sets up correctly.
"""

import os

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.blocktools import create_block, create_coinbase
from test_framework.messages import CTxOut
from test_framework.p2p import P2PDataStore
from test_framework.script import OP_RETURN, CScript
from test_framework.test_framework import BitcoinTestFramework
from test_framework.util import assert_equal


class ChronikPluginsSetup(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik_plugins()

    def run_test(self):
        node = self.nodes[0]
        chronik = node.get_chronik_client()

        def assert_start_raises(*args, **kwargs):
            node.assert_start_raises_init_error(["-chronik"], *args, **kwargs)

        # Without a plugins.toml, setting up a plugin context is skipped
        plugins_toml = os.path.join(node.datadir, "plugins.toml")
        plugins_dir = os.path.join(node.datadir, "plugins")
        with node.assert_debug_log(
            [
                f"Skipping initializing plugins: {plugins_toml} doesn't exist",
            ]
        ):
            self.restart_node(0, ["-chronik"])

        # Create empty plugins.toml
        open(plugins_toml, "w", encoding="utf-8").close()

        # Now, plugin context is loaded
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
            ]
        ):
            self.restart_node(0, ["-chronik"])

        # On regtest, mainnet and testnet params are ignored
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[plugin.plugin1]", file=f)
            print("[main.plugin.plugin2]", file=f)
            print("[test.plugin.my_plugin]", file=f)
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
            ]
        ):
            self.restart_node(0, ["-chronik"])

        # Mainnet merges [plugin] and [main.plugin], and doesn't allow overlaps
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[plugin.my_plugin]", file=f)
            print("[main.plugin.my_plugin]", file=f)
        self.stop_node(0)
        assert_start_raises(
            "Error: Duplicate plugin my_plugin, use either [main.plugin] or [plugin] but not both",
        )

        # Enable plugin, fails to load
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.my_plugin]", file=f)
        self.stop_node(0)
        assert_start_raises(
            "Error: Failed importing plugin module: ModuleNotFoundError: No module named 'my_plugin'",
        )

        os.mkdir(plugins_dir)
        plugin_module = os.path.join(plugins_dir, "my_plugin.py")
        open(plugin_module, "w", encoding="utf-8").close()
        assert_start_raises(
            'Error: Could not find class "MyPluginPlugin" in the plugin module. Make sure it is spelled correctly.'
        )

        # Plugin class must derive our Plugin ABC
        with open(plugin_module, "w", encoding="utf-8") as f:
            print("class MyPluginPlugin:", file=f)
            print("  def __init__(self, config):", file=f)
            print("    pass", file=f)
        assert_start_raises(
            'Error: Class "MyPluginPlugin" must derive from chronik_plugin.plugin.Plugin',
        )

        # LOKAD ID must be 4 bytes
        with open(plugin_module, "w", encoding="utf-8") as f:
            print("from chronik_plugin.plugin import Plugin", file=f)
            print("class MyPluginPlugin(Plugin):", file=f)
            print("  def lokad_id(self):", file=f)
            print("    return b'T'", file=f)
            print("  def version(self):", file=f)
            print("    return ''", file=f)
            print("  def run(self, tx):", file=f)
            print("    return []", file=f)
        assert_start_raises(
            "Error: Invalid lokad_id length, expected 4 bytes, but got 1 bytes",
        )

        # Version must be str
        with open(plugin_module, "w", encoding="utf-8") as f:
            print("from chronik_plugin.plugin import Plugin", file=f)
            print("class MyPluginPlugin(Plugin):", file=f)
            print("  def lokad_id(self):", file=f)
            print("    return b'TEST'", file=f)
            print("  def version(self):", file=f)
            print("    return 8", file=f)
            print("  def run(self, tx):", file=f)
            print("    return []", file=f)
        assert_start_raises(
            "Error: Invalid version, must be str: TypeError: 'int' object cannot be converted to 'PyString'",
        )

        # Version must follow semantic versioning
        with open(plugin_module, "w", encoding="utf-8") as f:
            print("from chronik_plugin.plugin import Plugin", file=f)
            print("class MyPluginPlugin(Plugin):", file=f)
            print("  def lokad_id(self):", file=f)
            print("    return b'TEST'", file=f)
            print("  def version(self):", file=f)
            print("    return 'ver'", file=f)
            print("  def run(self, tx):", file=f)
            print("    return []", file=f)
        assert_start_raises(
            'Error: Invalid version "ver", must follow semantic versioning (see https://semver.org/)',
        )

        with open(plugin_module, "w", encoding="utf-8") as f:
            print("from chronik_plugin.plugin import Plugin", file=f)
            print("class MyPluginPlugin(Plugin):", file=f)
            print("  def lokad_id(self):", file=f)
            print("    return b'TEST'", file=f)
            print("  def version(self):", file=f)
            print("    return '0.1.0-aleph+bet'", file=f)
            print("  def run(self, tx):", file=f)
            print("    return []", file=f)
        # Successful plugin load. Reindex not needed as no txs with the plugin's LOKAD ID
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin my_plugin.MyPluginPlugin (version 0.1.0-aleph+bet) with LOKAD IDs [b"TEST"]',
            ]
        ):
            self.start_node(0, ["-chronik"])

        # Upgrading plugin version without reindex not allowed
        with open(plugin_module, "w", encoding="utf-8") as f:
            print("from chronik_plugin.plugin import Plugin", file=f)
            print("class MyPluginPlugin(Plugin):", file=f)
            print("  def lokad_id(self):", file=f)
            print("    return b'TEST'", file=f)
            print("  def version(self):", file=f)
            print("    return '0.2.0'", file=f)
            print("  def run(self, tx):", file=f)
            print("    return []", file=f)
        self.stop_node(0)
        assert_start_raises(
            'Error: Cannot use different version for plugin "my_plugin". Previously, '
            "we indexed using version 0.1.0-aleph+bet, but now version 0.2.0 has been "
            "loaded. This version of Chronik doesn't support automatically updating "
            "plugins; either downgrade the plugin or use -chronikreindex to reindex "
            "using the new version.",
        )

        # With chronikreindex, we're all good
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin my_plugin.MyPluginPlugin (version 0.2.0) with LOKAD IDs [b"TEST"]',
            ]
        ):
            self.start_node(0, ["-chronik", "-chronikreindex"])

        # Disable plugin and generate a few blocks
        open(plugins_toml, "w", encoding="utf-8").close()
        self.restart_node(0, ["-chronik"])
        block_hashes = self.generatetoaddress(node, 5, ADDRESS_ECREG_UNSPENDABLE)

        # Re-enable plugin, now our plugin is out-of-sync, but it's fine because we
        # don't have have any txs with the LOKAD ID yet
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.my_plugin]", file=f)
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin my_plugin.MyPluginPlugin (version 0.2.0) with LOKAD IDs [b"TEST"]',
            ]
        ):
            self.restart_node(0, ["-chronik"])

        # Disable plugin again, but keep its entry in the DB
        open(plugins_toml, "w", encoding="utf-8").close()
        self.restart_node(0, ["-chronik"])

        peer = node.add_p2p_connection(P2PDataStore())
        block_height = node.getblockcount()
        coinbase_tx = create_coinbase(block_height + 1, b"\x03" * 33)
        coinbase_tx.vout.insert(0, CTxOut(0, CScript([OP_RETURN, b"TEST"])))
        block = create_block(
            int(block_hashes[-1], 16),
            coinbase_tx,
        )
        block.hashMerkleRoot = block.calc_merkle_root()
        block.solve()
        peer.send_blocks_and_test([block], node)

        # Add some blocks on top of it
        self.generatetoaddress(node, 4, ADDRESS_ECREG_UNSPENDABLE)

        # Re-enable plugin, now we have an existing unindexed tx
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.my_plugin]", file=f)
        self.stop_node(0)
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Plugin "my_plugin" desynced, DB is on height 10 but plugin is on '
                "height 5 with existing transactions for the plugin's LOKAD IDs "
                '[b"TEST"]',
            ]
        ):
            assert_start_raises(
                "Error: Loading plugins failed, there are already matching txs in the DB "
                f"for their LOKAD IDs, the earliest is in transaction {coinbase_tx.hash} "
                f"in block {block.hash} (height 6). Chronik is synced to height 10, but "
                "this version of Chronik doesn't support automatically re-syncing plugins. "
                "Either disable the desynced plugins, use -chronikreindex to reindex, or "
                "park the block and index again."
            )

        # Disable the plugin and start
        open(plugins_toml, "w", encoding="utf-8").close()
        self.start_node(0, ["-chronik"])
        # Invalidate the offending block as suggested in the message
        node.invalidateblock(block.hash)

        # Starting again now syncs fine
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.my_plugin]", file=f)
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin my_plugin.MyPluginPlugin (version 0.2.0) with LOKAD IDs [b"TEST"]',
            ]
        ):
            self.restart_node(0, ["-chronik"])
        node.reconsiderblock(block.hash)
        # Tx indexed
        assert_equal(chronik.lokad_id(b"TEST".hex()).confirmed_txs().ok().num_txs, 1)

        # Disable plugin again and delete its DB entry
        open(plugins_toml, "w", encoding="utf-8").close()
        self.restart_node(0, ["-chronik", "-chronikreindex"])

        # Enable plugin, fails to load as new plugin because there's already txs
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.my_plugin]", file=f)
        self.stop_node(0)
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Cannot load plugin "my_plugin", DB is on height 10 but plugin has '
                'existing transactions for the plugin\'s LOKAD IDs [b"TEST"]',
            ]
        ):
            assert_start_raises(
                "Error: Loading plugins failed, there are already matching txs in the DB "
                f"for their LOKAD IDs, the earliest is in transaction {coinbase_tx.hash} "
                f"in block {block.hash} (height 6). Chronik is synced to height 10, but "
                "this version of Chronik doesn't support automatically re-syncing plugins. "
                "Either disable the desynced plugins, use -chronikreindex to reindex, or "
                "park the block and index again."
            )

        # Use different class name
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.my_plugin]", file=f)
            print("class = 'RenamedPluginClass'", file=f)
        with open(plugin_module, "w", encoding="utf-8") as f:
            print("from chronik_plugin.plugin import Plugin", file=f)
            print("class RenamedPluginClass(Plugin):", file=f)
            print("  def lokad_id(self):", file=f)
            print("    return b'TEST'", file=f)
            print("  def version(self):", file=f)
            print("    return '0.2.0'", file=f)
            print("  def run(self, tx):", file=f)
            print("    return []", file=f)
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin my_plugin.RenamedPluginClass (version 0.2.0) with LOKAD IDs [b"TEST"]',
            ]
        ):
            self.start_node(0, ["-chronik", "-chronikreindex"])


if __name__ == "__main__":
    ChronikPluginsSetup().main()
