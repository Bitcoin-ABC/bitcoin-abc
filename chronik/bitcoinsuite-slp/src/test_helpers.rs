// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for writing SLP/ALP tests simpler / more readable.

use bitcoinsuite_core::{
    script::Script,
    tx::{Tx, TxId, TxMut, TxOutput},
};
use bytes::Bytes;

use crate::{
    alp::{self, mint_section},
    color::ColoredTx,
    parsed::{ParsedData, ParsedMintData},
    structs::{
        Amount, GenesisInfo, Token, TokenMeta, TokenOutput, TokenVariant,
    },
    token_id::TokenId,
    token_tx::{TokenTx, TokenTxEntry},
    token_type::{AlpTokenType, SlpTokenType, TokenType},
    verify::{SpentToken, VerifyContext},
};

/// TxId with all 1s; used for GENESIS txs
pub const TXID: TxId = TxId::new([1; 32]);
/// Token ID with all 1s; used for GENESIS txs
pub const TOKEN_ID1: TokenId = TokenId::new(TxId::new([1; 32]));
/// Token ID with all 2s
pub const TOKEN_ID2: TokenId = TokenId::new(TxId::new([2; 32]));
/// Token ID with all 3s
pub const TOKEN_ID3: TokenId = TokenId::new(TxId::new([3; 32]));
/// Token ID with all 4s
pub const TOKEN_ID4: TokenId = TokenId::new(TxId::new([4; 32]));
/// Token ID with all 5s
pub const TOKEN_ID5: TokenId = TokenId::new(TxId::new([5; 32]));
/// Token ID with all 6s
pub const TOKEN_ID6: TokenId = TokenId::new(TxId::new([6; 32]));
/// Token ID with all 7s
pub const TOKEN_ID7: TokenId = TokenId::new(TxId::new([7; 32]));
/// Token ID with all 8s
pub const TOKEN_ID8: TokenId = TokenId::new(TxId::new([8; 32]));

/// TxId with all 0s
pub const EMPTY_TXID: TxId = TxId::new([0; 32]);
/// Token ID with all 0s
pub const EMPTY_TOKEN_ID: TokenId = TokenId::new(EMPTY_TXID);

/// Empty SLP GenesisInfo
pub static INFO_SLP: GenesisInfo = GenesisInfo::empty_slp();

/// Shortcut for SLP TokenMeta
pub fn meta_slp(token_id: TokenId, token_type: SlpTokenType) -> TokenMeta {
    TokenMeta {
        token_id,
        token_type: TokenType::Slp(token_type),
    }
}

/// Shortcut for ALP TokenMeta Standard
pub fn meta_alp(token_id: TokenId) -> TokenMeta {
    TokenMeta {
        token_id,
        token_type: TokenType::Alp(AlpTokenType::Standard),
    }
}

/// Shortcut for Unknown ALP TokenMeta
pub fn meta_alp_unknown(token_id: TokenId, token_type: u8) -> TokenMeta {
    TokenMeta {
        token_id,
        token_type: TokenType::Alp(AlpTokenType::Unknown(token_type)),
    }
}

/// Shortcut for a SpentToken amount
pub fn spent_amount(meta: TokenMeta, amount: u64) -> Option<SpentToken> {
    Some(SpentToken {
        token: Token {
            meta,
            variant: TokenVariant::Amount(amount),
        },
        group_token_meta: None,
    })
}

/// Shortcut for a SpentToken amount with a group
pub fn spent_amount_group(
    meta: TokenMeta,
    amount: u64,
    group_token_meta: TokenMeta,
) -> Option<SpentToken> {
    Some(SpentToken {
        token: Token {
            meta,
            variant: TokenVariant::Amount(amount),
        },
        group_token_meta: Some(group_token_meta),
    })
}

/// Shortcut for a SpentToken mint baton
pub fn spent_baton(meta: TokenMeta) -> Option<SpentToken> {
    Some(SpentToken {
        token: Token {
            meta,
            variant: TokenVariant::MintBaton,
        },
        group_token_meta: None,
    })
}

/// Shortcut for a TokenOutput amount
pub fn token_amount<const N: usize>(amount: u64) -> Option<TokenOutput> {
    Some(TokenOutput {
        token_idx: N,
        variant: TokenVariant::Amount(amount),
    })
}

/// Shortcut for a TokenOutput mint baton
pub fn token_baton<const N: usize>() -> Option<TokenOutput> {
    Some(TokenOutput {
        token_idx: N,
        variant: TokenVariant::MintBaton,
    })
}

/// Shortcut for an Unknown TokenOutput
pub fn token_unknown<const N: usize>(token_type: u8) -> Option<TokenOutput> {
    Some(TokenOutput {
        token_idx: N,
        variant: TokenVariant::Unknown(token_type),
    })
}

/// Parse the section as ALP, panic on failure
pub fn parse_alp(section: Bytes) -> ParsedData {
    alp::parse_section(&TXID, section).unwrap().unwrap()
}

/// Empty TokenTxEmpty as a simple template
pub fn empty_entry() -> TokenTxEntry {
    TokenTxEntry {
        meta: meta_slp(EMPTY_TOKEN_ID, SlpTokenType::Fungible),
        tx_type: None,
        genesis_info: None,
        group_token_meta: None,
        intentional_burn_amount: None,
        actual_burn_amount: 0,
        is_invalid: false,
        burns_mint_batons: false,
        burn_error: None,
        has_colored_out_of_range: false,
        failed_colorings: vec![],
    }
}

/// Shortcut to make an ALP MINT section
pub fn alp_mint<const N: usize>(
    token_id: &TokenId,
    amounts: [Amount; N],
    num_batons: usize,
) -> Bytes {
    mint_section(
        token_id,
        AlpTokenType::Standard,
        &ParsedMintData {
            amounts: amounts.into_iter().collect(),
            num_batons,
        },
    )
}

/// Shortcut to verify an OP_RETURN script with the given spent tokens
pub fn verify<const N: usize>(
    script: Script,
    spent_tokens: &[Option<SpentToken>],
) -> TokenTx {
    let tx = Tx::with_txid(
        TXID,
        TxMut {
            outputs: [
                [TxOutput { value: 0, script }].as_ref(),
                &vec![TxOutput::default(); N],
            ]
            .concat(),
            ..Default::default()
        },
    );
    let colored_tx = ColoredTx::color_tx(&tx).unwrap();
    let context = VerifyContext {
        spent_tokens,
        spent_scripts: None,
        genesis_info: None,
        override_has_mint_vault: None,
    };
    context.verify(colored_tx)
}
