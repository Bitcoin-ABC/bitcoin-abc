// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for catching and re-throwing RocksDB merge op errors

use std::sync::Mutex;

use abc_rust_error::{Report, Result};
use chronik_util::{log, log_chronik};
use rocksdb::MergeOperands;

static MERGE_ERROR: Mutex<Option<Report>> = Mutex::new(None);

#[cfg(test)]
pub(crate) static MERGE_ERROR_LOCK: Mutex<()> = Mutex::new(());

/// Check if a previous merge had any errors and throw it if so.
///
/// There's an unfornate corollary of RocksDB's merge: Failure in a merge is
/// pretty catastrophic. RocksDB doesn't compute the merge right away, but only
/// when it needs to, which could be even after `write_batch`. That happens
/// either when doing "compaction" (applying pending db updates), or when
/// reading a key with a pending merge op.
///
/// Because of this, returning an error in a merge op is "sticky", which means
/// that it will continue to try (unsuccessfully) to apply the merge op every
/// time we read a key with a failed merge op.
///
/// To avoid this, we instead turn failed merge ops in no-ops (or into inserting
/// the empty string if there's no entry yet), and store the failed merge into a
/// static global.
///
/// Then, we regularly call [`check_for_errors`], which will check if any merge
/// op has failed and return the error the merge op reported.
///
/// This behavior isn't ideal (ideally we get an error when calling
/// `write_batch`), but better than the alternatives:
/// - Panicing: Panicing in a FFI boundary is always a bad idea (could be UB).
/// - Failing: Pretty much bricks the DB until `repair` is called, which however
///   is very agressive and results in a lot of lost data, making forensics and
///   diagnosing the error harder than necessary.
/// - Ignoring: This silently puts the DB in an inconsistent state (failed merge
///   ops should always be a Chronik bug, and not wrong usage by the user).
pub fn check_for_errors() -> Result<()> {
    let mut err = MERGE_ERROR.lock().unwrap();
    if let Some(err) = err.take() {
        return Err(err);
    }
    Ok(())
}

pub(crate) fn catch_merge_errors<T>(
    f_init: impl Fn(&[u8], Option<&[u8]>, &MergeOperands) -> Result<T>
        + Send
        + Sync
        + Clone
        + 'static,
    f_apply: impl Fn(&[u8], &mut T, &[u8]) -> Result<()>
        + Send
        + Sync
        + Clone
        + 'static,
    f_ser: impl Fn(&[u8], T) -> Result<Vec<u8>> + Send + Sync + Clone + 'static,
) -> impl Fn(&[u8], Option<&[u8]>, &MergeOperands) -> Option<Vec<u8>>
       + Send
       + Sync
       + Clone
       + 'static {
    move |key, existing_value, operands| {
        let fallback_value = || Some(existing_value.unwrap_or(&[]).to_vec());

        let mut value = match f_init(key, existing_value, operands) {
            Ok(value) => value,
            Err(err) => {
                handle_err(err);
                return fallback_value();
            }
        };

        let handle_ser = |value: T| match f_ser(key, value) {
            Ok(ser) => Some(ser),
            Err(err) => {
                handle_err(err);
                fallback_value()
            }
        };

        for operand in operands {
            if let Err(err) = f_apply(key, &mut value, operand) {
                // Turn failed merge op into a no-op (returns the serialized
                // existing value)
                handle_err(err);
                return handle_ser(value);
            }
        }

        handle_ser(value)
    }
}

