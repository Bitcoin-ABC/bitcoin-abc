// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    script::Script,
    tx::{Tx, TxId, TxMut, TxOutput},
};
use bitcoinsuite_slp::{
    alp::{mint_section, parse_section, sections_opreturn},
    color::{ColorError, ColoredTx, ColoredTxSection, FailedColoring},
    parsed::{ParsedData, ParsedMintData},
    structs::{Atoms, Token, TokenMeta, TokenOutput, TokenVariant, TxType},
    token_id::TokenId,
    token_type::{AlpTokenType, TokenType},
};
use bytes::Bytes;
use pretty_assertions::assert_eq;

const TXID: TxId = TxId::new([1; 32]);
const TXID2: TxId = TxId::new([2; 32]);
const TOKEN_ID2: TokenId = TokenId::new(TXID2);
const TXID3: TxId = TxId::new([3; 32]);
const TOKEN_ID3: TokenId = TokenId::new(TXID3);
const TXID4: TxId = TxId::new([4; 32]);
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

fn colored_mint_section(token_id: TokenId) -> ColoredTxSection {
    ColoredTxSection {
        meta: meta(token_id),
        tx_type: TxType::MINT,
        required_input_sum: 0,
        has_colored_out_of_range: false,
        genesis_info: None,
    }
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

#[test]
fn test_color_alp_mint_duplicate_token_id() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![
            make_mint(&TOKEN_ID2, [], 0),
            make_mint(&TOKEN_ID2, [], 0),
        ]))),
        Some(ColoredTx {
            sections: vec![colored_mint_section(TOKEN_ID2)],
            outputs: vec![None],
            failed_colorings: vec![FailedColoring {
                pushdata_idx: 1,
                parsed: parse(make_mint(&TOKEN_ID2, [], 0)),
                error: ColorError::DuplicateTokenId {
                    prev_section_idx: 0,
                    token_id: TOKEN_ID2,
                },
            }],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_mint_unknown_token_type() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<3>(sections_opreturn(vec![
            // Valid mint
            make_mint(&TOKEN_ID2, [2], 0),
            // Valid unknown
            b"SLP2\x77".as_ref().into(),
            // Invalid mint, descending token type
            make_mint(&TOKEN_ID3, [], 0),
            // Valid unknown
            b"SLP2\x89".as_ref().into(),
            // Invalid unknown, descending token type
            b"SLP2\x80".as_ref().into(),
        ]))),
        Some(ColoredTx {
            sections: vec![
                colored_mint_section(TOKEN_ID2),
                ColoredTxSection {
                    meta: TokenMeta {
                        token_id: EMPTY_TOKEN_ID,
                        token_type: TokenType::Alp(AlpTokenType::Unknown(0x77)),
                    },
                    tx_type: TxType::UNKNOWN,
                    ..colored_mint_section(EMPTY_TOKEN_ID)
                },
                ColoredTxSection {
                    meta: TokenMeta {
                        token_id: EMPTY_TOKEN_ID,
                        token_type: TokenType::Alp(AlpTokenType::Unknown(0x89)),
                    },
                    tx_type: TxType::UNKNOWN,
                    ..colored_mint_section(EMPTY_TOKEN_ID)
                },
            ],
            outputs: vec![
                None,
                amount::<0>(2),
                unknown::<1>(0x77),
                unknown::<1>(0x77),
            ],
            failed_colorings: vec![
                FailedColoring {
                    pushdata_idx: 2,
                    parsed: parse(make_mint(&TOKEN_ID3, [], 0)),
                    error: ColorError::DescendingTokenType {
                        before: 0x77,
                        after: 0,
                    },
                },
                FailedColoring {
                    pushdata_idx: 4,
                    parsed: parse(b"SLP2\x80".as_ref().into()),
                    error: ColorError::DescendingTokenType {
                        before: 0x89,
                        after: 0x80,
                    },
                },
            ],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_mint_too_few_outputs() {
    for section in [
        make_mint(&TOKEN_ID2, [123], 0),
        make_mint(&TOKEN_ID2, [], 1),
    ] {
        assert_eq!(
            ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![
                section.clone(),
            ]))),
            Some(ColoredTx {
                outputs: vec![None],
                failed_colorings: vec![FailedColoring {
                    pushdata_idx: 0,
                    parsed: parse(section),
                    error: ColorError::TooFewOutputs {
                        expected: 2,
                        actual: 1,
                    },
                }],
                ..Default::default()
            }),
        );
    }
    // 0 amounts don't cause the coloring to fail even if there's no associated
    // output
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![make_mint(
            &TOKEN_ID2, [0; 127], 0
        )]))),
        Some(ColoredTx {
            outputs: vec![None],
            sections: vec![colored_mint_section(TOKEN_ID2)],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_mint_overlapping_amount() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<3>(sections_opreturn(vec![
            make_mint(&TOKEN_ID2, [0], 1),
            make_mint(&TOKEN_ID3, [0, 777, 1], 0),
        ]))),
        Some(ColoredTx {
            sections: vec![colored_mint_section(TOKEN_ID2)],
            outputs: vec![None, None, mint_baton::<0>(), None],
            failed_colorings: vec![FailedColoring {
                pushdata_idx: 1,
                parsed: parse(make_mint(&TOKEN_ID3, [0, 777, 1], 0)),
                error: ColorError::OverlappingAtoms {
                    prev_token: Token {
                        meta: meta(TOKEN_ID2),
                        variant: TokenVariant::MintBaton,
                    },
                    output_idx: 2,
                    atoms: 777,
                },
            }],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_mint_overlapping_mint_baton() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<3>(sections_opreturn(vec![
            make_mint(&TOKEN_ID2, [0, 0, 9], 0),
            make_mint(&TOKEN_ID3, [0], 2),
        ]))),
        Some(ColoredTx {
            sections: vec![colored_mint_section(TOKEN_ID2)],
            outputs: vec![None, None, None, amount::<0>(9)],
            failed_colorings: vec![FailedColoring {
                pushdata_idx: 1,
                parsed: parse(make_mint(&TOKEN_ID3, [0], 2)),
                error: ColorError::OverlappingMintBaton {
                    prev_token: Token {
                        meta: meta(TOKEN_ID2),
                        variant: TokenVariant::Atoms(9),
                    },
                    output_idx: 3,
                },
            }],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_mint_simple() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<5>(sections_opreturn(vec![make_mint(
            &TOKEN_ID2,
            [2, 0, MAX],
            2,
        )]))),
        Some(ColoredTx {
            sections: vec![colored_mint_section(TOKEN_ID2)],
            outputs: vec![
                None,
                amount::<0>(2),
                None,
                amount::<0>(MAX),
                mint_baton::<0>(),
                mint_baton::<0>(),
            ],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_mint_complex() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<5>(sections_opreturn(vec![
            make_mint(&TOKEN_ID2, [0, 9, 0, 0, 0, 0, 0, 0], 0),
            make_mint(&TOKEN_ID3, [7, 0], 2),
            make_mint(&TOKEN_ID4, [0, 0, 0, 0], 1),
        ]))),
        Some(ColoredTx {
            sections: vec![
                colored_mint_section(TOKEN_ID2),
                colored_mint_section(TOKEN_ID3),
                colored_mint_section(TOKEN_ID4),
            ],
            outputs: vec![
                None,
                amount::<1>(7),
                amount::<0>(9),
                mint_baton::<1>(),
                mint_baton::<1>(),
                mint_baton::<2>(),
            ],
            ..Default::default()
        }),
    );
}
