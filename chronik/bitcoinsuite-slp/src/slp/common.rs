// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use crate::{slp::ParseError, structs::Amount};

pub(crate) fn parse_amount(
    amount_bytes: &[u8],
    field_name: &'static str,
) -> Result<Amount, ParseError> {
    Ok(Amount::from_be_bytes(amount_bytes.try_into().map_err(
        |_| ParseError::InvalidFieldSize {
            field_name,
            expected: &[8],
            actual: amount_bytes.len(),
        },
    )?))
}
