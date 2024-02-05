// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::{BTreeSet, HashMap};

use abc_rust_error::Result;
use bitcoinsuite_core::tx::{OutPoint, TxId};
use thiserror::Error;

use crate::{
    group::{Group, GroupQuery},
    mem::MempoolTx,
};

/// Store the mempool UTXOs of the group.
#[derive(Debug, PartialEq, Eq, Default)]
pub struct MempoolGroupUtxos<G: Group> {
    utxos: HashMap<Vec<u8>, BTreeSet<OutPoint>>,
    group: G,
}

/// Error indicating something went wrong with [`MempoolGroupUtxos`].
#[derive(Clone, Debug, Eq, Error, PartialEq)]
pub enum MempoolGroupUtxosError {
    /// Tried adding a UTXO that already exists
    #[error("Inconsistent mempool: UTXO {0:?} already exists in mempool")]
    DuplicateUtxo(OutPoint),

    /// Tried adding back a UTXO that has already been added back
    #[error("Inconsistent mempool: UTXO {0:?} already unspent in mempool")]
    UtxoAlreadyUnspent(OutPoint),

    /// Tried removing a UTXO from the mempool that doesn't exist
    #[error(
        "Inconsistent mempool when removing tx: UTXO {0:?} doesn't exist in \
         mempool"
    )]
    UtxoDoesntExistForRemoval(OutPoint),

    /// Tried removing a UTXO from the mempool that doesn't exist
    #[error(
        "Inconsistent mempool: UTXO {outpoint:?} spent by {txid} doesn't \
         exist in mempool"
    )]
    UtxoDoesntExist {
        /// Spent outpoint that doesn't exist in the mempool but should
        outpoint: OutPoint,
        /// TxId that spent the nonexistent outpoint
        txid: TxId,
    },
}

use self::MempoolGroupUtxosError::*;

impl<G: Group> MempoolGroupUtxos<G> {
    /// Create a new [`MempoolGroupUtxos`].
    pub fn new(group: G) -> Self {
        MempoolGroupUtxos {
            utxos: HashMap::new(),
            group,
        }
    }

    /// Add tx to the group's mempool UTXO set.
    ///
    /// This also removes the mempool outputs spent by the tx, which is why we
    /// need `is_mempool_tx`.
    pub fn insert(
        &mut self,
        tx: &MempoolTx,
        is_mempool_tx: impl Fn(&TxId) -> bool,
        aux: &G::Aux,
    ) -> Result<()> {
        let query = GroupQuery {
            is_coinbase: false,
            tx: &tx.tx,
        };
        for item in self.group.output_members(query, aux) {
            let member_ser = self.group.ser_member(&item.member);
            let utxos = self.ensure_entry(member_ser.as_ref());
            let outpoint = OutPoint {
                txid: tx.tx.txid(),
                out_idx: item.idx as u32,
            };
            if !utxos.insert(outpoint) {
                // UTXO has been added before already -> error
                return Err(DuplicateUtxo(outpoint).into());
            }
        }
        for item in self.group.input_members(query, aux) {
            let input = &tx.tx.inputs[item.idx];
            if !is_mempool_tx(&input.prev_out.txid) {
                continue;
            }
            let member_ser = self.group.ser_member(&item.member);
            self.remove_utxo(
                member_ser.as_ref(),
                Some(tx.tx.txid_ref()),
                &input.prev_out,
            )?;
        }
        Ok(())
    }

    /// Remove tx from the group's mempool UTXO set. Only to be called upon
    /// TransactionRemovedFromMempool.
    ///
    /// It properly restores mempool UTXOs that have been spent by `tx`. To
    /// check whether the tx's inputs are in the mempool, the is_mempool_tx
    /// closure has to be provided.
    ///
    /// This assumes that the tx has no dependents in the mempool (which is
    /// upheld by TransactionRemovedFromMempool).
    ///
    /// Note: That assumption does not hold for txs that have been mined in a
    /// block. For example, if tx1 and tx2 are in the mempool, and tx2 spends an
    /// output from tx1, it's perfectly fine for a block to only confirm tx1,
    /// and to be removed from the mempool. However, if `remove` would be used
    /// to remove tx1, it would fail because tx2 depends on it, violating
    /// the assumption.
    pub fn remove(
        &mut self,
        tx: &MempoolTx,
        is_mempool_tx: impl Fn(&TxId) -> bool,
        aux: &G::Aux,
    ) -> Result<()> {
        let query = GroupQuery {
            is_coinbase: false,
            tx: &tx.tx,
        };
        for item in self.group.input_members(query, aux) {
            let input = &tx.tx.inputs[item.idx];
            if !is_mempool_tx(&input.prev_out.txid) {
                // If `tx` previously spent a block tx, don't add the UTXO back
                continue;
            }
            let member_ser = self.group.ser_member(&item.member);
            let utxos = self.ensure_entry(member_ser.as_ref());
            // Add the UTXO back
            if !utxos.insert(input.prev_out) {
                // If already there, we undid it twice -> error
                return Err(UtxoAlreadyUnspent(input.prev_out).into());
            }
        }
        for item in self.group.output_members(query, aux) {
            let member_ser = self.group.ser_member(&item.member);
            let outpoint = OutPoint {
                txid: tx.tx.txid(),
                out_idx: item.idx as u32,
            };
            // Due to our assumption, all outputs of this tx must be unspent,
            // hence a UTXO entry must exist for the member.
            self.remove_utxo(member_ser.as_ref(), None, &outpoint)?;
        }
        Ok(())
    }

