// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`QueryTxs`], to query txs from mempool/db.

use abc_rust_error::{Result, WrapErr};
use bitcoinsuite_core::tx::{Tx, TxId};
use chronik_bridge::ffi;
use chronik_db::{
    db::Db,
    io::{BlockReader, TxReader},
    mem::Mempool,
};
use chronik_proto::proto;
use thiserror::Error;

use crate::{avalanche::Avalanche, query::make_tx_proto};

/// Struct for querying txs from the db/mempool.
#[derive(Debug)]
pub struct QueryTxs<'a> {
    /// Database
    pub db: &'a Db,
    /// Avalanche
    pub avalanche: &'a Avalanche,
    /// Mempool
    pub mempool: &'a Mempool,
}

/// Errors indicating something went wrong with reading txs.
#[derive(Debug, Error, PartialEq)]
pub enum QueryTxError {
    /// Transaction not in mempool nor DB.
    #[error("404: Transaction {0} not found in the index")]
    TxNotFound(TxId),

    /// Transaction in DB without block
    #[error("500: Inconsistent DB: {0} has no block")]
    DbTxHasNoBlock(TxId),

    /// Reading failed, likely corrupted block data
    #[error("500: Reading {0} failed")]
    ReadFailure(TxId),
}

use self::QueryTxError::*;

impl<'a> QueryTxs<'a> {
    /// Query a tx by txid from the mempool or DB.
    pub fn tx_by_id(&self, txid: TxId) -> Result<proto::Tx> {
        match self.mempool.tx(&txid) {
            Some(tx) => Ok(make_tx_proto(
                &tx.tx,
                tx.time_first_seen,
                false,
                None,
                self.avalanche,
            )),
            None => {
                let tx_reader = TxReader::new(self.db)?;
                let block_tx =
                    tx_reader.tx_by_txid(&txid)?.ok_or(TxNotFound(txid))?;
                let tx_entry = block_tx.entry;
                let block_reader = BlockReader::new(self.db)?;
                let block = block_reader
                    .by_height(block_tx.block_height)?
                    .ok_or(DbTxHasNoBlock(txid))?;
                let tx = ffi::load_tx(
                    block.file_num,
                    tx_entry.data_pos,
                    tx_entry.undo_pos,
                )
                .wrap_err(ReadFailure(txid))?;
                Ok(make_tx_proto(
                    &Tx::from(tx),
                    tx_entry.time_first_seen,
                    tx_entry.is_coinbase,
                    Some(&block),
                    self.avalanche,
                ))
            }
        }
    }
}
