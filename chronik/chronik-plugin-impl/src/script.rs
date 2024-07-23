// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Script`] and [`Op`] for plugins.

#![allow(unsafe_code)]

use bitcoinsuite_core::script;
use pyo3::{exceptions::PyValueError, prelude::*, types::PyBytes};

/// Class for a Bitcoin Script
#[pyclass(frozen)]
#[derive(Debug, Eq, PartialEq)]
pub struct Script {
    script: script::Script,
}

/// Class for a Script op
#[pyclass(frozen)]
#[derive(Debug)]
pub struct Op {
    /// The integer value of the opcode of this op
    #[pyo3(get)]
    pub opcode: u8,

    /// The pushdata attached to the op or None if it’s not a pushop
    #[pyo3(get)]
    pub pushdata: Option<Py<PyBytes>>,
}

impl Script {
    /// Create a new [`Script`] from a [`script::Script`].
    pub fn new(script: script::Script) -> Self {
        Script { script }
    }
}

#[pymethods]
impl Script {
    /// Create a new [`Script`] from a `bytes` object.
    #[new]
    pub fn __init__(bytes: Bound<'_, PyBytes>) -> Self {
        Script::new(script::Script::new(bytes.as_bytes().to_vec().into()))
    }

    /// Check whether the two [`Script`] instances are equal.
    pub fn __eq__(&self, other: &Script) -> bool {
        self == other
    }

    /// Return a str representation of this [`Script`].
    /// Uses the `b"..."` representation of the Rust `bytes` crate.
    pub fn __repr__(&self) -> String {
        format!("Script({:?})", self.script.bytecode())
    }

    /// The serialized bytecode of the Script
    pub fn bytecode<'py>(&self, py: Python<'py>) -> Bound<'py, PyBytes> {
        PyBytes::new_bound(py, self.script.bytecode())
    }

    /// List of the operations in this script.
    pub fn ops(&self, py: Python<'_>) -> PyResult<Vec<Op>> {
        self.script
            .iter_ops()
            .map(|op| -> PyResult<_> {
                let op = op.map_err(|err| {
                    PyErr::new::<PyValueError, _>(err.to_string())
                })?;
                Ok(Op {
                    opcode: op.opcode().number(),
                    pushdata: match op {
                        script::Op::Code(_) => None,
                        script::Op::Push(_, bytes) => {
                            Some(PyBytes::new_bound(py, &bytes).into())
                        }
                    },
                })
            })
            .collect::<PyResult<Vec<_>>>()
    }
}
