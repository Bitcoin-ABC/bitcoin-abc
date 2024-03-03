// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use std::collections::{BTreeSet, HashMap};

use bitcoinsuite_core::tx::TxId;

use crate::{
    group::{tx_members_for_group, Group, GroupQuery},
    mem::MempoolTx,
};

/// Index the tx history of a group.
///
/// Individual items are sorted by [`MempoolTx`]`::time_first_seen` first and
/// then by TxId, so when accessing them, they are returned in chronological
/// order.
#[derive(Debug, Default)]
pub struct MempoolGroupHistory<G: Group> {
    /// (time_first_seen, txid), so we sort by time
    history: HashMap<Vec<u8>, BTreeSet<(i64, TxId)>>,
    group: G,
}

impl<G: Group> MempoolGroupHistory<G> {
    /// Create a new [`MempoolGroupHistory`] for the given group.
    pub fn new(group: G) -> MempoolGroupHistory<G> {
        MempoolGroupHistory {
            history: HashMap::new(),
            group,
        }
    }

    /// Index the given [`MempoolTx`] by this group.
    pub fn insert(&mut self, tx: &MempoolTx, aux: &G::Aux) {
        let query = GroupQuery {
            is_coinbase: false,
            tx: &tx.tx,
        };
        for member in tx_members_for_group(&self.group, query, aux) {
            let member_ser: G::MemberSer = self.group.ser_member(&member);
            if !self.history.contains_key(member_ser.as_ref()) {
                self.history
                    .insert(member_ser.as_ref().to_vec(), BTreeSet::new());
            }
            let member_history = self
                .history
                .get_mut(member_ser.as_ref())
                .expect("Impossible");
            member_history.insert((tx.time_first_seen, tx.tx.txid()));
        }
    }

    /// Remove the given [`MempoolTx`] from the history index.
    pub fn remove(&mut self, tx: &MempoolTx, aux: &G::Aux) {
        let query = GroupQuery {
            is_coinbase: false,
            tx: &tx.tx,
        };
        for member in tx_members_for_group(&self.group, query, aux) {
            let member_ser: G::MemberSer = self.group.ser_member(&member);
            if let Some(entries) = self.history.get_mut(member_ser.as_ref()) {
                entries.remove(&(tx.time_first_seen, tx.tx.txid()));
                if entries.is_empty() {
                    self.history.remove(member_ser.as_ref());
                }
            }
        }
    }

    /// Return the history of a given serialized member as an ordered
    /// [`BTreeSet`], or None if there are no entries.
    pub fn member_history(
        &self,
        member_ser: &[u8],
    ) -> Option<&BTreeSet<(i64, TxId)>> {
        self.history.get(member_ser)
    }
}

#[cfg(test)]
mod tests {
    use abc_rust_error::Result;
    use bitcoinsuite_core::tx::TxId;

    use crate::{
        mem::{MempoolGroupHistory, MempoolTx},
        test::{make_value_tx, ser_value, ValueGroup},
    };

    #[test]
    fn test_mempool_group_history() -> Result<()> {
        let mempool =
            std::cell::RefCell::new(MempoolGroupHistory::new(ValueGroup));

        let add_tx = |tx: &MempoolTx| mempool.borrow_mut().insert(tx, &());

        let remove_tx = |tx: &MempoolTx| mempool.borrow_mut().remove(tx, &());

        let member_history = |val: i64| -> Option<Vec<(i64, TxId)>> {
            mempool
                .borrow_mut()
                .member_history(&ser_value(val))
                .map(|history| history.iter().copied().collect::<Vec<_>>())
        };

        fn make_mempool_tx<const N: usize, const M: usize>(
            txid_num: u8,
            input_values: [i64; N],
            output_values: [i64; M],
            time_first_seen: i64,
        ) -> MempoolTx {
            MempoolTx {
                tx: make_value_tx(txid_num, input_values, output_values),
                time_first_seen,
            }
        }

        let tx1 = make_mempool_tx(1, [10], [], 1000);
        add_tx(&tx1);
        assert_eq!(member_history(10), Some(vec![(1000, TxId::from([1; 32]))]));

        remove_tx(&tx1);
        assert_eq!(member_history(10), None);

        let tx2 = make_mempool_tx(2, [], [10], 900);
        add_tx(&tx1);
        add_tx(&tx2);
        assert_eq!(
            member_history(10),
            Some(vec![
                (900, TxId::from([2; 32])),
                (1000, TxId::from([1; 32])),
            ]),
        );

        let tx4 = make_mempool_tx(4, [10], [10], 1000);
        add_tx(&tx4);
        assert_eq!(
            member_history(10),
            Some(vec![
                (900, TxId::from([2; 32])),
                (1000, TxId::from([1; 32])),
                (1000, TxId::from([4; 32])),
            ]),
        );

        let tx3 = make_mempool_tx(3, [10, 10], [10, 20], 1000);
        add_tx(&tx3);
        assert_eq!(
            member_history(10),
            Some(vec![
                (900, TxId::from([2; 32])),
                (1000, TxId::from([1; 32])),
                (1000, TxId::from([3; 32])),
                (1000, TxId::from([4; 32])),
            ]),
        );
        assert_eq!(member_history(20), Some(vec![(1000, TxId::from([3; 32]))]));

        remove_tx(&tx4);
        remove_tx(&tx1);
        remove_tx(&tx3);
        assert_eq!(member_history(10), Some(vec![(900, TxId::from([2; 32]))]));
        assert_eq!(member_history(20), None);

        Ok(())
    }
}
