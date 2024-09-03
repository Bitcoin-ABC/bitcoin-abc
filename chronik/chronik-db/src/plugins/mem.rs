// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::BTreeMap;

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, Tx, TxId};
use bitcoinsuite_slp::{token_tx::TokenTx, verify::SpentToken};
use chronik_plugin::{
    context::PluginContext,
    data::{PluginNameMap, PluginOutput},
};
use thiserror::Error;

use crate::{
    db::Db,
    io::{TxNum, TxReader},
    mem::{MempoolGroupHistory, MempoolGroupUtxos, MempoolTx},
    plugins::{MempoolPluginsError::*, PluginsGroup, PluginsReader},
};

/// Index the mempool UTXOs of plugin groups
pub type MempoolPluginUtxos = MempoolGroupUtxos<PluginsGroup>;
/// Index the mempool history of plugin groups
pub type MempoolPluginHistory = MempoolGroupHistory<PluginsGroup>;

/// Plugin data of the mempool
#[derive(Debug)]
pub struct MempoolPlugins {
    plugin_outputs: BTreeMap<OutPoint, PluginOutput>,
    spent_outputs: BTreeMap<TxId, BTreeMap<OutPoint, PluginOutput>>,
    group_utxos: MempoolPluginUtxos,
    group_history: MempoolPluginHistory,
}

/// Error indicating something went wrong with [`MempoolPlugins`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum MempoolPluginsError {
    /// Mempool tx spends outputs of non-existent tx
    #[error(
        "Failed indexing mempool plugin tx: Tx is spending {0} which is found \
         neither in the mempool nor DB"
    )]
    InputTxNotFound(TxId),
}

impl MempoolPlugins {
    /// Create a new [`MempoolPlugins`].
    pub fn new() -> Self {
        MempoolPlugins {
            plugin_outputs: BTreeMap::new(),
            spent_outputs: BTreeMap::new(),
            group_utxos: MempoolPluginUtxos::new(PluginsGroup),
            group_history: MempoolPluginHistory::new(PluginsGroup),
        }
    }

    /// Run the tx against the plugins and index them.
    pub fn insert(
        &mut self,
        db: &Db,
        tx: &MempoolTx,
        is_mempool_tx: impl Fn(&TxId) -> bool,
        token_data: Option<(&TokenTx, &[Option<SpentToken>])>,
        plugin_ctx: &PluginContext,
        plugin_name_map: &PluginNameMap,
    ) -> Result<BTreeMap<OutPoint, PluginOutput>> {
        if plugin_name_map.is_empty() {
            return Ok(BTreeMap::new());
        }

        let mut plugin_outputs = self.fetch_plugin_outputs(
            tx.tx.inputs.iter().map(|input| (input.prev_out, None)),
            db,
            &is_mempool_tx,
        )??;

        plugin_ctx.with_py(|py| -> Result<()> {
            let result = plugin_ctx.run_on_tx(
                py,
                &tx.tx,
                token_data,
                &plugin_outputs,
                plugin_name_map,
            )?;

            for (out_idx, plugin_output) in result.outputs {
                let outpoint = OutPoint {
                    txid: tx.tx.txid(),
                    out_idx,
                };
                self.plugin_outputs.insert(outpoint, plugin_output.clone());
                plugin_outputs.insert(outpoint, plugin_output);
            }

            Ok(())
        })?;

        self.group_utxos
            .insert(tx, &is_mempool_tx, &plugin_outputs)?;
        self.group_history.insert(tx, &plugin_outputs);

        // Save plugin outputs spent by inputs
        let spent_outputs = tx
            .tx
            .inputs
            .iter()
            .filter_map(|input| {
                Some((
                    input.prev_out,
                    plugin_outputs.get(&input.prev_out).cloned()?,
                ))
            })
            .collect::<BTreeMap<_, _>>();
        self.spent_outputs.insert(tx.tx.txid(), spent_outputs);

        Ok(plugin_outputs)
    }