    /// Remove tx from the group's UTXO set, to be called when this tx has been
    /// mined in a block.
    ///
    /// This assumes that all the dependencies (including transitive
    /// dependencies) have been mined as well (which is the case for mined txs).
    ///
    /// Note: That assumption is not upheld upon TransactionRemovedFromMempool.
    /// For example if tx1 and tx2 are in the mempool, and tx2 spends an output
    /// from tx1, it's perfectly fine for tx2 to be removed from the mempool via
    /// TransactionRemovedFromMempool, but since tx1 is not confirmed, it
    /// violates the assumption.
    pub fn remove_mined(&mut self, tx: &MempoolTx, aux: &G::Aux) {
        let query = GroupQuery {
            is_coinbase: false,
            tx: &tx.tx,
        };
        for item in self.group.output_members(query, aux) {
            let member_ser = self.group.ser_member(&item.member);
            // Discard the error here, which is expected if an output has
            // previously been spent by another mempool tx.
            let _ = self.remove_utxo(
                member_ser.as_ref(),
                None,
                &OutPoint {
                    txid: tx.tx.txid(),
                    out_idx: item.idx as u32,
                },
            );
        }
    }

    /// Return the UTXOs of a given serialized member as an ordered
    /// [`BTreeSet`], or None if there are no entries.
    pub fn utxos(&self, member_ser: &[u8]) -> Option<&BTreeSet<OutPoint>> {
        self.utxos.get(member_ser)
    }

    fn ensure_entry(&mut self, member_ser: &[u8]) -> &mut BTreeSet<OutPoint> {
        if !self.utxos.contains_key(member_ser) {
            self.utxos.insert(member_ser.to_vec(), BTreeSet::new());
        }
        self.utxos.get_mut(member_ser).unwrap()
    }

