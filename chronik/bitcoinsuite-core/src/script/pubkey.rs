// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::str::FromStr;

use hex_literal::hex;

use crate::error::DataError;

/// Public key (compressed).
///
/// ```
/// # use bitcoinsuite_core::script::PubKey;
/// assert_eq!(PubKey::SIZE, 33);
/// let pubkey = PubKey([2; 33]);
/// assert_eq!(pubkey.as_slice(), &[2; 33]);
/// assert_eq!(
///     pubkey.hex(),
///     "020202020202020202020202020202020202020202020202020202020202020202",
/// );
///
/// let default_pubkey = PubKey::default();
/// assert_eq!(
///     default_pubkey.hex(),
///     "020000000000000000000000000000000000000000000000000000000000000001",
/// );
/// ```
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct PubKey(pub [u8; PubKey::SIZE]);

impl PubKey {
    /// Number of bytes in a [`PubKey`], the length for a compressed pubkey.
    pub const SIZE: usize = 33;

    /// Bytes of the pubkey as slice.
    /// ```
    /// # use bitcoinsuite_core::script::PubKey;
    /// let pubkey = PubKey([2; 33]);
    /// assert_eq!(pubkey.as_slice(), &[2; 33]);
    /// ```
    pub fn as_slice(&self) -> &[u8] {
        &self.0
    }

    /// Bytes of the pubkey as array.
    /// ```
    /// # use bitcoinsuite_core::script::PubKey;
    /// let pubkey = PubKey([2; 33]);
    /// assert_eq!(pubkey.as_slice(), [2; 33]);
    /// ```
    pub fn array(&self) -> [u8; Self::SIZE] {
        self.0
    }

    /// Hex representation of the bytes of the pubkey.
    /// ```
    /// # use bitcoinsuite_core::script::PubKey;
    /// let pubkey = PubKey([2; 33]);
    /// assert_eq!(
    ///     pubkey.hex(),
    ///     "020202020202020202020202020202020202020202020202020202020202020202"
    /// );
    /// ```
    pub fn hex(&self) -> String {
        hex::encode(self.0)
    }
}

impl Default for PubKey {
    fn default() -> Self {
        PubKey(hex!(
            "020000000000000000000000000000000000000000000000000000000000000001"
        ))
    }
}

impl FromStr for PubKey {
    type Err = DataError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let pubkey = hex::decode(s).map_err(DataError::InvalidHex)?;
        Ok(PubKey(pubkey.as_slice().try_into().map_err(|_| {
            DataError::InvalidLength {
                expected: PubKey::SIZE,
                actual: pubkey.len(),
            }
        })?))
    }
}

impl AsRef<[u8]> for PubKey {
    fn as_ref(&self) -> &[u8] {
        self.as_slice()
    }
}

impl std::fmt::Debug for PubKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "PubKey({})", self.hex())
    }
}
