// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`Subs`].

use bitcoinsuite_core::{block::BlockHash, tx::Tx};
use chronik_db::{
    groups::{LokadIdGroup, ScriptGroup, TokenIdGroup, TokenIdGroupAux},
    io::BlockHeight,
};
use chronik_util::log;
use tokio::sync::broadcast;

use crate::subs_group::{SubsGroup, TxMsgType};

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
#[derive(Debug)]
pub struct Subs {
    subs_block: broadcast::Sender<BlockMsg>,
    subs_script: SubsGroup<ScriptGroup>,
    subs_token_id: SubsGroup<TokenIdGroup>,
    subs_lokad_id: SubsGroup<LokadIdGroup>,
}

impl Subs {
    /// Create a new [`Subs`].
    pub fn new(script_group: ScriptGroup) -> Self {
        Subs {
            subs_block: broadcast::channel(BLOCK_CHANNEL_CAPACITY).0,
            subs_script: SubsGroup::new(script_group),
            subs_token_id: SubsGroup::new(TokenIdGroup),
            subs_lokad_id: SubsGroup::new(LokadIdGroup),
        }
    }

    /// Add a subscriber to block messages.
    pub fn sub_to_block_msgs(&self) -> broadcast::Receiver<BlockMsg> {
        self.subs_block.subscribe()
    }

    /// Mutable reference to the script subscribers.
    pub fn subs_script_mut(&mut self) -> &mut SubsGroup<ScriptGroup> {
        &mut self.subs_script
    }

    /// Mutable reference to the token ID subscribers.
    pub fn subs_token_id_mut(&mut self) -> &mut SubsGroup<TokenIdGroup> {
        &mut self.subs_token_id
    }

    /// Mutable reference to the token ID subscribers.
    pub fn subs_lokad_id_mut(&mut self) -> &mut SubsGroup<LokadIdGroup> {
        &mut self.subs_lokad_id
    }

    /// Send out updates to subscribers for this tx and msg_type.
    pub fn handle_tx_event(
        &mut self,
        tx: &Tx,
        msg_type: TxMsgType,
        token_id_aux: &TokenIdGroupAux,
    ) {
        self.subs_script.handle_tx_event(tx, &(), msg_type);
        self.subs_token_id
            .handle_tx_event(tx, token_id_aux, msg_type);
        self.subs_lokad_id.handle_tx_event(tx, &(), msg_type);
    }

    /// Send out msg_type updates for the txs of the block to subscribers.
    pub fn handle_block_tx_events(
        &mut self,
        txs: &[Tx],
        msg_type: TxMsgType,
        token_id_aux: &TokenIdGroupAux,
    ) {
        if self.subs_script.is_empty()
            && self.subs_token_id.is_empty()
            && self.subs_lokad_id.is_empty()
        {
            // Short-circuit if no subscriptions
            return;
        }
        for tx in txs {
            self.subs_script.handle_tx_event(tx, &(), msg_type);
            self.subs_token_id
                .handle_tx_event(tx, token_id_aux, msg_type);
            self.subs_lokad_id.handle_tx_event(tx, &(), msg_type);
        }
    }

    pub(crate) fn broadcast_block_msg(&self, msg: BlockMsg) {
        if self.subs_block.receiver_count() > 0 {
            if let Err(err) = self.subs_block.send(msg) {
                log!("Unexpected send error: {}\n", err);
            }
        }
    }
}
