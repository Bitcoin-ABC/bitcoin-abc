// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::{btree_map::Entry, BTreeMap, HashMap};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, SpentBy, TxId};
use thiserror::Error;

use crate::mem::MempoolTx;

/// Store which outputs have been spent by which mempool tx.
///
/// Spent outputs don't necessarily have to be of mempool txs.
#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub struct MempoolSpentBy {
    spent_by: HashMap<TxId, BTreeMap<u32, SpentBy>>,
}

/// Error indicating that something went wrong with [`MempoolSpentBy`].
#[derive(Debug, Error, PartialEq, Eq)]
pub enum MempoolSpentByError {
    /// Tried adding a spent-by entry, but it's already marked as spent by
    /// another entry.
    #[error(
        "Inconsistent mempool: Duplicate spend by entry for {outpoint:?}: \
         {existing:?} already exists, but tried to add {new:?}"
    )]
    DuplicateSpentByEntry {
        /// Which output has been spent
        outpoint: OutPoint,
        /// Entry already present in the mempool.
        existing: SpentBy,
        /// Entry we tried to add.
        new: SpentBy,
    },

    /// Tried removing a spent-by entry, but it doesn't match what we got from
    /// the disconnected block.
    #[error(
        "Inconsistent mempool: Mismatched spent-by entry for {outpoint:?}: \
         Expected {expected:?} to be present, but got {actual:?}"
    )]
    MismatchedSpentByEntry {
        /// Tried removing a spent-by entry for this output.
        outpoint: OutPoint,
        /// Entry we expected based on the removed tx.
        expected: SpentBy,
        /// Entry actually found in the mempool.
        actual: SpentBy,
    },

    /// Tried removing a spent-by entry, but it doesn't exist.
    #[error(
        "Inconsistent mempool: Missing spend by entry for {outpoint:?}: \
         Expected {expected:?} to be present, but none found"
    )]
    MissingSpentByEntry {
        /// Tried removing a spent-by entry for this output.
        outpoint: OutPoint,
        /// Entry we expected to be present based on the disconnected block.
        expected: SpentBy,
    },
}

use self::MempoolSpentByError::*;

impl MempoolSpentBy {
    /// Mark all the outputs spent by this tx.
    ///
    /// Fails if a spent output already has been marked as spent.
    pub fn insert(&mut self, tx: &MempoolTx) -> Result<()> {
        for (input_idx, input) in tx.tx.inputs.iter().enumerate() {
            let entries = self.spent_by.entry(input.prev_out.txid).or_default();
            let new_entry = SpentBy {
                txid: tx.tx.txid(),
                input_idx: input_idx as u32,
            };
            match entries.entry(input.prev_out.out_idx) {
                Entry::Vacant(entry) => {
                    entry.insert(new_entry);
                }
                Entry::Occupied(entry) => {
                    return Err(DuplicateSpentByEntry {
                        outpoint: OutPoint {
                            txid: input.prev_out.txid,
                            out_idx: input.prev_out.out_idx,
                        },
                        existing: *entry.get(),
                        new: new_entry,
                    }
                    .into());
                }
            }
        }
        Ok(())
    }

    /// Un-mark all the outputs spent by this tx as spent.
    ///
    /// Only to be used when the tx has been added to the mempool before.
    pub fn remove(&mut self, tx: &MempoolTx) -> Result<()> {
        for (input_idx, input) in tx.tx.inputs.iter().enumerate() {
            let spent_outpoint = OutPoint {
                txid: input.prev_out.txid,
                out_idx: input.prev_out.out_idx,
            };
            let entries = self.spent_by.entry(spent_outpoint.txid).or_default();
            let removed_entry = SpentBy {
                txid: tx.tx.txid(),
                input_idx: input_idx as u32,
            };
            match entries.entry(spent_outpoint.out_idx) {
                Entry::Vacant(_) => {
                    return Err(MissingSpentByEntry {
                        outpoint: spent_outpoint,
                        expected: removed_entry,
                    }
                    .into());
                }
                Entry::Occupied(entry) => {
                    if *entry.get() != removed_entry {
                        return Err(MismatchedSpentByEntry {
                            outpoint: spent_outpoint,
                            expected: removed_entry,
                            actual: *entry.get(),
                        }
                        .into());
                    }
                    entry.remove();
                }
            }
            if entries.is_empty() {
                self.spent_by.remove(&spent_outpoint.txid).unwrap();
            }
        }
        Ok(())
    }

