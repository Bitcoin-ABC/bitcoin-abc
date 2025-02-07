// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bytes::Bytes;

use crate::{
    parsed::{ParsedData, ParsedTxType},
    slp::{
        common::{parse_atoms, parse_token_id},
        ParseError,
    },
    structs::TokenMeta,
    token_type::{SlpTokenType, TokenType},
};

pub(crate) fn parse_burn_data(
    token_type: SlpTokenType,
    opreturn_data: Vec<Bytes>,
) -> Result<ParsedData, ParseError> {
    if opreturn_data.len() != 5 {
        return Err(ParseError::UnexpectedNumPushes {
            expected: 5,
            actual: opreturn_data.len(),
        });
    }
    let mut data_iter = opreturn_data.into_iter();
    let _lokad_id = data_iter.next().unwrap();
    let _token_type = data_iter.next().unwrap();
    let _tx_type = data_iter.next().unwrap();
    let token_id_bytes = data_iter.next().unwrap();
    let token_id = parse_token_id(&token_id_bytes)?;
    let token_burn_quantity = data_iter.next().unwrap();

    let token_burn_quantity =
        parse_atoms(&token_burn_quantity, "token_burn_quantity")?;

    Ok(ParsedData {
        meta: TokenMeta {
            token_id,
            token_type: TokenType::Slp(token_type),
        },
        tx_type: ParsedTxType::Burn(token_burn_quantity),
    })
}
