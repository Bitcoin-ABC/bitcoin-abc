// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`QueryGroupHistory`], to query the tx history of a group.

use std::collections::BTreeSet;

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{Tx, TxId};
use bytes::Bytes;
use chronik_db::{
    db::Db,
    group::{Group, GroupMember},
    io::{BlockReader, GroupHistoryReader, SpentByReader, TxNum, TxReader},
    mem::{Mempool, MempoolGroupHistory},
};
use chronik_plugin::data::PluginNameMap;
use chronik_proto::proto;
use chronik_util::log;
use thiserror::Error;

use crate::{
    avalanche::Avalanche,
    indexer::Node,
    query::{
        make_tx_proto, read_plugin_outputs, MakeTxProtoParams, OutputsSpent,
        TxTokenData,
    },
};

/// Smallest allowed page size
pub const MIN_HISTORY_PAGE_SIZE: usize = 1;
/// Largest allowed page size
pub const MAX_HISTORY_PAGE_SIZE: usize = 200;

static EMPTY_MEMBER_TX_HISTORY: BTreeSet<(i64, TxId)> = BTreeSet::new();

/// Query pages of the tx history of a group
#[derive(Debug)]
pub struct QueryGroupHistory<'a, G: Group> {
    /// Database
    pub db: &'a Db,
    /// Avalanche
    pub avalanche: &'a Avalanche,
    /// Mempool
    pub mempool: &'a Mempool,
    /// The part of the mempool we search for this group's history.
    pub mempool_history: &'a MempoolGroupHistory<G>,
    /// Group to query txs by
    pub group: G,
    /// Access to bitcoind to read txs
    pub node: &'a Node,
    /// Whether the SLP/ALP token index is enabled
    pub is_token_index_enabled: bool,
    /// Whether the script hash index is enabled
    pub is_scripthash_index_enabled: bool,
    /// Map plugin name <-> plugin idx of all loaded plugins
    pub plugin_name_map: &'a PluginNameMap,
}

/// Errors indicating something went wrong with reading txs.
#[derive(Debug, Error, PartialEq)]
pub enum QueryGroupHistoryError {
    /// Transaction not in mempool.
    #[error("500: Inconsistent mempool: Transaction {0} not in mempool")]
    MissingMempoolTx(TxId),

    /// tx_num in group index but not in "tx" CF.
    #[error("500: Inconsistent DB: Transaction num {0} not in DB")]
    MissingDbTx(TxNum),

    /// tx_num in DB but has no block.
    #[error("500: Inconsistent DB: Transaction num {0} has no block")]
    MissingDbTxBlock(TxNum),

    /// Can only request page sizes below a certain maximum.
    #[error(
        "400: Requested page size {0} is too big, \
         maximum is {max_history_page_size}",
        max_history_page_size = MAX_HISTORY_PAGE_SIZE,
    )]
    RequestPageSizeTooBig(usize),

    /// Can only request page sizes below a certain minimum.
    #[error(
        "400: Requested page size {0} is too small, \
         minimum is {min_history_page_size}",
        min_history_page_size = MIN_HISTORY_PAGE_SIZE,
    )]
    RequestPageSizeTooSmall(usize),

    /// Script hash index not enabled
    #[error("400: Script hash index disabled")]
    ScriptHashIndexDisabled,
}

use self::QueryGroupHistoryError::*;

impl<'a, G: Group> QueryGroupHistory<'a, G> {
    fn member_ser_from_member(
        &self,
        member: &GroupMember<G::Member<'_>>,
        db_reader: &GroupHistoryReader<'_, G>,
    ) -> Result<Option<Bytes>> {
        match member {
            GroupMember::Member(member) => Ok(Some(Bytes::copy_from_slice(
                self.group.ser_member(member).as_ref(),
            ))),
            GroupMember::MemberHash(memberhash) => {
                if !self.is_scripthash_index_enabled {
                    return Err(ScriptHashIndexDisabled.into());
                }
                // Check the mempool first, then the db. The script is more
                // likely to be in the db, but accessing the mempool's
                // hashmap is faster.
                if let Some(member_ser) =
                    self.mempool_history.member_ser_by_member_hash(*memberhash)
                {
                    return Ok(Some(Bytes::copy_from_slice(member_ser)));
                }
                match db_reader.member_ser_by_member_hash(*memberhash)? {
                    Some(script_ser) => Ok(Some(Bytes::from(script_ser))),
                    None => Ok(None),
                }
            }
        }
    }

