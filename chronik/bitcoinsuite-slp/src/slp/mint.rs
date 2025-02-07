// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

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

pub(crate) fn parse_mint_data_baton(
    token_type: SlpTokenType,
    opreturn_data: Vec<Bytes>,
) -> Result<ParsedData, ParseError> {
    if opreturn_data.len() != 6 {
        return Err(ParseError::UnexpectedNumPushes {
            expected: 6,
            actual: opreturn_data.len(),
        });
    }
    let mut data_iter = opreturn_data.into_iter();
    let _lokad_id = data_iter.next().unwrap();
    let _token_type = data_iter.next().unwrap();
    let _tx_type = data_iter.next().unwrap();
    let token_id_bytes = data_iter.next().unwrap();
    let token_id = parse_token_id(&token_id_bytes)?;

    let mint_baton_out_idx = data_iter.next().unwrap();
    if !mint_baton_out_idx.is_empty() && mint_baton_out_idx.len() != 1 {
        return Err(ParseError::InvalidFieldSize {
            field_name: "mint_baton_out_idx",
            expected: &[0, 1],
            actual: mint_baton_out_idx.len(),
        });
    }
    if mint_baton_out_idx.len() == 1 && mint_baton_out_idx[0] < 2 {
        return Err(ParseError::InvalidMintBatonIdx(mint_baton_out_idx[0]));
    }
    let mint_baton_out_idx = mint_baton_out_idx
        .first()
        .map(|&mint_baton_out_idx| mint_baton_out_idx as usize);

    let additional_quantity = data_iter.next().unwrap();
    assert!(data_iter.next().is_none());
    let additional_quantity =
        parse_atoms(&additional_quantity, "additional_quantity")?;

    let mut atoms_vec = vec![additional_quantity];
    if let Some(mint_baton_out_idx) = mint_baton_out_idx {
        // Pad mint amount 0s so the mint baton is at the correct output
        // -1 for the OP_RETURN output, and -1 for the additional quantity
        // output
        atoms_vec.extend(vec![0; mint_baton_out_idx - 2]);
    }

    Ok(ParsedData {
        meta: TokenMeta {
            token_id,
            token_type: TokenType::Slp(token_type),
        },
        tx_type: ParsedTxType::Mint(ParsedMintData {
            atoms_vec,
            num_batons: mint_baton_out_idx.is_some() as usize,
        }),
    })
}
