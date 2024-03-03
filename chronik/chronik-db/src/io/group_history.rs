// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::{collections::BTreeMap, marker::PhantomData, time::Instant};

use abc_rust_error::Result;
use rocksdb::WriteBatch;
use thiserror::Error;

use crate::{
    db::{Db, CF},
    group::{tx_members_for_group, Group, GroupQuery},
    index_tx::IndexTx,
    io::{
        group_history::GroupHistoryError::*, merge::catch_merge_errors, TxNum,
    },
    ser::{db_deserialize_vec, db_serialize_vec},
};

/// Represent page numbers with 32-bit unsigned integers.
type PageNum = u32;
/// Represent num txs with 32-bit unsigned integers.
/// Note: This implies that scripts can at most have 2^32 txs.
type NumTxs = u32;

const CONCAT: u8 = b'C';
const TRIM: u8 = b'T';

/// Configuration for group history reader/writers.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct GroupHistoryConf {
    /// Column family to store the group history pages.
    pub cf_page_name: &'static str,
    /// Column family to store the last page num of the group history.
    pub cf_num_txs_name: &'static str,
    /// Page size for each member of the group.
    pub page_size: NumTxs,
}

struct GroupHistoryColumn<'a> {
    db: &'a Db,
    cf_page: &'a CF,
    cf_num_txs: &'a CF,
}

/// Write txs grouped and paginated to the DB.
///
/// This is primarily meant to store the tx history of an address, but it can
/// also be used to index the history of other groups, especially of new
/// protocols.
///
/// Txs are stored paginated, because in the case of addresses, there already
/// exist addresses with millions of txs. While RocksDB can handle multi MB
/// entries, it would significantly slow down both reading and writing of this
/// address, which could pose a DoS risk.
///
/// Each page is stored at the key `<serialized member> + <4-byte page num>`
///
/// Txs in a member are ordered strictly ascendingly, both within a page, and
/// also between pages, such that the entire tx history of a member can be
/// iterated by going through pages 0..N and going through all of the txs of
/// each page.
#[derive(Debug)]
pub struct GroupHistoryWriter<'a, G: Group> {
    col: GroupHistoryColumn<'a>,
    conf: GroupHistoryConf,
    group: G,
}

/// Read pages of grouped txs from the DB.
#[derive(Debug)]
pub struct GroupHistoryReader<'a, G: Group> {
    col: GroupHistoryColumn<'a>,
    conf: GroupHistoryConf,
    phantom: PhantomData<G>,
}

/// In-memory data for the tx history.
#[derive(Debug, Default)]
pub struct GroupHistoryMemData {
    /// Stats about cache hits, num requests etc.
    pub stats: GroupHistoryStats,
}

/// Stats about cache hits, num requests etc.
#[derive(Clone, Debug, Default)]
pub struct GroupHistoryStats {
    /// Total number of members updated.
    pub n_total: usize,
    /// Time [s] for insert/delete.
    pub t_total: f64,
    /// Time [s] for grouping txs.
    pub t_group: f64,
    /// Time [s] for serializing members.
    pub t_ser_members: f64,
    /// Time [s] for fetching existing tx data.
    pub t_fetch: f64,
}

/// Error indicating that something went wrong with writing group history data.
#[derive(Debug, Error, PartialEq, Eq)]
pub enum GroupHistoryError {
    /// Bad num_txs size
    #[error("Inconsistent DB: Bad num_txs size: {0:?}")]
    BadNumTxsSize(Vec<u8>),

    /// Used merge_cf incorrectly, prefix must either be C or T.
    #[error(
        "Bad usage of merge: Unknown prefix {0:02x}, expected C or T: {}",
        hex::encode(.1),
    )]
    UnknownOperandPrefix(u8, Vec<u8>),
}

struct FetchedNumTxs<'tx, G: Group> {
    members_num_txs: Vec<NumTxs>,
    grouped_txs: BTreeMap<G::Member<'tx>, Vec<TxNum>>,
    ser_members: Vec<G::MemberSer>,
}

pub(crate) fn bytes_to_num_txs(bytes: &[u8]) -> Result<NumTxs> {
    Ok(NumTxs::from_be_bytes(
        bytes
            .try_into()
            .map_err(|_| BadNumTxsSize(bytes.to_vec()))?,
    ))
}

