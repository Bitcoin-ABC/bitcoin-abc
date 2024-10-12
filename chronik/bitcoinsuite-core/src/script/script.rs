// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bytes::Bytes;

use crate::{
    error::DataError,
    hash::{Hashed, ShaRmd160},
    script::{
        opcode::*, PubKey, PubKeyVariant, ScriptMut, ScriptOpIter,
        ScriptVariant, UncompressedPubKey,
    },
    ser::{BitcoinSer, BitcoinSerializer},
};

/// A Bitcoin script.
///
/// This is immutable, and uses [`Bytes`] to store the bytecode, making it cheap
/// to copy.
#[derive(Clone, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct Script(Bytes);

impl Script {
    /// Empty script
    #[allow(clippy::declare_interior_mutable_const)]
    pub const EMPTY: Script = Script(Bytes::new());

    /// Create a new script from the given bytecode.
    pub fn new(bytecode: Bytes) -> Self {
        Script(bytecode)
    }

    /// Pay-to-public-key-hash:
    /// `OP_DUP OP_HASH160 <hash> OP_EQUALVERIFY OP_CHECKSIG`
    /// ```
    /// # use bitcoinsuite_core::{script::Script, hash::ShaRmd160};
    /// # use hex_literal::hex;
    /// let hash = ShaRmd160(hex!("00112233445566778899aabbccddeeff00112233"));
    /// let script = Script::p2pkh(&hash);
    /// assert_eq!(
    ///     script.hex(),
    ///     "76a91400112233445566778899aabbccddeeff0011223388ac",
    /// );
    /// ```
    pub fn p2pkh(hash: &ShaRmd160) -> Script {
        let mut script = ScriptMut::with_capacity(2 + 1 + ShaRmd160::SIZE + 2);
        script.put_opcodes([OP_DUP, OP_HASH160]);
        script.put_bytecode(&[ShaRmd160::SIZE as u8]);
        script.put_bytecode(hash.as_le_bytes());
        script.put_opcodes([OP_EQUALVERIFY, OP_CHECKSIG]);
        script.freeze()
    }

    /// Pay-to-script-hash: `OP_HASH160 <script hash> OP_EQUAL`
    /// ```
    /// # use bitcoinsuite_core::{script::Script, hash::ShaRmd160};
    /// # use hex_literal::hex;
    /// let hash = ShaRmd160(hex!("00112233445566778899aabbccddeeff00112233"));
    /// let script = Script::p2sh(&hash);
    /// assert_eq!(
    ///     script.hex(),
    ///     "a91400112233445566778899aabbccddeeff0011223387",
    /// );
    /// ```
    pub fn p2sh(hash: &ShaRmd160) -> Script {
        let mut script = ScriptMut::with_capacity(1 + 1 + ShaRmd160::SIZE + 1);
        script.put_opcodes([OP_HASH160]);
        script.put_bytecode(&[ShaRmd160::SIZE as u8]);
        script.put_bytecode(hash.as_le_bytes());
        script.put_opcodes([OP_EQUAL]);
        script.freeze()
    }

    /// Pay-to-public-key (compressed): `<pubkey> OP_CHECKSIG`
    /// ```
    /// # use bitcoinsuite_core::{script::{PubKey, Script}, hash::ShaRmd160};
    /// # use hex_literal::hex;
    /// let pubkey = PubKey(hex!(
    ///     "0200112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"
    /// ));
    /// let script = Script::p2pk(&pubkey);
    /// assert_eq!(
    ///     script.hex(),
    ///     "210200112233445566778899aabbccddeeff00112233445566778899aabbccddee\
    ///      ffac",
    /// );
    /// ```
    pub fn p2pk(pubkey: &PubKey) -> Script {
        let mut script = ScriptMut::with_capacity(1 + PubKey::SIZE + 1);
        script.put_bytecode(&[PubKey::SIZE as u8]);
        script.put_bytecode(pubkey.as_slice());
        script.put_opcodes([OP_CHECKSIG]);
        script.freeze()
    }

