// SPDX-License-Identifier: CC0-1.0

//! Structs and functionality related to the ECDSA signature algorithm.

#[cfg(feature = "recovery")]
mod recovery;
pub mod serialized_signature;

use core::{fmt, ptr, str};

#[cfg(feature = "recovery")]
pub use self::recovery::{RecoverableSignature, RecoveryId};
pub use self::serialized_signature::SerializedSignature;
use crate::ffi::CPtr;
#[cfg(feature = "global-context")]
use crate::SECP256K1;
use crate::{
    ffi, from_hex, Error, Message, PublicKey, Secp256k1, SecretKey, Signing,
    Verification,
};

/// An ECDSA signature
#[derive(Copy, Clone, PartialOrd, Ord, PartialEq, Eq, Hash)]
pub struct Signature(pub(crate) ffi::Signature);
impl_fast_comparisons!(Signature);

impl fmt::Debug for Signature {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        fmt::Display::fmt(self, f)
    }
}

impl fmt::Display for Signature {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        let sig = self.serialize_der();
        sig.fmt(f)
    }
}

impl str::FromStr for Signature {
    type Err = Error;

    fn from_str(s: &str) -> Result<Signature, Error> {
        let mut res = [0u8; 72];
        match from_hex(s, &mut res) {
            Ok(x) => Signature::from_der(&res[0..x]),
            _ => Err(Error::InvalidSignature),
        }
    }
}

impl Signature {
    #[inline]
    /// Converts a DER-encoded byte slice to a signature
    pub fn from_der(data: &[u8]) -> Result<Signature, Error> {
        if data.is_empty() {
            return Err(Error::InvalidSignature);
        }

        unsafe {
            let mut ret = ffi::Signature::new();
            if ffi::secp256k1_ecdsa_signature_parse_der(
                ffi::secp256k1_context_no_precomp,
                &mut ret,
                data.as_c_ptr(),
                data.len(),
            ) == 1
            {
                Ok(Signature(ret))
            } else {
                Err(Error::InvalidSignature)
            }
        }
    }

    /// Converts a 64-byte compact-encoded byte slice to a signature
    pub fn from_compact(data: &[u8]) -> Result<Signature, Error> {
        if data.len() != 64 {
            return Err(Error::InvalidSignature);
        }

        unsafe {
            let mut ret = ffi::Signature::new();
            if ffi::secp256k1_ecdsa_signature_parse_compact(
                ffi::secp256k1_context_no_precomp,
                &mut ret,
                data.as_c_ptr(),
            ) == 1
            {
                Ok(Signature(ret))
            } else {
                Err(Error::InvalidSignature)
            }
        }
    }

    /// Converts a "lax DER"-encoded byte slice to a signature. This is
    /// basically only useful for validating signatures in the Bitcoin
    /// blockchain from before 2016. It should never be used in new
    /// applications. This library does not support serializing to this
    /// "format"
    pub fn from_der_lax(data: &[u8]) -> Result<Signature, Error> {
        if data.is_empty() {
            return Err(Error::InvalidSignature);
        }

        unsafe {
            let mut ret = ffi::Signature::new();
            if ffi::ecdsa_signature_parse_der_lax(
                ffi::secp256k1_context_no_precomp,
                &mut ret,
                data.as_c_ptr(),
                data.len(),
            ) == 1
            {
                Ok(Signature(ret))
            } else {
                Err(Error::InvalidSignature)
            }
        }
    }

    /// Normalizes a signature to a "low S" form. In ECDSA, signatures are
    /// of the form (r, s) where r and s are numbers lying in some finite
    /// field. The verification equation will pass for (r, s) iff it passes
    /// for (r, -s), so it is possible to ``modify'' signatures in transit
    /// by flipping the sign of s. This does not constitute a forgery since
    /// the signed message still cannot be changed, but for some applications,
    /// changing even the signature itself can be a problem. Such applications
    /// require a "strong signature". It is believed that ECDSA is a strong
    /// signature except for this ambiguity in the sign of s, so to accommodate
    /// these applications libsecp256k1 considers signatures for which s is in
    /// the upper half of the field range invalid. This eliminates the
    /// ambiguity.
    ///
    /// However, for some systems, signatures with high s-values are considered
    /// valid. (For example, parsing the historic Bitcoin blockchain requires
    /// this.) For these applications we provide this normalization function,
    /// which ensures that the s value lies in the lower half of its range.
    pub fn normalize_s(&mut self) {
        unsafe {
            // Ignore return value, which indicates whether the sig
            // was already normalized. We don't care.
            ffi::secp256k1_ecdsa_signature_normalize(
                ffi::secp256k1_context_no_precomp,
                self.as_mut_c_ptr(),
                self.as_c_ptr(),
            );
        }
    }

