// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`QueryBlocks`], to query blocks.

use abc_rust_error::Result;
use bitcoinsuite_core::block::BlockHash;
use chronik_db::{
    db::Db,
    io::{BlockHeight, BlockReader},
};
use chronik_proto::proto;
use thiserror::Error;

use crate::avalanche::Avalanche;

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
    /// Query is neither a hex hash nor an integer string
    #[error("400: Not a hash or height: {0}")]
    NotHashOrHeight(String),

    /// Block not found in DB
    #[error("404: Block not found: {0}")]
    BlockNotFound(String),
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
        let db_block = if let Ok(hash) = hash_or_height.parse::<BlockHash>() {
            db_blocks.by_hash(&hash)?
        } else {
            let height = match hash_or_height.parse::<BlockHeight>() {
                // disallow leading zeros
                Ok(0) if hash_or_height.len() == 1 => 0,
                Ok(height) if !hash_or_height.starts_with('0') => height,
                _ => return Err(NotHashOrHeight(hash_or_height).into()),
            };
            db_blocks.by_height(height)?
        };
        let db_block = db_block.ok_or(BlockNotFound(hash_or_height))?;
        Ok(proto::Block {
            block_info: Some(proto::BlockInfo {
                hash: db_block.hash.to_vec(),
                prev_hash: db_block.prev_hash.to_vec(),
                height: db_block.height,
                n_bits: db_block.n_bits,
                timestamp: db_block.timestamp,
                is_final: db_block.height <= self.avalanche.height,
            }),
        })
    }
}
