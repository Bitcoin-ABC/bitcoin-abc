// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Stores txs from the node in the DB.
//!
//! Instead of having txids be the keys for the column family containing the
//! txs, we use a 64-bit serial number "TxNum" that increments with every
//! transaction in block order. This allows us to e.g. very easily iterate over
//! all the txs in a block just by knowing the first tx_num of the block. It
//! also simplifies the address index (especially reduces space requirements),
//! as we simply store a list of relatively small integers instead of txids.
//!
//! 64-bits allows us to store a maximum of 18446744073709551616 txs, which even
//! at 1M tx/s would be enough for +500000 years.
//!
//! We only store the `txid`, `data_pos`, `undo_pos` and `time_first_seen` in
//! the DB, everything else we can read from the block/undo files. We use the
//! fact that coinbase txs don't have undo data, and undo data for txs never is
//! at position 0, so we set `undo_pos = 0` for coinbase txs, and treat every
//! entry with `undo_pos == 0` as a coinbase tx.
//!
//! For the reverse index txid -> tx_num, we use `ReverseLookup`. We use a
//! 64-bit cheap hash to make collisions rare/difficult.

use std::{ops::Range, time::Instant};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::TxId;
use rocksdb::{ColumnFamilyDescriptor, Options, WriteBatch};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    db::{
        Db, CF, CF_BLK_BY_FIRST_TX, CF_FIRST_TX_BY_BLK, CF_LOOKUP_TX_BY_HASH,
        CF_TX,
    },
    io::{bh_to_bytes, bytes_to_bh, BlockHeight},
    reverse_lookup::{LookupColumn, ReverseLookup},
    ser::{db_deserialize, db_serialize},
};

type LookupByHash<'a> = ReverseLookup<TxColumn<'a>>;

/// Number that uniquely identifies a tx in the blockchain.
/// Transactions are enumerated in the exact order they appear in the
/// blockchain. This looks like this:
///
/// * - 0 (coinbase of genesis)
///   - 1 (first non-coinbase tx in genesis block),
///   - ...
///   - N-1 (last tx in genesis block)
/// * - N (coinbase of second block)
///   - N+1 (first non-coinbase tx in second block),
///   - ...
///   - M-1 (last tx in second block)
/// * - M (coinbase of third block)
///   - M + 1 (first non-coinbase tx in third block),
///   - etc.
///
/// With CTOR, the non-coinbase txs within blocks are sorted in order of txid.
pub type TxNum = u64;

/// Entry of a tx in the DB.
///
/// Instead of storing tx data directly, we utilize the fact that the node
/// already stores the block and undo data, and just store positions into these
/// files.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct TxEntry {
    /// TxId of the tx.
    pub txid: TxId,
    /// Position of the tx data in the tx's block's block file.
    pub data_pos: u32,
    /// Position of the tx undo data in the tx's block's undo file.
    pub undo_pos: u32,
    /// When this tx has first been seen in the mempool.
    pub time_first_seen: i64,
    /// Whether this is a coinbase tx.
    pub is_coinbase: bool,
}

/// Tx from the DB with height.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlockTx {
    /// Tx data.
    pub entry: TxEntry,
    /// Height of block of the tx.
    pub block_height: BlockHeight,
}

/// Txs of a block, bundled in one struct so we can add it easily to the DB.
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct BlockTxs {
    /// Tx data.
    pub txs: Vec<TxEntry>,
    /// Height of the block of the txs.
    pub block_height: BlockHeight,
}

/// In-memory data for the tx history.
#[derive(Debug, Default)]
pub struct TxsMemData {
    /// Stats about cache hits, num requests etc.
    pub stats: TxsStats,
}

/// Stats about cache hits, num requests etc.
#[derive(Clone, Debug, Default)]
pub struct TxsStats {
    /// Total number of txs updated.
    pub n_total: usize,
    /// Time [s] for insert/delete.
    pub t_total: f64,
    /// Time [s] for indexing txs.
    pub t_index: f64,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
struct SerTx {
    txid: [u8; 32],
    data_pos: u32,
    undo_pos: u32, // == 0 <==> is_coinbase == true
    time_first_seen: i64,
}

struct TxColumn<'a> {
    db: &'a Db,
    cf_tx: &'a CF,
    cf_blk_by_first_tx: &'a CF,
    cf_first_tx_by_blk: &'a CF,
}

