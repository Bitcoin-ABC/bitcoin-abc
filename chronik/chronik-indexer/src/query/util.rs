// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::{
    collections::{hash_map::Entry, BTreeMap, HashMap},
    str::FromStr,
};

use abc_rust_error::{Report, Result};
use bitcoinsuite_core::{
    block::BlockHash,
    ser::BitcoinSer,
    tx::{OutPoint, SpentBy, Tx, TxId},
};
use chronik_db::io::{
    BlockHeight, DbBlock, SpentByEntry, SpentByReader, TxNum, TxReader,
};
use chronik_plugin::data::{PluginNameMap, PluginOutput};
use chronik_proto::proto;
use thiserror::Error;

use crate::{
    avalanche::Avalanche,
    query::{make_plugins_proto, QueryUtilError::*, TxTokenData},
};

/// Errors indicating something went wrong with reading txs.
#[derive(Debug, Error, PartialEq)]
pub enum QueryUtilError {
    /// DB contains a spent-by entry whose referenced tx_num cannot be found.
    #[error(
        "500: Inconsistent DB: tx_num = {tx_num} has spent entry {entry:?} in \
         the DB, but the tx cannot be not found in the index"
    )]
    SpendingTxNotFound {
        /// Which tx has an output spent by an unknown tx.
        tx_num: TxNum,
        /// The offending entry in the DB that references an unknown tx.
        entry: SpentByEntry,
    },

    /// Query is neither a hex hash nor an integer string
    #[error("400: Not a hash or height: {0}")]
    NotHashOrHeight(String),
}

pub(crate) struct MakeTxProtoParams<'a> {
    pub(crate) tx: &'a Tx,
    pub(crate) outputs_spent: &'a OutputsSpent<'a>,
    pub(crate) time_first_seen: i64,
    pub(crate) is_coinbase: bool,
    pub(crate) block: Option<&'a DbBlock>,
    pub(crate) avalanche: &'a Avalanche,
    pub(crate) token: Option<&'a TxTokenData<'a>>,
    pub(crate) plugin_outputs: &'a BTreeMap<OutPoint, PluginOutput>,
    pub(crate) plugin_name_map: &'a PluginNameMap,
}

/// Make a [`proto::Tx`].
pub(crate) fn make_tx_proto(params: MakeTxProtoParams<'_>) -> proto::Tx {
    let tx = params.tx;
    proto::Tx {
        txid: tx.txid().to_vec(),
        version: tx.version,
        inputs: tx
            .inputs
            .iter()
            .enumerate()
            .map(|(input_idx, input)| {
                let coin = input.coin.as_ref();
                let (output_script, sats) = coin
                    .map(|coin| (coin.output.script.to_vec(), coin.output.sats))
                    .unwrap_or_default();
                proto::TxInput {
                    prev_out: Some(make_outpoint_proto(&input.prev_out)),
                    input_script: input.script.to_vec(),
                    output_script,
                    sats,
                    sequence_no: input.sequence,
                    token: params
                        .token
                        .and_then(|token| token.input_token_proto(input_idx)),
                    plugins: params
                        .plugin_outputs
                        .get(&input.prev_out)
                        .map(|plugin_output| {
                            make_plugins_proto(
                                plugin_output,
                                params.plugin_name_map,
                            )
                        })
                        .unwrap_or_default(),
                }
            })
            .collect(),
        outputs: tx
            .outputs
            .iter()
            .enumerate()
            .map(|(output_idx, output)| proto::TxOutput {
                sats: output.sats,
                output_script: output.script.to_vec(),
                spent_by: params
                    .outputs_spent
                    .spent_by(output_idx as u32)
                    .map(|spent_by| make_spent_by_proto(&spent_by)),
                token: params
                    .token
                    .and_then(|token| token.output_token_proto(output_idx)),
                plugins: params
                    .plugin_outputs
                    .get(&OutPoint {
                        txid: tx.txid(),
                        out_idx: output_idx as u32,
                    })
                    .map(|plugin_output| {
                        make_plugins_proto(
                            plugin_output,
                            params.plugin_name_map,
                        )
                    })
                    .unwrap_or_default(),
            })
            .collect(),
        lock_time: tx.locktime,
        block: params.block.map(|block| proto::BlockMetadata {
            hash: block.hash.to_vec(),
            height: block.height,
            timestamp: block.timestamp,
            is_final: params.avalanche.is_final_height(block.height),
        }),
        token_entries: params
            .token
            .map_or(vec![], |token| token.entries_proto()),
        token_failed_parsings: params.token.map_or(vec![], |token| {
            token
                .tx
                .failed_parsings
                .iter()
                .map(|failed_parsing| proto::TokenFailedParsing {
                    pushdata_idx: failed_parsing
                        .pushdata_idx
                        .map_or(-1, |idx| idx as i32),
                    bytes: failed_parsing.bytes.to_vec(),
                    error: failed_parsing.error.to_string(),
                })
                .collect()
        }),
        token_status: match params.token {
            Some(token) => {
                if token.tx.failed_parsings.is_empty()
                    && token.tx.entries.iter().all(|entry| entry.is_normal())
                {
                    proto::TokenStatus::Normal as _
                } else {
                    proto::TokenStatus::NotNormal as _
                }
            }
            None => proto::TokenStatus::NonToken as _,
        },
        time_first_seen: params.time_first_seen,
        size: tx.ser_len() as u32,
        is_coinbase: params.is_coinbase,
        is_final: params.block.is_some_and(|block| {
            params.avalanche.is_final_height(block.height)
        }),
    }
}

