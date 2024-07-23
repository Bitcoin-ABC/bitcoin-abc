// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for Python module related things

use pyo3::{prelude::*, py_run, types::PyList};

use crate::script::{Op, Script};

/// Python module for Chronik plugins
#[pymodule]
pub fn chronik_plugin(
    py: Python<'_>,
    module: Bound<'_, PyModule>,
) -> PyResult<()> {
    let script_module = PyModule::new_bound(py, "script")?;
    script_module.add_class::<Op>()?;
    script_module.add_class::<Script>()?;
    module.add_submodule(&script_module)?;
    // Need to register submodule manually, see PyO3#759
    py_run!(
        py,
        script_module,
        "import sys; sys.modules['chronik_plugin.script'] = script_module"
    );
    PyModule::from_code_bound(
        py,
        include_str!("plugin.py"),
        "plugin.py",
        "chronik_plugin.plugin",
    )?;
    PyModule::from_code_bound(
        py,
        include_str!("token.py"),
        "token.py",
        "chronik_plugin.token",
    )?;
    PyModule::from_code_bound(
        py,
        include_str!("tx.py"),
        "tx.py",
        "chronik_plugin.tx",
    )?;
    Ok(())
}

/// Load the `chronik_plugin` Python module
pub fn load_plugin_module() {
    pyo3::append_to_inittab!(chronik_plugin);
}

/// Add functional test folder to PYTHONPATH so we can use its utils
pub fn add_test_framework_to_pythonpath(py: Python<'_>) -> PyResult<()> {
    let sys = PyModule::import_bound(py, "sys")?;
    let path = sys.getattr("path")?;
    let sys_path = path.downcast::<PyList>()?;
    let functional_path =
        concat!(env!("CARGO_MANIFEST_DIR"), "/../../test/functional");

    if !sys_path.contains(functional_path)? {
        sys_path.append(functional_path)?;
    }

    Ok(())
}
