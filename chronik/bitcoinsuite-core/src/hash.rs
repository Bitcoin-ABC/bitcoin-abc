// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing a [`Hashed`] trait to abstract over different hashes, plus
//! implementations for a bunch of hashes.

use std::{cmp::Ordering, fmt::Debug, hash::Hash};

use serde::{Deserialize, Serialize};
use sha2::Digest;

use crate::error::DataError;

/// Trait for structs containing the result of a cryptographic hash function,
/// like SHA-256, RIPEMD-160 etc. With this trait, we can abstractly write code
/// that varies for different hash functions.
///
/// Allows type-safe handling of hashes, so e.g. [`Sha256`] and [`Sha256d`]
/// can't be mixed.
///
/// It is designed to force making endianness explicit as much as possible, as
/// the different protocols used with Bitcoin ABC use varying endianness:
/// - In the Bitcoin protocol:
///    - Byte order is little-endian
///    - Hex representation is big-endian
/// - In the SLP protocol:
///    - Byte order is big-endian
///    - Hex representation is big-endian
///
/// Internally, bytes are required to be represented little-endian, which is why
/// [`Hashed::as_le_bytes`] exists, but `as_be_bytes` does not.
///
/// Naming mimicks functions like [`i32::from_be_bytes`], [`i32::to_le_bytes`]
/// etc.
pub trait Hashed
where
    Self: AsRef<[u8]>
        + Clone
        + Debug
        + Eq
        + Hash
        + Ord
        + PartialEq
        + PartialOrd
        + Sized,
{
    /// Size of the hash, in bytes.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{
    /// #     Hashed, Ripemd160, Sha256, Sha256d, ShaRmd160,
    /// # };
    /// assert_eq!(Ripemd160::SIZE, 20);
    /// assert_eq!(Sha256::SIZE, 32);
    /// assert_eq!(Sha256d::SIZE, 32);
    /// assert_eq!(ShaRmd160::SIZE, 20);
    /// ```
    const SIZE: usize;

    /// Byte array storing the hash. Usually just `[u8; Self::SIZE]`.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{
    /// #     Hashed, Ripemd160, Sha256, Sha256d, ShaRmd160,
    /// # };
    /// let array: <Ripemd160 as Hashed>::Array = [0; 20];
    /// let array: <Sha256 as Hashed>::Array = [0; 32];
    /// let array: <Sha256d as Hashed>::Array = [0; 32];
    /// let array: <ShaRmd160 as Hashed>::Array = [0; 20];
    /// ```
    type Array: AsRef<[u8]> + AsMut<[u8]> + Clone + Default;

    /// Compute the hash function and return the hash as a `Self`.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{
    /// #     Hashed, Ripemd160, Sha256, Sha256d, ShaRmd160,
    /// # };
    /// # use hex_literal::hex;
    /// let sha256_empty = Sha256(hex!(
    ///     "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    /// ));
    /// assert_eq!(Sha256::digest([]), sha256_empty);
    ///
    /// let ripemd160_empty =
    ///     Ripemd160(hex!("9c1185a5c5e9fc54612808977ee8f548b2258d31"));
    /// assert_eq!(Ripemd160::digest([]), ripemd160_empty);
    ///
    /// let sha256d_empty = Sha256d(hex!(
    ///     "5df6e0e2761359d30a8275058e299fcc0381534545f55cf43e41983f5d4c9456"
    /// ));
    /// assert_eq!(Sha256d::digest([]), sha256d_empty);
    ///
    /// let sharmd160_empty =
    ///     ShaRmd160(hex!("b472a266d0bd89c13706a4132ccfb16f7c3b9fcb"));
    /// assert_eq!(ShaRmd160::digest([]), sharmd160_empty);
    /// ```
    fn digest(data: impl AsRef<[u8]>) -> Self;

    /// Create hash from a little-endian array.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{Ripemd160, Hashed};
    /// # use hex_literal::hex;
    /// let arr_le = hex!("0011223344556677889900112233445566778899");
    /// assert_eq!(Ripemd160::from_le_bytes(arr_le), Ripemd160(arr_le));
    /// ```
    fn from_le_bytes(arr: Self::Array) -> Self;

    /// A reference to the byte array of this hash, in little-endian.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{Ripemd160, Hashed};
    /// # use hex_literal::hex;
    /// let arr_le = hex!("0011223344556677889900112233445566778899");
    /// assert_eq!(Ripemd160(arr_le).as_le_bytes(), &arr_le);
    /// ```
    fn as_le_bytes(&self) -> &Self::Array;

    /// Create hash from a big-endian array.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{Ripemd160, Hashed};
    /// # use hex_literal::hex;
    /// let arr_le = hex!("0011223344556677889900112233445566778899");
    /// let arr_be = hex!("9988776655443322110099887766554433221100");
    /// assert_eq!(Ripemd160::from_be_bytes(arr_be), Ripemd160(arr_le));
    /// ```
    fn from_be_bytes(mut arr: Self::Array) -> Self {
        // convert to little-endian
        arr.as_mut().reverse();
        Self::from_le_bytes(arr)
    }

    /// Little-endian byte array of this hash.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{Ripemd160, Hashed};
    /// # use hex_literal::hex;
    /// let arr_le = hex!("0011223344556677889900112233445566778899");
    /// assert_eq!(Ripemd160(arr_le).to_le_bytes(), arr_le);
    /// ```
    fn to_le_bytes(&self) -> Self::Array {
        self.as_le_bytes().clone()
    }

    /// Big-endian byte array of this hash.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{Ripemd160, Hashed};
    /// # use hex_literal::hex;
    /// let arr_le = hex!("0011223344556677889900112233445566778899");
    /// let arr_be = hex!("9988776655443322110099887766554433221100");
    /// assert_eq!(Ripemd160(arr_le).to_be_bytes(), arr_be);
    /// ```
    fn to_be_bytes(&self) -> Self::Array {
        let mut arr = self.to_le_bytes();
        arr.as_mut().reverse();
        arr
    }

    /// Hex encoding of this hash, in little-endian.
    ///
    /// Intended to display the "internals" of an object, as this is the byte
    /// order used in the Bitcoin wire protocol.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{Hashed, Sha256d};
    /// # use hex_literal::hex;
    /// // Genesis hash
    /// let hash = Sha256d(hex!(
    ///     "6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000"
    /// ));
    /// assert_eq!(
    ///     hash.hex_le(),
    ///     "6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000",
    /// );
    /// ```
    fn hex_le(&self) -> String {
        hex::encode(self.as_le_bytes())
    }

    /// Hex encoding of this hash, in big-endian.
    ///
    /// Block hashes, tx hashes, txids and SLP token IDs are displayed this way
    /// to the user, as it is the way hexadecimal numbers are usually
    /// represented by humans.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{Sha256d, Hashed};
    /// # use hex_literal::hex;
    /// // Genesis hash
    /// let hash = Sha256d(hex!(
    ///     "6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000"
    /// ));
    /// assert_eq!(
    ///     hash.hex_be(),
    ///     "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
    /// );
    /// ```
    fn hex_be(&self) -> String {
        hex::encode(self.to_be_vec())
    }

    /// [`Vec<u8>`] of this hash, in little-endian.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{Sha256d, Hashed};
    /// # use hex_literal::hex;
    /// let genesis_hash_le = hex!(
    ///     "6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000"
    /// );
    /// let hash = Sha256d(genesis_hash_le);
    /// assert_eq!(hash.to_le_vec(), genesis_hash_le.to_vec());
    /// ```
    fn to_le_vec(&self) -> Vec<u8> {
        self.as_le_bytes().as_ref().to_vec()
    }

    /// [`Vec<u8>`] of this hash, in big-endian.
    ///
    /// See [`Hashed::hex_be`] for an explanation.
    ///
    /// ```
    /// # use bitcoinsuite_core::hash::{Sha256d, Hashed};
    /// # use hex_literal::hex;
    /// let hash = Sha256d(hex!(
    ///     "6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000"
    /// ));
    /// let genesis_hash_be = hex!(
    ///     "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f"
    /// );
    /// assert_eq!(hash.to_be_vec(), genesis_hash_be.to_vec());
    /// ```
    fn to_be_vec(&self) -> Vec<u8> {
        self.to_be_bytes().as_ref().to_vec()
    }

    /// Try to interpret the slice as a little-endian hash.
    ///
    /// ```
    /// # use bitcoinsuite_core::{error::DataError, hash::{Ripemd160, Hashed}};
    /// # use hex_literal::hex;
    /// assert_eq!(
    ///     Ripemd160::from_le_slice(&[1, 2, 3]),
    ///     Err(DataError::InvalidLength {
    ///         expected: 20,
    ///         actual: 3,
    ///     }),
    /// );
    /// let arr_le = hex!("0011223344556677889900112233445566778899");
    /// assert_eq!(Ripemd160::from_le_slice(&arr_le), Ok(Ripemd160(arr_le)));
    /// ```
    fn from_le_slice(slice: &[u8]) -> Result<Self, DataError> {
        verify_size::<Self>(slice.len())?;
        let mut array: Self::Array = Default::default();
        array.as_mut().copy_from_slice(slice);
        Ok(Self::from_le_bytes(array))
    }

    /// Try to interpret the slice as a big-endian hash.
    ///
    /// ```
    /// # use bitcoinsuite_core::{error::DataError, hash::{Ripemd160, Hashed}};
    /// # use hex_literal::hex;
    /// assert_eq!(
    ///     Ripemd160::from_be_slice(&[1, 2, 3]),
    ///     Err(DataError::InvalidLength {
    ///         expected: 20,
    ///         actual: 3,
    ///     }),
    /// );
    /// let arr_be = hex!("0011223344556677889900112233445566778899");
    /// assert_eq!(
    ///     Ripemd160::from_be_slice(&arr_be),
    ///     Ok(Ripemd160::from_be_bytes(arr_be)),
    /// );
    /// ```
    fn from_be_slice(slice: &[u8]) -> Result<Self, DataError> {
        verify_size::<Self>(slice.len())?;
        let mut array: Self::Array = Default::default();
        array.as_mut().copy_from_slice(slice);
        Ok(Self::from_be_bytes(array))
    }

    /// Try to parse the string as little-endian hex.
    ///
    /// ```
    /// # use bitcoinsuite_core::{error::DataError, hash::{Ripemd160, Hashed}};
    /// # use hex_literal::hex;
    /// assert_eq!(
    ///     Ripemd160::from_le_hex("invalidhex"),
    ///     Err(DataError::InvalidHex(
    ///         hex::FromHexError::InvalidHexCharacter { c: 'i', index: 0 }
    ///     )),
    /// );
    /// assert_eq!(
    ///     Ripemd160::from_le_hex("aabbcc"),
    ///     Err(DataError::InvalidLength {
    ///         expected: 20,
    ///         actual: 3,
    ///     }),
    /// );
    /// let arr_le = hex!("0011223344556677889900112233445566778899");
    /// assert_eq!(
    ///     Ripemd160::from_le_hex("0011223344556677889900112233445566778899"),
    ///     Ok(Ripemd160::from_le_bytes(arr_le)),
    /// );
    /// ```
    fn from_le_hex(s: &str) -> Result<Self, DataError> {
        let vec = hex::decode(s).map_err(DataError::InvalidHex)?;
        Self::from_le_slice(&vec)
    }

    /// Try to parse the string as big-endian hex.
    ///
    /// ```
    /// # use bitcoinsuite_core::{error::DataError, hash::{Ripemd160, Hashed}};
    /// # use hex_literal::hex;
    /// assert_eq!(
    ///     Ripemd160::from_be_hex("invalidhex"),
    ///     Err(DataError::InvalidHex(hex::FromHexError::InvalidHexCharacter {
    ///         c: 'i',
    ///         index: 0,
    ///     })),
    /// );
    /// assert_eq!(
    ///     Ripemd160::from_be_hex("aabbcc"),
    ///     Err(DataError::InvalidLength {
    ///         expected: 20,
    ///         actual: 3,
    ///     }),
    /// );
    /// let arr_be = hex!("0011223344556677889900112233445566778899");
    /// assert_eq!(
    ///     Ripemd160::from_be_hex("0011223344556677889900112233445566778899"),
    ///     Ok(Ripemd160::from_be_bytes(arr_be)),
    /// );
    fn from_be_hex(s: &str) -> Result<Self, DataError> {
        let vec = hex::decode(s).map_err(DataError::InvalidHex)?;
        Self::from_be_slice(&vec)
    }
}

