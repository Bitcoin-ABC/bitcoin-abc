// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`VerifyContext`].

use std::collections::BTreeMap;

use bitcoinsuite_core::script::Script;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    alp::consts::MAX_TX_INPUTS,
    color::{ColoredTx, ColoredTxSection},
    parsed::ParsedTxType,
    structs::{GenesisInfo, Token, TokenMeta, TokenVariant, TxType},
    token_tx::{TokenTx, TokenTxEntry},
    token_type::{SlpTokenType, TokenType},
    verify::BurnError::*,
};

/// Error how token verification based on inputs failed
#[derive(Clone, Debug, Deserialize, Eq, Error, Hash, PartialEq, Serialize)]
pub enum BurnError {
    /// ALP has an upper limit on the number tx inputs.
    /// Note that given current consensus rules, having this many inputs is not
    /// possible, so this is a failsafe.
    #[error("Too many tx inputs, got {0} but only {} allowed", MAX_TX_INPUTS)]
    TooManyTxInputs(usize),

    /// NFT1 CHILD GENESIS requires an NFT1 GROUP token in the first input
    #[error("Invalid NFT1 CHILD GENESIS: No GROUP token")]
    MissingNft1Group,

    /// MINT requires a mint baton in the inputs
    #[error("Missing MINT baton")]
    MissingMintBaton,

    /// MINT requires a mint vault input
    #[error("Missing MINT vault")]
    MissingMintVault,

    /// SEND transfers cannot have more tokens in the outputs than are supplied
    /// in the inputs.
    #[error("Insufficient token input output sum: {actual} < {required}")]
    InsufficientInputSum {
        /// Required minimum inputs as specified in the outputs
        required: u128,
        /// Actual supplied token amount
        actual: u128,
    },
}

/// Token spent as an input
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SpentToken {
    /// Input token
    pub token: Token,
    /// GROUP token ID and type of the input, if any
    pub group_token_meta: Option<TokenMeta>,
}

/// Context under which to verify a [`ColoredTx`].
#[derive(Debug)]
pub struct VerifyContext<'a> {
    /// Input tokens of the tx
    pub spent_tokens: &'a [Option<SpentToken>],
    /// scriptPubKeys of the inputs of the tx, required only for SLP V2 MINT
    /// txs
    pub spent_scripts: Option<&'a [Script]>,
    /// [`GenesisInfo`] of the tx's token ID, required only for SLP V2 MINT txs
    pub genesis_info: Option<&'a GenesisInfo>,
    /// Override whether a mint vault input is present by setting this to
    /// `true`.
    pub override_has_mint_vault: Option<bool>,
}

struct BareBurn {
    burn_amount: u128,
    burns_mint_batons: bool,
    group_token_meta: Option<TokenMeta>,
}

