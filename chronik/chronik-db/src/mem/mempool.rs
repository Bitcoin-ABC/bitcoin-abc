// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Mempool`], to index mempool txs.

use std::{borrow::Cow, collections::HashMap};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{Tx, TxId};
use chronik_plugin::{context::PluginContext, data::PluginNameMap};
use thiserror::Error;

use crate::{
    db::Db,
    groups::{
        LokadIdGroup, MempoolLokadIdHistory, MempoolScriptHistory,
        MempoolScriptUtxos, MempoolTokenIdHistory, MempoolTokenIdUtxos,
        ScriptGroup, TokenIdGroup, TokenIdGroupAux,
    },
    mem::{MempoolSpentBy, MempoolTokens},
    plugins::MempoolPlugins,
};

/// Mempool of the indexer. This stores txs from the node again, but having a
/// copy here simplifies the implementation significantly. If this redundancy
/// becomes an issue (e.g. excessive RAM usage), we can optimize this later.
#[derive(Debug)]
pub struct Mempool {
    txs: HashMap<TxId, MempoolTx>,
    script_history: MempoolScriptHistory,
    script_utxos: MempoolScriptUtxos,
    spent_by: MempoolSpentBy,
    tokens: MempoolTokens,
    token_id_history: MempoolTokenIdHistory,
    token_id_utxos: MempoolTokenIdUtxos,
    lokad_id_history: MempoolLokadIdHistory,
    plugins: MempoolPlugins,
    is_token_index_enabled: bool,
    is_lokad_id_index_enabled: bool,
}

/// Result after adding a tx to the mempool
#[derive(Debug)]
pub struct MempoolResult<'m> {
    /// Mempool tx that was just added
    pub mempool_tx: Cow<'m, MempoolTx>,
    /// [`TokenIdGroupAux`] generated while indexing the mempool tx
    pub token_id_aux: TokenIdGroupAux,
}

