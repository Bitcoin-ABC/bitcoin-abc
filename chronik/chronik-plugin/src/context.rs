// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`PluginContext`].

use std::{collections::BTreeMap, marker::PhantomData};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, Tx};
use bitcoinsuite_slp::{
    lokad_id::LokadId, token_tx::TokenTx, verify::SpentToken,
};
use chronik_plugin_common::{
    data::{PluginNameMap, PluginOutput, PluginTxOutputs},
    params::PluginParams,
    plugin::Plugin,
};

/// Dummy plugin context that does nothing, used when the plugin system is
/// disabled
#[derive(Debug, Default)]
pub struct PluginContext {
    /// Simulate loaded plugins
    pub plugins: Vec<Plugin>,
}

/// Dummy Python handle
#[derive(Clone, Copy, Debug)]
pub struct Python<'py>(PhantomData<&'py ()>);

impl PluginContext {
    /// Fallback for the real PluginContext::setup that does nothing
    pub fn setup(_params: PluginParams) -> Result<Self> {
        Ok(PluginContext::default())
    }

    /// Run the tx by all the plugins and return their results.
    pub fn run_on_tx(
        &self,
        _py: Python<'_>,
        _tx: &Tx,
        _token_data: Option<(&TokenTx, &[Option<SpentToken>])>,
        _plugin_outputs: &BTreeMap<OutPoint, PluginOutput>,
        _plugin_name_map: &PluginNameMap,
    ) -> Result<PluginTxOutputs> {
        Ok(Default::default())
    }

    /// Fallback for the real PluginContext::plugins
    pub fn plugins(&self) -> &[Plugin] {
        &self.plugins
    }

    /// Fallback for the real PluginContext::has_plugin_with_lokad_id
    pub fn has_plugin_with_lokad_id(&self, _lokad_id: LokadId) -> bool {
        false
    }

    /// Fallback for acquiring Python that always returns `R::default()`
    pub fn with_py<F, R>(&self, _f: F) -> Result<R>
    where
        F: for<'py> FnOnce(Python<'py>) -> Result<R>,
        R: Default,
    {
        Ok(R::default())
    }
}
