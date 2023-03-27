// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Mempool`], to index mempool txs.

use std::collections::HashMap;

use abc_rust_error::Result;
use bitcoinsuite_core::tx::TxId;
use chronik_bridge::ffi;
use thiserror::Error;

/// Mempool of the indexer. This stores txs from the node again, but having a
/// copy here simplifies the implementation significantly. If this redundancy
/// becomes an issue (e.g. excessive RAM usage), we can optimize this later.
#[derive(Debug, PartialEq, Eq, Default)]
pub struct Mempool {
    txs: HashMap<TxId, MempoolTx>,
}

/// Transaction in the mempool.
#[derive(Debug, PartialEq, Eq)]
pub struct MempoolTx {
    /// Transaction, including spent coins.
    pub tx: ffi::Tx,
    /// Time this tx has been added to the node's mempool.
    pub time_first_seen: i64,
}

/// Something went wrong with the mempool.
#[derive(Debug, Error)]
pub enum MempoolError {
    /// Tried removing a tx from the mempool that doesn't exist.
    #[error("No such mempool tx: {0}")]
    NoSuchMempoolTx(TxId),

    /// Tried adding a tx to the mempool that already exists.
    #[error("Tx {0} already exists in mempool")]
    DuplicateTx(TxId),
}

use self::MempoolError::*;

impl Mempool {
    /// Insert tx into the mempool.
    pub fn insert(&mut self, mempool_tx: MempoolTx) -> Result<()> {
        let txid = TxId::from(mempool_tx.tx.txid);
        if self.txs.insert(txid, mempool_tx).is_some() {
            return Err(DuplicateTx(txid).into());
        }
        Ok(())
    }

    /// Remove tx from the mempool.
    pub fn remove(&mut self, txid: TxId) -> Result<()> {
        if self.txs.remove(&txid).is_none() {
            return Err(NoSuchMempoolTx(txid).into());
        }
        Ok(())
    }

    /// Remove mined txs from the mempool.
    pub fn removed_mined_txs(&mut self, txids: impl IntoIterator<Item = TxId>) {
        for txid in txids {
            self.txs.remove(&txid);
        }
    }

    /// Get a tx by [`TxId`], or [`None`], if not found.
    pub fn tx(&self, txid: &TxId) -> Option<&MempoolTx> {
        self.txs.get(txid)
    }
}
