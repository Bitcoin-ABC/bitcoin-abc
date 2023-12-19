// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`TokenType`].

use serde::{Deserialize, Serialize};

use crate::{alp, slp};

/// Token protocol, either SLP or ALP
#[derive(
    Clone,
    Copy,
    Debug,
    Deserialize,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
    Serialize,
)]
pub enum TokenType {
    /// Simple ledger protocol.
    ///
    /// # Spec
    /// https://github.com/badger-cash/slp-specifications/
    ///
    /// Simple Ledger Protocol (SLP) uses the meta data in `OP_RETURN` for the
    /// issuance and transfer of tokens in conjunction with standard
    /// transaction outputs that each represent a number of token units
    /// specified by the sender.
    ///
    /// Consensus on the interpretation of the `OP_RETURN`` outputs is achieved
    /// by token users and market participants adhering to a prescribed set of
    /// simple rules.
    Slp(SlpTokenType),

    /// Augmented ledger protocol.
    ///
    /// # Spec
    /// https://ecashbuilders.notion.site/ALP-a862a4130877448387373b9e6a93dd97
    ///
    /// ALP can be seen as an updated SLP version, where multiple ALP sections
    /// can be encoded in an eMPP-encoded OP_RETURN (see [`crate::empp`] for
    /// the eMPP spec).
    ///
    /// This allows users to mix ALP txs with other protocols, and to do atomic
    /// swaps, etc.
    Alp(AlpTokenType),
}

/// Token type of a token, determining the rules of the token, e.g. fungible,
/// NFT etc.
///
/// See this repo for specifications:
/// https://github.com/badger-cash/slp-specifications/
#[derive(
    Clone,
    Copy,
    Debug,
    Deserialize,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
    Serialize,
)]
pub enum SlpTokenType {
    /// SLP: Fungible token type (identified by 1)
    /// Spec file in repository: slp-token-type-1.md
    Fungible,

    /// SLP: Fungible token type using a MINT vault to issue new tokens
    /// (identified by 2)
    /// Spec file in repository: slp-token-type-2.md
    MintVault,

    /// SLP: Token type defining a group of NFTs (identified by 0x81)
    /// Spec file in repository: slp-nft-1.md
    Nft1Group,

    /// SLP: Non-fungible token type for an individual NFT (identified by 0x41)
    /// Spec file in repository: slp-nft-1.md
    Nft1Child,

    /// ALP or SLP: Unknown token type
    Unknown(u8),
}

/// Token type of a token, determining the rules of the token, e.g. fungible,
/// NFT etc.
#[derive(
    Clone,
    Copy,
    Debug,
    Deserialize,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
    Serialize,
)]
pub enum AlpTokenType {
    /// Standard token type (identified by 0)
    Standard,
    /// Unknown token type
    Unknown(u8),
}

impl SlpTokenType {
    /// Convert the token type to its u8 representation.
    pub fn to_u8(self) -> u8 {
        match self {
            SlpTokenType::Fungible => slp::consts::TOKEN_TYPE_V1,
            SlpTokenType::MintVault => slp::consts::TOKEN_TYPE_V2,
            SlpTokenType::Nft1Group => slp::consts::TOKEN_TYPE_V1_NFT1_GROUP,
            SlpTokenType::Nft1Child => slp::consts::TOKEN_TYPE_V1_NFT1_CHILD,
            SlpTokenType::Unknown(unknown) => unknown,
        }
    }
}

impl AlpTokenType {
    /// Convert the token type to its u8 representation.
    pub fn to_u8(self) -> u8 {
        match self {
            AlpTokenType::Standard => alp::consts::STANDARD_TOKEN_TYPE,
            AlpTokenType::Unknown(unknown) => unknown,
        }
    }
}

impl TokenType {
    /// Whether the token type is for the ALP protocol
    pub fn is_alp(self) -> bool {
        matches!(self, TokenType::Alp(_))
    }

    /// Whether the token type is for the SLP protocol
    pub fn is_slp(self) -> bool {
        matches!(self, TokenType::Slp(_))
    }

    /// Map the token type to u8
    pub fn to_u8(self) -> u8 {
        match self {
            TokenType::Slp(slp) => slp.to_u8(),
            TokenType::Alp(slp) => slp.to_u8(),
        }
    }
}

impl std::fmt::Display for SlpTokenType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SlpTokenType::Fungible => write!(f, "FUNGIBLE (V1)"),
            SlpTokenType::MintVault => write!(f, "MINT VAULT (V2)"),
            SlpTokenType::Nft1Group => write!(f, "NFT1 GROUP"),
            SlpTokenType::Nft1Child => write!(f, "NFT1 CHILD"),
            SlpTokenType::Unknown(unknown) => write!(f, "UNKNOWN ({unknown})"),
        }
    }
}

impl std::fmt::Display for AlpTokenType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            AlpTokenType::Standard => write!(f, "STANDARD (V0)"),
            AlpTokenType::Unknown(unknown) => write!(f, "UNKNOWN ({unknown})"),
        }
    }
}

impl std::fmt::Display for TokenType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            TokenType::Slp(slp) => write!(f, "SLP {slp}"),
            TokenType::Alp(alp) => write!(f, "ALP {alp}"),
        }
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_slp_token_type_to_u8() {
        use crate::token_type::SlpTokenType::*;
        assert_eq!(Fungible.to_u8(), 1);
        assert_eq!(MintVault.to_u8(), 2);
        assert_eq!(Nft1Child.to_u8(), 0x41);
        assert_eq!(Nft1Group.to_u8(), 0x81);
        assert_eq!(Unknown(3).to_u8(), 3);
        assert_eq!(Unknown(100).to_u8(), 100);
    }

    #[test]
    fn test_alp_token_type_to_u8() {
        use crate::token_type::AlpTokenType::*;
        assert_eq!(Standard.to_u8(), 0);
        assert_eq!(Unknown(1).to_u8(), 1);
        assert_eq!(Unknown(3).to_u8(), 3);
        assert_eq!(Unknown(100).to_u8(), 100);
    }
}