fn verify_size<H: Hashed>(size: usize) -> Result<(), DataError> {
    if H::SIZE != size {
        return Err(DataError::InvalidLength {
            expected: H::SIZE,
            actual: size,
        });
    }
    Ok(())
}

macro_rules! hash_algo {
    (
        $(#[$attrs:meta])*
        pub struct $ALGO_NAME: ident(pub [u8; $SIZE: literal]);

        $($item_impls:item)*
    ) => {
        $(#[$attrs])*
        #[derive(
            Clone, Copy, Default, Deserialize, Eq, Hash, PartialEq, Serialize
        )]
        pub struct $ALGO_NAME(pub [u8; $SIZE]);

        impl Hashed for $ALGO_NAME {
            const SIZE: usize = $SIZE;
            type Array = [u8; $SIZE];

            $($item_impls)*

            fn from_le_bytes(array: Self::Array) -> Self {
                $ALGO_NAME(array)
            }

            fn as_le_bytes(&self) -> &Self::Array {
                &self.0
            }
        }

        impl Debug for $ALGO_NAME {
            fn fmt(
                &self,
                fmt: &mut std::fmt::Formatter<'_>,
            ) -> std::result::Result<(), std::fmt::Error> {
                write!(
                    fmt,
                    "{}(hex!({:?}))",
                    stringify!($ALGO_NAME),
                    self.hex_le(),
                )
            }
        }

        impl AsRef<[u8]> for $ALGO_NAME {
            fn as_ref(&self) -> &[u8] {
                &self.0
            }
        }

        impl From<$ALGO_NAME> for [u8; $SIZE] {
            fn from(hash: $ALGO_NAME) -> Self {
                hash.0
            }
        }

        impl PartialOrd for $ALGO_NAME {
            fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
                Some(self.cmp(other))
            }
        }

        impl Ord for $ALGO_NAME {
            fn cmp(&self, other: &Self) -> Ordering {
                // Hashes are little-endian, but [`std::cmp::Ord`] for `[u8; _]`
                // compares in big-endian, therefore we have to reverse byte
                // ordering when comparing.
                self.to_be_bytes().cmp(&other.to_be_bytes())
            }
        }
    };
}

