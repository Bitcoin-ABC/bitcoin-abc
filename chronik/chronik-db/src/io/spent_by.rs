// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::{
    collections::{hash_map::Entry, HashMap},
    time::Instant,
};

use abc_rust_error::Result;
use rocksdb::{ColumnFamilyDescriptor, Options};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    db::{Db, WriteBatch, CF, CF_SPENT_BY},
    index_tx::IndexTx,
    io::{merge::catch_merge_errors, TxNum},
    ser::{db_deserialize, db_deserialize_vec, db_serialize, db_serialize_vec},
};

/// Indicates an output has been spent by an input in a tx.
/// This is an entry in the list of spent outputs of a tx.
#[derive(
    Clone,
    Debug,
    Default,
    Deserialize,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
    Serialize,
)]
pub struct SpentByEntry {
    /// Which output has been spent.
    pub out_idx: u32,
    /// Which tx spent the output.
    pub tx_num: TxNum,
    /// Which input of the spending tx spent the output.
    pub input_idx: u32,
}

struct SpentByColumn<'a> {
    db: &'a Db,
    cf: &'a CF,
}

/// Write to the DB which outputs of a tx have been spent by which tx (and
/// input).
///
/// For each tx that has any output spent, there will be a list of entries in
/// the DB. Each entry tells us which output has been spent, which tx_num spent
/// it, and which input of that tx.
///
/// Note: While TxWriter writes keys using 8-byte big-endian numbers, this
/// writes it using [`db_serialize`], because unlike TxWriter, we don't rely on
/// any ordering. Since [`db_serialize`] is more compact, this saves some space.
#[derive(Debug)]
pub struct SpentByWriter<'a> {
    col: SpentByColumn<'a>,
}

/// Read from the DB which outputs of a tx have been spent by which tx (and
/// input).
#[derive(Debug)]
pub struct SpentByReader<'a> {
    col: SpentByColumn<'a>,
}

/// In-memory data for spent-by data.
#[derive(Debug, Default)]
pub struct SpentByMemData {
    /// Stats about cache hits, num requests etc.
    pub stats: SpentByStats,
}

/// Stats about cache hits, num requests etc.
#[derive(Clone, Debug, Default)]
pub struct SpentByStats {
    /// Total number of txs updated.
    pub n_total: usize,
    /// Time [s] for insert/delete.
    pub t_total: f64,
    /// Time [s] for fetching txs.
    pub t_fetch: f64,
}

/// Error indicating that something went wrong with writing spent-by data.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum SpentByError {
    /// Tried adding a spent-by entry, but it's already marked as spent by
    /// another entry.
    #[error(
        "Inconsistent DB: Duplicate spend by entry for tx_num = {tx_num}: \
         {existing:?} already exists, but tried to add {new:?}"
    )]
    DuplicateSpentByEntry {
        /// An output of this tx_num has been spent
        tx_num: TxNum,
        /// Entry already present in the DB.
        existing: SpentByEntry,
        /// Entry we tried to add.
        new: SpentByEntry,
    },

    /// Tried removing a spent-by entry, but it doesn't match what we got from
    /// the disconnected block.
    #[error(
        "Inconsistent DB: Mismatched spend by entry for tx_num = {tx_num}: \
         Expected {expected:?} to be present, but got {actual:?}"
    )]
    MismatchedSpentByEntry {
        /// Tried removing a spent-by entry of an output of this tx_num.
        tx_num: TxNum,
        /// Entry we expected based on the disconnected block.
        expected: SpentByEntry,
        /// Entry actually found in the DB.
        actual: SpentByEntry,
    },

    /// Tried removing a spent-by entry, but it doesn't exist.
    #[error(
        "Inconsistent DB: Missing spend by entry for tx_num = {tx_num}: \
         Expected {expected:?} to be present, but none found"
    )]
    MissingSpentByEntry {
        /// Tried removing a spent-by entry of an output of this tx_num.
        tx_num: TxNum,
        /// Entry we expected to be present based on the disconnected block.
        expected: SpentByEntry,
    },
}

use self::SpentByError::*;

fn ser_tx_num(tx_num: TxNum) -> Result<Vec<u8>> {
    db_serialize(&tx_num)
}

fn deser_tx_num(bytes: &[u8]) -> Result<TxNum> {
    db_deserialize(bytes)
}

fn init_merge_spent_by(
    _key: &[u8],
    existing_value: Option<&[u8]>,
    _operands: &rocksdb::MergeOperands,
) -> Result<Vec<SpentByEntry>> {
    match existing_value {
        Some(bytes) => db_deserialize_vec::<SpentByEntry>(bytes),
        None => Ok(vec![]),
    }
}

