// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for common structs for SLP and ALP transactions.

use bitcoinsuite_core::hash::ShaRmd160;
use bytes::Bytes;
use serde::{Deserialize, Serialize};

use crate::{token_id::TokenId, token_type::TokenType};

/// SLP or ALP amount
pub type Amount = u64;

/// Common token info identifying tokens, which are essential for verification.
/// A token ID uniquely determines the protocol and token type, and bundling
/// them like this makes mixing protocols or token types more difficult.
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
pub struct TokenMeta {
    /// Unique token ID, which is the txid of the GENESIS tx for this token.
    pub token_id: TokenId,
    /// Token type within the protocol, defining token rules etc.
    pub token_type: TokenType,
}

/// SLP or ALP tx type, indicating what token action to perform
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
pub enum TxType {
    /// Create a new token with its own token ID
    GENESIS,
    /// Issue new tokens into existence
    MINT,
    /// Transfer tokens
    SEND,
    /// Remove tokens from supply
    BURN,
    /// Unknown tx type
    UNKNOWN,
}

/// "Taint" of a UTXO, e.g a token amount or mint baton
#[derive(Clone, Copy, Debug, Deserialize, Eq, Hash, PartialEq, Serialize)]
pub enum TokenVariant {
    /// UTXO has a token amount that can be transferred
    Amount(Amount),
    /// UTXO can be used to mint new tokens
    MintBaton,
    /// UTXO has a new unknown token type.
    /// This exists to gracefully introduce new token types, so wallets don't
    /// accidentally burn them.
    Unknown(u8),
}

/// A [`TokenVariant`] which also stores at which index the token metadata is
/// stored. Token transactions can involve multiple tokens, and this allows us
/// to distinguish them cleanly by referencing a token in a list of tokens.
#[derive(Clone, Copy, Debug, Eq, Hash, PartialEq)]
pub struct TokenOutput {
    /// Index of the token metadata in the tx.
    pub token_idx: usize,
    /// Amount of the token, or whether it's a mint baton, or an unknown token.
    pub variant: TokenVariant,
}

/// A [`TokenVariant`] which also stores the [`TokenMeta`] of the token.
/// This is similar to [`TokenOutput`] but stores the token metadata within, so
/// it doesn't have to reference a list of tokens.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Token {
    /// Which token ID etc. this token has.
    pub meta: TokenMeta,
    /// Amount of the token, or whether it's a mint baton, or an unknown token.
    pub variant: TokenVariant,
}

/// GENESIS transactions can contain some extra info, some of which is important
/// for verification (e.g. `mint_vault_scripthash`), and other which is
/// indicating wallets and explorers how to display tokens.
#[derive(
    Clone, Debug, Default, Deserialize, PartialEq, Eq, Hash, Serialize,
)]
pub struct GenesisInfo {
    /// Short ticker of the token, like used on exchanges
    pub token_ticker: Bytes,
    /// Long name of the token
    pub token_name: Bytes,
    /// For SLP Token Type 2 txs; define which script hash input is required
    /// for MINT txs to be valid.
    pub mint_vault_scripthash: Option<ShaRmd160>,
    /// URL for this token, can be used to reference a common document etc.
    /// On SLP, this is also called "token_document_url".
    pub url: Bytes,
    /// For SLP: "token_document_hash", these days mostly unused
    pub hash: Option<[u8; 32]>,
    /// For ALP; arbitrary data attached with the token
    pub data: Option<Bytes>,
    /// For ALP; public key for signing messages by the original creator
    pub auth_pubkey: Option<Bytes>,
    /// How many decimal places to use when displaying the token.
    /// Token amounts are stored in their "base" form, but should be displayed
    /// as `base_amount * 10^-decimals`. E.g. a base amount of 12345 and
    /// decimals of 4 should be displayed as "1.2345".
    pub decimals: u8,
}

impl TokenVariant {
    /// Amount associated with the token variant.
    pub fn amount(&self) -> Amount {
        match self {
            &TokenVariant::Amount(amount) => amount,
            TokenVariant::MintBaton => 0,
            TokenVariant::Unknown(_) => 0,
        }
    }

    /// Whether the token variant is a mint baton.
    pub fn is_mint_baton(&self) -> bool {
        *self == TokenVariant::MintBaton
    }
}

impl std::fmt::Display for Token {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self.variant {
            TokenVariant::Amount(amount) => write!(f, "{amount}")?,
            TokenVariant::MintBaton => write!(f, "Mint baton")?,
            TokenVariant::Unknown(_) => {
                return write!(f, "{}", self.meta.token_type)
            }
        };
        write!(f, " of {} ({})", self.meta.token_id, self.meta.token_type)
    }
}

impl GenesisInfo {
    /// Make an empty SLP [`GenesisInfo`].
    pub const fn empty_slp() -> GenesisInfo {
        GenesisInfo {
            token_ticker: Bytes::new(),
            token_name: Bytes::new(),
            mint_vault_scripthash: None,
            url: Bytes::new(),
            hash: None,
            data: None,
            auth_pubkey: None,
            decimals: 0,
        }
    }

    /// Make an empty ALP [`GenesisInfo`].
    pub const fn empty_alp() -> GenesisInfo {
        GenesisInfo {
            token_ticker: Bytes::new(),
            token_name: Bytes::new(),
            mint_vault_scripthash: None,
            url: Bytes::new(),
            hash: None,
            data: Some(Bytes::new()),
            auth_pubkey: Some(Bytes::new()),
            decimals: 0,
        }
    }
}
