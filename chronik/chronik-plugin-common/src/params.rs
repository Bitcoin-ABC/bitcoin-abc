// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`PluginParams`].

use std::path::PathBuf;

use bitcoinsuite_core::net::Net;

/// Parameters for the plugin system
#[derive(Debug)]
pub struct PluginParams {
    /// main, test or regtest
    pub net: Net,
    /// Directory where the plugins reside
    pub plugins_dir: PathBuf,
    /// Configuration file for which plugins to load
    pub plugins_conf: PathBuf,
}
