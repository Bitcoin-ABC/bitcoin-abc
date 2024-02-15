// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::{fmt::Display, str::FromStr};

use thiserror::Error;

use crate::{
    error::DataError,
    hash::{Hashed, ShaRmd160},
    script::{PubKeyVariant, Script},
};

/// Errors indicating a script type couldn't be parsed.
#[derive(Clone, Debug, Error, PartialEq)]
pub enum ScriptTypeError {
    /// Script type unknown.
    #[error("Unknown script type: {0}")]
    UnknownScriptType(String),
}

/// Script variants.
#[derive(Clone, Copy, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum ScriptType {
    /// Pay-to-public-key-hash.
    /// Script: `OP_DUP OP_HASH160 <hash> OP_EQUALVERIFY OP_CHECKSIG`
    P2PKH,
    /// Pay-to-script-hash.
    /// Script: `OP_HASH160 <hash> OP_EQUAL`
    P2SH,
    /// Pay-to-public-key.
    /// Script: `<pubkey> OP_CHECKSIG`
    P2PK,
    /// Other kinds of script.
    Other,
}

/// Script variant, with the script's payload.
#[derive(Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub enum ScriptVariant {
    /// Pay-to-public-key-hash.
    /// Script: `OP_DUP OP_HASH160 <hash> OP_EQUALVERIFY OP_CHECKSIG`
    P2PKH(ShaRmd160),
    /// Pay-to-script-hash.
    /// Script: `OP_HASH160 <hash> OP_EQUAL`
    P2SH(ShaRmd160),
    /// Pay-to-public-key.
    /// Script: `<pubkey> OP_CHECKSIG`
    P2PK(PubKeyVariant),
    /// Other kinds of script.
    Other(Script),
}

impl ScriptVariant {
    /// Try to interpret the payload as the given [`ScriptType`], and return the
    /// corresponding variant. ```
    /// # use bitcoinsuite_core::{
    /// #     hash::ShaRmd160,
    /// #     script::{
    /// #         Script,
    /// #         ScriptType,
    /// #         ScriptVariant,
    /// #         PubKey,
    /// #         PubKeyVariant,
    /// #         UncompressedPubKey,
    /// #     },
    /// # };
    /// # fn main() -> Result<(), Box<dyn std::error::Error>> {
    /// assert_eq!(
    ///     ScriptVariant::from_type_and_payload(ScriptType::P2PKH, &[3; 20])?,
    ///     ScriptVariant::P2PKH(ShaRmd160([3; 20])),
    /// );
    /// assert_eq!(
    ///     ScriptVariant::from_type_and_payload(ScriptType::P2SH, &[4; 20])?,
    ///     ScriptVariant::P2SH(ShaRmd160([4; 20])),
    /// );
    /// assert_eq!(
    ///     ScriptVariant::from_type_and_payload(ScriptType::P2PK, &[2; 33])?,
    ///     ScriptVariant::P2PK(PubKeyVariant::Compressed(PubKey([2; 33]))),
    /// );
    /// assert_eq!(
    ///     ScriptVariant::from_type_and_payload(ScriptType::P2PK, &[4; 65])?,
    ///     ScriptVariant::P2PK(PubKeyVariant::Uncompressed(
    ///         UncompressedPubKey([4; 65])
    ///     )),
    /// );
    /// assert_eq!(
    ///     ScriptVariant::from_type_and_payload(ScriptType::Other, &[1, 2])?,
    ///     ScriptVariant::Other(Script::new(vec![1, 2].into())),
    /// );
    /// # Ok(())
    /// # }
    /// ```
    pub fn from_type_and_payload(
        script_type: ScriptType,
        payload: &[u8],
    ) -> Result<ScriptVariant, DataError> {
        use self::ScriptType::*;
        Ok(match script_type {
            P2PKH => ScriptVariant::P2PKH(ShaRmd160(parse_array(payload)?)),
            P2SH => ScriptVariant::P2SH(ShaRmd160(parse_array(payload)?)),
            P2PK => ScriptVariant::P2PK(payload.try_into()?),
            Other => ScriptVariant::Other(Script::new(payload.to_vec().into())),
        })
    }

    /// ```
    /// # use bitcoinsuite_core::{
    /// #     hash::ShaRmd160,
    /// #     script::{Script, ScriptVariant},
    /// # };
    /// assert_eq!(
    ///     ScriptVariant::P2PKH(ShaRmd160([3; 20])).to_script().hex(),
    ///     "76a914030303030303030303030303030303030303030388ac",
    /// );
    /// assert_eq!(
    ///     ScriptVariant::P2SH(ShaRmd160([2; 20])).to_script().hex(),
    ///     "a914020202020202020202020202020202020202020287",
    /// );
    /// ```
    pub fn to_script(&self) -> Script {
        match self {
            ScriptVariant::P2PKH(hash) => Script::p2pkh(hash),
            ScriptVariant::P2SH(hash) => Script::p2sh(hash),
            ScriptVariant::P2PK(PubKeyVariant::Compressed(pk)) => {
                Script::p2pk(pk)
            }
            ScriptVariant::P2PK(PubKeyVariant::Uncompressed(pk)) => {
                Script::p2pk_uncompressed(pk)
            }
            ScriptVariant::Other(script) => script.clone(),
        }
    }
}

