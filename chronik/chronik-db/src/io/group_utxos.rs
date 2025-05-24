// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`GroupUtxoWriter`] and [`GroupUtxoReader`].

use std::{marker::PhantomData, time::Instant};

use abc_rust_error::Result;
use chronik_util::log;
use rocksdb::{compaction_filter::Decision, WriteBatch};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    data::DbOutpoint,
    db::{Db, CF},
    group::{Group, GroupQuery, UtxoData},
    index_tx::IndexTx,
    io::{group_utxos::GroupUtxoError::*, merge::catch_merge_errors},
    ser::{db_deserialize, db_deserialize_vec, db_serialize, db_serialize_vec},
};

const INSERT: u8 = b'I';
const DELETE: u8 = b'D';

/// Shorthand for `UtxoEntry<G::UtxoData>`
pub type DbGroupUtxo<G> = UtxoEntry<<G as Group>::UtxoData>;

/// Configuration for group utxos reader/writers.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct GroupUtxoConf {
    /// Column family to store the group utxos entries.
    pub cf_name: &'static str,
}

struct GroupUtxoColumn<'a> {
    db: &'a Db,
    cf: &'a CF,
}

/// Entry in the UTXO DB for a group.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct UtxoEntry<D> {
    /// Outpoint of the UTXO.
    pub outpoint: DbOutpoint,

    /// Data attached to the UTXO attached to the UTXO for easy access, e.g.
    /// the UTXO value and/or script.
    pub data: D,
}

/// Write UTXOs of a group to the DB.
#[derive(Debug)]
pub struct GroupUtxoWriter<'a, G: Group> {
    col: GroupUtxoColumn<'a>,
    group: G,
}

/// Read UTXOs of a group from the DB.
#[derive(Debug)]
pub struct GroupUtxoReader<'a, G: Group> {
    col: GroupUtxoColumn<'a>,
    phantom: PhantomData<G>,
}

/// In-memory data for indexing UTXOs of a group.
#[derive(Debug, Default)]
pub struct GroupUtxoMemData {
    /// Stats about cache hits, num requests etc.
    pub stats: GroupUtxoStats,
}

/// Stats about cache hits, num requests etc.
#[derive(Clone, Debug, Default)]
pub struct GroupUtxoStats {
    /// Total number of txs updated.
    pub n_total: usize,
    /// Time [s] for insert/delete.
    pub t_total: f64,
}

/// Error indicating something went wrong with the tx index.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum GroupUtxoError {
    /// UTXO already in the DB
    #[error(
        "Duplicate UTXO: {0:?} has been added twice to the member's UTXOs"
    )]
    DuplicateUtxo(DbOutpoint),

    /// UTXO already in the DB
    #[error("UTXO doesn't exist: {0:?} is not in the member's UTXOs")]
    UtxoDoesntExist(DbOutpoint),

    /// Used merge_cf incorrectly, prefix must either be I or D.
    #[error(
        "Bad usage of merge: Unknown prefix {prefix:02x}, \
         expected I or D: {encoded}",
        prefix = .0,
        encoded = hex::encode(.1),
    )]
    UnknownOperandPrefix(u8, Vec<u8>),

    /// Upgrade failed.
    #[error(
        "Upgrade failed, could not parse {} for key {}: {error}",
        hex::encode(.value),
        hex::encode(.key),
    )]
    UpgradeFailed {
        /// Key that failed
        key: Box<[u8]>,
        /// Value that failed parsing in the old format
        value: Box<[u8]>,
        /// Error message
        error: String,
    },
}

fn partial_merge_utxos(
    _key: &[u8],
    _existing_value: Option<&[u8]>,
    _operands: &rocksdb::MergeOperands,
) -> Option<Vec<u8>> {
    // We don't use partial merge
    None
}

fn init_merge_utxos<D: for<'a> Deserialize<'a>>(
    _key: &[u8],
    existing_value: Option<&[u8]>,
    operands: &rocksdb::MergeOperands,
) -> Result<Vec<UtxoEntry<D>>> {
    let mut entries = match existing_value {
        Some(entries_ser) => db_deserialize_vec::<UtxoEntry<D>>(entries_ser)?,
        None => vec![],
    };
    if operands.into_iter().all(|operand| operand[0] == INSERT) {
        // If we only have inserts, we can pre-allocate the exact memory we need
        entries.reserve_exact(operands.len());
    }
    Ok(entries)
}

