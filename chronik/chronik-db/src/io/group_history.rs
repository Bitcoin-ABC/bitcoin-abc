// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::{collections::HashMap, marker::PhantomData};

use abc_rust_error::Result;
use rocksdb::WriteBatch;

use crate::{
    db::{Db, CF},
    group::{tx_members_for_group, Group, GroupQuery},
    index_tx::IndexTx,
    io::TxNum,
    ser::{db_deserialize, db_serialize},
};

/// Represent page numbers with 32-bit unsigned integers.
type PageNum = u32;
const PAGE_SER_SIZE: usize = 4;

/// Configuration for group history reader/writers.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct GroupHistoryConf {
    /// Column family to store the group history entries.
    pub cf_name: &'static str,
    /// Page size for each member of the group.
    pub page_size: usize,
}

struct GroupHistoryColumn<'a> {
    db: &'a Db,
    cf: &'a CF,
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

impl<'a> GroupHistoryColumn<'a> {
    fn new(db: &'a Db, conf: &GroupHistoryConf) -> Result<Self> {
        let cf = db.cf(conf.cf_name)?;
        Ok(GroupHistoryColumn { db, cf })
    }

    fn get_page_txs(
        &self,
        member_ser: &[u8],
        page_num: PageNum,
    ) -> Result<Option<Vec<TxNum>>> {
        let key = key_for_member_page(member_ser, page_num);
        let value = match self.db.get(self.cf, &key)? {
            Some(value) => value,
            None => return Ok(None),
        };
        Ok(Some(db_deserialize::<Vec<TxNum>>(&value)?))
    }

    fn get_member_last_page(
        &self,
        member_ser: &[u8],
    ) -> Result<Option<(u32, Vec<TxNum>)>> {
        let last_key = key_for_member_page(member_ser, u32::MAX);
        let mut iter =
            self.db
                .iterator(self.cf, &last_key, rocksdb::Direction::Reverse);
        let (key, value) = match iter.next() {
            Some(result) => {
                let (key, value) = result?;
                if &key[..key.len() - PAGE_SER_SIZE] == member_ser {
                    (key, value)
                } else {
                    return Ok(None);
                }
            }
            None => return Ok(None),
        };
        let numbers = db_deserialize::<Vec<u64>>(&value)?;
        let page_num = PageNum::from_be_bytes(
            key[key.len() - PAGE_SER_SIZE..].try_into().unwrap(),
        );
        Ok(Some((page_num, numbers)))
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
    ) -> Result<()> {
        let grouped_txs = self.group_txs(txs);
        for (member, mut new_tx_nums) in grouped_txs {
            let member_ser: G::MemberSer<'_> = self.group.ser_member(&member);
            let (mut page_num, mut last_page_tx_nums) = self
                .col
                .get_member_last_page(member_ser.as_ref())?
                .unwrap_or((0, vec![]));
            while !new_tx_nums.is_empty() {
                let space_left = self.conf.page_size - last_page_tx_nums.len();
                let num_new_txs = space_left.min(new_tx_nums.len());
                last_page_tx_nums.extend(new_tx_nums.drain(..num_new_txs));
                batch.put_cf(
                    self.col.cf,
                    key_for_member_page(member_ser.as_ref(), page_num),
                    db_serialize(&last_page_tx_nums)?,
                );
                last_page_tx_nums.clear();
                page_num += 1;
            }
        }
        Ok(())
    }

    /// Group the txs, then delete them from each member of the group.
    pub fn delete(
        &self,
        batch: &mut WriteBatch,
        txs: &[IndexTx<'_>],
    ) -> Result<()> {
        let grouped_txs = self.group_txs(txs);
        for (member, removed_tx_nums) in grouped_txs {
            let member_ser: G::MemberSer<'_> = self.group.ser_member(&member);
            let mut num_remaining_removes = removed_tx_nums.len();
            let (mut page_num, mut last_page_tx_nums) = self
                .col
                .get_member_last_page(member_ser.as_ref())?
                .unwrap_or((0, vec![]));
            while num_remaining_removes > 0 {
                let num_page_removes =
                    last_page_tx_nums.len().min(num_remaining_removes);
                last_page_tx_nums
                    .drain(last_page_tx_nums.len() - num_page_removes..);
                let key = key_for_member_page(member_ser.as_ref(), page_num);
                if last_page_tx_nums.is_empty() {
                    batch.delete_cf(self.col.cf, key)
                } else {
                    batch.put_cf(
                        self.col.cf,
                        key,
                        db_serialize(&last_page_tx_nums)?,
                    );
                }
                num_remaining_removes -= num_page_removes;
                if page_num > 0 {
                    page_num -= 1;
                    last_page_tx_nums = self
                        .col
                        .get_page_txs(member_ser.as_ref(), page_num)?
                        .unwrap_or(vec![]);
                }
            }
        }
        Ok(())
    }

    fn group_txs<'tx>(
        &self,
        txs: &'tx [IndexTx<'tx>],
    ) -> HashMap<G::Member<'tx>, Vec<TxNum>> {
        let mut group_tx_nums = HashMap::<G::Member<'tx>, Vec<TxNum>>::new();
        for index_tx in txs {
            let query = GroupQuery {
                is_coinbase: index_tx.is_coinbase,
                tx: index_tx.tx,
            };
            for member in tx_members_for_group(&self.group, query) {
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
        columns.push(rocksdb::ColumnFamilyDescriptor::new(
            G::tx_history_conf().cf_name,
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
        match self.col.get_member_last_page(member_ser)? {
            Some((last_page_num, last_page_txs)) => {
                let last_page_num = last_page_num as usize;
                Ok((
                    last_page_num + 1,
                    self.conf.page_size * last_page_num + last_page_txs.len(),
                ))
            }
            None => Ok((0, 0)),
        }
    }

    /// Size of pages the data is stored in.
    pub fn page_size(&self) -> usize {
        self.conf.page_size
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
            group_history::PageNum, BlockTxs, GroupHistoryReader,
            GroupHistoryWriter, TxEntry, TxNum, TxWriter,
        },
        test::{make_value_tx, ser_value, ValueGroup},
    };

    #[test]
    fn test_value_group_history() -> Result<()> {
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-db--group_history")?;
        let mut cfs = Vec::new();
        GroupHistoryWriter::<ValueGroup>::add_cfs(&mut cfs);
        TxWriter::add_cfs(&mut cfs);
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;
        let tx_writer = TxWriter::new(&db)?;
        let group_writer = GroupHistoryWriter::new(&db, ValueGroup)?;
        let group_reader = GroupHistoryReader::<ValueGroup>::new(&db)?;

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
            let first_tx_num = tx_writer.insert(&mut batch, &txs_batch(txs))?;
            let index_txs = prepare_indexed_txs(&db, first_tx_num, txs)?;
            group_writer.insert(&mut batch, &index_txs)?;
            db.write_batch(batch)?;
            Ok(())
        };
        let disconnect_block = |txs: &[Tx]| -> Result<()> {
            let mut batch = WriteBatch::default();
            let first_tx_num = tx_writer.delete(&mut batch, &txs_batch(txs))?;
            let index_txs = prepare_indexed_txs(&db, first_tx_num, txs)?;
            group_writer.delete(&mut batch, &index_txs)?;
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

        Ok(())
    }
}
