// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`GroupUtxoWriter`] and [`GroupUtxoReader`].

use std::{
    collections::{hash_map::Entry, HashMap},
    marker::PhantomData,
    time::Instant,
};

use abc_rust_error::Result;
use rocksdb::WriteBatch;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    db::{Db, CF},
    group::{Group, GroupQuery, UtxoData},
    index_tx::IndexTx,
    io::TxNum,
    ser::{db_deserialize, db_serialize},
};

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

/// Outpoint in the DB, but with [`TxNum`] instead of `TxId` for the txid.
#[derive(
    Clone,
    Copy,
    Debug,
    Default,
    Deserialize,
    Eq,
    Ord,
    PartialEq,
    PartialOrd,
    Serialize,
)]
pub struct UtxoOutpoint {
    /// [`TxNum`] of tx of the outpoint.
    pub tx_num: TxNum,
    /// Output of the tx referenced by the outpoint.
    pub out_idx: u32,
}

/// Entry in the UTXO DB for a group.
#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
pub struct UtxoEntry<D> {
    /// Outpoint of the UTXO.
    pub outpoint: UtxoOutpoint,

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
    /// Time [s] for fetching UTXOs.
    pub t_fetch: f64,
    /// Time [s] for indexing UTXOs.
    pub t_index: f64,
}

/// Error indicating something went wrong with the tx index.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum GroupUtxoError {
    /// UTXO already in the DB
    #[error(
        "Duplicate UTXO: {0:?} has been added twice to the member's UTXOs"
    )]
    DuplicateUtxo(UtxoOutpoint),

    /// UTXO already in the DB
    #[error("UTXO doesn't exist: {0:?} is not in the member's UTXOs")]
    UtxoDoesntExist(UtxoOutpoint),
}

