// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for constants used in ALP.

use crate::lokad_id::LokadId;

/// LOKAD ID of the ALP protocol.
/// It was originally intended to be called "SLPv2", but later renamed to ALP to
/// avoid confusion of SLP token type 2. The LOKAD ID of course could not be
/// updated.
pub const ALP_LOKAD_ID: LokadId = *b"SLP2";

/// Token type of standard ALP txs.
pub const STANDARD_TOKEN_TYPE: u8 = 0;

/// Max. number of inputs we can handle per tx (2**15 - 1).
/// This is set such that an overflow can't occur when summing this many 48-bit
/// numbers. With current consensus rules, no valid tx can have this many
/// inputs, but we don't want to depend on this.
pub const MAX_TX_INPUTS: usize = 32767;
