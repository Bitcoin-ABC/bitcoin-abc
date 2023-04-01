// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for bridge utilities

use bitcoinsuite_core::{
    script::Script,
    tx::{Coin, OutPoint, Tx, TxId, TxInput, TxMut, TxOutput},
};

use crate::ffi;

/// Unwrap the given std::unique_ptr as a C++ reference, panicing if it's null.
pub fn expect_unique_ptr<'ptr, T: cxx::memory::UniquePtrTarget>(
    name: &str,
    uptr: &'ptr cxx::UniquePtr<T>,
) -> &'ptr T {
    uptr.as_ref()
        .unwrap_or_else(|| panic!("{name} returned a null std::unique_ptr"))
}

impl From<ffi::Tx> for Tx {
    fn from(tx: ffi::Tx) -> Self {
        Tx::with_txid(
            TxId::from(tx.txid),
            TxMut {
                version: tx.version,
                inputs: tx.inputs.into_iter().map(TxInput::from).collect(),
                outputs: tx.outputs.into_iter().map(TxOutput::from).collect(),
                locktime: tx.locktime,
            },
        )
    }
}

impl From<ffi::OutPoint> for OutPoint {
    fn from(value: ffi::OutPoint) -> Self {
        OutPoint {
            txid: TxId::from(value.txid),
            out_idx: value.out_idx,
        }
    }
}

impl From<ffi::TxInput> for TxInput {
    fn from(input: ffi::TxInput) -> Self {
        TxInput {
            prev_out: OutPoint::from(input.prev_out),
            script: Script::new(input.script.into()),
            sequence: input.sequence,
            coin: Some(Coin::from(input.coin)),
        }
    }
}

impl From<ffi::TxOutput> for TxOutput {
    fn from(output: ffi::TxOutput) -> Self {
        TxOutput {
            value: output.value,
            script: Script::new(output.script.into()),
        }
    }
}

impl From<ffi::Coin> for Coin {
    fn from(coin: ffi::Coin) -> Self {
        Coin {
            output: TxOutput::from(coin.output),
            height: coin.height,
            is_coinbase: coin.is_coinbase,
        }
    }
}
