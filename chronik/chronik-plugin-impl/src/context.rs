// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`PluginContext`].

use std::{
    collections::{btree_map::Entry, BTreeMap},
    fs::File,
    io::Read,
};

use abc_rust_error::Result;
use bitcoinsuite_core::net::Net;
use bytes::Bytes;
use chronik_plugin_common::{params::PluginParams, plugin::Plugin};
use chronik_util::log;
use pyo3::{
    types::{PyList, PyModule},
    Python,
};
use serde::Deserialize;
use thiserror::Error;

use crate::{
    context::PluginContextError::*, module::load_plugin_module,
    plugin::load_plugin,
};

/// Struct managing all things relating to Chronik plugins.
#[derive(Debug, Default)]
pub struct PluginContext {
    plugins: Vec<Plugin>,
}

#[derive(Debug, Deserialize)]
struct PluginsConf {
    plugin: Option<BTreeMap<String, PluginSpec>>,
    main: Option<PluginsNetConf>,
    test: Option<PluginsNetConf>,
    regtest: Option<PluginsNetConf>,
}

#[derive(Debug, Default, Deserialize)]
struct PluginsNetConf {
    plugin: BTreeMap<String, PluginSpec>,
}

#[derive(Debug, Deserialize)]
struct PluginSpec {
    class: Option<String>,
}

/// Errors for [`PluginContext`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum PluginContextError {
    /// Duplicate plugin
    #[error(
        "Duplicate plugin {0}, use either [main.plugin] or [plugin] but not \
         both"
    )]
    DuplicatePlugin(String),
}

impl PluginContext {
    /// Setup a plugin context, i.e. setting up an embedded Python instance and
    /// loading plugins.
    pub fn setup(params: PluginParams) -> Result<Self> {
        if !params.plugins_conf.exists() {
            log!(
                "Skipping initializing plugins: {} doesn't exist\n",
                params.plugins_conf.to_string_lossy(),
            );
            return Ok(PluginContext::default());
        }
        let mut plugins_conf_file = File::open(&params.plugins_conf)?;
        let mut plugins_conf = String::new();
        plugins_conf_file.read_to_string(&mut plugins_conf)?;
        let plugins_conf = toml::from_str::<PluginsConf>(&plugins_conf)?;

        // Treat plugins in [plugin] section and [main.plugin] the same
        let mut main_conf = plugins_conf.main.unwrap_or_default();
        for (plugin_name, plugin) in plugins_conf.plugin.unwrap_or_default() {
            match main_conf.plugin.entry(plugin_name.clone()) {
                Entry::Vacant(vacant) => {
                    vacant.insert(plugin);
                }
                Entry::Occupied(_) => {
                    return Err(DuplicatePlugin(plugin_name).into());
                }
            }
        }

        let net_plugins = match params.net {
            Net::Mainnet => main_conf,
            Net::Testnet => plugins_conf.test.unwrap_or_default(),
            Net::Regtest => plugins_conf.regtest.unwrap_or_default(),
        };

        load_plugin_module();
        pyo3::prepare_freethreaded_python();
        Python::with_gil(|py| -> Result<_> {
            // Extract the Python version
            let version = PyModule::import(py, "platform")?
                .getattr("python_version")?
                .call0()?
                .extract::<String>()?;
            log!("Plugin context initialized Python {}\n", version);

            // Add <datadir>/plugins to sys.path
            PyModule::import(py, "sys")?
                .getattr("path")?
                .downcast::<PyList>()
                .unwrap()
                .append(params.plugins_dir)?;

            // Load the chronik Plugin class
            let plugin_module =
                match PyModule::import(py, "chronik_plugin.plugin") {
                    Ok(plugin_module) => plugin_module,
                    Err(err) => {
                        err.print(py);
                        return Err(err.into());
                    }
                };
            let plugin_cls = plugin_module.getattr("Plugin")?;

            let mut plugins = Vec::with_capacity(net_plugins.plugin.len());
            for (module_name, plugin_spec) in net_plugins.plugin {
                let plugin = match load_plugin(
                    py,
                    module_name.clone(),
                    plugin_spec.class,
                    plugin_cls,
                ) {
                    Ok(plugin) => plugin,
                    Err(err) => {
                        log!("Failed loading plugin {module_name}\n");
                        return Err(err);
                    }
                };
                let lokad_ids = plugin
                    .lokad_ids
                    .iter()
                    .map(|lokad_id| Bytes::copy_from_slice(lokad_id))
                    .collect::<Vec<_>>();
                log!(
                    "Loaded plugin {}.{} (version {}) with LOKAD IDs {:?}\n",
                    plugin.module_name,
                    plugin.class_name,
                    plugin.version,
                    lokad_ids,
                );
                plugins.push(plugin);
            }
            Ok(PluginContext { plugins })
        })
    }

    /// Plugins loaded in this context
    pub fn plugins(&self) -> &[Plugin] {
        &self.plugins
    }
}
