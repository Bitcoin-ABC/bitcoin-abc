// SPDX-License-Identifier: CC0-1.0

//! Support for shared secret computations.

use core::borrow::Borrow;
use core::{ptr, str};

use secp256k1_sys::types::{c_int, c_uchar, c_void};

use crate::ffi::{self, CPtr};
use crate::key::{PublicKey, SecretKey};
use crate::{constants, Error};

// The logic for displaying shared secrets relies on this (see `secret.rs`).
const SHARED_SECRET_SIZE: usize = constants::SECRET_KEY_SIZE;

/// Enables two parties to create a shared secret without revealing their own
/// secrets.
///
/// # Examples
///
/// ```
/// # #[cfg(all(feature = "rand", feature = "std"))] {
/// # use ecash_secp256k1::{rand, Secp256k1};
/// # use ecash_secp256k1::ecdh::SharedSecret;
/// let s = Secp256k1::new();
/// let (sk1, pk1) = s.generate_keypair(&mut rand::thread_rng());
/// let (sk2, pk2) = s.generate_keypair(&mut rand::thread_rng());
/// let sec1 = SharedSecret::new(&pk2, &sk1);
/// let sec2 = SharedSecret::new(&pk1, &sk2);
/// assert_eq!(sec1, sec2);
/// # }
// ```
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct SharedSecret([u8; SHARED_SECRET_SIZE]);
impl_display_secret!(SharedSecret);
impl_non_secure_erase!(SharedSecret, 0, [0u8; SHARED_SECRET_SIZE]);

impl SharedSecret {
    /// Creates a new shared secret from a pubkey and secret key.
    #[inline]
    pub fn new(point: &PublicKey, scalar: &SecretKey) -> SharedSecret {
        let mut buf = [0u8; SHARED_SECRET_SIZE];
        let res = unsafe {
            ffi::secp256k1_ecdh(
                ffi::secp256k1_context_no_precomp,
                buf.as_mut_ptr(),
                point.as_c_ptr(),
                scalar.as_c_ptr(),
                ffi::secp256k1_ecdh_hash_function_default,
                ptr::null_mut(),
            )
        };
        debug_assert_eq!(res, 1);
        SharedSecret(buf)
    }

    /// Returns the shared secret as a byte value.
    #[inline]
    pub fn secret_bytes(&self) -> [u8; SHARED_SECRET_SIZE] {
        self.0
    }

    /// Creates a shared secret from `bytes` array.
    #[inline]
    pub fn from_bytes(bytes: [u8; SHARED_SECRET_SIZE]) -> SharedSecret {
        SharedSecret(bytes)
    }

    /// Creates a shared secret from `bytes` slice.
    #[inline]
    pub fn from_slice(bytes: &[u8]) -> Result<SharedSecret, Error> {
        match bytes.len() {
            SHARED_SECRET_SIZE => {
                let mut ret = [0u8; SHARED_SECRET_SIZE];
                ret[..].copy_from_slice(bytes);
                Ok(SharedSecret(ret))
            }
            _ => Err(Error::InvalidSharedSecret),
        }
    }
}

impl str::FromStr for SharedSecret {
    type Err = Error;

    fn from_str(s: &str) -> Result<SharedSecret, Error> {
        let mut res = [0u8; SHARED_SECRET_SIZE];
        match crate::from_hex(s, &mut res) {
            Ok(SHARED_SECRET_SIZE) => Ok(SharedSecret::from_bytes(res)),
            _ => Err(Error::InvalidSharedSecret),
        }
    }
}

impl Borrow<[u8]> for SharedSecret {
    fn borrow(&self) -> &[u8] {
        &self.0
    }
}

impl AsRef<[u8]> for SharedSecret {
    fn as_ref(&self) -> &[u8] {
        &self.0
    }
}

