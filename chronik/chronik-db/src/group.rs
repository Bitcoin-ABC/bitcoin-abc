// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Group`] and [`GroupQuery`].

use bitcoinsuite_core::tx::Tx;

use crate::io::GroupHistoryConf;

/// Struct giving impls of [`Group`] all the necessary data to determine the
/// member of the group.
#[derive(Debug)]
pub struct GroupQuery<'a> {
    /// Whether the tx is a coinbase tx.
    pub is_coinbase: bool,
    /// The transaction that should be grouped.
    pub tx: &'a Tx,
}

/// Groups txs and determines which members they are.
///
/// A member is one instance in a group and can be anything in a tx, e.g. the
/// input and output scripts, the SLP token ID, a SWaP signal, a smart contract
/// etc.
pub trait Group {
    /// Iterator over the members found for a given [`GroupQuery`].
    type Iter<'a>: IntoIterator<Item = Self::Member<'a>> + 'a;

    /// Member of a group, this is what txs will be grouped by.
    ///
    /// We use a HashMap to group txs, so it must implement [`std::hash::Hash`].
    type Member<'a>: Into<Self::MemberSer<'a>> + std::hash::Hash + Eq;

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
    type MemberSer<'a>: AsRef<[u8]> + 'a;

    /// Find the group's members in the given query's tx.
    ///
    /// Note: This is allowed to return a member multiple times per query.
    ///
    /// Note: The returned iterator is allowed to borrow from the query.
    fn members_tx<'a>(&self, query: GroupQuery<'a>) -> Self::Iter<'a>;

    /// The [`GroupHistoryConf`] for this group.
    fn tx_history_conf() -> GroupHistoryConf;
}
