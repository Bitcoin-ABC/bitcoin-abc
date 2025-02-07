// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use crate::{slp::ParseError, structs::Atoms, token_id::TokenId};

pub(crate) fn parse_atoms(
    atoms_bytes: &[u8],
    field_name: &'static str,
) -> Result<Atoms, ParseError> {
    Ok(Atoms::from_be_bytes(atoms_bytes.try_into().map_err(
        |_| ParseError::InvalidFieldSize {
            field_name,
            expected: &[8],
            actual: atoms_bytes.len(),
        },
    )?))
}

pub(crate) fn parse_token_id(
    token_id_bytes: &[u8],
) -> Result<TokenId, ParseError> {
    // token_id in SLP is encoded in big-endian (unlike in Bitcoin, which uses
    // little-endian)
    Ok(TokenId::from_be_bytes(
        token_id_bytes.as_ref().try_into().map_err(|_| {
            ParseError::InvalidFieldSize {
                field_name: "token_id",
                expected: &[32],
                actual: token_id_bytes.len(),
            }
        })?,
    ))
}
