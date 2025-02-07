// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{hash::ShaRmd160, script::Script, tx::TxId};
use bitcoinsuite_slp::{
    parsed::{ParsedData, ParsedGenesis, ParsedMintData, ParsedTxType},
    slp::{genesis_opreturn, parse, ParseError},
    structs::{Atoms, GenesisInfo, TokenMeta},
    token_id::TokenId,
    token_type::{SlpTokenType, TokenType},
};
use itertools::Itertools;

fn check_script(script: &[u8], expected_err: ParseError) {
    assert_eq!(
        parse(&TxId::default(), &Script::new(script.to_vec().into())),
        Err(expected_err),
    );
}

#[test]
fn test_parse_genesis_invalid_pushes() {
    for pushes in (0..7).chain(8..100) {
        // Invalid GENESIS, too few pushes
        check_script(
            &[
                [0x6a, 0x04].as_ref(),
                b"SLP\0",
                &[0x01, 1],
                &[0x07],
                b"GENESIS",
                // repeat 0x0101, which pushes 0x01
                &vec![0x01; pushes * 2],
            ]
            .concat(),
            ParseError::UnexpectedNumPushes {
                expected: 10,
                actual: 3 + pushes,
            },
        );
    }
}

#[test]
fn test_parse_genesis_invalid_token_document_hash() {
    for size in (1u8..32).chain(33..=0xff) {
        check_script(
            &[
                [0x6a, 0x04].as_ref(),
                b"SLP\0",
                &[0x01, 1],
                &[0x07],
                b"GENESIS",
                &[0x01, 0x00, 0x01, 0x00, 0x01, 0x00],
                &[0x4c, size],
                &vec![0x33; size as usize],
                &[0x01, 0x00, 0x01, 0x00, 0x01, 0x00],
            ]
            .concat(),
            ParseError::InvalidFieldSize {
                field_name: "token_document_hash",
                actual: size as usize,
                expected: &[0, 32],
            },
        );
    }
}

#[test]
fn test_parse_genesis_invalid_decimals_size() {
    for size in [0u8].into_iter().chain(2..=0xff) {
        check_script(
            &[
                [0x6a, 0x04].as_ref(),
                b"SLP\0",
                &[0x01, 1],
                &[0x07],
                b"GENESIS",
                &[0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x4c, 0x00],
                &[0x4c, size],
                &vec![0x06; size as usize],
                &[0x01, 0x00, 0x01, 0x00],
            ]
            .concat(),
            ParseError::InvalidFieldSize {
                field_name: "decimals",
                actual: size as usize,
                expected: &[1],
            },
        );
    }
}

#[test]
fn test_parse_genesis_invalid_decimals() {
    for token_type in [
        SlpTokenType::Fungible,
        SlpTokenType::MintVault,
        SlpTokenType::Nft1Group,
    ] {
        for decimals in 10..=0xff {
            check_script(
                genesis_opreturn(
                    &GenesisInfo {
                        decimals,
                        mint_vault_scripthash: match token_type {
                            SlpTokenType::MintVault => Some(ShaRmd160([0; 20])),
                            _ => None,
                        },
                        ..Default::default()
                    },
                    token_type,
                    None,
                    0,
                )
                .as_ref(),
                ParseError::InvalidDecimals {
                    actual: decimals as usize,
                },
            );
        }
    }
}

#[test]
fn test_parse_genesis_invalid_mint_baton_size() {
    for token_type in [1, 0x41, 0x81] {
        for size in 2u8..=0xff {
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x07],
                    b"GENESIS",
                    &[
                        0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x4c, 0x00, 0x01,
                        0x00,
                    ],
                    &[0x4c, size],
                    &vec![0x01; size as usize],
                    &[0x01, 0x00],
                ]
                .concat(),
                ParseError::InvalidFieldSize {
                    field_name: "mint_baton_out_idx",
                    actual: size as usize,
                    expected: &[0, 1],
                },
            );
        }
    }
}

#[test]
fn test_parse_genesis_invalid_mint_baton() {
    for token_type in [
        SlpTokenType::Fungible,
        SlpTokenType::Nft1Child,
        SlpTokenType::Nft1Group,
    ] {
        for mint_baton_out_idx in 0..=1 {
            check_script(
                genesis_opreturn(
                    &GenesisInfo::default(),
                    token_type,
                    Some(mint_baton_out_idx),
                    0,
                )
                .as_ref(),
                ParseError::InvalidMintBatonIdx(mint_baton_out_idx),
            );
        }
    }
}

#[test]
fn test_parse_genesis_nft_child_mint_baton_disallowed() {
    for mint_baton_out_idx in 2..=0xff {
        check_script(
            genesis_opreturn(
                &GenesisInfo::default(),
                SlpTokenType::Nft1Child,
                Some(mint_baton_out_idx),
                0,
            )
            .as_ref(),
            ParseError::Nft1ChildCannotHaveMintBaton,
        );
    }
}

