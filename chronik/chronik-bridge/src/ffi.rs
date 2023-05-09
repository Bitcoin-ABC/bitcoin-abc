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
        pub sats: i64,
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

    /// Wrapper struct for a raw block header.
    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct RawBlockHeader {
        /// Raw block header
        pub data: [u8; 80],
    }

    /// Wrapper struct for a block hash.
    #[derive(Clone, Debug, Eq, PartialEq)]
    pub struct WrappedBlockHash {
        /// Raw block hash
        pub data: [u8; 32],
    }

    #[allow(missing_debug_implementations)]
    unsafe extern "C++" {
        include!("blockindex.h");
        include!("chronik-cpp/chronik_bridge.h");
        include!("coins.h");
        include!("node/context.h");
        include!("primitives/block.h");
        include!("primitives/transaction.h");
        include!("undo.h");

        /// node::NodeContext from node/context.h
        #[namespace = "node"]
        type NodeContext;

        /// ::CBlockIndex from blockindex.h
        #[namespace = ""]
        type CBlockIndex;

        /// ::CBlock from primitives/block.h
        #[namespace = ""]
        type CBlock;

        /// ::CBlockUndo from undo.h
        #[namespace = ""]
        type CBlockUndo;

        /// ::Coin from coins.h (renamed to CCoin to prevent a name clash)
        #[namespace = ""]
        #[cxx_name = "Coin"]
        type CCoin;

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
        fn make_bridge(node: &NodeContext) -> UniquePtr<ChronikBridge>;

        /// Return the tip of the chain of the node.
        /// Returns hash=000...000, height=-1 if there's no block on the chain.
        fn get_chain_tip(self: &ChronikBridge) -> Result<&CBlockIndex>;

        /// Lookup the block index with the given hash, or throw an error
        /// if it couldn't be found.
        fn lookup_block_index(
            self: &ChronikBridge,
            hash: [u8; 32],
        ) -> Result<&CBlockIndex>;

        /// Lookup the block index with the given height, or throw an error
        /// if it couldn't be found.
        fn lookup_block_index_by_height(
            self: &ChronikBridge,
            height: i32,
        ) -> Result<&CBlockIndex>;

        /// Get a range of consecutive block headers.
        fn get_block_headers_by_range(
            self: &ChronikBridge,
            start: i32,
            end: i32,
        ) -> Result<Vec<RawBlockHeader>>;

        /// Get a range of consecutive block hashes.
        fn get_block_hashes_by_range(
            self: &ChronikBridge,
            start: i32,
            end: i32,
        ) -> Result<Vec<WrappedBlockHash>>;

        /// Load the CBlock data of this CBlockIndex from the disk
        fn load_block(
            self: &ChronikBridge,
            block_index: &CBlockIndex,
        ) -> Result<UniquePtr<CBlock>>;

        /// Load the CBlockUndo data of this CBlockIndex from the disk undo data
        fn load_block_undo(
            self: &ChronikBridge,
            block_index: &CBlockIndex,
        ) -> Result<UniquePtr<CBlockUndo>>;

        /// Load the CTransaction and CTxUndo data from disk and turn it into a
        /// bridged Tx, containing spent coins etc.
        fn load_tx(
            self: &ChronikBridge,
            file_num: u32,
            data_pos: u32,
            undo_pos: u32,
        ) -> Result<Tx>;

        /// Load the CTransaction from disk and serialize it.
        fn load_raw_tx(
            self: &ChronikBridge,
            file_num: u32,
            data_pos: u32,
        ) -> Result<Vec<u8>>;

        /// Check if the transaction is finalized via avalanche pre-consensus.
        fn is_avalanche_finalized_preconsensus(
            self: &ChronikBridge,
            mempool_txid: &[u8; 32],
        ) -> bool;

        /// Find at which block the given block_index forks off from the node.
        fn find_fork(
            self: &ChronikBridge,
            block_index: &CBlockIndex,
        ) -> Result<&CBlockIndex>;

        /// Lookup the spent coins of a tx and fill them in in-place.
        /// - `not_found` will be the outpoints that couldn't be found in the
        ///   node or the DB.
        /// - `coins_to_uncache` will be the outpoints that need to be uncached
        ///   if the tx doesn't end up being broadcast. This is so that clients
        ///   can't fill our cache with useless old coins. It mirrors the
        ///   behavior of `MemPoolAccept::PreChecks`, which uncaches the queried
        ///   coins if they don't end up being spent.
        fn lookup_spent_coins(
            self: &ChronikBridge,
            tx: &mut Tx,
            not_found: &mut Vec<OutPoint>,
            coins_to_uncache: &mut Vec<OutPoint>,
        ) -> Result<()>;

        /// Remove the coins from the coin cache.
        /// This must be done after a call to `lookup_spent_coins` where the tx
        /// wasn't broadcast, to avoid clients filling our cache with unneeded
        /// coins.
        fn uncache_coins(
            self: &ChronikBridge,
            coins: &[OutPoint],
        ) -> Result<()>;

        /// Add the given tx to the mempool, and if that succeeds, broadcast it
        /// to all our peers.
        /// Also check the actual tx fee doesn't exceed max_fee.
        /// Note max_fee is absolute, not a fee rate (as in sendrawtransaction).
        fn broadcast_tx(
            self: &ChronikBridge,
            raw_tx: &[u8],
            max_fee: i64,
        ) -> Result<[u8; 32]>;

        /// Calls `AbortNode` from shutdown.h to gracefully shut down the node
        /// when an unrecoverable error occured.
        fn fatal_error(self: &ChronikBridge, msg: &str, user_msg: &str);

        /// Returns true if a shutdown is requested, false otherwise.
        /// See `ShutdownRequested` in `shutdown.h`.
        fn shutdown_requested(self: &ChronikBridge) -> bool;

        /// Returns the genesis block hash for the current chain
        fn get_genesis_hash(self: &ChronikBridge) -> WrappedBlockHash;

        /// Return the estimated fee rate for a tx to be mined in the next block
        /// in sats/kB
        fn estimate_feerate_sats_per_kb(self: &ChronikBridge) -> i64;

        /// Return the minimum relay fee rate for a tx to be accepted into the
        /// node mempool in sats/kB
        fn min_relay_feerate_sats_per_kb(self: &ChronikBridge) -> i64;

        /// Return the feerate information for the mempool tx
        fn get_feerate_info(
            self: &ChronikBridge,
            mempool_txid: [u8; 32],
            modified_fee_rate_sats_per_kb: &mut i64,
            virtual_size_bytes: &mut u32,
        ) -> bool;

        /// Bridge CTransaction -> ffi::Tx, using the given spent coins.
        fn bridge_tx(
            tx: &CTransaction,
            spent_coins: &CxxVector<CCoin>,
        ) -> Result<Tx>;

        /// Bridge bitcoind's classes to the shared struct [`Block`].
        fn bridge_block(
            block: &CBlock,
            block_undo: &CBlockUndo,
            block_index: &CBlockIndex,
        ) -> Result<Block>;

        /// Get a BlockInfo for this CBlockIndex.
        fn get_block_info(block_index: &CBlockIndex) -> BlockInfo;

        /// Get the serialized block header for this CBlockIndex.
        fn get_block_header(block_index: &CBlockIndex) -> [u8; 80];

        /// CBlockIndex::GetAncestor
        fn get_block_ancestor(
            block_index: &CBlockIndex,
            height: i32,
        ) -> Result<&CBlockIndex>;

        /// Compress the given script using `ScriptCompression`.
        fn compress_script(script: &[u8]) -> Vec<u8>;

        /// Decompress the given script using `ScriptCompression`.
        fn decompress_script(compressed: &[u8]) -> Result<Vec<u8>>;

        /// Calc the fee in satoshis for the given tx size in bytes.
        fn calc_fee(num_bytes: usize, sats_fee_per_kb: i64) -> i64;

        /// Default maximum fee rate when broadcasting txs.
        fn default_max_raw_tx_fee_rate_per_kb() -> i64;

        /// Calls `SyncWithValidationInterfaceQueue` from validationinterface.h
        /// to make sure wallet/indexes are synced.
        fn sync_with_validation_interface_queue();

        /// Calls `InitError` from `node/ui_interface.h` to report an error to
        /// the user and then gracefully shut down the node.
        fn init_error(msg: &str) -> bool;

        /// Returns CLIENT_NAME from clientversion.cpp
        fn client_name() -> String;

        /// Calls FormatFullVersion from clientversion.cpp
        fn format_full_version() -> String;
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

/// SAFETY: All functions that take CBlockIndex are acquiring required C++ locks
#[allow(unsafe_code)]
unsafe impl Sync for CBlockIndex {}

impl std::fmt::Debug for ChronikBridge {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("ChronikBridge").finish_non_exhaustive()
    }
}
