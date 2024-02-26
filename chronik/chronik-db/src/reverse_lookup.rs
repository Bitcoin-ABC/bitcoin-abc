// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing [`LookupColumn`] and [`ReverseLookup`].
//!
//! Allows reverse-looking up data that has been indexed using a serial number.
//!
//! Say you have the following column:
//!
//! `SerialNum -> Data`
//!
//! This could be mapping:
//! - `BlockHeight -> SerBlock`, where `SerBlock` includes `BlockHash` and some
//!   header data).
//! - `TxNum -> SerTx`, where `SerTx` includes `TxId` and some other data.
//!
//! `Data` contains a hash `[u8; 32]` that you might look up from.
//!
//! This would be the `BlockHash` for a `BlockHeight -> BlockMeta` column and
//! `TxId` for a `TxNum -> TxMeta` column.
//!
//! We *could* simply add a table `[u8; 32] -> SerialNum`, e.g. `TxId -> TxNum`,
//! but this would redundantly store the hash of the tx twice.
//!
//! Instead, we store:
//!
//! `CheapHash -> [SerialNum]`
//!
//! The `[]` indicate a list of `SerialNum`s, as the hash function for
//! `CheapHash` is not cryptographically secure and only outputs 4-8 bytes.
//! It therefore is expected to occasionally have collisions, which are tracked
//! in a list.
//!
//! Then, you can use [`ReverseLookup`] to maintain an index from `[u8; 32]` to
//! `SerialNum` compactly.
//!
//! To resolve collisions during lookup from `[u8; 32]`:
//! 1. Hash `[u8; 32]` to get `CheapHash`.
//! 2. Lookup the matching `SerialNum`s in the index and iterate over them.
//! 3. Lookup the `Data` in the original `SerialNum -> Data` table.
//! 4. Test whether `Data` has the queried `[u8; 32]`, and return that.
//! 5. Otherwise, `Key` is not part of the database.

use std::{
    collections::{BTreeSet, HashMap},
    fmt::{Debug, Display},
    hash::Hash,
    marker::PhantomData,
};

use abc_rust_error::Result;
use rocksdb::{ColumnFamilyDescriptor, WriteBatch};
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::{
    db::{Db, CF},
    io::merge::catch_merge_errors,
    reverse_lookup::IndexError::*,
    ser::{db_deserialize, db_serialize},
};

/// Struct for maintaining a reverse lookup index.
/// You cannot construct this; you should use a typedef:
///
/// `type MyIndex = ReverseLookup<MyColumn>`
///
/// Then you can use the associated functions like this:
///
/// `MyIndex::insert_pairs(db, batch, [(1234, &[123; 32])])?;`
pub(crate) struct ReverseLookup<L: LookupColumn>(PhantomData<L>);

/// Trait providing the data to build a reverse lookup index.
pub(crate) trait LookupColumn {
    /// Number uniquely identifying `Value`s, e.g. `BlockHeight` or `TxNum`.
    type SerialNum: Copy
        + for<'a> Deserialize<'a>
        + Display
        + Ord
        + Serialize
        + 'static;

    /// A short hash, compacting keys of type `[u8; 32]`.
    type CheapHash: AsRef<[u8]> + Eq + Hash;

    /// Data stored in the column, e.g. `SerBlock`.
    type Data;

    /// Name of the `SerialNum -> Value` CF.
    const CF_DATA: &'static str;
    /// Name of the `CheapHash -> [SerialNum]` CF.
    const CF_INDEX: &'static str;

    /// Calculate a short `CheapHash` from the given key.
    fn cheap_hash(key: &[u8; 32]) -> Self::CheapHash;

    /// Extract the key to index by from the data.
    fn data_key(value: &Self::Data) -> &[u8; 32];

    /// Fetch the data from the db using the serial num.
    fn get_data(&self, number: Self::SerialNum) -> Result<Option<Self::Data>>;
}

