// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use crate::{script::Script, tx::TxId};

/// CTransaction, a Bitcoin transaction.
///
/// ```
/// # use bitcoinsuite_core::tx::{Tx, TxId, TxMut};
/// let txid = TxId::from([3; 32]);
/// let tx = Tx::with_txid(
///     txid,
///     TxMut {
///         version: 1,
///         inputs: vec![],
///         outputs: vec![],
///         locktime: 0,
///     },
/// );
/// assert_eq!(tx.txid(), txid);
/// assert_eq!(tx.version, 1);
/// assert_eq!(tx.inputs, vec![]);
/// assert_eq!(tx.outputs, vec![]);
/// assert_eq!(tx.locktime, 0);
/// ```
///
/// Immutable version of [`TxMut`], so this will fail:
/// ```compile_fail
/// # use bitcoinsuite_core::tx::Tx;
/// let mut tx = Tx::default();
/// tx.version = 1;
/// ```
#[derive(Clone, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct Tx {
    txid: TxId,
    tx: TxMut,
}

/// Bitcoin transaction. Mutable version of [`Tx`], like CMutableTransaction.
///
/// The biggest difference is that it doesn't have a txid() method, which we
/// cannot know without hashing the tx every time, which would be expensive to
/// compute.
#[derive(Clone, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct TxMut {
    /// nVersion of the tx.
    pub version: i32,
    /// Tx inputs.
    pub inputs: Vec<TxInput>,
    /// Tx outputs.
    pub outputs: Vec<TxOutput>,
    /// Locktime of the tx.
    pub locktime: u32,
}

/// COutPoint, pointing to a coin being spent.
#[derive(Clone, Copy, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct OutPoint {
    /// TxId of the output of the coin.
    pub txid: TxId,
    /// Index in the outputs of the tx of the coin.
    pub out_idx: u32,
}

/// CTxIn, spending an unspent output.
#[derive(Clone, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct TxInput {
    /// Points to an output being spent.
    pub prev_out: OutPoint,
    /// scriptSig unlocking the output.
    pub script: Script,
    /// nSequence.
    pub sequence: u32,
    /// Coin being spent by this tx.
    /// May be [`None`] for coinbase txs or if the spent coin is unknown.
    pub coin: Option<Coin>,
}

/// CTxOut, creating a new output.
#[derive(Clone, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct TxOutput {
    /// Value of the output.
    pub value: i64,
    /// Script locking the output.
    pub script: Script,
}

/// Coin, can be spent by providing a valid unlocking script.
#[derive(Clone, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct Coin {
    /// Output, locking the coins.
    pub output: TxOutput,
    /// Height of the coin in the chain.
    pub height: i32,
    /// Whether the coin is a coinbase.
    pub is_coinbase: bool,
}

impl Tx {
    /// Create a new [`Tx`] with a given [`TxId`] and [`TxMut`].
    ///
    /// It is the responsibility of the caller to ensure the `txid` matches
    /// `tx`.
    pub fn with_txid(txid: TxId, tx: TxMut) -> Self {
        Tx { txid, tx }
    }

    /// [`TxId`] of this [`Tx`].
    pub fn txid(&self) -> TxId {
        self.txid
    }

    /// Like [`Tx::txid`], but as a reference.
    pub fn txid_ref(&self) -> &TxId {
        &self.txid
    }
}

impl std::ops::Deref for Tx {
    type Target = TxMut;

    fn deref(&self) -> &Self::Target {
        &self.tx
    }
}
