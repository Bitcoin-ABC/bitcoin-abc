// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Macros for logging messages to bitcoind

use std::sync::OnceLock;

/// Struct containing loggers to be mounted for use for [`log`] and
/// [`log_chronik`].
#[derive(Debug)]
pub struct Loggers {
    /// Logging function to log to bitcoind's logging system.
    pub log: fn(&str, &str, u32, &str),
    /// Logging function to log to bitcoind's logging system under the
    /// BCLog::Chronik category.
    pub log_chronik: fn(&str, &str, u32, &str),
}

/// It may seem like wrapping the loggers behind a lock would slow down logging
/// a lot, but reading values from OnceLock is fast since it's only an AtomicPtr
/// that's being acquired, which is quite fast.
static MOUNTED_LOGGER: OnceLock<Loggers> = OnceLock::new();

/// Internal function (but exposed for macros) which prints to the node's logger
/// if mounted and uses println! otherwise.
pub fn log_node(
    logging_function: &str,
    source_file: &str,
    source_line: u32,
    msg: &str,
) {
    match MOUNTED_LOGGER.get() {
        Some(Loggers { log, .. }) => {
            log(logging_function, source_file, source_line, msg)
        }
        None => println!("{}", msg),
    }
}

/// Internal function (but exposed for macros) which prints to the node's logger
/// as BCLog::Chronik if mounted and uses println! otherwise.
pub fn log_chronik_node(
    logging_function: &str,
    source_file: &str,
    source_line: u32,
    msg: &str,
) {
    match MOUNTED_LOGGER.get() {
        Some(Loggers { log_chronik, .. }) => {
            log_chronik(logging_function, source_file, source_line, msg)
        }
        None => println!("{}", msg),
    }
}

/// Install the node's logger so calls to [`log`] and [`log_chronik`] will log
/// there.
pub fn mount_loggers(loggers: Loggers) {
    let _ = MOUNTED_LOGGER.set(loggers);
}

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
        chronik_util::log_node(
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
        chronik_util::log_chronik_node(
            "<chronik unknown>",
            file!(),
            line!(),
            &format!($($arg)*),
        );
        #[cfg(test)]
        println!($($arg)*);
    };
}
