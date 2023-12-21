// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::tx::TxId;
use bitcoinsuite_slp::{
    alp::{parse_section_with_ignored_err, ParseError},
    parsed::{ParsedData, ParsedTxType},
    structs::TokenMeta,
    token_id::TokenId,
    token_type::{AlpTokenType, TokenType},
};

const SLP2: &[u8] = b"SLP2";
const TXID: TxId = TxId::new([0x76; 32]);
const META: TokenMeta = TokenMeta {
    token_id: TokenId::new(TXID),
    token_type: TokenType::Alp(AlpTokenType::Standard),
};

fn parse(data: Vec<u8>) -> Result<ParsedData, ParseError> {
    parse_section_with_ignored_err(&TxId::default(), data.into())
}

fn not_enough(
    field_name: &'static str,
    expected: usize,
    actual: usize,
) -> Result<ParsedData, ParseError> {
    Err(ParseError::NotEnoughBytes {
        field_name,
        expected,
        actual,
    })
}

#[test]
fn test_parse_alp_send_not_enough_bytes() {
    for size in 0..=31 {
        assert_eq!(
            parse([SLP2, &[0], b"\x04SEND", &vec![0; size]].concat()),
            not_enough("token_id", 32, size),
        );
    }
    assert_eq!(
        parse([SLP2, &[0], b"\x04SEND", &[0x76; 32]].concat()),
        not_enough("send_amount", 1, 0),
    );
}

#[test]
fn test_parse_alp_send_invalid_size() {
    // any size > 127 for num amounts is invalid
    for invalid in 128..=255 {
        assert_eq!(
            parse([SLP2, &[0], b"\x04SEND", &[0x76; 32], &[invalid]].concat()),
            Err(ParseError::SizeOutOfRange {
                field_name: "send_amount",
                size: invalid
            }),
        );
    }
}

#[test]
fn test_parse_alp_send_valid_minimal() {
    assert_eq!(
        parse([SLP2, &[0], b"\x04SEND", &[0x76; 32], &[0]].concat()),
        Ok(ParsedData {
            meta: META,
            tx_type: ParsedTxType::Send(vec![]),
        }),
    );
}

#[test]
fn test_parse_alp_send_leftover() {
    // leftover bytes
    assert_eq!(
        parse([SLP2, &[0], b"\x04SEND", &[0x76; 32], &[0], b"hello"].concat()),
        Err(ParseError::LeftoverBytes(b"hello".to_vec().into())),
    );
}

#[test]
fn test_parse_alp_send_valid_amounts() {
    for size in 0..=127 {
        let mut pushdata = [SLP2, &[0], b"\x04SEND", &[0x76; 32]].concat();
        pushdata.push(size as u8);
        let mut amounts = Vec::with_capacity(size);
        for i in 0..size {
            pushdata.push(i as u8);
            pushdata.extend([0; 5]);
            amounts.push(i as u64);
        }
        assert_eq!(
            parse(pushdata),
            Ok(ParsedData {
                meta: META,
                tx_type: ParsedTxType::Send(amounts),
            }),
        );
    }
}