impl FromStr for ScriptType {
    type Err = ScriptTypeError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        match s {
            "p2pkh" => Ok(ScriptType::P2PKH),
            "p2sh" => Ok(ScriptType::P2SH),
            "p2pk" => Ok(ScriptType::P2PK),
            "other" => Ok(ScriptType::Other),
            _ => Err(ScriptTypeError::UnknownScriptType(s.to_string())),
        }
    }
}

impl Display for ScriptVariant {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ScriptVariant::P2PKH(pkh) => write!(f, "p2pkh({})", pkh.hex_le()),
            ScriptVariant::P2SH(hash) => write!(f, "p2sh({})", hash.hex_le()),
            ScriptVariant::P2PK(PubKeyVariant::Compressed(pk)) => {
                write!(f, "p2pk({})", pk.hex())
            }
            ScriptVariant::P2PK(PubKeyVariant::Uncompressed(pk)) => {
                write!(f, "p2pk({})", pk.hex())
            }
            ScriptVariant::Other(other) => write!(f, "other({})", other.hex()),
        }
    }
}

fn parse_array<const N: usize>(payload: &[u8]) -> Result<[u8; N], DataError> {
    payload.try_into().map_err(|_| DataError::InvalidLength {
        expected: N,
        actual: payload.len(),
    })
}

#[cfg(test)]
mod tests {
    use hex_literal::hex;

    use crate::{
        error::DataError,
        hash::ShaRmd160,
        script::{
            PubKey, PubKeyVariant, Script, ScriptType, ScriptTypeError,
            ScriptVariant, UncompressedPubKey,
        },
    };

    #[test]
    fn test_script_type() -> Result<(), ScriptTypeError> {
        assert_eq!("p2pkh".parse::<ScriptType>()?, ScriptType::P2PKH);
        assert_eq!("p2sh".parse::<ScriptType>()?, ScriptType::P2SH);
        assert_eq!("p2pk".parse::<ScriptType>()?, ScriptType::P2PK);
        assert_eq!("other".parse::<ScriptType>()?, ScriptType::Other);
        assert_eq!(
            "foobar".parse::<ScriptType>(),
            Err(ScriptTypeError::UnknownScriptType("foobar".to_string())),
        );
        Ok(())
    }

    #[test]
    fn test_script_variant() -> Result<(), ScriptTypeError> {
        assert_eq!(
            ScriptVariant::from_type_and_payload(ScriptType::P2PKH, &[2; 33])
                .unwrap_err(),
            DataError::InvalidLength {
                expected: 20,
                actual: 33,
            },
        );
        assert_eq!(
            ScriptVariant::from_type_and_payload(ScriptType::P2SH, &[2; 33])
                .unwrap_err(),
            DataError::InvalidLength {
                expected: 20,
                actual: 33,
            },
        );
        assert_eq!(
            ScriptVariant::from_type_and_payload(ScriptType::P2PK, &[2; 20])
                .unwrap_err(),
            DataError::InvalidLengthMulti {
                expected: vec![33, 65],
                actual: 20,
            },
        );
        assert_eq!(
            ScriptVariant::from_type_and_payload(ScriptType::P2PK, &[4; 64])
                .unwrap_err(),
            DataError::InvalidLengthMulti {
                expected: vec![33, 65],
                actual: 64,
            },
        );
        Ok(())
    }

    #[test]
    fn test_script_variant_to_string() -> Result<(), ScriptTypeError> {
        use ScriptVariant::*;
        assert_eq!(
            P2PKH(ShaRmd160([1; 20])).to_string(),
            "p2pkh(0101010101010101010101010101010101010101)",
        );
        assert_eq!(
            P2SH(ShaRmd160([2; 20])).to_string(),
            "p2sh(0202020202020202020202020202020202020202)",
        );
        assert_eq!(
            P2PK(PubKeyVariant::Compressed(PubKey([3; 33]))).to_string(),
            "p2pk(030303030303030303030303030303030303030303030303030303030303\
                  030303)",
        );
        assert_eq!(
            P2PK(PubKeyVariant::Uncompressed(UncompressedPubKey([4; 65])))
                .to_string(),
            "p2pk(040404040404040404040404040404040404040404040404040404040404\
                  040404040404040404040404040404040404040404040404040404040404\
                  0404040404)",
        );
        assert_eq!(
            Other(Script::new(hex!("deafbeef").to_vec().into())).to_string(),
            "other(deafbeef)",
        );
        Ok(())
    }
}