#[derive(Debug, Error, PartialEq)]
pub(crate) enum IndexError {
    #[error(
        "Inconsistent DB: Lookup index {cf_data_name} contains {serial_str}, \
         but value column {cf_index_name} doesn't"
    )]
    NotInDataColumn {
        serial_str: String,
        cf_data_name: &'static str,
        cf_index_name: &'static str,
    },

    #[error(
        "Inconsistent DB: Tried inserting {serial_str} into {cf_index_name}, \
         but value already exists"
    )]
    SerialNumAlreadyExists {
        serial_str: String,
        cf_index_name: &'static str,
    },
}

impl IndexError {
    fn not_in_data_column<L: LookupColumn>(serial: L::SerialNum) -> IndexError {
        NotInDataColumn {
            serial_str: serial.to_string(),
            cf_data_name: L::CF_DATA,
            cf_index_name: L::CF_INDEX,
        }
    }
}

fn partial_merge_ordered_list(
    _key: &[u8],
    _existing_value: Option<&[u8]>,
    _operands: &rocksdb::MergeOperands,
) -> Option<Vec<u8>> {
    // We don't use partial merge
    None
}

fn init_ordered_list<SN: for<'a> Deserialize<'a>>(
    _key: &[u8],
    existing_value: Option<&[u8]>,
    operands: &rocksdb::MergeOperands,
) -> Result<Vec<SN>> {
    let mut nums = match existing_value {
        Some(num) => db_deserialize::<Vec<SN>>(num)?,
        None => vec![],
    };
    nums.reserve_exact(operands.len());
    Ok(nums)
}

fn apply_ordered_list<SN: for<'a> Deserialize<'a> + Display + Ord>(
    cf_index_name: &'static str,
    nums: &mut Vec<SN>,
    operand: &[u8],
) -> Result<()> {
    let num = db_deserialize::<SN>(operand)?;
    match nums.binary_search(&num) {
        Ok(_) => {
            return Err(SerialNumAlreadyExists {
                serial_str: num.to_string(),
                cf_index_name,
            }
            .into())
        }
        Err(insert_idx) => nums.insert(insert_idx, num),
    }
    Ok(())
}

fn ser_ordered_list<SN: Serialize>(
    _key: &[u8],
    nums: Vec<SN>,
) -> Result<Vec<u8>> {
    db_serialize::<Vec<SN>>(&nums)
}

impl<L: LookupColumn> ReverseLookup<L> {
    /// Add the cfs required by the reverse lookup index.
    pub(crate) fn add_cfs(columns: &mut Vec<ColumnFamilyDescriptor>) {
        let mut options = rocksdb::Options::default();
        let merge_op_name = format!("{}::merge_ordered_list", L::CF_INDEX);
        options.set_merge_operator(
            merge_op_name.as_str(),
            catch_merge_errors::<Vec<L::SerialNum>>(
                init_ordered_list::<L::SerialNum>,
                |_, nums, operand| {
                    apply_ordered_list(L::CF_INDEX, nums, operand)
                },
                ser_ordered_list::<L::SerialNum>,
            ),
            partial_merge_ordered_list,
        );
        columns.push(ColumnFamilyDescriptor::new(L::CF_INDEX, options));
    }

    /// Read by key from the DB using the index.
    pub(crate) fn get(
        lookup_column: &L,
        db: &Db,
        key: &[u8; 32],
    ) -> Result<Option<(L::SerialNum, L::Data)>> {
        let cf_index = db.cf(L::CF_INDEX)?;
        let cheap_hash = L::cheap_hash(key);
        // Lookup CheapHash -> [SerialNum]
        let serials = match db.get(cf_index, cheap_hash)? {
            Some(serials) => serials,
            None => return Ok(None),
        };
        // Iterate serials, read each's data, find the one with the given key.
        //
        // This could in theory be a DoS attack by purposefully having the
        // indexer index lots of colliding keys, however, since keys are
        // expected to use a cryptographically secure hash function (e.g.
        // SHA-256), it will be expensive to find data that actually collides.
        for serial in db_deserialize::<Vec<L::SerialNum>>(&serials)? {
            let value = lookup_column
                .get_data(serial)?
                .ok_or_else(|| IndexError::not_in_data_column::<L>(serial))?;
            if L::data_key(&value) == key {
                return Ok(Some((serial, value)));
            }
        }
        // We have a key that collides with others but no actual match
        Ok(None)
    }