fn apply_merge_utxos<D: for<'a> Deserialize<'a>>(
    _key: &[u8],
    entries: &mut Vec<UtxoEntry<D>>,
    operand: &[u8],
) -> Result<()> {
    match operand[0] {
        INSERT => {
            let new_entry = db_deserialize::<UtxoEntry<D>>(&operand[1..])?;
            match entries.binary_search_by_key(&&new_entry.outpoint, |entry| {
                &entry.outpoint
            }) {
                Ok(_) => return Err(DuplicateUtxo(new_entry.outpoint).into()),
                Err(insert_idx) => entries.insert(insert_idx, new_entry),
            }
        }
        DELETE => {
            let delete_outpoint = db_deserialize::<DbOutpoint>(&operand[1..])?;
            match entries.binary_search_by_key(&&delete_outpoint, |entry| {
                &entry.outpoint
            }) {
                Ok(delete_idx) => entries.remove(delete_idx),
                Err(_) => return Err(UtxoDoesntExist(delete_outpoint).into()),
            };
        }
        _ => {
            return Err(
                UnknownOperandPrefix(operand[0], operand.to_vec()).into()
            );
        }
    }
    Ok(())
}

fn ser_merge_utxos<D: Serialize>(
    _key: &[u8],
    entries: Vec<UtxoEntry<D>>,
) -> Result<Vec<u8>> {
    db_serialize_vec::<UtxoEntry<D>>(entries)
}

// We must use a compaction filter that removes empty entries
fn compaction_filter_utxos(_level: u32, _key: &[u8], value: &[u8]) -> Decision {
    if value.is_empty() {
        Decision::Remove
    } else {
        Decision::Keep
    }
}

impl<'a> GroupUtxoColumn<'a> {
    fn new(db: &'a Db, conf: &GroupUtxoConf) -> Result<Self> {
        let cf = db.cf(conf.cf_name)?;
        Ok(GroupUtxoColumn { db, cf })
    }
}

impl<'a, G: Group> GroupUtxoWriter<'a, G> {
    /// Create a new [`GroupUtxoWriter`].
    pub fn new(db: &'a Db, group: G) -> Result<Self> {
        let conf = G::utxo_conf();
        let col = GroupUtxoColumn::new(db, &conf)?;
        Ok(GroupUtxoWriter { col, group })
    }

