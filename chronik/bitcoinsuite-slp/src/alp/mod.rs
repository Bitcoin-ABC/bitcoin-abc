// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Modules for the Augmented Ledger Protocol
//!
//! See here for a specification:
//! https://ecashbuilders.notion.site/ALP-a862a4130877448387373b9e6a93dd97

mod build;
pub mod consts;
mod parse;

pub use crate::alp::build::*;
pub use crate::alp::parse::*;
