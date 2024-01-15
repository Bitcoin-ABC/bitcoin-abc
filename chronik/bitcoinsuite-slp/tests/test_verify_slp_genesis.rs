// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::hash::ShaRmd160;
use bitcoinsuite_slp::{
    slp::genesis_opreturn,
    structs::{GenesisInfo, TxType},
    test_helpers::{
        empty_entry, meta_alp, meta_slp as meta, spent_amount, token_amount,
        token_baton, verify, INFO_SLP as INFO, TOKEN_ID1, TOKEN_ID2, TOKEN_ID3,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::SlpTokenType::*,
    verify::BurnError,
};
use pretty_assertions::assert_eq;

#[test]
fn test_verify_genesis_missing_nft1_group() {
    // Missing NFT1 Group token
    assert_eq!(
        verify::<1>(genesis_opreturn(&INFO, Nft1Child, None, 1), &[]),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID1, Nft1Child),
                tx_type: Some(TxType::GENESIS),
                genesis_info: Some(INFO.clone()),
                burn_error: Some(BurnError::MissingNft1Group),
                is_invalid: true,
                ..empty_entry()
            }],
            outputs: vec![None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_genesis_wrong_nft1_group() {
    for in_token_type in [Fungible, MintVault, Nft1Child] {
        assert_eq!(
            verify::<1>(
                genesis_opreturn(&INFO, Nft1Child, None, 1),
                &[spent_amount(meta(TOKEN_ID2, in_token_type), 1)],
            ),
            TokenTx {
                entries: vec![
                    TokenTxEntry {
                        meta: meta(TOKEN_ID1, Nft1Child),
                        tx_type: Some(TxType::GENESIS),
                        genesis_info: Some(INFO.clone()),
                        burn_error: Some(BurnError::MissingNft1Group),
                        is_invalid: true,
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta(TOKEN_ID2, in_token_type),
                        actual_burn_amount: 1,
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
fn test_verify_genesis_wrong_nft1_group_input_position() {
    assert_eq!(
        verify::<1>(
            genesis_opreturn(&INFO, Nft1Child, None, 1),
            // NFT1 Group must be at idx 0, is at idx 1
            &[None, spent_amount(meta(TOKEN_ID2, Nft1Group), 1)],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID1, Nft1Child),
                    tx_type: Some(TxType::GENESIS),
                    genesis_info: Some(INFO.clone()),
                    burn_error: Some(BurnError::MissingNft1Group),
                    is_invalid: true,
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID2, Nft1Group),
                    actual_burn_amount: 1,
                    is_invalid: true,
                    ..empty_entry()
                },
            ],
            outputs: vec![None, None],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_genesis_success_nft1_child() {
    assert_eq!(
        verify::<1>(
            genesis_opreturn(&INFO, Nft1Child, None, 1),
            &[spent_amount(meta(TOKEN_ID2, Nft1Group), 1)],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID1, Nft1Child),
                    tx_type: Some(TxType::GENESIS),
                    genesis_info: Some(INFO.clone()),
                    group_token_meta: Some(meta(TOKEN_ID2, Nft1Group)),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID2, Nft1Group),
                    ..empty_entry()
                },
            ],
            outputs: vec![None, token_amount::<0>(1)],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_genesis_success() {
    for out_token_type in [Fungible, Nft1Group] {
        assert_eq!(
            verify::<2>(
                genesis_opreturn(&INFO, out_token_type, Some(2), 99),
                &[],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID1, out_token_type),
                    tx_type: Some(TxType::GENESIS),
                    genesis_info: Some(INFO.clone()),
                    ..empty_entry()
                }],
                outputs: vec![None, token_amount::<0>(99), token_baton::<0>()],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_genesis_success_with_burn() {
    for out_token_type in [Fungible, MintVault, Nft1Group] {
        let genesis_info = GenesisInfo {
            mint_vault_scripthash: match out_token_type {
                MintVault => Some(ShaRmd160([4; 20])),
                _ => None,
            },
            ..INFO.clone()
        };

        assert_eq!(
            verify::<3>(
                genesis_opreturn(&genesis_info, out_token_type, Some(3), 55),
                &[
                    spent_amount(meta(TOKEN_ID2, Fungible), 77),
                    spent_amount(meta_alp(TOKEN_ID3), 22),
                ],
            ),
            TokenTx {
                entries: vec![
                    TokenTxEntry {
                        meta: meta(TOKEN_ID1, out_token_type),
                        tx_type: Some(TxType::GENESIS),
                        genesis_info: Some(genesis_info.clone()),
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta(TOKEN_ID2, Fungible),
                        actual_burn_amount: 77,
                        is_invalid: true,
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta_alp(TOKEN_ID3),
                        actual_burn_amount: 22,
                        is_invalid: true,
                        ..empty_entry()
                    },
                ],
                outputs: vec![
                    None,
                    token_amount::<0>(55),
                    None,
                    token_baton::<0>().filter(|_| out_token_type != MintVault),
                ],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_genesis_success_nft1_child_with_burn() {
    assert_eq!(
        verify::<1>(
            genesis_opreturn(&INFO, Nft1Child, None, 1),
            &[
                spent_amount(meta(TOKEN_ID2, Nft1Group), 77),
                spent_amount(meta(TOKEN_ID2, Nft1Group), 44),
                spent_amount(meta_alp(TOKEN_ID3), 22),
            ],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID1, Nft1Child),
                    tx_type: Some(TxType::GENESIS),
                    genesis_info: Some(INFO.clone()),
                    group_token_meta: Some(meta(TOKEN_ID2, Nft1Group)),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID2, Nft1Group),
                    actual_burn_amount: 44,
                    is_invalid: true,
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta_alp(TOKEN_ID3),
                    actual_burn_amount: 22,
                    is_invalid: true,
                    ..empty_entry()
                },
            ],
            outputs: vec![None, token_amount::<0>(1),],
            failed_parsings: vec![],
        },
    );
}