fn partial_merge_concat_trim(
    _key: &[u8],
    _existing_value: Option<&[u8]>,
    _operands: &rocksdb::MergeOperands,
) -> Option<Vec<u8>> {
    // We don't use partial merge
    None
}

fn init_concat_trim(
    _key: &[u8],
    existing_value: Option<&[u8]>,
    operands: &rocksdb::MergeOperands,
) -> Result<Vec<u8>> {
    let mut bytes = existing_value.unwrap_or(&[]).to_vec();
    if operands.iter().all(|operand| operand[0] == CONCAT) {
        bytes.reserve_exact(
            operands.iter().map(|operand| operand.len() - 1).sum(),
        );
    }
    Ok(bytes)
}

fn apply_concat_trim(
    _key: &[u8],
    bytes: &mut Vec<u8>,
    operand: &[u8],
) -> Result<()> {
    if operand[0] == CONCAT {
        bytes.extend_from_slice(&operand[1..]);
    } else if operand[0] == TRIM {
        let trim_len = NumTxs::from_be_bytes(operand[1..5].try_into().unwrap());
        bytes.drain(bytes.len() - trim_len as usize..);
    } else {
        return Err(UnknownOperandPrefix(operand[0], operand.to_vec()).into());
    }
    Ok(())
}

fn ser_concat_trim(_key: &[u8], bytes: Vec<u8>) -> Result<Vec<u8>> {
    Ok(bytes)
}

impl<'a> GroupHistoryColumn<'a> {
    fn new(db: &'a Db, conf: &GroupHistoryConf) -> Result<Self> {
        let cf_page = db.cf(conf.cf_page_name)?;
        let cf_num_txs = db.cf(conf.cf_num_txs_name)?;
        Ok(GroupHistoryColumn {
            db,
            cf_page,
            cf_num_txs,
        })
    }

    fn get_page_txs(
        &self,
        member_ser: &[u8],
        page_num: PageNum,
    ) -> Result<Option<Vec<TxNum>>> {
        let key = key_for_member_page(member_ser, page_num);
        let value = match self.db.get(self.cf_page, &key)? {
            Some(value) => value,
            None => return Ok(None),
        };
        Ok(Some(db_deserialize_vec::<TxNum>(&value)?))
    }
}

impl<'a, G: Group> GroupHistoryWriter<'a, G> {
    /// Create a new [`GroupHistoryWriter`].
    pub fn new(db: &'a Db, group: G) -> Result<Self> {
        let conf = G::tx_history_conf();
        let col = GroupHistoryColumn::new(db, &conf)?;
        Ok(GroupHistoryWriter { col, conf, group })
    }

