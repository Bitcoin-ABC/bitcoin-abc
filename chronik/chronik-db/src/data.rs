// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for data structs for the DB.

use serde::{Deserialize, Serialize};

use crate::io::TxNum;

/// Outpoint in the DB, but with [`TxNum`] instead of `TxId` for the txid.
#[derive(
    Clone,
    Copy,
    Debug,
    Default,
    Deserialize,
    Eq,
    Ord,
    PartialEq,
    PartialOrd,
    Serialize,
)]
pub struct DbOutpoint {
    /// [`TxNum`] of tx of the outpoint.
    pub tx_num: TxNum,
    /// Output of the tx referenced by the outpoint.
    pub out_idx: u32,
}
