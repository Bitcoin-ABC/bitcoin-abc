// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Group`] and [`GroupQuery`].

use bitcoinsuite_core::tx::{Tx, TxOutput};
use bytes::Bytes;
use serde::{Deserialize, Serialize};

use crate::io::{GroupHistoryConf, GroupUtxoConf};

/// Struct giving impls of [`Group`] all the necessary data to determine the
/// member of the group.
#[derive(Clone, Copy, Debug)]
pub struct GroupQuery<'a> {
    /// Whether the tx is a coinbase tx.
    pub is_coinbase: bool,
    /// The transaction that should be grouped.
    pub tx: &'a Tx,
}

/// Item returned by `members_tx`.
#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
pub struct MemberItem<M> {
    /// Index of the item in the list of inputs/outputs.
    pub idx: usize,
    /// Member of this item.
    pub member: M,
}

/// Groups txs and determines which members they are.
///
/// A member is one instance in a group and can be anything in a tx, e.g. the
/// input and output scripts, the SLP token ID, a SWaP signal, a smart contract
/// etc.
pub trait Group {
    /// Iterator over the members found for a given [`GroupQuery`].
    type Iter<'a>: IntoIterator<Item = MemberItem<Self::Member<'a>>> + 'a;

    /// Member of a group, this is what txs will be grouped by.
    ///
    /// We use a HashMap and a BTreeMap to group txs, so it must implement
    /// [`std::hash::Hash`] and [`Ord`].
    type Member<'a>: std::hash::Hash + Eq + Ord;

    /// Serialized member, this is what will be used as key in the DB.
    /// Normally, this will be a [`Vec<u8>`] or an [`u8`] array or slice.
    ///
    /// We use this to allow members to separate between the code that groups
    /// them from the serialization of members. For example, we can group by raw
    /// input/output script bytecode, but then use compressed scripts when
    /// adding to the DB. That way, we don't have to run the compression every
    /// time we compare/hash elements for grouping.
    ///
    /// Note: For group history, this will be suffixed by a 4-byte page number.
    type MemberSer: AsRef<[u8]>;

    /// Auxillary data when grouping members
    type Aux;

    /// Data attached to a UTXO for this group.
    type UtxoData: UtxoData;

    /// Find the group's members in the given query's tx's inputs.
    ///
    /// Note: This is allowed to return a member multiple times per query.
    ///
    /// Note: The returned iterator is allowed to borrow from the query.
    fn input_members<'a>(
        &self,
        query: GroupQuery<'a>,
        aux: &Self::Aux,
    ) -> Self::Iter<'a>;

    /// Find the group's members in the given query's tx's outputs.
    ///
    /// Note: This is allowed to return a member multiple times per query.
    ///
    /// Note: The returned iterator is allowed to borrow from the query.
    fn output_members<'a>(
        &self,
        query: GroupQuery<'a>,
        aux: &Self::Aux,
    ) -> Self::Iter<'a>;

    /// Serialize the given member.
    fn ser_member(&self, member: &Self::Member<'_>) -> Self::MemberSer;

    /// Hash the given member.
    /// This is currently only used for ScriptGroup to create a
    /// scripthash to script index for the ElectrumX API.
    fn ser_hash_member(&self, member: &Self::Member<'_>) -> [u8; 32];

    /// The [`GroupHistoryConf`] for this group.
    fn tx_history_conf() -> GroupHistoryConf;

    /// The [`GroupUtxoConf`] for this group.
    fn utxo_conf() -> GroupUtxoConf;
}

/// Data atttached to a UTXO by a group.
/// There's basically only 2 meaningful variants here, one with script (where
/// the member is anything, e.g. a token ID) and one without script, where the
/// member is the script itself and therefore storing it in the UTXO is
/// redundant.
pub trait UtxoData:
    Default + for<'a> Deserialize<'a> + Serialize + 'static
{
    /// Function that extracts the [`UtxoData`] from an output.
    fn from_output(output: &TxOutput) -> Self;
}

/// [`UtxoData`] that only stores the output value but not the script.
/// This is useful where the member itself is the script so storing it would be
/// redundant.
pub type UtxoDataValue = i64;

impl UtxoData for UtxoDataValue {
    fn from_output(output: &TxOutput) -> Self {
        output.value
    }
}

/// [`UtxoData`] that stores the full output, including value and script.
/// This is useful where the member isn't the script, e.g. a token ID.
pub type UtxoDataOutput = (i64, Bytes);

impl UtxoData for UtxoDataOutput {
    fn from_output(output: &TxOutput) -> Self {
        (output.value, output.script.bytecode().clone())
    }
}

/// Helper which returns the `G::Member`s of both inputs and outputs of the
/// group for the tx.
pub fn tx_members_for_group<'a, G: Group>(
    group: &G,
    query: GroupQuery<'a>,
    aux: &G::Aux,
) -> impl Iterator<Item = G::Member<'a>> {
    group
        .input_members(query, aux)
        .into_iter()
        .chain(group.output_members(query, aux))
        .map(|item| item.member)
}
