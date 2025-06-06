// Copyright (c) 2025 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use bitcoinsuite_core::{hash::Hashed, tx::TxId};

use crate::{
    group::{Group, GroupQuery, MemberItem, UtxoDataOutput},
    io::{GroupHistoryConf, GroupUtxoConf},
};

/// Group txs by txid.
#[derive(Clone, Debug)]
pub struct TxIdGroup;

impl Group for TxIdGroup {
    type Aux = ();
    type Iter<'a> = Vec<MemberItem<TxId>>;
    type Member<'a> = TxId;
    type MemberSer = [u8; 32];
    type UtxoData = UtxoDataOutput;

    fn input_members<'a>(
        &self,
        _query: GroupQuery<'a>,
        _aux: &(),
    ) -> Self::Iter<'a> {
        // Don't use; actual parsing happens in output_members
        vec![]
    }

    fn output_members<'a>(
        &self,
        query: GroupQuery<'a>,
        _aux: &(),
    ) -> Self::Iter<'a> {
        vec![MemberItem {
            idx: 0,
            member: query.tx.txid(),
        }]
    }

    fn ser_member(&self, member: &Self::Member<'_>) -> Self::MemberSer {
        member.hash().to_be_bytes()
    }

    fn is_hash_member_supported(&self) -> bool {
        false
    }

    fn ser_hash_member(&self, _member: &Self::Member<'_>) -> [u8; 32] {
        unimplemented!("There is no use case for hashing TxIdGroup")
    }

    fn tx_history_conf() -> GroupHistoryConf {
        panic!("TxIdGroup should not be used to group history")
    }

    fn utxo_conf() -> GroupUtxoConf {
        panic!("TxIdGroup should not be used to group UTXOs")
    }
}
