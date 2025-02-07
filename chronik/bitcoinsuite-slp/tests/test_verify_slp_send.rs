// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_slp::{
    slp::send_opreturn,
    structs::TxType,
    test_helpers::{
        empty_entry, meta_slp as meta, spent_atoms, spent_atoms_group,
        spent_baton, token_atoms, verify, TOKEN_ID2, TOKEN_ID3, TOKEN_ID4,
    },
    token_tx::{TokenTx, TokenTxEntry},
    token_type::SlpTokenType::*,
    verify::BurnError,
};
use pretty_assertions::assert_eq;

#[test]
fn test_verify_send_no_inputs() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(send_opreturn(&TOKEN_ID2, token_type, &[77]), &[]),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::SEND),
                    is_invalid: true,
                    burn_error: Some(BurnError::InsufficientInputSum {
                        required: 77,
                        actual: 0,
                    }),
                    ..empty_entry()
                }],
                outputs: vec![None, None],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_send_not_enough_inputs() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(
                send_opreturn(&TOKEN_ID2, token_type, &[7]),
                &[spent_atoms(meta(TOKEN_ID2, token_type), 5)],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::SEND),
                    is_invalid: true,
                    actual_burn_atoms: 5,
                    burn_error: Some(BurnError::InsufficientInputSum {
                        required: 7,
                        actual: 5,
                    }),
                    ..empty_entry()
                }],
                outputs: vec![None, None],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_send_wrong_token_id() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<1>(
                send_opreturn(&TOKEN_ID2, token_type, &[7]),
                &[spent_atoms(meta(TOKEN_ID3, token_type), 7)],
            ),
            TokenTx {
                entries: vec![
                    TokenTxEntry {
                        meta: meta(TOKEN_ID2, token_type),
                        tx_type: Some(TxType::SEND),
                        is_invalid: true,
                        burn_error: Some(BurnError::InsufficientInputSum {
                            required: 7,
                            actual: 0,
                        }),
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta(TOKEN_ID3, token_type),
                        actual_burn_atoms: 7,
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
fn test_verify_send_wrong_token_type() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        for wrong_token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
            if token_type == wrong_token_type {
                continue;
            }
            assert_eq!(
                verify::<1>(
                    send_opreturn(&TOKEN_ID2, wrong_token_type, &[7]),
                    &[spent_atoms(meta(TOKEN_ID2, token_type), 7)],
                ),
                TokenTx {
                    entries: vec![
                        TokenTxEntry {
                            meta: meta(TOKEN_ID2, wrong_token_type),
                            tx_type: Some(TxType::SEND),
                            is_invalid: true,
                            burn_error: Some(BurnError::InsufficientInputSum {
                                required: 7,
                                actual: 0,
                            }),
                            ..empty_entry()
                        },
                        TokenTxEntry {
                            meta: meta(TOKEN_ID2, token_type),
                            actual_burn_atoms: 7,
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
fn test_verify_send_64bit_off_by_one() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<4>(
                send_opreturn(
                    &TOKEN_ID2,
                    token_type,
                    &[1, 0xffff_ffff_ffff_0000, 0xffff_ffff_ffff_0001, 2],
                ),
                &[
                    spent_atoms(
                        meta(TOKEN_ID2, token_type),
                        0xffff_ffff_ffff_0000,
                    ),
                    spent_atoms(
                        meta(TOKEN_ID2, token_type),
                        0xffff_ffff_ffff_0003,
                    ),
                ],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::SEND),
                    is_invalid: true,
                    actual_burn_atoms: 0x1fffffffffffe0003,
                    burn_error: Some(BurnError::InsufficientInputSum {
                        required: 0x1fffffffffffe0004,
                        actual: 0x1fffffffffffe0003,
                    }),
                    ..empty_entry()
                },],
                outputs: vec![None, None, None, None, None],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_send_success_null() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<2>(send_opreturn(&TOKEN_ID2, token_type, &[0, 0, 0]), &[]),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::SEND),
                    ..empty_entry()
                }],
                outputs: vec![None, None, None],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_send_success_simple() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<4>(
                send_opreturn(&TOKEN_ID2, token_type, &[1, 2, 0, 4]),
                &[spent_atoms(meta(TOKEN_ID2, token_type), 7)],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::SEND),
                    ..empty_entry()
                }],
                outputs: vec![
                    None,
                    token_atoms::<0>(1),
                    token_atoms::<0>(2),
                    None,
                    token_atoms::<0>(4),
                ],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_send_wrong_group_token_id() {
    // Different token ID causes us to ignore the group_token_id
    assert_eq!(
        verify::<1>(
            send_opreturn(&TOKEN_ID2, Nft1Child, &[1]),
            &[spent_atoms_group(
                meta(TOKEN_ID3, Nft1Child),
                1,
                meta(TOKEN_ID4, Nft1Group),
            )],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID2, Nft1Child),
                    tx_type: Some(TxType::SEND),
                    group_token_meta: None,
                    is_invalid: true,
                    burn_error: Some(BurnError::InsufficientInputSum {
                        required: 1,
                        actual: 0,
                    }),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID3, Nft1Child),
                    tx_type: None,
                    // group still carried over even when burned
                    group_token_meta: Some(meta(TOKEN_ID4, Nft1Group)),
                    actual_burn_atoms: 1,
                    is_invalid: true,
                    ..empty_entry()
                },
            ],
            outputs: vec![None, None],
            failed_parsings: vec![],
        },
    );
    // Different token type causes us to ignore the group_token_id too
    assert_eq!(
        verify::<1>(
            send_opreturn(&TOKEN_ID2, Fungible, &[1]),
            &[spent_atoms_group(
                meta(TOKEN_ID2, Nft1Child),
                1,
                meta(TOKEN_ID3, Nft1Group),
            )],
        ),
        TokenTx {
            entries: vec![
                TokenTxEntry {
                    meta: meta(TOKEN_ID2, Fungible),
                    tx_type: Some(TxType::SEND),
                    is_invalid: true,
                    burn_error: Some(BurnError::InsufficientInputSum {
                        required: 1,
                        actual: 0,
                    }),
                    ..empty_entry()
                },
                TokenTxEntry {
                    meta: meta(TOKEN_ID2, Nft1Child),
                    group_token_meta: Some(meta(TOKEN_ID3, Nft1Group)),
                    actual_burn_atoms: 1,
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
fn test_verify_send_success_group_token_id() {
    // Carry over group_token_id from the inputs if it matches
    assert_eq!(
        verify::<4>(
            send_opreturn(&TOKEN_ID2, Nft1Child, &[1, 2, 0, 4]),
            &[spent_atoms_group(
                meta(TOKEN_ID2, Nft1Child),
                7,
                meta(TOKEN_ID3, Nft1Group),
            )],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2, Nft1Child),
                tx_type: Some(TxType::SEND),
                group_token_meta: Some(meta(TOKEN_ID3, Nft1Group)),
                ..empty_entry()
            }],
            outputs: vec![
                None,
                token_atoms::<0>(1),
                token_atoms::<0>(2),
                None,
                token_atoms::<0>(4),
            ],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_send_success() {
    assert_eq!(
        verify::<4>(
            send_opreturn(&TOKEN_ID2, Nft1Child, &[1, 2, 0, 4]),
            &[spent_atoms_group(
                meta(TOKEN_ID2, Nft1Child),
                7,
                meta(TOKEN_ID3, Nft1Group)
            )],
        ),
        TokenTx {
            entries: vec![TokenTxEntry {
                meta: meta(TOKEN_ID2, Nft1Child),
                tx_type: Some(TxType::SEND),
                group_token_meta: Some(meta(TOKEN_ID3, Nft1Group)),
                ..empty_entry()
            }],
            outputs: vec![
                None,
                token_atoms::<0>(1),
                token_atoms::<0>(2),
                None,
                token_atoms::<0>(4),
            ],
            failed_parsings: vec![],
        },
    );
}

#[test]
fn test_verify_send_success_64bit() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<4>(
                send_opreturn(
                    &TOKEN_ID2,
                    token_type,
                    &[1, 0xffff_ffff_ffff_0000, 0xffff_ffff_ffff_0001, 2],
                ),
                &[
                    spent_atoms(
                        meta(TOKEN_ID2, token_type),
                        0xffff_ffff_ffff_0000,
                    ),
                    spent_atoms(
                        meta(TOKEN_ID2, token_type),
                        0xffff_ffff_ffff_0004,
                    ),
                ],
            ),
            TokenTx {
                entries: vec![TokenTxEntry {
                    meta: meta(TOKEN_ID2, token_type),
                    tx_type: Some(TxType::SEND),
                    ..empty_entry()
                }],
                outputs: vec![
                    None,
                    token_atoms::<0>(1),
                    token_atoms::<0>(0xffff_ffff_ffff_0000),
                    token_atoms::<0>(0xffff_ffff_ffff_0001),
                    token_atoms::<0>(2),
                ],
                failed_parsings: vec![],
            },
        );
    }
}

#[test]
fn test_verify_send_success_big() {
    for token_type in [Fungible, MintVault, Nft1Child, Nft1Group] {
        assert_eq!(
            verify::<3>(
                send_opreturn(
                    &TOKEN_ID2,
                    token_type,
                    &[0xffff_ffff_ffff_0000, 0xffff_ffff_ffff_0002, 1],
                ),
                &[
                    spent_atoms(
                        meta(TOKEN_ID2, token_type),
                        0xffff_ffff_ffff_0000,
                    ),
                    spent_atoms(
                        meta(TOKEN_ID2, token_type),
                        0xefff_ffff_ffff_0000,
                    ),
                    spent_atoms(
                        meta(TOKEN_ID2, token_type),
                        0x2fff_ffff_ffff_0000,
                    ),
                    spent_atoms(meta(TOKEN_ID2, token_type), 10),
                    spent_atoms(meta(TOKEN_ID3, Nft1Child), 1),
                    spent_baton(meta(TOKEN_ID4, Fungible)),
                ],
            ),
            TokenTx {
                entries: vec![
                    TokenTxEntry {
                        meta: meta(TOKEN_ID2, token_type),
                        tx_type: Some(TxType::SEND),
                        actual_burn_atoms: 0x1fff_ffff_ffff_0007,
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta(TOKEN_ID3, Nft1Child),
                        tx_type: None,
                        actual_burn_atoms: 1,
                        is_invalid: true,
                        ..empty_entry()
                    },
                    TokenTxEntry {
                        meta: meta(TOKEN_ID4, Fungible),
                        tx_type: None,
                        is_invalid: true,
                        burns_mint_batons: true,
                        ..empty_entry()
                    },
                ],
                outputs: vec![
                    None,
                    token_atoms::<0>(0xffff_ffff_ffff_0000),
                    token_atoms::<0>(0xffff_ffff_ffff_0002),
                    token_atoms::<0>(1),
                ],
                failed_parsings: vec![],
            },
        );
    }
}
