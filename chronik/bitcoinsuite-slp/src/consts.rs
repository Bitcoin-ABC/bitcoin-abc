// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Constants used in SLP and ALP

/// GENESIS tx/section type to create a new token ID
pub const GENESIS: &[u8] = b"GENESIS";
/// MINT tx/section type to add tokens into circulation
pub const MINT: &[u8] = b"MINT";
/// SEND tx/section type to move tokens between addresses
pub const SEND: &[u8] = b"SEND";
/// BURN tx/section type to remove tokens from circulation
pub const BURN: &[u8] = b"BURN";
