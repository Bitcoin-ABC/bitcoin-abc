// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`QueryBlocks`], to query blocks.

use abc_rust_error::{Result, WrapErr};
use bitcoinsuite_core::{
    block::BlockHash,
    tx::{Tx, TxId},
};
use chronik_bridge::ffi;
use chronik_db::{
    db::Db,
    io::{
        BlockHeight, BlockReader, BlockStats, BlockStatsReader, DbBlock,
        SpentByReader, TxNum, TxReader,
    },
    mem::Mempool,
};
use chronik_proto::proto;
use thiserror::Error;

use crate::{
    avalanche::Avalanche,
    query::{make_tx_proto, HashOrHeight, OutputsSpent, TxTokenData},
};

const MAX_BLOCKS_PAGE_SIZE: usize = 500;

/// Smallest allowed page size
pub const MIN_BLOCK_TXS_PAGE_SIZE: usize = 1;
/// Largest allowed page size
pub const MAX_BLOCK_TXS_PAGE_SIZE: usize = 200;

/// Struct for querying blocks from the DB.
#[derive(Debug)]
pub struct QueryBlocks<'a> {
    /// Db.
    pub db: &'a Db,
    /// Avalanche.
    pub avalanche: &'a Avalanche,
    /// Mempool
    pub mempool: &'a Mempool,
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

    /// Block has no txs
    #[error("500: Inconsistent DB: Block {0} has no txs")]
    BlockHasNoTx(BlockHeight),

    /// Block has tx_num that doesn't exist
    #[error("500: Inconsistent DB: block {0} has missing tx_num {1}")]
    BlockHasMissingTx(BlockHash, TxNum),

    /// Can only request page sizes below a certain maximum.
    #[error(
        "400: Requested block tx page size {0} is too big, maximum is {}",
        MAX_BLOCK_TXS_PAGE_SIZE
    )]
    RequestPageSizeTooBig(usize),

    /// Can only request page sizes above a certain minimum.
    #[error(
        "400: Requested block tx page size {0} is too small, minimum is {}",
        MIN_BLOCK_TXS_PAGE_SIZE
    )]
    RequestPageSizeTooSmall(usize),

    /// Reading failed, likely corrupted block data
    #[error("500: Reading {0} failed")]
    ReadFailure(TxId),
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

    /// Query the txs of a block, paginated.
    pub fn block_txs(
        &self,
        hash_or_height: String,
        request_page_num: usize,
        request_page_size: usize,
    ) -> Result<proto::TxHistoryPage> {
        if request_page_size < MIN_BLOCK_TXS_PAGE_SIZE {
            return Err(RequestPageSizeTooSmall(request_page_size).into());
        }
        if request_page_size > MAX_BLOCK_TXS_PAGE_SIZE {
            return Err(RequestPageSizeTooBig(request_page_size).into());
        }
        let block_reader = BlockReader::new(self.db)?;
        let tx_reader = TxReader::new(self.db)?;
        let spent_by_reader = SpentByReader::new(self.db)?;
        let db_block = match hash_or_height.parse::<HashOrHeight>()? {
            HashOrHeight::Hash(hash) => block_reader.by_hash(&hash)?,
            HashOrHeight::Height(height) => block_reader.by_height(height)?,
        };
        let db_block = db_block.ok_or(BlockNotFound(hash_or_height))?;
        let tx_range = tx_reader
            .block_tx_num_range(db_block.height)?
            .ok_or(BlockHasNoTx(db_block.height))?;
        let tx_offset =
            request_page_num.saturating_mul(request_page_size) as u64;
        let page_tx_num_start =
            tx_range.start.saturating_add(tx_offset).min(tx_range.end);
        let page_tx_num_end = page_tx_num_start
            .saturating_add(request_page_size as u64)
            .min(tx_range.end);
        let num_page_txs = (page_tx_num_end - page_tx_num_start) as usize;
        let mut txs = Vec::with_capacity(num_page_txs);
        for tx_num in page_tx_num_start..page_tx_num_end {
            let db_tx = tx_reader
                .tx_by_tx_num(tx_num)?
                .ok_or(BlockHasMissingTx(db_block.hash.clone(), tx_num))?;
            let tx = Tx::from(
                ffi::load_tx(
                    db_block.file_num,
                    db_tx.entry.data_pos,
                    db_tx.entry.undo_pos,
                )
                .wrap_err(ReadFailure(db_tx.entry.txid))?,
            );
            let outputs_spent = OutputsSpent::query(
                &spent_by_reader,
                &tx_reader,
                self.mempool.spent_by().outputs_spent(&db_tx.entry.txid),
                tx_num,
            )?;
            txs.push(make_tx_proto(
                &tx,
                &outputs_spent,
                db_tx.entry.time_first_seen,
                db_tx.entry.is_coinbase,
                Some(&db_block),
                self.avalanche,
                TxTokenData::from_db(self.db, tx_num, &tx)?.as_ref(),
            ));
        }
        let total_num_txs = (tx_range.end - tx_range.start) as usize;
        let total_num_pages =
            (total_num_txs + request_page_size - 1) / request_page_size;
        Ok(proto::TxHistoryPage {
            txs,
            num_pages: total_num_pages as u32,
            num_txs: total_num_txs as u32,
        })
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