    /// Remove an outpoint from the UTXOs of a member. Cleans up empty UTXO
    /// sets for members. Err if the UTXO doesn't exist. Returns
    /// [`MempoolGroupUtxosError`] to avoid allocating.
    fn remove_utxo(
        &mut self,
        member_ser: &[u8],
        txid: Option<&TxId>,
        outpoint: &OutPoint,
    ) -> Result<(), MempoolGroupUtxosError> {
        let make_err = || match txid {
            Some(txid) => UtxoDoesntExist {
                outpoint: *outpoint,
                txid: *txid,
            },
            None => UtxoDoesntExistForRemoval(*outpoint),
        };
        let utxos = self
            .utxos
            .get_mut(member_ser.as_ref())
            .ok_or_else(make_err)?;
        if !utxos.remove(outpoint) {
            return Err(make_err());
        }
        if utxos.is_empty() {
            // Clean up if there's no utxos for this member anymore
            self.utxos.remove(member_ser.as_ref()).unwrap();
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use abc_rust_error::Result;
    use bitcoinsuite_core::tx::{OutPoint, TxId};

    use crate::{
        mem::{MempoolGroupUtxos, MempoolGroupUtxosError, MempoolTx},
        test::{make_inputs_tx, ser_value, ValueGroup},
    };

    #[test]
    fn test_mempool_group_utxos() -> Result<()> {
        fn make_mempool_tx<const N: usize, const M: usize>(
            txid_num: u8,
            input_values: [(u8, u32, i64); N],
            output_values: [i64; M],
        ) -> MempoolTx {
            MempoolTx {
                tx: make_inputs_tx(txid_num, input_values, output_values),
                time_first_seen: 0,
            }
        }

        fn make_outpoints<const N: usize>(
            outpoints: [(u8, u32); N],
        ) -> BTreeSet<OutPoint> {
            outpoints
                .into_iter()
                .map(|(txid_num, out_idx)| OutPoint {
                    txid: TxId::from([txid_num; 32]),
                    out_idx,
                })
                .collect()
        }

        fn is_mempool_tx(txid: &TxId) -> bool {
            txid.as_bytes()[0] < 10
        }

        let mut mempool = MempoolGroupUtxos::new(ValueGroup);

        // spend a confirmed UTXO
        let tx1 = make_mempool_tx(1, [(10, 4, 100)], [101]);
        mempool.insert(&tx1, is_mempool_tx, &())?;
        assert_eq!(mempool.utxos(&ser_value(100)), None);
        assert_eq!(
            mempool.utxos(&ser_value(101)),
            Some(&make_outpoints([(1, 0)])),
        );

        // adding again fails
        assert_eq!(
            mempool
                .insert(&tx1, is_mempool_tx, &())
                .unwrap_err()
                .downcast::<MempoolGroupUtxosError>()?,
            MempoolGroupUtxosError::DuplicateUtxo(OutPoint {
                txid: TxId::from([1; 32]),
                out_idx: 0,
            }),
        );

        // trying to spend a non-existent mempool UTXO fails
        for value in [
            999, // value=999 has no UTXO entries
            101, // value=101 has one entry but for txid=1, out_idx=0
        ] {
            assert_eq!(
                mempool
                    .insert(
                        &make_mempool_tx(3, [(2, 4, value)], []),
                        is_mempool_tx,
                        &(),
                    )
                    .unwrap_err()
                    .downcast::<MempoolGroupUtxosError>()?,
                MempoolGroupUtxosError::UtxoDoesntExist {
                    outpoint: OutPoint {
                        txid: TxId::from([2; 32]),
                        out_idx: 4,
                    },
                    txid: TxId::from([3; 32]),
                },
            );
        }

        // trying to remove a tx with non-existent outputs fails
        for value in [
            999, // value=999 has no UTXO entries
            101, // value=101 has one entry but for txid=1, out_idx=0
        ] {
            assert_eq!(
                mempool
                    .remove(
                        &make_mempool_tx(3, [], [value]),
                        is_mempool_tx,
                        &(),
                    )
                    .unwrap_err()
                    .downcast::<MempoolGroupUtxosError>()?,
                MempoolGroupUtxosError::UtxoDoesntExistForRemoval(OutPoint {
                    txid: TxId::from([3; 32]),
                    out_idx: 0,
                }),
            );
        }

        // Removing tx1 results in an empty state
        mempool.remove(&tx1, is_mempool_tx, &())?;
        assert_eq!(mempool, MempoolGroupUtxos::new(ValueGroup));

        // Mining tx1 also results in an empty state
        mempool.insert(&tx1, is_mempool_tx, &())?;
        mempool.remove_mined(&tx1, &());
        assert_eq!(mempool, MempoolGroupUtxos::new(ValueGroup));

        // Add back to mempool again
        mempool.insert(&tx1, is_mempool_tx, &())?;
        assert_eq!(
            mempool.utxos(&ser_value(101)),
            Some(&make_outpoints([(1, 0)])),
        );

        let tx2 = make_mempool_tx(2, [(1, 0, 101)], [102, 101]);
        mempool.insert(&tx2, is_mempool_tx, &())?;
        assert_eq!(
            mempool.utxos(&ser_value(101)),
            Some(&make_outpoints([(2, 1)])),
        );
        assert_eq!(
            mempool.utxos(&ser_value(102)),
            Some(&make_outpoints([(2, 0)])),
        );

        // Removing tx2 restores tx1's outputs, and removes tx2's outputs
        mempool.remove(&tx2, is_mempool_tx, &())?;
        assert_eq!(
            mempool.utxos(&ser_value(101)),
            Some(&make_outpoints([(1, 0)])),
        );
        assert_eq!(mempool.utxos(&ser_value(102)), None);

        // Trying to remove tx2 again fails
        assert_eq!(
            mempool
                .remove(&tx2, is_mempool_tx, &())
                .unwrap_err()
                .downcast::<MempoolGroupUtxosError>()?,
            MempoolGroupUtxosError::UtxoAlreadyUnspent(OutPoint {
                txid: TxId::from([1; 32]),
                out_idx: 0,
            }),
        );

        // Add tx2 again
        mempool.insert(&tx2, is_mempool_tx, &())?;

        // Add tx3
        let tx3 = make_mempool_tx(3, [(2, 0, 102), (11, 4, 101)], [101]);
        mempool.insert(&tx3, is_mempool_tx, &())?;
        assert_eq!(
            mempool.utxos(&ser_value(101)),
            Some(&make_outpoints([(2, 1), (3, 0)])),
        );
        assert_eq!(mempool.utxos(&ser_value(102)), None);

        // Mine tx1: leaves everything unchanged
        mempool.remove_mined(&tx1, &());
        assert_eq!(
            mempool.utxos(&ser_value(101)),
            Some(&make_outpoints([(2, 1), (3, 0)])),
        );
        assert_eq!(mempool.utxos(&ser_value(102)), None);

        // Mine tx2: removes its outputs
        mempool.remove_mined(&tx2, &());
        assert_eq!(
            mempool.utxos(&ser_value(101)),
            Some(&make_outpoints([(3, 0)])),
        );
        assert_eq!(mempool.utxos(&ser_value(102)), None);

        // Mine tx3: results in an empty state
        mempool.remove_mined(&tx3, &());
        assert_eq!(mempool, MempoolGroupUtxos::new(ValueGroup));

        Ok(())
    }
}
