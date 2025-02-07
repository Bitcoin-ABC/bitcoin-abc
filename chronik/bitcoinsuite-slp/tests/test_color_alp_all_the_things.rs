// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    script::Script,
    tx::{Tx, TxId, TxMut, TxOutput},
};
use bitcoinsuite_slp::{
    alp::{
        self, burn_section, genesis_section, mint_section, parse_section,
        sections_opreturn, send_section,
    },
    color::{
        ColorError, ColoredTx, ColoredTxSection, FailedColoring, FailedParsing,
        IntentionalBurn, ParseError,
    },
    parsed::{ParsedData, ParsedMintData},
    structs::{
        Atoms, GenesisInfo, Token, TokenMeta, TokenOutput, TokenVariant, TxType,
    },
    token_id::TokenId,
    token_type::{AlpTokenType, TokenType},
};
use bytes::Bytes;
use pretty_assertions::assert_eq;

const TXID: TxId = TxId::new([4; 32]);
const TOKEN_ID: TokenId = TokenId::new(TXID);
const TXID2: TxId = TxId::new([5; 32]);
const TOKEN_ID2: TokenId = TokenId::new(TXID2);
const TXID3: TxId = TxId::new([6; 32]);
const TOKEN_ID3: TokenId = TokenId::new(TXID3);
const TXID4: TxId = TxId::new([7; 32]);
const TOKEN_ID4: TokenId = TokenId::new(TXID4);

const EMPTY_TXID: TxId = TxId::new([0; 32]);
const EMPTY_TOKEN_ID: TokenId = TokenId::new(EMPTY_TXID);

const STD: AlpTokenType = AlpTokenType::Standard;
const MAX: Atoms = 0xffff_ffff_ffff;

fn make_tx<const N: usize>(script: Script) -> Tx {
    Tx::with_txid(
        TXID,
        TxMut {
            outputs: [
                [TxOutput { sats: 0, script }].as_ref(),
                &vec![TxOutput::default(); N],
            ]
            .concat(),
            ..Default::default()
        },
    )
}

fn meta(token_id: TokenId) -> TokenMeta {
    TokenMeta {
        token_id,
        token_type: TokenType::Alp(STD),
    }
}

fn parse(pushdata: Bytes) -> ParsedData {
    parse_section(&TXID, pushdata).unwrap().unwrap()
}

fn amount<const TOKENIDX: usize>(amount: u64) -> Option<TokenOutput> {
    Some(TokenOutput {
        token_idx: TOKENIDX,
        variant: TokenVariant::Atoms(amount),
    })
}

fn mint_baton<const TOKENIDX: usize>() -> Option<TokenOutput> {
    Some(TokenOutput {
        token_idx: TOKENIDX,
        variant: TokenVariant::MintBaton,
    })
}

fn unknown<const TOKENIDX: usize>(token_type: u8) -> Option<TokenOutput> {
    Some(TokenOutput {
        token_idx: TOKENIDX,
        variant: TokenVariant::Unknown(token_type),
    })
}

fn make_genesis<const N: usize>(
    atoms_vec: [Atoms; N],
    num_batons: usize,
) -> Bytes {
    genesis_section(
        AlpTokenType::Standard,
        &GenesisInfo::default(),
        &ParsedMintData {
            atoms_vec: atoms_vec.into_iter().collect(),
            num_batons,
        },
    )
}

fn make_mint<const N: usize>(
    token_id: &TokenId,
    atoms_vec: [Atoms; N],
    num_batons: usize,
) -> Bytes {
    mint_section(
        token_id,
        AlpTokenType::Standard,
        &ParsedMintData {
            atoms_vec: atoms_vec.into_iter().collect(),
            num_batons,
        },
    )
}

fn make_send<const N: usize>(
    token_id: &TokenId,
    atoms_vec: [Atoms; N],
) -> Bytes {
    send_section(token_id, AlpTokenType::Standard, atoms_vec)
}

