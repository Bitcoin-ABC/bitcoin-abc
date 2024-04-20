// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for parsing data coming from clients.

use abc_rust_error::Result;
use bitcoinsuite_core::{
    error::DataError,
    script::{ScriptType, ScriptTypeError, ScriptVariant},
};
use bitcoinsuite_slp::lokad_id::LokadId;
use thiserror::Error;

/// Errors indicating parsing failed.
#[derive(Debug, Error, PartialEq)]
pub enum ChronikParseError {
    /// Invalid hex
    #[error("400: Invalid hex: {0}")]
    InvalidHex(hex::FromHexError),

    /// script_type is invalid
    #[error("400: {0}")]
    InvalidScriptType(ScriptTypeError),

    /// Script payload invalid for script_type
    #[error("400: Invalid payload for {0:?}: {1}")]
    InvalidScriptPayload(ScriptType, DataError),

    /// LOKAD ID must be 4 bytes
    #[error("400: Invalid LOKAD ID length: expected 4 but got {0}")]
    InvalidLokadIdLength(usize),
}

use self::ChronikParseError::*;

/// Parse the data as hex.
pub fn parse_hex(payload: &str) -> Result<Vec<u8>> {
    Ok(hex::decode(payload).map_err(InvalidHex)?)
}

/// Parse the [`ScriptVariant`] with a hex payload (e.g. from URL).
pub fn parse_script_variant_hex(
    script_type: &str,
    payload_hex: &str,
) -> Result<ScriptVariant> {
    parse_script_variant(script_type, &parse_hex(payload_hex)?)
}

/// Parse the [`ScriptVariant`] with a byte payload (e.g. from protobuf).
pub fn parse_script_variant(
    script_type: &str,
    payload: &[u8],
) -> Result<ScriptVariant> {
    let script_type = script_type
        .parse::<ScriptType>()
        .map_err(InvalidScriptType)?;
    Ok(ScriptVariant::from_type_and_payload(script_type, payload)
        .map_err(|err| InvalidScriptPayload(script_type, err))?)
}

/// Parse LOKAD ID hex string
pub fn parse_lokad_id_hex(lokad_id_hex: &str) -> Result<LokadId> {
    let lokad_id = parse_hex(lokad_id_hex)?;
    parse_lokad_id(&lokad_id)
}

/// Parse LOKAD ID bytestring
pub fn parse_lokad_id(lokad_id: &[u8]) -> Result<LokadId> {
    Ok(LokadId::try_from(lokad_id)
        .map_err(|_| InvalidLokadIdLength(lokad_id.len()))?)
}