/// Creates a shared point from public key and secret key.
///
/// **Important: use of a strong cryptographic hash function may be critical to
/// security! Do NOT use unless you understand cryptographical implications.**
/// If not, use SharedSecret instead.
///
/// Can be used like `SharedSecret` but caller is responsible for then hashing
/// the returned buffer. This allows for the use of a custom hash function since
/// `SharedSecret` uses SHA256.
///
/// # Returns
///
/// 64 bytes representing the (x,y) co-ordinates of a point on the curve (32
/// bytes each).
///
/// # Examples
/// ```
/// # #[cfg(all(feature = "hashes", feature = "rand", feature = "std"))] {
/// # use ecash_secp256k1::{ecdh, rand, Secp256k1, PublicKey, SecretKey};
/// # use ecash_secp256k1::hashes::{Hash, sha512};
///
/// let s = Secp256k1::new();
/// let (sk1, pk1) = s.generate_keypair(&mut rand::thread_rng());
/// let (sk2, pk2) = s.generate_keypair(&mut rand::thread_rng());
///
/// let point1 = ecdh::shared_secret_point(&pk2, &sk1);
/// let secret1 = sha512::Hash::hash(&point1);
/// let point2 = ecdh::shared_secret_point(&pk1, &sk2);
/// let secret2 = sha512::Hash::hash(&point2);
/// assert_eq!(secret1, secret2)
/// # }
/// ```
pub fn shared_secret_point(point: &PublicKey, scalar: &SecretKey) -> [u8; 64] {
    let mut xy = [0u8; 64];

    let res = unsafe {
        ffi::secp256k1_ecdh(
            ffi::secp256k1_context_no_precomp,
            xy.as_mut_ptr(),
            point.as_c_ptr(),
            scalar.as_c_ptr(),
            Some(c_callback),
            ptr::null_mut(),
        )
    };
    // Our callback *always* returns 1.
    // The scalar was verified to be valid (0 > scalar > group_order) via the
    // type system.
    debug_assert_eq!(res, 1);
    xy
}

unsafe extern "C" fn c_callback(
    output: *mut c_uchar,
    x: *const c_uchar,
    y: *const c_uchar,
    _data: *mut c_void,
) -> c_int {
    ptr::copy_nonoverlapping(x, output, 32);
    ptr::copy_nonoverlapping(y, output.offset(32), 32);
    1
}

#[cfg(feature = "serde")]
impl ::serde::Serialize for SharedSecret {
    fn serialize<S: ::serde::Serializer>(
        &self,
        s: S,
    ) -> Result<S::Ok, S::Error> {
        if s.is_human_readable() {
            let mut buf = [0u8; SHARED_SECRET_SIZE * 2];
            s.serialize_str(
                crate::to_hex(&self.0, &mut buf)
                    .expect("fixed-size hex serialization"),
            )
        } else {
            s.serialize_bytes(self.as_ref())
        }
    }
}

#[cfg(feature = "serde")]
impl<'de> ::serde::Deserialize<'de> for SharedSecret {
    fn deserialize<D: ::serde::Deserializer<'de>>(
        d: D,
    ) -> Result<Self, D::Error> {
        if d.is_human_readable() {
            d.deserialize_str(super::serde_util::FromStrVisitor::new(
                "a hex string representing 32 byte SharedSecret",
            ))
        } else {
            d.deserialize_bytes(super::serde_util::BytesVisitor::new(
                "raw 32 bytes SharedSecret",
                SharedSecret::from_slice,
            ))
        }
    }
}

#[cfg(test)]
#[allow(unused_imports)]
mod tests {
    #[cfg(target_arch = "wasm32")]
    use wasm_bindgen_test::wasm_bindgen_test as test;

    use super::SharedSecret;
    use crate::Secp256k1;

