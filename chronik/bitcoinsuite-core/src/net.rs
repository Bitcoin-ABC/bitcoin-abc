// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Net`]

/// Net we're running on, mainnet, testnet, regtest.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Net {
    /// Mainnet `[main]`
    Mainnet,
    /// Testnet `[test]`
    Testnet,
    /// Regtest `[regtest]`
    Regtest,
}