/// Transaction in the mempool.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MempoolTx {
    /// Transaction, including spent coins.
    pub tx: Tx,
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
    /// Create a new [`Mempool`].
    pub fn new(
        script_group: ScriptGroup,
        enable_token_index: bool,
        is_lokad_id_index_enabled: bool,
    ) -> Self {
        Mempool {
            txs: HashMap::new(),
            script_history: MempoolScriptHistory::new(script_group.clone()),
            script_utxos: MempoolScriptUtxos::new(script_group),
            spent_by: MempoolSpentBy::default(),
            tokens: MempoolTokens::default(),
            token_id_history: MempoolTokenIdHistory::new(TokenIdGroup),
            token_id_utxos: MempoolTokenIdUtxos::new(TokenIdGroup),
            lokad_id_history: MempoolLokadIdHistory::new(LokadIdGroup),
            plugins: MempoolPlugins::new(),
            is_token_index_enabled: enable_token_index,
            is_lokad_id_index_enabled,
        }
    }

    /// Insert tx into the mempool.
    pub fn insert(
        &mut self,
        db: &Db,
        mempool_tx: MempoolTx,
        plugin_ctx: &PluginContext,
        plugin_name_map: &PluginNameMap,
    ) -> Result<MempoolResult<'_>> {
        let txid = mempool_tx.tx.txid();
        self.script_history.insert(&mempool_tx, &());
        self.script_utxos.insert(
            &mempool_tx,
            |txid| self.txs.contains_key(txid),
            &(),
        )?;
        self.spent_by.insert(&mempool_tx)?;
        let token_id_aux;
        if self.is_token_index_enabled {
            self.tokens
                .insert(db, &mempool_tx, |txid| self.txs.contains_key(txid))?;
            token_id_aux =
                TokenIdGroupAux::from_mempool(&mempool_tx.tx, &self.tokens);
            self.token_id_history.insert(&mempool_tx, &token_id_aux);
            self.token_id_utxos.insert(
                &mempool_tx,
                |txid| self.txs.contains_key(txid),
                &token_id_aux,
            )?;
        } else {
            token_id_aux = TokenIdGroupAux::default();
        }
        if self.is_lokad_id_index_enabled {
            self.lokad_id_history.insert(&mempool_tx, &());
        }
        self.plugins.insert(
            db,
            &mempool_tx,
            |txid| self.txs.contains_key(txid),
            if self.is_token_index_enabled {
                self.tokens
                    .token_tx(mempool_tx.tx.txid_ref())
                    .zip(self.tokens.tx_token_inputs(mempool_tx.tx.txid_ref()))
            } else {
                None
            },
            plugin_ctx,
            plugin_name_map,
        )?;
        if self.txs.insert(txid, mempool_tx).is_some() {
            return Err(DuplicateTx(txid).into());
        }
        Ok(MempoolResult {
            mempool_tx: Cow::Borrowed(&self.txs[&txid]),
            token_id_aux,
        })
    }

    /// Remove tx from the mempool.
    pub fn remove(&mut self, txid: TxId) -> Result<MempoolResult<'_>> {
        let mempool_tx = match self.txs.remove(&txid) {
            Some(mempool_tx) => mempool_tx,
            None => return Err(NoSuchMempoolTx(txid).into()),
        };
        self.script_history.remove(&mempool_tx, &());
        self.script_utxos.remove(
            &mempool_tx,
            |txid| self.txs.contains_key(txid),
            &(),
        )?;
        self.spent_by.remove(&mempool_tx)?;
        let token_id_aux;
        if self.is_token_index_enabled {
            token_id_aux =
                TokenIdGroupAux::from_mempool(&mempool_tx.tx, &self.tokens);
            self.token_id_history.remove(&mempool_tx, &token_id_aux);
            self.token_id_utxos.remove(
                &mempool_tx,
                |txid| self.txs.contains_key(txid),
                &token_id_aux,
            )?;
            self.tokens.remove(&txid);
        } else {
            token_id_aux = TokenIdGroupAux::default();
        }
        self.plugins.remove(&mempool_tx)?;
        if self.is_lokad_id_index_enabled {
            self.lokad_id_history.remove(&mempool_tx, &());
        }
        Ok(MempoolResult {
            mempool_tx: Cow::Owned(mempool_tx),
            token_id_aux,
        })
    }

    /// Remove mined tx from the mempool.
    pub fn remove_mined(&mut self, txid: &TxId) -> Result<Option<MempoolTx>> {
        if let Some(mempool_tx) = self.txs.remove(txid) {
            self.script_history.remove(&mempool_tx, &());
            self.script_utxos.remove_mined(&mempool_tx, &());
            self.spent_by.remove(&mempool_tx)?;
            if self.is_token_index_enabled {
                let token_id_aux =
                    TokenIdGroupAux::from_mempool(&mempool_tx.tx, &self.tokens);
                self.token_id_history.remove(&mempool_tx, &token_id_aux);
                self.token_id_utxos.remove_mined(&mempool_tx, &token_id_aux);
                self.tokens.remove(txid);
            }
            self.plugins.remove(&mempool_tx)?;
            if self.is_lokad_id_index_enabled {
                self.lokad_id_history.remove(&mempool_tx, &());
            }
            return Ok(Some(mempool_tx));
        }
        Ok(None)
    }

    /// Get a tx by [`TxId`], or [`None`], if not found.
    pub fn tx(&self, txid: &TxId) -> Option<&MempoolTx> {
        self.txs.get(txid)
    }

    /// Tx history of scripts in the mempool.
    pub fn script_history(&self) -> &MempoolScriptHistory {
        &self.script_history
    }

    /// Tx history of UTXOs in the mempool.
    pub fn script_utxos(&self) -> &MempoolScriptUtxos {
        &self.script_utxos
    }

    /// Which tx outputs have been spent by tx in the mempool.
    pub fn spent_by(&self) -> &MempoolSpentBy {
        &self.spent_by
    }

    /// Token data of txs in the mempool.
    pub fn tokens(&self) -> &MempoolTokens {
        &self.tokens
    }

    /// Tx history of token IDs in the mempool.
    pub fn token_id_history(&self) -> &MempoolTokenIdHistory {
        &self.token_id_history
    }

    /// Tx history of UTXOs by token ID in the mempool.
    pub fn token_id_utxos(&self) -> &MempoolTokenIdUtxos {
        &self.token_id_utxos
    }

    /// Tx history of LOKAD IDs in the mempool.
    pub fn lokad_id_history(&self) -> &MempoolLokadIdHistory {
        &self.lokad_id_history
    }

    /// Plugin data of txs in the mempool.
    pub fn plugins(&self) -> &MempoolPlugins {
        &self.plugins
    }
}
