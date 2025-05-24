// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::tx::TxId;
use bitcoinsuite_slp::{
    alp::{parse_section_with_ignored_err, ParseError},
    parsed::{ParsedData, ParsedGenesis, ParsedMintData, ParsedTxType},
    structs::{GenesisInfo, TokenMeta},
    token_id::TokenId,
    token_type::{AlpTokenType, TokenType},
};
use bytes::Bytes;
use pretty_assertions::assert_eq;

const SLP2: &[u8] = b"SLP2";
const TXID: TxId = TxId::new([4; 32]);
const META: TokenMeta = TokenMeta {
    token_id: TokenId::new(TXID),
    token_type: TokenType::Alp(AlpTokenType::Standard),
};

fn parse(data: Vec<u8>) -> Result<ParsedData, ParseError> {
    parse_section_with_ignored_err(&TXID, data.into())
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
fn test_parse_alp_genesis_not_enough_bytes() {
    // missing token_ticker
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS"].concat()),
        not_enough("token_ticker", 1, 0),
    );
    // token_ticker missing 99 bytes
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[99]].concat()),
        not_enough("token_ticker", 99, 0),
    );
    // missing token_name
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0]].concat()),
        not_enough("token_name", 1, 0),
    );
    // token_name missing 99 bytes
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0], &[99]].concat()),
        not_enough("token_name", 99, 0),
    );
    // missing url
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0, 0]].concat()),
        not_enough("url", 1, 0),
    );
    // url missing 99 bytes
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0, 0], &[99]].concat()),
        not_enough("url", 99, 0),
    );
    // missing token data
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0, 0, 0]].concat()),
        not_enough("data", 1, 0),
    );
    // token data missing 99 bytes
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0, 0, 0], &[99]].concat()),
        not_enough("data", 99, 0),
    );
    // missing auth_pubkey
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0, 0, 0, 0]].concat()),
        not_enough("auth_pubkey", 1, 0),
    );
    // auth_pubkey missing 99 bytes
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0, 0, 0, 0], &[99]].concat()),
        not_enough("auth_pubkey", 99, 0),
    );
    // missing decimals
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0, 0, 0, 0, 0]].concat()),
        not_enough("decimals", 1, 0),
    );
    // missing num amounts
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0, 0, 0, 0, 0, 0]].concat()),
        not_enough("mint_amount", 1, 0),
    );
    // missing num batons
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0, 0, 0, 0, 0, 0, 0]].concat()),
        not_enough("num_batons", 1, 0),
    );
}

#[test]
fn test_parse_alp_genesis_default() {
    // parsing default empty Genesis succeeded
    assert_eq!(
        parse([SLP2, &[0], b"\x07GENESIS", &[0, 0, 0, 0, 0, 0, 0, 0]].concat()),
        Ok(ParsedData {
            meta: TokenMeta {
                token_id: TokenId::from(TXID),
                token_type: TokenType::Alp(AlpTokenType::Standard),
            },
            tx_type: ParsedTxType::Genesis(Box::new(ParsedGenesis {
                info: GenesisInfo::empty_alp(),
                ..Default::default()
            })),
        }),
    );
}

#[test]
fn test_parse_alp_genesis_leftover_bytes() {
    // leftover bytes
    assert_eq!(
        parse(
            [
                SLP2,
                &[0],
                b"\x07GENESIS",
                &[0, 0, 0, 0, 0, 0, 0, 0],
                b"hello"
            ]
            .concat()
        ),
        Err(ParseError::LeftoverBytes(b"hello".to_vec().into())),
    );
}

#[test]
fn test_parse_alp_genesis_invalid_sizes() {
    // any size > 127 for token_ticker, token_name, url, data, auth_pubkey,
    // decimals, num amounts and num batons is invalid
    for i in [0, 1, 2, 3, 4, 6, 7] {
        let fields = [
            "token_ticker",
            "token_name",
            "url",
            "data",
            "auth_pubkey",
            "decimals",
            "mint_amount",
            "num_batons",
        ];
        let mut tail = [0, 0, 0, 0, 0, 0, 0, 0];
        for invalid in 128..=255 {
            tail[i] = invalid;
            assert_eq!(
                parse([SLP2, &[0], b"\x07GENESIS", &tail].concat()),
                Err(ParseError::SizeOutOfRange {
                    field_name: fields[i],
                    size: invalid,
                }),
            );
        }
    }
}