    /// Insert the txs of a block from the UTXOs in the DB for the group.
    ///
    /// Add all the UTXOs created by the outputs of the txs to the DB, remove
    /// all the UTXOs spend by the inputs of the txs.
    pub fn insert<'tx>(
        &self,
        batch: &mut WriteBatch,
        txs: &'tx [IndexTx<'tx>],
        aux: &G::Aux,
        mem_data: &mut GroupUtxoMemData,
    ) -> Result<()> {
        let stats = &mut mem_data.stats;
        stats.n_total += txs.len();
        let t_start = Instant::now();
        for index_tx in txs {
            let query = GroupQuery {
                is_coinbase: index_tx.is_coinbase,
                tx: index_tx.tx,
            };
            for item in self.group.output_members(query, aux) {
                let new_entry = Self::output_utxo(index_tx, item.idx);
                self.insert_utxo_entry(batch, &item.member, new_entry)?;
            }
        }
        for index_tx in txs {
            if index_tx.is_coinbase {
                continue;
            }
            let query = GroupQuery {
                is_coinbase: index_tx.is_coinbase,
                tx: index_tx.tx,
            };
            for item in self.group.input_members(query, aux) {
                let delete_outpoint =
                    Self::input_utxo(index_tx, item.idx).outpoint;
                self.delete_utxo_entry(batch, &item.member, &delete_outpoint)?;
            }
        }
        stats.t_total += t_start.elapsed().as_secs_f64();
        Ok(())
    }

    /// Remove the txs of a block from the UTXOs in the DB for the group.
    ///
    /// Add all the UTXOs spent by the inputs of the txs and remove all the
    /// UTXOs created by the outputs of the txs.
    pub fn delete<'tx>(
        &self,
        batch: &mut WriteBatch,
        txs: &'tx [IndexTx<'tx>],
        aux: &G::Aux,
        mem_data: &mut GroupUtxoMemData,
    ) -> Result<()> {
        let stats = &mut mem_data.stats;
        stats.n_total += txs.len();
        let t_start = Instant::now();
        for index_tx in txs {
            if index_tx.is_coinbase {
                continue;
            }
            let query = GroupQuery {
                is_coinbase: index_tx.is_coinbase,
                tx: index_tx.tx,
            };
            for item in self.group.input_members(query, aux) {
                let new_entry = Self::input_utxo(index_tx, item.idx);
                self.insert_utxo_entry(batch, &item.member, new_entry)?;
            }
        }
        for index_tx in txs {
            let query = GroupQuery {
                is_coinbase: index_tx.is_coinbase,
                tx: index_tx.tx,
            };
            for item in self.group.output_members(query, aux) {
                let delete_outpoint =
                    Self::output_utxo(index_tx, item.idx).outpoint;
                self.delete_utxo_entry(batch, &item.member, &delete_outpoint)?;
            }
        }
        stats.t_total += t_start.elapsed().as_secs_f64();
        Ok(())
    }

    /// Clear all UTXO data from the DB
    pub fn wipe(&self, batch: &mut WriteBatch) {
        batch.delete_range_cf(self.col.cf, [].as_ref(), &[0xff; 16]);
    }

    /// Upgrade the DB from version 10 to version 11
    pub fn upgrade_10_to_11(&self) -> Result<()> {
        log!(
            "Upgrading Chronik UTXO set for {}. Do not kill the process \
             during upgrade, it will corrupt the database.\n",
            G::utxo_conf().cf_name
        );
        let estimated_num_keys =
            self.col.db.estimate_num_keys(self.col.cf)?.unwrap_or(0);
        let mut batch = WriteBatch::default();
        for (db_idx, old_utxos_ser) in
            self.col.db.full_iterator(self.col.cf).enumerate()
        {
            let (key, old_utxos_ser) = old_utxos_ser?;
            let utxos = match db_deserialize::<Vec<UtxoEntry<G::UtxoData>>>(
                &old_utxos_ser,
            ) {
                Ok(utxos) => utxos,
                Err(err) => {
                    return Err(UpgradeFailed {
                        key,
                        value: old_utxos_ser,
                        error: err.to_string(),
                    }
                    .into());
                }
            };
            let new_utxos_ser =
                db_serialize_vec::<UtxoEntry<G::UtxoData>>(utxos)?;
            batch.put_cf(self.col.cf, key, new_utxos_ser);
            if db_idx % 10000 == 0 {
                log!("Upgraded {db_idx} of {estimated_num_keys} (estimated)\n");
                self.col.db.write_batch(batch)?;
                batch = WriteBatch::default();
            }
        }
        self.col.db.write_batch(batch)?;
        log!("Upgrade for {} complete\n", G::utxo_conf().cf_name);
        Ok(())
    }

    pub(crate) fn add_cfs(columns: &mut Vec<rocksdb::ColumnFamilyDescriptor>) {
        let cf_name = G::utxo_conf().cf_name;
        let mut options = rocksdb::Options::default();
        let merge_op_name = format!("{}::merge_op_utxos", cf_name);
        options.set_merge_operator(
            merge_op_name.as_str(),
            catch_merge_errors(
                init_merge_utxos::<G::UtxoData>,
                apply_merge_utxos::<G::UtxoData>,
                ser_merge_utxos::<G::UtxoData>,
            ),
            partial_merge_utxos,
        );
        let compaction_filter_name =
            format!("{}::compaction_filter_utxos", cf_name);
        options.set_compaction_filter(
            &compaction_filter_name,
            compaction_filter_utxos,
        );
        columns.push(rocksdb::ColumnFamilyDescriptor::new(cf_name, options));
    }

    fn output_utxo(
        index_tx: &IndexTx<'_>,
        idx: usize,
    ) -> UtxoEntry<G::UtxoData> {
        UtxoEntry {
            outpoint: DbOutpoint {
                tx_num: index_tx.tx_num,
                out_idx: idx as u32,
            },
            data: G::UtxoData::from_output(&index_tx.tx.outputs[idx]),
        }
    }

    fn input_utxo(
        index_tx: &IndexTx<'_>,
        idx: usize,
    ) -> UtxoEntry<G::UtxoData> {
        UtxoEntry {
            outpoint: DbOutpoint {
                tx_num: index_tx.input_nums[idx],
                out_idx: index_tx.tx.inputs[idx].prev_out.out_idx,
            },
            data: index_tx.tx.inputs[idx]
                .coin
                .as_ref()
                .map(|coin| G::UtxoData::from_output(&coin.output))
                .unwrap_or_default(),
        }
    }

    fn insert_utxo_entry(
        &self,
        batch: &mut WriteBatch,
        member: &G::Member<'_>,
        new_entry: UtxoEntry<G::UtxoData>,
    ) -> Result<()> {
        batch.merge_cf(
            self.col.cf,
            self.group.ser_member(member),
            [[INSERT].as_ref(), &db_serialize(&new_entry)?].concat(),
        );
        Ok(())
    }

    fn delete_utxo_entry(
        &self,
        batch: &mut WriteBatch,
        member: &G::Member<'_>,
        delete_outpoint: &DbOutpoint,
    ) -> Result<()> {
        batch.merge_cf(
            self.col.cf,
            self.group.ser_member(member),
            [[DELETE].as_ref(), &db_serialize(&delete_outpoint)?].concat(),
        );
        Ok(())
    }
}

