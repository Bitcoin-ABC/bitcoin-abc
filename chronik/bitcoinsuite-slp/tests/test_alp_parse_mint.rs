// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::tx::TxId;
use bitcoinsuite_slp::{
    alp::{parse_section_with_ignored_err, ParseError},
    parsed::{ParsedData, ParsedMintData, ParsedTxType},
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
fn test_parse_alp_mint_not_enough_bytes() {
    for size in 0..=31 {
        assert_eq!(
            parse([SLP2, &[0], b"\x04MINT", &vec![0; size]].concat()),
            not_enough("token_id", 32, size),
        );
    }
    assert_eq!(
        parse([SLP2, &[0], b"\x04MINT", &[0x76; 32]].concat()),
        not_enough("mint_amount", 1, 0),
    );
}

#[test]
fn test_parse_alp_mint_invalid_size() {
    // any size > 127 for num amounts and num batons is invalid
    for i in [0, 1] {
        let fields = ["mint_amount", "num_batons"];
        let mut tail = [0, 0];
        for invalid in 128..=255 {
            tail[i] = invalid;
            assert_eq!(
                parse([SLP2, &[0], b"\x04MINT", &[0x76; 32], &tail].concat()),
                Err(ParseError::SizeOutOfRange {
                    field_name: fields[i],
                    size: invalid,
                }),
            );
        }
    }
}

#[test]
fn test_parse_alp_mint_simple() {
    assert_eq!(
        parse([SLP2, &[0], b"\x04MINT", &[0x76; 32], &[0, 0]].concat()),
        Ok(ParsedData {
            meta: META,
            tx_type: ParsedTxType::Mint(ParsedMintData::default()),
        }),
    );
}

#[test]
fn test_parse_alp_mint_leftover() {
    // leftover bytes
    assert_eq!(
        parse(
            [SLP2, &[0], b"\x04MINT", &[0x76; 32], &[0, 0], b"hello"].concat()
        ),
        Err(ParseError::LeftoverBytes(b"hello".to_vec().into())),
    );
}

#[test]
fn test_parse_alp_mint_valid_amounts() {
    for size in 0..=127 {
        let mut pushdata = [SLP2, &[0], b"\x04MINT", &[0x76; 32]].concat();
        pushdata.push(size as u8);
        let mut atoms_vec = Vec::with_capacity(size);
        for i in 0..size {
            pushdata.push(i as u8);
            pushdata.extend([0; 5]);
            atoms_vec.push(i as u64);
        }
        pushdata.push(0);
        assert_eq!(
            parse(pushdata),
            Ok(ParsedData {
                meta: META,
                tx_type: ParsedTxType::Mint(ParsedMintData {
                    atoms_vec,
                    num_batons: 0,
                }),
            }),
        );
    }
}

#[test]
fn test_parse_alp_mint_valid_num_batons() {
    for size in 0..=127 {
        let mut pushdata =
            [SLP2, &[0], b"\x04MINT", &[0x76; 32], &[0]].concat();
        pushdata.push(size);
        assert_eq!(
            parse(pushdata),
            Ok(ParsedData {
                meta: META,
                tx_type: ParsedTxType::Mint(ParsedMintData {
                    atoms_vec: vec![],
                    num_batons: size as usize,
                }),
            }),
        );
    }
}

#[test]
fn test_parse_alp_mint_valid_example() {
    assert_eq!(
        parse(
            [
                SLP2,
                &[0],
                b"\x04MINT",
                &[0x76; 32],
                &[3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8],
                &[4],
            ]
            .concat()
        ),
        Ok(ParsedData {
            meta: META,
            tx_type: ParsedTxType::Mint(ParsedMintData {
                atoms_vec: vec![0x60504030201, 0x20100090807, 0x80706050403,],
                num_batons: 4,
            }),
        }),
    );
}
