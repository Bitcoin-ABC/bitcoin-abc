// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Lints for Bitcoin ABC Rust code.

/// Adds common lints to the items in this macro.
///
/// Intended to be used in the lib.rs of a crate, where all the modules and
/// other items are defined.
///
/// Usage:
/// ```
/// abc_rust_lint::lint! {
///     /// docs for `a`.
///     pub mod a {}
/// }
/// ```
#[macro_export]
macro_rules! lint {
    ($($lint_item:item)*) => {
        $(
            #[deny(unsafe_code)]
            #[warn(
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
            $lint_item
        )*
    };
}
