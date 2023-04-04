// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`QueryGroupHistory`], to query the tx history of a group.

use abc_rust_error::Result;
use bitcoinsuite_core::tx::Tx;
use chronik_bridge::ffi;
use chronik_db::{
    db::Db,
    group::Group,
    io::{BlockReader, GroupHistoryReader, TxNum, TxReader},
};
use chronik_proto::proto;
use chronik_util::log;
use thiserror::Error;

use crate::query::make_tx_proto;

/// Smallest allowed page size
pub const MIN_HISTORY_PAGE_SIZE: usize = 1;
/// Largest allowed page size
pub const MAX_HISTORY_PAGE_SIZE: usize = 200;

/// Query pages of the tx history of a group
#[derive(Debug)]
pub struct QueryGroupHistory<'a, G: Group> {
    /// Database
    pub db: &'a Db,
    /// Group to query txs by
    pub group: G,
}

/// Errors indicating something went wrong with reading txs.
#[derive(Debug, Error, PartialEq)]
pub enum QueryGroupHistoryError {
    /// tx_num in group index but not in "tx" CF.
    #[error("500: Inconsistent DB: Transaction num {0} not in DB")]
    MissingDbTx(TxNum),

    /// tx_num in DB but has no block.
    #[error("500: Inconsistent DB: Transaction num {0} has no block")]
    MissingDbTxBlock(TxNum),

    /// Can only request page sizes below a certain maximum.
    #[error(
        "400: Requested page size {0} is too big, maximum is {}",
        MAX_HISTORY_PAGE_SIZE
    )]
    RequestPageSizeTooBig(usize),

    /// Can only request page sizes below a certain minimum.
    #[error(
        "400: Requested page size {0} is too small, minimum is {}",
        MIN_HISTORY_PAGE_SIZE
    )]
    RequestPageSizeTooSmall(usize),
}

use self::QueryGroupHistoryError::*;

impl<'a, G: Group> QueryGroupHistory<'a, G> {
    /// Return the confirmed txs of the group in the order as txs occur on the
    /// blockchain, i.e.:
    /// - Sorted by block height ascendingly.
    /// - Within a block, sorted as txs occur in the block.
    pub fn confirmed_txs(
        &self,
        member: G::Member<'_>,
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
        let member_ser = self.group.ser_member(member);

        let (num_db_pages, num_db_txs) =
            db_reader.member_num_pages_and_txs(member_ser.as_ref())?;
        let num_request_pages =
            (num_db_txs + request_page_size - 1) / request_page_size;

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

    fn read_block_tx(&self, tx_num: TxNum) -> Result<proto::Tx> {
        let tx_reader = TxReader::new(self.db)?;
        let block_reader = BlockReader::new(self.db)?;
        let block_tx =
            tx_reader.tx_by_tx_num(tx_num)?.ok_or(MissingDbTx(tx_num))?;
        let block = block_reader
            .by_height(block_tx.block_height)?
            .ok_or(MissingDbTxBlock(tx_num))?;
        let tx = ffi::load_tx(
            block.file_num,
            block_tx.entry.data_pos,
            block_tx.entry.undo_pos,
        )?;
        Ok(make_tx_proto(
            &Tx::from(tx),
            block_tx.entry.time_first_seen,
            block_tx.entry.is_coinbase,
            Some(&block),
        ))
    }
}
