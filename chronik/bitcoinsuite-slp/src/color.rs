// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`ColoredTx`].

use bitcoinsuite_core::tx::{Tx, TxId};
use bytes::Bytes;
use thiserror::Error;

use crate::{
    alp,
    color::ColorError::*,
    empp,
    parsed::{ParsedData, ParsedGenesis, ParsedMintData, ParsedTxType},
    slp,
    structs::{
        Amount, GenesisInfo, Token, TokenMeta, TokenOutput, TokenVariant,
        TxType,
    },
    token_id::TokenId,
    token_type::{SlpTokenType, TokenType},
};

/// A parsed SLP or ALP tx with outputs colored according to the tokens
/// specified in the `OP_RETURN`.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct ColoredTx {
    /// Parsed sections defining where tokens should go.
    /// Can be multiple for ALP, at most 1 for SLP.
    pub sections: Vec<ColoredTxSection>,
    /// Intentional burns, specifying how many tokens are supposed to be burned
    /// of which type.
    pub intentional_burns: Vec<IntentionalBurn>,
    /// Outputs colored with the tokens as specified in the `OP_RETURN`.
    pub outputs: Vec<Option<TokenOutput>>,
    /// Reports of failed parsing attempts
    pub failed_parsings: Vec<FailedParsing>,
    /// Reports of failed coloring attempts
    pub failed_colorings: Vec<FailedColoring>,
}

/// Section defining where tokens should go as specified in the `OP_RETURN`.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ColoredTxSection {
    /// [`TokenMeta`] specified in the section.
    pub meta: TokenMeta,
    /// [`TxType`] specified in the section.
    pub tx_type: TxType,
    /// Minimum required sum of input tokens of this token meta.
    /// Note that this may be different from the `outputs` in [`ColoredTx`] of
    /// the respective token meta for SLP, as SLP allows sending tokens to
    /// nonexistent outputs, whereas in ALP this would be a failed coloring.
    pub required_input_sum: u128,
    /// SLP allows coloring non-existent outputs, but this usually is a
    /// mistake, so we keep track of it here.
    pub has_colored_out_of_range: bool,
    /// [`GenesisInfo`] introduced in this section. Only present for GENESIS.
    pub genesis_info: Option<GenesisInfo>,
}

/// Any kind of parse error that can occur when processing a tx.
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ParseError {
    /// Parsing the OP_RETURN as eMPP failed
    Empp(empp::ParseError),
    /// Parsing the OP_RETURN as SLP failed
    Slp(slp::ParseError),
    /// Parsing a pushdata in an OP_RETURN as ALP failed
    Alp(alp::ParseError),
}

/// Report of a failed parsing attempt
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FailedParsing {
    /// Which pushdata in the OP_RETURN failed to parse, or None if the entire
    /// OP_RETURN is the culprit.
    pub pushdata_idx: Option<usize>,
    /// The actual bytes that failed to parse.
    pub bytes: Bytes,
    /// Error explaining why the parsing failed.
    pub error: ParseError,
}

/// Report of a failed coloring attempt
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct FailedColoring {
    /// Which pushdata in the OP_RETURN failed to color the tx.
    pub pushdata_idx: usize,
    /// Parsed data which failed to color.
    pub parsed: ParsedData,
    /// Error explaining why the coloring failed.
    pub error: ColorError,
}

/// Intentional burn, allowing users to specify cleanly and precisely how tokens
/// should be removed from supply.
///
/// This prevents the bells and whistles of indexers and wallets to reject a tx
/// whose intent is to remove tokens from supply.
#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub struct IntentionalBurn {
    /// Which token meta should be burned
    pub meta: TokenMeta,
    /// How many tokens should be burned
    pub amount: Amount,
}