    /// Group the txs, then insert them to into each member of the group.
    pub fn insert(
        &self,
        batch: &mut WriteBatch,
        txs: &[IndexTx<'_>],
        aux: &G::Aux,
        mem_data: &mut GroupHistoryMemData,
    ) -> Result<()> {
        let t_start = Instant::now();
        let fetched = self.fetch_members_num_txs(txs, aux, mem_data)?;
        for ((mut new_tx_nums, member_ser), mut num_txs) in fetched
            .grouped_txs
            .into_values()
            .zip(fetched.ser_members)
            .zip(fetched.members_num_txs)
        {
            let mut page_num = num_txs / self.conf.page_size;
            let mut last_page_num_txs = num_txs % self.conf.page_size;
            loop {
                let space_left =
                    (self.conf.page_size - last_page_num_txs) as usize;
                let num_new_txs = space_left.min(new_tx_nums.len());
                let merge_tx_nums =
                    db_serialize_vec(new_tx_nums.drain(..num_new_txs))?;
                batch.merge_cf(
                    self.col.cf_page,
                    key_for_member_page(member_ser.as_ref(), page_num),
                    [[CONCAT].as_ref(), &merge_tx_nums].concat(),
                );
                num_txs += num_new_txs as NumTxs;
                if new_tx_nums.is_empty() {
                    batch.put_cf(
                        self.col.cf_num_txs,
                        member_ser.as_ref(),
                        num_txs.to_be_bytes(),
                    );
                    break;
                }
                last_page_num_txs = 0;
                page_num += 1;
            }
        }
        mem_data.stats.t_total += t_start.elapsed().as_secs_f64();
        Ok(())
    }

    /// Group the txs, then delete them from each member of the group.
    pub fn delete(
        &self,
        batch: &mut WriteBatch,
        txs: &[IndexTx<'_>],
        aux: &G::Aux,
        mem_data: &mut GroupHistoryMemData,
    ) -> Result<()> {
        let t_start = Instant::now();
        let fetched = self.fetch_members_num_txs(txs, aux, mem_data)?;
        for ((mut removed_tx_nums, member_ser), mut num_txs) in fetched
            .grouped_txs
            .into_values()
            .zip(fetched.ser_members)
            .zip(fetched.members_num_txs)
        {
            let mut num_remaining_removes = removed_tx_nums.len();
            let mut page_num = num_txs / self.conf.page_size;
            let mut last_page_num_txs = num_txs % self.conf.page_size;
            loop {
                let num_page_removes =
                    (last_page_num_txs as usize).min(num_remaining_removes);
                let key = key_for_member_page(member_ser.as_ref(), page_num);
                if num_page_removes == last_page_num_txs as usize {
                    batch.delete_cf(self.col.cf_page, key)
                } else {
                    let merge_removed_txs = db_serialize_vec(
                        removed_tx_nums
                            .drain(removed_tx_nums.len() - num_page_removes..),
                    )?;
                    let num_trimmed_bytes = merge_removed_txs.len() as NumTxs;
                    batch.merge_cf(
                        self.col.cf_page,
                        key,
                        [[TRIM].as_ref(), &num_trimmed_bytes.to_be_bytes()]
                            .concat(),
                    );
                }
                num_txs -= num_page_removes as NumTxs;
                num_remaining_removes -= num_page_removes;
                if num_remaining_removes == 0 {
                    if num_txs > 0 {
                        batch.put_cf(
                            self.col.cf_num_txs,
                            member_ser.as_ref(),
                            num_txs.to_be_bytes(),
                        );
                    } else {
                        batch.delete_cf(
                            self.col.cf_num_txs,
                            member_ser.as_ref(),
                        );
                    }
                    break;
                }
                if page_num > 0 {
                    page_num -= 1;
                    last_page_num_txs = self.conf.page_size;
                }
            }
        }
        mem_data.stats.t_total += t_start.elapsed().as_secs_f64();
        Ok(())
    }

    fn fetch_members_num_txs<'tx>(
        &self,
        txs: &'tx [IndexTx<'tx>],
        aux: &G::Aux,
        mem_data: &mut GroupHistoryMemData,
    ) -> Result<FetchedNumTxs<'tx, G>> {
        let GroupHistoryMemData { stats } = mem_data;
        let t_group = Instant::now();
        let grouped_txs = self.group_txs(txs, aux);
        stats.t_group += t_group.elapsed().as_secs_f64();

        let t_ser_members = Instant::now();
        let ser_members = grouped_txs
            .keys()
            .map(|key| self.group.ser_member(key))
            .collect::<Vec<_>>();
        stats.t_ser_members += t_ser_members.elapsed().as_secs_f64();

        stats.n_total += grouped_txs.len();

        let t_fetch = Instant::now();
        let num_txs_keys =
            ser_members.iter().map(|member_ser| member_ser.as_ref());
        let fetched_num_txs =
            self.col
                .db
                .multi_get(self.col.cf_num_txs, num_txs_keys, true)?;
        let mut members_num_txs = Vec::with_capacity(fetched_num_txs.len());
        for db_num_txs in fetched_num_txs {
            members_num_txs.push(match db_num_txs {
                Some(db_num_txs) => bytes_to_num_txs(&db_num_txs)?,
                None => 0,
            });
        }
        stats.t_fetch += t_fetch.elapsed().as_secs_f64();

