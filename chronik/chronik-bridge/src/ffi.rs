// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//! Module containing the cxx definitions for the bridge from C++ to Rust.

pub use self::ffi_inner::*;

#[allow(unsafe_code)]
#[cxx::bridge(namespace = "chronik_bridge")]
mod ffi_inner {
    /// Info about a block
    #[derive(Clone, Debug, Default, Eq, PartialEq)]
    pub struct BlockInfo {
        /// Hash of the block (or 000...000 if no block)
        pub hash: [u8; 32],

        /// Height of the block (or -1 if no block)
        pub height: i32,
    }

    #[allow(missing_debug_implementations)]
    unsafe extern "C++" {
        include!("chronik-cpp/chronik_bridge.h");
        include!("node/context.h");

        /// ::NodeContext from node/context.h
        #[namespace = ""]
        type NodeContext;

        /// Bridge to bitcoind to access the node
        type ChronikBridge;

        /// Print the message to bitcoind's logs.
        fn log_print(
            logging_function: &str,
            source_file: &str,
            source_line: u32,
            msg: &str,
        );

        /// Print the message to bitcoind's logs under the BCLog::Chronik
        /// category.
        fn log_print_chronik(
            logging_function: &str,
            source_file: &str,
            source_line: u32,
            msg: &str,
        );

        /// Make the bridge given the NodeContext
        fn make_bridge(node: &NodeContext) -> UniquePtr<ChronikBridge>;

        /// Return the tip of the chain of the node.
        /// Returns hash=000...000, height=-1 if there's no block on the chain.
        fn get_chain_tip(self: &ChronikBridge) -> BlockInfo;
    }
}