fn apply_merge_spent_by(
    key: &[u8],
    entries: &mut Vec<SpentByEntry>,
    operand: &[u8],
) -> Result<()> {
    let extra_entries = db_deserialize_vec::<SpentByEntry>(operand)?;
    entries.reserve(extra_entries.len());
    for spent_by in extra_entries {
        let search_idx = entries
            .binary_search_by_key(&spent_by.out_idx, |entry| entry.out_idx);
        match search_idx {
            Ok(idx) => {
                let input_tx_num = deser_tx_num(key)?;
                // Output already spent by another tx -> corrupted DB?
                return Err(DuplicateSpentByEntry {
                    tx_num: input_tx_num,
                    existing: entries[idx].clone(),
                    new: spent_by,
                }
                .into());
            }
            Err(insert_idx) => {
                // No entry found -> insert it
                entries.insert(insert_idx, spent_by);
            }
        }
    }
    Ok(())
}

fn ser_merge_spent_by(
    _key: &[u8],
    entries: Vec<SpentByEntry>,
) -> Result<Vec<u8>> {
    db_serialize_vec::<SpentByEntry>(entries)
}

impl<'a> SpentByColumn<'a> {
    fn new(db: &'a Db) -> Result<Self> {
        let cf = db.cf(CF_SPENT_BY)?;
        Ok(SpentByColumn { db, cf })
    }
}

impl<'a> SpentByWriter<'a> {
    /// Create a new [`SpentByWriter`].
    pub fn new(db: &'a Db) -> Result<Self> {
        let col = SpentByColumn::new(db)?;
        Ok(SpentByWriter { col })
    }

    /// Add spent-by entries to txs spent in the txs.
    /// For each tx output spent in `txs`, add which tx spent it.
    pub fn insert(
        &self,
        batch: &mut WriteBatch,
        txs: &[IndexTx<'_>],
        mem_data: &mut SpentByMemData,
    ) -> Result<()> {
        let stats = &mut mem_data.stats;
        let t_start = Instant::now();
        stats.n_total += txs.len();
        let mut spent_by_map = HashMap::<TxNum, Vec<SpentByEntry>>::new();
        for tx in txs {
            if tx.is_coinbase {
                // a coinbase doesn't spend anything
                continue;
            }
            for (input_idx, (input, &input_tx_num)) in
                tx.tx.inputs.iter().zip(tx.input_nums.iter()).enumerate()
            {
                let spent_by = SpentByEntry {
                    out_idx: input.prev_out.out_idx,
                    tx_num: tx.tx_num,
                    input_idx: input_idx as u32,
                };
                spent_by_map.entry(input_tx_num).or_default().push(spent_by);
            }
        }
        for (tx_num, entries) in spent_by_map {
            batch.merge_cf(
                self.col.cf,
                ser_tx_num(tx_num)?,
                db_serialize_vec::<SpentByEntry>(entries)?,
            );
        }
        stats.t_total += t_start.elapsed().as_secs_f64();
        Ok(())
    }

    /// Remove spent-by entries from txs spent in the txs.
    /// For each tx output spent in `txs`, remove which tx spent it.
    pub fn delete(
        &self,
        batch: &mut WriteBatch,
        txs: &[IndexTx<'_>],
        mem_data: &mut SpentByMemData,
    ) -> Result<()> {
        let stats = &mut mem_data.stats;
        let t_start = Instant::now();
        stats.n_total += txs.len();
        let mut spent_by_map = HashMap::<TxNum, Vec<SpentByEntry>>::new();
        for tx in txs {
            if tx.is_coinbase {
                // a coinbase doesn't spend anything
                continue;
            }
            for (input_idx, (input, &input_tx_num)) in
                tx.tx.inputs.iter().zip(tx.input_nums.iter()).enumerate()
            {
                let spent_by = SpentByEntry {
                    out_idx: input.prev_out.out_idx,
                    tx_num: tx.tx_num,
                    input_idx: input_idx as u32,
                };
                let t_fetch = Instant::now();
                let spent_by_entries =
                    self.get_or_fetch(&mut spent_by_map, input_tx_num)?;
                stats.t_fetch += t_fetch.elapsed().as_secs_f64();
                let search_idx = spent_by_entries
                    .binary_search_by_key(&spent_by.out_idx, |entry| {
                        entry.out_idx
                    });
                match search_idx {
                    Ok(idx) => {
                        // Found the spent-by entry -> remove it.
                        if spent_by_entries[idx] != spent_by {
                            // Existing entry doesn't match what's in the DB.
                            return Err(MismatchedSpentByEntry {
                                tx_num: input_tx_num,
                                expected: spent_by,
                                actual: spent_by_entries[idx].clone(),
                            }
                            .into());
                        }
                        spent_by_entries.remove(idx);
                    }
                    Err(_) => {
                        // Spent-by entry not found, but should be there.
                        return Err(MissingSpentByEntry {
                            tx_num: input_tx_num,
                            expected: spent_by,
                        }
                        .into());
                    }
                }
            }
        }
        for (tx_num, entries) in spent_by_map {
            let ser_num = ser_tx_num(tx_num)?;
            if entries.is_empty() {
                batch.delete_cf(self.col.cf, ser_num);
            } else {
                batch.put_cf(self.col.cf, ser_num, db_serialize_vec(entries)?);
            }
        }
        stats.t_total += t_start.elapsed().as_secs_f64();
        Ok(())
    }

    fn get_or_fetch<'b>(
        &self,
        spent_by_map: &'b mut HashMap<TxNum, Vec<SpentByEntry>>,
        tx_num: TxNum,
    ) -> Result<&'b mut Vec<SpentByEntry>> {
        match spent_by_map.entry(tx_num) {
            Entry::Occupied(entry) => Ok(entry.into_mut()),
            Entry::Vacant(entry) => {
                let db_entries =
                    match self.col.db.get(self.col.cf, ser_tx_num(tx_num)?)? {
                        Some(data) => {
                            db_deserialize_vec::<SpentByEntry>(&data)?
                        }
                        None => vec![],
                    };
                Ok(entry.insert(db_entries))
            }
        }
    }

