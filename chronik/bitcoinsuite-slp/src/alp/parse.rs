// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{
    bytes::{read_array, read_bytes},
    error::DataError,
    tx::TxId,
};
use bytes::Bytes;
use thiserror::Error;

use crate::{
    alp::{
        consts::{ALP_LOKAD_ID, STANDARD_TOKEN_TYPE},
        ParseError::*,
    },
    consts::{BURN, GENESIS, MINT, SEND},
    lokad_id::LokadId,
    parsed::{ParsedData, ParsedGenesis, ParsedMintData, ParsedTxType},
    slp::consts::SLP_LOKAD_ID,
    structs::{Atoms, GenesisInfo, TokenMeta},
    token_id::TokenId,
    token_type::{AlpTokenType, TokenType},
};

/// Errors when parsing an ALP tx.
#[derive(Clone, Debug, Error, Eq, PartialEq)]
pub enum ParseError {
    /// DataError when trying to parse pushdata, e.g. when bytes run out
    #[error("Failed parsing pushdata: {0}")]
    DataError(#[from] DataError),

    /// Not enough bytes
    #[error(
        "Not enough bytes: expected {expected} more bytes but got {actual} \
         for field {field_name}"
    )]
    NotEnoughBytes {
        /// Name of the field according to the spec
        field_name: &'static str,
        /// List of allowed sizes
        expected: usize,
        /// Actual invalid size
        actual: usize,
    },

    /// Reading a size fell out of the 0-127 range.
    #[error("Size out of range: {size}, must be 0-127 for field {field_name}")]
    SizeOutOfRange {
        /// Name of the field according to the spec
        field_name: &'static str,
        /// Out-of-range size
        size: u8,
    },

    /// Not enough bytes to encode a LOKAD ID
    #[error("Missing LOKAD ID: {0:?}")]
    MissingLokadId(Bytes),

    /// Expected "SLP2" LOKAD ID
    #[error("Invalid LOKAD ID: {0:?}")]
    InvalidLokadId(LokadId),

    /// Used the "SLP\0" prefix, this is almost certainly a mistake, so we
    /// handle it separately.
    #[error("Invalid LOKAD ID \"SLP\\0\", did you accidentally use eMPP?")]
    InvalidSlpLokadId,

    /// Unknown tx type.
    /// Note: For known token types, this does not color outputs as "unknown",
    /// as token types cannot update their coloring rules after they're
    /// established.
    #[error("Unknown tx type: {0:?}")]
    UnknownTxType(Bytes),

    /// Decimals must be between 0-9.
    #[error("Decimals out of range: {0}, must be 0-9")]
    DecimalsOutOfRange(u8),

    /// Trailing bytes are not allowed.
    #[error("Leftover bytes: {0:?}")]
    LeftoverBytes(Bytes),
}

