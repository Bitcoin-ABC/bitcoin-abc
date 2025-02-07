// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`TokenTx`].

use crate::{
    color::{FailedColoring, FailedParsing},
    structs::{Atoms, GenesisInfo, Token, TokenMeta, TokenOutput, TxType},
    verify::{BurnError, SpentToken},
};

/// Verified token tx, with calculated burns and errors
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct TokenTx {
    /// Tokens used/referenced in this tx.
    /// If this is from a ColoredTx, the first few sections of that colored tx
    /// will have an entry at the same index of this tx. However, it will
    /// also have additional entries for input tokens that don't have a section
    /// in the colored tx, and for any intentional burns.
    pub entries: Vec<TokenTxEntry>,
    /// Token outputs of the transaction.
    /// These are identical to the outputs from the ColoredTx, except the
    /// invalid outputs are turned to None.
    pub outputs: Vec<Option<TokenOutput>>,
    /// Failed SLP and ALP parsing attempts.
    /// These are identical to those in ColoredTx.
    pub failed_parsings: Vec<FailedParsing>,
}

/// ALP/SLP Token used/referenced in a tx.
/// These come either from the sections of a ColoredTx, or from unannounced
/// tokens fed into the tx.
///
/// We distinguish between "Section" and "Entry":
/// - "Section" conveys that it comes from a section of the OP_RETURN.
/// - "Entry" is more generic and conveys that it can come from a section but
///   also from a burned token input.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TokenTxEntry {
    /// [`TokenMeta`] of this entry.
    pub meta: TokenMeta,
    /// Tx type that introduced this token in the tx, or None if not introduced
    /// (e.g. an unintentional bare burn).
    pub tx_type: Option<TxType>,
    /// [`GenesisInfo`] introduced in this section. Only present for GENESIS
    /// txs
    pub genesis_info: Option<GenesisInfo>,
    /// SLP NFT1 GROUP token
    pub group_token_meta: Option<TokenMeta>,
    /// Whether all input tokens have been burned because of some rule
    /// violation. This includes bare burns.
    pub is_invalid: bool,
    /// How many atoms (aka base tokens) of this token were intentionally
    /// burned (using a BURN)
    pub intentional_burn_atoms: Option<Atoms>,
    /// How many atoms (aka base tokens) were actually burned, independent of
    /// the intentional amount.
    pub actual_burn_atoms: u128,
    /// Whether any mint batons have been burned of this token.
    pub burns_mint_batons: bool,
    /// Burn message that may have caused the tokens to be burned.
    pub burn_error: Option<BurnError>,
    /// SLP allows coloring non-existent outputs. This is the same value from
    /// `ColoredTxSection`.
    pub has_colored_out_of_range: bool,
    /// Colorings that may have caused the tokens to be burned.
    /// This is a list because a tx can have multiple failed coloring attempts
    /// per tx.
    pub failed_colorings: Vec<FailedColoring>,
}

impl TokenTx {
    /// Turn the given [`TokenOutput`] into [`Token`] based on the [`TokenMeta`]
    /// of the entries.
    pub fn token(&self, token_output: &TokenOutput) -> Token {
        Token {
            meta: self.entries[token_output.token_idx].meta,
            variant: token_output.variant,
        }
    }

    /// Turn the given [`TokenOutput`] into [`SpentToken`] based on the
    /// [`TokenMeta`] and `group_token_meta` of the entries
    pub fn spent_token(&self, token_output: &TokenOutput) -> SpentToken {
        let entry = &self.entries[token_output.token_idx];
        SpentToken {
            token: Token {
                meta: entry.meta,
                variant: token_output.variant,
            },
            group_token_meta: entry.group_token_meta,
        }
    }
}