/// Write [`BlockTxs`] to the DB.
pub struct TxWriter<'a> {
    col: TxColumn<'a>,
}

/// Read [`BlockTx`]s from the DB.
pub struct TxReader<'a> {
    col: TxColumn<'a>,
}

/// Error indicating something went wrong with the tx index.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum TxsError {
    /// TxNum must be 8 bytes.
    #[error("Inconsistent DB: Invalid tx_num bytes: {0:?}")]
    InvalidTxNumBytes(Vec<u8>),

    /// A block without txs is not valid.
    #[error("Inconsistent DB: Txs for block {0} not found")]
    NoTxsForBlock(BlockHeight),

    /// A tx must always have a block.
    #[error("Inconsistent DB: Block for tx {0} not found")]
    TxWithoutBlock(TxNum),
}

use self::TxsError::*;

pub(crate) fn tx_num_to_bytes(tx_num: TxNum) -> [u8; 8] {
    // big-endian, so txs are sorted ascendingly
    tx_num.to_be_bytes()
}

pub(crate) fn bytes_to_tx_num(bytes: &[u8]) -> Result<TxNum> {
    Ok(TxNum::from_be_bytes(
        bytes
            .try_into()
            .map_err(|_| InvalidTxNumBytes(bytes.to_vec()))?,
    ))
}

impl<'a> LookupColumn for TxColumn<'a> {
    type CheapHash = [u8; 8];
    type Data = SerTx;
    type SerialNum = TxNum;

    const CF_DATA: &'static str = CF_TX;
    const CF_INDEX: &'static str = CF_LOOKUP_TX_BY_HASH;

    fn cheap_hash(key: &[u8; 32]) -> Self::CheapHash {
        seahash::hash(key).to_be_bytes()
    }

    fn data_key(value: &Self::Data) -> &[u8; 32] {
        &value.txid
    }

    fn get_data(&self, tx_num: Self::SerialNum) -> Result<Option<Self::Data>> {
        self.get_tx(tx_num)
    }

    fn get_data_multi(
        &self,
        tx_nums: impl IntoIterator<Item = Self::SerialNum>,
    ) -> Result<Vec<Option<Self::Data>>> {
        let data_ser = self.db.multi_get(
            self.cf_tx,
            tx_nums.into_iter().map(tx_num_to_bytes),
            false,
        )?;
        data_ser
            .into_iter()
            .map(|data_ser| {
                data_ser
                    .map(|data_ser| db_deserialize::<SerTx>(&data_ser))
                    .transpose()
            })
            .collect::<_>()
    }
}

impl<'a> TxColumn<'a> {
    fn new(db: &'a Db) -> Result<Self> {
        let cf_tx = db.cf(CF_TX)?;
        let cf_blk_by_first_tx = db.cf(CF_BLK_BY_FIRST_TX)?;
        let cf_first_tx_by_blk = db.cf(CF_FIRST_TX_BY_BLK)?;
        db.cf(CF_LOOKUP_TX_BY_HASH)?;
        Ok(TxColumn {
            db,
            cf_tx,
            cf_blk_by_first_tx,
            cf_first_tx_by_blk,
        })
    }

    fn get_tx(&self, tx_num: TxNum) -> Result<Option<SerTx>> {
        match self.db.get(self.cf_tx, tx_num_to_bytes(tx_num))? {
            Some(bytes) => Ok(Some(db_deserialize::<SerTx>(&bytes)?)),
            None => Ok(None),
        }
    }
}

impl<'a> TxWriter<'a> {
    /// Create a new [`TxWriter`].
    pub fn new(db: &'a Db) -> Result<Self> {
        Ok(TxWriter {
            col: TxColumn::new(db)?,
        })
    }