    /// Return the confirmed txs of the group in the order as txs occur on the
    /// blockchain, i.e.:
    /// - Sorted by block height ascendingly.
    /// - Within a block, sorted as txs occur in the block.
    pub fn confirmed_txs(
        &self,
        member: GroupMember<G::Member<'_>>,
        request_page_num: usize,
        request_page_size: usize,
    ) -> Result<proto::TxHistoryPage> {
        if request_page_size < MIN_HISTORY_PAGE_SIZE {
            return Err(RequestPageSizeTooSmall(request_page_size).into());
        }
        if request_page_size > MAX_HISTORY_PAGE_SIZE {
            return Err(RequestPageSizeTooBig(request_page_size).into());
        }
        let db_reader = GroupHistoryReader::<G>::new(self.db)?;
        let member_ser =
            match self.member_ser_from_member(&member, &db_reader)? {
                Some(m) => m,
                None => {
                    return Ok(proto::TxHistoryPage {
                        txs: vec![],
                        num_pages: 0,
                        num_txs: 0,
                    })
                }
            };
        let (num_db_pages, num_db_txs) =
            db_reader.member_num_pages_and_txs(member_ser.as_ref())?;
        let num_request_pages = num_db_txs.div_ceil(request_page_size);

        let make_result = |txs: Vec<proto::Tx>| {
            if txs.len() != txs.capacity() {
                // We should've predicted exactly how many txs we'll return.
                log!("WARNING: Allocated more txs than needed\n");
            }
            proto::TxHistoryPage {
                txs,
                num_pages: num_request_pages as u32,
                num_txs: num_db_txs as u32,
            }
        };

        // Initial index in the list of all txs of this script.
        // On 32-bit, this could overflow, so we saturate.
        let first_tx_idx = request_page_num.saturating_mul(request_page_size);

        // Calculate how many txs we're going to return, and allocate sufficient
        // space. Handle out-of-range pages by saturating.
        // Since at most `num_returned_txs` can be MAX_HISTORY_PAGE_SIZE, OOM
        // attacks are not possible.
        let num_returned_txs =
            request_page_size.min(num_db_txs.saturating_sub(first_tx_idx));
        let mut page_txs = Vec::with_capacity(num_returned_txs);

        // Short-circuit so we don't fetch DB again if no results.
        if num_returned_txs == 0 {
            return Ok(make_result(vec![]));
        }

        // First DB page to start reading from.
        let db_page_num_start = first_tx_idx / db_reader.page_size();
        // First tx index with that page.
        let mut first_inner_idx = first_tx_idx % db_reader.page_size();

        // Iterate DB pages, starting from the DB page the first tx is in.
        // Since DB pages are much larger than MAX_HISTORY_PAGE_SIZE, this will
        // only fetch 2 pages at most.
        for current_page_num in db_page_num_start..num_db_pages {
            let db_page_tx_nums = db_reader
                .page_txs(member_ser.as_ref(), current_page_num as u32)?
                .unwrap_or_default();
            for &tx_num in db_page_tx_nums.iter().skip(first_inner_idx) {
                page_txs.push(self.read_block_tx(tx_num)?);
                // We filled up the requested page size -> return
                if page_txs.len() == request_page_size {
                    return Ok(make_result(page_txs));
                }
            }
            first_inner_idx = 0;
        }

        // Couldn't fill requested page size completely
        Ok(make_result(page_txs))
    }

