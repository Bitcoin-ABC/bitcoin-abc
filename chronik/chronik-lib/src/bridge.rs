// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Rust side of the bridge; these structs and functions are exposed to C++.

use std::net::{AddrParseError, IpAddr, SocketAddr};

use abc_rust_error::Result;
use chronik_bridge::ffi::init_error;
use chronik_util::{log, log_chronik};
use thiserror::Error;

use crate::ffi::{self, StartChronikValidationInterface};

/// Errors for [`Chronik`] and [`setup_chronik`].
#[derive(Debug, Eq, Error, PartialEq)]
pub enum ChronikError {
    /// Chronik host address failed to parse
    #[error("Invalid Chronik host address {0:?}: {1}")]
    InvalidChronikHost(String, AddrParseError),
}

use self::ChronikError::*;

/// Setup the Chronik bridge. Returns a ChronikIndexer object.
pub fn setup_chronik(params: ffi::SetupParams) -> bool {
    match try_setup_chronik(params) {
        Ok(()) => true,
        Err(report) => {
            log_chronik!("{report:?}");
            init_error(&report.to_string())
        }
    }
}

fn try_setup_chronik(params: ffi::SetupParams) -> Result<()> {
    let addrs = params
        .hosts
        .into_iter()
        .map(|host| parse_socket_addr(host, params.default_port))
        .collect::<Result<Vec<_>>>()?;
    log!("Starting Chronik bound to {:?}\n", addrs);
    StartChronikValidationInterface(Box::new(Chronik));
    Ok(())
}

fn parse_socket_addr(host: String, default_port: u16) -> Result<SocketAddr> {
    if let Ok(addr) = host.parse::<SocketAddr>() {
        return Ok(addr);
    }
    let ip_addr = host
        .parse::<IpAddr>()
        .map_err(|err| InvalidChronikHost(host, err))?;
    Ok(SocketAddr::new(ip_addr, default_port))
}

/// Contains all db, runtime, tpc, etc. handles needed by Chronik.
/// This makes it so when this struct is dropped, all handles are relased
/// cleanly.
#[derive(Debug)]
pub struct Chronik;

impl Chronik {
    /// Tx added to the bitcoind mempool
    pub fn handle_tx_added_to_mempool(&self) {
        log_chronik!("Chronik: transaction added to mempool\n");
    }

    /// Tx removed from the bitcoind mempool
    pub fn handle_tx_removed_from_mempool(&self) {
        log_chronik!("Chronik: transaction removed from mempool\n");
    }

    /// Block connected to the longest chain
    pub fn handle_block_connected(&self) {
        log_chronik!("Chronik: block connected\n");
    }

    /// Block disconnected from the longest chain
    pub fn handle_block_disconnected(&self) {
        log_chronik!("Chronik: block disconnected\n");
    }
}
