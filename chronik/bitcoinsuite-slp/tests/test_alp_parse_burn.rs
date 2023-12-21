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
fn test_parse_alp_burn_not_enough_bytes() {
    for size in 0..=31 {
        assert_eq!(
            parse([SLP2, &[0], b"\x04BURN", &vec![0; size]].concat()),
            not_enough("token_id", 32, size),
        );
    }
    for size in 0..=5 {
        assert_eq!(
            parse(
                [SLP2, &[0], b"\x04BURN", &[0x76; 32], &vec![0; size]].concat()
            ),
            not_enough("burn_amount", 6, size),
        );
    }
}

#[test]
fn test_parse_alp_burn_leftover() {
    // leftover bytes
    assert_eq!(
        parse(
            [SLP2, &[0], b"\x04BURN", &[0x76; 32], &[0; 6], b"hello"].concat()
        ),
        Err(ParseError::LeftoverBytes(b"hello".to_vec().into())),
    );
}

#[test]
fn test_parse_alp_burn_valid() {
    assert_eq!(
        parse(
            [SLP2, &[0], b"\x04BURN", &[0x76; 32], &[1, 2, 3, 4, 5, 6]]
                .concat()
        ),
        Ok(ParsedData {
            meta: META,
            tx_type: ParsedTxType::Burn(0x60504030201),
        }),
    );
}