type GroupUtxoIterItem<G> = Result<(Box<[u8]>, Vec<DbGroupUtxo<G>>)>;

impl<'a, G: Group> GroupUtxoReader<'a, G> {
    /// Create a new [`GroupUtxoReader`].
    pub fn new(db: &'a Db) -> Result<Self> {
        let conf = G::utxo_conf();
        let col = GroupUtxoColumn::new(db, &conf)?;
        Ok(GroupUtxoReader {
            col,
            phantom: PhantomData,
        })
    }

    /// Query the UTXOs for the given member.
    pub fn utxos(
        &self,
        member: &[u8],
    ) -> Result<Option<Vec<UtxoEntry<G::UtxoData>>>> {
        match self.col.db.get(self.col.cf, member)? {
            Some(entry) => {
                let entries =
                    db_deserialize_vec::<UtxoEntry<G::UtxoData>>(&entry)?;
                if entries.is_empty() {
                    // Usually compaction catches this and removes such entries,
                    // but it's run later so have to filter here manually
                    return Ok(None);
                }
                Ok(Some(entries))
            }
            None => Ok(None),
        }
    }

    /// Iterate over all group members with a given prefix, starting from some
    /// given prefix
    pub fn prefix_iterator(
        &self,
        member_prefix: &'a [u8],
        member_start: &'a [u8],
    ) -> impl Iterator<Item = GroupUtxoIterItem<G>> + 'a {
        self.col
            .db
            .iterator(self.col.cf, member_start, rocksdb::Direction::Forward)
            .take_while(|entry| -> bool {
                let Ok((key, _)) = entry else {
                    return true; // forward errors
                };
                key.starts_with(member_prefix)
            })
            .filter_map(|entry| {
                let (key, value) = match entry {
                    Ok(entry) => entry,
                    Err(err) => return Some(Err(err)),
                };
                if value.is_empty() {
                    // Filter out empty (compaction hasn't removed this yet)
                    return None;
                }
                match db_deserialize_vec::<UtxoEntry<G::UtxoData>>(&value) {
                    Ok(utxos) => Some(Ok((key, utxos))),
                    Err(err) => Some(Err(err)),
                }
            })
    }
}

