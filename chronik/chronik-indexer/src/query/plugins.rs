// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::{BTreeMap, HashMap};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, Tx};
use chronik_db::{db::Db, io::TxNum, mem::Mempool};
use chronik_plugin::data::{PluginNameMap, PluginOutput};
use chronik_proto::proto;

pub(crate) fn read_plugin_outputs(
    db: &Db,
    mempool: &Mempool,
    tx: &Tx,
    tx_num: Option<TxNum>,
    has_any_plugins: bool,
) -> Result<BTreeMap<OutPoint, PluginOutput>> {
    if !has_any_plugins {
        return Ok(BTreeMap::new());
    }
    Ok(mempool.plugins().fetch_plugin_outputs(
        tx.inputs.iter().map(|input| (input.prev_out, None)).chain(
            (0..tx.outputs.len()).map(|out_idx| {
                (
                    OutPoint {
                        txid: tx.txid(),
                        out_idx: out_idx as u32,
                    },
                    tx_num,
                )
            }),
        ),
        db,
        |txid| mempool.tx(txid).is_some(),
    )??)
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
