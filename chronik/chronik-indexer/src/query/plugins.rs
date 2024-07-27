// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::{BTreeMap, HashMap};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, Tx};
use chronik_db::{
    db::Db,
    io::{TxNum, TxReader},
    plugins::PluginsReader,
};
use chronik_plugin::data::{PluginNameMap, PluginOutput};
use chronik_proto::proto;

pub(crate) fn read_plugin_outputs(
    db: &Db,
    tx: &Tx,
    tx_num: Option<TxNum>,
    has_any_plugins: bool,
) -> Result<BTreeMap<OutPoint, PluginOutput>> {
    if !has_any_plugins {
        return Ok(BTreeMap::new());
    }
    let tx_reader = TxReader::new(db)?;
    let mut outpoints = Vec::new();
    for input in &tx.inputs {
        let Some(input_tx_num) =
            tx_reader.tx_num_by_txid(&input.prev_out.txid)?
        else {
            continue;
        };
        outpoints.push((input.prev_out, input_tx_num));
    }
    let plugin_reader = PluginsReader::new(db)?;
    if let Some(tx_num) = tx_num {
        for out_idx in 0..tx.outputs.len() {
            outpoints.push((
                OutPoint {
                    txid: tx.txid(),
                    out_idx: out_idx as u32,
                },
                tx_num,
            ));
        }
    }
    plugin_reader.plugin_outputs(outpoints)
}

pub(crate) fn make_plugins_proto(
    plugin_output: &PluginOutput,
    plugin_name_map: &PluginNameMap,
) -> HashMap<String, proto::PluginEntry> {
    plugin_output
        .plugins
        .iter()
        .filter_map(|(&plugin_idx, entry)| {
            Some((
                // Skip plugins that aren't loaded
                plugin_name_map.name_by_idx(plugin_idx)?.to_string(),
                proto::PluginEntry {
                    groups: entry.groups.clone(),
                    data: entry.data.clone(),
                },
            ))
        })
        .collect()
}