/// Error when trying to color a parsed section.
#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum ColorError {
    /// ALP disallows coloring non-existent outputs
    #[error("Too few outputs, expected {expected} but got {actual}")]
    TooFewOutputs {
        /// Expected number of outputs for the coloring to succeed
        expected: usize,
        /// Actual number of outputs
        actual: usize,
    },

    /// GENESIS must be first
    #[error("GENESIS must be the first pushdata")]
    GenesisMustBeFirst,

    /// Token types must be ascending, to allow clean upgrades when introducing
    /// new token types.
    #[error(
        "Descending token type: {before} > {after}, token types must be in \
         ascending order"
    )]
    DescendingTokenType {
        /// Larger token type coming before
        before: u8,
        /// Smaller token type coming after
        after: u8,
    },

    /// Tried coloring using the same token ID twice, which is not allowed.
    /// Only the first coloring counts.
    #[error(
        "Duplicate token_id {token_id}, found in section {prev_section_idx}"
    )]
    DuplicateTokenId {
        /// Valid section that first colored the tx
        prev_section_idx: usize,
        /// Token ID that was colored twice
        token_id: TokenId,
    },

    /// Tried doing an intentional burn of the same token ID twice, which is
    /// not allowed. Only the first intentional burn counts.
    #[error(
        "Duplicate intentional burn token_id {token_id}, found in burn \
         #{prev_burn_idx} and #{burn_idx}"
    )]
    DuplicateIntentionalBurnTokenId {
        /// Valid previous intentional burn
        prev_burn_idx: usize,
        /// Invalid later duplicate burn
        burn_idx: usize,
        /// Token ID burned
        token_id: TokenId,
    },

    /// Outputs cannot be colored twice by different sections
    #[error(
        "Overlapping amount when trying to color {amount} at index \
         {output_idx}, output is already colored with {prev_token}"
    )]
    OverlappingAmount {
        /// Previous token the output is already colored with
        prev_token: Token,
        /// Index of the output that we tried to color twice
        output_idx: usize,
        /// Amount that tried to color an output twice
        amount: Amount,
    },

    /// Outputs cannot be colored twice by different sections
    #[error(
        "Overlapping mint baton when trying to color mint baton at index \
         {output_idx}, output is already colored with {prev_token}"
    )]
    OverlappingMintBaton {
        /// Previous token the output is already colored with
        prev_token: Token,
        /// Index of the output that we tried tot color twice
        output_idx: usize,
    },
}

impl ColoredTx {
    /// Parse the OP_RETURN of the tx and color its outputs
    pub fn color_tx(tx: &Tx) -> Option<ColoredTx> {
        let op_return = match tx.outputs.first() {
            Some(output) if output.script.is_opreturn() => &output.script,
            _ => return None,
        };
        let mut colored = ColoredTx {
            sections: vec![],
            intentional_burns: vec![],
            outputs: vec![None; tx.outputs.len()],
            failed_colorings: vec![],
            failed_parsings: vec![],
        };

        // First, try to parse and color as SLP tx
        match slp::parse(tx.txid_ref(), op_return) {
            Ok(Some(parsed)) => {
                colored
                    .color_section(0, parsed, &mut 0)
                    .expect("Coloring SLP always succeeds");
                return Some(colored);
            }
            Ok(None) => {}
            Err(slp_error) => {
                colored.failed_parsings.push(FailedParsing {
                    pushdata_idx: None,
                    bytes: op_return.bytecode().clone(),
                    error: ParseError::Slp(slp_error),
                });
                return Some(colored);
            }
        }

        // Then, try to parse as eMPP tx
        let pushdata = match empp::parse(op_return) {
            Ok(Some(pushdata)) => pushdata,
            Ok(None) => return None,
            Err(empp_err) => {
                colored.failed_parsings.push(FailedParsing {
                    pushdata_idx: None,
                    bytes: op_return.bytecode().clone(),
                    error: ParseError::Empp(empp_err),
                });
                return Some(colored);
            }
        };

        // Color all the pushdata as ALP, and if we encountered any ALP
        // sections, return the colored tx.
        if colored.color_all_alp_pushdata(pushdata, tx.txid_ref()) {
            return Some(colored);
        }

        // We found an eMPP OP_RETURN but no ALP sections
        None
    }

    // Color all the pushdata as ALP one-by-one and return whether we
    // encountered anything ALP-like.
    fn color_all_alp_pushdata(
        &mut self,
        pushdata: Vec<Bytes>,
        txid: &TxId,
    ) -> bool {
        let mut max_token_type = 0;
        let mut has_any_alp = false;

        for (pushdata_idx, pushdata) in pushdata.into_iter().enumerate() {
            let parsed = match alp::parse_section(txid, pushdata.clone()) {
                Ok(Some(parsed)) => parsed,
                Ok(None) => continue,
                Err(alp_error) => {
                    self.failed_parsings.push(FailedParsing {
                        pushdata_idx: Some(pushdata_idx),
                        bytes: pushdata,
                        error: ParseError::Alp(alp_error),
                    });
                    has_any_alp = true;
                    continue;
                }
            };

            has_any_alp = true;
            let color_result = self.color_section(
                pushdata_idx,
                parsed.clone(),
                &mut max_token_type,
            );
            if let Err(error) = color_result {
                self.failed_colorings.push(FailedColoring {
                    pushdata_idx,
                    parsed,
                    error,
                });
            }
        }

        has_any_alp
    }

