// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for parsing SLP SEND txs

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

/// Helper so we can have all human-readable quantity field names in &'static
/// references
pub static TOKEN_OUTPUT_QUANTITY_FIELD_NAMES: &[&str; 19] = &[
    "token_output_quantity1",
    "token_output_quantity2",
    "token_output_quantity3",
    "token_output_quantity4",
    "token_output_quantity5",
    "token_output_quantity6",
    "token_output_quantity7",
    "token_output_quantity8",
    "token_output_quantity9",
    "token_output_quantity10",
    "token_output_quantity11",
    "token_output_quantity12",
    "token_output_quantity13",
    "token_output_quantity14",
    "token_output_quantity15",
    "token_output_quantity16",
    "token_output_quantity17",
    "token_output_quantity18",
    "token_output_quantity19",
];

pub(crate) fn parse_send_data(
    token_type: SlpTokenType,
    opreturn_data: Vec<Bytes>,
) -> Result<ParsedData, ParseError> {
    if opreturn_data.len() < 5 {
        return Err(ParseError::TooFewPushes {
            expected: 5,
            actual: opreturn_data.len(),
        });
    }
    if opreturn_data.len() > 23 {
        return Err(ParseError::SuperfluousPushes {
            expected: 23,
            actual: opreturn_data.len(),
        });
    }
    let mut data_iter = opreturn_data.into_iter();
    let _lokad_id = data_iter.next().unwrap();
    let _token_type = data_iter.next().unwrap();
    let _tx_type = data_iter.next().unwrap();
    let token_id_bytes = data_iter.next().unwrap();
    let token_id = parse_token_id(&token_id_bytes)?;

    let output_quantities = data_iter
        .enumerate()
        .map(|(idx, quantity)| {
            parse_atoms(&quantity, TOKEN_OUTPUT_QUANTITY_FIELD_NAMES[idx])
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(ParsedData {
        meta: TokenMeta {
            token_id,
            token_type: TokenType::Slp(token_type),
        },
        tx_type: ParsedTxType::Send(output_quantities),
    })
}