        Ok(FetchedNumTxs {
            members_num_txs,
            grouped_txs,
            ser_members,
        })
    }

    fn group_txs<'tx>(
        &self,
        txs: &'tx [IndexTx<'tx>],
        aux: &G::Aux,
    ) -> BTreeMap<G::Member<'tx>, Vec<TxNum>> {
        let mut group_tx_nums = BTreeMap::<G::Member<'tx>, Vec<TxNum>>::new();
        for index_tx in txs {
            let query = GroupQuery {
                is_coinbase: index_tx.is_coinbase,
                tx: index_tx.tx,
            };
            for member in tx_members_for_group(&self.group, query, aux) {
                let tx_nums = group_tx_nums.entry(member).or_default();
                if let Some(&last_tx_num) = tx_nums.last() {
                    if last_tx_num == index_tx.tx_num {
                        continue;
                    }
                }
                tx_nums.push(index_tx.tx_num);
            }
        }
        group_tx_nums
    }

    pub(crate) fn add_cfs(columns: &mut Vec<rocksdb::ColumnFamilyDescriptor>) {
        let conf = G::tx_history_conf();
        let mut page_options = rocksdb::Options::default();
        let merge_op_name = format!("{}::merge_op_concat", conf.cf_page_name);
        page_options.set_merge_operator(
            merge_op_name.as_str(),
            catch_merge_errors(
                init_concat_trim,
                apply_concat_trim,
                ser_concat_trim,
            ),
            partial_merge_concat_trim,
        );
        columns.push(rocksdb::ColumnFamilyDescriptor::new(
            conf.cf_page_name,
            page_options,
        ));
        columns.push(rocksdb::ColumnFamilyDescriptor::new(
            conf.cf_num_txs_name,
            rocksdb::Options::default(),
        ));
    }
}

impl std::fmt::Debug for GroupHistoryColumn<'_> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "GroupHistoryColumn {{ .. }}")
    }
}

impl<'a, G: Group> GroupHistoryReader<'a, G> {
    /// Create a new [`GroupHistoryReader`].
    pub fn new(db: &'a Db) -> Result<Self> {
        let conf = G::tx_history_conf();
        let col = GroupHistoryColumn::new(db, &conf)?;
        Ok(GroupHistoryReader {
            col,
            conf,
            phantom: PhantomData,
        })
    }

    /// Read the tx_nums for the given member on the given page, or None, if the
    /// page doesn't exist in the DB.
    pub fn page_txs(
        &self,
        member_ser: &[u8],
        page_num: PageNum,
    ) -> Result<Option<Vec<TxNum>>> {
        self.col.get_page_txs(member_ser, page_num)
    }

    /// Total number of pages and txs for this serialized member.
    /// The result tuple is (num_pages, num_txs).
    pub fn member_num_pages_and_txs(
        &self,
        member_ser: &[u8],
    ) -> Result<(usize, usize)> {
        let num_txs = match self.col.db.get(self.col.cf_num_txs, member_ser)? {
            Some(bytes) => bytes_to_num_txs(&bytes)?,
            None => return Ok((0, 0)),
        };
        let num_pages =
            (num_txs + self.conf.page_size - 1) / self.conf.page_size;
        Ok((num_pages as usize, num_txs as usize))
    }

    /// Size of pages the data is stored in.
    pub fn page_size(&self) -> usize {
        self.conf.page_size as usize
    }
}

fn key_for_member_page(member_ser: &[u8], page_num: PageNum) -> Vec<u8> {
    [member_ser, &page_num.to_be_bytes()].concat()
}

#[cfg(test)]
mod tests {
    use std::cell::RefCell;

    use abc_rust_error::Result;
    use bitcoinsuite_core::tx::Tx;
    use rocksdb::WriteBatch;

    use crate::{
        db::Db,
        index_tx::prepare_indexed_txs,
        io::{
            group_history::PageNum,
            merge::{check_for_errors, MERGE_ERROR_LOCK},
            BlockTxs, GroupHistoryMemData, GroupHistoryReader,
            GroupHistoryWriter, TxEntry, TxNum, TxWriter, TxsMemData,
        },
        test::{make_value_tx, ser_value, ValueGroup},
    };

