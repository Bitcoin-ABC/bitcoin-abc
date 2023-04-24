//! Module for Chronik handlers.

use std::{collections::HashMap, fmt::Display, str::FromStr};

use abc_rust_error::{Report, Result};
use bitcoinsuite_core::{
    error::DataError,
    script::{ScriptType, ScriptTypeError, ScriptVariant},
};
use chronik_indexer::indexer::ChronikIndexer;
use chronik_proto::proto;
use hyper::Uri;
use thiserror::Error;

use crate::error::ReportError;

/// Errors for HTTP handlers.
#[derive(Debug, Error, PartialEq)]
pub enum ChronikHandlerError {
    /// Not found
    #[error("404: Not found: {0}")]
    RouteNotFound(Uri),

    /// Invalid hex
    #[error("400: Invalid hex: {0}")]
    InvalidHex(hex::FromHexError),

    /// Query parameter has an invalid value
    #[error("400: Invalid param {param_name}: {param_value}, {msg}")]
    InvalidParam {
        /// Name of the param
        param_name: String,
        /// Value of the param
        param_value: String,
        /// Human-readable error message.
        msg: String,
    },

    /// script_type is invalid
    #[error("400: {0}")]
    InvalidScriptType(ScriptTypeError),

    /// Script payload invalid for script_type
    #[error("400: Invalid payload for {0:?}: {1}")]
    InvalidScriptPayload(ScriptType, DataError),
}

use self::ChronikHandlerError::*;

fn parse_hex(payload: &str) -> Result<Vec<u8>, ChronikHandlerError> {
    hex::decode(payload).map_err(ChronikHandlerError::InvalidHex)
}

fn parse_script_variant(
    script_type: &str,
    payload: &str,
) -> Result<ScriptVariant> {
    let script_type = script_type
        .parse::<ScriptType>()
        .map_err(InvalidScriptType)?;
    Ok(
        ScriptVariant::from_type_and_payload(script_type, &parse_hex(payload)?)
            .map_err(|err| InvalidScriptPayload(script_type, err))?,
    )
}

fn get_param<T: FromStr>(
    params: &HashMap<String, String>,
    param_name: &str,
) -> Result<Option<T>>
where
    T::Err: Display,
{
    let Some(param) = params.get(param_name) else { return Ok(None) };
    Ok(Some(param.parse::<T>().map_err(|err| InvalidParam {
        param_name: param_name.to_string(),
        param_value: param.to_string(),
        msg: err.to_string(),
    })?))
}

/// Fallback route that returns a 404 response
pub async fn handle_not_found(uri: Uri) -> Result<(), ReportError> {
    Err(Report::from(RouteNotFound(uri)).into())
}

/// Return a page of the confirmed txs of the given script.
/// Scripts are identified by script_type and payload.
pub async fn handle_script_confirmed_txs(
    script_type: &str,
    payload: &str,
    query_params: &HashMap<String, String>,
    indexer: &ChronikIndexer,
) -> Result<proto::TxHistoryPage> {
    let script_variant = parse_script_variant(script_type, payload)?;
    let script_history = indexer.script_history()?;
    let page_num: u32 = get_param(query_params, "page")?.unwrap_or(0);
    let page_size: u32 = get_param(query_params, "page_size")?.unwrap_or(25);
    let script = script_variant.to_script();
    script_history.confirmed_txs(&script, page_num as usize, page_size as usize)
}

/// Return a page of the tx history of the given script, in reverse
/// chronological order, i.e. the latest transaction first and then going back
/// in time. Scripts are identified by script_type and payload.
pub async fn handle_script_history(
    script_type: &str,
    payload: &str,
    query_params: &HashMap<String, String>,
    indexer: &ChronikIndexer,
) -> Result<proto::TxHistoryPage> {
    let script_type = script_type
        .parse::<ScriptType>()
        .map_err(InvalidScriptType)?;
    let script_variant =
        ScriptVariant::from_type_and_payload(script_type, &parse_hex(payload)?)
            .map_err(|err| InvalidScriptPayload(script_type, err))?;
    let script_history = indexer.script_history()?;
    let page_num: u32 = get_param(query_params, "page")?.unwrap_or(0);
    let page_size: u32 = get_param(query_params, "page_size")?.unwrap_or(25);
    let script = script_variant.to_script();
    script_history.rev_history(&script, page_num as usize, page_size as usize)
}

/// Return a page of the confirmed txs of the given script.
/// Scripts are identified by script_type and payload.
pub async fn handle_script_unconfirmed_txs(
    script_type: &str,
    payload: &str,
    indexer: &ChronikIndexer,
) -> Result<proto::TxHistoryPage> {
    let script_variant = parse_script_variant(script_type, payload)?;
    let script_history = indexer.script_history()?;
    let script = script_variant.to_script();
    script_history.unconfirmed_txs(&script)
}

/// Return the UTXOs of the given script.
/// Scripts are identified by script_type and payload.
pub async fn handle_script_utxos(
    script_type: &str,
    payload: &str,
    indexer: &ChronikIndexer,
) -> Result<proto::ScriptUtxos> {
    let script_variant = parse_script_variant(script_type, payload)?;
    let script_utxos = indexer.script_utxos()?;
    let script = script_variant.to_script();
    let utxos = script_utxos.utxos(&script)?;
    Ok(proto::ScriptUtxos {
        script: script.bytecode().to_vec(),
        utxos,
    })
}
