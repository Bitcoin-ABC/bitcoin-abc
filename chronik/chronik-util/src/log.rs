// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Macros for logging messages to bitcoind

pub use chronik_bridge::ffi::{log_print, log_print_chronik};

/// Logs the message to bitcoind's logging system:
///
/// ```ignore
/// let world = "world";
/// log!("Hello {}!\n", world);
/// ```
#[macro_export]
macro_rules! log {
    ($($arg:tt)*) => {
        #[cfg(not(test))]
        chronik_util::log_print(
            "<chronik unknown>",
            file!(),
            line!(),
            &format!($($arg)*),
        );
        #[cfg(test)]
        println!($($arg)*);
    };
}

/// Logs the message to bitcoind's logging system under the BCLog::Chronik
/// category:
///
/// ```ignore
/// let world = "world";
/// log_chronik!("Hello {}!\n", world);
/// ```
#[macro_export]
macro_rules! log_chronik {
    ($($arg:tt)*) => {
        #[cfg(not(test))]
        chronik_util::log_print_chronik(
            "<chronik unknown>",
            file!(),
            line!(),
            &format!($($arg)*),
        );
        #[cfg(test)]
        println!($($arg)*);
    };
}
