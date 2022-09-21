// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing the cxx definitions for the bridge from C++ to Rust.

pub use self::ffi_inner::*;

#[allow(unsafe_code)]
#[cxx::bridge(namespace = "chronik_bridge")]
mod ffi_inner {
    unsafe extern "C++" {
        include!("chronik-cpp/chronik_bridge.h");

        /// Print the message to bitcoind's logs.
        fn log_print(
            logging_function: &str,
            source_file: &str,
            source_line: u32,
            msg: &str,
        );

        /// Print the message to bitcoind's logs under the BCLog::Chronik
        /// category.
        fn log_print_chronik(
            logging_function: &str,
            source_file: &str,
            source_line: u32,
            msg: &str,
        );
    }
}
