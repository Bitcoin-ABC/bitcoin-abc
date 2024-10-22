// SPDX-License-Identifier: CC0-1.0

//! Support for schnorr signatures.

use core::{fmt, ptr, str};

#[cfg(feature = "rand")]
use rand::{CryptoRng, Rng};
use secp256k1_sys::SchnorrSigExtraParams;

use crate::ffi::{self, CPtr};
use crate::key::{Keypair, XOnlyPublicKey};
#[cfg(feature = "global-context")]
use crate::SECP256K1;
use crate::{constants, from_hex, Error, Secp256k1, Signing, Verification};

/// Represents a schnorr signature.
#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct Signature([u8; constants::SCHNORR_SIGNATURE_SIZE]);
impl_array_newtype!(Signature, u8, constants::SCHNORR_SIGNATURE_SIZE);
impl_pretty_debug!(Signature);

#[cfg(feature = "serde")]
impl serde::Serialize for Signature {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        if s.is_human_readable() {
            s.collect_str(self)
        } else {
            s.serialize_bytes(&self[..])
        }
    }
}

#[cfg(feature = "serde")]
impl<'de> serde::Deserialize<'de> for Signature {
    fn deserialize<D: serde::Deserializer<'de>>(
        d: D,
    ) -> Result<Self, D::Error> {
        if d.is_human_readable() {
            d.deserialize_str(super::serde_util::FromStrVisitor::new(
                "a hex string representing 64 byte schnorr signature",
            ))
        } else {
            d.deserialize_bytes(super::serde_util::BytesVisitor::new(
                "raw 64 bytes schnorr signature",
                Signature::from_slice,
            ))
        }
    }
}

impl fmt::LowerHex for Signature {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        for ch in &self.0[..] {
            write!(f, "{:02x}", ch)?;
        }
        Ok(())
    }
}

impl fmt::Display for Signature {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        fmt::LowerHex::fmt(self, f)
    }
}

impl str::FromStr for Signature {
    type Err = Error;

    fn from_str(s: &str) -> Result<Signature, Error> {
        let mut res = [0u8; constants::SCHNORR_SIGNATURE_SIZE];
        match from_hex(s, &mut res) {
            Ok(constants::SCHNORR_SIGNATURE_SIZE) => {
                Ok(Signature::from_byte_array(res))
            }
            _ => Err(Error::InvalidSignature),
        }
    }
}

impl Signature {
    /// Construct a `Signature` from a 64 bytes array.
    #[inline]
    pub fn from_byte_array(
        sig: [u8; constants::SCHNORR_SIGNATURE_SIZE],
    ) -> Self {
        Self(sig)
    }

    /// Creates a `Signature` directly from a slice.
    #[inline]
    pub fn from_slice(data: &[u8]) -> Result<Signature, Error> {
        match data.len() {
            constants::SCHNORR_SIGNATURE_SIZE => {
                let mut ret = [0u8; constants::SCHNORR_SIGNATURE_SIZE];
                ret[..].copy_from_slice(data);
                Ok(Signature(ret))
            }
            _ => Err(Error::InvalidSignature),
        }
    }

    /// Returns a signature as a byte array.
    #[inline]
    pub fn to_byte_array(self) -> [u8; constants::SCHNORR_SIGNATURE_SIZE] {
        self.0
    }

    /// Returns a signature as a byte array.
    #[inline]
    pub fn as_byte_array(&self) -> &[u8; constants::SCHNORR_SIGNATURE_SIZE] {
        &self.0
    }

    /// Verifies a schnorr signature for `msg` using `pk` and the global
    /// [`SECP256K1`] context.
    #[inline]
    #[cfg(feature = "global-context")]
    pub fn verify(&self, msg: &[u8], pk: &XOnlyPublicKey) -> Result<(), Error> {
        SECP256K1.verify_schnorr(self, msg, pk)
    }
}

impl<C: Signing> Secp256k1<C> {
    fn sign_schnorr_helper(
        &self,
        msg: &[u8],
        keypair: &Keypair,
        nonce_data: *const ffi::types::c_uchar,
    ) -> Signature {
        unsafe {
            let mut sig = [0u8; constants::SCHNORR_SIGNATURE_SIZE];
            let extra = SchnorrSigExtraParams::new(None, nonce_data.cast());
            assert_eq!(
                1,
                ffi::secp256k1_schnorrsig_sign_custom(
                    self.ctx.as_ptr(),
                    sig.as_mut_c_ptr(),
                    msg.as_c_ptr(),
                    msg.len(),
                    keypair.as_c_ptr(),
                    &extra,
                )
            );

            Signature(sig)
        }
    }

