// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_slp::{
    slp::mint_opreturn,
    structs::TxType,
    test_helpers::{
        empty_entry, meta_alp, meta_slp as meta, spent_atoms, spent_baton,
        token_atoms, token_baton, verify, TOKEN_ID2, TOKEN_ID3, TOKEN_ID4,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::SlpTokenType::*,
    verify::BurnError,
};
use pretty_assertions::assert_eq;

#[test]
fn test_verify_mint_no_inputs() {
    for token_type in [Fungible, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(mint_opreturn(&TOKEN_ID2, token_type, None, 44), &[]),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::MINT),
                    is_invalid: true,
                    burn_error: Some(BurnError::MissingMintBaton),
                    ..empty_entry()
                }],
                outputs: vec![None, None],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_mint_no_mint_input() {
    for token_type in [Fungible, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(
                mint_opreturn(&TOKEN_ID2, token_type, None, 44),
                &[spent_atoms(meta(TOKEN_ID2, token_type), 77)],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::MINT),
                    is_invalid: true,
                    actual_burn_atoms: 77,
                    burn_error: Some(BurnError::MissingMintBaton),
                    ..empty_entry()
                }],
                outputs: vec![None, None],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_mint_wrong_mint_baton_token_id() {
    for token_type in [Fungible, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(
                mint_opreturn(&TOKEN_ID2, token_type, None, 44),
                &[spent_baton(meta(TOKEN_ID3, token_type))],
            ),
            TokenTx {
                entries: vec![
                    TokenTxEntry {
                        meta: meta(TOKEN_ID2, token_type),
                        tx_type: Some(TxType::MINT),
                        is_invalid: true,
                        burn_error: Some(BurnError::MissingMintBaton),
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta(TOKEN_ID3, token_type),
                        burns_mint_batons: true,
                        is_invalid: true,
                        ..empty_entry()
                    },
                ],
                outputs: vec![None, None],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_mint_wrong_mint_baton_token_type() {
    for out_token_type in [Fungible, Nft1Child, Nft1Group] {
        for in_token_type in [Fungible, Nft1Child, Nft1Group] {
            if out_token_type == in_token_type {
                continue;
            }
            assert_eq!(
                verify::<1>(
                    mint_opreturn(&TOKEN_ID2, out_token_type, None, 44),
                    &[spent_baton(meta(TOKEN_ID2, in_token_type))],
                ),
                TokenTx {
                    entries: vec![
                        TokenTxEntry {
                            meta: meta(TOKEN_ID2, out_token_type),
                            tx_type: Some(TxType::MINT),
                            is_invalid: true,
                            burn_error: Some(BurnError::MissingMintBaton),
                            ..empty_entry()
                        },
                        TokenTxEntry {
                            meta: meta(TOKEN_ID2, in_token_type),
                            burns_mint_batons: true,
                            is_invalid: true,
                            ..empty_entry()
                        },
                    ],
                    outputs: vec![None, None],
                    failed_parsings: vec![],
                },
            );
        }
    }
}

#[test]
fn test_verify_mint_success_simple() {
    for token_type in [Fungible, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<3>(
                mint_opreturn(&TOKEN_ID2, token_type, Some(3), 44),
                &[spent_baton(meta(TOKEN_ID2, token_type))],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::MINT),
                    ..empty_entry()
                }],
                outputs: vec![
                    None,
                    token_atoms::<0>(44),
                    None,
                    token_baton::<0>(),
                ],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_mint_success_with_burn() {
    for token_type in [Fungible, Nft1Child, Nft1Group] {
        for wrong_token_type in [Fungible, Nft1Child, Nft1Group] {
            if token_type == wrong_token_type {
                continue;
            }
            assert_eq!(
                verify::<3>(
                    mint_opreturn(&TOKEN_ID2, token_type, Some(3), 44),
                    &[
                        spent_atoms(meta(TOKEN_ID2, token_type), 77),
                        spent_baton(meta(TOKEN_ID2, token_type)),
                        spent_baton(meta(TOKEN_ID2, wrong_token_type)),
                        spent_baton(meta(TOKEN_ID3, token_type)),
                        spent_baton(meta_alp(TOKEN_ID4)),
                    ],
                ),
                TokenTx {
                    entries: vec![
                        TokenTxEntry {
                            meta: meta(TOKEN_ID2, token_type),
                            tx_type: Some(TxType::MINT),
                            actual_burn_atoms: 77,
                            ..empty_entry()
                        },
                        TokenTxEntry {
                            meta: meta(TOKEN_ID2, wrong_token_type),
                            is_invalid: true,
                            burns_mint_batons: true,
                            ..empty_entry()
                        },
                        TokenTxEntry {
                            meta: meta(TOKEN_ID3, token_type),
                            is_invalid: true,
                            burns_mint_batons: true,
                            ..empty_entry()
                        },
                        TokenTxEntry {
                            meta: meta_alp(TOKEN_ID4),
                            is_invalid: true,
                            burns_mint_batons: true,
                            ..empty_entry()
                        },
                    ],
                    outputs: vec![
                        None,
                        token_atoms::<0>(44),
                        None,
                        token_baton::<0>(),
                    ],
                    failed_parsings: vec![],
                },
            );
        }
    }
}
