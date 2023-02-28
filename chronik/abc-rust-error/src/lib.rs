// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Crate for simple error handling.
//!
//! Errors are boxed along with backtrace info, allowing them to bubble up and
//! eventually be reported to admins or users.
//!
//! Errors should be defined using `thiserror`.
//!
//! Re-exports [`eyre`] error members, such that error backends can be
//! swapped-out easily.

abc_rust_lint::lint! {
    mod http_status;

    pub use {eyre::{bail, Report, Result, WrapErr}, crate::http_status::*};

    /// Install a backtrace handler. Captures a detailed backtrace for
    /// [`Report`]s.
    pub fn install() {
        // Ignore when we already have stable_eyre installed.
        // Multiple installs occur frequently during testing.
        let _ = stable_eyre::install();
    }
}
