// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`Subs`].

use bitcoinsuite_core::block::BlockHash;
use chronik_db::io::BlockHeight;
use chronik_util::log;
use tokio::sync::broadcast;

/// Block update message.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BlockMsg {
    /// What happened with the block.
    pub msg_type: BlockMsgType,
    /// Hash of the block which we got an update for.
    pub hash: BlockHash,
    /// Height of the block which we got an update for.
    pub height: BlockHeight,
}

/// Type of message for the block.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum BlockMsgType {
    /// Block connected to the blockchain
    Connected,
    /// Block disconnected from the blockchain
    Disconnected,
    /// Block has been finalized by Avalanche
    Finalized,
}

const BLOCK_CHANNEL_CAPACITY: usize = 16;

/// Struct for managing subscriptions to e.g. block updates.
#[derive(Debug, Clone)]
pub struct Subs {
    subs_block: broadcast::Sender<BlockMsg>,
}

impl Subs {
    /// Add a subscriber to block messages.
    pub fn sub_to_block_msgs(&self) -> broadcast::Receiver<BlockMsg> {
        self.subs_block.subscribe()
    }

    pub(crate) fn broadcast_block_msg(&self, msg: BlockMsg) {
        if self.subs_block.receiver_count() > 0 {
            if let Err(err) = self.subs_block.send(msg) {
                log!("Unexpected send error: {}\n", err);
            }
        }
    }
}

impl Default for Subs {
    fn default() -> Self {
        Subs {
            subs_block: broadcast::channel(BLOCK_CHANNEL_CAPACITY).0,
        }
    }
}
