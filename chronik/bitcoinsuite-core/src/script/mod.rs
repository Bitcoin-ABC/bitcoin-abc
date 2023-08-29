// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module for structs and definitions regarding Script.

mod compress;
mod iter;
mod op;
pub mod opcode;
mod pubkey;
mod pubkey_variant;
#[allow(clippy::module_inception)]
mod script;
mod script_mut;
mod uncompressed_pubkey;
mod variant;

pub use self::compress::*;
pub use self::iter::*;
pub use self::op::*;
pub use self::pubkey::*;
pub use self::pubkey_variant::*;
pub use self::script::*;
pub use self::script_mut::*;
pub use self::uncompressed_pubkey::*;
pub use self::variant::*;