    fn color_section(
        &mut self,
        pushdata_idx: usize,
        parsed: ParsedData,
        max_token_type: &mut u8,
    ) -> Result<(), ColorError> {
        let meta = parsed.meta;

        // token_type must be in ascending order
        if *max_token_type > meta.token_type.to_u8() {
            return Err(DescendingTokenType {
                before: *max_token_type,
                after: meta.token_type.to_u8(),
            });
        }
        *max_token_type = meta.token_type.to_u8();

        // Only report duplicate token IDs on MINT and SEND, burn and GENESIS
        // are handled separately
        if matches!(parsed.tx_type.tx_type(), TxType::MINT | TxType::SEND) {
            for (prev_section_idx, prev_section) in
                self.sections.iter().enumerate()
            {
                if prev_section.meta.token_id == meta.token_id {
                    return Err(DuplicateTokenId {
                        prev_section_idx,
                        token_id: meta.token_id,
                    });
                }
            }
        }

        match parsed.tx_type {
            ParsedTxType::Genesis(genesis) => {
                self.color_genesis(pushdata_idx, meta, genesis)
            }
            ParsedTxType::Mint(mint) => self.color_mint(meta, mint),
            ParsedTxType::Send(send) => self.color_send(meta, send),
            ParsedTxType::Burn(amount) => self.color_burn(meta, amount),
            ParsedTxType::Unknown => self.color_unknown(meta),
        }
    }

    fn color_genesis(
        &mut self,
        pushdata_idx: usize,
        meta: TokenMeta,
        genesis: ParsedGenesis,
    ) -> Result<(), ColorError> {
        // GENESIS must be the very first section in the pushdata.
        // This prevents assigning the same token ID to different tokens, even
        // if we introduced a new LOKAD ID, as long as it also upholds this
        // rule.
        if pushdata_idx != 0 {
            return Err(GenesisMustBeFirst);
        }

        let has_colored_out_of_range =
            self.color_mint_data(&meta, &genesis.mint_data)?;
        self.sections.push(ColoredTxSection {
            meta,
            tx_type: TxType::GENESIS,
            required_input_sum: 0,
            genesis_info: Some(genesis.info),
            has_colored_out_of_range,
        });
        Ok(())
    }

    fn color_mint(
        &mut self,
        meta: TokenMeta,
        mint: ParsedMintData,
    ) -> Result<(), ColorError> {
        let has_colored_out_of_range = self.color_mint_data(&meta, &mint)?;
        self.sections.push(ColoredTxSection {
            meta,
            tx_type: TxType::MINT,
            required_input_sum: 0,
            genesis_info: None,
            has_colored_out_of_range,
        });
        Ok(())
    }

    fn color_mint_data(
        &mut self,
        meta: &TokenMeta,
        mint_data: &ParsedMintData,
    ) -> Result<bool, ColorError> {
        let token_idx = self.sections.len();

        let mut out_of_range_idx = None;
        // Verify no outputs have been colored already
        for (output_idx, &amount) in
            mint_data.amounts_range().zip(&mint_data.amounts)
        {
            if amount != 0 {
                match self.outputs.get(output_idx) {
                    Some(Some(token)) => {
                        return Err(OverlappingAmount {
                            prev_token: self.token(token),
                            output_idx,
                            amount,
                        });
                    }
                    Some(None) => {}
                    None => out_of_range_idx = Some(output_idx),
                }
            }
        }
        for output_idx in mint_data.batons_range() {
            match self.outputs.get(output_idx) {
                Some(Some(token)) => {
                    return Err(OverlappingMintBaton {
                        prev_token: self.token(token),
                        output_idx,
                    })
                }
                Some(None) => {}
                None => out_of_range_idx = Some(output_idx),
            }
        }

        if let Some(output_idx) = out_of_range_idx {
            // ALP forbids amounts and batons for nonexistent outputs
            if meta.token_type.is_alp() {
                return Err(TooFewOutputs {
                    expected: output_idx + 1,
                    actual: self.outputs.len(),
                });
            }
        }

        // Now, color all outputs
        for (output_idx, &amount) in
            mint_data.amounts_range().zip(&mint_data.amounts)
        {
            if output_idx >= self.outputs.len() {
                break;
            }
            if amount > 0 {
                self.outputs[output_idx] = Some(TokenOutput {
                    token_idx,
                    variant: TokenVariant::Amount(amount),
                });
            }
        }
        for output_idx in mint_data.batons_range() {
            if output_idx >= self.outputs.len() {
                break;
            }
            self.outputs[output_idx] = Some(TokenOutput {
                token_idx,
                variant: TokenVariant::MintBaton,
            });
        }

        Ok(out_of_range_idx.is_some())
    }

