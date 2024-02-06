// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`PluginContext`].

use abc_rust_error::Result;
use chronik_util::log;
use pyo3::{types::PyModule, Python};

/// Struct managing all things relating to Chronik plugins.
#[derive(Debug, Default)]
pub struct PluginContext;

impl PluginContext {
    /// Setup a plugin context, i.e. setting up an embedded Python instance and
    /// loading plugins.
    pub fn setup() -> Result<Self> {
        pyo3::prepare_freethreaded_python();
        Python::with_gil(|py| -> Result<_> {
            let module = PyModule::from_code(
                py,
                "
import platform
version = platform.python_version()
                ",
                "get_version.py",
                "get_version",
            )?;
            let version = module.getattr("version")?;
            let version = version.extract::<String>()?;
            log!("Plugin context initialized Python {}\n", version);
            Ok(PluginContext)
        })
    }
}
