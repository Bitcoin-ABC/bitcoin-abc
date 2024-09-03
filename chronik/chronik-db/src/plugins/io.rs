// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::BTreeMap;

use abc_rust_error::Result;
use bitcoinsuite_core::tx::OutPoint;
use bitcoinsuite_slp::lokad_id::parse_tx_lokad_ids;
use chronik_plugin::{
    context::PluginContext,
    data::{PluginIdx, PluginNameMap, PluginOutput},
};
use rocksdb::{ColumnFamilyDescriptor, Direction, WriteBatch};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use topo_sort::TopoSort;

use crate::{
    data::DbOutpoint,
    db::{Db, CF, CF_PLUGIN_META, CF_PLUGIN_OUTPUTS},
    index_tx::IndexTx,
    io::{
        token::ProcessedTokenTxBatch, BlockHeight, GroupHistoryMemData,
        GroupHistoryReader, GroupHistoryWriter, GroupUtxoMemData,
        GroupUtxoReader, GroupUtxoWriter, TxNum,
    },
    plugins::{PluginDbError::*, PluginsGroup},
    ser::{db_deserialize, db_serialize},
};

/// Index the UTXOs of plugins in the DB
pub type PluginsUtxoWriter<'a> = GroupUtxoWriter<'a, PluginsGroup>;
/// Read UTXOs of plugins in the DB
pub type PluginsUtxoReader<'a> = GroupUtxoReader<'a, PluginsGroup>;
/// Index the tx history of plugins in the DB
pub type PluginsHistoryWriter<'a> = GroupHistoryWriter<'a, PluginsGroup>;
/// Read tx history of plugins in the DB
pub type PluginsHistoryReader<'a> = GroupHistoryReader<'a, PluginsGroup>;

struct PluginsCol<'a> {
    db: &'a Db,
    cf_plugin_meta: &'a CF,
    cf_plugin_outputs: &'a CF,
}

/// Plugin metadata
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub struct PluginMeta {
    /// Index of the plugin to identify it in the database
    pub plugin_idx: PluginIdx,
    /// version string
    pub version: String,
    /// Last height the plugin was synced to
    pub sync_height: BlockHeight,
}

/// Runs plugins and writes the results to the DB
#[derive(Debug)]
pub struct PluginsWriter<'a> {
    col: PluginsCol<'a>,
    ctx: &'a PluginContext,
}

/// Read data written by plugins from the DB.
#[derive(Debug)]
pub struct PluginsReader<'a> {
    col: PluginsCol<'a>,
}

/// Errors for [`BlockWriter`] and [`BlockReader`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum PluginDbError {
    /// Inconsistent DB: Plugin name is not UTF-8
    #[error("Inconsistent DB: Plugin name is not UTF-8: {0}: {1:?}")]
    PluginNameNotUtf8(String, Vec<u8>),

    /// Plugin loaded but not in name map
    #[error("Plugin {0:?} loaded but not in name map")]
    PluginLoadedButNotInNameMap(String),
}

impl<'a> PluginsCol<'a> {
    fn new(db: &'a Db) -> Result<Self> {
        let cf_plugin_meta = db.cf(CF_PLUGIN_META)?;
        let cf_plugin_outputs = db.cf(CF_PLUGIN_OUTPUTS)?;
        Ok(PluginsCol {
            db,
            cf_plugin_meta,
            cf_plugin_outputs,
        })
    }

    fn fetch_plugin_outputs(
        &self,
        outpoints: impl IntoIterator<Item = (OutPoint, TxNum)> + Clone,
    ) -> Result<BTreeMap<OutPoint, PluginOutput>> {
        let ser_outputs = self.db.multi_get(
            self.cf_plugin_outputs,
            outpoints.clone().into_iter().map(|(outpoint, tx_num)| {
                db_serialize(&DbOutpoint {
                    tx_num,
                    out_idx: outpoint.out_idx,
                })
                .unwrap()
            }),
            false,
        )?;
        let mut outputs = BTreeMap::new();
        for ((outpoint, _), ser_output) in
            outpoints.into_iter().zip(ser_outputs)
        {
            let Some(ser_output) = ser_output else {
                continue;
            };
            outputs
                .insert(outpoint, db_deserialize::<PluginOutput>(&ser_output)?);
        }
        Ok(outputs)
    }