fn handle_err(err: Report) {
    log_chronik!("Error details: {:?}\n", err);
    log!("MERGE ERROR: {}\n", err);
    *MERGE_ERROR.lock().unwrap() = Some(err);
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use rocksdb::{ColumnFamilyDescriptor, MergeOperands, WriteBatch};
    use thiserror::Error;

    use crate::{
        db::Db,
        io::merge::{catch_merge_errors, check_for_errors, MERGE_ERROR_LOCK},
    };

    #[derive(Debug, Error, PartialEq, Eq)]
    #[error("Test init merge error")]
    struct TestInitMergeError;

    #[derive(Debug, Error, PartialEq, Eq)]
    #[error("Test apply merge error")]
    struct TestApplyMergeError;

    #[derive(Debug, Error, PartialEq, Eq)]
    #[error("Test ser merge error")]
    struct TestSerMergeError;

    fn init_merge(
        _key: &[u8],
        existing_value: Option<&[u8]>,
        _: &MergeOperands,
    ) -> Result<u32> {
        match existing_value {
            Some(existing_value) => Ok(u32::from_be_bytes(
                existing_value.try_into().map_err(|_| TestInitMergeError)?,
            )),
            None => Ok(0),
        }
    }

    fn apply_merge(_key: &[u8], value: &mut u32, operand: &[u8]) -> Result<()> {
        *value += u32::from_be_bytes(
            operand.try_into().map_err(|_| TestApplyMergeError)?,
        );
        Ok(())
    }

    fn ser_merge(_key: &[u8], value: u32) -> Result<Vec<u8>> {
        if value == 1337 {
            return Err(TestSerMergeError.into());
        }
        Ok(value.to_be_bytes().to_vec())
    }

    #[test]
    fn test_catch_merge() -> Result<()> {
        let _guard = MERGE_ERROR_LOCK.lock().unwrap();
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-db--catch_merge")?;
        let mut options = rocksdb::Options::default();
        options.set_merge_operator(
            "name",
            catch_merge_errors(init_merge, apply_merge, ser_merge),
            |_, _, _| None,
        );
        let cfs = vec![ColumnFamilyDescriptor::new("test_cf", options)];
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;
        let cf = db.cf("test_cf")?;

        let mut batch = WriteBatch::default();
        batch.put_cf(cf, b"bad_init", b"bad");
        batch.merge_cf(cf, b"bad_init", 1234u32.to_be_bytes());
        db.write_batch(batch)?;

        // Error not thrown yet (merge op not called yet)
        check_for_errors()?;

        // Merge op called: turned into no-op (keeps "bad" value)
        assert_eq!(db.get(cf, b"bad_init")?.as_deref(), Some(b"bad".as_ref()));

        // Error caught
        assert_eq!(
            check_for_errors()
                .expect_err("Error not caught")
                .downcast::<TestInitMergeError>()?,
            TestInitMergeError,
        );

        let mut batch = WriteBatch::default();
        batch.merge_cf(cf, b"bad_apply", b"bad");
        db.write_batch(batch)?;
        check_for_errors()?;

        // Merge op called: turned into no-op (insert default value)
        assert_eq!(db.get(cf, b"bad_apply")?.as_deref(), Some([0; 4].as_ref()));

        assert_eq!(
            check_for_errors()
                .expect_err("Error not caught")
                .downcast::<TestApplyMergeError>()?,
            TestApplyMergeError,
        );

        let mut batch = WriteBatch::default();
        batch.merge_cf(cf, b"chain_apply", 1u32.to_be_bytes());
        batch.merge_cf(cf, b"chain_apply", 2u32.to_be_bytes());
        batch.merge_cf(cf, b"chain_apply", b"bad");
        batch.merge_cf(cf, b"chain_apply", 4u32.to_be_bytes());
        batch.merge_cf(cf, b"chain_apply", 8u32.to_be_bytes());
        db.write_batch(batch)?;
        check_for_errors()?;

        // Merge op called: Only 1 and 2 merged, "bad" stops the apply chain
        assert_eq!(
            db.get(cf, b"chain_apply")?.as_deref(),
            Some(3u32.to_be_bytes().as_ref()),
        );

        assert_eq!(
            check_for_errors()
                .expect_err("Error not caught")
                .downcast::<TestApplyMergeError>()?,
            TestApplyMergeError,
        );

        let mut batch = WriteBatch::default();
        batch.merge_cf(cf, b"bad_ser", 1337u32.to_be_bytes());
        db.write_batch(batch)?;
        check_for_errors()?;

        // Merge op called: Serialization failed, inserts empty string
        assert_eq!(db.get(cf, b"bad_ser")?.as_deref(), Some([].as_ref()));

        assert_eq!(
            check_for_errors()
                .expect_err("Error not caught")
                .downcast::<TestSerMergeError>()?,
            TestSerMergeError,
        );

        drop(db);
        rocksdb::DB::destroy(&rocksdb::Options::default(), tempdir.path())?;
        let _ = check_for_errors();

        Ok(())
    }
}