    /// Pay-to-public-key (uncompressed): `<pubkey> OP_CHECKSIG`
    /// ```
    /// # use bitcoinsuite_core::{
    /// #     script::{UncompressedPubKey, Script},
    /// #     hash::ShaRmd160,
    /// # };
    /// # use hex_literal::hex;
    /// let pubkey = UncompressedPubKey(hex!(
    ///     "0400112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"
    ///     "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff"
    /// ));
    /// let script = Script::p2pk_uncompressed(&pubkey);
    /// assert_eq!(
    ///     script.hex(),
    ///     "410400112233445566778899aabbccddeeff00112233445566778899aabbccddee\
    ///      ff00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff\
    ///      ac",
    /// );
    /// ```
    pub fn p2pk_uncompressed(pubkey: &UncompressedPubKey) -> Script {
        let mut script =
            ScriptMut::with_capacity(1 + UncompressedPubKey::SIZE + 1);
        script.put_bytecode(&[UncompressedPubKey::SIZE as u8]);
        script.put_bytecode(pubkey.as_ref());
        script.put_opcodes([OP_CHECKSIG]);
        script.freeze()
    }

    /// Return the bytecode of the script.
    /// ```
    /// # use bitcoinsuite_core::script::Script;
    /// use bytes::Bytes;
    /// let bytecode = Bytes::from(vec![0x51]);
    /// assert_eq!(Script::new(bytecode.clone()).bytecode(), &bytecode);
    /// ```
    pub fn bytecode(&self) -> &Bytes {
        &self.0
    }

    /// Return the bytecode of the script as a [`Vec<u8>`].
    /// ```
    /// # use bitcoinsuite_core::script::Script;
    /// use bytes::Bytes;
    /// let bytecode = Bytes::from(vec![0x51]);
    /// assert_eq!(Script::new(bytecode.clone()).to_vec(), vec![0x51]);
    /// ```
    pub fn to_vec(&self) -> Vec<u8> {
        self.0.to_vec()
    }

    /// Hex of the bytecode.
    /// ```
    /// # use bitcoinsuite_core::script::Script;
    /// use bytes::Bytes;
    /// let bytecode = Bytes::from(vec![0x51]);
    /// assert_eq!(Script::new(bytecode.clone()).hex(), "51");
    /// ```
    pub fn hex(&self) -> String {
        hex::encode(&self.0)
    }

    /// Whether this script is an OP_RETURN script.
    /// ```
    /// # use bitcoinsuite_core::script::Script;
    /// assert!(Script::new(vec![0x6a].into()).is_opreturn());
    /// assert!(Script::new(vec![0x6a, 0x00].into()).is_opreturn());
    /// assert!(!Script::new(vec![0x6f].into()).is_opreturn());
    /// ```
    pub fn is_opreturn(&self) -> bool {
        match self.0.first() {
            Some(&byte) => byte == OP_RETURN.number(),
            None => false,
        }
    }

    /// Iterator over the operations in this script.
    ///
    /// ```
    /// # use bitcoinsuite_core::{
    /// #     script::{opcode::*, Op, Script},
    /// #     error::DataError,
    /// # };
    /// # use hex_literal::hex;
    /// #
    /// // Simple script
    /// let script = Script::new(hex!("0301020387").to_vec().into());
    /// let mut iter = script.iter_ops();
    /// assert_eq!(
    ///     iter.next(),
    ///     Some(Ok(Op::Push(Opcode(3), vec![1, 2, 3].into()))),
    /// );
    /// assert_eq!(iter.next(), Some(Ok(Op::Code(OP_EQUAL))));
    /// assert_eq!(iter.next(), None);
    ///
    /// // Complex script; has invalid op at the end
    /// let script = hex!("6a504c021234004d01001260884cffabcd");
    /// let script = Script::new(script.to_vec().into());
    /// let mut iter = script.iter_ops();
    /// assert_eq!(iter.next(), Some(Ok(Op::Code(OP_RETURN))));
    /// assert_eq!(iter.next(), Some(Ok(Op::Code(OP_RESERVED))));
    /// assert_eq!(
    ///     iter.next(),
    ///     Some(Ok(Op::Push(OP_PUSHDATA1, vec![0x12, 0x34].into()))),
    /// );
    /// assert_eq!(iter.next(), Some(Ok(Op::Code(OP_0))));
    /// assert_eq!(
    ///     iter.next(),
    ///     Some(Ok(Op::Push(OP_PUSHDATA2, vec![0x12].into()))),
    /// );
    /// assert_eq!(iter.next(), Some(Ok(Op::Code(OP_16))));
    /// assert_eq!(iter.next(), Some(Ok(Op::Code(OP_EQUALVERIFY))));
    /// assert_eq!(
    ///     iter.next(),
    ///     Some(Err(DataError::InvalidLength {
    ///         expected: 0xff,
    ///         actual: 2
    ///     })),
    /// );
    /// assert_eq!(iter.next(), None);
    /// ```
    pub fn iter_ops(&self) -> ScriptOpIter {
        ScriptOpIter::new(self.0.clone())
    }

