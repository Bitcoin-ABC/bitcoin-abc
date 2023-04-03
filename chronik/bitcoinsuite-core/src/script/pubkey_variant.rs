// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::str::FromStr;

use crate::{
    error::DataError,
    script::{PubKey, UncompressedPubKey},
};

/// Either a compressed [`PubKey`] or a [`UncompressedPubKey`], determined by
/// the number of bytes:
/// ```
/// # use bitcoinsuite_core::{
/// #     error::DataError,
/// #     script::{PubKey, PubKeyVariant, UncompressedPubKey},
/// # };
/// assert_eq!(
///     PubKeyVariant::try_from([2; 33].as_ref()),
///     Ok(PubKeyVariant::Compressed(PubKey([2; 33]))),
/// );
/// assert_eq!(
///     PubKeyVariant::try_from([4; 65].as_ref()),
///     Ok(PubKeyVariant::Uncompressed(UncompressedPubKey([4; 65]))),
/// );
/// assert_eq!(
///     PubKeyVariant::try_from([4; 66].as_ref()),
///     Err(DataError::InvalidLengthMulti {
///         expected: vec![33, 65],
///         actual: 66,
///     }),
/// );
/// ```
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub enum PubKeyVariant {
    /// Compressed public key.
    Compressed(PubKey),
    /// Uncompressed public key.
    Uncompressed(UncompressedPubKey),
}

impl TryFrom<&'_ [u8]> for PubKeyVariant {
    type Error = DataError;

    fn try_from(value: &'_ [u8]) -> Result<Self, Self::Error> {
        if let Ok(array) = <[u8; PubKey::SIZE]>::try_from(value) {
            return Ok(PubKeyVariant::Compressed(PubKey(array)));
        }
        if let Ok(array) = <[u8; UncompressedPubKey::SIZE]>::try_from(value) {
            return Ok(PubKeyVariant::Uncompressed(UncompressedPubKey(array)));
        }
        Err(DataError::InvalidLengthMulti {
            expected: vec![PubKey::SIZE, UncompressedPubKey::SIZE],
            actual: value.len(),
        })
    }
}

impl FromStr for PubKeyVariant {
    type Err = DataError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let pubkey = hex::decode(s).map_err(DataError::InvalidHex)?;
        pubkey.as_slice().try_into()
    }
}
