// SPDX-License-Identifier: CC0-1.0

//! Support for schnorr signatures.

use core::ptr;

#[cfg(feature = "rand")]
use rand::{CryptoRng, Rng};

use crate::ffi::{self, CPtr};
use crate::schnorr::Signature;
use crate::{
    constants, Error, Message, PublicKey, Secp256k1, SecretKey, Signing,
    Verification,
};

impl<C: Signing> Secp256k1<C> {
    fn sign_schnorrabc_helper(
        &self,
        msg: &Message,
        seckey: &SecretKey,
        nonce_data: *const ffi::types::c_void,
    ) -> Signature {
        unsafe {
            let mut sig = [0u8; constants::SCHNORR_SIGNATURE_SIZE];
            assert_eq!(
                1,
                ffi::secp256k1_schnorr_sign(
                    self.ctx.as_ptr(),
                    sig.as_mut_c_ptr(),
                    msg.as_c_ptr(),
                    seckey.as_c_ptr(),
                    ffi::secp256k1_nonce_function_default,
                    nonce_data
                )
            );

            Signature::from_byte_array(sig)
        }
    }

    /// Creates a schnorr signature internally using the
    /// [`rand::rngs::ThreadRng`] random number generator to generate the
    /// auxiliary random data.
    #[cfg(all(feature = "rand", feature = "std"))]
    pub fn sign_schnorrabc(
        &self,
        msg: &Message,
        seckey: &SecretKey,
    ) -> Signature {
        let mut rng = rand::thread_rng();
        self.sign_schnorrabc_with_rng(msg, seckey, &mut rng)
    }

    /// Create a schnorr signature without using any auxiliary random data.
    pub fn sign_schnorrabc_no_aux_rand(
        &self,
        msg: &Message,
        seckey: &SecretKey,
    ) -> Signature {
        self.sign_schnorrabc_helper(msg, seckey, ptr::null())
    }

    /// Creates a schnorr signature using the given auxiliary random data.
    pub fn sign_schnorrabc_with_aux_rand(
        &self,
        msg: &Message,
        seckey: &SecretKey,
        aux_rand: &[u8; 32],
    ) -> Signature {
        self.sign_schnorrabc_helper(
            msg,
            seckey,
            aux_rand.as_c_ptr() as *const ffi::types::c_void,
        )
    }

    /// Creates a schnorr signature using the given random number generator to
    /// generate the auxiliary random data.
    #[cfg(feature = "rand")]
    pub fn sign_schnorrabc_with_rng<R: Rng + CryptoRng>(
        &self,
        msg: &Message,
        seckey: &SecretKey,
        rng: &mut R,
    ) -> Signature {
        let mut aux = [0u8; 32];
        rng.fill_bytes(&mut aux);
        self.sign_schnorrabc_helper(
            msg,
            seckey,
            aux.as_c_ptr() as *const ffi::types::c_void,
        )
    }
}

