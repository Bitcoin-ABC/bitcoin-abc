// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`QueryBlocks`], to query blocks.

use abc_rust_error::Result;
use chronik_db::{
    db::Db,
    io::{BlockHeight, BlockReader, BlockStats, BlockStatsReader, DbBlock},
};
use chronik_proto::proto;
use thiserror::Error;

use crate::{avalanche::Avalanche, query::HashOrHeight};

const MAX_BLOCKS_PAGE_SIZE: usize = 500;

/// Struct for querying blocks from the DB.
#[derive(Debug)]
pub struct QueryBlocks<'a> {
    /// Db.
    pub db: &'a Db,
    /// Avalanche.
    pub avalanche: &'a Avalanche,
}

/// Errors indicating something went wrong with querying blocks.
#[derive(Debug, Error, PartialEq)]
pub enum QueryBlockError {
    /// Block not found in DB
    #[error("404: Block not found: {0}")]
    BlockNotFound(String),

    /// Invalid block start height
    #[error("400: Invalid block start height: {0}")]
    InvalidStartHeight(BlockHeight),

    /// Invalid block end height
    #[error("400: Invalid block end height: {0}")]
    InvalidEndHeight(BlockHeight),

    /// Blocks page size too large
    #[error(
        "400: Blocks page size too large, may not be above {} but got {0}",
        MAX_BLOCKS_PAGE_SIZE
    )]
    BlocksPageSizeTooLarge(usize),

    /// DB is missing block stats
    #[error("500: Inconsistent DB: Missing block stats for height {0}")]
    MissingBlockStats(BlockHeight),
}

use self::QueryBlockError::*;

impl<'a> QueryBlocks<'a> {
    /// Query a block by hash or height from DB.
    ///
    /// `height` may not have any leading zeros, because otherwise it might
    /// become ambiguous with a hash.
    pub fn by_hash_or_height(
        &self,
        hash_or_height: String,
    ) -> Result<proto::Block> {
        let db_blocks = BlockReader::new(self.db)?;
        let block_stats_reader = BlockStatsReader::new(self.db)?;
        let db_block = match hash_or_height.parse::<HashOrHeight>()? {
            HashOrHeight::Hash(hash) => db_blocks.by_hash(&hash)?,
            HashOrHeight::Height(height) => db_blocks.by_height(height)?,
        };
        let db_block = db_block.ok_or(BlockNotFound(hash_or_height))?;
        let block_stats = block_stats_reader
            .by_height(db_block.height)?
            .ok_or(MissingBlockStats(db_block.height))?;
        Ok(proto::Block {
            block_info: Some(
                self.make_block_info_proto(&db_block, &block_stats),
            ),
        })
    }

    /// Query blocks by a range of heights. Start and end height are inclusive.
    pub fn by_range(
        &self,
        start_height: BlockHeight,
        end_height: BlockHeight,
    ) -> Result<proto::Blocks> {
        if start_height < 0 {
            return Err(InvalidStartHeight(start_height).into());
        }
        if end_height < start_height {
            return Err(InvalidEndHeight(end_height).into());
        }
        let num_blocks = end_height as usize - start_height as usize + 1;
        if num_blocks > MAX_BLOCKS_PAGE_SIZE {
            return Err(BlocksPageSizeTooLarge(num_blocks).into());
        }
        let block_reader = BlockReader::new(self.db)?;
        let block_stats_reader = BlockStatsReader::new(self.db)?;
        let mut blocks = Vec::with_capacity(num_blocks);
        for block_height in start_height..=end_height {
            let block = block_reader.by_height(block_height)?;
            let block = match block {
                Some(block) => block,
                None => break,
            };
            let block_stats = block_stats_reader
                .by_height(block_height)?
                .ok_or(MissingBlockStats(block_height))?;
            blocks.push(self.make_block_info_proto(&block, &block_stats));
        }
        Ok(proto::Blocks { blocks })
    }

    /// Query some info about the blockchain, e.g. the tip hash and height.
    pub fn blockchain_info(&self) -> Result<proto::BlockchainInfo> {
        let block_reader = BlockReader::new(self.db)?;
        match block_reader.tip()? {
            Some(block) => Ok(proto::BlockchainInfo {
                tip_hash: block.hash.to_vec(),
                tip_height: block.height,
            }),
            None => Ok(proto::BlockchainInfo {
                tip_hash: vec![0; 32],
                tip_height: -1,
            }),
        }
    }

    fn make_block_info_proto(
        &self,
        db_block: &DbBlock,
        block_stats: &BlockStats,
    ) -> proto::BlockInfo {
        proto::BlockInfo {
            hash: db_block.hash.to_vec(),
            prev_hash: db_block.prev_hash.to_vec(),
            height: db_block.height,
            n_bits: db_block.n_bits,
            timestamp: db_block.timestamp,
            is_final: self.avalanche.is_final_height(db_block.height),
            block_size: block_stats.block_size,
            num_txs: block_stats.num_txs,
            num_inputs: block_stats.num_inputs,
            num_outputs: block_stats.num_outputs,
            sum_input_sats: block_stats.sum_input_sats,
            sum_coinbase_output_sats: block_stats.sum_coinbase_output_sats,
            sum_normal_output_sats: block_stats.sum_normal_output_sats,
            sum_burned_sats: block_stats.sum_burned_sats,
        }
    }
}
