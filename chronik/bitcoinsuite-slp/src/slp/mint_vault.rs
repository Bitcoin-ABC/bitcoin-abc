// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for parsing SLP MINT Vault (V2) txs

use bytes::Bytes;

use crate::{
    parsed::{ParsedData, ParsedMintData, ParsedTxType},
    slp::{
        common::{parse_atoms, parse_token_id},
        ParseError,
    },
    structs::TokenMeta,
    token_type::{SlpTokenType, TokenType},
};

/// Helper so we can have all human-readable quantity field names in &'static
/// references
pub static ADDITIONAL_QUANTITY_FIELD_NAMES: &[&str; 19] = &[
    "additional_quantity1",
    "additional_quantity2",
    "additional_quantity3",
    "additional_quantity4",
    "additional_quantity5",
    "additional_quantity6",
    "additional_quantity7",
    "additional_quantity8",
    "additional_quantity9",
    "additional_quantity10",
    "additional_quantity11",
    "additional_quantity12",
    "additional_quantity13",
    "additional_quantity14",
    "additional_quantity15",
    "additional_quantity16",
    "additional_quantity17",
    "additional_quantity18",
    "additional_quantity19",
];

pub(crate) fn parse_mint_data_mint_vault(
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

    let atoms_vec = data_iter
        .enumerate()
        .map(|(idx, quantity)| {
            parse_atoms(&quantity, ADDITIONAL_QUANTITY_FIELD_NAMES[idx])
        })
        .collect::<Result<Vec<_>, _>>()?;

    Ok(ParsedData {
        meta: TokenMeta {
            token_id,
            token_type: TokenType::Slp(SlpTokenType::MintVault),
        },
        tx_type: ParsedTxType::Mint(ParsedMintData {
            atoms_vec,
            num_batons: 0,
        }),
    })
}