    /// Return the group history in reverse chronological order, i.e. the latest
    /// one first, including mempool txs.
    ///
    /// We start pages at the most recent mempool tx, go backwards in the
    /// mempool until we reach the oldest tx in the mempool, then continue with
    /// the most recent DB tx and go backwards from there.
    ///
    /// Note that unlike `confirmed_txs` and `unconfirmed_txs`, the order of txs
    /// observed by fetching multiple pages can change if new txs are added, or
    /// the page size is changed. This is because txs are fetched from the DB
    /// the order they appear on the blockchain, and only then are sorted by
    /// time_first_seen.
    ///
    /// This means that if tx1 < tx2 wrt time_first_seen, but tx2 < tx1 wrt
    /// txid, tx1 would be ordered *before* tx2 if they are in the same block
    /// (because of time_first_seen), but tx1 might be cut out for other page
    /// sizes entirely, because it isn't even queried because it comes "too
    /// late" on the blockchain (because of txid).
    ///
    /// We accept this trade-off, because if we wanted to always get consistent
    /// order here, we'd need to sort txs by time_first_seen in the DB, which
    /// isn't a very reliable metric. We could also continue reading more txs
    /// until we run into a new block, but that could open potential DoS
    /// attacks. And in practice this ordering isn't a big issue, as most people
    /// are mostly interested in the "latest" txs of the address.
    pub fn rev_history(
        &self,
        member: GroupMember<G::Member<'_>>,
        request_page_num: usize,
        request_page_size: usize,
    ) -> Result<proto::TxHistoryPage> {
        if request_page_size < MIN_HISTORY_PAGE_SIZE {
            return Err(RequestPageSizeTooSmall(request_page_size).into());
        }
        if request_page_size > MAX_HISTORY_PAGE_SIZE {
            return Err(RequestPageSizeTooBig(request_page_size).into());
        }

        let db_reader = GroupHistoryReader::<G>::new(self.db)?;
        let member_ser =
            match self.member_ser_from_member(&member, &db_reader)? {
                Some(m) => m,
                None => {
                    return Ok(proto::TxHistoryPage {
                        txs: vec![],
                        num_pages: 0,
                        num_txs: 0,
                    })
                }
            };
        let (_, num_db_txs) =
            db_reader.member_num_pages_and_txs(member_ser.as_ref())?;

        // How many txs in total to skip, beginning from the mempool txs, and
        // then continuing backwards into the DB txs.
        let request_tx_offset =
            request_page_num.saturating_mul(request_page_size);

        // All the mempool txs for this member
        let mempool_txs = self
            .mempool_history
            .member_history(member_ser.as_ref())
            .unwrap_or(&EMPTY_MEMBER_TX_HISTORY);

        let total_num_txs = mempool_txs.len() + num_db_txs;
        let total_num_pages = total_num_txs.div_ceil(request_page_size);
        let make_result = |txs: Vec<proto::Tx>| {
            assert_eq!(txs.len(), txs.capacity());
            proto::TxHistoryPage {
                txs,
                num_pages: total_num_pages as u32,
                num_txs: total_num_txs as u32,
            }
        };

        // Number of mempool txs in the result.
        // We saturate to clip numbers to >= 0.
        let num_page_mempool_txs = request_page_size
            .min(mempool_txs.len().saturating_sub(request_tx_offset));

        // Backwards offset into the DB. If this were zero, we'd start reading
        // at the last tx in the DB.
        let request_db_tx_offset =
            request_tx_offset.saturating_sub(mempool_txs.len());

        // DB txs left after skipping the requested offset.
        let num_db_txs_available =
            num_db_txs.saturating_sub(request_db_tx_offset);

        // How many DB txs we can return at most; the page could already be
        // partially filled with mempool txs. This cannot overflow as
        // num_page_mempool_txs <= request_page_size.
        let max_page_db_txs = request_page_size - num_page_mempool_txs;

        // How many DB txs we return. It's either the number of txs we have left
        // in the DB or the maximum we can still put on the page.
        let num_page_db_txs = max_page_db_txs.min(num_db_txs_available);

        // Allocate sufficient space for the txs on the page.
        let mut page_txs =
            Vec::with_capacity(num_page_mempool_txs + num_page_db_txs);

        // Add the requested mempool txs, we skip over the requested offset, and
        // take only as many as we can put on the page.
        let page_mempool_txs_iter = mempool_txs
            .iter()
            .rev()
            .skip(request_tx_offset)
            .take(request_page_size);
        for (_, txid) in page_mempool_txs_iter {
            let entry = self.mempool.tx(txid).ok_or(MissingMempoolTx(*txid))?;
            page_txs.push(make_tx_proto(MakeTxProtoParams {
                tx: &entry.tx,
                outputs_spent: &OutputsSpent::new_mempool(
                    self.mempool.spent_by().outputs_spent(txid),
                ),
                time_first_seen: entry.time_first_seen,
                is_coinbase: false,
                block: None,
                avalanche: self.avalanche,
                token: TxTokenData::from_mempool(
                    self.mempool.tokens(),
                    &entry.tx,
                )
                .as_ref(),
                plugin_outputs: &read_plugin_outputs(
                    self.db,
                    self.mempool,
                    &entry.tx,
                    None,
                    !self.plugin_name_map.is_empty(),
                )?,
                plugin_name_map: self.plugin_name_map,
            }));
        }

        // If we filled up the page with mempool txs, or there's no DB txs on
        // this page, we can return early to avoid reading the DB.
        if num_page_mempool_txs == request_page_size || num_page_db_txs == 0 {
            return Ok(make_result(page_txs));
        }

        // Initial index to start reading from in the list of all DB txs of this
        // member. We then iterate this backwards, until we fill the page or hit
        // the first DB tx of the member.
        // Note that this never overflows, as num_db_txs_available > 0 due to
        // the check num_page_db_txs == 0.
        let first_db_tx_idx = num_db_txs_available - 1;

        // First DB page to start reading from, from there we go backwards.
        let db_page_num_start = first_db_tx_idx / db_reader.page_size();
        // First tx index within that page, from there we go backwards.
        let mut first_inner_idx = first_db_tx_idx % db_reader.page_size();

        'outer: for current_page_num in (0..=db_page_num_start).rev() {
            let db_page_tx_nums = db_reader
                .page_txs(member_ser.as_ref(), current_page_num as u32)?
                .unwrap_or_default();
            for inner_idx in (0..=first_inner_idx).rev() {
                let tx_num = db_page_tx_nums[inner_idx];
                page_txs.push(self.read_block_tx(tx_num)?);
                // Filled up page: break out of outer loop.
                if page_txs.len() == request_page_size {
                    break 'outer;
                }
            }
            first_inner_idx = db_reader.page_size() - 1;
        }

