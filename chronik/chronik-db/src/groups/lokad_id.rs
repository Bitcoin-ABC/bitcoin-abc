// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::tx::EMPTY_TX;
use bitcoinsuite_slp::lokad_id::{parse_tx_lokad_ids, LokadId, LokadIdIter};

use crate::{
    db::{CF_LOKAD_ID_HISTORY, CF_LOKAD_ID_HISTORY_NUM_TXS},
    group::{Group, GroupQuery, MemberItem, UtxoDataOutput},
    io::{
        GroupHistoryConf, GroupHistoryReader, GroupHistoryWriter, GroupUtxoConf,
    },
    mem::MempoolGroupHistory,
};

/// Index the mempool tx history of scripts
pub type MempoolLokadIdHistory = MempoolGroupHistory<LokadIdGroup>;
/// Index the tx history of script in the DB
pub type LokadIdHistoryWriter<'a> = GroupHistoryWriter<'a, LokadIdGroup>;
/// Read the tx history of scripts in the DB
pub type LokadIdHistoryReader<'a> = GroupHistoryReader<'a, LokadIdGroup>;

/// Group txs by input/output scripts.
#[derive(Clone, Debug)]
pub struct LokadIdGroup;

/// Iterator over the scripts of a tx
#[derive(Debug)]
pub struct LokadIdGroupIter<'a> {
    iter: std::iter::Enumerate<LokadIdIter<'a>>,
}

impl<'a> Iterator for LokadIdGroupIter<'a> {
    type Item = MemberItem<LokadId>;

    fn next(&mut self) -> Option<Self::Item> {
        let (idx, member) = self.iter.next()?;
        Some(MemberItem { idx, member })
    }
}

impl Group for LokadIdGroup {
    type Aux = ();
    type Iter<'a> = LokadIdGroupIter<'a>;
    type Member<'a> = LokadId;
    type MemberSer = LokadId;
    // Ignored, LOKAD ID doesn't apply to UTXOs but to entire txs
    type UtxoData = UtxoDataOutput;

    fn input_members<'a>(
        &self,
        _query: GroupQuery<'a>,
        _aux: &(),
    ) -> Self::Iter<'a> {
        // Don't use; actual parsing happens in output_members
        LokadIdGroupIter {
            iter: parse_tx_lokad_ids(&EMPTY_TX).enumerate(),
        }
    }

    fn output_members<'a>(
        &self,
        query: GroupQuery<'a>,
        _aux: &(),
    ) -> Self::Iter<'a> {
        // LOKAD ID is per-tx not per-utxo, so we only use output_members
        LokadIdGroupIter {
            iter: parse_tx_lokad_ids(query.tx).enumerate(),
        }
    }

    fn ser_member(&self, member: &Self::Member<'_>) -> Self::MemberSer {
        *member
    }

    fn tx_history_conf() -> GroupHistoryConf {
        GroupHistoryConf {
            cf_page_name: CF_LOKAD_ID_HISTORY,
            cf_num_txs_name: CF_LOKAD_ID_HISTORY_NUM_TXS,
            page_size: 1000,
        }
    }

    fn utxo_conf() -> GroupUtxoConf {
        panic!("LokadIdGroup should not be used to group UTXOs")
    }
}