    #[test]
    fn test_value_group_history() -> Result<()> {
        let _guard = MERGE_ERROR_LOCK.lock().unwrap();
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-db--group_history")?;
        let mut cfs = Vec::new();
        GroupHistoryWriter::<ValueGroup>::add_cfs(&mut cfs);
        TxWriter::add_cfs(&mut cfs);
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;
        let tx_writer = TxWriter::new(&db)?;
        let group_writer = GroupHistoryWriter::new(&db, ValueGroup)?;
        let group_reader = GroupHistoryReader::<ValueGroup>::new(&db)?;
        let mem_data = RefCell::new(GroupHistoryMemData::default());
        let txs_mem_data = RefCell::new(TxsMemData::default());

        let block_height = RefCell::new(-1);
        let txs_batch = |txs: &[Tx]| BlockTxs {
            txs: txs
                .iter()
                .map(|tx| TxEntry {
                    txid: tx.txid(),
                    ..Default::default()
                })
                .collect(),
            block_height: *block_height.borrow(),
        };
        let connect_block = |txs: &[Tx]| -> Result<()> {
            let mut batch = WriteBatch::default();
            *block_height.borrow_mut() += 1;
            let first_tx_num = tx_writer.insert(
                &mut batch,
                &txs_batch(txs),
                &mut txs_mem_data.borrow_mut(),
            )?;
            let index_txs = prepare_indexed_txs(&db, first_tx_num, txs)?;
            group_writer.insert(
                &mut batch,
                &index_txs,
                &(),
                &mut mem_data.borrow_mut(),
            )?;
            db.write_batch(batch)?;
            Ok(())
        };
        let disconnect_block = |txs: &[Tx]| -> Result<()> {
            let mut batch = WriteBatch::default();
            let first_tx_num = tx_writer.delete(
                &mut batch,
                &txs_batch(txs),
                &mut txs_mem_data.borrow_mut(),
            )?;
            let index_txs = prepare_indexed_txs(&db, first_tx_num, txs)?;
            group_writer.delete(
                &mut batch,
                &index_txs,
                &(),
                &mut mem_data.borrow_mut(),
            )?;
            db.write_batch(batch)?;
            *block_height.borrow_mut() -= 1;
            Ok(())
        };

        let read_page =
            |val: i64, page_num: PageNum| -> Result<Option<Vec<TxNum>>> {
                group_reader.page_txs(&ser_value(val), page_num)
            };

        let read_num_pages_and_txs = |val: i64| -> Result<(usize, usize)> {
            group_reader.member_num_pages_and_txs(&ser_value(val))
        };

        // Only adds an entry for value=10 (coinbase inputs are ignored)
        let block0 = [make_value_tx(0, [0xffff], [10])];
        connect_block(&block0)?;
        assert_eq!(read_page(0xffff, 0)?, None);
        assert_eq!(read_num_pages_and_txs(0xffff)?, (0, 0));

        assert_eq!(read_page(10, 0)?, Some(vec![0]));
        assert_eq!(read_num_pages_and_txs(10)?, (1, 1));

        // Block that adds a lot of pages to value=10, one entry to value=20
        let block1 = [
            make_value_tx(1, [0xffff], [10]),
            make_value_tx(2, [10], []),
            make_value_tx(3, [20], []), // value=20
            make_value_tx(4, [10], []),
            make_value_tx(5, [10], []),
            make_value_tx(6, [10], []),
            make_value_tx(7, [10], []),
            make_value_tx(8, [10], []),
            make_value_tx(9, [10], []),
        ];
        connect_block(&block1)?;
        assert_eq!(read_page(0xffff, 0)?, None);
        assert_eq!(read_page(10, 0)?, Some(vec![0, 1, 2, 4]));
        assert_eq!(read_page(10, 1)?, Some(vec![5, 6, 7, 8]));
        assert_eq!(read_page(10, 2)?, Some(vec![9]));
        assert_eq!(read_page(10, 3)?, None);
        assert_eq!(read_num_pages_and_txs(10)?, (3, 9));

        assert_eq!(read_page(20, 0)?, Some(vec![3]));
        assert_eq!(read_page(20, 1)?, None);
        assert_eq!(read_num_pages_and_txs(20)?, (1, 1));

        // Only tx_num=0 remains
        // The other pages have been removed from the DB entirely
        disconnect_block(&block1)?;
        assert_eq!(read_page(0xffff, 0)?, None);
        assert_eq!(read_page(10, 0)?, Some(vec![0]));
        assert_eq!(read_page(10, 1)?, None);
        assert_eq!(read_page(10, 2)?, None);
        assert_eq!(read_page(20, 0)?, None);

        // Re-org block, with all kinds of input + output values
        let block1 = [
            make_value_tx(1, [0xffff], [10]),
            make_value_tx(2, [10], [10, 20, 30]),
            make_value_tx(3, [10, 40], [10, 10, 40]),
            make_value_tx(4, [10], [40, 30, 40]),
        ];
        connect_block(&block1)?;
        // all txs add to value=10, with 2 pages
        assert_eq!(read_page(10, 0)?, Some(vec![0, 1, 2, 3]));
        assert_eq!(read_page(10, 1)?, Some(vec![4]));
        assert_eq!(read_num_pages_and_txs(10)?, (2, 5));
        // only tx_num=2 adds to value=20
        assert_eq!(read_page(20, 0)?, Some(vec![2]));
        assert_eq!(read_num_pages_and_txs(20)?, (1, 1));
        // tx_num=2 and tx_num=4 add to value=30
        assert_eq!(read_page(30, 0)?, Some(vec![2, 4]));
        assert_eq!(read_num_pages_and_txs(30)?, (1, 2));
        // tx_num=3 and tx_num=4 add to value=40
        assert_eq!(read_page(40, 0)?, Some(vec![3, 4]));
        assert_eq!(read_num_pages_and_txs(40)?, (1, 2));

        // Delete that block also
        disconnect_block(&block1)?;
        assert_eq!(read_page(0xffff, 0)?, None);
        assert_eq!(read_page(10, 0)?, Some(vec![0]));
        assert_eq!(read_page(10, 1)?, None);
        assert_eq!(read_page(20, 0)?, None);
        assert_eq!(read_page(30, 0)?, None);
        assert_eq!(read_page(40, 0)?, None);

        // Add it back in
        connect_block(&block1)?;
        // Add new block, adding 1 tx to 20, 6 txs to 30, 4 txs to 40
        let block2 = [
            make_value_tx(5, [0xffff], [40, 30]),
            make_value_tx(6, [30, 10], [30]),
            make_value_tx(7, [10], [30]),
            make_value_tx(8, [40], [30]),
            make_value_tx(9, [10], [20]),
        ];
        connect_block(&block2)?;
        assert_eq!(read_page(10, 0)?, Some(vec![0, 1, 2, 3]));
        assert_eq!(read_page(10, 1)?, Some(vec![4, 6, 7, 9]));
        assert_eq!(read_page(10, 2)?, None);
        assert_eq!(read_num_pages_and_txs(10)?, (2, 8));

        assert_eq!(read_page(20, 0)?, Some(vec![2, 9]));
        assert_eq!(read_page(20, 1)?, None);
        assert_eq!(read_num_pages_and_txs(20)?, (1, 2));

        assert_eq!(read_page(30, 0)?, Some(vec![2, 4, 5, 6]));
        assert_eq!(read_page(30, 1)?, Some(vec![7, 8]));
        assert_eq!(read_page(30, 2)?, None);
        assert_eq!(read_num_pages_and_txs(30)?, (2, 6));

        assert_eq!(read_page(40, 0)?, Some(vec![3, 4, 5, 8]));
        assert_eq!(read_page(40, 1)?, None);
        assert_eq!(read_num_pages_and_txs(40)?, (1, 4));

        // Remove all blocks
        disconnect_block(&block2)?;
        assert_eq!(read_page(10, 0)?, Some(vec![0, 1, 2, 3]));
        assert_eq!(read_page(10, 1)?, Some(vec![4]));
        assert_eq!(read_page(20, 0)?, Some(vec![2]));
        assert_eq!(read_page(30, 0)?, Some(vec![2, 4]));
        assert_eq!(read_page(30, 1)?, None);
        assert_eq!(read_page(40, 0)?, Some(vec![3, 4]));
        assert_eq!(read_page(40, 1)?, None);

        disconnect_block(&block1)?;
        assert_eq!(read_page(10, 0)?, Some(vec![0]));
        assert_eq!(read_page(10, 1)?, None);
        assert_eq!(read_page(20, 0)?, None);
        assert_eq!(read_page(30, 0)?, None);
        assert_eq!(read_page(40, 0)?, None);

        disconnect_block(&block0)?;
        assert_eq!(read_page(10, 0)?, None);

        drop(db);
        rocksdb::DB::destroy(&rocksdb::Options::default(), tempdir.path())?;
        let _ = check_for_errors();

        Ok(())
    }
}