impl std::fmt::Debug for GroupUtxoColumn<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "GroupUtxoColumn {{ .. }}")
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use abc_rust_error::Result;
    use bitcoinsuite_core::tx::Tx;
    use rocksdb::WriteBatch;

    use crate::{
        data::DbOutpoint,
        db::Db,
        index_tx::prepare_indexed_txs,
        io::{
            BlockTxs, GroupUtxoMemData, GroupUtxoReader, GroupUtxoWriter,
            TxEntry, TxWriter, TxsMemData, UtxoEntry,
        },
        test::{make_inputs_tx, ser_value, ValueGroup},
    };

    #[test]
    fn test_value_group_utxos() -> Result<()> {
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-db--group_history")?;
        let mut cfs = Vec::new();
        GroupUtxoWriter::<ValueGroup>::add_cfs(&mut cfs);
        TxWriter::add_cfs(&mut cfs);
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;
        let tx_writer = TxWriter::new(&db)?;
        let mem_data = RefCell::new(GroupUtxoMemData::default());
        let txs_mem_data = RefCell::new(TxsMemData::default());
        let group_writer = GroupUtxoWriter::new(&db, ValueGroup)?;
        let group_reader = GroupUtxoReader::<ValueGroup>::new(&db)?;

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
        let connect_block = |txs: &[Tx]| -> Result<()> {
            let mut batch = WriteBatch::default();
            *block_height.borrow_mut() += 1;
            let first_tx_num = tx_writer.insert(
                &mut batch,
                &txs_batch(txs),
                &mut txs_mem_data.borrow_mut(),
            )?;
            let index_txs = prepare_indexed_txs(&db, first_tx_num, txs)?;
            group_writer.insert(
                &mut batch,
                &index_txs,
                &(),
                &mut mem_data.borrow_mut(),
            )?;
            db.write_batch(batch)?;
            Ok(())
        };
        let disconnect_block = |txs: &[Tx]| -> Result<()> {
            let mut batch = WriteBatch::default();
            let first_tx_num = tx_writer.delete(
                &mut batch,
                &txs_batch(txs),
                &mut txs_mem_data.borrow_mut(),
            )?;
            let index_txs = prepare_indexed_txs(&db, first_tx_num, txs)?;
            group_writer.delete(
                &mut batch,
                &index_txs,
                &(),
                &mut mem_data.borrow_mut(),
            )?;
            db.write_batch(batch)?;
            *block_height.borrow_mut() -= 1;
            Ok(())
        };
        let utxo = |tx_num, out_idx, value| UtxoEntry {
            outpoint: DbOutpoint { tx_num, out_idx },
            data: value,
        };
        let read_utxos = |val: i64| group_reader.utxos(&ser_value(val));

        let block0 =
            vec![make_inputs_tx(0x01, [(0x00, u32::MAX, 0xffff)], [100, 200])];
        connect_block(&block0)?;
        assert_eq!(read_utxos(100)?, Some(vec![utxo(0, 0, 100)]));
        assert_eq!(read_utxos(200)?, Some(vec![utxo(0, 1, 200)]));

        let block1 = vec![
            make_inputs_tx(0x02, [(0x00, u32::MAX, 0xffff)], [200]),
            make_inputs_tx(0x03, [(0x01, 0, 100)], [10, 20, 10]),
            make_inputs_tx(
                0x04,
                [(0x03, 0, 10), (0x01, 1, 200), (0x03, 1, 20)],
                [200],
            ),
        ];
        connect_block(&block1)?;
        assert_eq!(read_utxos(10)?, Some(vec![utxo(2, 2, 10)]));
        assert_eq!(read_utxos(20)?, None);
        assert_eq!(read_utxos(100)?, None);
        assert_eq!(
            read_utxos(200)?,
            Some(vec![utxo(1, 0, 200), utxo(3, 0, 200)]),
        );

        disconnect_block(&block1)?;
        assert_eq!(read_utxos(10)?, None);
        assert_eq!(read_utxos(20)?, None);
        assert_eq!(read_utxos(100)?, Some(vec![utxo(0, 0, 100)]));
        assert_eq!(read_utxos(200)?, Some(vec![utxo(0, 1, 200)]));

        // Reorg block
        let block1 = vec![
            make_inputs_tx(0x02, [(0x00, u32::MAX, 0xffff)], [200]),
            make_inputs_tx(0x10, [(0x01, 0, 100)], [100, 200, 100]),
            make_inputs_tx(
                0x11,
                [(0x10, 0, 100), (0x10, 1, 200), (0x01, 1, 200)],
                [200],
            ),
            make_inputs_tx(0x12, [(0x11, 0, 200)], [200]),
        ];

        connect_block(&block1)?;
        assert_eq!(read_utxos(100)?, Some(vec![utxo(2, 2, 100)]));
        assert_eq!(
            read_utxos(200)?,
            Some(vec![utxo(1, 0, 200), utxo(4, 0, 200)]),
        );

        disconnect_block(&block1)?;
        assert_eq!(read_utxos(100)?, Some(vec![utxo(0, 0, 100)]));
        assert_eq!(read_utxos(200)?, Some(vec![utxo(0, 1, 200)]));

        disconnect_block(&block0)?;
        assert_eq!(read_utxos(100)?, None);
        assert_eq!(read_utxos(200)?, None);

        Ok(())
    }
}
