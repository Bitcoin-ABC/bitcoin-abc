// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    script::Script,
    tx::{Tx, TxId, TxMut, TxOutput},
};
use bitcoinsuite_slp::{
    alp::{parse_section, sections_opreturn, send_section},
    color::{ColorError, ColoredTx, ColoredTxSection, FailedColoring},
    parsed::ParsedData,
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

fn colored_send_section(
    token_id: TokenId,
    required_input_sum: u128,
) -> ColoredTxSection {
    ColoredTxSection {
        meta: meta(token_id),
        tx_type: TxType::SEND,
        required_input_sum,
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

fn make_send<const N: usize>(
    token_id: &TokenId,
    atoms_vec: [Atoms; N],
) -> Bytes {
    send_section(token_id, AlpTokenType::Standard, atoms_vec)
}

#[test]
fn test_color_alp_send_too_few_outputs() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<2>(sections_opreturn(vec![
            make_send(&TOKEN_ID2, [0, 0, 77]),
            make_send(&TOKEN_ID3, [0, 5, 0, 0, 0, 0]),
        ]))),
        Some(ColoredTx {
            sections: vec![colored_send_section(TOKEN_ID3, 5)],
            outputs: vec![None, None, amount::<0>(5)],
            failed_colorings: vec![FailedColoring {
                pushdata_idx: 0,
                parsed: parse(make_send(&TOKEN_ID2, [0, 0, 77])),
                error: ColorError::TooFewOutputs {
                    expected: 4,
                    actual: 3,
                },
            }],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_send_duplicate_token_id() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<0>(sections_opreturn(vec![
            make_send(&TOKEN_ID2, []),
            make_send(&TOKEN_ID2, []),
        ]))),
        Some(ColoredTx {
            sections: vec![colored_send_section(TOKEN_ID2, 0)],
            outputs: vec![None],
            failed_colorings: vec![FailedColoring {
                pushdata_idx: 1,
                parsed: parse(make_send(&TOKEN_ID2, [])),
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
fn test_color_alp_send_overlapping_amount() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<3>(sections_opreturn(vec![
            make_send(&TOKEN_ID2, [0, 2, 0]),
            make_send(&TOKEN_ID3, [3, 7, MAX]),
        ]))),
        Some(ColoredTx {
            sections: vec![colored_send_section(TOKEN_ID2, 2)],
            outputs: vec![None, None, amount::<0>(2), None],
            failed_colorings: vec![FailedColoring {
                pushdata_idx: 1,
                parsed: parse(make_send(&TOKEN_ID3, [3, 7, MAX])),
                error: ColorError::OverlappingAtoms {
                    prev_token: Token {
                        meta: meta(TOKEN_ID2),
                        variant: TokenVariant::Atoms(2),
                    },
                    output_idx: 2,
                    atoms: 7,
                },
            }],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_send_success_simple() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<4>(sections_opreturn(vec![make_send(
            &TOKEN_ID2,
            [0, 2, 0, MAX],
        )]))),
        Some(ColoredTx {
            sections: vec![colored_send_section(TOKEN_ID2, MAX as u128 + 2)],
            outputs: vec![None, None, amount::<0>(2), None, amount::<0>(MAX),],
            ..Default::default()
        }),
    );
}

#[test]
fn test_color_alp_send_success_complex() {
    assert_eq!(
        ColoredTx::color_tx(&make_tx::<7>(sections_opreturn(vec![
            make_send(&TOKEN_ID2, [0, 2, 0, 0, 3]),
            make_send(&TOKEN_ID3, [0, 0, MAX]),
            make_send(&TOKEN_ID4, [1, 0, 0, 0, 0, 7]),
        ]),)),
        Some(ColoredTx {
            sections: vec![
                colored_send_section(TOKEN_ID2, 5),
                colored_send_section(TOKEN_ID3, MAX as u128),
                colored_send_section(TOKEN_ID4, 8),
            ],
            outputs: vec![
                None,
                amount::<2>(1),
                amount::<0>(2),
                amount::<1>(MAX),
                None,
                amount::<0>(3),
                amount::<2>(7),
                None,
            ],
            ..Default::default()
        }),
    );
}