use self::GroupUtxoError::*;

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
        let mut updated_utxos =
            HashMap::<G::Member<'tx>, Vec<UtxoEntry<G::UtxoData>>>::new();
        for index_tx in txs {
            let query = GroupQuery {
                is_coinbase: index_tx.is_coinbase,
                tx: index_tx.tx,
            };
            for item in self.group.output_members(query, aux) {
                let t_fetch = Instant::now();
                let entries =
                    self.get_or_fetch(&mut updated_utxos, item.member)?;
                stats.t_fetch += t_fetch.elapsed().as_secs_f64();
                let new_entry = Self::output_utxo(index_tx, item.idx);
                let t_index = Instant::now();
                Self::insert_utxo_entry(new_entry, entries)?;
                stats.t_index += t_index.elapsed().as_secs_f64();
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
                let t_fetch = Instant::now();
                let entries =
                    self.get_or_fetch(&mut updated_utxos, item.member)?;
                stats.t_fetch += t_fetch.elapsed().as_secs_f64();
                let delete_entry = Self::input_utxo(index_tx, item.idx);
                let t_index = Instant::now();
                Self::delete_utxo_entry(&delete_entry.outpoint, entries)?;
                stats.t_index += t_index.elapsed().as_secs_f64();
            }
        }
        self.update_write_batch(batch, &updated_utxos)?;
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
        let mut updated_utxos =
            HashMap::<G::Member<'tx>, Vec<UtxoEntry<G::UtxoData>>>::new();
        for index_tx in txs {
            if index_tx.is_coinbase {
                continue;
            }
            let query = GroupQuery {
                is_coinbase: index_tx.is_coinbase,
                tx: index_tx.tx,
            };
            for item in self.group.input_members(query, aux) {
                let t_fetch = Instant::now();
                let entries =
                    self.get_or_fetch(&mut updated_utxos, item.member)?;
                stats.t_fetch += t_fetch.elapsed().as_secs_f64();
                let new_entry = Self::input_utxo(index_tx, item.idx);
                let t_index = Instant::now();
                Self::insert_utxo_entry(new_entry, entries)?;
                stats.t_index += t_index.elapsed().as_secs_f64();
            }
        }
        for index_tx in txs {
            let query = GroupQuery {
                is_coinbase: index_tx.is_coinbase,
                tx: index_tx.tx,
            };
            for item in self.group.output_members(query, aux) {
                let t_fetch = Instant::now();
                let entries =
                    self.get_or_fetch(&mut updated_utxos, item.member)?;
                stats.t_fetch += t_fetch.elapsed().as_secs_f64();
                let delete_entry = Self::output_utxo(index_tx, item.idx);
                let t_index = Instant::now();
                Self::delete_utxo_entry(&delete_entry.outpoint, entries)?;
                stats.t_index += t_index.elapsed().as_secs_f64();
            }
        }
        self.update_write_batch(batch, &updated_utxos)?;
        stats.t_total += t_start.elapsed().as_secs_f64();
        Ok(())
    }

    pub(crate) fn add_cfs(columns: &mut Vec<rocksdb::ColumnFamilyDescriptor>) {
        columns.push(rocksdb::ColumnFamilyDescriptor::new(
            G::utxo_conf().cf_name,
            rocksdb::Options::default(),
        ));
    }

    fn output_utxo(
        index_tx: &IndexTx<'_>,
        idx: usize,
    ) -> UtxoEntry<G::UtxoData> {
        UtxoEntry {
            outpoint: UtxoOutpoint {
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
            outpoint: UtxoOutpoint {
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
        new_entry: UtxoEntry<G::UtxoData>,
        entries: &mut Vec<UtxoEntry<G::UtxoData>>,
    ) -> Result<()> {
        match entries
            .binary_search_by_key(&&new_entry.outpoint, |entry| &entry.outpoint)
        {
            Ok(_) => return Err(DuplicateUtxo(new_entry.outpoint).into()),
            Err(insert_idx) => entries.insert(insert_idx, new_entry),
        }
        Ok(())
    }

    fn delete_utxo_entry(
        delete_outpoint: &UtxoOutpoint,
        entries: &mut Vec<UtxoEntry<G::UtxoData>>,
    ) -> Result<()> {
        match entries
            .binary_search_by_key(&delete_outpoint, |entry| &entry.outpoint)
        {
            Ok(delete_idx) => entries.remove(delete_idx),
            Err(_) => return Err(UtxoDoesntExist(*delete_outpoint).into()),
        };
        Ok(())
    }

    fn get_or_fetch<'u, 'tx>(
        &self,
        utxos: &'u mut HashMap<G::Member<'tx>, Vec<UtxoEntry<G::UtxoData>>>,
        member: G::Member<'tx>,
    ) -> Result<&'u mut Vec<UtxoEntry<G::UtxoData>>> {
        match utxos.entry(member) {
            Entry::Occupied(entry) => Ok(entry.into_mut()),
            Entry::Vacant(entry) => {
                let member_ser = self.group.ser_member(entry.key());
                let db_entries =
                    match self.col.db.get(self.col.cf, member_ser.as_ref())? {
                        Some(data) => db_deserialize::<
                            Vec<UtxoEntry<G::UtxoData>>,
                        >(&data)?,
                        None => vec![],
                    };
                Ok(entry.insert(db_entries))
            }
        }
    }

    fn update_write_batch(
        &self,
        batch: &mut WriteBatch,
        utxos: &HashMap<G::Member<'_>, Vec<UtxoEntry<G::UtxoData>>>,
    ) -> Result<()> {
        for (member, utxos) in utxos {
            let member_ser = self.group.ser_member(member);
            if utxos.is_empty() {
                batch.delete_cf(self.col.cf, member_ser.as_ref());
            } else {
                batch.put_cf(
                    self.col.cf,
                    member_ser.as_ref(),
                    db_serialize(&utxos)?,
                );
            }
        }
        Ok(())
    }
}

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
                Ok(Some(db_deserialize::<Vec<UtxoEntry<G::UtxoData>>>(&entry)?))
            }
            None => Ok(None),
        }
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
        db::Db,
        index_tx::prepare_indexed_txs,
        io::{
            BlockTxs, GroupUtxoMemData, GroupUtxoReader, GroupUtxoWriter,
            TxEntry, TxWriter, TxsMemData, UtxoEntry, UtxoOutpoint,
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
            outpoint: UtxoOutpoint { tx_num, out_idx },
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
