// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bytes::Bytes;

use crate::{
    hash::{Hashed, ShaRmd160},
    script::{opcode::*, PubKey, ScriptMut, UncompressedPubKey},
};

/// A Bitcoin script.
///
/// This is immutable, and uses [`Bytes`] to store the bytecode, making it cheap
/// to copy.
#[derive(Clone, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct Script(Bytes);

impl Script {
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
        let mut script = ScriptMut::with_capacity(25);
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
        let mut script = ScriptMut::with_capacity(23);
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
        let mut script = ScriptMut::with_capacity(35);
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
        let mut script = ScriptMut::with_capacity(35);
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
}

impl AsRef<[u8]> for Script {
    fn as_ref(&self) -> &[u8] {
        self.0.as_ref()
    }
}
