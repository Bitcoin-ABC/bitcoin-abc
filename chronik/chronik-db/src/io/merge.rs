// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for catching and re-throwing RocksDB merge op errors

use std::sync::Mutex;

use abc_rust_error::{Report, Result};
use chronik_util::{log, log_chronik};
use rocksdb::MergeOperands;

static MERGE_ERROR: Mutex<Option<Report>> = Mutex::new(None);

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

pub(crate) fn catch_merge_errors(
    f: impl Fn(&[u8], Option<&[u8]>, &MergeOperands) -> Result<Vec<u8>>
        + Send
        + Sync
        + Clone
        + 'static,
) -> impl Fn(&[u8], Option<&[u8]>, &MergeOperands) -> Option<Vec<u8>>
       + Send
       + Sync
       + Clone
       + 'static {
    move |key, existing_value, operands| match f(key, existing_value, operands)
    {
        Ok(merged) => Some(merged),
        Err(err) => {
            log_chronik!("Error details: {:?}\n", err);
            log!("MERGE ERROR: {}\n", err);
            *MERGE_ERROR.lock().unwrap() = Some(err);
            // Turn failed merge op into a no-op (or inserts empty string if no
            // previous value)
            Some(existing_value.unwrap_or(&[]).to_vec())
        }
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use rocksdb::{ColumnFamilyDescriptor, WriteBatch};
    use thiserror::Error;

    use crate::{
        db::Db,
        io::merge::{catch_merge_errors, check_for_errors},
    };

    #[derive(Debug, Error, PartialEq, Eq)]
    #[error("Test merge error")]
    struct TestMergeError;

    fn partial_merge(
        _key: &[u8],
        _existing_value: Option<&[u8]>,
        _operands: &rocksdb::MergeOperands,
    ) -> Option<Vec<u8>> {
        None
    }

    fn failing_merge(
        _key: &[u8],
        _existing_value: Option<&[u8]>,
        _operands: &rocksdb::MergeOperands,
    ) -> Result<Vec<u8>> {
        Err(TestMergeError.into())
    }

    #[test]
    fn test_catch_merge() -> Result<()> {
        abc_rust_error::install();
        let tempdir = tempdir::TempDir::new("chronik-db--group_history")?;
        let mut options = rocksdb::Options::default();
        options.set_merge_operator(
            "name",
            catch_merge_errors(failing_merge),
            partial_merge,
        );
        let cfs = vec![ColumnFamilyDescriptor::new("test_cf", options)];
        let db = Db::open_with_cfs(tempdir.path(), cfs)?;
        let cf = db.cf("test_cf")?;

        let mut batch = WriteBatch::default();
        batch.merge_cf(cf, b"key", b"value");
        db.write_batch(batch)?;

        // Error not thrown yet (merge op not called yet)
        check_for_errors()?;

        // Merge op called: turned into no-op (inserts empty string)
        assert_eq!(db.get(cf, b"key")?.as_deref(), Some(b"".as_ref()));

        // Error caught
        assert_eq!(
            check_for_errors()
                .expect_err("Error not caught")
                .downcast::<TestMergeError>()?,
            TestMergeError,
        );

        Ok(())
    }
}
