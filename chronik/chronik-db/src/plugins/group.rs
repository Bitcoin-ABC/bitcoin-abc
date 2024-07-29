// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::BTreeMap;

use bitcoinsuite_core::tx::OutPoint;
use chronik_plugin::data::{PluginIdx, PluginOutput};
use serde::Serialize;

use crate::{
    db::CF_PLUGIN_GROUP_UTXOS,
    group::{Group, GroupQuery, MemberItem, UtxoDataOutput},
    io::{GroupHistoryConf, GroupUtxoConf},
    ser::db_serialize,
};

/// [`Group`] impl for plugins; groups outputs by the groups assigned by plugins
#[derive(Clone, Debug)]
pub struct PluginsGroup;

/// Members we group outputs by; i.e. by plugin name first and then by the group
/// emitted by the plugin.
#[derive(Debug, Serialize)]
pub struct PluginMember<'a> {
    /// Index of the plugin that grouped the output
    pub plugin_idx: PluginIdx,
    /// Group the plugin assigned to the output
    pub group: &'a [u8],
}

impl PluginMember<'_> {
    /// Serialize the member so we can use it as a key in the DB.
    pub fn ser(&self) -> Vec<u8> {
        db_serialize::<PluginMember<'_>>(self).unwrap()
    }
}

impl Group for PluginsGroup {
    type Aux = BTreeMap<OutPoint, PluginOutput>;
    type Iter<'a> = Vec<MemberItem<Vec<u8>>>;
    type Member<'a> = Vec<u8>;
    type MemberSer = Vec<u8>;
    type UtxoData = UtxoDataOutput;

    fn input_members<'a>(
        &self,
        query: GroupQuery<'a>,
        aux: &BTreeMap<OutPoint, PluginOutput>,
    ) -> Self::Iter<'a> {
        let mut members = Vec::new();
        for (input_idx, input) in query.tx.inputs.iter().enumerate() {
            let Some(plugin_output) = aux.get(&input.prev_out) else {
                continue;
            };
            for (&plugin_idx, entry) in &plugin_output.plugins {
                for group in &entry.groups {
                    members.push(MemberItem {
                        idx: input_idx,
                        member: PluginMember { plugin_idx, group }.ser(),
                    });
                }
            }
        }
        members
    }

    fn output_members<'a>(
        &self,
        query: GroupQuery<'a>,
        aux: &BTreeMap<OutPoint, PluginOutput>,
    ) -> Self::Iter<'a> {
        let mut members = Vec::new();
        for output_idx in 0..query.tx.outputs.len() {
            let outpoint = OutPoint {
                txid: query.tx.txid(),
                out_idx: output_idx as u32,
            };
            let Some(plugin_output) = aux.get(&outpoint) else {
                continue;
            };
            for (&plugin_idx, entry) in &plugin_output.plugins {
                for group in &entry.groups {
                    members.push(MemberItem {
                        idx: output_idx,
                        member: PluginMember { plugin_idx, group }.ser(),
                    });
                }
            }
        }
        members
    }

    fn ser_member<'a>(&self, member: &Vec<u8>) -> Self::MemberSer {
        member.to_vec()
    }

    fn tx_history_conf() -> GroupHistoryConf {
        unimplemented!("Tx history for plugin groups not implemented yet")
    }

    fn utxo_conf() -> GroupUtxoConf {
        GroupUtxoConf {
            cf_name: CF_PLUGIN_GROUP_UTXOS,
        }
    }
}