    fn color_send(
        &mut self,
        meta: TokenMeta,
        amounts: Vec<Amount>,
    ) -> Result<(), ColorError> {
        // Verify no outputs have been colored already
        let mut out_of_range_idx = None;
        for (idx, &amount) in amounts.iter().enumerate() {
            if amount != 0 {
                match self.outputs.get(idx + 1) {
                    Some(Some(token)) => {
                        return Err(OverlappingAmount {
                            prev_token: self.token(token),
                            output_idx: idx + 1,
                            amount,
                        })
                    }
                    Some(None) => {}
                    None => out_of_range_idx = Some(idx + 1),
                }
            }
        }

        if let Some(output_idx) = out_of_range_idx {
            // ALP forbids amounts and batons for nonexistent outputs
            if meta.token_type.is_alp() {
                return Err(TooFewOutputs {
                    expected: output_idx + 1,
                    actual: self.outputs.len(),
                });
            }
        }

        // Color outputs and also calculate the required input sum
        let mut required_input_sum = 0u128;
        for (idx, &amount) in amounts.iter().enumerate() {
            if amount == 0 {
                continue;
            }
            required_input_sum += u128::from(amount);
            if let Some(output) = self.outputs.get_mut(idx + 1) {
                *output = Some(TokenOutput {
                    token_idx: self.sections.len(),
                    variant: TokenVariant::Amount(amount),
                });
            }
        }

        self.sections.push(ColoredTxSection {
            meta,
            tx_type: TxType::SEND,
            required_input_sum,
            genesis_info: None,
            has_colored_out_of_range: out_of_range_idx.is_some(),
        });
        Ok(())
    }

    fn color_burn(
        &mut self,
        meta: TokenMeta,
        amount: Amount,
    ) -> Result<(), ColorError> {
        for (prev_burn_idx, prev_burn) in
            self.intentional_burns.iter().enumerate()
        {
            if prev_burn.meta.token_id == meta.token_id {
                return Err(DuplicateIntentionalBurnTokenId {
                    prev_burn_idx,
                    burn_idx: self.intentional_burns.len(),
                    token_id: meta.token_id,
                });
            }
        }
        self.intentional_burns
            .push(IntentionalBurn { meta, amount });
        Ok(())
    }

    fn color_unknown(&mut self, meta: TokenMeta) -> Result<(), ColorError> {
        // Color all outputs (except the OP_RETURN) that haven't been colored
        // yet as "unknown"
        for token_data in self.outputs.iter_mut().skip(1) {
            if token_data.is_none() {
                *token_data = Some(TokenOutput {
                    token_idx: self.sections.len(),
                    variant: TokenVariant::Unknown(meta.token_type.to_u8()),
                });
            }
        }
        self.sections.push(ColoredTxSection {
            meta,
            tx_type: TxType::UNKNOWN,
            required_input_sum: 0,
            genesis_info: None,
            has_colored_out_of_range: false,
        });
        Ok(())
    }

    /// Turn a [`TokenOutput`] of this [`ColoredTx`] into a [`Token`].
    pub fn token(&self, token_output: &TokenOutput) -> Token {
        let section = &self.sections[token_output.token_idx];
        Token {
            meta: section.meta,
            variant: token_output.variant,
        }
    }
}

impl ColoredTxSection {
    /// Whether the section has SLP V2 (MintVault) token type and a MINT tx
    /// type.
    pub fn is_mint_vault_mint(&self) -> bool {
        if self.tx_type != TxType::MINT {
            return false;
        }
        matches!(
            self.meta.token_type,
            TokenType::Slp(SlpTokenType::MintVault),
        )
    }
}

impl std::fmt::Display for FailedParsing {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Parsing failed")?;
        if let Some(pushdata_idx) = self.pushdata_idx {
            write!(f, " at pushdata idx {pushdata_idx}")?;
        }
        write!(f, ": {}", self.error)
    }
}

impl std::fmt::Display for ParseError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match &self {
            ParseError::Empp(err) => write!(f, "eMPP error: {err}"),
            ParseError::Slp(err) => write!(f, "SLP error: {err}"),
            ParseError::Alp(err) => write!(f, "ALP error: {err}"),
        }
    }
}
