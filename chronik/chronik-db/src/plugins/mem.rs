// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::BTreeMap;

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, TxId};
use bitcoinsuite_slp::{token_tx::TokenTx, verify::SpentToken};
use chronik_plugin::{
    context::PluginContext,
    data::{PluginNameMap, PluginOutput},
};
use thiserror::Error;

use crate::{
    db::Db,
    io::{TxNum, TxReader},
    mem::MempoolTx,
    plugins::{MempoolPluginsError::*, PluginsReader},
};

/// Plugin data of the mempool
#[derive(Debug)]
pub struct MempoolPlugins {
    plugin_outputs: BTreeMap<OutPoint, PluginOutput>,
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
    ) -> Result<()> {
        if plugin_name_map.is_empty() {
            return Ok(());
        }

        let plugin_outputs = self.fetch_plugin_outputs(
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
                self.plugin_outputs.insert(
                    OutPoint {
                        txid: tx.tx.txid(),
                        out_idx,
                    },
                    plugin_output,
                );
            }

            Ok(())
        })?;

        Ok(())
    }

    /// Remove a tx from the plugin mempool index
    pub fn remove(&mut self, tx: &MempoolTx) -> Result<()> {
        for output_idx in 0..tx.tx.outputs.len() {
            self.plugin_outputs.remove(&OutPoint {
                txid: tx.tx.txid(),
                out_idx: output_idx as u32,
            });
        }
        Ok(())
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
}

impl Default for MempoolPlugins {
    fn default() -> Self {
        MempoolPlugins::new()
    }
}
