// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`Db`] and errors, which encapsulates a database.
//! Read and write operations should exclusively be done with dedicated writers
//! and readers, such as [`crate::io::BlockWriter`].

use std::path::Path;

use abc_rust_error::Result;
pub use rocksdb::WriteBatch;
use rocksdb::{ColumnFamilyDescriptor, IteratorMode};
use thiserror::Error;

use crate::io::{BlockWriter, MetadataWriter};

// All column family names used by Chronik should be defined here
/// Column family name for the block data.
pub const CF_BLK: &str = "blk";
/// Column family to lookup a block by its hash.
pub const CF_LOOKUP_BLK_BY_HASH: &str = "lookup_blk_by_hash";
/// Column family name for db metadata.
pub const CF_META: &str = "meta";

pub(crate) type CF = rocksdb::ColumnFamily;

/// Indexer database.
/// Owns the underlying [`rocksdb::DB`] instance.
#[derive(Debug)]
pub struct Db {
    db: rocksdb::DB,
    cf_names: Vec<String>,
}

/// Errors indicating something went wrong with the database itself.
#[derive(Debug, Error)]
pub enum DbError {
    /// Column family requested but not defined during `Db::open`.
    #[error("Column family {0} doesn't exist")]
    NoSuchColumnFamily(String),

    /// Error with RocksDB itself, e.g. db inconsistency.
    #[error("RocksDB error: {0}")]
    RocksDb(rocksdb::Error),
}

use self::DbError::*;

impl Db {
    /// Opens the database under the specified path.
    /// Creates the database file and necessary column families if necessary.
    pub fn open(path: impl AsRef<Path>) -> Result<Self> {
        let mut cfs = Vec::new();
        BlockWriter::add_cfs(&mut cfs);
        MetadataWriter::add_cfs(&mut cfs);
        Self::open_with_cfs(path, cfs)
    }

    pub(crate) fn open_with_cfs(
        path: impl AsRef<Path>,
        cfs: Vec<ColumnFamilyDescriptor>,
    ) -> Result<Self> {
        let db_options = Self::db_options();
        let cf_names = cfs.iter().map(|cf| cf.name().to_string()).collect();
        let db = rocksdb::DB::open_cf_descriptors(&db_options, path, cfs)
            .map_err(RocksDb)?;
        Ok(Db { db, cf_names })
    }

    fn db_options() -> rocksdb::Options {
        let mut db_options = rocksdb::Options::default();
        db_options.create_if_missing(true);
        db_options.create_missing_column_families(true);
        db_options
    }

    /// Destroy the DB, i.e. delete all it's associated files.
    ///
    /// According to the RocksDB docs, this differs from removing the dir:
    /// DestroyDB() will take care of the case where the RocksDB database is
    /// stored in multiple directories. For instance, a single DB can be
    /// configured to store its data in multiple directories by specifying
    /// different paths to DBOptions::db_paths, DBOptions::db_log_dir, and
    /// DBOptions::wal_dir.
    pub fn destroy(path: impl AsRef<Path>) -> Result<()> {
        let db_options = Self::db_options();
        rocksdb::DB::destroy(&db_options, path).map_err(RocksDb)?;
        Ok(())
    }

    /// Return a column family handle with the given name.
    pub fn cf(&self, name: &str) -> Result<&CF> {
        Ok(self
            .db
            .cf_handle(name)
            .ok_or_else(|| NoSuchColumnFamily(name.to_string()))?)
    }

    pub(crate) fn get(
        &self,
        cf: &CF,
        key: impl AsRef<[u8]>,
    ) -> Result<Option<rocksdb::DBPinnableSlice<'_>>> {
        Ok(self.db.get_pinned_cf(cf, key).map_err(RocksDb)?)
    }

    pub(crate) fn iterator_end(
        &self,
        cf: &CF,
    ) -> impl Iterator<Item = Result<(Box<[u8]>, Box<[u8]>)>> + '_ {
        self.db
            .iterator_cf(cf, IteratorMode::End)
            .map(|result| Ok(result.map_err(RocksDb)?))
    }

    /// Writes the batch to the Db atomically.
    pub fn write_batch(&self, write_batch: WriteBatch) -> Result<()> {
        self.db.write(write_batch).map_err(RocksDb)?;
        Ok(())
    }

    /// Whether any of the column families in the DB have any data.
    ///
    /// Note: RocksDB forbids not opening all column families, therefore, this
    /// will always iter through all column families.
    pub fn is_db_empty(&self) -> Result<bool> {
        for cf_name in &self.cf_names {
            let cf = self.cf(cf_name)?;
            let mut cf_iter = self.db.full_iterator_cf(cf, IteratorMode::Start);
            if cf_iter.next().is_some() {
                return Ok(false);
            }
        }
        Ok(true)
    }
}