    /// Return the outputs of the given tx that have been spent by mempool txs.
    pub fn outputs_spent(
        &self,
        txid: &TxId,
    ) -> Option<&BTreeMap<u32, SpentBy>> {
        self.spent_by.get(txid)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use abc_rust_error::Result;
    use bitcoinsuite_core::tx::{OutPoint, SpentBy, TxId};

    use crate::{
        mem::{MempoolSpentBy, MempoolSpentByError, MempoolTx},
        test::{make_inputs_tx, utxo::make_mempool_tx},
    };

    #[test]
    fn test_mempool_spent_by() -> Result<()> {
        macro_rules! spent_by {
            ($($out_idx:literal -> (txid_num=$by_txid_num:literal,
                                    out_idx=$by_out_idx:literal)),*) => {
                [
                    $((
                        $out_idx,
                        SpentBy {
                            txid: TxId::from([$by_txid_num; 32]),
                            input_idx: $by_out_idx,
                        }
                    )),*
                ]
                .into_iter()
                .collect::<BTreeMap<u32, SpentBy>>()
            };
        }

        let mut mempool = MempoolSpentBy::default();

        // Add tx spending txid_num=10, out_idx=4
        let tx1 =
            make_mempool_tx!(txid_num = 1, inputs = [(10, 4)], num_outputs = 1);
        mempool.insert(&tx1)?;
        assert_eq!(
            mempool.outputs_spent(&TxId::from([10; 32])),
            Some(&spent_by!(4 -> (txid_num=1, out_idx=0))),
        );

        // Remove tx -> no entries in MempoolSpentBy anymore
        mempool.remove(&tx1)?;
        assert_eq!(mempool, MempoolSpentBy::default());

        // Add tx again
        mempool.insert(&tx1)?;

        // Failed insert: Tx conflicts with existing tx
        let tx_conflict = make_mempool_tx!(
            txid_num = 2,
            inputs = [(0, 0), (10, 4)],
            num_outputs = 0
        );
        assert_eq!(
            mempool
                .insert(&tx_conflict)
                .unwrap_err()
                .downcast::<MempoolSpentByError>()?,
            MempoolSpentByError::DuplicateSpentByEntry {
                outpoint: OutPoint {
                    txid: TxId::from([10; 32]),
                    out_idx: 4,
                },
                existing: SpentBy {
                    txid: TxId::from([1; 32]),
                    input_idx: 0,
                },
                new: SpentBy {
                    txid: TxId::from([2; 32]),
                    input_idx: 1,
                },
            },
        );

        // Failed remove: Output never spent in mempool
        let tx_missing =
            make_mempool_tx!(txid_num = 3, inputs = [(10, 3)], num_outputs = 0);
        assert_eq!(
            mempool
                .remove(&tx_missing)
                .unwrap_err()
                .downcast::<MempoolSpentByError>()?,
            MempoolSpentByError::MissingSpentByEntry {
                outpoint: OutPoint {
                    txid: TxId::from([10; 32]),
                    out_idx: 3,
                },
                expected: SpentBy {
                    txid: TxId::from([3; 32]),
                    input_idx: 0,
                },
            },
        );

        // Failed remove: Output spent by a different tx
        let tx_mismatch: MempoolTx =
            make_mempool_tx!(txid_num = 4, inputs = [(10, 4)], num_outputs = 0);
        assert_eq!(
            mempool
                .remove(&tx_mismatch)
                .unwrap_err()
                .downcast::<MempoolSpentByError>()?,
            MempoolSpentByError::MismatchedSpentByEntry {
                outpoint: OutPoint {
                    txid: TxId::from([10; 32]),
                    out_idx: 4,
                },
                expected: SpentBy {
                    txid: TxId::from([4; 32]),
                    input_idx: 0,
                },
                actual: SpentBy {
                    txid: TxId::from([1; 32]),
                    input_idx: 0,
                },
            },
        );

        // Add more spends to existing entries; also spend mempool tx
        let tx2 = make_mempool_tx!(
            txid_num = 5,
            inputs = [(10, 5), (10, 3), (1, 0)],
            num_outputs = 0
        );
        mempool.insert(&tx2)?;
        assert_eq!(
            mempool.outputs_spent(&TxId::from([10; 32])),
            Some(&spent_by!(
                3 -> (txid_num=5, out_idx=1),
                4 -> (txid_num=1, out_idx=0),
                5 -> (txid_num=5, out_idx=0)
            )),
        );
        assert_eq!(
            mempool.outputs_spent(&TxId::from([1; 32])),
            Some(&spent_by!(0 -> (txid_num=5, out_idx=2))),
        );

        // "Mine" first tx
        mempool.remove(&tx1)?;
        assert_eq!(
            mempool.outputs_spent(&TxId::from([10; 32])),
            Some(&spent_by!(
                3 -> (txid_num=5, out_idx=1),
                5 -> (txid_num=5, out_idx=0)
            )),
        );
        // The now mined tx is still marked as spent in the mempool
        assert_eq!(
            mempool.outputs_spent(&TxId::from([1; 32])),
            Some(&spent_by!(0 -> (txid_num=5, out_idx=2))),
        );

        // "Mine" dependent tx, now there no entries marked as spent in the
        // mempool anymore.
        mempool.remove(&tx2)?;
        assert_eq!(mempool.outputs_spent(&TxId::from([10; 32])), None);
        assert_eq!(mempool.outputs_spent(&TxId::from([1; 32])), None);

        Ok(())
    }
}
