// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

use thiserror::Error;

#[derive(Debug, Error, PartialEq)]
pub enum ChainError {
    #[error("Invalid chain: {0}")]
    InvalidChain(String),
}

#[derive(Clone, Debug, PartialEq)]
pub enum Chain {
    Mainnet,
    Testnet,
    Regtest,
}

impl std::str::FromStr for Chain {
    type Err = ChainError;

    /// ```
    /// use explorer_server::chain::{Chain, ChainError};
    ///
    /// assert_eq!(Ok(Chain::Mainnet), "mainnet".parse::<Chain>());
    /// assert_eq!(Ok(Chain::Testnet), "testnet".parse::<Chain>());
    /// assert_eq!(Ok(Chain::Regtest), "regtest".parse::<Chain>());
    /// assert_eq!(
    ///     Err(ChainError::InvalidChain("foonet".to_string())),
    ///     "foonet".parse::<Chain>()
    /// );
    /// ```
    fn from_str(chain: &str) -> Result<Chain, Self::Err> {
        match chain {
            "mainnet" => Ok(Chain::Mainnet),
            "testnet" => Ok(Chain::Testnet),
            "regtest" => Ok(Chain::Regtest),
            _ => Err(ChainError::InvalidChain(chain.to_string())),
        }
    }
}