    #[inline]
    /// Serializes the signature in DER format
    pub fn serialize_der(&self) -> SerializedSignature {
        let mut data = [0u8; serialized_signature::MAX_LEN];
        let mut len: usize = serialized_signature::MAX_LEN;
        unsafe {
            let err = ffi::secp256k1_ecdsa_signature_serialize_der(
                ffi::secp256k1_context_no_precomp,
                data.as_mut_ptr(),
                &mut len,
                self.as_c_ptr(),
            );
            debug_assert!(err == 1);
            SerializedSignature::from_raw_parts(data, len)
        }
    }

    #[inline]
    /// Serializes the signature in compact format
    pub fn serialize_compact(&self) -> [u8; 64] {
        let mut ret = [0u8; 64];
        unsafe {
            let err = ffi::secp256k1_ecdsa_signature_serialize_compact(
                ffi::secp256k1_context_no_precomp,
                ret.as_mut_c_ptr(),
                self.as_c_ptr(),
            );
            debug_assert!(err == 1);
        }
        ret
    }

    /// Verifies an ECDSA signature for `msg` using `pk` and the global
    /// [`SECP256K1`] context. The signature must be normalized or
    /// verification will fail (see [`Signature::normalize_s`]).
    #[inline]
    #[cfg(feature = "global-context")]
    pub fn verify(&self, msg: &Message, pk: &PublicKey) -> Result<(), Error> {
        SECP256K1.verify_ecdsa(msg, self, pk)
    }
}

impl CPtr for Signature {
    type Target = ffi::Signature;

    fn as_c_ptr(&self) -> *const Self::Target {
        &self.0
    }

    fn as_mut_c_ptr(&mut self) -> *mut Self::Target {
        &mut self.0
    }
}

/// Creates a new signature from a FFI signature
impl From<ffi::Signature> for Signature {
    #[inline]
    fn from(sig: ffi::Signature) -> Signature {
        Signature(sig)
    }
}

#[cfg(feature = "serde")]
impl serde::Serialize for Signature {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        if s.is_human_readable() {
            s.collect_str(self)
        } else {
            s.serialize_bytes(&self.serialize_der())
        }
    }
}

#[cfg(feature = "serde")]
impl<'de> serde::Deserialize<'de> for Signature {
    fn deserialize<D: serde::Deserializer<'de>>(
        d: D,
    ) -> Result<Self, D::Error> {
        if d.is_human_readable() {
            d.deserialize_str(crate::serde_util::FromStrVisitor::new(
                "a hex string representing a DER encoded Signature",
            ))
        } else {
            d.deserialize_bytes(crate::serde_util::BytesVisitor::new(
                "raw byte stream, that represents a DER encoded Signature",
                Signature::from_der,
            ))
        }
    }
}

impl<C: Signing> Secp256k1<C> {
    fn sign_ecdsa_with_noncedata_pointer(
        &self,
        msg: &Message,
        sk: &SecretKey,
        noncedata: Option<&[u8; 32]>,
    ) -> Signature {
        unsafe {
            let mut ret = ffi::Signature::new();
            let noncedata_ptr = match noncedata {
                Some(arr) => arr.as_c_ptr() as *const _,
                None => ptr::null(),
            };
            // We can assume the return value because it's not possible to
            // construct an invalid signature from a valid `Message`
            // and `SecretKey`
            assert_eq!(
                ffi::secp256k1_ecdsa_sign(
                    self.ctx.as_ptr(),
                    &mut ret,
                    msg.as_c_ptr(),
                    sk.as_c_ptr(),
                    ffi::secp256k1_nonce_function_rfc6979,
                    noncedata_ptr
                ),
                1
            );
            Signature::from(ret)
        }
    }

