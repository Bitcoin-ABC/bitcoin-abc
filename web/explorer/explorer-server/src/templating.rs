use std::collections::HashMap;

use askama::Template;
use bitcoinsuite_chronik_client::proto::{
    BlockInfo, GenesisInfo, ScriptUtxo, TokenEntry, TokenInfo, Tx,
};
use chrono::{DateTime, Utc};

use crate::{blockchain::Destination, server_primitives::JsonBalance};

mod filters;

#[derive(Template)]
#[template(path = "pages/blocks.html")]
pub struct BlocksTemplate {
    pub last_block_height: u32,
}

#[derive(Template)]
#[template(path = "pages/block.html")]
pub struct BlockTemplate<'a> {
    pub block_hex: &'a str,
    pub block_info: BlockInfo,
    pub confirmations: i32,
    pub timestamp: DateTime<chrono::Utc>,
    pub difficulty: f64,
    pub coinbase_data: Vec<u8>,
    pub best_height: i32,
}

#[derive(Template)]
#[template(path = "pages/transaction.html")]
pub struct TransactionTemplate<'a> {
    pub title: &'a str,
    pub sats_addr_prefix: &'a str,
    pub tokens_addr_prefix: &'a str,
    pub token_section_title: &'a str,
    pub is_token: bool,
    pub tx_hex: &'a str,
    pub token_hex: Option<String>,
    pub tx: Tx,
    pub slp_genesis_info: Option<GenesisInfo>,
    pub slp_meta: Option<TokenEntry>,
    pub raw_tx: String,
    pub confirmations: i32,
    pub timestamp: DateTime<Utc>,
    pub sats_input: i64,
    pub sats_output: i64,
    pub token_input: i128,
    pub token_output: i128,
    pub action_str: &'a str,
    pub specification: &'a str,
    pub token_type: &'a str,
}

#[derive(Template)]
#[template(path = "pages/address.html")]
pub struct AddressTemplate<'a> {
    pub tokens: HashMap<String, TokenInfo>,
    pub token_dust: i64,
    pub total_xec: i64,
    pub token_utxos: Vec<ScriptUtxo>,
    pub address_num_txs: u32,
    pub address: &'a str,
    pub sats_address: &'a str,
    pub token_address: &'a str,
    pub legacy_address: String,
    pub json_balances: HashMap<String, JsonBalance>,
    pub encoded_tokens: String,
    pub encoded_balances: String,
}

#[derive(Template)]
#[template(path = "pages/error.html")]
pub struct ErrorTemplate {
    pub message: String,
}