    pub(crate) fn add_cfs(columns: &mut Vec<ColumnFamilyDescriptor>) {
        let mut options = Options::default();
        options.set_merge_operator(
            "spent_by::merge_op",
            catch_merge_errors(
                init_merge_spent_by,
                apply_merge_spent_by,
                ser_merge_spent_by,
            ),
            |_, _, _| None,
        );
        columns.push(ColumnFamilyDescriptor::new(CF_SPENT_BY, options));
    }
}

impl<'a> SpentByReader<'a> {
    /// Create a new [`SpentByReader`].
    pub fn new(db: &'a Db) -> Result<Self> {
        let col = SpentByColumn::new(db)?;
        Ok(SpentByReader { col })
    }

    /// Query the spent-by entries by [`TxNum`].
    pub fn by_tx_num(
        &self,
        tx_num: TxNum,
    ) -> Result<Option<Vec<SpentByEntry>>> {
        match self.col.db.get(self.col.cf, ser_tx_num(tx_num)?)? {
            Some(data) => Ok(Some(db_deserialize_vec::<SpentByEntry>(&data)?)),
            None => Ok(None),
        }
    }
}

impl std::fmt::Debug for SpentByColumn<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("SpentByColumn")
            .field("db", &self.db)
            .field("cf", &"..")
            .finish()
    }
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use abc_rust_error::Result;
    use bitcoinsuite_core::tx::Tx;

    use crate::{
        db::{Db, WriteBatch},
        index_tx::prepare_indexed_txs,
        io::{
            merge::{check_for_errors, MERGE_ERROR_LOCK},
            BlockTxs, SpentByEntry, SpentByError, SpentByMemData,
            SpentByReader, SpentByWriter, TxEntry, TxWriter, TxsMemData,
        },
        test::make_inputs_tx,
    };

    #[test]
    fn test_spent_by() -> Result<()> {
        let _guard = MERGE_ERROR_LOCK.lock().unwrap();
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-db--spent_by")?;
        let mut cfs = Vec::new();
        TxWriter::add_cfs(&mut cfs);
        SpentByWriter::add_cfs(&mut cfs);
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;
        let tx_writer = TxWriter::new(&db)?;
        let spent_by_writer = SpentByWriter::new(&db)?;
        let spent_by_reader = SpentByReader::new(&db)?;
        let mem_data = RefCell::new(SpentByMemData::default());
        let txs_mem_data = RefCell::new(TxsMemData::default());

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
            spent_by_writer.insert(
                &mut batch,
                &index_txs,
                &mut mem_data.borrow_mut(),
            )?;
            db.write_batch(batch)?;
            for tx in &index_txs {
                for &input_tx_num in &tx.input_nums {
                    spent_by_reader.by_tx_num(input_tx_num)?;
                    check_for_errors()?;
                }
            }
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
            spent_by_writer.delete(
                &mut batch,
                &index_txs,
                &mut mem_data.borrow_mut(),
            )?;
            db.write_batch(batch)?;
            *block_height.borrow_mut() -= 1;
            Ok(())
        };
        macro_rules! spent_by {
            (out_idx=$out_idx:literal -> tx_num=$tx_num:literal,
                                         input_idx=$input_idx:literal) => {
                SpentByEntry {
                    out_idx: $out_idx,
                    tx_num: $tx_num,
                    input_idx: $input_idx,
                }
            };
        }

        let block0 =
            vec![make_inputs_tx(0, [(0x00, u32::MAX, -1)], [-1, -1, -1, -1])];
        connect_block(&block0)?;

        let block1 = vec![
            make_inputs_tx(1, [(0x00, u32::MAX, -1)], [-1, -1]),
            // spend 3rd output of tx_num=0
            make_inputs_tx(2, [(0, 3, -1)], [-1, -1, -1]),
        ];
        connect_block(&block1)?;
        assert_eq!(
            spent_by_reader.by_tx_num(0)?,
            Some(vec![spent_by!(out_idx=3 -> tx_num=2, input_idx=0)]),
        );

        // Remove block1
        disconnect_block(&block1)?;
        assert_eq!(spent_by_reader.by_tx_num(0)?, None);

        // Add block1 again
        connect_block(&block1)?;

        let block2 = vec![
            make_inputs_tx(3, [(0x00, u32::MAX, -1)], [-1]),
            // spend 2nd output of tx_num=0, and 0th output of tx_num=1
            make_inputs_tx(4, [(0, 2, -1), (1, 0, -1)], [-1, -1, -1]),
            // spend 1st output of tx_num=1, and 1st output of tx_num=0
            make_inputs_tx(5, [(1, 1, -1), (0, 1, -1)], [-1, -1]),
        ];
        connect_block(&block2)?;
        assert_eq!(
            spent_by_reader.by_tx_num(0)?,
            Some(vec![
                spent_by!(out_idx=1 -> tx_num=5, input_idx=1),
                spent_by!(out_idx=2 -> tx_num=4, input_idx=0),
                spent_by!(out_idx=3 -> tx_num=2, input_idx=0),
            ]),
        );
        assert_eq!(
            spent_by_reader.by_tx_num(1)?,
            Some(vec![
                spent_by!(out_idx=0 -> tx_num=4, input_idx=1),
                spent_by!(out_idx=1 -> tx_num=5, input_idx=0),
            ]),
        );

        // More complex block
        let block3 = vec![
            make_inputs_tx(6, [(0x00, u32::MAX, -1)], [-1]),
            make_inputs_tx(7, [(4, 0, -1), (2, 0, -1)], [-1, -1]),
            make_inputs_tx(8, [(9, 0, -1), (5, 1, -1)], [-1, -1]),
            make_inputs_tx(9, [(7, 1, -1), (8, 1, -1)], [-1]),
        ];
        connect_block(&block3)?;
        assert_eq!(
            spent_by_reader.by_tx_num(2)?,
            Some(vec![spent_by!(out_idx=0 -> tx_num=7, input_idx=1)]),
        );
        assert_eq!(
            spent_by_reader.by_tx_num(4)?,
            Some(vec![spent_by!(out_idx=0 -> tx_num=7, input_idx=0)]),
        );
        assert_eq!(
            spent_by_reader.by_tx_num(5)?,
            Some(vec![spent_by!(out_idx=1 -> tx_num=8, input_idx=1)]),
        );
        assert_eq!(spent_by_reader.by_tx_num(6)?, None);
        assert_eq!(
            spent_by_reader.by_tx_num(7)?,
            Some(vec![spent_by!(out_idx=1 -> tx_num=9, input_idx=0)]),
        );
        assert_eq!(
            spent_by_reader.by_tx_num(8)?,
            Some(vec![spent_by!(out_idx=1 -> tx_num=9, input_idx=1)]),
        );
        assert_eq!(
            spent_by_reader.by_tx_num(9)?,
            Some(vec![spent_by!(out_idx=0 -> tx_num=8, input_idx=0)]),
        );

        disconnect_block(&block3)?;
        assert_eq!(
            spent_by_reader.by_tx_num(0)?,
            Some(vec![
                spent_by!(out_idx=1 -> tx_num=5, input_idx=1),
                spent_by!(out_idx=2 -> tx_num=4, input_idx=0),
                spent_by!(out_idx=3 -> tx_num=2, input_idx=0),
            ]),
        );
        assert_eq!(
            spent_by_reader.by_tx_num(1)?,
            Some(vec![
                spent_by!(out_idx=0 -> tx_num=4, input_idx=1),
                spent_by!(out_idx=1 -> tx_num=5, input_idx=0),
            ]),
        );
        assert_eq!(spent_by_reader.by_tx_num(2)?, None);
        assert_eq!(spent_by_reader.by_tx_num(4)?, None);
        assert_eq!(spent_by_reader.by_tx_num(5)?, None);
        assert_eq!(spent_by_reader.by_tx_num(6)?, None);
        assert_eq!(spent_by_reader.by_tx_num(7)?, None);
        assert_eq!(spent_by_reader.by_tx_num(8)?, None);
        assert_eq!(spent_by_reader.by_tx_num(9)?, None);

        // failed connect: duplicate entry
        let block_duplicate_spend = vec![
            make_inputs_tx(10, [(0x00, u32::MAX, -1)], []),
            make_inputs_tx(11, [(0, 1, -1)], []),
        ];
        assert_eq!(
            connect_block(&block_duplicate_spend)
                .unwrap_err()
                .downcast::<SpentByError>()?,
            SpentByError::DuplicateSpentByEntry {
                tx_num: 0,
                existing: spent_by!(out_idx=1 -> tx_num=5, input_idx=1),
                new: spent_by!(out_idx=1 -> tx_num=7, input_idx=0),
            },
        );

        // Ensure failed connect didn't have any side-effects on spent-by data
        assert_eq!(
            spent_by_reader.by_tx_num(0)?,
            Some(vec![
                spent_by!(out_idx=1 -> tx_num=5, input_idx=1),
                spent_by!(out_idx=2 -> tx_num=4, input_idx=0),
                spent_by!(out_idx=3 -> tx_num=2, input_idx=0),
            ]),
        );
        assert_eq!(
            spent_by_reader.by_tx_num(1)?,
            Some(vec![
                spent_by!(out_idx=0 -> tx_num=4, input_idx=1),
                spent_by!(out_idx=1 -> tx_num=5, input_idx=0),
            ]),
        );

        // Undo side effects introduced by failed connect
        disconnect_block(&[
            make_inputs_tx(10, [(0x00, u32::MAX, -1)], []),
            // Note the missing input values
            make_inputs_tx(11, [], []),
        ])?;

        // failed disconnect: mismatched entry
        let block_mismatched_spend = vec![
            make_inputs_tx(3, [(0x00, u32::MAX, -1)], []),
            make_inputs_tx(4, [(0, 1, -1)], []),
        ];
        assert_eq!(
            disconnect_block(&block_mismatched_spend)
                .unwrap_err()
                .downcast::<SpentByError>()?,
            SpentByError::MismatchedSpentByEntry {
                tx_num: 0,
                expected: spent_by!(out_idx=1 -> tx_num=4, input_idx=0),
                actual: spent_by!(out_idx=1 -> tx_num=5, input_idx=1),
            },
        );

        // failed disconnect: missing entry
        let block_missing_spend = vec![
            make_inputs_tx(3, [(0x00, u32::MAX, -1)], []),
            make_inputs_tx(4, [(3, 1, -1)], []),
        ];
        assert_eq!(
            disconnect_block(&block_missing_spend)
                .unwrap_err()
                .downcast::<SpentByError>()?,
            SpentByError::MissingSpentByEntry {
                tx_num: 3,
                expected: spent_by!(out_idx=1 -> tx_num=4, input_idx=0),
            },
        );

        // disconnect blocks
        disconnect_block(&block2)?;
        assert_eq!(
            spent_by_reader.by_tx_num(0)?,
            Some(vec![spent_by!(out_idx=3 -> tx_num=2, input_idx=0)]),
        );
        assert_eq!(spent_by_reader.by_tx_num(1)?, None);
        assert_eq!(spent_by_reader.by_tx_num(2)?, None);
        assert_eq!(spent_by_reader.by_tx_num(3)?, None);
        assert_eq!(spent_by_reader.by_tx_num(4)?, None);
        assert_eq!(spent_by_reader.by_tx_num(5)?, None);

        disconnect_block(&block1)?;
        assert_eq!(spent_by_reader.by_tx_num(0)?, None);
        assert_eq!(spent_by_reader.by_tx_num(1)?, None);
        assert_eq!(spent_by_reader.by_tx_num(2)?, None);
        assert_eq!(spent_by_reader.by_tx_num(3)?, None);

        disconnect_block(&block0)?;
        assert_eq!(spent_by_reader.by_tx_num(0)?, None);
        assert_eq!(spent_by_reader.by_tx_num(1)?, None);

        drop(db);
        rocksdb::DB::destroy(&rocksdb::Options::default(), tempdir.path())?;
        let _ = check_for_errors();

        Ok(())
    }
}
