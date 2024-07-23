// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`PluginContext`].

use abc_rust_error::Result;
use chronik_plugin_common::{params::PluginParams, plugin::Plugin};

/// Dummy plugin context that does nothing, used when the plugin system is
/// disabled
#[derive(Debug, Default)]
pub struct PluginContext {
    /// Simulate loaded plugins
    pub plugins: Vec<Plugin>,
}

impl PluginContext {
    /// Fallback for the real PluginContext::setup that does nothing
    pub fn setup(_params: PluginParams) -> Result<Self> {
        Ok(PluginContext::default())
    }

    /// Fallback for the real PluginContext::plugins
    pub fn plugins(&self) -> &[Plugin] {
        &self.plugins
    }
}