hash_algo! {
    /// Hash of the SHA-256 algorithm as defined by NIST. See [`Hashed`].
    ///
    /// Occasionally used in Bitcoin, generally [`Sha256d`] is used more often,
    /// especially for block hashes, tx hashes etc.
    pub struct Sha256(pub [u8; 32]);

    fn digest(data: impl AsRef<[u8]>) -> Self {
        Sha256(sha2::Sha256::digest(data).into())
    }
}

hash_algo! {
    /// SHA-256 algorithm applied twice (i.e. sha256(sha256(x))), see
    /// [`Sha256`]. See [`Hashed`].
    ///
    /// Most commonly used hash in Bitcoin, especially for block hashes, tx
    /// hashes and txids.
    pub struct Sha256d(pub [u8; 32]);

    fn digest(data: impl AsRef<[u8]>) -> Self {
        Sha256d(sha2::Sha256::digest(sha2::Sha256::digest(data)).into())
    }
}

hash_algo! {
    /// Hash of the RIPEMD-160 algorithm as certified by CRYPTREC. See
    /// [`Hashed`].
    ///
    /// Rarely used directly in Bitcoin, generally a combination of SHA-256 and
    /// RIPEMD-160 is used more often (see [`ShaRmd160`]).
    pub struct Ripemd160(pub [u8; 20]);

    fn digest(data: impl AsRef<[u8]>) -> Self {
        Ripemd160(ripemd::Ripemd160::digest(data).into())
    }
}

hash_algo! {
    /// SHA-256 algorithm followed by RIPEMD-160, see [`Sha256`] and
    /// [`Ripemd160`]. See [`Hashed`].
    ///
    /// Bitcoin uses public keys hashed by SHA-256 followed by RIPEMD-160 to
    /// generate addresses.
    pub struct ShaRmd160(pub [u8; 20]);

    fn digest(data: impl AsRef<[u8]>) -> Self {
        ShaRmd160(ripemd::Ripemd160::digest(sha2::Sha256::digest(data)).into())
    }
}

#[cfg(test)]
mod tests {
    use hex_literal::hex;

    use crate::hash::Ripemd160;

    #[test]
    fn test_ord() {
        let small = Ripemd160(hex!("0100000000000000000000000000000000000000"));
        let big = Ripemd160(hex!("0000000000000000000000000000000000000001"));
        assert!(small < big);
    }

    #[test]
    fn test_debug() {
        let hash = Ripemd160(hex!("0123456789012345678901234567890123456789"));
        assert_eq!(
            format!("{:?}", hash),
            "Ripemd160(hex!(\"0123456789012345678901234567890123456789\"))",
        );
    }
}
