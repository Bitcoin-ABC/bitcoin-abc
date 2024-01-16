// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use pyo3::{types::PyBytes, Py, Python};

pub(crate) fn to_bytes(py: Python<'_>, bytes: &[u8]) -> Py<PyBytes> {
    PyBytes::new(py, bytes).into()
}