    /// Insert into the index.
    pub(crate) fn insert_pairs<'a>(
        db: &Db,
        batch: &mut WriteBatch,
        pairs: impl IntoIterator<Item = (L::SerialNum, &'a [u8; 32])>,
    ) -> Result<()> {
        let cf_index = db.cf(L::CF_INDEX)?;
        // Use merge_cf to insert serials into the cheap hashes of the keys
        for (serial, key) in pairs {
            let cheap_hash = L::cheap_hash(key);
            batch.merge_cf(cf_index, cheap_hash, db_serialize(&serial)?);
        }
        Ok(())
    }

    /// Delete from the index.
    pub(crate) fn delete_pairs<'a>(
        db: &Db,
        batch: &mut WriteBatch,
        pairs: impl IntoIterator<Item = (L::SerialNum, &'a [u8; 32])>,
    ) -> Result<()> {
        let cf_index = db.cf(L::CF_INDEX)?;
        let mut new_entries =
            HashMap::<L::CheapHash, BTreeSet<L::SerialNum>>::new();
        for (serial, key) in pairs {
            let serials =
                Self::get_or_fetch(db, cf_index, &mut new_entries, key)?;
            if !serials.remove(&serial) {
                return Err(IndexError::not_in_data_column::<L>(serial).into());
            }
        }
        for (key, serials) in new_entries {
            if serials.is_empty() {
                // Delete the entry from the DB if it doesn't contain any
                // serials anymore
                batch.delete_cf(cf_index, key);
            } else {
                // Otherwise, override entry with only the remaining serials
                let serials = db_serialize(&Vec::from_iter(serials))?;
                batch.put_cf(cf_index, key, &serials);
            }
        }
        Ok(())
    }

