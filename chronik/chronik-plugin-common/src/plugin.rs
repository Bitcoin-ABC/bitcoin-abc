// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for [`Plugin`].

use bitcoinsuite_slp::lokad_id::LokadId;
use versions::SemVer;

/// Individual handle on a plugin
#[derive(Debug)]
pub struct Plugin {
    /// Name of the plugin module
    pub module_name: String,
    /// Class name of the plugin
    pub class_name: String,
    /// version() of the plugin
    pub version: SemVer,
    /// lokad_id() of the plugin
    pub lokad_ids: Vec<LokadId>,
}
