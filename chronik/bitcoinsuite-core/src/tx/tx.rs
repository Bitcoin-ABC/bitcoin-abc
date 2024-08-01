// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use crate::{
    error::DataError,
    script::Script,
    ser::{BitcoinSer, BitcoinSerializer},
    tx::TxId,
};

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

/// Points to an input spending a coin.
#[derive(Clone, Copy, Debug, Default, Eq, Hash, Ord, PartialEq, PartialOrd)]
pub struct SpentBy {
    /// TxId of the tx with the input.
    pub txid: TxId,
    /// Index in the inputs of the tx.
    pub input_idx: u32,
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

/// Empty tx, serializes to 00000000000000000000.
pub static EMPTY_TX: TxMut = TxMut {
    version: 0,
    inputs: vec![],
    outputs: vec![],
    locktime: 0,
};

impl OutPoint {
    /// Whether this outpoint is a coinbase input.
    ///
    /// ```
    /// # use bitcoinsuite_core::tx::{OutPoint, TxId};
    /// let txid0 = TxId::from([0; 32]);
    /// let txid3 = TxId::from([3; 32]);
    ///
    /// fn is_coinbase(txid: TxId, out_idx: u32) -> bool {
    ///     OutPoint { txid, out_idx }.is_coinbase()
    /// }
    ///
    /// assert!(!is_coinbase(txid3, u32::MAX));
    /// assert!(!is_coinbase(txid3, 0));
    /// assert!(!is_coinbase(txid0, 0));
    /// assert!(!is_coinbase(txid0, u32::MAX - 1));
    /// assert!(is_coinbase(txid0, u32::MAX));
    /// ```
    pub fn is_coinbase(&self) -> bool {
        self.txid == TxId::default() && self.out_idx == u32::MAX
    }
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

impl BitcoinSer for TxMut {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        self.version.ser_to(bytes);
        self.inputs.ser_to(bytes);
        self.outputs.ser_to(bytes);
        self.locktime.ser_to(bytes);
    }

    fn deser(data: &mut bytes::Bytes) -> Result<Self, DataError> {
        Ok(TxMut {
            version: BitcoinSer::deser(data)?,
            inputs: BitcoinSer::deser(data)?,
            outputs: BitcoinSer::deser(data)?,
            locktime: BitcoinSer::deser(data)?,
        })
    }
}

impl BitcoinSer for Tx {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        TxMut::ser_to(self, bytes)
    }

    fn deser(data: &mut bytes::Bytes) -> Result<Self, DataError> {
        let tx = TxMut::deser(data)?;
        Ok(Tx::with_txid(TxId::from_tx(&tx), tx))
    }
}

impl BitcoinSer for OutPoint {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        self.txid.ser_to(bytes);
        self.out_idx.ser_to(bytes);
    }

    fn deser(data: &mut bytes::Bytes) -> Result<Self, DataError> {
        Ok(OutPoint {
            txid: BitcoinSer::deser(data)?,
            out_idx: BitcoinSer::deser(data)?,
        })
    }
}

impl BitcoinSer for TxInput {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        self.prev_out.ser_to(bytes);
        self.script.ser_to(bytes);
        self.sequence.ser_to(bytes);
    }

    fn deser(data: &mut bytes::Bytes) -> Result<Self, DataError> {
        Ok(TxInput {
            prev_out: BitcoinSer::deser(data)?,
            script: BitcoinSer::deser(data)?,
            sequence: BitcoinSer::deser(data)?,
            coin: None,
        })
    }
}

impl BitcoinSer for TxOutput {
    fn ser_to<S: BitcoinSerializer>(&self, bytes: &mut S) {
        self.value.ser_to(bytes);
        self.script.ser_to(bytes);
    }

    fn deser(data: &mut bytes::Bytes) -> Result<Self, DataError> {
        Ok(TxOutput {
            value: BitcoinSer::deser(data)?,
            script: BitcoinSer::deser(data)?,
        })
    }
}

#[cfg(test)]
mod tests {
    use bytes::Bytes;

    use crate::{
        script::Script,
        ser::BitcoinSer,
        tx::{OutPoint, Tx, TxId, TxInput, TxMut, TxOutput},
    };

    fn verify_ser(tx: TxMut, ser: &[u8]) {
        assert_eq!(tx.ser().as_ref(), ser);
        assert_eq!(tx.ser_len(), ser.len());
        let mut bytes = Bytes::copy_from_slice(ser);
        assert_eq!(tx, TxMut::deser(&mut bytes).unwrap());

        let tx = Tx::with_txid(TxId::from_tx(&tx), tx);
        assert_eq!(tx.ser().as_ref(), ser);
        assert_eq!(tx.ser_len(), ser.len());
        let mut bytes = Bytes::copy_from_slice(ser);
        assert_eq!(tx, Tx::deser(&mut bytes).unwrap());
    }

    #[test]
    fn test_ser_tx() -> Result<(), hex::FromHexError> {
        verify_ser(TxMut::default(), &[0; 10]);
        verify_ser(
            TxMut {
                version: 0x12345678,
                inputs: vec![],
                outputs: vec![],
                locktime: 0x9abcdef1,
            },
            &hex::decode("785634120000f1debc9a")?,
        );
        let genesis_tx = TxMut {
            version: 1,
            inputs: vec![TxInput {
                prev_out: OutPoint {
                    txid: TxId::from([0; 32]),
                    out_idx: 0xffff_ffff,
                },
                script: Script::new(
                    hex::decode(
                        "04ffff001d0104455468652054696d65732030332f4a616e2f3230\
                         3039204368616e63656c6c6f72206f6e206272696e6b206f662073\
                         65636f6e64206261696c6f757420666f722062616e6b73",
                    )?
                    .into(),
                ),
                sequence: 0xffff_ffff,
                coin: None,
            }],
            outputs: vec![TxOutput {
                value: 5000000000,
                script: Script::new(
                    hex::decode(
                        "4104678afdb0fe5548271967f1a67130b7105cd6a828e03909a679\
                         62e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384df7\
                         ba0b8d578a4c702b6bf11d5fac",
                    )?
                    .into(),
                ),
            }],
            locktime: 0,
        };
        verify_ser(
            genesis_tx,
            &hex::decode(
                "01000000010000000000000000000000000000000000000000000000000000\
                 000000000000ffffffff4d04ffff001d0104455468652054696d6573203033\
                 2f4a616e2f32303039204368616e63656c6c6f72206f6e206272696e6b206f\
                 66207365636f6e64206261696c6f757420666f722062616e6b73ffffffff01\
                 00f2052a01000000434104678afdb0fe5548271967f1a67130b7105cd6a828\
                 e03909a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112de5c384d\
                 f7ba0b8d578a4c702b6bf11d5fac00000000"
            )?,
        );
        Ok(())
    }
}
