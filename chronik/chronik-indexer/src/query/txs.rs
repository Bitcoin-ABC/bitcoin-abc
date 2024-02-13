// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`QueryTxs`], to query txs from mempool/db.

use abc_rust_error::{Result, WrapErr};
use bitcoinsuite_core::{
    ser::BitcoinSer,
    tx::{Tx, TxId},
};
use chronik_bridge::ffi;
use chronik_db::{
    db::Db,
    io::{BlockReader, SpentByReader, TxReader},
    mem::Mempool,
};
use chronik_proto::proto;
use thiserror::Error;

use crate::{
    avalanche::Avalanche,
    query::{
        make_genesis_info_proto, make_token_type_proto, make_tx_proto,
        read_token_info, OutputsSpent, QueryTxError::*, TxTokenData,
    },
};

/// Struct for querying txs from the db/mempool.
#[derive(Debug)]
pub struct QueryTxs<'a> {
    /// Database
    pub db: &'a Db,
    /// Avalanche
    pub avalanche: &'a Avalanche,
    /// Mempool
    pub mempool: &'a Mempool,
    /// Whether the SLP/ALP token index is enabled
    pub is_token_index_enabled: bool,
}

/// Errors indicating something went wrong with reading txs.
#[derive(Debug, Error, PartialEq)]
pub enum QueryTxError {
    /// Transaction not in mempool nor DB.
    #[error("404: Transaction {0} not found in the index")]
    TxNotFound(TxId),

    /// Token not found in mempool nor DB.
    #[error("404: Token {0} not found in the index")]
    TokenNotFound(TxId),

    /// Transaction in DB without block
    #[error("500: Inconsistent DB: {0} has no block")]
    DbTxHasNoBlock(TxId),

    /// Reading failed, likely corrupted block data
    #[error("500: Reading {0} failed")]
    ReadFailure(TxId),
}

impl<'a> QueryTxs<'a> {
    /// Query a tx by txid from the mempool or DB.
    pub fn tx_by_id(&self, txid: TxId) -> Result<proto::Tx> {
        match self.mempool.tx(&txid) {
            Some(tx) => Ok(make_tx_proto(
                &tx.tx,
                &OutputsSpent::new_mempool(
                    self.mempool.spent_by().outputs_spent(&txid),
                ),
                tx.time_first_seen,
                false,
                None,
                self.avalanche,
                TxTokenData::from_mempool(self.mempool.tokens(), &tx.tx)
                    .as_ref(),
            )),
            None => {
                let tx_reader = TxReader::new(self.db)?;
                let (tx_num, block_tx) = tx_reader
                    .tx_and_num_by_txid(&txid)?
                    .ok_or(TxNotFound(txid))?;
                let tx_entry = block_tx.entry;
                let block_reader = BlockReader::new(self.db)?;
                let spent_by_reader = SpentByReader::new(self.db)?;
                let block = block_reader
                    .by_height(block_tx.block_height)?
                    .ok_or(DbTxHasNoBlock(txid))?;
                let tx = Tx::from(
                    ffi::load_tx(
                        block.file_num,
                        tx_entry.data_pos,
                        tx_entry.undo_pos,
                    )
                    .wrap_err(ReadFailure(txid))?,
                );
                let outputs_spent = OutputsSpent::query(
                    &spent_by_reader,
                    &tx_reader,
                    self.mempool.spent_by().outputs_spent(&txid),
                    tx_num,
                )?;
                let token = TxTokenData::from_db(
                    self.db,
                    tx_num,
                    &tx,
                    self.is_token_index_enabled,
                )?;
                Ok(make_tx_proto(
                    &tx,
                    &outputs_spent,
                    tx_entry.time_first_seen,
                    tx_entry.is_coinbase,
                    Some(&block),
                    self.avalanche,
                    token.as_ref(),
                ))
            }
        }
    }

    /// Query the raw serialized tx by txid.
    ///
    /// Serializes the tx if it's in the mempool, or reads the tx data from the
    /// node's storage otherwise.
    pub fn raw_tx_by_id(&self, txid: &TxId) -> Result<proto::RawTx> {
        let raw_tx = match self.mempool.tx(txid) {
            Some(mempool_tx) => mempool_tx.tx.ser().to_vec(),
            None => {
                let tx_reader = TxReader::new(self.db)?;
                let block_reader = BlockReader::new(self.db)?;
                let block_tx =
                    tx_reader.tx_by_txid(txid)?.ok_or(TxNotFound(*txid))?;
                let block = block_reader
                    .by_height(block_tx.block_height)?
                    .ok_or(DbTxHasNoBlock(*txid))?;
                ffi::load_raw_tx(block.file_num, block_tx.entry.data_pos)
                    .wrap_err(ReadFailure(*txid))?
            }
        };
        Ok(proto::RawTx { raw_tx })
    }

    /// Get token info of the token by token ID.
    pub fn token_info(&self, token_id_txid: &TxId) -> Result<proto::TokenInfo> {
        let token_info = read_token_info(
            self.db,
            self.mempool,
            self.avalanche,
            token_id_txid,
        )?
        .ok_or(TokenNotFound(*token_id_txid))?;
        let meta = &token_info.meta;
        Ok(proto::TokenInfo {
            token_id: meta.token_id.to_string(),
            token_type: Some(make_token_type_proto(meta.token_type)),
            genesis_info: Some(make_genesis_info_proto(
                &token_info.genesis_info,
            )),
            block: token_info.block,
            time_first_seen: token_info.time_first_seen,
        })
    }
}
