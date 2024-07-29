// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`QueryGroupHistory`], to query the tx history of a group.

use std::collections::{BTreeSet, HashMap};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, TxId};
use bitcoinsuite_slp::verify::SpentToken;
use chronik_db::{
    db::Db,
    group::{Group, UtxoData, UtxoDataOutput, UtxoDataValue},
    io::{BlockHeight, GroupUtxoReader, TxNum, TxReader},
    mem::{Mempool, MempoolGroupUtxos},
    plugins::PluginsReader,
};
use chronik_plugin::data::PluginNameMap;
use chronik_proto::proto;
use thiserror::Error;

use crate::{
    avalanche::Avalanche,
    query::{
        make_outpoint_proto, make_plugins_proto, make_utxo_token_proto,
        read_db_token_output, QueryGroupUtxosError::*,
    },
};

static EMPTY_MEMBER_UTXOS: BTreeSet<OutPoint> = BTreeSet::new();

/// Query pages of the tx history of a group
#[derive(Debug)]
pub struct QueryGroupUtxos<'a, G, U>
where
    G: Group,
    U: UtxoProtobuf<UtxoData = G::UtxoData>,
{
    /// Database
    pub db: &'a Db,
    /// Avalanche
    pub avalanche: &'a Avalanche,
    /// Mempool
    pub mempool: &'a Mempool,
    /// The part of the mempool we search for this group's history.
    pub mempool_utxos: &'a MempoolGroupUtxos<G>,
    /// Group to query txs by
    pub group: G,
    /// UTXO mapper
    pub utxo_mapper: U,
    /// Whether the SLP/ALP token index is enabled
    pub is_token_index_enabled: bool,
    /// Map plugin name <-> plugin idx of all loaded plugins
    pub plugin_name_map: &'a PluginNameMap,
}

/// Data of a UTXO to be mapped to protobuf.
#[derive(Debug)]
pub struct UtxoExtra {
    /// OutPoint of the UTXO
    pub outpoint: OutPoint,
    /// Blockheight of the UTXO, -1 if in the mempool
    pub block_height: BlockHeight,
    /// Whether the UTXO is from a coinbase tx
    pub is_coinbase: bool,
    /// Whether the UTXO has been finalized by Avalanche
    pub is_final: bool,
    /// Token data attached to the UTXO
    pub token: Option<SpentToken>,
    /// Plugin protobuf output
    pub plugin: Option<HashMap<String, proto::PluginEntry>>,
}

/// Helper to turn [`UtxoData`] and [`UtxoExtra`] to a protobuf struct.
pub trait UtxoProtobuf {
    /// Incoming [`UtxoData`]
    type UtxoData: UtxoData;
    /// Resulting protobuf
    type Proto;

    /// Map the [`UtxoData`] and [`UtxoExtra`] to the protobuf struct
    fn map_proto(data: Self::UtxoData, extra: UtxoExtra) -> Self::Proto;
}

/// Map UTXOs to [`proto::ScriptUtxo`].
#[derive(Debug)]
pub struct UtxoProtobufValue;

impl UtxoProtobuf for UtxoProtobufValue {
    type Proto = proto::ScriptUtxo;
    type UtxoData = UtxoDataValue;

    fn map_proto(data: Self::UtxoData, extra: UtxoExtra) -> Self::Proto {
        proto::ScriptUtxo {
            outpoint: Some(make_outpoint_proto(&extra.outpoint)),
            block_height: extra.block_height,
            is_coinbase: extra.is_coinbase,
            value: data,
            is_final: extra.is_final,
            token: extra
                .token
                .as_ref()
                .map(|token| make_utxo_token_proto(&token.token)),
            plugins: extra.plugin.unwrap_or_default(),
        }
    }
}

/// Map UTXOs to [`proto::Utxo`].
#[derive(Debug)]
pub struct UtxoProtobufOutput;

impl UtxoProtobuf for UtxoProtobufOutput {
    type Proto = proto::Utxo;
    type UtxoData = UtxoDataOutput;

    fn map_proto(data: Self::UtxoData, extra: UtxoExtra) -> Self::Proto {
        proto::Utxo {
            outpoint: Some(make_outpoint_proto(&extra.outpoint)),
            block_height: extra.block_height,
            is_coinbase: extra.is_coinbase,
            value: data.0,
            script: data.1.to_vec(),
            is_final: extra.is_final,
            token: extra
                .token
                .as_ref()
                .map(|token| make_utxo_token_proto(&token.token)),
            plugins: extra.plugin.unwrap_or_default(),
        }
    }
}

/// Errors indicating something went wrong with [`QueryGroupUtxos`].
#[derive(Debug, Error, PartialEq)]
pub enum QueryGroupUtxosError {
    /// Transaction not in mempool.
    #[error("500: Inconsistent mempool: Transaction {0} not in mempool")]
    MissingMempoolTx(TxId),

