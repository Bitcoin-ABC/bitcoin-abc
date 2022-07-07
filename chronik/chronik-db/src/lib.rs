// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#![deny(unsafe_code)]
#![warn(
    const_err,
    explicit_outlives_requirements,
    improper_ctypes,
    keyword_idents,
    missing_debug_implementations,
    missing_docs,
    no_mangle_generic_items,
    non_ascii_idents,
    non_shorthand_field_patterns,
    noop_method_call,
    overflowing_literals,
    path_statements,
    patterns_in_fns_without_body,
    private_in_public,
    rust_2018_idioms,
    unconditional_recursion,
    unreachable_pub,
    unused_comparisons,
    unused,
    while_true
)]

//! Stores and retrieves data for Chronik in a database.

pub mod db;
pub mod io;