    /// Constructs a signature for `msg` using the secret key `sk` and RFC6979
    /// nonce Requires a signing-capable context.
    pub fn sign_ecdsa(&self, msg: &Message, sk: &SecretKey) -> Signature {
        self.sign_ecdsa_with_noncedata_pointer(msg, sk, None)
    }

    /// Constructs a signature for `msg` using the secret key `sk` and RFC6979
    /// nonce and includes 32 bytes of noncedata in the nonce generation via
    /// inclusion in one of the hash operations during nonce generation.
    /// This is useful when multiple signatures are needed for the same
    /// Message and SecretKey while still using RFC6979. Requires a
    /// signing-capable context.
    pub fn sign_ecdsa_with_noncedata(
        &self,
        msg: &Message,
        sk: &SecretKey,
        noncedata: &[u8; 32],
    ) -> Signature {
        self.sign_ecdsa_with_noncedata_pointer(msg, sk, Some(noncedata))
    }

    fn sign_grind_with_check(
        &self,
        msg: &Message,
        sk: &SecretKey,
        check: impl Fn(&ffi::Signature) -> bool,
    ) -> Signature {
        let mut entropy_p: *const ffi::types::c_void = ptr::null();
        let mut counter: u32 = 0;
        let mut extra_entropy = [0u8; 32];
        loop {
            unsafe {
                let mut ret = ffi::Signature::new();
                // We can assume the return value because it's not possible to
                // construct an invalid signature from a valid
                // `Message` and `SecretKey`
                assert_eq!(
                    ffi::secp256k1_ecdsa_sign(
                        self.ctx.as_ptr(),
                        &mut ret,
                        msg.as_c_ptr(),
                        sk.as_c_ptr(),
                        ffi::secp256k1_nonce_function_rfc6979,
                        entropy_p
                    ),
                    1
                );
                if check(&ret) {
                    return Signature::from(ret);
                }

                counter += 1;
                extra_entropy[..4].copy_from_slice(&counter.to_le_bytes());
                entropy_p =
                    extra_entropy.as_c_ptr().cast::<ffi::types::c_void>();

                // When fuzzing, these checks will usually spinloop forever, so
                // just short-circuit them.
                #[cfg(secp256k1_fuzz)]
                return Signature::from(ret);
            }
        }
    }

    /// Constructs a signature for `msg` using the secret key `sk`, RFC6979
    /// nonce and "grinds" the nonce by passing extra entropy if necessary
    /// to produce a signature that is less than 71 - `bytes_to_grind`
    /// bytes. The number of signing operation performed by this function is
    /// exponential in the number of bytes grinded.
    /// Requires a signing capable context.
    pub fn sign_ecdsa_grind_r(
        &self,
        msg: &Message,
        sk: &SecretKey,
        bytes_to_grind: usize,
    ) -> Signature {
        let len_check =
            |s: &ffi::Signature| der_length_check(s, 71 - bytes_to_grind);
        self.sign_grind_with_check(msg, sk, len_check)
    }

    /// Constructs a signature for `msg` using the secret key `sk`, RFC6979
    /// nonce and "grinds" the nonce by passing extra entropy if necessary
    /// to produce a signature that is less than 71 bytes and compatible
    /// with the low r signature implementation of bitcoin core. In average,
    /// this function will perform two signing operations.
    /// Requires a signing capable context.
    pub fn sign_ecdsa_low_r(&self, msg: &Message, sk: &SecretKey) -> Signature {
        self.sign_grind_with_check(msg, sk, compact_sig_has_zero_first_bit)
    }
}