impl<C: Verification> Secp256k1<C> {
    /// Verifies a schnorr signature.
    pub fn verify_schnorrabc(
        &self,
        sig: &Signature,
        msg: &Message,
        pubkey: &PublicKey,
    ) -> Result<(), Error> {
        unsafe {
            let ret = ffi::secp256k1_schnorr_verify(
                self.ctx.as_ptr(),
                sig.as_c_ptr(),
                msg.as_c_ptr(),
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

#[cfg(feature = "std")]
#[cfg(test)]
mod tests {
    #[cfg(not(secp256k1_fuzz))]
    macro_rules! hex_32 {
        ($hex:expr) => {{
            let mut result = [0; 32];
            from_hex($hex, &mut result).expect("valid hex string");
            result
        }};
    }

    #[cfg(feature = "rand")]
    fn test_sign_schnorrabc_helper(
        sign: fn(
            &crate::Secp256k1<crate::All>,
            &crate::Message,
            &crate::SecretKey,
            &mut rand::rngs::ThreadRng,
        ) -> crate::schnorr::Signature,
    ) {
        use rand::{thread_rng, RngCore};

        use crate::{All, Message, PublicKey, Secp256k1, SecretKey};
        let secp = Secp256k1::<All>::new();

        let mut rng = thread_rng();
        let seckey = SecretKey::new(&mut rng);
        let pubkey = PublicKey::from_secret_key(&secp, &seckey);
        let mut msg = [0; 32];

        for _ in 0..100 {
            rng.fill_bytes(&mut msg);
            let msg = Message::from_digest(msg);

            let sig = sign(&secp, &msg, &seckey, &mut rng);

            assert!(secp.verify_schnorrabc(&sig, &msg, &pubkey).is_ok());
        }
    }

    #[cfg(feature = "rand")]
    #[test]
    fn test_sign_schnorrabc_with_aux_rand_verify() {
        test_sign_schnorrabc_helper(|secp, msg, seckey, rng| {
            use rand::RngCore;
            let mut aux_rand = [0; 32];
            rng.fill_bytes(&mut aux_rand);
            secp.sign_schnorrabc_with_aux_rand(msg, seckey, &aux_rand)
        })
    }

    #[cfg(feature = "rand")]
    #[test]
    fn test_sign_schnorrabc_with_rng_verify() {
        test_sign_schnorrabc_helper(|secp, msg, seckey, mut rng| {
            secp.sign_schnorrabc_with_rng(msg, seckey, &mut rng)
        })
    }

    #[cfg(feature = "rand")]
    #[test]
    fn test_sign_schnorrabc_verify() {
        test_sign_schnorrabc_helper(|secp, msg, seckey, _| {
            secp.sign_schnorrabc(msg, seckey)
        })
    }

    #[cfg(feature = "rand")]
    #[test]
    fn test_sign_schnorrabc_no_aux_rand_verify() {
        test_sign_schnorrabc_helper(|secp, msg, seckey, _| {
            secp.sign_schnorrabc_no_aux_rand(msg, seckey)
        })
    }

    #[cfg(not(secp256k1_fuzz))]
    #[test]
    fn test_schnorrabc_sign() {
        use std::str::FromStr;

        use crate::{
            from_hex, schnorr::Signature, Message, Secp256k1, SecretKey,
        };
        let secp = Secp256k1::<crate::All>::new();

        let hex_msg = hex_32!(
            "E48441762FB75010B2AA31A512B62B4148AA3FB08EB0765D76B252559064A614"
        );
        let msg = Message::from_digest(hex_msg);
        let seckey: SecretKey =
            "688C77BC2D5AAFF5491CF309D4753B732135470D05B7B2CD21ADD0744FE97BEF"
                .parse()
                .unwrap();
        let aux_rand: [u8; 32] = hex_32!(
            "02CCE08E913F22A36C5648D6405A2C7C50106E7AA2F1649E381C7F09D16B80AB"
        );
        let expected_sig = Signature::from_str(
            "EDA588A9DDA57D3003E7DC9FEE6637B963016D4E425202C47EA1F72408AC6EEDEF\
             8E96112AEE39AA242AEB93D0D479FA0EABAA8C5606E7B72346C701B71B1210"
        ).unwrap();

        let sig = secp.sign_schnorrabc_with_aux_rand(&msg, &seckey, &aux_rand);

        assert_eq!(expected_sig, sig);
    }

    #[cfg(not(secp256k1_fuzz))]
    #[test]
    fn test_schnorrabc_verify() {
        use std::str::FromStr;

        use crate::{
            from_hex, schnorr::Signature, Message, PublicKey, Secp256k1,
        };

        let secp = Secp256k1::<crate::All>::new();

        let hex_msg = hex_32!(
            "E48441762FB75010B2AA31A512B62B4148AA3FB08EB0765D76B252559064A614"
        );
        let msg = Message::from_digest(hex_msg);
        let sig = Signature::from_str(
            "EDA588A9DDA57D3003E7DC9FEE6637B963016D4E425202C47EA1F72408AC6EEDEF\
             8E96112AEE39AA242AEB93D0D479FA0EABAA8C5606E7B72346C701B71B1210"
        )
        .unwrap();
        let pubkey: PublicKey =
            "03B33CC9EDC096D0A83416964BD3C6247B8FECD256E4EFA7870D2C854BDEB33390\
            ".parse().unwrap();

        assert!(secp.verify_schnorrabc(&sig, &msg, &pubkey).is_ok());
    }
}
