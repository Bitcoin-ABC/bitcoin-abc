// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Plugin`].

use abc_rust_error::Result;
use bitcoinsuite_slp::lokad_id::LokadId;
use chronik_plugin_common::plugin::Plugin;
use convert_case::{Case, Casing};
use pyo3::{
    types::{PyDict, PyModule},
    PyAny, Python,
};
use thiserror::Error;
use versions::SemVer;

use crate::plugin::PluginError::*;

/// Errors for PluginContext.
#[derive(Debug, Eq, Error, PartialEq)]
pub(crate) enum PluginError {
    /// Failed importing plugin module
    #[error("Failed importing plugin module: {0}")]
    FailedImportingModule(String),

    /// Failed importing plugin module
    #[error(
        "Could not find class {0:?} in the plugin module. Make sure it is \
         spelled correctly."
    )]
    ClassNotFound(String),

    /// Class must derive from Plugin
    #[error("Class {0:?} must derive from chronik_plugin.plugin.Plugin")]
    ClassMustDerivePlugin(String),

    /// Invalid LOKAD ID, must be bytes
    #[error("Invalid lokad_id, must be bytes: {0}")]
    InvalidLokadIdType(String),

    /// LOKAD ID must be 4 bytes long
    #[error("Invalid lokad_id length, expected 4 bytes, but got {0} bytes")]
    InvalidLokadIdLen(usize),

    /// Invalid version, must be str
    #[error("Invalid version, must be str: {0}")]
    InvalidVersionType(String),

    /// Invalid version, must follow semver https://semver.org/
    #[error(
        "Invalid version {0:?}, must follow semantic versioning (see \
         https://semver.org/)"
    )]
    InvalidVersion(String),
}

pub(crate) fn load_plugin<'py>(
    py: Python<'py>,
    module_name: String,
    class_name: Option<String>,
    plugin_cls: &'py PyAny,
) -> Result<Plugin> {
    let module = PyModule::import(py, module_name.as_str())
        .map_err(|err| FailedImportingModule(err.to_string()))?;

    // Class name is either NamePascalCasePlugin, or manually specified
    let class_name = match class_name {
        Some(class_name) => class_name,
        None => format!("{}Plugin", module_name.to_case(Case::Pascal)),
    };

    let class = module
        .getattr(class_name.as_str())
        .map_err(|_| ClassNotFound(class_name.clone()))?;

    // Empty config object for now
    let config = PyDict::new(py);
    let plugin_instance = class.call1((config,))?;

    // Must be a Plugin instance
    if !plugin_instance.is_instance(plugin_cls)? {
        return Err(ClassMustDerivePlugin(class_name.clone()).into());
    }

    let lokad_id = plugin_instance
        .getattr("lokad_id")?
        .call0()?
        .extract::<&[u8]>()
        .map_err(|err| InvalidLokadIdType(err.to_string()))?;
    let lokad_id: LokadId = lokad_id
        .try_into()
        .map_err(|_| InvalidLokadIdLen(lokad_id.len()))?;
    let version = plugin_instance
        .getattr("version")?
        .call0()?
        .extract::<&str>()
        .map_err(|err| InvalidVersionType(err.to_string()))?;
    let version = SemVer::new(version)
        .ok_or_else(|| InvalidVersion(version.to_string()))?;

    Ok(Plugin {
        module_name,
        class_name,
        version,
        lokad_ids: vec![lokad_id],
    })
}