    fn has_any_outputs(&self) -> Result<bool> {
        Ok(self
            .db
            .iterator(self.cf_plugin_outputs, b"", rocksdb::Direction::Forward)
            .next()
            .transpose()?
            .is_some())
    }
}

impl<'a> PluginsWriter<'a> {
    /// Create a new [`PluginsWriter`].
    pub fn new(db: &'a Db, ctx: &'a PluginContext) -> Result<Self> {
        Ok(PluginsWriter {
            col: PluginsCol::new(db)?,
            ctx,
        })
    }

    /// Write the plugin metadata
    pub fn write_meta(
        &self,
        batch: &mut WriteBatch,
        plugin_name: &str,
        plugin_meta: &PluginMeta,
    ) -> Result<()> {
        batch.put_cf(
            self.col.cf_plugin_meta,
            plugin_name,
            db_serialize(plugin_meta)?,
        );
        Ok(())
    }

    /// Update the last synced height of all loaded plugins
    pub fn update_sync_height(
        &self,
        batch: &mut WriteBatch,
        block_height: BlockHeight,
        plugin_name_map: &PluginNameMap,
    ) -> Result<()> {
        for plugin in self.ctx.plugins() {
            let plugin_idx = plugin_name_map
                .idx_by_name(&plugin.module_name)
                .ok_or_else(|| {
                PluginLoadedButNotInNameMap(plugin.module_name.clone())
            })?;
            self.write_meta(
                batch,
                &plugin.module_name,
                &PluginMeta {
                    plugin_idx,
                    version: plugin.version.to_string(),
                    sync_height: block_height,
                },
            )?;
        }

        Ok(())
    }