    /// Creates a schnorr signature internally using the
    /// [`rand::rngs::ThreadRng`] random number generator to generate the
    /// auxiliary random data.
    #[cfg(all(feature = "rand", feature = "std"))]
    pub fn sign_schnorr(&self, msg: &[u8], keypair: &Keypair) -> Signature {
        self.sign_schnorr_with_rng(msg, keypair, &mut rand::thread_rng())
    }

    /// Creates a schnorr signature without using any auxiliary random data.
    pub fn sign_schnorr_no_aux_rand(
        &self,
        msg: &[u8],
        keypair: &Keypair,
    ) -> Signature {
        self.sign_schnorr_helper(msg, keypair, ptr::null())
    }

    /// Creates a schnorr signature using the given auxiliary random data.
    pub fn sign_schnorr_with_aux_rand(
        &self,
        msg: &[u8],
        keypair: &Keypair,
        aux_rand: &[u8; 32],
    ) -> Signature {
        self.sign_schnorr_helper(
            msg,
            keypair,
            aux_rand.as_c_ptr() as *const ffi::types::c_uchar,
        )
    }

    /// Creates a schnorr signature using the given random number generator to
    /// generate the auxiliary random data.
    #[cfg(feature = "rand")]
    pub fn sign_schnorr_with_rng<R: Rng + CryptoRng>(
        &self,
        msg: &[u8],
        keypair: &Keypair,
        rng: &mut R,
    ) -> Signature {
        let mut aux = [0u8; 32];
        rng.fill_bytes(&mut aux);
        self.sign_schnorr_helper(
            msg,
            keypair,
            aux.as_c_ptr() as *const ffi::types::c_uchar,
        )
    }
}

impl<C: Verification> Secp256k1<C> {
    /// Verifies a schnorr signature.
    pub fn verify_schnorr(
        &self,
        sig: &Signature,
        msg: &[u8],
        pubkey: &XOnlyPublicKey,
    ) -> Result<(), Error> {
        unsafe {
            let ret = ffi::secp256k1_schnorrsig_verify(
                self.ctx.as_ptr(),
                sig.as_c_ptr(),
                msg.as_c_ptr(),
                msg.len(),
                pubkey.as_c_ptr(),
            );

            if ret == 1 {
                Ok(())
            } else {
                Err(Error::IncorrectSignature)
            }
        }
    }
}

#[cfg(test)]
#[allow(unused_imports)]
mod tests {
    use core::str::FromStr;

    #[cfg(all(feature = "rand", feature = "std"))]
    use rand::rngs::ThreadRng;
    #[cfg(target_arch = "wasm32")]
    use wasm_bindgen_test::wasm_bindgen_test as test;

    use super::*;
    use crate::schnorr::{Keypair, Signature, XOnlyPublicKey};
    use crate::Error::InvalidPublicKey;
    use crate::{constants, from_hex, Message, Secp256k1, SecretKey};

    #[cfg(all(not(secp256k1_fuzz), feature = "alloc"))]
    macro_rules! hex_32 {
        ($hex:expr) => {{
            let mut result = [0u8; 32];
            from_hex($hex, &mut result).expect("valid hex string");
            result
        }};
    }

    #[test]
    #[cfg(all(feature = "rand", feature = "std"))]
    fn schnorr_sign_with_aux_rand_verify() {
        sign_helper(|secp, msg, seckey, rng| {
            let aux_rand = crate::random_32_bytes(rng);
            secp.sign_schnorr_with_aux_rand(msg, seckey, &aux_rand)
        })
    }

    #[test]
    #[cfg(all(feature = "rand", feature = "std"))]
    fn schnor_sign_with_rng_verify() {
        sign_helper(|secp, msg, seckey, rng| {
            secp.sign_schnorr_with_rng(msg, seckey, rng)
        })
    }

    #[test]
    #[cfg(all(feature = "rand", feature = "std"))]
    fn schnorr_sign_verify() {
        sign_helper(|secp, msg, seckey, _| secp.sign_schnorr(msg, seckey))
    }

    #[test]
    #[cfg(all(feature = "rand", feature = "std"))]
    fn schnorr_sign_no_aux_rand_verify() {
        sign_helper(|secp, msg, seckey, _| {
            secp.sign_schnorr_no_aux_rand(msg, seckey)
        })
    }

    #[cfg(all(feature = "rand", feature = "std"))]
    fn sign_helper(
        sign: fn(
            &Secp256k1<crate::All>,
            &[u8],
            &Keypair,
            &mut ThreadRng,
        ) -> Signature,
    ) {
        let secp = Secp256k1::new();

        let mut rng = rand::thread_rng();
        let kp = Keypair::new(&secp, &mut rng);
        let (pk, _parity) = kp.x_only_public_key();

        for _ in 0..100 {
            let msg = crate::random_32_bytes(&mut rand::thread_rng());

            let sig = sign(&secp, &msg, &kp, &mut rng);

            assert!(secp.verify_schnorr(&sig, &msg, &pk).is_ok());
        }
    }

