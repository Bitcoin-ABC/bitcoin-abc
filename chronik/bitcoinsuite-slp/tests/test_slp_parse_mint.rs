// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{script::Script, tx::TxId};
use bitcoinsuite_slp::{
    parsed::{ParsedData, ParsedMintData, ParsedTxType},
    slp::{
        consts::ALL_TOKEN_TYPES, mint_opreturn,
        mint_vault::ADDITIONAL_QUANTITY_FIELD_NAMES, mint_vault_opreturn,
        parse, ParseError,
    },
    structs::TokenMeta,
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
fn test_parse_mint_invalid_pushes() {
    for token_type in [1, 0x41, 0x81] {
        for pushes in (0..3).chain(4..100) {
            // Invalid MINT, too few pushes
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x04],
                    b"MINT",
                    // repeat 0x0101, which pushes 0x01
                    &vec![0x01; pushes * 2],
                ]
                .concat(),
                ParseError::UnexpectedNumPushes {
                    expected: 6,
                    actual: 3 + pushes,
                },
            );
        }
    }
}

#[test]
fn test_parse_mint_invalid_token_id() {
    for &token_type in ALL_TOKEN_TYPES {
        for size in (0u8..32).chain(33..=0xff) {
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x04],
                    b"MINT",
                    &[0x4c, size],
                    &vec![0x33; size as usize],
                    &[0x4c, 0x00, 0x01, 0x00],
                ]
                .concat(),
                ParseError::InvalidFieldSize {
                    field_name: "token_id",
                    actual: size as usize,
                    expected: &[32],
                },
            );
        }
    }
}