trait ParsedNamed<T> {
    fn named(self, field_name: &'static str) -> Result<T, ParseError>;
}

impl<T, E: Into<ParseError>> ParsedNamed<T> for Result<T, E> {
    fn named(self, field_name: &'static str) -> Result<T, ParseError> {
        let result = self.map_err(Into::into);
        if let Err(DataError(DataError::InvalidLength { expected, actual })) =
            result
        {
            return Err(NotEnoughBytes {
                field_name,
                expected,
                actual,
            });
        }
        if let Err(SizeOutOfRange {
            field_name: _,
            size,
        }) = result
        {
            return Err(SizeOutOfRange { field_name, size });
        }
        result
    }
}

/// Parse an individual eMPP pushdata as ALP section.
/// The txid is used to assign GENESIS token IDs.
pub fn parse_section(
    txid: &TxId,
    pushdata: Bytes,
) -> Result<Option<ParsedData>, ParseError> {
    match parse_section_with_ignored_err(txid, pushdata) {
        Ok(parsed) => Ok(Some(parsed)),
        Err(MissingLokadId(_) | InvalidLokadId(_)) => Ok(None),
        Err(err) => Err(err),
    }
}

/// Parse an individual eMPP pushdata as ALP section, but return an error
/// instead of [`None`]` if the script doesn't look like ALP at all.
///
/// Exposed for testing.
pub fn parse_section_with_ignored_err(
    txid: &TxId,
    mut pushdata: Bytes,
) -> Result<ParsedData, ParseError> {
    if pushdata.len() < LokadId::default().len() {
        return Err(MissingLokadId(pushdata));
    }
    let lokad_id: LokadId = read_array(&mut pushdata).unwrap();
    if lokad_id == SLP_LOKAD_ID {
        return Err(InvalidSlpLokadId);
    }
    if lokad_id != ALP_LOKAD_ID {
        return Err(InvalidLokadId(lokad_id));
    }
    let token_type = parse_token_type(&mut pushdata)?;
    if let AlpTokenType::Unknown(_) = token_type {
        return Ok(ParsedData {
            meta: TokenMeta {
                token_id: TokenId::new(TxId::from([0; 32])),
                token_type: TokenType::Alp(token_type),
            },
            tx_type: ParsedTxType::Unknown,
        });
    }
    let tx_type = read_var_bytes(&mut pushdata).named("tx_type")?;
    let parsed = match tx_type.as_ref() {
        GENESIS => parse_genesis(txid, token_type, &mut pushdata)?,
        MINT => parse_mint(token_type, &mut pushdata)?,
        SEND => parse_send(token_type, &mut pushdata)?,
        BURN => parse_burn(token_type, &mut pushdata)?,
        _ => return Err(UnknownTxType(tx_type)),
    };
    if !pushdata.is_empty() {
        return Err(LeftoverBytes(pushdata.split_off(0)));
    }
    Ok(parsed)
}

fn parse_genesis(
    txid: &TxId,
    token_type: AlpTokenType,
    pushdata: &mut Bytes,
) -> Result<ParsedData, ParseError> {
    let token_ticker = read_var_bytes(pushdata).named("token_ticker")?;
    let token_name = read_var_bytes(pushdata).named("token_name")?;
    let url = read_var_bytes(pushdata).named("url")?;
    let data = read_var_bytes(pushdata).named("data")?;
    let auth_pubkey = read_var_bytes(pushdata).named("auth_pubkey")?;
    let decimals = read_byte(pushdata).named("decimals")?;
    let mint_data = parse_mint_data(pushdata)?;
    if decimals > 9 {
        return Err(DecimalsOutOfRange(decimals));
    }
    Ok(ParsedData {
        meta: TokenMeta {
            token_id: TokenId::from(*txid),
            token_type: TokenType::Alp(token_type),
        },
        tx_type: ParsedTxType::Genesis(Box::new(ParsedGenesis {
            info: GenesisInfo {
                token_ticker,
                token_name,
                mint_vault_scripthash: None,
                url,
                hash: None,
                data: Some(data),
                auth_pubkey: Some(auth_pubkey),
                decimals,
            },
            mint_data,
        })),
    })
}

fn parse_mint(
    token_type: AlpTokenType,
    pushdata: &mut Bytes,
) -> Result<ParsedData, ParseError> {
    let token_id = read_token_id(pushdata)?;
    let mint_data = parse_mint_data(pushdata)?;
    Ok(ParsedData {
        meta: TokenMeta {
            token_id,
            token_type: TokenType::Alp(token_type),
        },
        tx_type: ParsedTxType::Mint(mint_data),
    })
}

fn parse_send(
    token_type: AlpTokenType,
    pushdata: &mut Bytes,
) -> Result<ParsedData, ParseError> {
    let token_id = read_token_id(pushdata)?;
    let output_amounts = read_atoms_vec(pushdata).named("send_amount")?;
    Ok(ParsedData {
        meta: TokenMeta {
            token_id,
            token_type: TokenType::Alp(token_type),
        },
        tx_type: ParsedTxType::Send(output_amounts),
    })
}

fn parse_burn(
    token_type: AlpTokenType,
    pushdata: &mut Bytes,
) -> Result<ParsedData, ParseError> {
    let token_id = read_token_id(pushdata)?;
    let amount = read_atoms(pushdata).named("burn_amount")?;
    Ok(ParsedData {
        meta: TokenMeta {
            token_id,
            token_type: TokenType::Alp(token_type),
        },
        tx_type: ParsedTxType::Burn(amount),
    })
}

fn parse_token_type(pushdata: &mut Bytes) -> Result<AlpTokenType, ParseError> {
    let token_type = read_array::<1>(pushdata).named("token_type")?[0];
    Ok(match token_type {
        STANDARD_TOKEN_TYPE => AlpTokenType::Standard,
        _ => AlpTokenType::Unknown(token_type),
    })
}

fn parse_mint_data(pushdata: &mut Bytes) -> Result<ParsedMintData, ParseError> {
    let atoms_vec = read_atoms_vec(pushdata).named("mint_amount")?;
    let num_batons = read_size(pushdata).named("num_batons")?;
    Ok(ParsedMintData {
        atoms_vec,
        num_batons,
    })
}

fn read_token_id(pushdata: &mut Bytes) -> Result<TokenId, ParseError> {
    let token_id: [u8; 32] = read_array(pushdata).named("token_id")?;
    Ok(TokenId::new(TxId::from(token_id)))
}

fn read_byte(pushdata: &mut Bytes) -> Result<u8, ParseError> {
    Ok(read_array::<1>(pushdata)?[0])
}

fn read_size(pushdata: &mut Bytes) -> Result<usize, ParseError> {
    let size = read_byte(pushdata)?;
    if size > 127 {
        return Err(SizeOutOfRange {
            field_name: "",
            size,
        });
    }
    Ok(size.into())
}

fn read_atoms(pushdata: &mut Bytes) -> Result<Atoms, ParseError> {
    let amount6: [u8; 6] = read_array(pushdata)?;
    let mut amount = [0u8; 8];
    amount[..6].copy_from_slice(&amount6);
    Ok(Atoms::from_le_bytes(amount))
}

fn read_atoms_vec(pushdata: &mut Bytes) -> Result<Vec<Atoms>, ParseError> {
    let size = read_size(pushdata)?;
    let mut amounts = Vec::with_capacity(size);
    for _ in 0..size {
        amounts.push(read_atoms(pushdata)?);
    }
    Ok(amounts)
}

fn read_var_bytes(pushdata: &mut Bytes) -> Result<Bytes, ParseError> {
    let size = read_size(pushdata)?;
    Ok(read_bytes(pushdata, size)?)
}