    /// tx_num in group index but not in "tx" CF.
    #[error("500: Inconsistent DB: Transaction num {0} not in DB")]
    MissingDbTx(TxNum),

    /// Transaction not in mempool.
    #[error(
        "500: Inconsistent mempool: Transaction for {0:?} exists in mempool, \
         but the output doesn't"
    )]
    MempoolTxOutputsOutOfBounds(OutPoint),
}

impl<'a, G, U> QueryGroupUtxos<'a, G, U>
where
    G: Group,
    U: UtxoProtobuf<UtxoData = G::UtxoData>,
{
    /// Return the UTXOs of the given member, from both DB and mempool.
    ///
    /// UTXOs are sorted this way:
    /// - DB UTXOs first, ordered as they appear on the blockchain
    /// - Mempool UTXOs second, ordered by txid:out_idx.
    ///
    /// Note: This call can potentially be expensive on members with many UTXOs.
    pub fn utxos(&self, member: G::Member<'_>) -> Result<Vec<U::Proto>> {
        let tx_reader = TxReader::new(self.db)?;
        let utxo_reader = GroupUtxoReader::<G>::new(self.db)?;
        let plugins_reader = PluginsReader::new(self.db)?;
        let member_ser = self.group.ser_member(&member);

        // Read UTXO entries from DB and mempool
        let db_utxos =
            utxo_reader.utxos(member_ser.as_ref())?.unwrap_or_default();
        let mempool_utxos = self
            .mempool_utxos
            .utxos(member_ser.as_ref())
            .unwrap_or(&EMPTY_MEMBER_UTXOS);

        // Allocate sufficient space for the result. Note: This over-allocates
        // as many DB UTXOs as are spent in the mempool. Since these are
        // expensive and short-lived, this doesn't really pose a DoS
        // attack vector.
        let mut utxos =
            Vec::with_capacity(db_utxos.len() + mempool_utxos.len());

        let db_plugin_outputs = plugins_reader.plugin_db_outputs(
            db_utxos.iter().map(|db_utxo| db_utxo.outpoint),
        )?;

        // Read + add DB UTXOs
        for (db_utxo, db_plugin_output) in
            db_utxos.into_iter().zip(db_plugin_outputs)
        {
            let tx_num = db_utxo.outpoint.tx_num;
            let out_idx = db_utxo.outpoint.out_idx;

            // Read some tx DB data (without reading the full tx off disk)
            let db_tx =
                tx_reader.tx_by_tx_num(tx_num)?.ok_or(MissingDbTx(tx_num))?;
            let txid = db_tx.entry.txid;

            // Skip UTXOs that are spent in the mempool
            if let Some(spent_entries) =
                self.mempool.spent_by().outputs_spent(&txid)
            {
                if spent_entries.contains_key(&out_idx) {
                    continue;
                }
            }

            let outpoint = OutPoint { txid, out_idx };
            utxos.push(U::map_proto(
                db_utxo.data,
                UtxoExtra {
                    outpoint,
                    block_height: db_tx.block_height,
                    is_coinbase: db_tx.entry.is_coinbase,
                    is_final: self
                        .avalanche
                        .is_final_height(db_tx.block_height),
                    token: read_db_token_output(
                        self.db,
                        tx_num,
                        out_idx,
                        self.is_token_index_enabled,
                    )?,
                    plugin: db_plugin_output.map(|db_plugin_output| {
                        make_plugins_proto(
                            &db_plugin_output,
                            self.plugin_name_map,
                        )
                    }),
                },
            ));
        }

        // Add mempool UTXOs
        for &mempool_outpoint in mempool_utxos {
            let mempool_tx = self
                .mempool
                .tx(&mempool_outpoint.txid)
                .ok_or(MissingMempoolTx(mempool_outpoint.txid))?;
            let output = mempool_tx
                .tx
                .outputs
                .get(mempool_outpoint.out_idx as usize)
                .ok_or(MempoolTxOutputsOutOfBounds(mempool_outpoint))?;
            let token = self.mempool.tokens().spent_token(&mempool_outpoint)?;
            let plugin_output =
                self.mempool.plugins().plugin_output(&mempool_outpoint).map(
                    |plugin_output| {
                        make_plugins_proto(plugin_output, self.plugin_name_map)
                    },
                );
            utxos.push(U::map_proto(
                U::UtxoData::from_output(output),
                UtxoExtra {
                    outpoint: mempool_outpoint,
                    block_height: -1,
                    is_coinbase: false,
                    is_final: false,
                    token,
                    plugin: plugin_output,
                },
            ));
        }

        Ok(utxos)
    }
}
