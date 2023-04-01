// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for data referring to txs, e.g. [`TxId`].

#[allow(clippy::module_inception)]
mod tx;
mod txid;

pub use self::tx::*;
pub use self::txid::*;