    /// Return the variant of the script (P2PKH, P2SH, P2PK, or Other)
    ///
    /// ```
    /// # use bitcoinsuite_core::{
    /// #     hash::ShaRmd160,
    /// #     script::{
    /// #         PubKey, PubKeyVariant, Script, ScriptVariant,
    /// #         UncompressedPubKey,
    /// #     },
    /// # };
    ///
    /// let hash = ShaRmd160([4; 20]);
    /// assert_eq!(Script::p2pkh(&hash).variant(), ScriptVariant::P2PKH(hash));
    /// assert_eq!(Script::p2sh(&hash).variant(), ScriptVariant::P2SH(hash));
    ///
    /// let pk = PubKey([2; 33]);
    /// assert_eq!(
    ///     Script::p2pk(&pk).variant(),
    ///     ScriptVariant::P2PK(PubKeyVariant::Compressed(pk)),
    /// );
    ///
    /// let uncomp_pk = UncompressedPubKey([4; 65]);
    /// assert_eq!(
    ///     Script::p2pk_uncompressed(&uncomp_pk).variant(),
    ///     ScriptVariant::P2PK(PubKeyVariant::Uncompressed(uncomp_pk)),
    /// );
    ///
    /// assert_eq!(
    ///     Script::default().variant(),
    ///     ScriptVariant::Other(Script::default()),
    /// );
    /// ```
    pub fn variant(&self) -> ScriptVariant {
        // Short-hand constants for easier matching
        const H_SIZE: u8 = ShaRmd160::SIZE as u8;
        const COMP_PK_SIZE: u8 = PubKey::SIZE as u8;
        const UNCOMP_PK_SIZE: u8 = UncompressedPubKey::SIZE as u8;
        const OP_DUP: u8 = OP_DUP::N;
        const OP_HASH160: u8 = OP_HASH160::N;
        const OP_EQUALVERIFY: u8 = OP_EQUALVERIFY::N;
        const OP_CHECKSIG: u8 = OP_CHECKSIG::N;

        match self.bytecode().as_ref() {
            [OP_DUP, OP_HASH160, H_SIZE, hash @ .., OP_EQUALVERIFY, OP_CHECKSIG]
                if hash.len() == ShaRmd160::SIZE =>
            {
                ScriptVariant::P2PKH(ShaRmd160(hash.try_into().unwrap()))
            }
            [OP_HASH160, H_SIZE, hash @ .., OP_EQUAL::N]
                if hash.len() == ShaRmd160::SIZE =>
            {
                ScriptVariant::P2SH(ShaRmd160(hash.try_into().unwrap()))
            }
            [COMP_PK_SIZE, pubkey @ .., OP_CHECKSIG]
                if pubkey.len() == PubKey::SIZE
                    && (pubkey[0] == 0x02 || pubkey[0] == 0x03) =>
            {
                ScriptVariant::P2PK(PubKeyVariant::Compressed(PubKey(
                    pubkey.try_into().unwrap(),
                )))
            }
            [UNCOMP_PK_SIZE, pubkey @ .., OP_CHECKSIG]
                if pubkey.len() == UncompressedPubKey::SIZE
                    && pubkey[0] == 0x04 =>
            {
                ScriptVariant::P2PK(PubKeyVariant::Uncompressed(
                    UncompressedPubKey(pubkey.try_into().unwrap()),
                ))
            }
            _ => ScriptVariant::Other(self.clone()),
        }
    }
}

