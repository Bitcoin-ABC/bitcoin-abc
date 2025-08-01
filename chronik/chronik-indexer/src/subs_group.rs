// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`SubsGroup`].

use std::collections::{HashMap, HashSet};

use bitcoinsuite_core::tx::{Tx, TxId};
use chronik_db::group::{tx_members_for_group, Group, GroupQuery};
use tokio::sync::broadcast;

/// Tx update message.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TxMsg {
    /// What happened with the tx.
    pub msg_type: TxMsgType,
    /// [`TxId`] of the tx we got an update for.
    pub txid: TxId,
}

/// What happened to a tx.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TxMsgType {
    /// Tx was added to the mempool.
    AddedToMempool,
    /// Tx was removed from the mempool.
    RemovedFromMempool,
    /// Tx was confirmed in a block.
    Confirmed,
    /// Tx was finalized by Avalanche.
    Finalized(TxFinalizationReason),
    /// Tx was invalidated by Avalanche.
    Invalidated,
}

/// Why did the tx finalize
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TxFinalizationReason {
    /// Tx finalized by post-consensus
    PostConsensus,
    /// Tx finalized by pre-consensus
    PreConsensus,
}

const GROUP_CHANNEL_CAPACITY: usize = 16;

/// Struct for managing subscriptions to group members. Subscribers will be
/// notified of txs that have inputs/outputs that match the group.
///
/// Note: Even if an input/output is present multiple times in a tx, an update
/// will still only be sent once.
#[derive(Debug)]
pub struct SubsGroup<G: Group> {
    subs: HashMap<Vec<u8>, broadcast::Sender<TxMsg>>,
    group: G,
}

impl<G: Group> SubsGroup<G> {
    /// Create a new [`SubsGroup`].
    pub fn new(group: G) -> Self {
        SubsGroup {
            subs: HashMap::new(),
            group,
        }
    }

    /// Subscribe to updates about the given group member.
    pub fn subscribe_to_member(
        &mut self,
        member: &G::Member<'_>,
    ) -> broadcast::Receiver<TxMsg> {
        let member_ser = self.group.ser_member(member);
        match self.subs.get(member_ser.as_ref()) {
            Some(sender) => sender.subscribe(),
            None => {
                let (sender, receiver) =
                    broadcast::channel(GROUP_CHANNEL_CAPACITY);
                self.subs.insert(member_ser.as_ref().to_vec(), sender);
                receiver
            }
        }
    }

    /// Subscribe to updates about the given group hash member.
    pub fn subscribe_to_hash_member(
        &mut self,
        hash_member: &[u8; 32],
    ) -> broadcast::Receiver<TxMsg> {
        match self.subs.get(hash_member.as_ref()) {
            Some(sender) => sender.subscribe(),
            None => {
                let (sender, receiver) =
                    broadcast::channel(GROUP_CHANNEL_CAPACITY);
                self.subs.insert(hash_member.as_ref().to_vec(), sender);
                receiver
            }
        }
    }

    /// Cleanly unsubscribe from a member. This will try to deallocate the
    /// memory used by a subscriber.
    pub fn unsubscribe_from_member(&mut self, member: &G::Member<'_>) {
        let member_ser = self.group.ser_member(member);
        if let Some(sender) = self.subs.get(member_ser.as_ref()) {
            if sender.receiver_count() == 0 {
                self.subs.remove(member_ser.as_ref());
            }
        }
    }

    /// Send out updates to subscribers for this tx and msg_type.
    pub fn handle_tx_event(
        &mut self,
        tx: &Tx,
        aux: &G::Aux,
        msg_type: TxMsgType,
    ) {
        let query = GroupQuery {
            is_coinbase: false,
            tx,
        };
        let msg = TxMsg {
            msg_type,
            txid: tx.txid(),
        };
        let mut already_notified = HashSet::new();
        let mut already_notified_hash = HashSet::new();
        for member in tx_members_for_group(&self.group, query, aux) {
            let hash_member = if self.group.is_hash_member_supported() {
                Some(self.group.ser_hash_member(&member))
            } else {
                None
            };

            if !already_notified.contains(&member) {
                let member_ser = self.group.ser_member(&member);
                if let Some(sender) = self.subs.get(member_ser.as_ref()) {
                    // Unclean unsubscribe
                    if sender.send(msg.clone()).is_err() {
                        self.subs.remove(member_ser.as_ref());
                    }
                }
                already_notified.insert(member);
            }

            match hash_member {
                // What is below is only for ScriptGroup
                None => continue,
                Some(hash_member) => {
                    if !already_notified_hash.contains(&hash_member) {
                        if let Some(sender) =
                            self.subs.get(hash_member.as_ref())
                        {
                            // Unclean unsubscribe
                            if sender.send(msg.clone()).is_err() {
                                self.subs.remove(hash_member.as_ref());
                            }
                        }
                        already_notified_hash.insert(hash_member);
                    }
                }
            }
        }
    }

    /// Whether there are no subscribers for this group
    pub fn is_empty(&self) -> bool {
        self.subs.is_empty()
    }
}