    /// Insert and index the txs into the DB.
    pub fn insert(
        &self,
        batch: &mut WriteBatch,
        block_txs: &BlockTxs,
        mem_data: &mut TxsMemData,
    ) -> Result<TxNum> {
        let stats = &mut mem_data.stats;
        let t_start = Instant::now();
        stats.n_total += block_txs.txs.len();
        let mut last_tx_num_iterator = self.col.db.iterator_end(self.col.cf_tx);
        let first_new_tx = match last_tx_num_iterator.next() {
            Some(result) => {
                let (tx_num, _) = result?;
                bytes_to_tx_num(&tx_num)? + 1
            }
            None => 0,
        };
        batch.put_cf(
            self.col.cf_blk_by_first_tx,
            tx_num_to_bytes(first_new_tx),
            bh_to_bytes(block_txs.block_height),
        );
        batch.put_cf(
            self.col.cf_first_tx_by_blk,
            bh_to_bytes(block_txs.block_height),
            tx_num_to_bytes(first_new_tx),
        );
        let mut index_pairs = Vec::with_capacity(block_txs.txs.len());
        let mut next_tx_num = first_new_tx;
        for tx in &block_txs.txs {
            let ser_tx = SerTx::from(tx);
            batch.put_cf(
                self.col.cf_tx,
                tx_num_to_bytes(next_tx_num),
                db_serialize(&ser_tx)?,
            );
            index_pairs.push((next_tx_num, tx.txid.as_bytes()));
            next_tx_num += 1;
        }
        let t_index = Instant::now();
        LookupByHash::insert_pairs(self.col.db, batch, index_pairs)?;
        stats.t_index += t_index.elapsed().as_secs_f64();
        stats.t_total += t_start.elapsed().as_secs_f64();
        Ok(first_new_tx)
    }

    /// Delete and unindex the txs from the DB.
    pub fn delete(
        &self,
        batch: &mut WriteBatch,
        block_txs: &BlockTxs,
        mem_data: &mut TxsMemData,
    ) -> Result<TxNum> {
        let stats = &mut mem_data.stats;
        let t_start = Instant::now();
        stats.n_total += block_txs.txs.len();
        let first_tx_num = self
            .col
            .db
            .get(
                self.col.cf_first_tx_by_blk,
                bh_to_bytes(block_txs.block_height),
            )?
            .ok_or(NoTxsForBlock(block_txs.block_height))?;
        let first_tx_num = bytes_to_tx_num(&first_tx_num)?;
        let mut next_tx_num = first_tx_num;
        let mut index_pairs = Vec::with_capacity(block_txs.txs.len());
        for tx in &block_txs.txs {
            batch.delete_cf(self.col.cf_tx, tx_num_to_bytes(next_tx_num));
            index_pairs.push((next_tx_num, tx.txid.as_bytes()));
            next_tx_num += 1;
        }
        batch.delete_cf(
            self.col.cf_blk_by_first_tx,
            tx_num_to_bytes(first_tx_num),
        );
        batch.delete_cf(
            self.col.cf_first_tx_by_blk,
            bh_to_bytes(block_txs.block_height),
        );
        let t_index = Instant::now();
        LookupByHash::delete_pairs(self.col.db, batch, index_pairs)?;
        stats.t_index += t_index.elapsed().as_secs_f64();
        stats.t_total += t_start.elapsed().as_secs_f64();
        Ok(first_tx_num)
    }

    /// Add the column families used for txs.
    pub(crate) fn add_cfs(columns: &mut Vec<ColumnFamilyDescriptor>) {
        columns.push(ColumnFamilyDescriptor::new(CF_TX, Options::default()));
        columns.push(ColumnFamilyDescriptor::new(
            CF_BLK_BY_FIRST_TX,
            Options::default(),
        ));
        columns.push(ColumnFamilyDescriptor::new(
            CF_FIRST_TX_BY_BLK,
            Options::default(),
        ));
        LookupByHash::add_cfs(columns);
    }
}

impl std::fmt::Debug for TxWriter<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "TxWriter {{ ... }}")
    }
}