    /// Remove a tx from the plugin mempool index
    pub fn remove(
        &mut self,
        tx: &MempoolTx,
        is_mempool_tx: impl Fn(&TxId) -> bool,
    ) -> Result<BTreeMap<OutPoint, PluginOutput>> {
        let plugin_outputs = self.remove_tx(&tx.tx);

        self.group_utxos
            .remove(tx, &is_mempool_tx, &plugin_outputs)?;
        self.group_history.remove(tx, &plugin_outputs);

        Ok(plugin_outputs)
    }

    /// Remove a mined tx from the plugin mempool index
    pub fn remove_mined(&mut self, tx: &MempoolTx) -> Result<()> {
        let plugin_outputs = self.remove_tx(&tx.tx);

        self.group_utxos.remove_mined(tx, &plugin_outputs);
        self.group_history.remove(tx, &plugin_outputs);

        Ok(())
    }

    fn remove_tx(&mut self, tx: &Tx) -> BTreeMap<OutPoint, PluginOutput> {
        // Get outputs spent by the tx
        let mut plugin_outputs =
            self.spent_outputs.remove(tx.txid_ref()).unwrap_or_default();

        // Add outputs of the tx
        for output_idx in 0..tx.outputs.len() {
            let outpoint = OutPoint {
                txid: tx.txid(),
                out_idx: output_idx as u32,
            };
            if let Some(plugin_output) = self.plugin_outputs.remove(&outpoint) {
                plugin_outputs.insert(outpoint, plugin_output);
            }
        }

        plugin_outputs
    }

    /// Fetch plugin outputs given in `outpoints` either from the mempool or DB.
    /// A TxNum can optionally be provided to use for that outpoint, otherwise
    /// it will be looked up from the DB.
    pub fn fetch_plugin_outputs(
        &self,
        outpoints: impl IntoIterator<Item = (OutPoint, Option<TxNum>)>,
        db: &Db,
        is_mempool_tx: impl Fn(&TxId) -> bool,
    ) -> Result<Result<BTreeMap<OutPoint, PluginOutput>, MempoolPluginsError>>
    {
        let tx_reader = TxReader::new(db)?;
        let plugins_reader = PluginsReader::new(db)?;

        let mut plugin_outputs = BTreeMap::<OutPoint, PluginOutput>::new();
        // TxNums for which we'll look up plugin data in the DB
        let mut input_db_outpoints = Vec::new();
        for (outpoint, tx_num) in outpoints {
            if outpoint.is_coinbase() {
                continue;
            }
            let input_txid = &outpoint.txid;
            // If we find the prevout in the mempool, set the PluginOutput
            if let Some(plugin_output) = self.plugin_outputs.get(&outpoint) {
                plugin_outputs.insert(outpoint, plugin_output.clone());
                continue;
            }

            // prevout is in the mempool but not a plugin tx
            if is_mempool_tx(input_txid) {
                continue;
            }

            if let Some(tx_num) = tx_num {
                // Use the given known TxNum
                input_db_outpoints.push((outpoint, tx_num));
            } else {
                // Otherwise, tx should be in the DB, query just its TxNum
                match tx_reader.tx_num_by_txid(input_txid)? {
                    Some(tx_num) => {
                        input_db_outpoints.push((outpoint, tx_num));
                    }
                    None => return Ok(Err(InputTxNotFound(*input_txid))),
                }
            }
        }

        let mut db_plugin_outputs =
            plugins_reader.plugin_outputs(input_db_outpoints)?;
        plugin_outputs.append(&mut db_plugin_outputs);

        Ok(Ok(plugin_outputs))
    }

    /// Plugin output with the given outpoint
    pub fn plugin_output(&self, outpoint: &OutPoint) -> Option<&PluginOutput> {
        self.plugin_outputs.get(outpoint)
    }

    /// Mempool UTXOs grouped by plugin groups
    pub fn group_utxos(&self) -> &MempoolPluginUtxos {
        &self.group_utxos
    }

    /// Mempool history grouped by plugin groups
    pub fn group_history(&self) -> &MempoolPluginHistory {
        &self.group_history
    }
}

impl Default for MempoolPlugins {
    fn default() -> Self {
        MempoolPlugins::new()
    }
}
