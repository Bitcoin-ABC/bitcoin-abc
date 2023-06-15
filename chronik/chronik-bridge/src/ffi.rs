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
    #[derive(Clone, Debug, Default, Eq, PartialEq)]
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
        /// Serialized size of the block
        pub size: u64,
        /// Txs of this block, including positions within the block/undo files.
        pub txs: Vec<BlockTx>,
    }

    /// Tx in a block
    #[derive(Clone, Debug, Default, Eq, PartialEq)]
    pub struct BlockTx {
        /// Tx (without disk data)
        pub tx: Tx,
        /// Where the tx is stored within the block file.
        pub data_pos: u32,
        /// Where the tx's undo data is stored within the block's undo file.
        pub undo_pos: u32,
    }

    /// CTransaction, in a block or in the mempool.
    #[derive(Clone, Debug, Default, Eq, PartialEq)]
    pub struct Tx {
        /// TxId of the tx.
        pub txid: [u8; 32],
        /// nVersion of the tx.
        pub version: i32,
        /// Tx inputs.
        pub inputs: Vec<TxInput>,
        /// Tx outputs.
        pub outputs: Vec<TxOutput>,
        /// Locktime of the tx.
        pub locktime: u32,
    }

    /// COutPoint, pointing to a coin being spent.
    #[derive(Clone, Debug, Default, Eq, PartialEq)]
    pub struct OutPoint {
        /// TxId of the output of the coin.
        pub txid: [u8; 32],
        /// Index in the outputs of the tx of the coin.
        pub out_idx: u32,
    }

    /// CTxIn, spending an unspent output.
    #[derive(Clone, Debug, Default, Eq, PartialEq)]
    pub struct TxInput {
        /// Points to an output being spent.
        pub prev_out: OutPoint,
        /// scriptSig unlocking the output.
        pub script: Vec<u8>,
        /// nSequence.
        pub sequence: u32,
        /// Coin being spent by this tx.
        pub coin: Coin,
    }

    /// CTxOut, creating a new output.
    #[derive(Clone, Debug, Default, Eq, PartialEq)]
    pub struct TxOutput {
        /// Value of the output.
        pub value: i64,
        /// Script locking the output.
        pub script: Vec<u8>,
    }

    /// Coin, can be spent by providing a valid unlocking script.
    #[derive(Clone, Debug, Default, Eq, PartialEq)]
    pub struct Coin {
        /// Output, locking the coins.
        pub output: TxOutput,
        /// Height of the coin in the chain.
        pub height: i32,
        /// Whether the coin is a coinbase.
        pub is_coinbase: bool,
    }

    #[allow(missing_debug_implementations)]
    unsafe extern "C++" {
        include!("blockindex.h");
        include!("chronik-cpp/chronik_bridge.h");
        include!("node/context.h");
        include!("primitives/block.h");
        include!("primitives/transaction.h");

        /// node::NodeContext from node/context.h
        #[namespace = "node"]
        type NodeContext;

        /// ::CBlockIndex from blockindex.h
        #[namespace = ""]
        type CBlockIndex;

        /// ::CBlock from primitives/block.h
        #[namespace = ""]
        type CBlock;

        /// ::Config from config.h
        #[namespace = ""]
        type Config;

        /// ::CTransaction from primitives/transaction.h
        #[namespace = ""]
        type CTransaction;

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
        fn make_bridge(
            config: &Config,
            node: &NodeContext,
        ) -> UniquePtr<ChronikBridge>;

        /// Return the tip of the chain of the node.
        /// Returns hash=000...000, height=-1 if there's no block on the chain.
        fn get_chain_tip(self: &ChronikBridge) -> Result<&CBlockIndex>;

        /// Lookup the block index with the given hash, or throw an error
        /// if it couldn't be found.
        fn lookup_block_index(
            self: &ChronikBridge,
            hash: [u8; 32],
        ) -> Result<&CBlockIndex>;

        /// Load the CBlock data of this CBlockIndex from the disk
        fn load_block(
            self: &ChronikBridge,
            block_index: &CBlockIndex,
        ) -> Result<UniquePtr<CBlock>>;

        /// Bridge CTransaction -> ffi::Tx, including finding the spent coins.
        /// `tx` can be a mempool tx.
        fn bridge_tx(self: &ChronikBridge, tx: &CTransaction) -> Result<Tx>;

        /// Find at which block the given block_index forks off from the node.
        fn find_fork(
            self: &ChronikBridge,
            block_index: &CBlockIndex,
        ) -> Result<&CBlockIndex>;

        /// Add the given tx to the mempool, and if that succeeds, broadcast it
        /// to all our peers.
        /// Also check the actual tx fee doesn't exceed max_fee.
        /// Note max_fee is absolute, not a fee rate (as in sendrawtransaction).
        fn broadcast_tx(
            self: &ChronikBridge,
            raw_tx: &[u8],
            max_fee: i64,
        ) -> Result<[u8; 32]>;

        /// Bridge bitcoind's classes to the shared struct [`Block`].
        fn bridge_block(
            block: &CBlock,
            block_index: &CBlockIndex,
        ) -> Result<Block>;

        /// Load the CTransaction and CTxUndo data from disk and turn it into a
        /// bridged Tx, containing spent coins etc.
        fn load_tx(file_num: u32, data_pos: u32, undo_pos: u32) -> Result<Tx>;

        /// Load the CTransaction from disk and serialize it.
        fn load_raw_tx(file_num: u32, data_pos: u32) -> Result<Vec<u8>>;

        /// Get a BlockInfo for this CBlockIndex.
        fn get_block_info(block_index: &CBlockIndex) -> BlockInfo;

        /// CBlockIndex::GetAncestor
        fn get_block_ancestor(
            block_index: &CBlockIndex,
            height: i32,
        ) -> Result<&CBlockIndex>;

        /// Compress the given script using `ScriptCompression`.
        fn compress_script(script: &[u8]) -> Vec<u8>;

        /// Decompress the given script using `ScriptCompression`.
        fn decompress_script(compressed: &[u8]) -> Result<Vec<u8>>;

        /// Calls `InitError` from `node/ui_interface.h` to report an error to
        /// the user and then gracefully shut down the node.
        fn init_error(msg: &str) -> bool;

        /// Calls `AbortNode` from shutdown.h to gracefully shut down the node
        /// when an unrecoverable error occured.
        fn abort_node(msg: &str, user_msg: &str);

        /// Returns true if a shutdown is requested, false otherwise.
        /// See `ShutdownRequested` in `shutdown.h`.
        fn shutdown_requested() -> bool;
    }
}

/// SAFETY: All fields of ChronikBridge (const Consensus::Params &, const
/// node::NodeContext &) can be moved betweed threads safely.
#[allow(unsafe_code)]
unsafe impl Send for ChronikBridge {}

/// SAFETY: All fields of ChronikBridge (const Consensus::Params &, const
/// node::NodeContext &) can be accessed from different threads safely.
#[allow(unsafe_code)]
unsafe impl Sync for ChronikBridge {}

impl std::fmt::Debug for ChronikBridge {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ChronikBridge").finish_non_exhaustive()
    }
}
