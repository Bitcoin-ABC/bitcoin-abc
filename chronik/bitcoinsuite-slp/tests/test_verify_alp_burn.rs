// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_slp::{
    alp::{burn_section, sections_opreturn, send_section},
    structs::TxType,
    test_helpers::{
        empty_entry, meta_alp as meta, spent_amount, spent_baton, token_amount,
        verify, TOKEN_ID2, TOKEN_ID3, TOKEN_ID4, TOKEN_ID5,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::AlpTokenType::*,
    verify::BurnError,
};
use pretty_assertions::assert_eq;

#[test]
fn test_verify_alp_burn_standalone() {
    assert_eq!(
        verify::<0>(
            sections_opreturn(vec![burn_section(&TOKEN_ID2, Standard, 400)]),
            &[],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::BURN),
                intentional_burn_amount: Some(400),
                ..empty_entry()
            }],
            outputs: vec![None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_burn_with_send() {
    assert_eq!(
        verify::<1>(
            sections_opreturn(vec![
                burn_section(&TOKEN_ID2, Standard, 400),
                send_section(&TOKEN_ID2, Standard, [200]),
            ]),
            &[],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::SEND),
                intentional_burn_amount: Some(400),
                is_invalid: true,
                burn_error: Some(BurnError::InsufficientInputSum {
                    required: 200,
                    actual: 0,
                }),
                ..empty_entry()
            }],
            outputs: vec![None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_send_with_burn() {
    assert_eq!(
        verify::<1>(
            sections_opreturn(vec![
                send_section(&TOKEN_ID2, Standard, [200]),
                burn_section(&TOKEN_ID2, Standard, 400),
            ]),
            &[],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::SEND),
                intentional_burn_amount: Some(400),
                is_invalid: true,
                burn_error: Some(BurnError::InsufficientInputSum {
                    required: 200,
                    actual: 0,
                }),
                ..empty_entry()
            }],
            outputs: vec![None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_burn_success() {
    assert_eq!(
        verify::<2>(
            sections_opreturn(vec![
                send_section(&TOKEN_ID2, Standard, [80, 20]),
                burn_section(&TOKEN_ID2, Standard, 400),
            ]),
            &[spent_amount(meta(TOKEN_ID2), 500)],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2),
                tx_type: Some(TxType::SEND),
                actual_burn_amount: 400,
                intentional_burn_amount: Some(400),
                ..empty_entry()
            }],
            outputs: vec![None, token_amount::<0>(80), token_amount::<0>(20)],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_alp_burn_big() {
    assert_eq!(
        verify::<4>(
            sections_opreturn(vec![
                send_section(&TOKEN_ID2, Standard, [80, 20]),
                burn_section(&TOKEN_ID2, Standard, 400),
                send_section(&TOKEN_ID3, Standard, [0, 0, 5000, 1000]),
                burn_section(&TOKEN_ID3, Standard, 1000),
                burn_section(&TOKEN_ID4, Standard, 3000),
            ]),
            &[
                spent_amount(meta(TOKEN_ID2), 500),
                spent_amount(meta(TOKEN_ID3), 7000),
                spent_amount(meta(TOKEN_ID4), 2000),
                spent_baton(meta(TOKEN_ID4)),
                spent_amount(meta(TOKEN_ID5), 500),
            ],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID2),
                    tx_type: Some(TxType::SEND),
                    actual_burn_amount: 400,
                    intentional_burn_amount: Some(400),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID3),
                    tx_type: Some(TxType::SEND),
                    actual_burn_amount: 1000,
                    intentional_burn_amount: Some(1000),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID4),
                    tx_type: Some(TxType::BURN),
                    actual_burn_amount: 2000,
                    intentional_burn_amount: Some(3000),
                    is_invalid: true,
                    burns_mint_batons: true,
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID5),
                    actual_burn_amount: 500,
                    is_invalid: true,
                    ..empty_entry()
                },
            ],
            outputs: vec![
                None,
                token_amount::<0>(80),
                token_amount::<0>(20),
                token_amount::<1>(5000),
                token_amount::<1>(1000),
            ],
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