impl<'a> TxReader<'a> {
    /// Create a new [`TxReader`].
    pub fn new(db: &'a Db) -> Result<Self> {
        Ok(TxReader {
            col: TxColumn::new(db)?,
        })
    }

    /// Read a tx by txid, or None if not in the DB.
    pub fn tx_by_txid(&self, txid: &TxId) -> Result<Option<BlockTx>> {
        match self.tx_and_num_by_txid(txid)? {
            Some((_, block_tx)) => Ok(Some(block_tx)),
            None => Ok(None),
        }
    }

    /// Read a [`BlockTx`] and its [`TxNum`] by [`TxId`], or [`None`] if not in
    /// the DB.
    pub fn tx_and_num_by_txid(
        &self,
        txid: &TxId,
    ) -> Result<Option<(TxNum, BlockTx)>> {
        let (tx_num, ser_tx) =
            match LookupByHash::get(&self.col, self.col.db, txid.as_bytes())? {
                Some(tuple) => tuple,
                None => return Ok(None),
            };
        let block_height = self.block_height_by_tx_num(tx_num)?;
        Ok(Some((
            tx_num,
            BlockTx {
                entry: TxEntry::from(ser_tx),
                block_height,
            },
        )))
    }

    /// Read just the [`TxNum`] of the tx by [`TxId`], or [`None`] if not in the
    /// DB. This is faster than [`TxReader::tx_and_num_by_txid`].
    pub fn tx_num_by_txid(&self, txid: &TxId) -> Result<Option<TxNum>> {
        match LookupByHash::get(&self.col, self.col.db, txid.as_bytes())? {
            Some((tx_num, _)) => Ok(Some(tx_num)),
            None => Ok(None),
        }
    }