impl VerifyContext<'_> {
    /// Verify the [`ColoredTx`] under the given context and return a verified
    /// [`TokenTx`].
    pub fn verify(&self, tx: ColoredTx) -> TokenTx {
        let mut entries = Vec::new();
        for section in &tx.sections {
            entries.push(self.verify_section(&tx, section));
        }

        // Add entries for standalone intentional burns without any
        // corresponding existing sections
        for intentional_burn in &tx.intentional_burns {
            if !entries.iter().any(|burn| {
                burn.meta.token_id == intentional_burn.meta.token_id
            }) {
                entries.push(TokenTxEntry {
                    meta: intentional_burn.meta,
                    tx_type: Some(TxType::BURN),
                    genesis_info: None,
                    group_token_meta: None,
                    is_invalid: false,
                    intentional_burn_amount: Some(intentional_burn.amount),
                    actual_burn_amount: 0,
                    burns_mint_batons: false,
                    burn_error: None,
                    has_colored_out_of_range: false,
                    failed_colorings: vec![],
                });
            }
        }

        let bare_burns = self.calc_bare_burns(&tx, &entries);

        // Add failed colorings to the matching entry, or add a new one
        for failed_coloring in tx.failed_colorings {
            if let Some(entry) = entries
                .iter_mut()
                .find(|entry| entry.meta == failed_coloring.parsed.meta)
            {
                entry.failed_colorings.push(failed_coloring);
                continue;
            }
            entries.push(TokenTxEntry {
                meta: failed_coloring.parsed.meta,
                tx_type: Some(failed_coloring.parsed.tx_type.tx_type()),
                genesis_info: match &failed_coloring.parsed.tx_type {
                    ParsedTxType::Genesis(genesis) => {
                        Some(genesis.info.clone())
                    }
                    _ => None,
                },
                group_token_meta: None,
                is_invalid: true,
                intentional_burn_amount: None,
                actual_burn_amount: 0,
                burns_mint_batons: false,
                burn_error: None,
                has_colored_out_of_range: false,
                failed_colorings: vec![failed_coloring],
            });
        }

        // Update entries for bare burn or add them
        for (burn_meta, bare_burn) in bare_burns {
            if let Some(entry) =
                entries.iter_mut().find(|entry| entry.meta == *burn_meta)
            {
                if bare_burn.burns_mint_batons {
                    entry.is_invalid = true;
                }
                entry.actual_burn_amount = bare_burn.burn_amount;
                entry.burns_mint_batons = bare_burn.burns_mint_batons;
                entry.group_token_meta = bare_burn.group_token_meta;
                continue;
            }
            entries.push(TokenTxEntry {
                meta: *burn_meta,
                tx_type: None,
                genesis_info: None,
                group_token_meta: bare_burn.group_token_meta,
                is_invalid: true,
                intentional_burn_amount: None,
                actual_burn_amount: bare_burn.burn_amount,
                burns_mint_batons: bare_burn.burns_mint_batons,
                burn_error: None,
                has_colored_out_of_range: false,
                failed_colorings: vec![],
            });
        }

        let outputs = tx
            .outputs
            .into_iter()
            .map(|output| -> Option<_> {
                let entry = &entries[output.as_ref()?.token_idx];
                if entry.is_invalid {
                    return None;
                }
                output
            })
            .collect::<Vec<_>>();
        TokenTx {
            entries,
            outputs,
            failed_parsings: tx.failed_parsings,
        }
    }

    fn verify_section(
        &self,
        tx: &ColoredTx,
        section: &ColoredTxSection,
    ) -> TokenTxEntry {
        let input_sum = self.calc_input_sum(&section.meta);

        // Template entry with either zero defaults or copied over from the
        // colored section.
        let entry = TokenTxEntry {
            meta: section.meta,
            tx_type: Some(section.tx_type),
            genesis_info: section.genesis_info.clone(),
            group_token_meta: self.inherited_group_token_meta(&section.meta),
            is_invalid: false,
            intentional_burn_amount: self
                .intentional_burn_amount(tx, &section.meta),
            actual_burn_amount: 0,
            burns_mint_batons: false,
            burn_error: None,
            has_colored_out_of_range: section.has_colored_out_of_range,
            failed_colorings: vec![],
        };

        // ALP only allows up to 2**15 inputs
        if section.meta.token_type.is_alp()
            && self.spent_tokens.len() > MAX_TX_INPUTS
        {
            return TokenTxEntry {
                is_invalid: true,
                actual_burn_amount: input_sum,
                burns_mint_batons: self.has_mint_baton(&section.meta),
                burn_error: Some(TooManyTxInputs(self.spent_tokens.len())),
                ..entry
            };
        }

        match section.tx_type {
            // NFT1 CHILD tokens have to an NFT1 GROUP token at the 1st input
            TxType::GENESIS
                if section.meta.token_type
                    == TokenType::Slp(SlpTokenType::Nft1Child) =>
            {
                match self.spent_tokens.get(0) {
                    Some(Some(spent_token))
                        if spent_token.token.meta.token_type
                            == TokenType::Slp(SlpTokenType::Nft1Group)
                            && spent_token.token.variant.amount() > 0 =>
                    {
                        TokenTxEntry {
                            group_token_meta: Some(spent_token.token.meta),
                            ..entry
                        }
                    }
                    _ => TokenTxEntry {
                        is_invalid: true,
                        burn_error: Some(MissingNft1Group),
                        ..entry
                    },
                }
            }

            // All other GENESIS txs are self-evident
            TxType::GENESIS => entry,

            // SLP V2 Mint Vault must have a given Script as input
            TxType::MINT if section.is_mint_vault_mint() => {
                if self.has_mint_vault() {
                    return TokenTxEntry {
                        actual_burn_amount: input_sum,
                        ..entry
                    };
                }
                TokenTxEntry {
                    is_invalid: true,
                    actual_burn_amount: input_sum,
                    burn_error: Some(MissingMintVault),
                    ..entry
                }
            }

            // All other MINTs must have a matching mint baton
            TxType::MINT => {
                if self.has_mint_baton(&section.meta) {
                    return TokenTxEntry {
                        actual_burn_amount: input_sum,
                        ..entry
                    };
                }
                TokenTxEntry {
                    is_invalid: true,
                    actual_burn_amount: input_sum,
                    burn_error: Some(MissingMintBaton),
                    ..entry
                }
            }

            // SEND cannot spent more than came into the tx as inputs
            TxType::SEND if input_sum < section.required_input_sum => {
                TokenTxEntry {
                    is_invalid: true,
                    actual_burn_amount: input_sum,
                    burns_mint_batons: self.has_mint_baton(&section.meta),
                    burn_error: Some(InsufficientInputSum {
                        required: section.required_input_sum,
                        actual: input_sum,
                    }),
                    ..entry
                }
            }

            // Valid SEND
            TxType::SEND => {
                let output_sum = self.calc_output_sum(tx, &section.meta);
                let actual_burn_amount = input_sum - output_sum;
                TokenTxEntry {
                    actual_burn_amount,
                    burns_mint_batons: self.has_mint_baton(&section.meta),
                    ..entry
                }
            }

            // UNKNOWN txs are self-evident
            TxType::UNKNOWN => entry,

            TxType::BURN => unreachable!(
                "BURNs are only in intentional_burns, not in sections"
            ),
        }
    }

    fn has_mint_baton(&self, meta: &TokenMeta) -> bool {
        self.spent_tokens.iter().flatten().any(|spent_token| {
            &spent_token.token.meta == meta
                && spent_token.token.variant.is_mint_baton()
        })
    }

    fn has_mint_vault(&self) -> bool {
        if let Some(override_has_mint_vault) = self.override_has_mint_vault {
            return override_has_mint_vault;
        }
        let Some(spent_scripts) = self.spent_scripts else {
            panic!(
                "VerifyContext used incorrectly; spent_scripts must be \
                 present for SLP V2 Mint Vault token types"
            );
        };
        let Some(genesis_info) = self.genesis_info else {
            return false;
        };
        let Some(scripthash) = &genesis_info.mint_vault_scripthash else {
            return false;
        };
        let script = Script::p2sh(scripthash);
        spent_scripts
            .iter()
            .any(|spent_script| spent_script == &script)
    }

    fn calc_input_sum(&self, meta: &TokenMeta) -> u128 {
        self.spent_tokens
            .iter()
            .flatten()
            .filter(|token| &token.token.meta == meta)
            .map(|token| token.token.variant.amount() as u128)
            .sum()
    }

    fn calc_output_sum(&self, tx: &ColoredTx, meta: &TokenMeta) -> u128 {
        tx.outputs
            .iter()
            .flatten()
            .filter(|token| &tx.sections[token.token_idx].meta == meta)
            .map(|token| token.variant.amount() as u128)
            .sum()
    }

    fn inherited_group_token_meta(
        &self,
        meta: &TokenMeta,
    ) -> Option<TokenMeta> {
        self.spent_tokens
            .iter()
            .flatten()
            .find(|token| &token.token.meta == meta)
            .and_then(|token| token.group_token_meta)
    }

    fn intentional_burn_amount(
        &self,
        tx: &ColoredTx,
        meta: &TokenMeta,
    ) -> Option<u64> {
        tx.intentional_burns
            .iter()
            .find(|burn| &burn.meta == meta)
            .map(|burn| burn.amount)
    }

    // Bare burns: spent tokens without a corresponding section
    fn calc_bare_burns(
        &self,
        tx: &ColoredTx,
        entries: &[TokenTxEntry],
    ) -> BTreeMap<&TokenMeta, BareBurn> {
        let mut bare_burns = BTreeMap::new();
        for (input_idx, input) in self.spent_tokens.iter().enumerate() {
            let Some(input) = input else { continue };

            // We don't consider NFT1 GROUP inputs for NFT1 CHILD GENESIS a burn
            // At this stage the validation that the first input is an NFT1
            // GROUP token is already done, otherwise is_invalid would be true.
            if input_idx == 0 {
                if let Some(first_entry) = entries.get(0) {
                    if first_entry.meta.token_type
                        == TokenType::Slp(SlpTokenType::Nft1Child)
                        && first_entry.tx_type == Some(TxType::GENESIS)
                        && !first_entry.is_invalid
                    {
                        continue;
                    }
                }
            }

            // Input has a corresponding mentioned section, not a bare burn
            if tx
                .sections
                .iter()
                .any(|section| section.meta == input.token.meta)
            {
                continue;
            }

            let bare_burn =
                bare_burns.entry(&input.token.meta).or_insert(BareBurn {
                    burn_amount: 0,
                    burns_mint_batons: false,
                    group_token_meta: input.group_token_meta,
                });
            match input.token.variant {
                TokenVariant::Amount(amount) => {
                    bare_burn.burn_amount += u128::from(amount)
                }
                TokenVariant::MintBaton => bare_burn.burns_mint_batons = true,
                TokenVariant::Unknown(_) => {}
            }
        }
        bare_burns
    }
}