        // We use stable sort, so the block order is retained when timestamps
        // are identical.
        page_txs[num_page_mempool_txs..].sort_by_key(|tx| {
            match (&tx.block, tx.time_first_seen) {
                // Within blocks, sort txs without time_first_seen first
                (Some(block), 0) => (-block.height, i64::MIN),
                // Otherwise, sort by time_first_seen within blocks
                (Some(block), time_first_seen) => {
                    (-block.height, -time_first_seen)
                }
                (None, _) => unreachable!("We skip sorting mempool txs"),
            }
        });

        Ok(make_result(page_txs))
    }

    /// Return the unconfirmed txs (i.e. all txs in the mempool) in first-seen
    /// order. If two txs have been seen at the same second, we order them by
    /// txid.
    ///
    /// This should always be small enough to return without pagination, but
    /// just to be future-proof, we always pretend as if there's exactly one
    /// page with all the txs (or 0 pages if there's no txs), so we can add
    /// pagination later.
    pub fn unconfirmed_txs(
        &self,
        member: GroupMember<G::Member<'_>>,
    ) -> Result<proto::TxHistoryPage> {
        let db_reader = GroupHistoryReader::<G>::new(self.db)?;
        let member_ser =
            match self.member_ser_from_member(&member, &db_reader)? {
                Some(m) => m,
                None => {
                    return Ok(proto::TxHistoryPage {
                        txs: vec![],
                        num_pages: 0,
                        num_txs: 0,
                    })
                }
            };
        let txs = match self.mempool_history.member_history(member_ser.as_ref())
        {
            Some(mempool_txs) => mempool_txs
                .iter()
                .map(|(_, txid)| -> Result<_> {
                    let entry =
                        self.mempool.tx(txid).ok_or(MissingMempoolTx(*txid))?;
                    Ok(make_tx_proto(MakeTxProtoParams {
                        tx: &entry.tx,
                        outputs_spent: &OutputsSpent::new_mempool(
                            self.mempool.spent_by().outputs_spent(txid),
                        ),
                        time_first_seen: entry.time_first_seen,
                        is_coinbase: false,
                        block: None,
                        avalanche: self.avalanche,
                        token: TxTokenData::from_mempool(
                            self.mempool.tokens(),
                            &entry.tx,
                        )
                        .as_ref(),
                        plugin_outputs: &read_plugin_outputs(
                            self.db,
                            self.mempool,
                            &entry.tx,
                            None,
                            !self.plugin_name_map.is_empty(),
                        )?,
                        plugin_name_map: self.plugin_name_map,
                    }))
                })
                .collect::<Result<Vec<_>>>()?,
            None => vec![],
        };
        Ok(proto::TxHistoryPage {
            num_pages: if txs.is_empty() { 0 } else { 1 },
            num_txs: txs.len() as u32,
            txs,
        })
    }

    fn read_block_tx(&self, tx_num: TxNum) -> Result<proto::Tx> {
        let tx_reader = TxReader::new(self.db)?;
        let block_reader = BlockReader::new(self.db)?;
        let spent_by_reader = SpentByReader::new(self.db)?;
        let block_tx =
            tx_reader.tx_by_tx_num(tx_num)?.ok_or(MissingDbTx(tx_num))?;
        let block = block_reader
            .by_height(block_tx.block_height)?
            .ok_or(MissingDbTxBlock(tx_num))?;
        let tx = Tx::from(self.node.bridge.load_tx(
            block.file_num,
            block_tx.entry.data_pos,
            block_tx.entry.undo_pos,
        )?);
        let outputs_spent = OutputsSpent::query(
            &spent_by_reader,
            &tx_reader,
            self.mempool.spent_by().outputs_spent(&block_tx.entry.txid),
            tx_num,
        )?;
        let token = TxTokenData::from_db(
            self.db,
            tx_num,
            &tx,
            self.is_token_index_enabled,
        )?;
        let plugin_outputs = read_plugin_outputs(
            self.db,
            self.mempool,
            &tx,
            Some(tx_num),
            !self.plugin_name_map.is_empty(),
        )?;
        Ok(make_tx_proto(MakeTxProtoParams {
            tx: &tx,
            outputs_spent: &outputs_spent,
            time_first_seen: block_tx.entry.time_first_seen,
            is_coinbase: block_tx.entry.is_coinbase,
            block: Some(&block),
            avalanche: self.avalanche,
            token: token.as_ref(),
            plugin_outputs: &plugin_outputs,
            plugin_name_map: self.plugin_name_map,
        }))
    }
}