impl<C: Verification> Secp256k1<C> {
    /// Checks that `sig` is a valid ECDSA signature for `msg` using the public
    /// key `pubkey`. Returns `Ok(())` on success. Note that this function
    /// cannot be used for Bitcoin consensus checking since there may exist
    /// signatures which OpenSSL would verify but not libsecp256k1, or
    /// vice-versa. Requires a verify-capable context.
    ///
    /// ```rust
    /// # #[cfg(all(feature = "rand", feature = "std"))] {
    /// # use ecash_secp256k1::{rand, Secp256k1, Message, Error};
    /// #
    /// # let secp = Secp256k1::new();
    /// # let (secret_key, public_key) =
    /// #     secp.generate_keypair(&mut rand::thread_rng());
    /// #
    /// let message = Message::from_digest([0xab; 32]);
    /// let sig = secp.sign_ecdsa(&message, &secret_key);
    /// assert_eq!(secp.verify_ecdsa(&message, &sig, &public_key), Ok(()));
    ///
    /// let message = Message::from_digest([0xcd; 32]);
    /// assert_eq!(
    ///     secp.verify_ecdsa(&message, &sig, &public_key),
    ///     Err(Error::IncorrectSignature)
    /// );
    /// # }
    /// ```
    #[inline]
    pub fn verify_ecdsa(
        &self,
        msg: &Message,
        sig: &Signature,
        pk: &PublicKey,
    ) -> Result<(), Error> {
        unsafe {
            if ffi::secp256k1_ecdsa_verify(
                self.ctx.as_ptr(),
                sig.as_c_ptr(),
                msg.as_c_ptr(),
                pk.as_c_ptr(),
            ) == 0
            {
                Err(Error::IncorrectSignature)
            } else {
                Ok(())
            }
        }
    }
}

pub(crate) fn compact_sig_has_zero_first_bit(sig: &ffi::Signature) -> bool {
    let mut compact = [0u8; 64];
    unsafe {
        let err = ffi::secp256k1_ecdsa_signature_serialize_compact(
            ffi::secp256k1_context_no_precomp,
            compact.as_mut_c_ptr(),
            sig,
        );
        debug_assert!(err == 1);
    }
    compact[0] < 0x80
}

pub(crate) fn der_length_check(sig: &ffi::Signature, max_len: usize) -> bool {
    let mut ser_ret = [0u8; 72];
    let mut len: usize = ser_ret.len();
    unsafe {
        let err = ffi::secp256k1_ecdsa_signature_serialize_der(
            ffi::secp256k1_context_no_precomp,
            ser_ret.as_mut_c_ptr(),
            &mut len,
            sig,
        );
        debug_assert!(err == 1);
    }
    len <= max_len
}

#[cfg(test)]
mod tests {
    use crate::ecdsa::Signature;
    use crate::Scalar;

    #[test]
    fn test_from_compact_min_r_and_min_s() {
        // From libsecp256k1: "The signature must consist of a 32-byte big
        // endian R value, followed by a 32-byte big endian S value. If
        // R or S fall outside of [0..order-1], the encoding is invalid.
        // R and S with value 0 are allowed in the encoding."
        let r = Scalar::ZERO;
        let s = Scalar::ZERO;
        let mut bytes: [u8; 64] = [0; 64];
        bytes[..32].copy_from_slice(&r.to_be_bytes());
        bytes[32..].copy_from_slice(&s.to_be_bytes());

        assert!(Signature::from_compact(&bytes).is_ok())
    }

    #[test]
    fn test_from_compact_max_r_and_max_s() {
        let r = Scalar::MAX;
        let s = Scalar::MAX;
        let mut bytes: [u8; 64] = [0; 64];
        bytes[..32].copy_from_slice(&r.to_be_bytes());
        bytes[32..].copy_from_slice(&s.to_be_bytes());

        assert!(Signature::from_compact(&bytes).is_ok())
    }

    #[test]
    fn test_from_compact_invalid_r() {
        let r = Scalar::MAX;
        let s = Scalar::MAX;
        let mut bytes: [u8; 64] = [0; 64];
        bytes[..32].copy_from_slice(&r.to_be_bytes());
        bytes[32..].copy_from_slice(&s.to_be_bytes());
        bytes[31] += 1;

        assert!(Signature::from_compact(&bytes).is_err())
    }

    #[test]
    fn test_from_compact_invalid_s() {
        let r = Scalar::MAX;
        let s = Scalar::MAX;
        let mut bytes: [u8; 64] = [0; 64];
        bytes[..32].copy_from_slice(&r.to_be_bytes());
        bytes[32..].copy_from_slice(&s.to_be_bytes());
        bytes[63] += 1;

        assert!(Signature::from_compact(&bytes).is_err())
    }
}
