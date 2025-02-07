// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::script::{opcode::OP_0, Script};
use bitcoinsuite_slp::{
    alp::{self, sections_opreturn, send_section},
    color::{ColorError, FailedColoring, FailedParsing, ParseError},
    empp,
    structs::TxType,
    test_helpers::{
        alp_mint, empty_entry, meta_alp as meta, parse_alp, spent_atoms,
        token_atoms, verify, TOKEN_ID2,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::AlpTokenType::*,
    verify::BurnError,
};
use pretty_assertions::assert_eq;

#[test]
fn test_verify_empp_parse_error() {
    assert_eq!(
        verify::<1>(Script::new(b"\x6a\x50\0".as_ref().into()), &[],),
        TokenTx {
            entries: vec![],
            outputs: vec![None, None],
            failed_parsings: vec![FailedParsing {
                pushdata_idx: None,
                bytes: b"\x6a\x50\0".as_ref().into(),
                error: ParseError::Empp(empp::ParseError::EmptyPushdata(OP_0)),
            }],
        },
    );
}

#[test]
fn test_verify_alp_parse_error() {
    assert_eq!(
        verify::<1>(Script::new(b"\x6a\x50\x04SLP\0".as_ref().into()), &[],),
        TokenTx {
            entries: vec![],
            outputs: vec![None, None],
            failed_parsings: vec![FailedParsing {
                pushdata_idx: Some(0),
                bytes: b"SLP\0".as_ref().into(),
                error: ParseError::Alp(alp::ParseError::InvalidSlpLokadId),
            }],
        },
    );
}

#[test]
fn test_verify_alp_color_error() {
    assert_eq!(
        verify::<1>(
            sections_opreturn(vec![
                send_section(&TOKEN_ID2, Standard, []),
                alp_mint(&TOKEN_ID2, [], 0),
            ]),
            &[],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::SEND),
                failed_colorings: vec![FailedColoring {
                    pushdata_idx: 1,
                    parsed: parse_alp(alp_mint(&TOKEN_ID2, [], 0)),
                    error: ColorError::DuplicateTokenId {
                        prev_section_idx: 0,
                        token_id: TOKEN_ID2,
                    }
                },],
                ..empty_entry()
            }],
            outputs: vec![None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_more_than_32767_inputs_invalid() {
    // More than 32767 inputs disallowed in ALP
    let spent_tokens = vec![
        spent_atoms(meta(TOKEN_ID2), 0xffff_ffff_ffff);
        alp::consts::MAX_TX_INPUTS + 1
    ];
    assert_eq!(
        verify::<1>(
            sections_opreturn(vec![send_section(
                &TOKEN_ID2,
                Standard,
                [0xffff_ffff_ffff],
            )]),
            &spent_tokens,
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::SEND),
                actual_burn_atoms: 32768 * 0xffff_ffff_ffff,
                is_invalid: true,
                burn_error: Some(BurnError::TooManyTxInputs(32768)),
                ..empty_entry()
            }],
            outputs: vec![None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_32767_inputs_valid() {
    // 32767 inputs allowed in ALP
    let spent_tokens = vec![
        spent_atoms(meta(TOKEN_ID2), 0xffff_ffff_ffff);
        alp::consts::MAX_TX_INPUTS
    ];
    assert_eq!(
        verify::<1>(
            sections_opreturn(vec![send_section(
                &TOKEN_ID2,
                Standard,
                [0xffff_ffff_ffff],
            )]),
            &spent_tokens,
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::SEND),
                actual_burn_atoms: 32766 * 0xffff_ffff_ffff,
                ..empty_entry()
            }],
            outputs: vec![None, token_atoms::<0>(0xffff_ffff_ffff)],
            failed_parsings: vec![],
        },
    );
}