    /// Query from `new_entries`, or from DB and then store in `new_entries`.
    fn get_or_fetch<'a>(
        db: &Db,
        index_cf: &CF,
        new_entries: &'a mut HashMap<L::CheapHash, BTreeSet<L::SerialNum>>,
        key: &[u8; 32],
    ) -> Result<&'a mut BTreeSet<L::SerialNum>> {
        use std::collections::hash_map::Entry;
        let cheap_hash = L::cheap_hash(key);
        match new_entries.entry(cheap_hash) {
            Entry::Occupied(entry) => Ok(entry.into_mut()),
            Entry::Vacant(entry) => {
                let serials = match db.get(index_cf, entry.key().as_ref())? {
                    Some(serials) => {
                        db_deserialize::<Vec<L::SerialNum>>(&serials)?
                    }
                    None => vec![],
                };
                Ok(entry.insert(BTreeSet::from_iter(serials)))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use std::fmt::Debug;

    use abc_rust_error::Result;
    use pretty_assertions::assert_eq;
    use rocksdb::{ColumnFamilyDescriptor, Options, WriteBatch};
    use serde::{Deserialize, Serialize};

    use crate::{
        db::{Db, CF},
        reverse_lookup::{LookupColumn, ReverseLookup},
        ser::{db_deserialize, db_serialize},
    };

    #[derive(Debug, Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
    #[repr(C)]
    struct TestData {
        key: [u8; 32],
        payload: u32,
    }

    struct TestColumn<'a> {
        cf_data: &'a CF,
        db: &'a Db,
    }

    type Index<'a> = ReverseLookup<TestColumn<'a>>;

    impl Debug for TestColumn<'_> {
        fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(f, "TestColumn {{ .. }}")
        }
    }

    const CF_TEST: &str = "test";
    const CF_TEST_INDEX: &str = "test_index";

    impl<'a> LookupColumn for TestColumn<'a> {
        type CheapHash = [u8; 1];
        type Data = TestData;
        type SerialNum = u32;

        const CF_DATA: &'static str = CF_TEST;
        const CF_INDEX: &'static str = CF_TEST_INDEX;

        fn cheap_hash(key: &[u8; 32]) -> [u8; 1] {
            // "Hash" here simply takes the mod 10, giving us lots of collisions
            [key[0] % 10]
        }

        fn data_key(data: &Self::Data) -> &[u8; 32] {
            &data.key
        }

        fn get_data(
            &self,
            number: Self::SerialNum,
        ) -> Result<Option<Self::Data>> {
            match self.db.get(self.cf_data, number.to_be_bytes())? {
                Some(bytes) => Ok(Some(db_deserialize(&bytes)?)),
                None => Ok(None),
            }
        }
    }

    #[test]
    fn test_reverse_lookup() -> Result<()> {
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-db--lookup")?;
        let mut cfs =
            vec![ColumnFamilyDescriptor::new(CF_TEST, Options::default())];
        Index::add_cfs(&mut cfs);
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;
        let cf_data = db.cf(CF_TEST)?;
        let column = TestColumn { db: &db, cf_data };
        // First insert
        let number0: u32 = 100;
        let key0 = [100; 32];
        let data0 = TestData {
            key: key0,
            payload: 0xdeadbeef,
        };
        {
            let mut batch = WriteBatch::default();
            batch.put_cf(
                db.cf(CF_TEST)?,
                number0.to_be_bytes(),
                db_serialize(&data0)?,
            );
            Index::insert_pairs(
                &db,
                &mut batch,
                [(number0, &key0)].into_iter(),
            )?;
            db.write_batch(batch)?;
            assert_eq!(
                Index::get(&column, &db, &key0)?,
                Some((number0, data0))
            );
            assert_eq!(
                db.get(db.cf(CF_TEST_INDEX)?, [0])?.as_deref(),
                Some(db_serialize(&vec![number0])?.as_ref()),
            );
        }
        // Second insert, inserts 3 at once
        let number1: u32 = 101;
        let key1 = [101; 32]; // collides with key3
        let data1 = TestData {
            key: key1,
            payload: 0xcafe,
        };
        let number2: u32 = 110;
        let key2 = [110; 32]; // collides with key0
        let data2 = TestData {
            key: key2,
            payload: 0xabcd,
        };
        let number3: u32 = 111;
        let key3 = [111; 32]; // collides with key1
        let data3 = TestData {
            key: key3,
            payload: 0xfedc,
        };
        {
            let mut batch = WriteBatch::default();
            batch.put_cf(
                db.cf(CF_TEST)?,
                number1.to_be_bytes(),
                db_serialize(&data1)?,
            );
            batch.put_cf(
                db.cf(CF_TEST)?,
                number2.to_be_bytes(),
                db_serialize(&data2)?,
            );
            batch.put_cf(
                db.cf(CF_TEST)?,
                number3.to_be_bytes(),
                db_serialize(&data3)?,
            );
            Index::insert_pairs(
                &db,
                &mut batch,
                [(number1, &key1), (number2, &key2), (number3, &key3)]
                    .into_iter(),
            )?;
            db.write_batch(batch)?;
            assert_eq!(
                Index::get(&column, &db, &key0)?,
                Some((number0, data0))
            );
            assert_eq!(
                Index::get(&column, &db, &key1)?,
                Some((number1, data1))
            );
            assert_eq!(
                Index::get(&column, &db, &key2)?,
                Some((number2, data2))
            );
            assert_eq!(
                Index::get(&column, &db, &key3)?,
                Some((number3, data3))
            );
            assert_eq!(
                db.get(db.cf(CF_TEST_INDEX)?, [0])?.as_deref(),
                Some(db_serialize(&vec![number0, number2])?.as_ref()),
            );
            assert_eq!(
                db.get(db.cf(CF_TEST_INDEX)?, [1])?.as_deref(),
                Some(db_serialize(&vec![number1, number3])?.as_ref()),
            );
        }

        // Delete key1, key2, key3
        {
            let mut batch = WriteBatch::default();
            Index::delete_pairs(
                &db,
                &mut batch,
                [(number1, &key1), (number2, &key2), (number3, &key3)]
                    .into_iter(),
            )?;
            db.write_batch(batch)?;
            assert_eq!(Index::get(&column, &db, &key1)?, None);
            assert_eq!(Index::get(&column, &db, &key2)?, None);
            assert_eq!(Index::get(&column, &db, &key3)?, None);
            assert_eq!(
                Index::get(&column, &db, &key0)?,
                Some((number0, data0))
            );
            assert_eq!(
                db.get(db.cf(CF_TEST_INDEX)?, [0])?.as_deref(),
                Some(db_serialize(&vec![number0])?.as_ref()),
            );
            assert_eq!(db.get(db.cf(CF_TEST_INDEX)?, [1])?.as_deref(), None);
        }

        // Delete key0
        {
            let mut batch = WriteBatch::default();
            Index::delete_pairs(
                &db,
                &mut batch,
                [(number0, &key0)].into_iter(),
            )?;
            db.write_batch(batch)?;
            assert_eq!(Index::get(&column, &db, &key0)?, None);
            assert_eq!(db.get(db.cf(CF_TEST_INDEX)?, [0])?.as_deref(), None);
            assert_eq!(db.get(db.cf(CF_TEST_INDEX)?, [1])?.as_deref(), None);
        }
        Ok(())
    }

    #[test]
    fn test_reverse_lookup_rng() -> Result<()> {
        abc_rust_error::install();
        let mut rng = fastrand::Rng::with_seed(0);

        let tempdir = tempdir::TempDir::new("chronik-db--lookup_rng")?;
        let mut cfs =
            vec![ColumnFamilyDescriptor::new(CF_TEST, Options::default())];
        Index::add_cfs(&mut cfs);
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;
        let cf_data = db.cf(CF_TEST)?;
        let column = TestColumn { db: &db, cf_data };

        let test_data = (0u32..1000)
            .map(|num| {
                let mut data = TestData {
                    key: [0; 32],
                    payload: rng.u32(0..u32::MAX),
                };
                rng.fill(&mut data.key);
                (num, data)
            })
            .collect::<Vec<_>>();

        let insert_data = |entries: &[(u32, TestData)]| -> Result<()> {
            let mut batch = WriteBatch::default();
            let pairs = entries.iter().map(|&(num, ref data)| (num, &data.key));
            Index::insert_pairs(&db, &mut batch, pairs)?;
            for &(num, ref data) in entries {
                batch.put_cf(cf_data, num.to_be_bytes(), db_serialize(data)?);
            }
            db.write_batch(batch)?;
            Ok(())
        };

        let delete_data = |entries: &[(u32, TestData)]| -> Result<()> {
            let mut batch = WriteBatch::default();
            let pairs = entries.iter().map(|&(num, ref data)| (num, &data.key));
            Index::delete_pairs(&db, &mut batch, pairs)?;
            for &(num, _) in entries {
                batch.delete_cf(cf_data, num.to_be_bytes());
            }
            db.write_batch(batch)?;
            Ok(())
        };

        let check_data = |entries: &[(u32, TestData)]| -> Result<()> {
            for &(expected_num, ref expected_data) in entries {
                let (actual_num, actual_data) =
                    Index::get(&column, &db, &expected_data.key)?.unwrap();
                assert_eq!(expected_num, actual_num);
                assert_eq!(*expected_data, actual_data);
            }
            Ok(())
        };

        let check_not_data = |entries: &[(u32, TestData)]| -> Result<()> {
            for (_, data) in entries {
                assert!(Index::get(&column, &db, &data.key)?.is_none());
            }
            Ok(())
        };

        // Insert first 400 entries
        insert_data(&test_data[..400])?;
        check_data(&test_data[..400])?;
        check_not_data(&test_data[400..])?;

        // Insert next 600 entries
        insert_data(&test_data[400..])?;
        check_data(&test_data)?;

        // Delete last 600 entries again
        delete_data(&test_data[400..])?;
        check_data(&test_data[..400])?;
        check_not_data(&test_data[400..])?;

        // Delete remaining 400 entries
        delete_data(&test_data[..400])?;
        check_not_data(&test_data)?;

        Ok(())
    }
}
