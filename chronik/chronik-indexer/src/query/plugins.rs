// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::{BTreeMap, HashMap};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, Tx};
use chronik_db::{
    db::Db,
    io::{TxNum, TxReader, UtxoEntry},
    mem::Mempool,
    plugins::{PluginMember, PluginsGroup, PluginsUtxoReader},
};
use chronik_plugin::data::{PluginIdx, PluginNameMap, PluginOutput};
use chronik_proto::proto;
use thiserror::Error;

use crate::{
    avalanche::Avalanche,
    query::{QueryGroupUtxos, QueryPluginsError::*, UtxoProtobufOutput},
};

/// Min plugin groups page size
pub const PLUGIN_GROUPS_MIN_PAGE_SIZE: usize = 1;
/// Max plugin groups page size
pub const PLUGIN_GROUPS_MAX_PAGE_SIZE: usize = 50;
/// If a group has more than this many DB UTXOs, skip checking if all are spent
/// in the mempool and assume some are unspent
const PLUGIN_MAX_SEARCH_UTXOS_PER_GROUP: usize = 500;
/// If a request skipped more than this many groups, return early
const PLUGIN_MAX_SKIPPED_GROUPS: usize = 1000;

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

/// Result of group_by_prefix
#[derive(Debug)]
pub struct PrefixGroups {
    /// Matching groups
    pub groups: Vec<Vec<u8>>,
    /// Next `group_start` that is guaranteed to make progress, or None if
    /// exhausted
    pub next_start: Option<Vec<u8>>,
}

/// Errors indicating something went wrong with reading plugin data.
#[derive(Debug, Error, PartialEq)]
pub enum QueryPluginsError {
    /// Plugin with the given name not loaded.
    #[error("404: Plugin {0:?} not loaded")]
    PluginNotLoaded(String),

    /// tx_num in group index but not in "tx" CF.
    #[error("500: Inconsistent DB: Transaction num {0} not in DB")]
    MissingDbTx(TxNum),

    /// Can only request page sizes below a certain maximum.
    #[error(
        "400: Requested page size {0} is too big, maximum is {}",
        PLUGIN_GROUPS_MAX_PAGE_SIZE
    )]
    RequestPageSizeTooBig(usize),

    /// Can only request page sizes above a certain minimum.
    #[error(
        "400: Requested page size {0} is too small, minimum is {}",
        PLUGIN_GROUPS_MIN_PAGE_SIZE
    )]
    RequestPageSizeTooSmall(usize),
}

impl<'a> QueryPlugins<'a> {
    /// Query the UTXOs a plugin has grouped for one member of the group
    pub fn utxos(
        &self,
        plugin_name: &str,
        group: &[u8],
    ) -> Result<Vec<proto::Utxo>> {
        let plugin_idx = self.plugin_idx(plugin_name)?;
        let utxos: QueryGroupUtxos<'_, PluginsGroup, UtxoProtobufOutput> =
            QueryGroupUtxos {
                db: self.db,
                avalanche: self.avalanche,
                mempool: self.mempool,
                mempool_utxos: self.mempool.plugins().group_utxos(),
                group: PluginsGroup,
                utxo_mapper: UtxoProtobufOutput,
                is_token_index_enabled: self.is_token_index_enabled,
                is_scripthash_index_enabled: false,
                plugin_name_map: self.plugin_name_map,
            };
        utxos.utxos(PluginMember { plugin_idx, group }.ser())
    }

