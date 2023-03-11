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

    /// Block coming from bitcoind to Chronik.
    ///
    /// We don't index all fields (e.g. hashMerkleRoot), only those that are
    /// needed when querying a range of blocks.
    ///
    /// Instead of storing all the block data for Chronik again, we only store
    /// file_num, data_pos and undo_pos of the block data of the node.
    ///
    /// This makes the index relatively small, as it's mostly just pointing to
    /// the data the node already stores.
    ///
    /// Note that this prohibits us from using Chronik in pruned mode.
    #[derive(Debug, Clone, PartialEq, Eq)]
    pub struct Block {
        /// Block hash
        pub hash: [u8; 32],
        /// hashPrevBlock, hash of the previous block in the chain
        pub prev_hash: [u8; 32],
        /// nBits, difficulty of the header
        pub n_bits: u32,
        /// Timestamp of the block
        pub timestamp: i64,
        /// Height of the block in the chain.
        pub height: i32,
        /// File number of the block file this block is stored in.
        /// This can be used to later slice out transactions, so we don't have
        /// to index txs twice.
        pub file_num: u32,
        /// Position of the block within the block file, starting at the block
        /// header.
        pub data_pos: u32,
        /// Position of the undo data within the undo file.
        pub undo_pos: u32,
    }

    #[allow(missing_debug_implementations)]
    unsafe extern "C++" {
        include!("blockindex.h");
        include!("chronik-cpp/chronik_bridge.h");
        include!("node/context.h");
        include!("primitives/block.h");

        /// node::NodeContext from node/context.h
        #[namespace = "node"]
        type NodeContext;

        /// ::CBlockIndex from blockindex.h
        #[namespace = ""]
        type CBlockIndex;

        /// ::CBlock from primitives/block.h
        #[namespace = ""]
        type CBlock;

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

        /// Lookup the block index with the given hash, or throw an error
        /// if it couldn't be found.
        fn lookup_block_index(
            self: &ChronikBridge,
            hash: [u8; 32],
        ) -> Result<&CBlockIndex>;

        /// Find at which block the given block_index forks off from the node.
        fn find_fork(
            self: &ChronikBridge,
            block_index: &CBlockIndex,
        ) -> Result<&CBlockIndex>;

        /// Bridge bitcoind's classes to the shared struct [`Block`].
        fn bridge_block(block: &CBlock, block_index: &CBlockIndex) -> Block;

        /// CBlockIndex::GetAncestor
        fn get_block_ancestor(
            block_index: &CBlockIndex,
            height: i32,
        ) -> Result<&CBlockIndex>;

        /// Calls `InitError` from `node/ui_interface.h` to report an error to
        /// the user and then gracefully shut down the node.
        fn init_error(msg: &str) -> bool;

        /// Calls `AbortNode` from shutdown.h to gracefully shut down the node
        /// when an unrecoverable error occured.
        fn abort_node(msg: &str, user_msg: &str);
    }
}