    #[test]
    #[cfg(feature = "alloc")]
    #[cfg(not(secp256k1_fuzz))] // fixed sig vectors can't work with fuzz-sigs
    fn schnorr_sign() {
        let secp = Secp256k1::new();

        let msg = hex_32!(
            "E48441762FB75010B2AA31A512B62B4148AA3FB08EB0765D76B252559064A614"
        );
        let sk = Keypair::from_seckey_str(
            &secp,
            "688C77BC2D5AAFF5491CF309D4753B732135470D05B7B2CD21ADD0744FE97BEF",
        )
        .unwrap();
        let aux_rand: [u8; 32] = hex_32!(
            "02CCE08E913F22A36C5648D6405A2C7C50106E7AA2F1649E381C7F09D16B80AB"
        );
        let expected_sig = Signature::from_str(
            "6470FD1303DDA4FDA717B9837153C24A6EAB377183FC438F939E0ED2B620E9EE50\
             77C4A8B8DCA28963D772A94F5F0DDF598E1C47C137F91933274C7C3EDADCE8"
        )
        .unwrap();

        let sig = secp.sign_schnorr_with_aux_rand(&msg, &sk, &aux_rand);

        assert_eq!(expected_sig, sig);
    }

    #[test]
    #[cfg(not(secp256k1_fuzz))] // fixed sig vectors can't work with fuzz-sigs
    #[cfg(feature = "alloc")]
    fn schnorr_verify() {
        let secp = Secp256k1::new();

        let msg = hex_32!(
            "E48441762FB75010B2AA31A512B62B4148AA3FB08EB0765D76B252559064A614"
        );
        let sig = Signature::from_str(
            "6470FD1303DDA4FDA717B9837153C24A6EAB377183FC438F939E0ED2B620E9EE50\
             77C4A8B8DCA28963D772A94F5F0DDF598E1C47C137F91933274C7C3EDADCE8"
        )
        .unwrap();
        let pubkey = XOnlyPublicKey::from_str(
            "B33CC9EDC096D0A83416964BD3C6247B8FECD256E4EFA7870D2C854BDEB33390",
        )
        .unwrap();

        assert!(secp.verify_schnorr(&sig, &msg, &pubkey).is_ok());
    }

    #[test]
    fn test_serialize() {
        let sig = Signature::from_str(
            "6470FD1303DDA4FDA717B9837153C24A6EAB377183FC438F939E0ED2B620E9EE50\
             77C4A8B8DCA28963D772A94F5F0DDF598E1C47C137F91933274C7C3EDADCE8"
        )
        .unwrap();
        let sig_bytes = sig.to_byte_array();
        let bytes = [
            100, 112, 253, 19, 3, 221, 164, 253, 167, 23, 185, 131, 113, 83,
            194, 74, 110, 171, 55, 113, 131, 252, 67, 143, 147, 158, 14, 210,
            182, 32, 233, 238, 80, 119, 196, 168, 184, 220, 162, 137, 99, 215,
            114, 169, 79, 95, 13, 223, 89, 142, 28, 71, 193, 55, 249, 25, 51,
            39, 76, 124, 62, 218, 220, 232,
        ];
        assert_eq!(sig_bytes, bytes);
    }

    #[test]
    fn test_pubkey_from_slice() {
        assert_eq!(XOnlyPublicKey::from_slice(&[]), Err(InvalidPublicKey));
        assert_eq!(
            XOnlyPublicKey::from_slice(&[1, 2, 3]),
            Err(InvalidPublicKey)
        );
        let pk = XOnlyPublicKey::from_byte_array(&[
            0xB3, 0x3C, 0xC9, 0xED, 0xC0, 0x96, 0xD0, 0xA8, 0x34, 0x16, 0x96,
            0x4B, 0xD3, 0xC6, 0x24, 0x7B, 0x8F, 0xEC, 0xD2, 0x56, 0xE4, 0xEF,
            0xA7, 0x87, 0x0D, 0x2C, 0x85, 0x4B, 0xDE, 0xB3, 0x33, 0x90,
        ]);
        assert!(pk.is_ok());
    }

    #[test]
    #[cfg(all(feature = "rand", feature = "std"))]
    fn test_pubkey_serialize_roundtrip() {
        let secp = Secp256k1::new();
        let kp = Keypair::new(&secp, &mut rand::thread_rng());
        let (pk, _parity) = kp.x_only_public_key();

        let ser = pk.serialize();
        let pubkey2 = XOnlyPublicKey::from_slice(&ser).unwrap();
        assert_eq!(pk, pubkey2);
    }

