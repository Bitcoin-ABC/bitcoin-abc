// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::{hash::ShaRmd160, script};
use chronik_plugin_impl::{
    module::{add_test_framework_to_pythonpath, load_plugin_module},
    script::Script,
};
use pyo3::{
    types::{PyAnyMethods, PyModule},
    Python,
};

#[test]
fn test_py_script() -> Result<()> {
    load_plugin_module();
    pyo3::prepare_freethreaded_python();
    Python::with_gil(|py| -> Result<_> {
        add_test_framework_to_pythonpath(py)?;

        let test_module = PyModule::from_code_bound(
            py,
            include_str!("test_script_to_py.py"),
            "test_script_to_py.py",
            "test_script_to_py",
        )?;

        // P2SH example
        let script = script::Script::p2sh(&ShaRmd160([5; 20]));
        test_module
            .getattr("test_script")?
            .call1((Script::new(script),))?;

        // Script doesn't parse
        let script = script::Script::new(b"\x01".as_ref().into());
        test_module
            .getattr("test_bad_script")?
            .call1((Script::new(script),))?;

        Ok(())
    })
}
