// SPDX-License-Identifier: CC0-1.0

//! Provides [`Scalar`] and related types.
//!
//! In elliptic curve cryptography scalars are non-point values that can be used
//! to multiply points. The most common type of scalars are private keys.
//! However not all scalars are private keys. They can even be public *values*.
//! To make handling them safer and easier this module provides the `Scalar`
//! type and related.

use core::{fmt, ops};

use crate::constants;

/// Positive 256-bit integer guaranteed to be less than the secp256k1 curve
/// order.
///
/// The difference between `SecretKey` and `Scalar` is that `Scalar` doesn't
/// guarantee being securely usable as a private key.
///
/// **Warning: the operations on this type are NOT constant time!**
/// Using this with secret values is not advised.
// Internal represenation is big endian to match what `libsecp256k1` uses.
// Also easier to implement comparison.
// Debug impl omitted for now, the bytes may be secret
#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub struct Scalar([u8; 32]);
impl_pretty_debug!(Scalar);
impl_non_secure_erase!(Scalar, 0, [0u8; 32]);

const MAX_RAW: [u8; 32] = [
    0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
    0xFF, 0xFF, 0xFF, 0xFE, 0xBA, 0xAE, 0xDC, 0xE6, 0xAF, 0x48, 0xA0, 0x3B,
    0xBF, 0xD2, 0x5E, 0x8C, 0xD0, 0x36, 0x41, 0x40,
];

impl Scalar {
    /// Maximum valid value: `curve_order - 1`
    pub const MAX: Scalar = Scalar(MAX_RAW);
    /// Scalar representing `1`
    pub const ONE: Scalar = Scalar(constants::ONE);
    /// Scalar representing `0`
    pub const ZERO: Scalar = Scalar(constants::ZERO);

    /// Generates a random scalar
    #[cfg(all(feature = "rand", feature = "std"))]
    pub fn random() -> Self {
        Self::random_custom(rand::thread_rng())
    }

    /// Generates a random scalar using supplied RNG
    #[cfg(feature = "rand")]
    pub fn random_custom<R: rand::Rng>(mut rng: R) -> Self {
        let mut bytes = [0u8; 32];
        loop {
            rng.fill_bytes(&mut bytes);
            // unlikely to go past MAX
            if let Ok(scalar) = Scalar::from_be_bytes(bytes) {
                break scalar;
            }
        }
    }

    /// Tries to deserialize from big endian bytes
    ///
    /// **Security warning:** this function is not constant time!
    /// Passing secret data is not recommended.
    ///
    /// # Errors
    ///
    /// Returns error when the value is above the curve order.
    pub fn from_be_bytes(value: [u8; 32]) -> Result<Self, OutOfRangeError> {
        // Lexicographic ordering of arrays of the same length is same as
        // ordering of BE numbers
        if value <= MAX_RAW {
            Ok(Scalar(value))
        } else {
            Err(OutOfRangeError {})
        }
    }

    /// Tries to deserialize from little endian bytes
    ///
    /// **Security warning:** this function is not constant time!
    /// Passing secret data is not recommended.
    ///
    /// # Errors
    ///
    /// Returns error when the value is above the curve order.
    pub fn from_le_bytes(mut value: [u8; 32]) -> Result<Self, OutOfRangeError> {
        value.reverse();
        Self::from_be_bytes(value)
    }

    /// Serializes to big endian bytes
    pub fn to_be_bytes(self) -> [u8; 32] {
        self.0
    }

    /// Serializes to little endian bytes
    pub fn to_le_bytes(self) -> [u8; 32] {
        let mut res = self.0;
        res.reverse();
        res
    }

    // returns a reference to internal bytes
    // non-public to not leak the internal representation
    pub(crate) fn as_be_bytes(&self) -> &[u8; 32] {
        &self.0
    }

    pub(crate) fn as_c_ptr(&self) -> *const u8 {
        use secp256k1_sys::CPtr;

        self.as_be_bytes().as_c_ptr()
    }
}

impl<I> ops::Index<I> for Scalar
where
    [u8]: ops::Index<I>,
{
    type Output = <[u8] as ops::Index<I>>::Output;

    #[inline]
    fn index(&self, index: I) -> &Self::Output {
        &self.0[index]
    }
}

impl From<crate::SecretKey> for Scalar {
    fn from(value: crate::SecretKey) -> Self {
        Scalar(value.secret_bytes())
    }
}

/// Error returned when the value of scalar is invalid - larger than the curve
/// order.
// Intentionally doesn't implement `Copy` to improve forward compatibility.
// Same reason for `non_exhaustive`.
#[allow(missing_copy_implementations)]
#[derive(Debug, Clone, Eq, PartialEq, Hash)]
#[non_exhaustive]
pub struct OutOfRangeError {}

impl fmt::Display for OutOfRangeError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        fmt::Display::fmt("the value is not a member of secp256k1 field", f)
    }
}

#[cfg(feature = "std")]
impl std::error::Error for OutOfRangeError {}