    /// Batch-read just the [`TxNum`]s of the txs by [`TxId`]s, or [`None`] if
    /// not in the DB.
    pub fn tx_nums_by_txids<'b, I>(
        &self,
        txids: I,
    ) -> Result<Vec<Option<TxNum>>>
    where
        I: IntoIterator<Item = &'b TxId> + Clone,
        I::IntoIter: Clone,
    {
        let data = LookupByHash::get_multi(
            &self.col,
            self.col.db,
            txids.into_iter().map(|txid| txid.as_bytes()),
        )?;
        Ok(data
            .into_iter()
            .map(|data| data.map(|(tx_num, _)| tx_num))
            .collect())
    }

    /// Read the [`BlockTx`] by [`TxNum`], or [`None`] if not in the DB.
    pub fn tx_by_tx_num(&self, tx_num: TxNum) -> Result<Option<BlockTx>> {
        let Some(ser_tx) = self.col.get_tx(tx_num)? else {
            return Ok(None);
        };
        let block_height = self.block_height_by_tx_num(tx_num)?;
        Ok(Some(BlockTx {
            entry: TxEntry::from(ser_tx),
            block_height,
        }))
    }

    /// Read just the [`TxId`] of the tx by [`TxNum`], or [`None`] if not in the
    /// DB. This is faster than [`TxReader::tx_and_num_by_txid`].
    pub fn txid_by_tx_num(&self, tx_num: TxNum) -> Result<Option<TxId>> {
        let Some(ser_tx) = self.col.get_tx(tx_num)? else {
            return Ok(None);
        };
        Ok(Some(TxId::from(ser_tx.txid)))
    }

    /// Read just the [`TxId`]s of the txs by [`TxNum`]s, or [`None`] if one is
    /// not in the DB. Uses batched reads, so should be faster than
    /// `txid_by_tx_num` in a loop.
    pub fn txids_by_tx_nums(
        &self,
        tx_nums: impl IntoIterator<Item = TxNum>,
    ) -> Result<Vec<Option<TxId>>> {
        self.col
            .db
            .multi_get(
                self.col.cf_tx,
                tx_nums.into_iter().map(tx_num_to_bytes),
                false,
            )?
            .into_iter()
            .map(|ser_tx| {
                ser_tx
                    .map(|ser_tx| db_deserialize::<SerTx>(&ser_tx))
                    .transpose()
            })
            .map(|tx| tx.map(|tx| tx.map(|tx| TxId::from(tx.txid))))
            .collect()
    }

    /// Read the first [`TxNum`] of a [`BlockHeight`], or [`None`] if not in the
    /// DB. This is useful for getting all the txs in a block, by iterating
    /// between this (inclusive) and the next block's first tx_num (exclusive),
    /// we get all tx nums of the block.
    pub fn first_tx_num_by_block(
        &self,
        block_height: BlockHeight,
    ) -> Result<Option<TxNum>> {
        match self
            .col
            .db
            .get(self.col.cf_first_tx_by_blk, bh_to_bytes(block_height))?
        {
            Some(first_tx_num) => Ok(Some(bytes_to_tx_num(&first_tx_num)?)),
            None => Ok(None),
        }
    }

    /// Return the range of [`TxNum`]s of the block, or None if the block
    /// doesn't exist.
    pub fn block_tx_num_range(
        &self,
        block_height: BlockHeight,
    ) -> Result<Option<Range<TxNum>>> {
        let tx_num_start = match self.first_tx_num_by_block(block_height)? {
            Some(tx_num) => tx_num,
            None => return Ok(None),
        };
        let tx_num_end = match self.first_tx_num_by_block(block_height + 1)? {
            Some(first_tx_num_next) => first_tx_num_next,
            None => match self.last_tx_num()? {
                Some(last_tx_num) => last_tx_num + 1,
                None => return Err(NoTxsForBlock(block_height).into()),
            },
        };
        Ok(Some(tx_num_start..tx_num_end))
    }

    /// Read the last [`TxNum`] of the DB.
    /// This is useful when iterating over the txs of the last block.
    pub fn last_tx_num(&self) -> Result<Option<TxNum>> {
        let mut iter = self.col.db.iterator_end(self.col.cf_tx);
        match iter.next() {
            Some(result) => {
                let (key, _) = result?;
                Ok(Some(bytes_to_tx_num(&key)?))
            }
            None => Ok(None),
        }
    }

    /// Read the block height the tx_num has. Err if not found.
    pub fn block_height_by_tx_num(&self, tx_num: TxNum) -> Result<BlockHeight> {
        let mut iter = self.col.db.iterator(
            self.col.cf_blk_by_first_tx,
            &tx_num_to_bytes(tx_num),
            rocksdb::Direction::Reverse,
        );
        match iter.next() {
            Some(result) => {
                let (_, block_height) = result?;
                bytes_to_bh(&block_height)
            }
            None => Err(TxWithoutBlock(tx_num).into()),
        }
    }
}

impl std::fmt::Debug for TxReader<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "TxReader {{ ... }}")
    }
}

impl From<&'_ TxEntry> for SerTx {
    fn from(value: &TxEntry) -> Self {
        SerTx {
            txid: value.txid.to_bytes(),
            data_pos: value.data_pos,
            undo_pos: value.undo_pos,
            time_first_seen: value.time_first_seen,
        }
    }
}

