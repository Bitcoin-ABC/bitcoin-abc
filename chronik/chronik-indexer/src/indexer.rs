// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`ChronikIndexer`] to index blocks and txs.

use std::path::PathBuf;

use abc_rust_error::{Result, WrapErr};
use bitcoinsuite_core::block::BlockHash;
use chronik_bridge::{ffi, util::expect_unique_ptr};
use chronik_db::{
    db::{Db, WriteBatch},
    io::{BlockHeight, BlockReader, BlockWriter, DbBlock},
};
use chronik_util::{log, log_chronik};
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

    /// Cannot rewind blocks that bitcoind doesn't have
    #[error(
        "Cannot rewind Chronik, it contains block {0} that the node doesn't \
         have. You may need to -reindex, or delete indexes/chronik and restart"
    )]
    CannotRewindChronik(BlockHash),

    /// Lower block doesn't exist but higher block does
    #[error(
        "Inconsistent DB: Block {missing} doesn't exist, but {exists} does"
    )]
    BlocksBelowMissing {
        /// Lower height that is missing
        missing: BlockHeight,
        /// Higher height that exists
        exists: BlockHeight,
    },
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

    /// Resync Chronik index to the node
    pub fn resync_indexer(
        &mut self,
        bridge: &ffi::ChronikBridge,
    ) -> Result<()> {
        let indexer_tip = self.blocks()?.tip()?;
        let Ok(node_tip_index) = bridge.get_chain_tip() else {
            if let Some(indexer_tip) = &indexer_tip {
                return Err(
                    CannotRewindChronik(indexer_tip.hash.clone()).into()
                );
            }
            return Ok(());
        };
        let node_tip_info = ffi::get_block_info(node_tip_index);
        let node_height = node_tip_info.height;
        let node_tip_hash = BlockHash::from(node_tip_info.hash);
        let fork_height = match indexer_tip {
            Some(tip) => {
                let indexer_tip_hash = tip.hash.clone();
                let indexer_height = tip.height;
                log!(
                    "Node and Chronik diverged, node is on block \
                     {node_tip_hash} at height {node_height}, and Chronik is \
                     on block {indexer_tip_hash} at height {indexer_height}.\n"
                );
                let indexer_tip_index = bridge
                    .lookup_block_index(tip.hash.to_bytes())
                    .map_err(|_| CannotRewindChronik(tip.hash.clone()))?;
                self.rewind_indexer(bridge, indexer_tip_index, &tip)?
            }
            None => {
                log!(
                    "Chronik database empty, syncing to block {node_tip_hash} \
                     at height {node_height}.\n"
                );
                -1
            }
        };
        let tip_height = node_tip_info.height;
        for height in fork_height + 1..=tip_height {
            let block_index = ffi::get_block_ancestor(node_tip_index, height)?;
            let ffi_block = bridge.load_block(block_index)?;
            let ffi_block = expect_unique_ptr("load_block", &ffi_block);
            let block = make_chronik_block(ffi_block, block_index);
            let hash = block.db_block.hash.clone();
            self.handle_block_connected(block)?;
            log_chronik!(
                "Added block {hash}, height {height}/{tip_height} to Chronik\n"
            );
            if height % 100 == 0 {
                log!(
                    "Synced Chronik up to block {hash} at height \
                     {height}/{tip_height}\n"
                );
            }
        }
        log!(
            "Chronik completed re-syncing with the node, both are now at \
             block {node_tip_hash} at height {node_height}.\n"
        );
        Ok(())
    }

    fn rewind_indexer(
        &mut self,
        bridge: &ffi::ChronikBridge,
        indexer_tip_index: &ffi::CBlockIndex,
        indexer_db_tip: &DbBlock,
    ) -> Result<BlockHeight> {
        let indexer_height = indexer_db_tip.height;
        let fork_block_index = bridge
            .find_fork(indexer_tip_index)
            .map_err(|_| CannotRewindChronik(indexer_db_tip.hash.clone()))?;
        let fork_info = ffi::get_block_info(fork_block_index);
        let fork_block_hash = BlockHash::from(fork_info.hash);
        let fork_height = fork_info.height;
        let revert_height = fork_height + 1;
        log!(
            "The last common block is {fork_block_hash} at height \
             {fork_height}.\n"
        );
        log!("Reverting Chronik blocks {revert_height} to {indexer_height}.\n");
        for height in (revert_height..indexer_height).rev() {
            let db_block = self.blocks()?.by_height(height)?.ok_or(
                BlocksBelowMissing {
                    missing: height,
                    exists: indexer_height,
                },
            )?;
            let block_index = bridge
                .lookup_block_index(db_block.hash.to_bytes())
                .map_err(|_| CannotRewindChronik(db_block.hash))?;
            let ffi_block = bridge.load_block(block_index)?;
            let ffi_block = expect_unique_ptr("load_block", &ffi_block);
            let block = make_chronik_block(ffi_block, block_index);
            self.handle_block_disconnected(block)?;
        }
        Ok(fork_info.height)
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

/// Build the ChronikBlock from the CBlockIndex
pub fn make_chronik_block(
    block: &ffi::CBlock,
    bindex: &ffi::CBlockIndex,
) -> ChronikBlock {
    let block = ffi::bridge_block(block, bindex);
    let db_block = DbBlock {
        hash: BlockHash::from(block.hash),
        prev_hash: BlockHash::from(block.prev_hash),
        height: block.height,
        n_bits: block.n_bits,
        timestamp: block.timestamp,
        file_num: block.file_num,
        data_pos: block.data_pos,
    };
    ChronikBlock { db_block }
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