    #[test]
    #[cfg(feature = "alloc")]
    fn test_xonly_key_extraction() {
        let secp = Secp256k1::new();
        let sk_str =
            "688C77BC2D5AAFF5491CF309D4753B732135470D05B7B2CD21ADD0744FE97BEF";
        let keypair = Keypair::from_seckey_str(&secp, sk_str).unwrap();
        let sk = SecretKey::from_keypair(&keypair);
        assert_eq!(SecretKey::from_str(sk_str).unwrap(), sk);
        let pk = crate::key::PublicKey::from_keypair(&keypair);
        assert_eq!(crate::key::PublicKey::from_secret_key(&secp, &sk), pk);
        let (xpk, _parity) = keypair.x_only_public_key();
        assert_eq!(XOnlyPublicKey::from(pk), xpk);
    }

    #[test]
    fn test_pubkey_from_bad_slice() {
        // Bad sizes
        assert_eq!(
            XOnlyPublicKey::from_slice(
                &[0; constants::SCHNORR_PUBLIC_KEY_SIZE - 1]
            ),
            Err(InvalidPublicKey)
        );
        assert_eq!(
            XOnlyPublicKey::from_slice(
                &[0; constants::SCHNORR_PUBLIC_KEY_SIZE + 1]
            ),
            Err(InvalidPublicKey)
        );

        // Bad parse
        assert_eq!(
            XOnlyPublicKey::from_byte_array(
                &[0xff; constants::SCHNORR_PUBLIC_KEY_SIZE]
            ),
            Err(InvalidPublicKey)
        );
        // In fuzzing mode restrictions on public key validity are much more
        // relaxed, thus the invalid check below is expected to fail.
        #[cfg(not(secp256k1_fuzz))]
        assert_eq!(
            XOnlyPublicKey::from_byte_array(
                &[0x55; constants::SCHNORR_PUBLIC_KEY_SIZE]
            ),
            Err(InvalidPublicKey)
        );
        assert_eq!(XOnlyPublicKey::from_slice(&[]), Err(InvalidPublicKey));
    }

    #[test]
    #[cfg(feature = "std")]
    fn test_pubkey_display_output() {
        #[cfg(not(secp256k1_fuzz))]
        let pk = {
            let secp = Secp256k1::new();
            static SK_BYTES: [u8; 32] = [
                0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x01,
                0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0xff, 0xff, 0x00, 0x00,
                0xff, 0xff, 0x00, 0x00, 0x63, 0x63, 0x63, 0x63, 0x63, 0x63,
                0x63, 0x63,
            ];

            let kp = Keypair::from_seckey_slice(&secp, &SK_BYTES).expect("sk");

            // In fuzzing mode secret->public key derivation is different, so
            // hard-code the expected result.
            let (pk, _parity) = kp.x_only_public_key();
            pk
        };
        #[cfg(secp256k1_fuzz)]
        let pk = XOnlyPublicKey::from_slice(&[
            0x18, 0x84, 0x57, 0x81, 0xf6, 0x31, 0xc4, 0x8f, 0x1c, 0x97, 0x09,
            0xe2, 0x30, 0x92, 0x06, 0x7d, 0x06, 0x83, 0x7f, 0x30, 0xaa, 0x0c,
            0xd0, 0x54, 0x4a, 0xc8, 0x87, 0xfe, 0x91, 0xdd, 0xd1, 0x66,
        ])
        .expect("pk");

        assert_eq!(
            pk.to_string(),
            "18845781f631c48f1c9709e23092067d06837f30aa0cd0544ac887fe91ddd166"
        );
        assert_eq!(
            XOnlyPublicKey::from_str(
                "18845781f631c48f1c9709e23092067d06837f30aa0cd0544ac887fe91ddd1\
                 66"
            )
            .unwrap(),
            pk
        );

        assert!(XOnlyPublicKey::from_str(
            "00000000000000000000000000000000000000000000000000000000000000000"
        )
        .is_err());
        assert!(XOnlyPublicKey::from_str(
            "18845781f631c48f1c9709e23092067d06837f30aa0cd0544ac887fe91ddd16601"
        )
        .is_err());
        assert!(XOnlyPublicKey::from_str(
            "18845781f631c48f1c9709e23092067d06837f30aa0cd0544ac887fe91ddd16"
        )
        .is_err());
        assert!(XOnlyPublicKey::from_str(
            "18845781f631c48f1c9709e23092067d06837f30aa0cd0544ac887fe91ddd1"
        )
        .is_err());
        assert!(XOnlyPublicKey::from_str(
            "xx18845781f631c48f1c9709e23092067d06837f30aa0cd0544ac887fe91ddd1"
        )
        .is_err());

        let long_str: String = "a".repeat(1024 * 1024);
        assert!(XOnlyPublicKey::from_str(&long_str).is_err());
    }