    /// Run the plugin scripts write outputs and group them.
    pub fn insert(
        &self,
        batch: &mut WriteBatch,
        txs: &[IndexTx<'_>],
        processed_token_data: &ProcessedTokenTxBatch,
        plugin_name_map: &PluginNameMap,
    ) -> Result<BTreeMap<OutPoint, PluginOutput>> {
        if self.ctx.plugins().is_empty() {
            return Ok(BTreeMap::new());
        }

        // Filter out txs that don't match any plugin
        let plugin_txs = txs
            .iter()
            .filter(|tx| {
                parse_tx_lokad_ids(tx.tx)
                    .any(|lokad_id| self.ctx.has_plugin_with_lokad_id(lokad_id))
            })
            .map(|tx| (tx.tx_num, tx))
            .collect::<BTreeMap<_, _>>();

        // Skip outputs
        if !self.col.has_any_outputs()? && plugin_txs.is_empty() {
            return Ok(BTreeMap::new());
        }

        let mut plugin_outputs =
            self.col.fetch_plugin_outputs(txs.iter().flat_map(|tx| {
                tx.tx.inputs.iter().zip(&tx.input_nums).map(
                    |(input, &input_tx_num)| (input.prev_out, input_tx_num),
                )
            }))?;

        // Build a DAG of tx nums so we can sort topologically
        let mut topo_sort = TopoSort::with_capacity(plugin_txs.len());
        for (&tx_num, tx) in &plugin_txs {
            topo_sort.insert_from_slice(tx_num, &tx.input_nums);
        }

        self.ctx.with_py(|py| -> Result<_> {
            for tx_num in topo_sort.into_nodes() {
                let tx_num = tx_num?;
                let tx = plugin_txs[&tx_num];
                let token_tx = processed_token_data.valid_txs.get(&tx_num);
                let spent_tokens =
                    processed_token_data.spent_tokens.get(&tx_num);
                let result = self.ctx.run_on_tx(
                    py,
                    tx.tx,
                    token_tx.zip(spent_tokens.map(|tokens| tokens.as_slice())),
                    &plugin_outputs,
                    plugin_name_map,
                )?;
                for (out_idx, plugin_output) in result.outputs {
                    let mut tx_data = PluginOutput::default();
                    for (plugin_idx, entry) in plugin_output.plugins {
                        tx_data.plugins.insert(plugin_idx, entry);
                    }
                    batch.put_cf(
                        self.col.cf_plugin_outputs,
                        db_serialize(&DbOutpoint { tx_num, out_idx })?,
                        db_serialize::<PluginOutput>(&tx_data)?,
                    );
                    plugin_outputs.insert(
                        OutPoint {
                            txid: tx.tx.txid(),
                            out_idx,
                        },
                        tx_data,
                    );
                }
            }
            Ok(())
        })?;

        let group_utxos = PluginsUtxoWriter::new(self.col.db, PluginsGroup)?;
        group_utxos.insert(
            batch,
            txs,
            &plugin_outputs,
            &mut GroupUtxoMemData::default(),
        )?;

        let group_history =
            PluginsHistoryWriter::new(self.col.db, PluginsGroup)?;
        group_history.insert(
            batch,
            txs,
            &plugin_outputs,
            &mut GroupHistoryMemData::default(),
        )?;

        Ok(plugin_outputs)
    }

    /// Delete the plugin data of a batch from the DB.
    pub fn delete(
        &self,
        batch: &mut WriteBatch,
        txs: &[IndexTx<'_>],
    ) -> Result<()> {
        if self.ctx.plugins().is_empty() {
            return Ok(());
        }

        // Fetch plugins for both inputs and outputs, for groups
        let plugin_outputs =
            self.col.fetch_plugin_outputs(txs.iter().flat_map(|tx| {
                tx.tx
                    .inputs
                    .iter()
                    .zip(&tx.input_nums)
                    .map(|(input, &input_tx_num)| {
                        (input.prev_out, input_tx_num)
                    })
                    .chain((0..tx.tx.outputs.len()).map(|out_idx| {
                        (
                            OutPoint {
                                txid: tx.tx.txid(),
                                out_idx: out_idx as u32,
                            },
                            tx.tx_num,
                        )
                    }))
            }))?;

        for tx in txs {
            for output_idx in 0..tx.tx.outputs.len() {
                let outpoint = OutPoint {
                    txid: tx.tx.txid(),
                    out_idx: output_idx as u32,
                };
                let db_outpoint = DbOutpoint {
                    tx_num: tx.tx_num,
                    out_idx: output_idx as u32,
                };
                if plugin_outputs.contains_key(&outpoint) {
                    batch.delete_cf(
                        self.col.cf_plugin_outputs,
                        db_serialize::<DbOutpoint>(&db_outpoint)?,
                    );
                }
            }
        }

        let group_utxos = PluginsUtxoWriter::new(self.col.db, PluginsGroup)?;
        group_utxos.delete(
            batch,
            txs,
            &plugin_outputs,
            &mut GroupUtxoMemData::default(),
        )?;

        let group_history =
            PluginsHistoryWriter::new(self.col.db, PluginsGroup)?;
        group_history.delete(
            batch,
            txs,
            &plugin_outputs,
            &mut GroupHistoryMemData::default(),
        )?;

        Ok(())
    }

    pub(crate) fn add_cfs(columns: &mut Vec<ColumnFamilyDescriptor>) {
        columns.push(ColumnFamilyDescriptor::new(
            CF_PLUGIN_META,
            rocksdb::Options::default(),
        ));
        columns.push(ColumnFamilyDescriptor::new(
            CF_PLUGIN_OUTPUTS,
            rocksdb::Options::default(),
        ));
        PluginsUtxoWriter::add_cfs(columns);
        PluginsHistoryWriter::add_cfs(columns);
    }
}

impl<'a> PluginsReader<'a> {
    /// Create a new [`PluginsReader`].
    pub fn new(db: &'a Db) -> Result<Self> {
        Ok(PluginsReader {
            col: PluginsCol::new(db)?,
        })
    }

    /// Read all plugin metas in the DB
    pub fn metas(&self) -> Result<Vec<(String, PluginMeta)>> {
        let iter = self.col.db.iterator(
            self.col.cf_plugin_meta,
            &[],
            Direction::Forward,
        );
        let mut metas = Vec::new();
        for meta in iter {
            let (plugin_name, ser_plugin_meta) = meta?;
            let plugin_name = String::from_utf8(plugin_name.into_vec())
                .map_err(|err| {
                    PluginNameNotUtf8(err.to_string(), err.into_bytes())
                })?;
            let plugin_meta = db_deserialize::<PluginMeta>(&ser_plugin_meta)?;
            metas.push((plugin_name, plugin_meta));
        }
        Ok(metas)
    }

    /// Read an individual outpoint from the DB.
    pub fn plugin_output(
        &self,
        outpoint: &DbOutpoint,
    ) -> Result<Option<PluginOutput>> {
        let ser_outpoint = db_serialize(outpoint)?;
        let Some(output) =
            self.col.db.get(self.col.cf_plugin_outputs, &ser_outpoint)?
        else {
            return Ok(None);
        };
        Ok(Some(db_deserialize::<PluginOutput>(&output)?))
    }

    /// Read all the given outpoints by [`DbOutpoint`] and return them as map by
    /// [`OutPoint`].
    pub fn plugin_outputs(
        &self,
        outpoints: impl IntoIterator<Item = (OutPoint, TxNum)> + Clone,
    ) -> Result<BTreeMap<OutPoint, PluginOutput>> {
        self.col.fetch_plugin_outputs(outpoints)
    }

    /// Read all plugin inputs and outputs of the given indexed txs
    pub fn txs_plugin_outputs(
        &self,
        txs: &[IndexTx<'_>],
    ) -> Result<BTreeMap<OutPoint, PluginOutput>> {
        self.plugin_outputs(txs.iter().flat_map(|index_tx| {
            let input_outpoints = index_tx
                .tx
                .inputs
                .iter()
                .zip(index_tx.input_nums.iter())
                .map(|(input, &input_tx_num)| (input.prev_out, input_tx_num));
            let outpoint_outpoints =
                (0..index_tx.tx.outputs.len()).map(|out_idx| {
                    (
                        OutPoint {
                            txid: index_tx.tx.txid(),
                            out_idx: out_idx as u32,
                        },
                        index_tx.tx_num,
                    )
                });
            input_outpoints.chain(outpoint_outpoints)
        }))
    }

    /// Read all the given outpoints by [`DbOutpoint`]s and return them as
    /// `Vec`.
    pub fn plugin_db_outputs(
        &self,
        outpoints: impl IntoIterator<Item = DbOutpoint>,
    ) -> Result<Vec<Option<PluginOutput>>> {
        let ser_outputs = self.col.db.multi_get(
            self.col.cf_plugin_outputs,
            outpoints
                .into_iter()
                .map(|db_outpoint| db_serialize(&db_outpoint).unwrap()),
            false,
        )?;
        let mut outputs = Vec::new();
        for ser_output in ser_outputs {
            outputs.push(
                ser_output
                    .map(|ser_output| {
                        db_deserialize::<PluginOutput>(&ser_output)
                    })
                    .transpose()?,
            );
        }
        Ok(outputs)
    }
}

impl std::fmt::Debug for PluginsCol<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("PluginsCol")
            .field("db", &self.db)
            .field("cf_plugin_meta", &"..")
            .field("cf_plugin_outputs", &"..")
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use std::{cell::RefCell, fs::File, io::Write};

    use abc_rust_error::Result;
    use bitcoinsuite_core::{net::Net, script::Script, tx::Tx};
    use bitcoinsuite_slp::{
        test_helpers::{
            empty_entry, meta_alp, spent_amount, token_amount, TOKEN_ID1,
        },
        token_tx::{TokenTx, TokenTxEntry},
    };
    use chronik_plugin::{
        context::PluginContext,
        data::{PluginNameMap, PluginOutput, PluginOutputEntry},
        params::PluginParams,
    };
    use pretty_assertions::assert_eq;
    use rocksdb::WriteBatch;

    use crate::{
        data::DbOutpoint,
        db::Db,
        index_tx::prepare_indexed_txs,
        io::{
            token::{tests::mock::make_tx, ProcessedTokenTxBatch},
            BlockTxs, TxEntry, TxWriter, TxsMemData,
        },
        plugins::{PluginDbError, PluginMeta, PluginsReader, PluginsWriter},
    };

    #[test]
    fn test_plugin_metas() -> Result<()> {
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-db--plugin_metas")?;
        let mut cfs = Vec::new();
        PluginsWriter::add_cfs(&mut cfs);
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;

        let ctx = PluginContext::default();
        let plugins_writer = PluginsWriter::new(&db, &ctx)?;
        let plugins_reader = PluginsReader::new(&db)?;

        assert_eq!(plugins_reader.metas()?, vec![]);

        let plg1 = PluginMeta {
            plugin_idx: 0,
            sync_height: 0,
            version: "0.1".to_string(),
        };
        let mut batch = WriteBatch::default();
        plugins_writer.write_meta(&mut batch, "plg1", &plg1)?;
        db.write_batch(batch)?;
        assert_eq!(
            plugins_reader.metas()?,
            vec![("plg1".to_string(), plg1.clone())],
        );

        let plg2 = PluginMeta {
            plugin_idx: 1000,
            sync_height: 25,
            version: "0.2".to_string(),
        };
        let mut batch = WriteBatch::default();
        plugins_writer.write_meta(&mut batch, "plg2", &plg2)?;
        db.write_batch(batch)?;
        assert_eq!(
            plugins_reader.metas()?,
            vec![
                ("plg1".to_string(), plg1.clone()),
                ("plg2".to_string(), plg2.clone()),
            ],
        );

        let plg1_new = PluginMeta {
            plugin_idx: 0,
            sync_height: 1000,
            version: "0.4".to_string(),
        };
        let mut batch = WriteBatch::default();
        plugins_writer.write_meta(&mut batch, "plg1", &plg1_new)?;
        db.write_batch(batch)?;
        assert_eq!(
            plugins_reader.metas()?,
            vec![
                ("plg1".to_string(), plg1_new.clone()),
                ("plg2".to_string(), plg2.clone()),
            ],
        );

        let mut batch = WriteBatch::default();
        batch.put_cf(plugins_writer.col.cf_plugin_meta, b"\xff", b"");
        db.write_batch(batch)?;

        assert_eq!(
            plugins_reader
                .metas()
                .unwrap_err()
                .downcast::<PluginDbError>()?,
            PluginDbError::PluginNameNotUtf8(
                "invalid utf-8 sequence of 1 bytes from index 0".to_string(),
                vec![0xff],
            ),
        );

        Ok(())
    }

    #[test]
    fn test_plugin_writer() -> Result<()> {
        if !cfg!(feature = "plugins") {
            // Only test this if the "plugins" feature is enabled.
            // We still get the type checking though.
            return Ok(());
        }
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-plugin-impl-run_on_tx")?;
        let mut cfs = Vec::new();
        PluginsWriter::add_cfs(&mut cfs);
        TxWriter::add_cfs(&mut cfs);
        let db = Db::open_with_cfs(tempdir.path().join("db"), cfs)?;

        let plugins_conf_path = tempdir.path().join("plugins.toml");
        File::create(&plugins_conf_path)?
            .write_all(b"[plugin.counter]\n[plugin.summer]\n[plugin.fail]")?;

        // Plugin that counts up for each transaction (output[1] = input[0] + 1)
        File::create(tempdir.path().join("counter.py"))?.write_all(
            b"
from chronik_plugin.plugin import Plugin, PluginOutput
class CounterPlugin(Plugin):
    def lokad_id(self):
        return b'COUN'
    def version(self):
        return '0.0.0'
    def run(self, tx):
        value = 0
        if tx.inputs:
            value = tx.inputs[0].plugin['counter'].data[0][0]
        value += 1
        return [PluginOutput(idx=1, data=bytes([value]), groups=[])]
        ",
        )?;

        // Plugin that sums up the input and output token amounts
        File::create(tempdir.path().join("summer.py"))?.write_all(
            b"
from chronik_plugin.plugin import Plugin, PluginOutput
class SummerPlugin(Plugin):
    def lokad_id(self):
        return b'SUM_'
    def version(self):
        return '0.0.0'
    def run(self, tx):
        input_sum = sum(iput.output.token.amount for iput in tx.inputs)
        output_sum = sum(output.token.amount for output in tx.outputs[1:])
        return [PluginOutput(
            idx=1,
            data=[bytes([input_sum]), bytes([output_sum])],
            groups=[],
        )]",
        )?;

        // Plugin that unconditionally fails
        File::create(tempdir.path().join("fail.py"))?.write_all(
            b"
from chronik_plugin.plugin import Plugin, PluginOutput
class FailPlugin(Plugin):
    def lokad_id(self):
        return b'FAIL'
    def version(self):
        return '0.0.0'
    def run(self, tx):
        raise ValueError('Failure')",
        )?;

        let db_outpoint = |tx_num, out_idx| DbOutpoint { tx_num, out_idx };

        let plugin_ctx = PluginContext::setup(PluginParams {
            net: Net::Mainnet,
            plugins_dir: tempdir.path().to_path_buf(),
            plugins_conf: plugins_conf_path,
        })?;

        let plugin_name_map = PluginNameMap::new(vec![
            (0, "counter".to_string()),
            (1, "summer".to_string()),
            (2, "fail".to_string()),
        ]);

        let tx_writer = TxWriter::new(&db)?;
        let plugins_writer = PluginsWriter::new(&db, &plugin_ctx)?;
        let plugins_reader = PluginsReader::new(&db)?;

        let block_height = RefCell::new(-1);
        let txs_batch = |txs: &[Tx]| BlockTxs {
            txs: txs
                .iter()
                .map(|tx| TxEntry {
                    txid: tx.txid(),
                    ..Default::default()
                })
                .collect(),
            block_height: *block_height.borrow(),
        };
        let connect_block = |txs: &[Tx],
                             processed_token_data: &ProcessedTokenTxBatch|
         -> Result<()> {
            let mut batch = WriteBatch::default();
            *block_height.borrow_mut() += 1;
            let block_txs = txs_batch(txs);
            let first_tx_num = tx_writer.insert(
                &mut batch,
                &block_txs,
                &mut TxsMemData::default(),
            )?;
            let index_txs = prepare_indexed_txs(&db, first_tx_num, txs)?;
            plugins_writer.insert(
                &mut batch,
                &index_txs,
                processed_token_data,
                &plugin_name_map,
            )?;
            plugins_writer.update_sync_height(
                &mut batch,
                block_txs.block_height,
                &plugin_name_map,
            )?;
            db.write_batch(batch)?;
            Ok(())
        };
        let disconnect_block = |txs: &[Tx]| -> Result<()> {
            let mut batch = WriteBatch::default();
            let block_txs = txs_batch(txs);
            let first_tx_num = tx_writer.delete(
                &mut batch,
                &block_txs,
                &mut TxsMemData::default(),
            )?;
            let index_txs = prepare_indexed_txs(&db, first_tx_num, txs)?;
            plugins_writer.delete(&mut batch, &index_txs)?;
            plugins_writer.update_sync_height(
                &mut batch,
                block_txs.block_height - 1,
                &plugin_name_map,
            )?;
            db.write_batch(batch)?;
            *block_height.borrow_mut() -= 1;
            Ok(())
        };

        let block1 = [
            make_tx(0, [], 1, Script::default()),
            make_tx(1, [], 3, Script::new(b"\x6a\x04COUN".as_ref().into())),
        ];
        connect_block(&block1, &ProcessedTokenTxBatch::default())?;

        assert_eq!(
            plugins_reader.plugin_output(&db_outpoint(1, 1))?,
            Some(PluginOutput {
                plugins: vec![(
                    0,
                    PluginOutputEntry {
                        groups: vec![],
                        data: vec![vec![1]],
                    },
                )]
                .into_iter()
                .collect(),
            }),
        );
        let mut metas = vec![
            (
                "counter".to_string(),
                PluginMeta {
                    plugin_idx: 0,
                    sync_height: 0,
                    version: "0.0.0".to_string(),
                },
            ),
            (
                "fail".to_string(),
                PluginMeta {
                    plugin_idx: 2,
                    sync_height: 0,
                    version: "0.0.0".to_string(),
                },
            ),
            (
                "summer".to_string(),
                PluginMeta {
                    plugin_idx: 1,
                    sync_height: 0,
                    version: "0.0.0".to_string(),
                },
            ),
        ];
        assert_eq!(plugins_reader.metas()?, metas);

        // Block spending 1 -> 4 -> 3 -> 5 with the "counter" plugin
        // We sort topologically, so this will work fine
        let block2 = [
            make_tx(2, [], 1, Script::default()),
            make_tx(3, [(4, 1)], 1, Script::new(b"\x6a\x04COUN"[..].into())),
            make_tx(4, [(1, 1)], 1, Script::new(b"\x6a\x04COUN"[..].into())),
            make_tx(5, [(3, 1)], 1, Script::new(b"\x6a\x04COUN"[..].into())),
        ];
        connect_block(&block2, &ProcessedTokenTxBatch::default())?;

        assert_eq!(
            plugins_reader.plugin_output(&db_outpoint(3, 1))?,
            Some(PluginOutput {
                plugins: vec![(
                    0,
                    PluginOutputEntry {
                        groups: vec![],
                        data: vec![vec![3]],
                    },
                )]
                .into_iter()
                .collect(),
            }),
        );
        assert_eq!(
            plugins_reader.plugin_output(&db_outpoint(4, 1))?,
            Some(PluginOutput {
                plugins: vec![(
                    0,
                    PluginOutputEntry {
                        groups: vec![],
                        data: vec![vec![2]],
                    },
                )]
                .into_iter()
                .collect(),
            }),
        );
        assert_eq!(
            plugins_reader.plugin_output(&db_outpoint(5, 1,))?,
            Some(PluginOutput {
                plugins: vec![(
                    0,
                    PluginOutputEntry {
                        groups: vec![],
                        data: vec![vec![4]],
                    },
                )]
                .into_iter()
                .collect(),
            }),
        );
        metas[0].1.sync_height = 1;
        metas[1].1.sync_height = 1;
        metas[2].1.sync_height = 1;
        assert_eq!(plugins_reader.metas()?, metas);

        let block3 = [
            make_tx(6, [], 1, Script::default()),
            make_tx(
                7,
                [(5, 1), (6, 0)],
                2,
                Script::new(b"\x6a\x50\x04SUM_\x04COUN".as_ref().into()),
            ),
        ];

        connect_block(
            &block3,
            &ProcessedTokenTxBatch {
                valid_txs: vec![(
                    7,
                    TokenTx {
                        entries: vec![TokenTxEntry {
                            meta: meta_alp(TOKEN_ID1),
                            ..empty_entry()
                        }],
                        outputs: vec![
                            None,
                            token_amount::<0>(50),
                            token_amount::<0>(10),
                        ],
                        ..Default::default()
                    },
                )]
                .into_iter()
                .collect(),
                spent_tokens: vec![(
                    7,
                    vec![
                        spent_amount(meta_alp(TOKEN_ID1), 20),
                        spent_amount(meta_alp(TOKEN_ID1), 15),
                    ],
                )]
                .into_iter()
                .collect(),
                ..Default::default()
            },
        )?;
        assert_eq!(
            plugins_reader.plugin_output(&db_outpoint(7, 1,))?,
            Some(PluginOutput {
                plugins: vec![
                    (
                        0,
                        PluginOutputEntry {
                            groups: vec![],
                            data: vec![vec![5]],
                        },
                    ),
                    (
                        1,
                        PluginOutputEntry {
                            groups: vec![],
                            data: vec![vec![35], vec![60]],
                        },
                    ),
                ]
                .into_iter()
                .collect(),
            }),
        );
        metas[0].1.sync_height = 2;
        metas[1].1.sync_height = 2;
        metas[2].1.sync_height = 2;
        assert_eq!(plugins_reader.metas()?, metas);

        disconnect_block(&block3)?;

        assert!(plugins_reader.plugin_output(&db_outpoint(1, 1))?.is_some());
        assert!(plugins_reader.plugin_output(&db_outpoint(3, 1))?.is_some());
        assert!(plugins_reader.plugin_output(&db_outpoint(4, 1))?.is_some());
        assert!(plugins_reader.plugin_output(&db_outpoint(5, 1))?.is_some());
        assert_eq!(plugins_reader.plugin_output(&db_outpoint(7, 1))?, None);
        metas[0].1.sync_height = 1;
        metas[1].1.sync_height = 1;
        metas[2].1.sync_height = 1;
        assert_eq!(plugins_reader.metas()?, metas);

        disconnect_block(&block2)?;

        assert!(plugins_reader.plugin_output(&db_outpoint(1, 1))?.is_some());
        assert_eq!(plugins_reader.plugin_output(&db_outpoint(3, 1))?, None);
        assert_eq!(plugins_reader.plugin_output(&db_outpoint(4, 1))?, None);
        assert_eq!(plugins_reader.plugin_output(&db_outpoint(5, 1))?, None);
        assert_eq!(plugins_reader.plugin_output(&db_outpoint(7, 1))?, None);
        metas[0].1.sync_height = 0;
        metas[1].1.sync_height = 0;
        metas[2].1.sync_height = 0;
        assert_eq!(plugins_reader.metas()?, metas);

        disconnect_block(&block1)?;

        assert_eq!(plugins_reader.plugin_output(&db_outpoint(1, 1))?, None);
        assert_eq!(plugins_reader.plugin_output(&db_outpoint(3, 1))?, None);
        assert_eq!(plugins_reader.plugin_output(&db_outpoint(4, 1))?, None);
        assert_eq!(plugins_reader.plugin_output(&db_outpoint(5, 1))?, None);
        assert_eq!(plugins_reader.plugin_output(&db_outpoint(7, 1))?, None);
        metas[0].1.sync_height = -1;
        metas[1].1.sync_height = -1;
        metas[2].1.sync_height = -1;
        assert_eq!(plugins_reader.metas()?, metas);

        assert_eq!(
            connect_block(
                &[make_tx(0, [], 1, Script::new(b"\x6a\x04FAIL"[..].into()))],
                &ProcessedTokenTxBatch::default(),
            )
            .unwrap_err()
            .to_string(),
            "Plugin \"fail\" failed indexing tx \
             0000000000000000000000000000000000000000000000000000000000000000: \
             Exception: ValueError: Failure"
        );

        Ok(())
    }
}
