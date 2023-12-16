// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for errors in this crate.

use thiserror::Error;

/// Errors indicating some data doesn't map to some object.
#[derive(Clone, Debug, Error, PartialEq)]
pub enum DataError {
    /// Expect a fixed length which was not met.
    #[error(
        "Invalid length, expected {expected} bytes but got {actual} bytes"
    )]
    InvalidLength {
        /// Expected number of bytes.
        expected: usize,
        /// Actual number of bytes.
        actual: usize,
    },

    /// Expected bytes with multiple allowed lengths, none of which were met.
    #[error(
        "Invalid length, expected one of {expected:?} but got {actual} bytes"
    )]
    InvalidLengthMulti {
        /// List of expected number of bytes.
        expected: Vec<usize>,
        /// Actual number of bytes.
        actual: usize,
    },

    /// Hex contains invalid characters, odd length, etc.
    #[error("Invalid hex: {0}")]
    InvalidHex(hex::FromHexError),
}

impl Eq for DataError {}
