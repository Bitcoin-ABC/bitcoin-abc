// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::tx::TxId;
use bitcoinsuite_slp::{
    alp::{parse_section, parse_section_with_ignored_err, ParseError},
    parsed::{ParsedData, ParsedTxType},
    structs::TokenMeta,
    token_id::TokenId,
    token_type::{AlpTokenType, TokenType},
};

const SLP2: &[u8] = b"SLP2";
const TXID: TxId = TxId::new([4; 32]);

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
fn test_parse_alp_intro() {
    fn check_should_ignore(pushdata: Vec<u8>, err: ParseError) {
        assert_eq!(parse(pushdata.clone()), Err(err),);
        assert_eq!(parse_section(&TXID, pushdata.into()), Ok(None));
    }

    check_should_ignore(vec![], ParseError::MissingLokadId(vec![].into()));
    check_should_ignore(
        vec![1, 2, 3],
        ParseError::MissingLokadId(vec![1, 2, 3].into()),
    );
    check_should_ignore(
        vec![1, 2, 3, 4],
        ParseError::InvalidLokadId([1, 2, 3, 4]),
    );
    assert_eq!(parse(SLP2.to_vec()), not_enough("token_type", 1, 0));
    assert_eq!(
        parse([SLP2, &[99]].concat()),
        Ok(ParsedData {
            meta: TokenMeta {
                token_id: TokenId::new(TxId::new([0; 32])),
                token_type: TokenType::Alp(AlpTokenType::Unknown(99)),
            },
            tx_type: ParsedTxType::Unknown,
        }),
    );
    assert_eq!(parse([SLP2, &[0]].concat()), not_enough("tx_type", 1, 0));
    assert_eq!(
        parse([SLP2, &[0], &[99]].concat()),
        not_enough("tx_type", 99, 0)
    );
    assert_eq!(
        parse([SLP2, &[0], &[0]].concat()),
        Err(ParseError::UnknownTxType(vec![].into())),
    );
    assert_eq!(
        parse([SLP2, &[0], &[7], b"INVALID"].concat()),
        Err(ParseError::UnknownTxType(b"INVALID".to_vec().into())),
    );
}

#[test]
fn test_parse_alp_slp_mixup() {
    assert_eq!(
        parse(vec![b'S', b'L', b'P', 0]),
        Err(ParseError::InvalidSlpLokadId),
    );
    assert_eq!(
        parse(vec![b'S', b'L', b'P', 0, 1]),
        Err(ParseError::InvalidSlpLokadId),
    );
    assert_eq!(
        parse(vec![b'S', b'L', b'P', 0, 1, 1]),
        Err(ParseError::InvalidSlpLokadId),
    );
}
