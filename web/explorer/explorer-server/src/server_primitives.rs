use std::collections::HashMap;

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonUtxo {
    pub tx_hash: String,
    pub out_idx: u32,
    pub sats_amount: i64,
    pub token_amount: u64,
    pub is_coinbase: bool,
    pub block_height: i32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonBalance {
    pub token_id: Option<String>,
    pub sats_amount: i64,
    pub token_amount: i128,
    pub utxos: Vec<JsonUtxo>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JsonToken {
    pub token_id: String,
    pub token_type: i32,
    pub token_ticker: String,
    pub token_name: String,
    pub decimals: u32,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonBlock {
    pub hash: String,
    pub height: i32,
    pub timestamp: i64,
    pub difficulty: f64,
    pub size: u64,
    pub num_txs: u64,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JsonTx {
    pub tx_hash: String,
    pub block_height: Option<i32>,
    pub timestamp: i64,
    pub is_coinbase: bool,
    pub size: i32,
    pub num_inputs: u32,
    pub num_outputs: u32,
    pub stats: JsonTxStats,
    pub token_id: Option<String>,
    pub token: Option<JsonToken>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JsonTxStats {
    pub sats_input: i64,
    pub sats_output: i64,
    pub delta_sats: i64,
    pub delta_tokens: i64,
    pub token_input: i128,
    pub token_output: i128,
    pub does_burn_slp: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonTxs {
    pub txs: Vec<JsonTx>,
    pub tokens: Vec<JsonToken>,
    pub token_indices: HashMap<Vec<u8>, usize>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonBlocksResponse {
    pub data: Vec<JsonBlock>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JsonTxsResponse {
    pub data: Vec<JsonTx>,
}
