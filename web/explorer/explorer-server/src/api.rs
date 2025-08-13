use std::collections::HashMap;

use bitcoinsuite_chronik_client::proto::{
    token_type, Block, GenesisInfo, TokenInfo, TokenType, Tx, TxHistoryPage,
};
use bitcoinsuite_core::CashAddress;
use bitcoinsuite_error::Result;
use eyre::eyre;

use crate::{
    blockchain::to_be_hex,
    server_primitives::{JsonToken, JsonTx, JsonTxStats},
};

pub fn token_type_to_int(token_type_in: &Option<TokenType>) -> Result<i32> {
    let token_type = token_type_in
        .clone()
        .ok_or_else(|| eyre!("Malformed token.token_type"))?
        .token_type
        .ok_or_else(|| eyre!("Malformed token.token_type.token_type"))?;

    match token_type {
        token_type::TokenType::Slp(slp) => Ok(slp),
        token_type::TokenType::Alp(alp) => Ok(alp),
    }
}

pub fn tokens_to_json(
    tokens: &HashMap<String, TokenInfo>,
) -> Result<HashMap<String, JsonToken>> {
    let mut json_tokens = HashMap::new();

    for (token_id, token) in tokens.iter() {
        if let Some(genesis_info) = &token.genesis_info {
            let token_ticker =
                String::from_utf8_lossy(&genesis_info.token_ticker).to_string();
            let token_name =
                String::from_utf8_lossy(&genesis_info.token_name).to_string();

            let token_type = token_type_to_int(&token.token_type)?;

            let json_token = JsonToken {
                token_id: token_id.clone(),
                token_type,
                token_ticker,
                token_name,
                decimals: genesis_info.decimals,
            };
            json_tokens.insert(token_id.clone(), json_token.clone());
        }
    }

    Ok(json_tokens)
}

pub fn tx_history_to_json(
    address: &CashAddress,
    address_tx_history: TxHistoryPage,
    json_tokens: &HashMap<String, JsonToken>,
) -> Result<Vec<JsonTx>> {
    let mut json_txs = Vec::new();
    let address_bytes = address.to_script().bytecode().to_vec();

    for tx in address_tx_history.txs.iter() {
        let (block_height, timestamp) = match &tx.block {
            Some(block) => (
                Some(block.height),
                if tx.time_first_seen == 0 {
                    block.timestamp
                } else {
                    tx.time_first_seen
                },
            ),
            None => (None, tx.time_first_seen),
        };

        let (token_id, token) = match &tx.token_entries.get(0) {
            Some(token_entry) => {
                let token_id = token_entry.token_id.clone();
                let json_token = json_tokens.get(&token_id);

                match json_token {
                    Some(json_token) => {
                        (Some(token_id.clone()), Some(json_token.clone()))
                    }
                    None => (Some(token_id.clone()), None),
                }
            }
            None => (None, None),
        };

        let stats = calc_tx_stats(tx, Some(&address_bytes));

        json_txs.push(JsonTx {
            tx_hash: to_be_hex(&tx.txid),
            block_height,
            timestamp,
            is_coinbase: tx.is_coinbase,
            size: tx.size as i32,
            num_inputs: tx.inputs.len() as u32,
            num_outputs: tx.outputs.len() as u32,
            stats,
            token_id,
            token,
        });
    }

    Ok(json_txs)
}

pub fn block_txs_to_json(
    block: Block,
    block_txs: TxHistoryPage,
    tokens_by_hex: &HashMap<String, TokenInfo>,
) -> Result<Vec<JsonTx>> {
    let mut json_txs = Vec::new();

    for tx in block_txs.txs.iter() {
        let (block_height, timestamp) = match &block.block_info {
            Some(block_info) => (Some(block_info.height), block_info.timestamp),
            None => (None, 0),
        };

        let (token_id, token) = match &tx.token_entries.get(0) {
            Some(token_entry) => {
                let token_id_hex = token_entry.token_id.clone();
                let genesis_info = match tokens_by_hex.get(&token_id_hex) {
                    Some(token) => token.genesis_info.as_ref(),
                    None => None,
                };
                let default_genesis_info = GenesisInfo::default();
                let genesis_info = match genesis_info {
                    Some(genesis_info) => genesis_info,
                    None => {
                        eprintln!(
                            "No genesis info for token ID {}",
                            token_id_hex
                        );
                        &default_genesis_info
                    }
                };
                let token_ticker =
                    String::from_utf8_lossy(&genesis_info.token_ticker)
                        .to_string();
                let token_name =
                    String::from_utf8_lossy(&genesis_info.token_name)
                        .to_string();

                (
                    Some(token_id_hex.clone()),
                    Some(JsonToken {
                        token_id: token_id_hex,
                        token_type: token_type_to_int(&token_entry.token_type)?,
                        token_ticker,
                        token_name,
                        decimals: genesis_info.decimals,
                    }),
                )
            }
            None => (None, None),
        };

        let stats = calc_tx_stats(tx, None);

        json_txs.push(JsonTx {
            tx_hash: to_be_hex(&tx.txid),
            block_height,
            timestamp,
            is_coinbase: tx.is_coinbase,
            size: tx.size as i32,
            num_inputs: tx.inputs.len() as u32,
            num_outputs: tx.outputs.len() as u32,
            stats,
            token_id,
            token,
        });
    }

    Ok(json_txs)
}

pub fn calc_tx_stats(tx: &Tx, address_bytes: Option<&[u8]>) -> JsonTxStats {
    let sats_input = tx.inputs.iter().map(|input| input.sats).sum();
    let sats_output = tx.outputs.iter().map(|output| output.sats).sum();

    let token_input: i128 = tx
        .inputs
        .iter()
        .filter_map(|input| input.token.as_ref())
        .map(|token| token.atoms as i128)
        .sum();
    let token_output: i128 = tx
        .outputs
        .iter()
        .filter_map(|output| output.token.as_ref())
        .map(|token| token.atoms as i128)
        .sum();
    let does_burn_slp = tx
        .token_entries
        .iter()
        .any(|entry| entry.actual_burn_atoms.parse::<i128>().unwrap() > 0);

    let mut delta_sats: i64 = 0;
    let mut delta_tokens: i64 = 0;

    for input in &tx.inputs {
        if let Some(address_bytes) = address_bytes {
            if address_bytes != input.output_script {
                continue;
            }
        }
        delta_sats -= input.sats;
        if let Some(slp) = &input.token {
            delta_tokens -= slp.atoms as i64;
        }
    }

    for output in &tx.outputs {
        if let Some(address_bytes) = address_bytes {
            if address_bytes != output.output_script {
                continue;
            }
        }
        delta_sats += output.sats;
        if let Some(slp) = &output.token {
            delta_tokens += slp.atoms as i64;
        }
    }

    JsonTxStats {
        sats_input,
        sats_output,
        delta_sats,
        delta_tokens,
        token_input,
        token_output,
        does_burn_slp,
    }
}
