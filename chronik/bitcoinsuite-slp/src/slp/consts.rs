// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for constants used in SLP.

use crate::lokad_id::LokadId;

/// LOKAD ID of SLP is "SLP\0"
pub const SLP_LOKAD_ID: LokadId = *b"SLP\0";

/// Token type 1 is identified by [1]
pub const TOKEN_TYPE_V1: u8 = 1;

/// Token type 2 (Mint Vault) is indentified by [2]
pub const TOKEN_TYPE_V2: u8 = 2;

/// Token type 1 NFT GROUP is identified by [0x81]
pub const TOKEN_TYPE_V1_NFT1_GROUP: u8 = 0x81;

/// Token type 1 NFT CHILD is identified by [0x41]
pub const TOKEN_TYPE_V1_NFT1_CHILD: u8 = 0x41;

/// All token types (as individual bytes)
pub static ALL_TOKEN_TYPES: &[u8] = &[
    TOKEN_TYPE_V1,
    TOKEN_TYPE_V2,
    TOKEN_TYPE_V1_NFT1_GROUP,
    TOKEN_TYPE_V1_NFT1_CHILD,
];