fn make_burn(token_id: &TokenId, atoms_vec: Atoms) -> Bytes {
    burn_section(token_id, AlpTokenType::Standard, atoms_vec)
}

#[test]
fn test_color_alp_all_the_things() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<10>(sections_opreturn(vec![
            // success GENESIS
            make_genesis([0, 7, 0, 0, 1], 2),
            // fail GENESIS: must be first
            make_genesis([], 0),
            // fail MINT: Too few outputs
            make_mint(&TOKEN_ID2, [0; 7], 99),
            // fail MINT: Overlapping atoms
            make_mint(&TOKEN_ID2, [0, MAX], 0),
            // fail MINT: Overlapping batons
            make_mint(&TOKEN_ID2, [0], 1),
            // success BURN: token ID 2
            make_burn(&TOKEN_ID2, 2),
            // success MINT: token ID 3
            make_mint(&TOKEN_ID3, [3, 0], 1),
            // success MINT: token ID 2
            make_mint(&TOKEN_ID2, [0, 0, 0, 2, 0, 0, 0], 1),
            // fail MINT: Duplicate token ID 2
            make_mint(&TOKEN_ID2, [], 0),
            // fail BURN: Duplicate burn token ID 2
            make_burn(&TOKEN_ID2, 7),
            // fail SEND: Too few outputs
            make_send(&TOKEN_ID4, [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
            // success SEND: token ID 4
            make_send(&TOKEN_ID4, [0, 0, 0, 0, 0, 0, 0, 0, 0, MAX, 0, 0, 0]),
            // fail MINT: Duplicate token ID 4
            make_mint(&TOKEN_ID4, [], 0),
            // success UNKNOWN
            b"SLP2\x89".as_ref().into(),
            // fail: Descending token type
            make_burn(&TOKEN_ID3, 1),
            // Invalid usage of SLP\0
            b"SLP\0".as_ref().into(),
            // success UNKNOWN
            b"SLP2\x9a".as_ref().into(),
        ]))),
        Some(ColoredTx {
            sections: vec![
                ColoredTxSection {
                    meta: meta(TOKEN_ID),
                    tx_type: TxType::GENESIS,
                    required_input_sum: 0,
                    has_colored_out_of_range: false,
                    genesis_info: Some(GenesisInfo::empty_alp()),
                },
                ColoredTxSection {
                    meta: meta(TOKEN_ID3),
                    tx_type: TxType::MINT,
                    required_input_sum: 0,
                    has_colored_out_of_range: false,
                    genesis_info: None,
                },
                ColoredTxSection {
                    meta: meta(TOKEN_ID2),
                    tx_type: TxType::MINT,
                    required_input_sum: 0,
                    has_colored_out_of_range: false,
                    genesis_info: None,
                },
                ColoredTxSection {
                    meta: meta(TOKEN_ID4),
                    tx_type: TxType::SEND,
                    required_input_sum: MAX as u128,
                    has_colored_out_of_range: false,
                    genesis_info: None,
                },
                ColoredTxSection {
                    meta: TokenMeta {
                        token_id: EMPTY_TOKEN_ID,
                        token_type: TokenType::Alp(AlpTokenType::Unknown(0x89)),
                    },
                    tx_type: TxType::UNKNOWN,
                    required_input_sum: 0,
                    has_colored_out_of_range: false,
                    genesis_info: None,
                },
                ColoredTxSection {
                    meta: TokenMeta {
                        token_id: EMPTY_TOKEN_ID,
                        token_type: TokenType::Alp(AlpTokenType::Unknown(0x9a)),
                    },
                    tx_type: TxType::UNKNOWN,
                    required_input_sum: 0,
                    has_colored_out_of_range: false,
                    genesis_info: None,
                },
            ],
            intentional_burns: vec![IntentionalBurn {
                meta: meta(TOKEN_ID2),
                atoms: 2,
            }],
            outputs: vec![
                None,
                // success MINT: token ID 3
                amount::<1>(3),
                // success GENESIS
                amount::<0>(7),
                // success MINT: token ID 3
                mint_baton::<1>(),
                // success MINT: token ID 2
                amount::<2>(2),
                // success GENESIS
                amount::<0>(1),
                // success GENESIS
                mint_baton::<0>(),
                // success GENESIS
                mint_baton::<0>(),
                // success MINT: token ID 2
                mint_baton::<2>(),
                // success UNKNOWN
                unknown::<4>(0x89),
                // success SEND: token ID 4
                amount::<3>(MAX),
            ],
            failed_colorings: vec![
                // fail GENESIS: must be first
                FailedColoring {
                    pushdata_idx: 1,
                    parsed: parse(make_genesis([], 0)),
                    error: ColorError::GenesisMustBeFirst,
                },
                // fail MINT: Too few outputs
                FailedColoring {
                    pushdata_idx: 2,
                    parsed: parse(make_mint(&TOKEN_ID2, [0; 7], 99)),
                    error: ColorError::TooFewOutputs {
                        expected: 107,
                        actual: 11,
                    },
                },
                // fail MINT: Overlapping atoms
                FailedColoring {
                    pushdata_idx: 3,
                    parsed: parse(make_mint(&TOKEN_ID2, [0, MAX], 0)),
                    error: ColorError::OverlappingAtoms {
                        prev_token: Token {
                            meta: meta(TOKEN_ID),
                            variant: TokenVariant::Atoms(7),
                        },
                        output_idx: 2,
                        atoms: MAX,
                    },
                },
                // fail MINT: Overlapping batons
                FailedColoring {
                    pushdata_idx: 4,
                    parsed: parse(make_mint(&TOKEN_ID2, [0], 1)),
                    error: ColorError::OverlappingMintBaton {
                        prev_token: Token {
                            meta: meta(TOKEN_ID),
                            variant: TokenVariant::Atoms(7),
                        },
                        output_idx: 2,
                    },
                },
                // fail MINT: Duplicate token ID 2
                FailedColoring {
                    pushdata_idx: 8,
                    parsed: parse(make_mint(&TOKEN_ID2, [], 0)),
                    error: ColorError::DuplicateTokenId {
                        prev_section_idx: 2,
                        token_id: TOKEN_ID2,
                    },
                },
                // fail BURN: Duplicate burn token ID 2
                FailedColoring {
                    pushdata_idx: 9,
                    parsed: parse(make_burn(&TOKEN_ID2, 7)),
                    error: ColorError::DuplicateIntentionalBurnTokenId {
                        prev_burn_idx: 0,
                        burn_idx: 1,
                        token_id: TOKEN_ID2,
                    },
                },
                // fail SEND: Overlapping amount
                FailedColoring {
                    pushdata_idx: 10,
                    parsed: parse(make_send(
                        &TOKEN_ID4,
                        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
                    )),
                    error: ColorError::TooFewOutputs {
                        expected: 12,
                        actual: 11,
                    },
                },
                // fail MINT: Duplicate token ID 4
                FailedColoring {
                    pushdata_idx: 12,
                    parsed: parse(make_mint(&TOKEN_ID4, [], 0)),
                    error: ColorError::DuplicateTokenId {
                        prev_section_idx: 3,
                        token_id: TOKEN_ID4,
                    },
                },
                // fail: Descending token type
                FailedColoring {
                    pushdata_idx: 14,
                    parsed: parse(make_burn(&TOKEN_ID3, 1)),
                    error: ColorError::DescendingTokenType {
                        before: 137,
                        after: 0,
                    },
                },
            ],
            failed_parsings: vec![FailedParsing {
                pushdata_idx: Some(15),
                bytes: b"SLP\0".as_ref().into(),
                error: ParseError::Alp(alp::ParseError::InvalidSlpLokadId),
            }],
        }),
    );
}
