// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use chronik_bridge::ffi::abort_node;
use chronik_util::log_chronik;

/// If `result` is [`Err`], logs and aborts the node.
pub(crate) fn ok_or_abort_node<T>(func_name: &str, result: Result<T>) {
    if let Err(report) = result {
        log_chronik!("{report:?}\n");
        abort_node(
            &format!("ERROR Chronik in {func_name}"),
            &format!("{report:#}"),
        );
    }
}
