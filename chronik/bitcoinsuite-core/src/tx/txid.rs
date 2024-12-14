// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::str::FromStr;

use serde::{Deserialize, Serialize};

use crate::{
    bytes::read_array,
    error::DataError,
    hash::{Hashed, Sha256d},
    ser::{BitcoinSer, BitcoinSerializer},
    tx::TxMut,
};

/// Wraps a tx ID's [`Sha256d`], to avoid mixing different kinds of hashes.
/// Txids are always represented with a big-endian hex string, but stored
/// in little-endian byteorder.
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
pub struct TxId(Sha256d);

impl std::fmt::Debug for TxId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "TxId({})", self.0.hex_be())
    }
}

impl std::fmt::Display for TxId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.0.hex_be().fmt(f)
    }
}

impl TxId {
    /// Create a [`TxId`] with the given txid in little endian.
    /// Can be used in a const context.
    /// ```
    /// # use bitcoinsuite_core::tx::TxId;
    /// const txid: TxId = TxId::new([5; 32]);
    /// ```
    pub const fn new(txid: [u8; 32]) -> Self {
        TxId(Sha256d(txid))
    }

    /// Return the [`TxId`] for the given [`TxMut`] (or `Tx`).
    ///
    /// This is done by hashing the serialized tx using [`Sha256d`].
    ///
    /// ```
    /// # use bitcoinsuite_core::tx::{Tx, TxId, TxMut};
    /// let zero_tx_hash =
    ///     "f702453dd03b0f055e5437d76128141803984fb10acb85fc3b2184fae2f3fa78"
    ///         .parse::<TxId>()
    ///         .unwrap();
    /// assert_eq!(TxId::from_tx(&TxMut::default()), zero_tx_hash);
    /// assert_eq!(TxId::from_tx(&Tx::default()), zero_tx_hash);
    /// ```
    pub fn from_tx(tx: &TxMut) -> Self {
        TxId(Sha256d::digest(tx.ser()))
    }

    /// Returns the txid bytes in little-endian byte order.
    ///
    /// ```
    /// # use bitcoinsuite_core::{tx::TxId, hash::{Sha256d, Hashed}};
    /// # use hex_literal::hex;
    /// let hash = hex!(
    ///     "3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a"
    /// );
    /// let txid = TxId::from(Sha256d(hash));
    /// assert_eq!(txid.to_bytes(), hash);
    /// ```
    pub fn to_bytes(&self) -> [u8; 32] {
        self.0.to_le_bytes()
    }

    /// Returns a reference to the txid bytes in little-endian byte order.
    ///
    /// ```
    /// # use bitcoinsuite_core::{tx::TxId, hash::{Sha256d, Hashed}};
    /// # use hex_literal::hex;
    /// let hash = hex!(
    ///     "3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a"
    /// );
    /// let txid = TxId::from(Sha256d(hash));
    /// assert_eq!(txid.as_bytes(), &hash);
    /// ```
    pub fn as_bytes(&self) -> &[u8; 32] {
        self.0.as_le_bytes()
    }

    /// Returns the txid as [`Vec<u8>`] in little-endian byte order.
    ///
    /// ```
    /// # use bitcoinsuite_core::{tx::TxId, hash::{Sha256d, Hashed}};
    /// # use hex_literal::hex;
    /// let hash = hex!(
    ///     "3ba3edfd7a7b12b27ac72c3e67768f617fc81bc3888a51323a9fb8aa4b1e5e4a"
    /// );
    /// let txid = TxId::from(Sha256d(hash));
    /// assert_eq!(txid.to_vec(), hash.to_vec());
    /// ```
    pub fn to_vec(&self) -> Vec<u8> {
        self.to_bytes().to_vec()
    }

    /// Return the hash behind the [`TxId`].
    pub fn hash(&self) -> Sha256d {
        self.0
    }
}

impl std::str::FromStr for TxId {
    type Err = DataError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(TxId(Sha256d::from_be_hex(s)?))
    }
}

impl TryFrom<&'_ [u8]> for TxId {
    type Error = DataError;

    fn try_from(value: &'_ [u8]) -> Result<Self, Self::Error> {
        Ok(TxId(Sha256d::from_le_slice(value)?))
    }
}

impl TryFrom<&'_ serde_json::Value> for TxId {
    type Error = &'static str;

    fn try_from(value: &'_ serde_json::Value) -> Result<Self, Self::Error> {
        match value.as_str() {
            Some(txid_hex) => TxId::from_str(txid_hex)
                .or(Err("Cannot parse TxId from hex string")),
            None => Err("TxId must be a hexadecimal string"),
        }
    }
}

impl From<[u8; 32]> for TxId {
    fn from(array: [u8; 32]) -> Self {
        TxId(Sha256d(array))
    }
}

impl From<Sha256d> for TxId {
    fn from(hash: Sha256d) -> Self {
        TxId(hash)
    }
}

impl AsRef<[u8]> for TxId {
    fn as_ref(&self) -> &[u8] {
        self.0.as_ref()
    }
}

impl BitcoinSer for TxId {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        bytes.put(self.as_bytes())
    }

    fn deser(data: &mut bytes::Bytes) -> Result<Self, DataError> {
        Ok(TxId(Sha256d(read_array(data)?)))
    }
}

#[cfg(test)]
mod tests {
    use hex_literal::hex;

    use crate::{
        error::DataError,
        hash::{Hashed, Sha256d},
        tx::TxId,
    };

    const HASH_HEX: &str =
        "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b";

    fn txid_hash() -> Sha256d {
        let txid_hash = hex!(
            "4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b"
        );
        Sha256d::from_be_bytes(txid_hash)
    }

    #[test]
    fn test_parse() -> Result<(), DataError> {
        let txid = HASH_HEX.parse::<TxId>()?;
        assert_eq!(txid, TxId::from(txid_hash()));
        Ok(())
    }

    #[test]
    fn test_parse_fail() {
        assert_eq!(
            "abcd".parse::<TxId>(),
            Err(DataError::InvalidLength {
                expected: 32,
                actual: 2,
            }),
        );
    }

    #[test]
    fn test_try_from_slice() {
        let hash = txid_hash();
        let slice = hash.as_le_bytes().as_ref();
        let txid: TxId = slice.try_into().unwrap();
        assert_eq!(txid, TxId::from(hash));
        assert_eq!(
            TxId::try_from(b"ab".as_ref()),
            Err(DataError::InvalidLength {
                expected: 32,
                actual: 2,
            }),
        );
    }

    #[test]
    fn test_debug() {
        assert_eq!(
            format!("{:?}", TxId::from(txid_hash())),
            format!("TxId({})", HASH_HEX),
        );
    }

    #[test]
    fn test_display() -> Result<(), DataError> {
        assert_eq!(TxId::from(txid_hash()).to_string(), HASH_HEX);
        Ok(())
    }
}
