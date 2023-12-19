// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`TokenId`].

use bitcoinsuite_core::{
    error::DataError,
    hash::{Hashed, Sha256d},
    tx::TxId,
};
use serde::{Deserialize, Serialize};

/// Token ID uniquely identifying a token.
/// It is the txid of the GENESIS tx of the token.
/// Internally, we represent it using [`TxId`].
///
/// Important note:
/// - On SLP, token IDs are stored in big-endian, i.e. the byte order used to
///   display txids on explorers.
/// - On ALP, token IDs are stored in little-endian, i.e. the byte order used by
///   Bitcoin throughout.
#[derive(
    Clone,
    Copy,
    Default,
    Deserialize,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
    Serialize,
)]
pub struct TokenId(TxId);

impl std::fmt::Debug for TokenId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "TokenId({})", self.0)
    }
}

impl std::fmt::Display for TokenId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.fmt(f)
    }
}

impl TokenId {
    /// Create a token ID from the [`TxId`].
    pub const fn new(txid: TxId) -> Self {
        TokenId(txid)
    }

    /// Underlying txid of the token.
    pub fn txid(&self) -> &TxId {
        &self.0
    }

    /// Create an SLP token ID from a big-endian bytestring
    pub fn from_be_bytes(bytes: [u8; 32]) -> Self {
        TokenId(TxId::from(Sha256d::from_be_bytes(bytes)))
    }

    /// Return an SLP token ID big-endian bytestring
    pub fn to_be_bytes(&self) -> [u8; 32] {
        self.0.hash().to_be_bytes()
    }
}

impl std::str::FromStr for TokenId {
    type Err = DataError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(TokenId(s.parse()?))
    }
}

impl From<TxId> for TokenId {
    fn from(txid: TxId) -> Self {
        TokenId(txid)
    }
}