    /// Query all the groups of a plugin (only those that have unspent members),
    /// where the group has the given prefix. Start at the given start
    /// group, and yield up to `request_page_size` entries.
    ///
    /// This method also merges the data from DB and mempool, and skips entries
    /// from the DB if they're fully spent.
    ///
    /// The latter requires us to look up the txid of all the DB UTXOs of each
    /// group and check if they're unspent in the mempool, which could be slow,
    /// especially if there's a lot of groups with UTXOs that are all spent in
    /// the mempool. An attack on this would be ineffective though, as it would
    /// only last until the txs spending the DB UTXOs are mined, require a big
    /// setup and it would only "waste" (cached) DB reads. We still have a
    /// reduced page size to reduce the risk.
    pub fn groups_by_prefix(
        &self,
        plugin_name: &str,
        group_prefix: &[u8],
        group_start: &[u8],
        request_page_size: usize,
    ) -> Result<PrefixGroups> {
        if request_page_size < PLUGIN_GROUPS_MIN_PAGE_SIZE {
            return Err(RequestPageSizeTooSmall(request_page_size).into());
        }
        if request_page_size > PLUGIN_GROUPS_MAX_PAGE_SIZE {
            return Err(RequestPageSizeTooBig(request_page_size).into());
        }
        let plugin_idx = self.plugin_idx(plugin_name)?;
        let utxo_reader = PluginsUtxoReader::new(self.db)?;
        let tx_reader = TxReader::new(self.db)?;

        let member_prefix = PluginMember {
            plugin_idx,
            group: group_prefix,
        }
        .ser();
        let member_start = PluginMember {
            plugin_idx,
            group: group_start,
        }
        .ser();

        let mut mempool_iter = self
            .mempool
            .plugins()
            .group_utxos()
            .prefix_iterator(&member_prefix, member_start.clone())
            .fuse();
        let mut db_iter = utxo_reader
            .prefix_iterator(&member_prefix, &member_start)
            .filter(|item| {
                item.as_ref()
                    .map(|(_, value)| !value.is_empty())
                    .unwrap_or(true)
            })
            .fuse();
        let mut last_db_item = db_iter.next().transpose()?;
        let mut last_mem_item = mempool_iter.next();
        let mut result = Vec::with_capacity(request_page_size);

        // Test if there's any DB entries that haven't been spent in the mempool
        let has_any_unspent = |utxos: &[UtxoEntry<_>]| -> Result<bool> {
            let txids = tx_reader.txids_by_tx_nums(
                utxos.iter().map(|utxo| utxo.outpoint.tx_num),
            )?;
            for (txid, utxo) in txids.iter().zip(utxos) {
                let txid = txid.ok_or(MissingDbTx(utxo.outpoint.tx_num))?;
                let Some(spent_by) =
                    self.mempool.spent_by().outputs_spent(&txid)
                else {
                    return Ok(true);
                };
                if !spent_by.contains_key(&utxo.outpoint.out_idx) {
                    return Ok(true);
                }
            }
            // All UTXOs have been spent in the mempool
            Ok(false)
        };

        let deser_key = |key: &[u8]| {
            PluginMember::deser(key).map(|member| member.group.to_vec())
        };

        let should_add_group = |utxos: &[UtxoEntry<_>]| -> Result<bool> {
            // Bypass the expensive has_any_unspent check and assume some UTXOs
            // exist if the DB has enough entries.
            Ok(utxos.len() > PLUGIN_MAX_SEARCH_UTXOS_PER_GROUP
                || has_any_unspent(utxos)?)
        };

        // Iterate over DB and mempool in lockstep, until we have enough groups
        let mut num_skipped_groups = 0;
        while result.len() < request_page_size
            && num_skipped_groups < PLUGIN_MAX_SKIPPED_GROUPS
        {
            match (last_db_item.as_ref(), last_mem_item) {
                (None, None) => break,
                (Some((db_key, utxos)), None) => {
                    let key = deser_key(db_key)?;
                    if should_add_group(utxos)? {
                        result.push(key.clone());
                    } else {
                        num_skipped_groups += 1;
                    }
                    last_db_item = db_iter.next().transpose()?;
                }
                (None, Some((mem_key, _))) => {
                    let key = deser_key(mem_key)?;
                    result.push(key.clone());
                    last_mem_item = mempool_iter.next();
                }
                (Some((db_key, db_utxos)), Some((mem_key, _))) => {
                    match db_key.as_ref().cmp(mem_key.as_slice()) {
                        std::cmp::Ordering::Equal => {
                            // Both DB and mempool have UTXOs for the next
                            // group, add it and advance DB and mempool
                            let key = deser_key(db_key)?;
                            result.push(key.clone());
                            last_db_item = db_iter.next().transpose()?;
                            last_mem_item = mempool_iter.next();
                        }
                        std::cmp::Ordering::Less => {
                            // Next group in DB, add it and advance DB
                            let key = deser_key(db_key)?;
                            if should_add_group(db_utxos)? {
                                result.push(key.clone());
                            } else {
                                num_skipped_groups += 1;
                            }
                            last_db_item = db_iter.next().transpose()?;
                        }
                        std::cmp::Ordering::Greater => {
                            // Next group in mempool, add it & advance mempool
                            let key = deser_key(mem_key)?;
                            result.push(key.clone());
                            last_mem_item = mempool_iter.next();
                        }
                    }
                }
            }
        }
        // Get the next group that is guaranteed to make progress
        let next_start = match (last_db_item, last_mem_item) {
            (None, None) => None,
            (Some((db_key, _)), None) => Some(deser_key(&db_key)?),
            (None, Some((mem_key, _))) => Some(deser_key(mem_key)?),
            (Some((db_key, _)), Some((mem_key, _))) => {
                Some(deser_key(db_key.as_ref().min(mem_key.as_slice()))?)
            }
        };
        Ok(PrefixGroups {
            groups: result,
            next_start,
        })
    }

    fn plugin_idx(&self, plugin_name: &str) -> Result<PluginIdx> {
        Ok(self
            .plugin_name_map
            .idx_by_name(plugin_name)
            .ok_or_else(|| PluginNotLoaded(plugin_name.to_string()))?)
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