#[test]
fn test_parse_alp_genesis_invalid_decimals() {
    // any decimals > 9 is invalid
    for invalid in 10..=255 {
        assert_eq!(
            parse(
                [SLP2, &[0], b"\x07GENESIS", &[0, 0, 0, 0, 0, invalid, 0, 0]]
                    .concat()
            ),
            Err(ParseError::DecimalsOutOfRange(invalid)),
        );
    }
}

#[test]
fn test_parse_alp_genesis_valid_field_sizes() {
    // exhaustively test all allowed sizes for token_ticker, token_name, url,
    // data, auth_pubkey
    for i in 0..5 {
        for size in 0..=127 {
            let mut pushdata = Vec::new();
            pushdata.extend([SLP2, &[0], b"\x07GENESIS"].concat());
            pushdata.extend(vec![0; i]);
            pushdata.push(size as u8);
            pushdata.extend(vec![0x76; size]);
            pushdata.extend(vec![0; 4 - i]);
            pushdata.extend([0, 0, 0]);
            let mut info = GenesisInfo::default();
            let GenesisInfo {
                token_ticker,
                token_name,
                url,
                data,
                auth_pubkey,
                ..
            } = &mut info;
            let data = data.insert(Bytes::new());
            let auth_pubkey = auth_pubkey.insert(Bytes::new());
            let fields = [token_ticker, token_name, url, data, auth_pubkey];
            *fields[i] = vec![0x76; size].into();
            assert_eq!(
                parse(pushdata),
                Ok(ParsedData {
                    meta: META,
                    tx_type: ParsedTxType::Genesis(Box::new(ParsedGenesis {
                        info,
                        mint_data: ParsedMintData::default(),
                    })),
                }),
            );
        }
    }
}

#[test]
fn test_parse_alp_genesis_valid_amounts() {
    for size in 0..=127 {
        let mut pushdata =
            [SLP2, &[0], b"\x07GENESIS", &[0, 0, 0, 0, 0, 0]].concat();
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
                tx_type: ParsedTxType::Genesis(Box::new(ParsedGenesis {
                    info: GenesisInfo::empty_alp(),
                    mint_data: ParsedMintData {
                        atoms_vec,
                        num_batons: 0,
                    },
                })),
            }),
        );
    }
}

#[test]
fn test_parse_alp_genesis_valid_num_batons() {
    for size in 0..=127 {
        let mut pushdata =
            [SLP2, &[0], b"\x07GENESIS", &[0, 0, 0, 0, 0, 0, 0]].concat();
        pushdata.push(size);
        assert_eq!(
            parse(pushdata),
            Ok(ParsedData {
                meta: META,
                tx_type: ParsedTxType::Genesis(Box::new(ParsedGenesis {
                    info: GenesisInfo::empty_alp(),
                    mint_data: ParsedMintData {
                        atoms_vec: vec![],
                        num_batons: size as usize,
                    },
                })),
            }),
        );
    }
}

#[test]
fn test_parse_alp_genesis_valid_example() {
    assert_eq!(
        parse(
            [
                SLP2,
                &[0],
                b"\x07GENESIS",
                b"\x0212",
                b"\x03345",
                b"\x046789",
                b"\x05abcde",
                b"\x06fghijk",
                &[7],
                &[3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8],
                &[4],
            ]
            .concat(),
        ),
        Ok(ParsedData {
            meta: META,
            tx_type: ParsedTxType::Genesis(Box::new(ParsedGenesis {
                info: GenesisInfo {
                    token_ticker: b"12".to_vec().into(),
                    token_name: b"345".to_vec().into(),
                    url: b"6789".to_vec().into(),
                    data: Some(b"abcde".to_vec().into()),
                    auth_pubkey: Some(b"fghijk".to_vec().into()),
                    decimals: 7,
                    ..Default::default()
                },
                mint_data: ParsedMintData {
                    atoms_vec: vec![
                        0x60504030201,
                        0x20100090807,
                        0x80706050403
                    ],
                    num_batons: 4,
                },
            })),
        }),
    );
}