#[test]
fn test_parse_mint_invalid_mint_baton_size() {
    for token_type in [1, 0x41, 0x81] {
        for size in 2u8..=0xff {
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x04],
                    b"MINT",
                    &[32],
                    &[0x22; 32],
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
fn test_parse_mint_invalid_mint_baton() {
    for token_type in [
        SlpTokenType::Fungible,
        SlpTokenType::Nft1Child,
        SlpTokenType::Nft1Group,
    ] {
        for mint_baton_out_idx in 0..=1 {
            check_script(
                mint_opreturn(
                    &TokenId::from_be_bytes([2; 32]),
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
fn test_parse_mint_additional_quantity_size() {
    for token_type in [1, 0x41, 0x81] {
        for size in (0..8).chain(9..=0xff) {
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x04],
                    b"MINT",
                    &[32],
                    &[0x22; 32],
                    &[0x4c, 0x00],
                    &[0x4c, size],
                    &vec![0x01; size as usize],
                ]
                .concat(),
                ParseError::InvalidFieldSize {
                    field_name: "additional_quantity",
                    actual: size as usize,
                    expected: &[8],
                },
            );
        }
    }
}

#[test]
fn test_parse_valid_mint_baton_simple() {
    let token_id = TokenId::from_be_bytes([0x22; 32]);
    let additional_quantity = 0x987654321abcdef2;
    for token_type in [
        SlpTokenType::Fungible,
        SlpTokenType::Nft1Child,
        SlpTokenType::Nft1Group,
    ] {
        assert_eq!(
            parse(
                &TxId::from([0; 32]),
                &mint_opreturn(
                    &token_id,
                    token_type,
                    Some(4),
                    additional_quantity,
                ),
            ),
            Ok(Some(ParsedData {
                meta: TokenMeta {
                    token_id,
                    token_type: TokenType::Slp(token_type),
                },
                tx_type: ParsedTxType::Mint(ParsedMintData {
                    atoms_vec: vec![additional_quantity, 0, 0],
                    num_batons: 1,
                }),
            })),
        );
    }
}

#[test]
fn test_parse_valid_mint_baton() {
    // Valid MINT
    let token_types = [
        (1u8, SlpTokenType::Fungible),
        (0x41, SlpTokenType::Nft1Child),
        (0x81, SlpTokenType::Nft1Group),
    ];

    let mint_baton_indices = [
        (None, [].as_ref()),
        (Some(2u8), &[]),
        (Some(4), &[0u64, 0]),
        (Some(0xff), &[0; 0xfd]),
    ];

    for ((type_byte, token_type), (mint_baton_out_idx, amounts_pad)) in
        token_types
            .into_iter()
            .cartesian_product(mint_baton_indices)
    {
        assert_eq!(
            parse(
                &TxId::from([0; 32]),
                &Script::new(
                    [
                        [0x6a, 0x04].as_ref(),
                        b"SLP\0",
                        &[0x01, type_byte],
                        &[0x04],
                        b"MINT",
                        &[0x20],
                        &[
                            44, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
                        ],
                        &match mint_baton_out_idx {
                            Some(idx) => [0x01, idx],
                            None => [0x4c, 0],
                        },
                        &[0x08, 0x98, 0x76, 0x54, 0x32, 0x1a, 0xbc, 0xde, 0xf2],
                    ]
                    .concat()
                    .into()
                ),
            ),
            Ok(Some(ParsedData {
                meta: TokenMeta {
                    token_id: TokenId::from_be_bytes([
                        44, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
                        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
                    ]),
                    token_type: TokenType::Slp(token_type),
                },
                tx_type: ParsedTxType::Mint(ParsedMintData {
                    atoms_vec: {
                        [0x987654321abcdef2]
                            .into_iter()
                            .chain(amounts_pad.iter().cloned())
                            .collect::<Vec<_>>()
                    },
                    num_batons: if mint_baton_out_idx.is_some() {
                        1
                    } else {
                        0
                    },
                }),
            })),
        );
    }
}

#[test]
fn test_parse_mint_vault_invalid_pushes() {
    for pushes in 0..2 {
        // Invalid MINT Vault, too few pushes
        check_script(
            &[
                [0x6a, 0x04].as_ref(),
                b"SLP\0",
                &[0x01, 2],
                &[0x04],
                b"MINT",
                // repeat 0x0101, which pushes 0x01
                &vec![0x01; pushes * 2],
            ]
            .concat(),
            ParseError::TooFewPushes {
                expected: 5,
                actual: 3 + pushes,
            },
        );
    }

    for pushes in 21..100 {
        // Invalid MINT Vault, too many pushes
        check_script(
            &[
                [0x6a, 0x04].as_ref(),
                b"SLP\0",
                &[0x01, 2],
                &[0x04],
                b"MINT",
                // repeat 0x0101, which pushes 0x01
                &vec![0x01; pushes * 2],
            ]
            .concat(),
            ParseError::SuperfluousPushes {
                expected: 23,
                actual: 3 + pushes,
            },
        );
    }
}

#[test]
fn test_parse_mint_vault_invalid_amount_size() {
    // Test all possible MINT outputs with one amount having 2 bytes
    for num_outputs in 1..=19 {
        let script_intro = [
            [0x6a, 0x04].as_ref(),
            b"SLP\0",
            &[0x01, 2],
            &[0x04],
            b"MINT",
            &[0x20],
            &[0x22; 32],
        ]
        .concat();
        for (invalid_idx, field_name) in ADDITIONAL_QUANTITY_FIELD_NAMES
            .iter()
            .enumerate()
            .take(num_outputs)
        {
            let mut script = script_intro.clone();
            for idx in 0..num_outputs {
                if invalid_idx == idx {
                    script.extend([0x02, 0x00, 0x00]);
                } else {
                    script.extend([
                        0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    ]);
                }
            }
            check_script(
                &script,
                ParseError::InvalidFieldSize {
                    field_name,
                    expected: &[8],
                    actual: 2,
                },
            );
        }
    }
}

#[test]
fn test_parse_valid_mint_vault_simple() {
    let token_id = TokenId::from_be_bytes([0x22; 32]);
    let additional_quantities =
        [77, 0x987654321abcdef2, 0, 0xffffffffffffffff, 1];
    assert_eq!(
        parse(
            &TxId::from([0; 32]),
            &mint_vault_opreturn(&token_id, additional_quantities),
        ),
        Ok(Some(ParsedData {
            meta: TokenMeta {
                token_id,
                token_type: TokenType::Slp(SlpTokenType::MintVault),
            },
            tx_type: ParsedTxType::Mint(ParsedMintData {
                atoms_vec: additional_quantities.to_vec(),
                num_batons: 0,
            }),
        })),
    );
}

#[test]
fn test_parse_valid_mint_vault() {
    // Valid MINT Vault, test all valid number of amounts
    let script_intro = [
        [0x6a, 0x04].as_ref(),
        b"SLP\0",
        &[0x01, 2],
        &[0x04],
        b"MINT",
        &[0x20],
        &[0x22; 32],
    ]
    .concat();
    for num_amounts in 1..=19 {
        let mut script = script_intro.clone();
        let mut atoms_vec = Vec::with_capacity(num_amounts);
        for idx in 0..num_amounts {
            let amount = idx as u64;
            script.push(0x08);
            script.extend(amount.to_be_bytes());
            atoms_vec.push(amount);
        }
        assert_eq!(
            parse(&TxId::from([0; 32]), &Script::new(script.into()),),
            Ok(Some(ParsedData {
                meta: TokenMeta {
                    token_id: TokenId::from_be_bytes([0x22; 32]),
                    token_type: TokenType::Slp(SlpTokenType::MintVault),
                },
                tx_type: ParsedTxType::Mint(ParsedMintData {
                    atoms_vec,
                    num_batons: 0,
                }),
            })),
        );
    }
}