pub(crate) fn make_outpoint_proto(outpoint: &OutPoint) -> proto::OutPoint {
    proto::OutPoint {
        txid: outpoint.txid.to_vec(),
        out_idx: outpoint.out_idx,
    }
}

fn make_spent_by_proto(spent_by: &SpentBy) -> proto::SpentBy {
    proto::SpentBy {
        txid: spent_by.txid.to_vec(),
        input_idx: spent_by.input_idx,
    }
}

pub(crate) enum HashOrHeight {
    Hash(BlockHash),
    Height(BlockHeight),
}

impl FromStr for HashOrHeight {
    type Err = Report;

    fn from_str(hash_or_height: &str) -> Result<Self> {
        if let Ok(hash) = hash_or_height.parse::<BlockHash>() {
            Ok(HashOrHeight::Hash(hash))
        } else {
            let height = match hash_or_height.parse::<BlockHeight>() {
                // disallow leading zeros
                Ok(0) if hash_or_height.len() == 1 => 0,
                Ok(height) if !hash_or_height.starts_with('0') => height,
                _ => {
                    return Err(
                        NotHashOrHeight(hash_or_height.to_string()).into()
                    );
                }
            };
            Ok(HashOrHeight::Height(height))
        }
    }
}

/// Helper struct for querying which tx outputs have been spent by DB or mempool
/// txs.
#[derive(Debug, Default)]
pub(crate) struct OutputsSpent<'a> {
    spent_by_mempool: Option<&'a BTreeMap<u32, SpentBy>>,
    spent_by_blocks: Vec<SpentByEntry>,
    txid_by_num: HashMap<TxNum, TxId>,
}

impl<'a> OutputsSpent<'a> {
    pub(crate) fn new_mempool(
        spent_by_mempool: Option<&'a BTreeMap<u32, SpentBy>>,
    ) -> Self {
        OutputsSpent {
            spent_by_mempool,
            spent_by_blocks: vec![],
            txid_by_num: HashMap::new(),
        }
    }

    pub(crate) fn query(
        spent_by_reader: &SpentByReader<'_>,
        tx_reader: &TxReader<'_>,
        spent_by_mempool: Option<&'a BTreeMap<u32, SpentBy>>,
        tx_num: TxNum,
    ) -> Result<Self> {
        let spent_by_blocks =
            spent_by_reader.by_tx_num(tx_num)?.unwrap_or_default();
        let mut txid_by_num = HashMap::<TxNum, TxId>::new();
        for spent_by in &spent_by_blocks {
            if let Entry::Vacant(entry) = txid_by_num.entry(spent_by.tx_num) {
                let txid = tx_reader
                    .txid_by_tx_num(spent_by.tx_num)?
                    .ok_or_else(|| SpendingTxNotFound {
                        tx_num,
                        entry: spent_by.clone(),
                    })?;
                entry.insert(txid);
            }
        }
        Ok(OutputsSpent {
            spent_by_mempool,
            spent_by_blocks,
            txid_by_num,
        })
    }

    pub(crate) fn spent_by(&self, output_idx: u32) -> Option<SpentBy> {
        if let Some(spent_by_mempool) = self.spent_by_mempool {
            if let Some(outpoint) = spent_by_mempool.get(&output_idx) {
                return Some(*outpoint);
            }
        }
        let search_idx = self
            .spent_by_blocks
            .binary_search_by_key(&output_idx, |entry| entry.out_idx);
        let entry = match search_idx {
            Ok(found_idx) => &self.spent_by_blocks[found_idx],
            Err(_) => return None,
        };
        let txid = self.txid_by_num.get(&entry.tx_num).unwrap();
        Some(SpentBy {
            txid: *txid,
            input_idx: entry.input_idx,
        })
    }
}
