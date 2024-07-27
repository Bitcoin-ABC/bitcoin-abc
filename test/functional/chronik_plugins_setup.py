# Copyright (c) 2024 The Bitcoin developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.
"""
Test the Chronik plugin system gets sets up correctly.
"""

import os

from test_framework.address import ADDRESS_ECREG_UNSPENDABLE
from test_framework.test_framework import BitcoinTestFramework


class ChronikPluginsSetup(BitcoinTestFramework):
    def set_test_params(self):
        self.setup_clean_chain = True
        self.num_nodes = 1
        self.extra_args = [["-chronik"]]

    def skip_test_if_missing_module(self):
        self.skip_if_no_chronik_plugins()

    def run_test(self):
        node = self.nodes[0]

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

        # We already have an existing chain (with the genesis), so we need a -chronikreindex
        with open(plugin_module, "w", encoding="utf-8") as f:
            print("from chronik_plugin.plugin import Plugin", file=f)
            print("class MyPluginPlugin(Plugin):", file=f)
            print("  def lokad_id(self):", file=f)
            print("    return b'TEST'", file=f)
            print("  def version(self):", file=f)
            print("    return '0.1.0-aleph+bet'", file=f)
            print("  def run(self, tx):", file=f)
            print("    return []", file=f)
        assert_start_raises(
            'Error: Cannot load new plugin "my_plugin" on non-empty DB. Chronik is '
            "already synced to height 0, but this version of Chronik doesn't support "
            "automatically re-syncing plugins. Either disable the plugin or use "
            "-chronikreindex to reindex.",
        )

        # Successful plugin load + reindex
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin my_plugin.MyPluginPlugin (version 0.1.0-aleph+bet) with LOKAD IDs [b"TEST"]',
            ]
        ):
            self.start_node(0, ["-chronik", "-chronikreindex"])

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
        self.generatetoaddress(node, 5, ADDRESS_ECREG_UNSPENDABLE)

        # Re-enable plugin, now our plugin is out-of-sync and needs a reindex
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.my_plugin]", file=f)
        self.stop_node(0)
        assert_start_raises(
            'Error: Plugin "my_plugin" desynced from DB. Plugin has block height 0, but '
            "the rest of Chronik is synced to height 5. This version of Chronik "
            "doesn't support automatically re-syncing plugins. Either disable the "
            "plugin or use -chronikreindex to reindex.",
        )

        # With another chronikreindex, we're all good
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin my_plugin.MyPluginPlugin (version 0.2.0) with LOKAD IDs [b"TEST"]',
            ]
        ):
            self.start_node(0, ["-chronik", "-chronikreindex"])

        # Use different class name
        with open(plugins_toml, "w", encoding="utf-8") as f:
            print("[regtest.plugin.my_plugin]", file=f)
            print("class = 'RenamedPluginClass'", file=f)
        with open(plugin_module, "w", encoding="utf-8") as f:
            print("from chronik_plugin.plugin import Plugin", file=f)
            print("class RenamedPluginClass(Plugin):", file=f)
            print("  def lokad_id(self):", file=f)
            print("    return b'SETT'", file=f)
            print("  def version(self):", file=f)
            print("    return '0.2.0'", file=f)
            print("  def run(self, tx):", file=f)
            print("    return []", file=f)
        self.stop_node(0)
        with node.assert_debug_log(
            [
                "Plugin context initialized Python",
                'Loaded plugin my_plugin.RenamedPluginClass (version 0.2.0) with LOKAD IDs [b"SETT"]',
            ]
        ):
            self.start_node(0, ["-chronik"])


if __name__ == "__main__":
    ChronikPluginsSetup().main()
