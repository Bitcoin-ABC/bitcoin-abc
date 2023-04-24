// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`Avalanche`].

use abc_rust_error::Result;
use chronik_db::io::BlockHeight;
use thiserror::Error;

/// Struct containing the indexer's Avalanche state.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Avalanche {
    /// Height of the highest finalized block. Default: -1
    pub height: BlockHeight,
}

/// Errors for [`Avalanche`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum AvalancheError {
    /// Avalanche height in DB is higher than the next finalized height
    #[error(
        "Inconsistent DB: Decreasing finalized height: indexer \
         {indexer_height} > finalized {next_height}"
    )]
    DecreasingFinalizedHeight {
        /// Finalized height of the indexer
        indexer_height: BlockHeight,
        /// Next height from Avalanche
        next_height: BlockHeight,
    },

    /// Disconnected a block that's below the last finalized height, see
    /// [`Avalanche::disconnect_block`].
    #[error(
        "Inconsistent DB: Disconnected block {disconnected_height} that's not \
         the last finalized block in the indexer {indexer_height}"
    )]
    DisconnectBelowLastFinalizedHeight {
        /// Finalized height of the indexer
        indexer_height: BlockHeight,
        /// Height of the disconnected block (below the finalized height)
        disconnected_height: BlockHeight,
    },
}

use self::AvalancheError::*;

impl Default for Avalanche {
    fn default() -> Self {
        Avalanche { height: -1 }
    }
}

impl Avalanche {
    /// Mark the block height as the highest finalized height in the indexer.
    pub fn finalize_block(&mut self, height: BlockHeight) -> Result<()> {
        if self.height > height {
            return Err(DecreasingFinalizedHeight {
                indexer_height: self.height,
                next_height: height,
            }
            .into());
        }
        self.height = height;
        Ok(())
    }

    /// Disconnect the block, may decrease the highest finalized height in the
    /// indexer.
    ///
    /// We assume that the disconnected block either:
    /// - was not finalized (so disconnected height > last finalized height)
    /// - was the last finalized block (so we decrement the last finalized
    ///   height)
    ///
    /// If the disconnected block is below the last finalized height, the
    /// indexer somehow got out of sync with the node, and we abort.
    pub fn disconnect_block(&mut self, height: BlockHeight) -> Result<()> {
        if height < self.height {
            return Err(DisconnectBelowLastFinalizedHeight {
                indexer_height: self.height,
                disconnected_height: height,
            }
            .into());
        }
        if self.height == height {
            self.height -= 1;
        }
        Ok(())
    }

    /// Return whether the given block height has been finalized by Avalanche.
    pub fn is_final_height(&self, block_height: BlockHeight) -> bool {
        block_height <= self.height
    }
}
