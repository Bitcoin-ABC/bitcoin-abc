// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{script::Script, tx::TxId};
use bitcoinsuite_slp::{
    parsed::{ParsedData, ParsedTxType},
    slp::{
        consts::ALL_TOKEN_TYPES, parse,
        send::TOKEN_OUTPUT_QUANTITY_FIELD_NAMES, send_opreturn, ParseError,
    },
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
fn test_parse_send_invalid_pushes() {
    for &token_type in ALL_TOKEN_TYPES {
        for pushes in 0..2 {
            // Invalid SEND Vault, too few pushes
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x04],
                    b"SEND",
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
            // Invalid SEND Vault, too many pushes
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x04],
                    b"SEND",
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
}

#[test]
fn test_parse_send_invalid_token_id() {
    for &token_type in ALL_TOKEN_TYPES {
        for size in (0u8..32).chain(33..=0xff) {
            check_script(
                &[
                    [0x6a, 0x04].as_ref(),
                    b"SLP\0",
                    &[0x01, token_type],
                    &[0x04],
                    b"SEND",
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
fn test_parse_send_invalid_amount_size() {
    for &token_type in ALL_TOKEN_TYPES {
        // Test all possible SEND outputs with one amount having 2 bytes
        for num_outputs in 1..=19 {
            let script_intro = [
                [0x6a, 0x04].as_ref(),
                b"SLP\0",
                &[0x01, token_type],
                &[0x04],
                b"SEND",
                &[0x20],
                &[0x22; 32],
            ]
            .concat();
            for (invalid_idx, field_name) in TOKEN_OUTPUT_QUANTITY_FIELD_NAMES
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
                            0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                            0x00,
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
}

#[test]
fn test_parse_valid_send_simple() {
    let token_id = TokenId::from_be_bytes([0x22; 32]);
    for token_type in [
        SlpTokenType::Fungible,
        SlpTokenType::MintVault,
        SlpTokenType::Nft1Child,
        SlpTokenType::Nft1Group,
    ] {
        let amounts = vec![0x987654321abcdef2, 0xffffffffffffffff, 0xb17c01abc];
        assert_eq!(
            parse(
                &TxId::from([0; 32]),
                &send_opreturn(&token_id, token_type, &amounts,),
            ),
            Ok(Some(ParsedData {
                meta: TokenMeta {
                    token_id,
                    token_type: TokenType::Slp(token_type),
                },
                tx_type: ParsedTxType::Send(amounts),
            })),
        );
    }
}

#[test]
fn test_parse_send_valid_complex() {
    // Valid SEND, test all valid number of amounts
    for (type_byte, token_type) in [
        (1u8, SlpTokenType::Fungible),
        (2, SlpTokenType::MintVault),
        (0x41, SlpTokenType::Nft1Child),
        (0x81, SlpTokenType::Nft1Group),
    ] {
        let script_intro = [
            [0x6a, 0x04].as_ref(),
            b"SLP\0",
            &[0x01, type_byte],
            &[0x04],
            b"SEND",
            &[0x20],
            &[0x22; 32],
        ]
        .concat();
        for num_amounts in 1..=19 {
            let mut script = script_intro.clone();
            let mut amounts = Vec::with_capacity(num_amounts);
            for idx in 0..num_amounts {
                let amount = idx as u64;
                script.push(0x08);
                script.extend(amount.to_be_bytes());
                amounts.push(amount);
            }
            assert_eq!(
                parse(&TxId::from([0; 32]), &Script::new(script.into()),),
                Ok(Some(ParsedData {
                    meta: TokenMeta {
                        token_id: TokenId::from_be_bytes([0x22; 32]),
                        token_type: TokenType::Slp(token_type),
                    },
                    tx_type: ParsedTxType::Send(amounts),
                })),
            );
        }
    }
}
