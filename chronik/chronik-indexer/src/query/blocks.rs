// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`QueryBlocks`], to query blocks.

use abc_rust_error::{Result, WrapErr};
use bitcoinsuite_core::{
    block::BlockHash,
    hash::{Hashed, Sha256d},
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
use chronik_plugin::data::PluginNameMap;
use chronik_proto::proto;
use thiserror::Error;
use tokio::sync::Mutex;

use crate::{
    avalanche::Avalanche,
    indexer::Node,
    merkle::MerkleTree,
    query::{
        make_tx_proto, read_plugin_outputs, HashOrHeight, MakeTxProtoParams,
        OutputsSpent, TxTokenData,
    },
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
    /// Access to bitcoind to read txs
    pub node: &'a Node,
    /// Whether the SLP/ALP token index is enabled
    pub is_token_index_enabled: bool,
    /// Map plugin name <-> plugin idx of all loaded plugins
    pub plugin_name_map: &'a PluginNameMap,
    /// Cached block merkle tree
    pub block_merkle_tree: &'a Mutex<MerkleTree>,
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

    /// Invalid checkpoint height
    #[error(
        "400: Invalid checkpoint height {0}, may not be below queried header \
         height {1}"
    )]
    InvalidCheckpointHeight(BlockHeight, BlockHeight),

    /// Blocks page size too large
    #[error(
        "400: Blocks page size too large, \
         may not be above {max_blocks_page_size} but got {0}",
        max_blocks_page_size = MAX_BLOCKS_PAGE_SIZE,
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
        "400: Requested block tx page size {0} is too big, \
         maximum is {max_block_txs_page_size}",
        max_block_txs_page_size = MAX_BLOCK_TXS_PAGE_SIZE,
    )]
    RequestPageSizeTooBig(usize),

    /// Can only request page sizes above a certain minimum.
    #[error(
        "400: Requested block tx page size {0} is too small, \
         minimum is {min_block_txs_page_size}",
        min_block_txs_page_size = MIN_BLOCK_TXS_PAGE_SIZE,
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

    /// Check that the start and end heights are consistent for a range of
    /// blocks, and return the number of blocks.
    fn check_range_boundaries(
        start_height: BlockHeight,
        end_height: BlockHeight,
    ) -> Result<usize> {
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
        Ok(num_blocks)
    }

    /// Check that the block height and checkpoint height are consistent.
    fn check_checkpoint_height(
        block_height: BlockHeight,
        checkpoint_height: BlockHeight,
    ) -> Result<(), QueryBlockError> {
        if block_height > checkpoint_height {
            return Err(InvalidCheckpointHeight(
                checkpoint_height,
                block_height,
            ));
        }
        Ok(())
    }

    /// Query blocks by a range of heights. Start and end height are inclusive.
    pub fn by_range(
        &self,
        start_height: BlockHeight,
        end_height: BlockHeight,
    ) -> Result<proto::Blocks> {
        let num_blocks =
            Self::check_range_boundaries(start_height, end_height)?;
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
                self.node
                    .bridge
                    .load_tx(
                        db_block.file_num,
                        db_tx.entry.data_pos,
                        db_tx.entry.undo_pos,
                    )
                    .wrap_err(ReadFailure(db_tx.entry.txid))?,
            );
            let is_final_preconsensus =
                self.node.bridge.is_avalanche_finalized_preconsensus(
                    db_tx.entry.txid.as_bytes(),
                );
            let outputs_spent = OutputsSpent::query(
                &spent_by_reader,
                &tx_reader,
                self.mempool.spent_by().outputs_spent(&db_tx.entry.txid),
                tx_num,
            )?;
            let token = TxTokenData::from_db(
                self.db,
                tx_num,
                &tx,
                self.is_token_index_enabled,
            )?;
            let plugin_outputs = read_plugin_outputs(
                self.db,
                self.mempool,
                &tx,
                Some(tx_num),
                !self.plugin_name_map.is_empty(),
            )?;
            txs.push(make_tx_proto(MakeTxProtoParams {
                tx: &tx,
                outputs_spent: &outputs_spent,
                time_first_seen: db_tx.entry.time_first_seen,
                is_coinbase: db_tx.entry.is_coinbase,
                block: Some(&db_block),
                avalanche: self.avalanche,
                token: token.as_ref(),
                plugin_outputs: &plugin_outputs,
                plugin_name_map: self.plugin_name_map,
                is_final_preconsensus,
            }));
        }
        let total_num_txs = (tx_range.end - tx_range.start) as usize;
        let total_num_pages = total_num_txs.div_ceil(request_page_size);
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

    /// Query a block header. Optional checkpoint data is computed and
    /// included in the result if checkpoint_height > 0.
    pub async fn header(
        &self,
        hash_or_height: String,
        checkpoint_height: i32,
    ) -> Result<proto::BlockHeader> {
        let bridge = &self.node.bridge;
        let block_index = match hash_or_height.parse::<HashOrHeight>()? {
            HashOrHeight::Hash(hash) => {
                bridge.lookup_block_index(hash.to_bytes())
            }
            HashOrHeight::Height(height) => {
                bridge.lookup_block_index_by_height(height)
            }
        };
        let block_index =
            block_index.map_err(|_| BlockNotFound(hash_or_height))?;
        let block_height = ffi::get_block_info(block_index).height;
        let (root, branch) = self
            .merkle_root_and_branch(block_height, checkpoint_height)
            .await?;
        Ok(proto::BlockHeader {
            raw_header: ffi::get_block_header(block_index).to_vec(),
            root,
            branch,
        })
    }

    async fn merkle_root_and_branch(
        &self,
        block_height: BlockHeight,
        checkpoint_height: BlockHeight,
    ) -> Result<(Vec<u8>, Vec<Vec<u8>>)> {
        let mut root = Vec::<u8>::new();
        let mut branch = Vec::<Vec<u8>>::new();
        if checkpoint_height > 0 {
            Self::check_checkpoint_height(block_height, checkpoint_height)?;
            let bridge = &self.node.bridge;
            let hashes: Vec<Sha256d> = bridge
                .get_block_hashes_by_range(0, checkpoint_height)?
                .iter()
                .map(|raw_hash| Sha256d::from_le_bytes(raw_hash.data))
                .collect();
            let mut block_merkle_tree = self.block_merkle_tree.lock().await;
            let (root_hash, branch_hashes) = block_merkle_tree
                .merkle_root_and_branch(&hashes, block_height as usize);
            root = root_hash.to_le_bytes().to_vec();
            branch = branch_hashes
                .iter()
                .map(|&hash| hash.to_le_bytes().to_vec())
                .collect();
        }
        Ok((root, branch))
    }

    /// Query headers by a range of heights. Start and end height are inclusive.
    /// Optional checkpoint data is computed and included with the last header
    /// if checkpoint_height > 0.
    pub async fn headers_by_range(
        &self,
        start_height: BlockHeight,
        end_height: BlockHeight,
        checkpoint_height: i32,
    ) -> Result<proto::BlockHeaders> {
        Self::check_range_boundaries(start_height, end_height)?;
        let (root, branch) = self
            .merkle_root_and_branch(end_height, checkpoint_height)
            .await?;
        let headers = self
            .node
            .bridge
            .get_block_headers_by_range(start_height, end_height)?;
        let last_header = headers.last();
        let mut headers: Vec<_> = headers
            .iter()
            .take(headers.len() - 1)
            .map(|h| proto::BlockHeader {
                raw_header: h.data.to_vec(),
                root: Vec::<u8>::new(),
                branch: Vec::<Vec<u8>>::new(),
            })
            .collect();
        if let Some(h) = last_header {
            headers.push(proto::BlockHeader {
                raw_header: h.data.to_vec(),
                root,
                branch,
            });
        }

        Ok(proto::BlockHeaders { headers })
    }
}