#[test]
fn test_parse_genesis_invalid_mint_vault_scripthash() {
    for size in (0..20).chain(21..=0xff) {
        check_script(
            &[
                [0x6a, 0x04].as_ref(),
                b"SLP\0",
                &[0x01, 2],
                &[0x07],
                b"GENESIS",
                &[0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x4c, 0x00, 0x01, 0x00],
                &[0x4c, size],
                &vec![0x01; size as usize],
                &[0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00],
            ]
            .concat(),
            ParseError::InvalidFieldSize {
                field_name: "mint_vault_scripthash",
                actual: size as usize,
                expected: &[20],
            },
        );
    }
}

#[test]
fn test_parse_genesis_initial_quantity_size() {
    for size in (0..8).chain(9..=0xff) {
        check_script(
            &[
                [0x6a, 0x04].as_ref(),
                b"SLP\0",
                &[0x01, 1],
                &[0x07],
                b"GENESIS",
                &[0x01, 0x00, 0x01, 0x00, 0x01, 0x00, 0x4c, 0x00, 0x01, 0x00],
                &[0x4c, 0x00],
                &[0x4c, size],
                &vec![0x01; size as usize],
            ]
            .concat(),
            ParseError::InvalidFieldSize {
                field_name: "initial_quantity",
                actual: size as usize,
                expected: &[8],
            },
        );
    }
}

#[test]
fn test_parse_genesis_nft_child_invalid_initial_quantity() {
    for initial_quantity in [0].into_iter().chain(2..1000) {
        check_script(
            genesis_opreturn(
                &GenesisInfo::default(),
                SlpTokenType::Nft1Child,
                None,
                initial_quantity,
            )
            .as_ref(),
            ParseError::Nft1ChildInvalidInitialQuantity(initial_quantity),
        );
    }
}

#[test]
fn test_parse_genesis_nft_child_invalid_decimals() {
    for decimals in 1..=9 {
        check_script(
            genesis_opreturn(
                &GenesisInfo {
                    decimals,
                    ..Default::default()
                },
                SlpTokenType::Nft1Child,
                None,
                1,
            )
            .as_ref(),
            ParseError::Nft1ChildInvalidDecimals(decimals),
        );
    }
}

#[test]
fn test_parse_valid_genesis() {
    let token_types = [
        (1u8, SlpTokenType::Fungible),
        (2, SlpTokenType::MintVault),
        (0x41, SlpTokenType::Nft1Child),
        (0x81, SlpTokenType::Nft1Group),
    ];

    let token_document_hashes = [
        None,
        Some([0u8; 32]),
        Some([0xff; 32]),
        Some([
            0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1,
            2, 3, 4, 5, 6, 7, 8, 9, 0, 1,
        ]),
    ];

    for ((type_byte, token_type), token_document_hash) in token_types
        .into_iter()
        .cartesian_product(token_document_hashes)
    {
        let (qty, decimals) = match token_type {
            SlpTokenType::Nft1Child => (1, 0),
            _ => (123, 9),
        };
        assert_eq!(
            parse(
                &TxId::from([100; 32]),
                &Script::new(
                    [
                        [0x6a, 0x04].as_ref(),
                        b"SLP\0",
                        &[0x01, type_byte],
                        &[0x07],
                        b"GENESIS",
                        &[0x01, 0x44, 0x01, 0x55, 0x01, 0x66],
                        &match token_document_hash {
                            Some(hash) => [[32].as_ref(), &hash].concat(),
                            None => vec![0x4c, 0x00],
                        },
                        &[0x01, decimals],
                        match token_type {
                            SlpTokenType::MintVault => &[0x14; 21],
                            SlpTokenType::Nft1Child => &[0x4c, 0x00],
                            _ => &[0x01, 0x04],
                        },
                        &[0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, qty],
                    ]
                    .concat()
                    .into()
                ),
            ),
            Ok(Some(ParsedData {
                meta: TokenMeta {
                    token_id: TokenId::new(TxId::from([100; 32])),
                    token_type: TokenType::Slp(token_type),
                },
                tx_type: ParsedTxType::Genesis(ParsedGenesis {
                    info: GenesisInfo {
                        token_ticker: vec![0x44].into(),
                        token_name: vec![0x55].into(),
                        url: vec![0x66].into(),
                        hash: token_document_hash,
                        mint_vault_scripthash: match token_type {
                            SlpTokenType::MintVault =>
                                Some(ShaRmd160([0x14; 20])),
                            _ => None,
                        },
                        data: None,
                        auth_pubkey: None,
                        decimals,
                    },
                    mint_data: match token_type {
                        SlpTokenType::MintVault | SlpTokenType::Nft1Child =>
                            ParsedMintData {
                                atoms_vec: vec![qty as Atoms],
                                num_batons: 0,
                            },
                        _ => ParsedMintData {
                            atoms_vec: vec![qty as Atoms, 0, 0],
                            num_batons: 1,
                        },
                    },
                }),
            })),
        );
    }
}
