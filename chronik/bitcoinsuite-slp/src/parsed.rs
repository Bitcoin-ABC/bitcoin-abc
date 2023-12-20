// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for data parsed from SLP and ALP.

use crate::structs::{Amount, GenesisInfo, TokenMeta};

/// Parsed data from SLP or ALP.
/// For SLP, this is from parsing an entire `OP_RETURN`.
/// For ALP, this is from parsing a single pushdata of an `OP_RETURN`.
#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub struct ParsedData {
    /// [`TokenMeta`] of the parsed data.
    pub meta: TokenMeta,
    /// Parsed tx type and the accompanying data.
    pub tx_type: ParsedTxType,
}

/// Parsed tx type and the accompanying data.
/// This defines how to color tx outputs.
#[derive(Clone, Debug, Eq, Hash, PartialEq)]
pub enum ParsedTxType {
    /// Parsed GENESIS tx with genesis info + mint data
    Genesis(ParsedGenesis),
    /// Parsed MINT tx with mint data
    Mint(ParsedMintData),
    /// Parsed SEND tx with send amounts
    Send(Vec<Amount>),
    /// Parsed unknown token type
    Unknown,
}

/// Data encoded in a GENESIS tx
#[derive(Clone, Debug, Default, Eq, Hash, PartialEq)]
pub struct ParsedGenesis {
    /// Token info
    pub info: GenesisInfo,
    /// Mint data defining the initial token quantity and mint batons.
    pub mint_data: ParsedMintData,
}

/// Mint data of a GENESIS or MINT tx
#[derive(Clone, Debug, Default, Eq, Hash, PartialEq)]
pub struct ParsedMintData {
    /// List of amounts to be minted by this tx, each having their own tx
    /// output
    pub amounts: Vec<Amount>,
    /// Number of mint batons to create, each having their own tx output
    pub num_batons: usize,
}
