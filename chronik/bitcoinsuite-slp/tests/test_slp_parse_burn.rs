// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{script::Script, tx::TxId};
use bitcoinsuite_slp::{
    parsed::{ParsedData, ParsedTxType},
    slp::{burn_opreturn, consts::ALL_TOKEN_TYPES, parse, ParseError},
    structs::TokenMeta,
    token_id::TokenId,
    token_type::{SlpTokenType, TokenType},
};

fn check_script(script: &[u8], expected_err: ParseError) {
    assert_eq!(
        parse(&TxId::default(), &Script::new(script.to_vec().into())),
        Err(expected_err),
    );
}

#[test]
fn test_parse_burn_invalid_pushes() {
    for &token_type in ALL_TOKEN_TYPES {
        for pushes in (0..2).chain(3..100) {
            // Invalid BURN, unexpected number of pushes
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x04],
                    b"BURN",
                    // repeat 0x0101, which pushes 0x01
                    &vec![0x01; pushes * 2],
                ]
                .concat(),
                ParseError::UnexpectedNumPushes {
                    expected: 5,
                    actual: 3 + pushes,
                },
            );
        }
    }
}

#[test]
fn test_parse_burn_invalid_token_id() {
    for &token_type in ALL_TOKEN_TYPES {
        for size in (0u8..32).chain(33..=0xff) {
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x04],
                    b"BURN",
                    &[0x4c, size],
                    &vec![0x33; size as usize],
                    &[0x4c, 0x00],
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
fn test_parse_burn_invalid_amount_size() {
    for &token_type in ALL_TOKEN_TYPES {
        for size in (0..8).chain(9..=0xff) {
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x04],
                    b"BURN",
                    &[32],
                    &[0x22; 32],
                    &[0x4c, size],
                    &vec![0x01; size as usize],
                ]
                .concat(),
                ParseError::InvalidFieldSize {
                    field_name: "token_burn_quantity",
                    actual: size as usize,
                    expected: &[8],
                },
            );
        }
    }
}

#[test]
fn test_parse_burn_valid_simple() {
    let token_id = TokenId::from_be_bytes([0x22; 32]);
    for token_type in [
        SlpTokenType::Fungible,
        SlpTokenType::MintVault,
        SlpTokenType::Nft1Child,
        SlpTokenType::Nft1Group,
    ] {
        let amount = 0x987654321abcdef2;
        assert_eq!(
            parse(
                &TxId::from([0; 32]),
                &burn_opreturn(&token_id, token_type, amount),
            ),
            Ok(Some(ParsedData {
                meta: TokenMeta {
                    token_id,
                    token_type: TokenType::Slp(token_type),
                },
                tx_type: ParsedTxType::Burn(amount),
            })),
        );
    }
}
