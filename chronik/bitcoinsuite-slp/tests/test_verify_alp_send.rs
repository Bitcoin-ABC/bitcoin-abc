// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_slp::{
    alp::{sections_opreturn, send_section},
    structs::TxType,
    test_helpers::{
        empty_entry, meta_alp as meta, spent_amount, token_amount, verify,
        TOKEN_ID2, TOKEN_ID3, TOKEN_ID4, TOKEN_ID5,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::AlpTokenType::*,
    verify::BurnError,
};
use pretty_assertions::assert_eq;

#[test]
fn test_verify_alp_send_no_inputs() {
    assert_eq!(
        verify::<2>(
            sections_opreturn(vec![send_section(
                &TOKEN_ID2,
                Standard,
                [80, 20],
            )]),
            &[],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::SEND),
                is_invalid: true,
                burn_error: Some(BurnError::InsufficientInputSum {
                    required: 100,
                    actual: 0,
                }),
                ..empty_entry()
            }],
            outputs: vec![None, None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_send_insufficient_inputs() {
    assert_eq!(
        verify::<2>(
            sections_opreturn(vec![send_section(
                &TOKEN_ID2,
                Standard,
                [80, 20],
            )]),
            &[spent_amount(meta(TOKEN_ID2), 90)],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::SEND),
                actual_burn_amount: 90,
                is_invalid: true,
                burn_error: Some(BurnError::InsufficientInputSum {
                    required: 100,
                    actual: 90,
                }),
                ..empty_entry()
            }],
            outputs: vec![None, None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_send_wrong_token_id() {
    assert_eq!(
        verify::<2>(
            sections_opreturn(vec![send_section(
                &TOKEN_ID2,
                Standard,
                [80, 20],
            )]),
            &[spent_amount(meta(TOKEN_ID3), 100)],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID2),
                    tx_type: Some(TxType::SEND),
                    is_invalid: true,
                    burn_error: Some(BurnError::InsufficientInputSum {
                        required: 100,
                        actual: 0,
                    }),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID3),
                    tx_type: None,
                    is_invalid: true,
                    actual_burn_amount: 100,
                    ..empty_entry()
                }
            ],
            outputs: vec![None, None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_send_success_simple() {
    assert_eq!(
        verify::<2>(
            sections_opreturn(vec![send_section(
                &TOKEN_ID2,
                Standard,
                [80, 20],
            )]),
            &[spent_amount(meta(TOKEN_ID2), 100)],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::SEND),
                ..empty_entry()
            }],
            outputs: vec![None, token_amount::<0>(80), token_amount::<0>(20)],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_send_success_no_tokens() {
    assert_eq!(
        verify::<2>(
            sections_opreturn(vec![
                send_section(&TOKEN_ID2, Standard, [0, 0],)
            ]),
            &[],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::SEND),
                ..empty_entry()
            }],
            outputs: vec![None, None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_send_success_big() {
    assert_eq!(
        verify::<5>(
            sections_opreturn(vec![
                send_section(&TOKEN_ID2, Standard, [80, 0, 20]),
                send_section(&TOKEN_ID3, Standard, [0, 8000, 0, 2000]),
                send_section(&TOKEN_ID4, Standard, [0, 0, 0, 0, 500]),
            ]),
            &[
                spent_amount(meta(TOKEN_ID2), 150),
                spent_amount(meta(TOKEN_ID3), 14000),
                spent_amount(meta(TOKEN_ID5), 700),
            ],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID2),
                    tx_type: Some(TxType::SEND),
                    actual_burn_amount: 50,
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID3),
                    tx_type: Some(TxType::SEND),
                    actual_burn_amount: 4000,
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID4),
                    tx_type: Some(TxType::SEND),
                    is_invalid: true,
                    burn_error: Some(BurnError::InsufficientInputSum {
                        required: 500,
                        actual: 0,
                    }),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID5),
                    is_invalid: true,
                    actual_burn_amount: 700,
                    ..empty_entry()
                },
            ],
            outputs: vec![
                None,
                token_amount::<0>(80),
                token_amount::<1>(8000),
                token_amount::<0>(20),
                token_amount::<1>(2000),
                None,
            ],
            failed_parsings: vec![],
        },
    );
}