    #[test]
    // In fuzzing mode secret->public key derivation is different, so
    // this test will never correctly derive the static pubkey.
    #[cfg(not(secp256k1_fuzz))]
    #[cfg(all(feature = "rand", feature = "alloc"))]
    fn test_pubkey_serialize() {
        use rand::rngs::mock::StepRng;
        let secp = Secp256k1::new();
        let kp = Keypair::new(&secp, &mut StepRng::new(1, 1));
        let (pk, _parity) = kp.x_only_public_key();
        assert_eq!(
            &pk.serialize()[..],
            &[
                124, 121, 49, 14, 253, 63, 197, 50, 39, 194, 107, 17, 193, 219,
                108, 154, 126, 9, 181, 248, 2, 12, 149, 233, 198, 71, 149, 134,
                250, 184, 154, 229
            ][..]
        );
    }

    #[cfg(not(secp256k1_fuzz))] // fixed sig vectors can't work with fuzz-sigs
    #[test]
    #[cfg(all(feature = "serde", feature = "alloc"))]
    fn test_serde() {
        use serde_test::{assert_tokens, Configure, Token};

        let s = Secp256k1::new();

        let msg = [1; 32];
        let keypair = Keypair::from_seckey_slice(&s, &[2; 32]).unwrap();
        let aux = [3u8; 32];
        let sig = s.sign_schnorr_with_aux_rand(&msg, &keypair, &aux);
        static SIG_BYTES: [u8; constants::SCHNORR_SIGNATURE_SIZE] = [
            0x14, 0xd0, 0xbf, 0x1a, 0x89, 0x53, 0x50, 0x6f, 0xb4, 0x60, 0xf5,
            0x8b, 0xe1, 0x41, 0xaf, 0x76, 0x7f, 0xd1, 0x12, 0x53, 0x5f, 0xb3,
            0x92, 0x2e, 0xf2, 0x17, 0x30, 0x8e, 0x2c, 0x26, 0x70, 0x6f, 0x1e,
            0xeb, 0x43, 0x2b, 0x3d, 0xba, 0x9a, 0x01, 0x08, 0x2f, 0x9e, 0x4d,
            0x4e, 0xf5, 0x67, 0x8a, 0xd0, 0xd9, 0xd5, 0x32, 0xc0, 0xdf, 0xa9,
            0x07, 0xb5, 0x68, 0x72, 0x2d, 0x0b, 0x01, 0x19, 0xba,
        ];
        static SIG_STR: &str = "\
            14d0bf1a8953506fb460f58be141af767fd112535fb3922ef217308e2c26706f1ee\
            b432b3dba9a01082f9e4d4ef5678ad0d9d532c0dfa907b568722d0b0119ba\
        ";

        static PK_BYTES: [u8; 32] = [
            24, 132, 87, 129, 246, 49, 196, 143, 28, 151, 9, 226, 48, 146, 6,
            125, 6, 131, 127, 48, 170, 12, 208, 84, 74, 200, 135, 254, 145,
            221, 209, 102,
        ];
        static PK_STR: &str =
            "18845781f631c48f1c9709e23092067d06837f30aa0cd0544ac887fe91ddd166";
        let pk = XOnlyPublicKey::from_slice(&PK_BYTES).unwrap();

        assert_tokens(&sig.compact(), &[Token::BorrowedBytes(&SIG_BYTES[..])]);
        assert_tokens(&sig.compact(), &[Token::Bytes(&SIG_BYTES[..])]);
        assert_tokens(&sig.compact(), &[Token::ByteBuf(&SIG_BYTES[..])]);

        assert_tokens(&sig.readable(), &[Token::BorrowedStr(SIG_STR)]);
        assert_tokens(&sig.readable(), &[Token::Str(SIG_STR)]);
        assert_tokens(&sig.readable(), &[Token::String(SIG_STR)]);

        assert_tokens(
            &pk.compact(),
            &[
                Token::Tuple { len: 32 },
                Token::U8(24),
                Token::U8(132),
                Token::U8(87),
                Token::U8(129),
                Token::U8(246),
                Token::U8(49),
                Token::U8(196),
                Token::U8(143),
                Token::U8(28),
                Token::U8(151),
                Token::U8(9),
                Token::U8(226),
                Token::U8(48),
                Token::U8(146),
                Token::U8(6),
                Token::U8(125),
                Token::U8(6),
                Token::U8(131),
                Token::U8(127),
                Token::U8(48),
                Token::U8(170),
                Token::U8(12),
                Token::U8(208),
                Token::U8(84),
                Token::U8(74),
                Token::U8(200),
                Token::U8(135),
                Token::U8(254),
                Token::U8(145),
                Token::U8(221),
                Token::U8(209),
                Token::U8(102),
                Token::TupleEnd,
            ],
        );

        assert_tokens(&pk.readable(), &[Token::BorrowedStr(PK_STR)]);
        assert_tokens(&pk.readable(), &[Token::Str(PK_STR)]);
        assert_tokens(&pk.readable(), &[Token::String(PK_STR)]);
    }