impl From<SerTx> for TxEntry {
    fn from(value: SerTx) -> Self {
        TxEntry {
            txid: TxId::from(value.txid),
            data_pos: value.data_pos,
            undo_pos: value.undo_pos,
            time_first_seen: value.time_first_seen,
            is_coinbase: value.undo_pos == 0,
        }
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use bitcoinsuite_core::tx::TxId;
    use pretty_assertions::assert_eq;
    use rocksdb::WriteBatch;

    use crate::{
        db::Db,
        io::{BlockTx, BlockTxs, TxEntry, TxReader, TxWriter, TxsMemData},
    };

    #[test]
    fn test_insert_txs() -> Result<()> {
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-db--txs")?;
        let db = Db::open(tempdir.path())?;
        let tx_writer = TxWriter::new(&db)?;
        let tx_reader = TxReader::new(&db)?;
        let mut mem_data = TxsMemData::default();
        let tx1 = TxEntry {
            txid: TxId::from([1; 32]),
            data_pos: 100,
            undo_pos: 0,
            time_first_seen: 123456,
            is_coinbase: true,
        };
        let block_tx1 = BlockTx {
            entry: tx1.clone(),
            block_height: 0,
        };
        let block1 = BlockTxs {
            block_height: 0,
            txs: vec![tx1],
        };
        assert_eq!(tx_reader.last_tx_num()?, None);
        assert_eq!(tx_reader.block_tx_num_range(0)?, None);
        {
            // insert genesis tx
            let mut batch = WriteBatch::default();
            assert_eq!(
                tx_writer.insert(&mut batch, &block1, &mut mem_data)?,
                0
            );
            db.write_batch(batch)?;
            let tx_reader = TxReader::new(&db)?;
            assert_eq!(tx_reader.first_tx_num_by_block(0)?, Some(0));
            assert_eq!(tx_reader.first_tx_num_by_block(1)?, None);
            assert_eq!(tx_reader.last_tx_num()?, Some(0));
            assert_eq!(tx_reader.block_tx_num_range(0)?, Some(0..1));
            assert_eq!(tx_reader.tx_by_txid(&TxId::from([0; 32]))?, None);
            assert_eq!(tx_reader.tx_num_by_txid(&TxId::from([0; 32]))?, None);
            assert_eq!(
                tx_reader.tx_by_txid(&TxId::from([1; 32]))?,
                Some(block_tx1.clone()),
            );
            assert_eq!(tx_reader.tx_by_tx_num(0)?, Some(block_tx1.clone()));
            assert_eq!(
                tx_reader.tx_num_by_txid(&TxId::from([1; 32]))?,
                Some(0),
            );
        }
        let tx2 = TxEntry {
            txid: TxId::from([2; 32]),
            data_pos: 200,
            undo_pos: 20,
            time_first_seen: 234567,
            is_coinbase: false,
        };
        let block_tx2 = BlockTx {
            entry: tx2.clone(),
            block_height: 1,
        };
        let tx3 = TxEntry {
            txid: TxId::from([3; 32]),
            data_pos: 300,
            undo_pos: 30,
            time_first_seen: 345678,
            is_coinbase: false,
        };
        let block_tx3 = BlockTx {
            entry: tx3.clone(),
            block_height: 1,
        };
        let block2 = BlockTxs {
            block_height: 1,
            txs: vec![tx2, tx3],
        };
        {
            // insert 2 more txs
            let mut batch = WriteBatch::default();
            assert_eq!(
                tx_writer.insert(&mut batch, &block2, &mut mem_data)?,
                1
            );
            db.write_batch(batch)?;
            assert_eq!(tx_reader.first_tx_num_by_block(0)?, Some(0));
            assert_eq!(tx_reader.first_tx_num_by_block(1)?, Some(1));
            assert_eq!(tx_reader.first_tx_num_by_block(2)?, None);
            assert_eq!(tx_reader.last_tx_num()?, Some(2));
            assert_eq!(tx_reader.block_tx_num_range(0)?, Some(0..1));
            assert_eq!(tx_reader.block_tx_num_range(1)?, Some(1..3));
            assert_eq!(tx_reader.tx_by_txid(&TxId::from([0; 32]))?, None);
            assert_eq!(tx_reader.tx_num_by_txid(&TxId::from([0; 32]))?, None);
            assert_eq!(
                tx_reader.tx_by_txid(&TxId::from([1; 32]))?,
                Some(block_tx1.clone()),
            );
            assert_eq!(
                tx_reader.tx_num_by_txid(&TxId::from([1; 32]))?,
                Some(0),
            );
            assert_eq!(tx_reader.tx_by_tx_num(0)?, Some(block_tx1.clone()));
            assert_eq!(
                tx_reader.tx_by_txid(&TxId::from([2; 32]))?,
                Some(block_tx2.clone()),
            );
            assert_eq!(
                tx_reader.tx_num_by_txid(&TxId::from([2; 32]))?,
                Some(1),
            );
            assert_eq!(tx_reader.tx_by_tx_num(1)?, Some(block_tx2));
            assert_eq!(
                tx_reader.tx_by_txid(&TxId::from([3; 32]))?,
                Some(block_tx3.clone()),
            );
            assert_eq!(
                tx_reader.tx_num_by_txid(&TxId::from([3; 32]))?,
                Some(2),
            );
            assert_eq!(tx_reader.tx_by_tx_num(2)?, Some(block_tx3));
        }
        {
            // delete latest block
            let mut batch = WriteBatch::default();
            assert_eq!(
                tx_writer.delete(&mut batch, &block2, &mut mem_data)?,
                1
            );
            db.write_batch(batch)?;
            assert_eq!(tx_reader.first_tx_num_by_block(0)?, Some(0));
            assert_eq!(tx_reader.first_tx_num_by_block(1)?, None);
            assert_eq!(tx_reader.last_tx_num()?, Some(0));
            assert_eq!(tx_reader.block_tx_num_range(0)?, Some(0..1));
            assert_eq!(tx_reader.block_tx_num_range(1)?, None);
            assert_eq!(tx_reader.tx_by_txid(&TxId::from([0; 32]))?, None);
            assert_eq!(
                tx_reader.tx_by_txid(&TxId::from([1; 32]))?,
                Some(block_tx1.clone()),
            );
            assert_eq!(tx_reader.tx_by_tx_num(0)?, Some(block_tx1.clone()));
            assert_eq!(tx_reader.tx_by_txid(&TxId::from([2; 32]))?, None);
            assert_eq!(tx_reader.tx_by_tx_num(1)?, None);
            assert_eq!(tx_reader.tx_by_txid(&TxId::from([3; 32]))?, None);
            assert_eq!(tx_reader.tx_by_tx_num(2)?, None);
        }
        let tx2 = TxEntry {
            txid: TxId::from([102; 32]),
            data_pos: 200,
            undo_pos: 20,
            time_first_seen: 234567,
            is_coinbase: false,
        };
        let block_tx2 = BlockTx {
            entry: tx2.clone(),
            block_height: 1,
        };
        let tx3 = TxEntry {
            txid: TxId::from([103; 32]),
            data_pos: 300,
            undo_pos: 30,
            time_first_seen: 345678,
            is_coinbase: false,
        };
        let block_tx3 = BlockTx {
            entry: tx3.clone(),
            block_height: 1,
        };
        let block3 = BlockTxs {
            block_height: 1,
            txs: vec![tx2, tx3],
        };
        {
            // Add reorg block
            let mut batch = WriteBatch::default();
            assert_eq!(
                tx_writer.insert(&mut batch, &block3, &mut mem_data)?,
                1
            );
            db.write_batch(batch)?;

            assert_eq!(tx_reader.first_tx_num_by_block(0)?, Some(0));
            assert_eq!(tx_reader.first_tx_num_by_block(1)?, Some(1));
            assert_eq!(tx_reader.first_tx_num_by_block(2)?, None);
            assert_eq!(tx_reader.block_tx_num_range(0)?, Some(0..1));
            assert_eq!(tx_reader.block_tx_num_range(1)?, Some(1..3));
            assert_eq!(tx_reader.block_tx_num_range(2)?, None);
            assert_eq!(
                tx_reader.tx_by_txid(&TxId::from([1; 32]))?,
                Some(block_tx1),
            );
            assert_eq!(tx_reader.tx_by_txid(&TxId::from([2; 32]))?, None);
            assert_eq!(
                tx_reader.tx_by_txid(&TxId::from([102; 32]))?,
                Some(block_tx2.clone()),
            );
            assert_eq!(
                tx_reader.tx_num_by_txid(&TxId::from([102; 32]))?,
                Some(1),
            );
            assert_eq!(tx_reader.tx_by_tx_num(1)?, Some(block_tx2));
            assert_eq!(
                tx_reader.tx_by_txid(&TxId::from([103; 32]))?,
                Some(block_tx3.clone()),
            );
            assert_eq!(
                tx_reader.tx_num_by_txid(&TxId::from([103; 32]))?,
                Some(2),
            );
            assert_eq!(tx_reader.tx_by_tx_num(2)?, Some(block_tx3));
        }
        Ok(())
    }
}
