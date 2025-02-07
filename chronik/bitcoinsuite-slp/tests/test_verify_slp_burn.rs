// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_slp::{
    slp::burn_opreturn,
    structs::TxType,
    test_helpers::{
        empty_entry, meta_slp as meta, spent_atoms, spent_baton, verify,
        TOKEN_ID2, TOKEN_ID3,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::SlpTokenType::*,
};
use pretty_assertions::assert_eq;

#[test]
fn test_verify_burn_wrong_token_id() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(
                burn_opreturn(&TOKEN_ID2, token_type, 10),
                &[spent_atoms(meta(TOKEN_ID3, token_type), 10)],
            ),
            TokenTx {
                entries: vec![
                    TokenTxEntry {
                        meta: meta(TOKEN_ID2, token_type),
                        tx_type: Some(TxType::BURN),
                        intentional_burn_atoms: Some(10),
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta(TOKEN_ID3, token_type),
                        is_invalid: true,
                        actual_burn_atoms: 10,
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
fn test_verify_burn_wrong_token_type() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        for wrong_token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
            if token_type == wrong_token_type {
                continue;
            }
            assert_eq!(
                verify::<1>(
                    burn_opreturn(&TOKEN_ID2, wrong_token_type, 10),
                    &[spent_atoms(meta(TOKEN_ID3, token_type), 10)],
                ),
                TokenTx {
                    entries: vec![
                        TokenTxEntry {
                            meta: meta(TOKEN_ID2, wrong_token_type),
                            tx_type: Some(TxType::BURN),
                            intentional_burn_atoms: Some(10),
                            ..empty_entry()
                        },
                        TokenTxEntry {
                            meta: meta(TOKEN_ID3, token_type),
                            is_invalid: true,
                            actual_burn_atoms: 10,
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
fn test_verify_burn_mint_baton() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(
                burn_opreturn(&TOKEN_ID2, token_type, 10),
                &[spent_baton(meta(TOKEN_ID2, token_type))],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::BURN),
                    intentional_burn_atoms: Some(10),
                    is_invalid: true,
                    burns_mint_batons: true,
                    ..empty_entry()
                },],
                outputs: vec![None, None],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_burn_wrong_amount() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(
                burn_opreturn(&TOKEN_ID2, token_type, 10),
                &[spent_atoms(meta(TOKEN_ID2, token_type), 9)],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::BURN),
                    intentional_burn_atoms: Some(10),
                    actual_burn_atoms: 9,
                    ..empty_entry()
                },],
                outputs: vec![None, None],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_burn_success() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(
                burn_opreturn(&TOKEN_ID2, token_type, 10),
                &[spent_atoms(meta(TOKEN_ID2, token_type), 10)],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::BURN),
                    intentional_burn_atoms: Some(10),
                    actual_burn_atoms: 10,
                    ..empty_entry()
                },],
                outputs: vec![None, None],
                failed_parsings: vec![],
            },
        );
    }
}