    #[test]
    #[cfg(feature = "alloc")]
    #[cfg(not(secp256k1_fuzz))] // fixed sig vectors can't work with fuzz-sigs
    fn bip340_test_vectors() {
        struct TestVector {
            secret_key: Option<[u8; 32]>,
            public_key: [u8; 32],
            aux_rand: Option<[u8; 32]>,
            message: Vec<u8>,
            signature: [u8; 64],
            should_fail_verify: bool,
        }
        fn hex_arr<T: From<[u8; N]>, const N: usize>(s: &str) -> T {
            let mut out = [0; N];
            from_hex(s, &mut out).unwrap();
            out.into()
        }
        let hex_vec = |s: &str| {
            let mut v = vec![0u8; s.len() / 2];
            from_hex(s, v.as_mut_slice()).unwrap();
            v
        };

        let vectors = [
            TestVector {
                secret_key: hex_arr(
                    "0000000000000000000000000000000000000000000000000000000000\
                     000003"
                ),
                public_key: hex_arr(
                    "F9308A019258C31049344F85F89D5229B531C845836F99B08601F113BC\
                     E036F9"
                ),
                aux_rand: hex_arr(
                    "0000000000000000000000000000000000000000000000000000000000\
                     000000"
                ),
                message: hex_vec(
                    "0000000000000000000000000000000000000000000000000000000000\
                     000000"
                ),
                signature: hex_arr(
                    "E907831F80848D1069A5371B402410364BDF1C5F8307B0084C55F1CE2D\
                     CA821525F66A4A85EA8B71E482A74F382D2CE5EBEEE8FDB2172F477DF4\
                     900D310536C0"
                ),
                should_fail_verify: false,
            },
            TestVector {
                secret_key: hex_arr(
                    "B7E151628AED2A6ABF7158809CF4F3C762E7160F38B4DA56A784D90451\
                     90CFEF"
                ),
                public_key: hex_arr(
                    "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B50\
                     2BA659"
                ),
                aux_rand: hex_arr(
                    "0000000000000000000000000000000000000000000000000000000000\
                     000001"
                ),
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                     4E6C89"),
                signature: hex_arr(
                    "6896BD60EEAE296DB48A229FF71DFE071BDE413E6D43F917DC8DCF8C78\
                     DE33418906D11AC976ABCCB20B091292BFF4EA897EFCB639EA871CFA95\
                     F6DE339E4B0A"
                ),
                should_fail_verify: false,
            },
            TestVector {
                secret_key: hex_arr(
                    "C90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B\
                     14E5C9"
                ),
                public_key: hex_arr(
                    "DD308AFEC5777E13121FA72B9CC1B7CC0139715309B086C960E18FD969\
                     774EB8"
                ),
                aux_rand: hex_arr(
                    "C87AA53824B4D7AE2EB035A2B5BBBCCC080E76CDC6D1692C4B0B62D798\
                     E6D906"
                ),
                message: hex_vec(
                    "7E2D58D8B3BCDF1ABADEC7829054F90DDA9805AAB56C77333024B9D0A5\
                     08B75C"
                ),
                signature: hex_arr(
                    "5831AAEED7B44BB74E5EAB94BA9D4294C49BCF2A60728D8B4C200F50DD\
                     313C1BAB745879A5AD954A72C45A91C3A51D3C7ADEA98D82F8481E0E1E\
                     03674A6F3FB7"
                ),
                should_fail_verify: false,
            },
            TestVector {
                secret_key: hex_arr(
                    "0B432B2677937381AEF05BB02A66ECD012773062CF3FA2549E44F58ED2\
                     401710"
                ),
                public_key: hex_arr(
                    "25D1DFF95105F5253C4022F628A996AD3A0D95FBF21D468A1B33F8C160\
                     D8F517"
                ),
                aux_rand: hex_arr(
                    "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF\
                     FFFFFF"
                ),
                message: hex_vec(
                    "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF\
                     FFFFFF"
                ),
                signature: hex_arr(
                    "7EB0509757E246F19449885651611CB965ECC1A187DD51B64FDA1EDC96\
                     37D5EC97582B9CB13DB3933705B32BA982AF5AF25FD78881EBB32771FC\
                     5922EFC66EA3"
                ),
                should_fail_verify: false,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "D69C3509BB99E412E68B0FE8544E72837DFA30746D8BE2AA65975F29D2\
                     2DC7B9"
                ),
                aux_rand: None,
                message: hex_vec(
                    "4DF3C3F68FCC83B27E9D42C90431A72499F17875C81A599B566C9889B9\
                     696703"
                ),
                signature: hex_arr(
                    "00000000000000000000003B78CE563F89A0ED9414F5AA28AD0D96D679\
                     5F9C6376AFB1548AF603B3EB45C9F8207DEE1060CB71C04E80F593060B\
                     07D28308D7F4"
                ),
                should_fail_verify: false,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "EEFDEA4CDB677750A420FEE807EACF21EB9898AE79B9768766E4FAA04A\
                     2D4A34"
                ),
                aux_rand: None,
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                     4E6C89"
                ),
                signature: hex_arr(
                    "6CFF5C3BA86C69EA4B7376F31A9BCB4F74C1976089B2D9963DA2E5543E\
                     17776969E89B4C5564D00349106B8497785DD7D1D713A8AE82B32FA79D\
                     5F7FC407D39B"
                ),
                should_fail_verify: true,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B50\
                     2BA659"
                ),
                aux_rand: None,
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                     4E6C89"
                ),
                signature: hex_arr(
                    "FFF97BD5755EEEA420453A14355235D382F6472F8568A18B2F057A1460\
                     2975563CC27944640AC607CD107AE10923D9EF7A73C643E166BE5EBEAF\
                     A34B1AC553E2"
                ),
                should_fail_verify: true,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B50\
                     2BA659"
                ),
                aux_rand: None,
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                     4E6C89"
                ),
                signature: hex_arr(
                    "1FA62E331EDBC21C394792D2AB1100A7B432B013DF3F6FF4F99FCB33E0\
                     E1515F28890B3EDB6E7189B630448B515CE4F8622A954CFE545735AAEA\
                     5134FCCDB2BD"
                ),
                should_fail_verify: true,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B50\
                     2BA659"
                ),
                aux_rand: None,
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                     4E6C89"
                ),
                signature: hex_arr(
                    "6CFF5C3BA86C69EA4B7376F31A9BCB4F74C1976089B2D9963DA2E5543E\
                     177769961764B3AA9B2FFCB6EF947B6887A226E8D7C93E00C5ED0C1834\
                     FF0D0C2E6DA6"
                ),
                should_fail_verify: true,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B50\
                     2BA659"
                ),
                aux_rand: None,
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                     4E6C89"
                ),
                signature: hex_arr(
                    "0000000000000000000000000000000000000000000000000000000000\
                     000000123DDA8328AF9C23A94C1FEECFD123BA4FB73476F0D594DCB65C\
                     6425BD186051"
                ),
                should_fail_verify: true,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B50\
                     2BA659"
                ),
                aux_rand: None,
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                     4E6C89"
                ),
                signature: hex_arr(
                    "0000000000000000000000000000000000000000000000000000000000\
                     0000017615FBAF5AE28864013C099742DEADB4DBA87F11AC6754F93780\
                     D5A1837CF197"
                ),
                should_fail_verify: true,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B50\
                     2BA659"
                ),
                aux_rand: None,
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                     4E6C89"
                ),
                signature: hex_arr(
                    "4A298DACAE57395A15D0795DDBFD1DCB564DA82B0F269BC70A74F82204\
                     29BA1D69E89B4C5564D00349106B8497785DD7D1D713A8AE82B32FA79D\
                     5F7FC407D39B"
                ),
                should_fail_verify: true,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B50\
                     2BA659"
                ),
                aux_rand: None,
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                     4E6C89"
                ),
                signature: hex_arr(
                    "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFF\
                     FFFC2F69E89B4C5564D00349106B8497785DD7D1D713A8AE82B32FA79D\
                     5F7FC407D39B"
                ),
                should_fail_verify: true,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "DFF1D77F2A671C5F36183726DB2341BE58FEAE1DA2DECED843240F7B50\
                     2BA659"
                ),
                aux_rand: None,
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                    4E6C89"
                ),
                signature: hex_arr(
                    "6CFF5C3BA86C69EA4B7376F31A9BCB4F74C1976089B2D9963DA2E5543E\
                     177769FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD2\
                     5E8CD0364141"
                ),
                should_fail_verify: true,
            },
            TestVector {
                secret_key: None,
                public_key: hex_arr(
                    "778CAA53B4393AC467774D09497A87224BF9FAB6F6E68B23086497324D\
                     6FD117"
                ),
                aux_rand: None,
                message: hex_vec(
                    "243F6A8885A308D313198A2E03707344A4093822299F31D0082EFA98EC\
                     4E6C89"
                ),
                signature: hex_arr(
                    "6CFF5C3BA86C69EA4B7376F31A9BCB4F74C1976089B2D9963DA2E5543E\
                     17776969E89B4C5564D00349106B8497785DD7D1D713A8AE82B32FA79D\
                     5F7FC407D39B"
                ),
                should_fail_verify: true,
            },
            TestVector {
                secret_key: hex_arr(
                    "0340034003400340034003400340034003400340034003400340034003\
                     400340"
                ),
                public_key: hex_arr(
                    "778CAA53B4393AC467774D09497A87224BF9FAB6F6E68B23086497324D\
                     6FD117"
                ),
                aux_rand: hex_arr(
                    "0000000000000000000000000000000000000000000000000000000000\
                     000000"
                ),
                message: hex_vec(""),
                signature: hex_arr(
                    "71535DB165ECD9FBBC046E5FFAEA61186BB6AD436732FCCC25291A5589\
                     5464CF6069CE26BF03466228F19A3A62DB8A649F2D560FAC652827D1AF\
                     0574E427AB63"
                ),
                should_fail_verify: false,
            },
              TestVector {
                secret_key: hex_arr(
                    "0340034003400340034003400340034003400340034003400340034003\
                     400340"
                ),
                public_key: hex_arr(
                    "778CAA53B4393AC467774D09497A87224BF9FAB6F6E68B23086497324D\
                     6FD117"
                ),
                aux_rand: hex_arr(
                    "0000000000000000000000000000000000000000000000000000000000\
                     000000"
                ),
                message: hex_vec("11"),
                signature: hex_arr(
                    "08A20A0AFEF64124649232E0693C583AB1B9934AE63B4C3511F3AE1134\
                     C6A303EA3173BFEA6683BD101FA5AA5DBC1996FE7CACFC5A577D33EC14\
                     564CEC2BACBF"
                ),
                should_fail_verify: false,
            },
            TestVector {
                secret_key: hex_arr(
                    "0340034003400340034003400340034003400340034003400340034003\
                     400340"
                ),
                public_key: hex_arr(
                    "778CAA53B4393AC467774D09497A87224BF9FAB6F6E68B23086497324D\
                     6FD117"
                ),
                aux_rand: hex_arr(
                    "0000000000000000000000000000000000000000000000000000000000\
                     000000"
                ),
                message: hex_vec("0102030405060708090A0B0C0D0E0F1011"),
                signature: hex_arr(
                    "5130F39A4059B43BC7CAC09A19ECE52B5D8699D1A71E3C52DA9AFDB6B5\
                     0AC370C4A482B77BF960F8681540E25B6771ECE1E5A37FD80E5A51897C\
                     5566A97EA5A5"
                ),
                should_fail_verify: false,
            },
            TestVector {
                secret_key: hex_arr(
                    "0340034003400340034003400340034003400340034003400340034003\
                     400340"
                ),
                public_key: hex_arr(
                    "778CAA53B4393AC467774D09497A87224BF9FAB6F6E68B23086497324D\
                     6FD117"
                ),
                aux_rand: hex_arr(
                    "0000000000000000000000000000000000000000000000000000000000\
                     000000"
                ),
                message: hex_vec(
                    "9999999999999999999999999999999999999999999999999999999999\
                     9999999999999999999999999999999999999999999999999999999999\
                     9999999999999999999999999999999999999999999999999999999999\
                     99999999999999999999999999"
                ),
                signature: hex_arr(
                    "403B12B0D8555A344175EA7EC746566303321E5DBFA8BE6F091635163E\
                     CA79A8585ED3E3170807E7C03B720FC54C7B23897FCBA0E9D0B4A06894\
                     CFD249F22367"
                ),
                should_fail_verify: false,
            },
        ];
        let secp = Secp256k1::new();

        for TestVector {
            secret_key,
            public_key,
            aux_rand,
            message,
            signature,
            should_fail_verify,
        } in vectors
        {
            if let (Some(secret_key), Some(aux_rand)) = (secret_key, aux_rand) {
                let keypair =
                    Keypair::from_seckey_slice(&secp, &secret_key).unwrap();
                assert_eq!(
                    keypair.x_only_public_key().0.serialize(),
                    public_key
                );
                let sig = secp
                    .sign_schnorr_with_aux_rand(&message, &keypair, &aux_rand);
                assert_eq!(sig.to_byte_array(), signature);
            }
            let sig = Signature::from_byte_array(signature);
            let is_verified = if let Ok(pubkey) =
                XOnlyPublicKey::from_byte_array(&public_key)
            {
                secp.verify_schnorr(&sig, &message, &pubkey).is_ok()
            } else {
                false
            };
            assert_eq!(is_verified, !should_fail_verify);
        }
    }
}
