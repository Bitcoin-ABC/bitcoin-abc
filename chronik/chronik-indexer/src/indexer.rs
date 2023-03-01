// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`ChronikIndexer`] to index blocks and txs.

use std::path::PathBuf;

use abc_rust_error::{Result, WrapErr};
use chronik_db::{
    db::{Db, WriteBatch},
    io::{BlockReader, BlockWriter, DbBlock},
};
use chronik_util::log_chronik;
use thiserror::Error;

/// Params for setting up a [`ChronikIndexer`] instance.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct ChronikIndexerParams {
    /// Folder where the node stores its data, net-dependent.
    pub datadir_net: PathBuf,
}

/// Struct for indexing blocks and txs. Maintains db handles and mempool.
#[derive(Debug)]
pub struct ChronikIndexer {
    db: Db,
}

/// Block to be indexed by Chronik.
#[derive(Clone, Debug, Default, Eq, Hash, PartialEq)]
pub struct ChronikBlock {
    /// Data about the block (w/o txs)
    pub db_block: DbBlock,
}

/// Errors for [`BlockWriter`] and [`BlockReader`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum ChronikIndexerError {
    /// Failed creating the folder for the indexes
    #[error("Failed creating path {0}")]
    CreateIndexesDirFailed(PathBuf),
}

use self::ChronikIndexerError::*;

impl ChronikIndexer {
    /// Setup the indexer with the given parameters, e.g. open the DB etc.
    pub fn setup(params: ChronikIndexerParams) -> Result<Self> {
        let indexes_path = params.datadir_net.join("indexes");
        if !indexes_path.exists() {
            std::fs::create_dir(&indexes_path).wrap_err_with(|| {
                CreateIndexesDirFailed(indexes_path.clone())
            })?;
        }
        let db_path = indexes_path.join("chronik");
        log_chronik!("Opening Chronik at {}\n", db_path.to_string_lossy());
        let db = Db::open(&db_path)?;
        Ok(ChronikIndexer { db })
    }

    /// Add the block to the index.
    pub fn handle_block_connected(
        &mut self,
        block: ChronikBlock,
    ) -> Result<()> {
        let mut batch = WriteBatch::default();
        let block_writer = BlockWriter::new(&self.db)?;
        block_writer.insert(&mut batch, &block.db_block)?;
        self.db.write_batch(batch)?;
        Ok(())
    }

    /// Remove the block from the index.
    pub fn handle_block_disconnected(
        &mut self,
        block: ChronikBlock,
    ) -> Result<()> {
        let mut batch = WriteBatch::default();
        let block_writer = BlockWriter::new(&self.db)?;
        block_writer.delete_by_height(&mut batch, block.db_block.height)?;
        self.db.write_batch(batch)?;
        Ok(())
    }

    /// Return [`BlockReader`] to read blocks from the DB.
    pub fn blocks(&self) -> Result<BlockReader<'_>> {
        BlockReader::new(&self.db)
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use bitcoinsuite_core::block::BlockHash;
    use chronik_db::io::{BlockReader, DbBlock};
    use pretty_assertions::assert_eq;

    use crate::indexer::{
        ChronikBlock, ChronikIndexer, ChronikIndexerError, ChronikIndexerParams,
    };

    #[test]
    fn test_indexer() -> Result<()> {
        let tempdir = tempdir::TempDir::new("chronik-indexer--indexer")?;
        let datadir_net = tempdir.path().join("regtest");
        let params = ChronikIndexerParams {
            datadir_net: datadir_net.clone(),
        };
        // regtest folder doesn't exist yet -> error
        assert_eq!(
            ChronikIndexer::setup(params.clone())
                .unwrap_err()
                .downcast::<ChronikIndexerError>()?,
            ChronikIndexerError::CreateIndexesDirFailed(
                datadir_net.join("indexes"),
            ),
        );

        // create regtest folder, setup will work now
        std::fs::create_dir(&datadir_net)?;
        let mut indexer = ChronikIndexer::setup(params)?;
        // indexes and indexes/chronik folder now exist
        assert!(datadir_net.join("indexes").exists());
        assert!(datadir_net.join("indexes").join("chronik").exists());

        // DB is empty
        assert_eq!(BlockReader::new(&indexer.db)?.by_height(0)?, None);
        let block = ChronikBlock {
            db_block: DbBlock {
                hash: BlockHash::from([4; 32]),
                prev_hash: BlockHash::from([0; 32]),
                height: 0,
                n_bits: 0x1deadbef,
                timestamp: 1234567890,
                file_num: 0,
                data_pos: 1337,
            },
        };

        // Add block
        indexer.handle_block_connected(block.clone())?;
        assert_eq!(
            BlockReader::new(&indexer.db)?.by_height(0)?,
            Some(block.db_block.clone())
        );

        // Remove block again
        indexer.handle_block_disconnected(block)?;
        assert_eq!(BlockReader::new(&indexer.db)?.by_height(0)?, None);

        Ok(())
    }
}
