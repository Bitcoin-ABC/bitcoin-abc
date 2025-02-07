// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`DbTxData`].

use std::collections::BTreeMap;

use bitcoinsuite_slp::{
    structs::{Atoms, Token, TokenMeta, TokenVariant},
    token_id::TokenId,
    token_type::{AlpTokenType, SlpTokenType, TokenType},
    verify::SpentToken,
};
use serde::{Deserialize, Serialize};

use crate::io::TxNum;

/// Bit flag of whether the token tx has the required SLP V2 mint vault script
/// in the list of inputs.
pub const FLAGS_HAS_MINT_VAULT: u8 = 1;

/// u32 index into `token_tx_nums` to know which `token_tx_num` the
/// input/output has.
pub type TokenIdx = u32;

/// Token tx stored in the DB with only the data that cannot be reconstructed
/// from the tx easily.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct DbTokenTx {
    /// All token nums used in the tx, including inputs, outputs,
    /// group_token_id.
    /// This is not ordered in any canonical way.
    pub token_tx_nums: Vec<TxNum>,
    /// Which items in token_nums have which token_num as their group (for
    /// group_token_id) Note that this maps indices: `token_num_idx ->
    /// group_token_num_idx`
    pub group_token_indices: BTreeMap<TokenIdx, TokenIdx>,
    /// Inputs of the tx, reflecting the tx inputs 1-to-1
    pub inputs: Vec<DbToken>,
    /// Outputs of the tx, reflecting the tx outputs 1-to-1
    pub outputs: Vec<DbToken>,
    /// Bit flags of the tx, e.g. whether the mint vault input is present
    pub flags: u8,
}

/// Token from the DB.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub enum DbToken {
    /// No token value
    NoToken,
    /// Token amount in atoms (base tokens)
    Atoms(TokenIdx, Atoms),
    /// Mint baton
    MintBaton(TokenIdx),
    /// Unknown SLP token
    UnknownSlp(u8),
    /// Unknown ALP token
    UnknownAlp(u8),
}

impl DbTokenTx {
    /// Return the token [`TxNum`] of the given [`DbToken`].
    pub fn token_tx_num(&self, db_token: &DbToken) -> Option<TxNum> {
        let idx = db_token.token_num_idx()?;
        self.token_tx_nums.get(idx as usize).copied()
    }

    /// Return the [`TxNum`] of the group token of the given [`DbToken`].
    /// These are set for NFT1 CHILD tokens.
    pub fn group_token_tx_num(&self, db_token: &DbToken) -> Option<TxNum> {
        let idx = db_token.token_num_idx()?;
        let group_idx = *self.group_token_indices.get(&idx)?;
        self.token_tx_nums.get(group_idx as usize).copied()
    }

    /// Build a [`SpentToken`] from a [`DbToken`], using a provided function to
    /// lookup [`TokenMeta`] by [`TxNum`]. `fn_meta` is fallible, and errors
    /// bubble up from a `spent_token` call.
    pub fn spent_token<E>(
        &self,
        db_token: &DbToken,
        fn_meta: impl Fn(TxNum) -> Result<TokenMeta, E>,
    ) -> Result<Option<SpentToken>, E> {
        let (token_num_idx, variant) = match *db_token {
            DbToken::NoToken => return Ok(None),
            DbToken::Atoms(idx, atoms) => (idx, TokenVariant::Atoms(atoms)),
            DbToken::MintBaton(idx) => (idx, TokenVariant::MintBaton),
            DbToken::UnknownSlp(byte) | DbToken::UnknownAlp(byte) => {
                let token_type = match *db_token {
                    DbToken::UnknownSlp(token_type) => {
                        TokenType::Slp(SlpTokenType::Unknown(token_type))
                    }
                    DbToken::UnknownAlp(token_type) => {
                        TokenType::Alp(AlpTokenType::Unknown(token_type))
                    }
                    _ => unreachable!(),
                };
                return Ok(Some(SpentToken {
                    token: Token {
                        meta: TokenMeta {
                            token_id: TokenId::default(),
                            token_type,
                        },
                        variant: TokenVariant::Unknown(byte),
                    },
                    group_token_meta: None,
                }));
            }
        };
        let group_token_tx_num = self
            .group_token_indices
            .get(&token_num_idx)
            .map(|&group_token_num_idx| {
                self.token_tx_nums[group_token_num_idx as usize]
            });
        let token_num_idx = token_num_idx as usize;
        Ok(Some(SpentToken {
            token: Token {
                meta: fn_meta(self.token_tx_nums[token_num_idx])?,
                variant,
            },
            group_token_meta: group_token_tx_num.map(fn_meta).transpose()?,
        }))
    }

    /// Whether the token tx has the required SLP V2 mint vault script in the
    /// list of inputs.
    pub fn has_mint_vault(&self) -> bool {
        (self.flags & FLAGS_HAS_MINT_VAULT) != 0
    }
}

impl DbToken {
    /// Create a new [`DbToken`] but with a different index.
    pub fn with_idx(&self, idx: TokenIdx) -> Self {
        match *self {
            DbToken::Atoms(_, atoms) => DbToken::Atoms(idx, atoms),
            DbToken::MintBaton(_) => DbToken::MintBaton(idx),
            _ => *self,
        }
    }

    /// Return the idx of the token_tx_num the token it pointing to, or None if
    /// it's not pointing to any token_tx_num.
    pub fn token_num_idx(&self) -> Option<TokenIdx> {
        match *self {
            DbToken::NoToken => None,
            DbToken::Atoms(idx, _) => Some(idx),
            DbToken::MintBaton(idx) => Some(idx),
            DbToken::UnknownSlp(_) => None,
            DbToken::UnknownAlp(_) => None,
        }
    }
}
