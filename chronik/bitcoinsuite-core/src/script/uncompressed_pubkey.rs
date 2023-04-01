// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::str::FromStr;

use hex_literal::hex;

use crate::error::DataError;

/// Uncompressed public key.
///
/// ```
/// # use bitcoinsuite_core::script::UncompressedPubKey;
/// assert_eq!(UncompressedPubKey::SIZE, 65);
/// let uncompressed_pubkey = UncompressedPubKey([4; 65]);
/// assert_eq!(uncompressed_pubkey.as_slice(), &[4; 65]);
/// assert_eq!(
///     uncompressed_pubkey.hex(),
///     "040404040404040404040404040404040404040404040404040404040404040404\
///      0404040404040404040404040404040404040404040404040404040404040404",
/// );
///
/// let default_uncompressed_pubkey = UncompressedPubKey::default();
/// assert_eq!(
///     default_uncompressed_pubkey.hex(),
///     "040000000000000000000000000000000000000000000000000000000000000000\
///      0000000000000000000000000000000000000000000000000000000000000001",
/// );
/// ```
#[derive(Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct UncompressedPubKey(pub [u8; UncompressedPubKey::SIZE]);

impl UncompressedPubKey {
    /// Number of bytes in a [`UncompressedPubKey`], the length for an
    /// uncompressed pubkey.
    pub const SIZE: usize = 65;

    /// Bytes of the uncompressed pubkey as slice.
    /// ```
    /// # use bitcoinsuite_core::script::UncompressedPubKey;
    /// let pubkey = UncompressedPubKey([2; 65]);
    /// assert_eq!(pubkey.as_slice(), &[2; 65]);
    /// ```
    pub fn as_slice(&self) -> &[u8] {
        &self.0
    }

    /// Bytes of the uncompressed pubkey as array.
    /// ```
    /// # use bitcoinsuite_core::script::UncompressedPubKey;
    /// let pubkey = UncompressedPubKey([2; 65]);
    /// assert_eq!(pubkey.as_slice(), [2; 65]);
    /// ```
    pub fn array(&self) -> [u8; Self::SIZE] {
        self.0
    }

    /// Hex representation of the bytes of the uncompressed pubkey.
    /// ```
    /// # use bitcoinsuite_core::script::UncompressedPubKey;
    /// let pubkey = UncompressedPubKey([4; 65]);
    /// assert_eq!(
    ///     pubkey.hex(),
    ///     "040404040404040404040404040404040404040404040404040404040404040404\
    ///      0404040404040404040404040404040404040404040404040404040404040404"
    /// );
    /// ```
    pub fn hex(&self) -> String {
        hex::encode(self.0)
    }
}

impl Default for UncompressedPubKey {
    fn default() -> Self {
        UncompressedPubKey(hex!(
            "040000000000000000000000000000000000000000000000000000000000000000"
            "0000000000000000000000000000000000000000000000000000000000000001"
        ))
    }
}

impl FromStr for UncompressedPubKey {
    type Err = DataError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let pubkey = hex::decode(s).map_err(DataError::InvalidHex)?;
        Ok(UncompressedPubKey(pubkey.as_slice().try_into().map_err(
            |_| DataError::InvalidLength {
                expected: UncompressedPubKey::SIZE,
                actual: pubkey.len(),
            },
        )?))
    }
}

impl AsRef<[u8]> for UncompressedPubKey {
    fn as_ref(&self) -> &[u8] {
        self.as_slice()
    }
}

impl std::fmt::Debug for UncompressedPubKey {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "UncompressedPubKey({})", self.hex())
    }
}