impl AsRef<[u8]> for Script {
    fn as_ref(&self) -> &[u8] {
        self.0.as_ref()
    }
}

impl BitcoinSer for Script {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        self.0.ser_to(bytes)
    }

    fn deser(data: &mut Bytes) -> Result<Self, DataError> {
        Ok(Script(Bytes::deser(data)?))
    }
}

#[cfg(test)]
mod tests {
    use bytes::Bytes;

    use crate::{
        script::{
            PubKey, PubKeyVariant, Script, ScriptVariant, UncompressedPubKey,
        },
        ser::BitcoinSer,
    };

    fn verify_ser(a: Script, b: &[u8]) {
        assert_eq!(a.ser().as_ref(), b);
        assert_eq!(a.ser_len(), b.len());
        let mut bytes = Bytes::copy_from_slice(b);
        assert_eq!(a, Script::deser(&mut bytes).unwrap());
    }

    #[test]
    fn test_ser_script() {
        verify_ser(Script::default(), &[0x00]);
        verify_ser(Script::new(vec![0x51].into()), &[0x01, 0x51]);
        verify_ser(Script::new(vec![0x51, 0x52].into()), &[0x02, 0x51, 0x52]);
        verify_ser(
            Script::new(vec![4; 0xfd].into()),
            &[[0xfd, 0xfd, 0].as_ref(), &[4; 0xfd]].concat(),
        );
        verify_ser(
            Script::new(vec![5; 0x10000].into()),
            &[[0xfe, 0, 0, 1, 0].as_ref(), &vec![5; 0x10000]].concat(),
        );
    }

    #[test]
    fn test_variant() {
        // Uncompressed pubkeys start with 0x04
        let uncomp_pk = UncompressedPubKey([4; 65]);
        assert_eq!(
            Script::p2pk_uncompressed(&uncomp_pk).variant(),
            ScriptVariant::P2PK(PubKeyVariant::Uncompressed(uncomp_pk)),
        );

        // ... else it is just a nonstandard script
        let not_uncomp_pk = UncompressedPubKey([6; 65]);
        let script = Script::new(
            vec![
                0x41, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0xAC,
            ]
            .into(),
        );
        assert_eq!(
            Script::p2pk_uncompressed(&not_uncomp_pk).variant(),
            ScriptVariant::Other(script),
        );

        // Compressed pubkeys start with 0x02
        let comp_pk_0x02 = PubKey([2; 33]);
        assert_eq!(
            Script::p2pk(&comp_pk_0x02).variant(),
            ScriptVariant::P2PK(PubKeyVariant::Compressed(comp_pk_0x02)),
        );

        // ... or 0x03
        let comp_pk_0x03_data = [
            0x03, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
            0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
            0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
        ];
        let comp_pk_0x03 = PubKey(comp_pk_0x03_data);
        assert_eq!(
            Script::p2pk(&comp_pk_0x03).variant(),
            ScriptVariant::P2PK(PubKeyVariant::Compressed(comp_pk_0x03)),
        );

        // ... else it is just a nonstandard script
        let not_comp_pk = PubKey([6; 33]);
        let script = Script::new(
            vec![
                0x21, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0xAC,
            ]
            .into(),
        );
        assert_eq!(
            Script::p2pk(&not_comp_pk).variant(),
            ScriptVariant::Other(script),
        );

        // This script is a P2PK
        let script_data = vec![
            0x21, 0x03, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
            0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
            0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
            0x06, 0xAC,
        ];
        let script = Script::new(script_data.clone().into());
        assert_eq!(
            script.variant(),
            ScriptVariant::P2PK(PubKeyVariant::Compressed(comp_pk_0x03)),
        );

        // This is a non-standard script
        let script = Script::new(
            vec![
                0x21, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06, 0x06,
                0x06, 0x06, 0x06, 0x06, 0xAC,
            ]
            .into(),
        );
        assert_eq!(script.variant(), ScriptVariant::Other(script));
    }
}
