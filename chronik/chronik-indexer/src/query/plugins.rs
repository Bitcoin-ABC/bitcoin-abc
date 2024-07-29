// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::{BTreeMap, HashMap};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, Tx};
use chronik_db::{
    db::Db,
    io::TxNum,
    mem::Mempool,
    plugins::{PluginMember, PluginsGroup},
};
use chronik_plugin::data::{PluginNameMap, PluginOutput};
use chronik_proto::proto;
use thiserror::Error;

use crate::{
    avalanche::Avalanche,
    query::{QueryGroupUtxos, QueryPluginsError::*, UtxoProtobufOutput},
};

/// Struct for querying indices created by plugins.
#[derive(Debug)]
pub struct QueryPlugins<'a> {
    /// Database
    pub db: &'a Db,
    /// Avalanche
    pub avalanche: &'a Avalanche,
    /// Mempool
    pub mempool: &'a Mempool,
    /// Whether the SLP/ALP token index is enabled
    pub is_token_index_enabled: bool,
    /// Plugin name map
    pub plugin_name_map: &'a PluginNameMap,
}

/// Errors indicating something went wrong with reading plugin data.
#[derive(Debug, Error, PartialEq)]
pub enum QueryPluginsError {
    /// Plugin with the given name not loaded.
    #[error("404: Plugin {0:?} not loaded")]
    PluginNotLoaded(String),
}

impl<'a> QueryPlugins<'a> {
    /// Query the UTXOs a plugin has grouped for one member of the group
    pub fn utxos(
        &self,
        plugin_name: &str,
        group: &[u8],
    ) -> Result<Vec<proto::Utxo>> {
        let plugin_idx = self
            .plugin_name_map
            .idx_by_name(plugin_name)
            .ok_or_else(|| PluginNotLoaded(plugin_name.to_string()))?;
        let utxos: QueryGroupUtxos<'_, PluginsGroup, UtxoProtobufOutput> =
            QueryGroupUtxos {
                db: self.db,
                avalanche: self.avalanche,
                mempool: self.mempool,
                mempool_utxos: self.mempool.plugins().group_utxos(),
                group: PluginsGroup,
                utxo_mapper: UtxoProtobufOutput,
                is_token_index_enabled: self.is_token_index_enabled,
                plugin_name_map: self.plugin_name_map,
            };
        utxos.utxos(PluginMember { plugin_idx, group }.ser())
    }
}

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
