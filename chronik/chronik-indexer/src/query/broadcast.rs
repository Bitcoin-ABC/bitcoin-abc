// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use abc_rust_error::Result;
use bitcoinsuite_core::{
    error::DataError,
    ser::BitcoinSer,
    tx::{Tx, TxId, TxMut},
};
use bytes::Bytes;
use chronik_bridge::ffi;
use chronik_db::{db::Db, mem::Mempool};
use chronik_plugin::data::PluginNameMap;
use chronik_proto::proto;
use thiserror::Error;

use crate::{
    avalanche::Avalanche,
    indexer::Node,
    query::{
        make_tx_proto, read_plugin_outputs, MakeTxProtoParams, OutputsSpent,
        QueryBroadcastError::*, TxTokenData,
    },
};

/// Struct for broadcasting txs on the network
#[derive(Debug)]
pub struct QueryBroadcast<'a> {
    /// Database
    pub db: &'a Db,
    /// Avalanche
    pub avalanche: &'a Avalanche,
    /// Mempool
    pub mempool: &'a Mempool,
    /// Access to bitcoind to actually broadcast txs
    pub node: &'a Node,
    /// Whether the SLP/ALP token index is enabled
    pub is_token_index_enabled: bool,
    /// Map plugin name <-> plugin idx of all loaded plugins
    pub plugin_name_map: &'a PluginNameMap,
}

/// Errors indicating something went wrong with reading txs.
#[derive(Debug, Error, PartialEq)]
pub enum QueryBroadcastError {
    /// Transaction not in mempool nor DB.
    #[error("400: Parsing tx failed {0}")]
    ParsingFailed(DataError),

    /// Token validation error that prevented us from broadcasting the tx
    #[error("400: {0}")]
    TokenError(String),

    /// Node rejected the tx
    #[error("400: Broadcast failed: {0}")]
    BroadcastFailed(String),
}

impl QueryBroadcast<'_> {
    /// Broadcast all the txs; if one fails token validation we don't broadcast
    /// any of them.
    pub fn broadcast_txs(
        &self,
        raw_txs: &[Bytes],
        skip_token_checks: bool,
    ) -> Result<Vec<TxId>> {
        let mut coins_to_uncache = vec![];
        if !skip_token_checks && self.is_token_index_enabled {
            coins_to_uncache = self.do_token_checks(raw_txs)?;
        }
        let mut txids = Vec::with_capacity(raw_txs.len());
        let default_max_fee_rate = ffi::default_max_raw_tx_fee_rate_per_kb();
        for raw_tx in raw_txs.iter() {
            let max_fee = ffi::calc_fee(raw_tx.len(), default_max_fee_rate);
            txids.push(TxId::from(
                self.node.bridge.broadcast_tx(raw_tx, max_fee).or_else(
                    |err| -> Result<_> {
                        self.node.bridge.uncache_coins(&coins_to_uncache)?;
                        Err(BroadcastFailed(err.to_string()).into())
                    },
                )?,
            ));
        }
        Ok(txids)
    }

    fn do_token_checks(&self, raw_txs: &[Bytes]) -> Result<Vec<ffi::OutPoint>> {
        let mut token_errors = Vec::new();
        let mut coins_to_uncache = Vec::new();
        for mut raw_tx in raw_txs.iter().cloned() {
            let tx = TxMut::deser(&mut raw_tx).map_err(ParsingFailed)?;
            let mut ffi_tx = ffi::Tx::from(tx);

            let mut tx_not_found = Vec::new();
            let mut tx_coins_to_uncache = Vec::new();
            self.node.bridge.lookup_spent_coins(
                &mut ffi_tx,
                &mut tx_not_found,
                &mut tx_coins_to_uncache,
            )?;
            coins_to_uncache.extend(tx_coins_to_uncache);

            let tx = Tx::from(ffi_tx);
            let token =
                TxTokenData::from_unbroadcast_tx(self.db, self.mempool, &tx)?;
            let Some(token) = token else {
                continue;
            };
            let mut burn_msgs = Vec::new();
            for failed_parsing in &token.tx.failed_parsings {
                burn_msgs.push(failed_parsing.to_string());
            }
            for entry in &token.tx.entries {
                if !entry.is_normal() {
                    burn_msgs.push(entry.burn_summary());
                }
            }
            if !burn_msgs.is_empty() {
                token_errors.push((tx.txid(), burn_msgs));
            }
        }
        let mut error_msg = String::new();
        for (tx_idx, (txid, errors)) in token_errors.iter().enumerate() {
            error_msg.push_str(&format!("Tx {} failed token checks: ", txid));
            for (error_idx, error) in errors.iter().enumerate() {
                error_msg.push_str(error);
                error_msg.push('.');
                if tx_idx != token_errors.len() - 1
                    || error_idx != errors.len() - 1
                {
                    error_msg.push(' ');
                }
            }
        }
        if !token_errors.is_empty() {
            return Err(TokenError(error_msg).into());
        }
        Ok(coins_to_uncache)
    }

    /// Parse the tx and validate it as a token tx without broadcasting,
    /// returning verified tx data.
    pub fn validate_tx(&self, raw_tx: Vec<u8>) -> Result<proto::Tx> {
        let tx = TxMut::deser(&mut raw_tx.into())?;
        let mut ffi_tx = ffi::Tx::from(tx);
        let mut coins_to_uncache = Vec::new();
        self.node.bridge.lookup_spent_coins(
            &mut ffi_tx,
            &mut vec![],
            &mut coins_to_uncache,
        )?;
        self.node.bridge.uncache_coins(&coins_to_uncache)?;
        let tx = Tx::from(ffi_tx);
        let token = if self.is_token_index_enabled {
            TxTokenData::from_unbroadcast_tx(self.db, self.mempool, &tx)?
        } else {
            None
        };
        let plugin_outputs = read_plugin_outputs(
            self.db,
            self.mempool,
            &tx,
            None,
            !self.plugin_name_map.is_empty(),
        )?;
        Ok(make_tx_proto(MakeTxProtoParams {
            tx: &tx,
            outputs_spent: &OutputsSpent::default(),
            time_first_seen: 0,
            is_coinbase: false,
            block: None,
            avalanche: self.avalanche,
            token: token.as_ref(),
            plugin_outputs: &plugin_outputs,
            plugin_name_map: self.plugin_name_map,
        }))
    }
}