    #[test]
    #[cfg(all(feature = "rand", feature = "std"))]
    fn ecdh() {
        let s = Secp256k1::signing_only();
        let (sk1, pk1) = s.generate_keypair(&mut rand::thread_rng());
        let (sk2, pk2) = s.generate_keypair(&mut rand::thread_rng());

        let sec1 = SharedSecret::new(&pk2, &sk1);
        let sec2 = SharedSecret::new(&pk1, &sk2);
        let sec_odd = SharedSecret::new(&pk1, &sk1);
        assert_eq!(sec1, sec2);
        assert!(sec_odd != sec2);
    }

    #[test]
    fn test_c_callback() {
        let x = [5u8; 32];
        let y = [7u8; 32];
        let mut output = [0u8; 64];
        let res = unsafe {
            super::c_callback(
                output.as_mut_ptr(),
                x.as_ptr(),
                y.as_ptr(),
                core::ptr::null_mut(),
            )
        };
        assert_eq!(res, 1);
        let mut new_x = [0u8; 32];
        let mut new_y = [0u8; 32];
        new_x.copy_from_slice(&output[..32]);
        new_y.copy_from_slice(&output[32..]);
        assert_eq!(x, new_x);
        assert_eq!(y, new_y);
    }

    #[test]
    #[cfg(not(secp256k1_fuzz))]
    #[cfg(all(feature = "hashes", feature = "rand", feature = "std"))]
    fn hashes_and_sys_generate_same_secret() {
        use hashes::{sha256, Hash, HashEngine};

        use crate::ecdh::shared_secret_point;

        let s = Secp256k1::signing_only();
        let (sk1, _) = s.generate_keypair(&mut rand::thread_rng());
        let (_, pk2) = s.generate_keypair(&mut rand::thread_rng());

        let secret_sys = SharedSecret::new(&pk2, &sk1);

        let xy = shared_secret_point(&pk2, &sk1);

        // Mimics logic in `bitcoin-core/secp256k1/src/module/main_impl.h`
        let version = (xy[63] & 0x01) | 0x02;
        let mut engine = sha256::HashEngine::default();
        engine.input(&[version]);
        engine.input(&xy.as_ref()[..32]);
        let secret_bh = sha256::Hash::from_engine(engine);

        assert_eq!(secret_bh.as_byte_array(), secret_sys.as_ref());
    }

    #[test]
    #[cfg(all(feature = "serde", feature = "alloc"))]
    fn serde() {
        use serde_test::{assert_tokens, Configure, Token};
        #[rustfmt::skip]
        static BYTES: [u8; 32] = [
            1, 1, 1, 1, 1, 1, 1, 1,
            0, 1, 2, 3, 4, 5, 6, 7,
            0xff, 0xff, 0, 0, 0xff, 0xff, 0, 0,
            99, 99, 99, 99, 99, 99, 99, 99
        ];
        static STR: &str =
            "01010101010101010001020304050607ffff0000ffff00006363636363636363";

        let secret = SharedSecret::from_slice(&BYTES).unwrap();

        assert_tokens(&secret.compact(), &[Token::BorrowedBytes(&BYTES[..])]);
        assert_tokens(&secret.compact(), &[Token::Bytes(&BYTES)]);
        assert_tokens(&secret.compact(), &[Token::ByteBuf(&BYTES)]);

        assert_tokens(&secret.readable(), &[Token::BorrowedStr(STR)]);
        assert_tokens(&secret.readable(), &[Token::Str(STR)]);
        assert_tokens(&secret.readable(), &[Token::String(STR)]);
    }
}

#[cfg(bench)]
// Currently only a single bench that requires "rand" + "std".
#[cfg(all(feature = "rand", feature = "std"))]
mod benches {
    use test::{black_box, Bencher};

    use super::SharedSecret;
    use crate::Secp256k1;

    #[bench]
    pub fn bench_ecdh(bh: &mut Bencher) {
        let s = Secp256k1::signing_only();
        let (sk, pk) = s.generate_keypair(&mut rand::thread_rng());

        bh.iter(|| {
            let res = SharedSecret::new(&pk, &sk);
            black_box(res);
        });
    }
}
