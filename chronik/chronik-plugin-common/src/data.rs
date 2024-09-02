// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for common structs used when indexing by plugins

use std::collections::BTreeMap;

use bimap::BiMap;
use serde::{Deserialize, Serialize};

/// Index of a plugin to uniquely identify it
pub type PluginIdx = u32;

/// Data attached to a tx's outputs by plugins
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct PluginTxOutputs {
    /// Map from output index to the data attached by plugins to that output
    pub outputs: BTreeMap<u32, PluginOutput>,
}

/// Data attached to an output by all loaded plugins.
#[derive(Clone, Debug, Deserialize, Default, Eq, PartialEq, Serialize)]
pub struct PluginOutput {
    /// Entries for each plugin, indentified by plugin ID
    pub plugins: BTreeMap<PluginIdx, PluginOutputEntry>,
}

/// Data attached to an output by an individual plugin.
#[derive(Clone, Debug, Deserialize, Default, Eq, PartialEq, Serialize)]
pub struct PluginOutputEntry {
    /// Groups assigned to the output
    pub groups: Vec<Vec<u8>>,
    /// Data assigned to the output
    pub data: Vec<Vec<u8>>,
}

/// Map plugin names and plugin idx
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct PluginNameMap {
    plugins_name: BiMap<PluginIdx, String>,
}

/// Group assigned by a plugin
#[derive(Clone, Debug, Default, Eq, Hash, PartialEq)]
pub struct PluginGroup {
    /// Index of the plugin
    pub plugin_idx: PluginIdx,
    /// Group assigned by the plugin
    pub group: Vec<u8>,
}

impl PluginNameMap {
    /// Create a new [`PluginNameMap`] with the mapping given as iterator
    pub fn new(mapping: impl IntoIterator<Item = (PluginIdx, String)>) -> Self {
        PluginNameMap {
            plugins_name: mapping.into_iter().collect(),
        }
    }

    /// Name of the plugin with the given index, or None if none found
    pub fn name_by_idx(&self, idx: PluginIdx) -> Option<&str> {
        self.plugins_name
            .get_by_left(&idx)
            .map(|name| name.as_str())
    }

    /// Index of the plugin with the given name, or None if none found
    pub fn idx_by_name(&self, name: &str) -> Option<PluginIdx> {
        self.plugins_name.get_by_right(name).copied()
    }

    /// Whether there's any plugins in the map
    pub fn is_empty(&self) -> bool {
        self.plugins_name.is_empty()
    }
}
