// Copyright (c) 2018-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_INTERFACES_CHAIN_H
#define BITCOIN_INTERFACES_CHAIN_H

#include <primitives/transaction.h>
#include <primitives/txid.h>
#include <util/settings.h> // For util::SettingsValue

#include <cstddef>
#include <cstdint>
#include <functional>
#include <memory>
#include <optional>
#include <string>
#include <vector>

class ArgsManager;
class CBlock;
class CChainParams;
class Coin;
class Config;
class CRPCCommand;
class CScheduler;
class TxValidationState;

enum class MemPoolRemovalReason;

struct BlockHash;
struct bilingual_str;
struct CBlockLocator;
struct NodeContext;

namespace Consensus {
struct Params;
}

namespace interfaces {

class Handler;
class Wallet;

//! Helper for findBlock to selectively return pieces of block data.
class FoundBlock {
public:
    FoundBlock &hash(BlockHash &hash) {
        m_hash = &hash;
        return *this;
    }
    FoundBlock &height(int &height) {
        m_height = &height;
        return *this;
    }
    FoundBlock &time(int64_t &time) {
        m_time = &time;
        return *this;
    }
    FoundBlock &maxTime(int64_t &max_time) {
        m_max_time = &max_time;
        return *this;
    }
    FoundBlock &mtpTime(int64_t &mtp_time) {
        m_mtp_time = &mtp_time;
        return *this;
    }
    //! Read block data from disk. If the block exists but doesn't have data
    //! (for example due to pruning), the CBlock variable will be set to null.
    FoundBlock &data(CBlock &data) {
        m_data = &data;
        return *this;
    }

    BlockHash *m_hash = nullptr;
    int *m_height = nullptr;
    int64_t *m_time = nullptr;
    int64_t *m_max_time = nullptr;
    int64_t *m_mtp_time = nullptr;
    CBlock *m_data = nullptr;
};

//! Interface giving clients (wallet processes, maybe other analysis tools in
//! the future) ability to access to the chain state, receive notifications,
//! estimate fees, and submit transactions.
//!
//! TODO: Current chain methods are too low level, exposing too much of the
//! internal workings of the bitcoin node, and not being very convenient to use.
//! Chain methods should be cleaned up and simplified over time. Examples:
//!
//! * The initMessages() and showProgress() methods which the wallet uses to
//! send
//!   notifications to the GUI should go away when GUI and wallet can directly
//!   communicate with each other without going through the node
//!   (https://github.com/bitcoin/bitcoin/pull/15288#discussion_r253321096).
//!
//! * The handleRpc, registerRpcs, rpcEnableDeprecated methods and other RPC
//!   methods can go away if wallets listen for HTTP requests on their own
//!   ports instead of registering to handle requests on the node HTTP port.
//!
//! * Move fee estimation queries to an asynchronous interface and let the
//!   wallet cache it, fee estimation being driven by node mempool, wallet
//!   should be the consumer.
//!
//! * The `guessVerificationProgress`, `getBlockHeight`, `getBlockHash`, etc
//!   methods can go away if rescan logic is moved on the node side, and wallet
//!   only register rescan request.
class Chain {
public:
    virtual ~Chain() {}

    //! Get current chain height, not including genesis block (returns 0 if
    //! chain only contains genesis block, std::nullopt if chain does not
    //! contain any blocks)
    virtual std::optional<int> getHeight() = 0;

    //! Get block height above genesis block. Returns 0 for genesis block,
    //! 1 for following block, and so on. Returns std::nullopt for a block not
    //! included in the current chain.
    virtual std::optional<int> getBlockHeight(const BlockHash &hash) = 0;

    //! Get block hash. Height must be valid or this function will abort.
    virtual BlockHash getBlockHash(int height) = 0;

    //! Check that the block is available on disk (i.e. has not been
    //! pruned), and contains transactions.
    virtual bool haveBlockOnDisk(int height) = 0;

    //! Return height of the first block in the chain with timestamp equal
    //! or greater than the given time and height equal or greater than the
    //! given height, or std::nullopt if there is no block with a high enough
    //! timestamp and height. Also return the block hash as an optional output
    //! parameter (to avoid the cost of a second lookup in case this information
    //! is needed.)
    virtual std::optional<int>
    findFirstBlockWithTimeAndHeight(int64_t time, int height,
                                    BlockHash *hash) = 0;

    //! Get locator for the current chain tip.
    virtual CBlockLocator getTipLocator() = 0;

    //! Return height of the highest block on chain in common with the locator,
    //! which will either be the original block used to create the locator,
    //! or one of its ancestors.
    virtual std::optional<int>
    findLocatorFork(const CBlockLocator &locator) = 0;

    //! Check if transaction will be final given chain height current time.
    virtual bool
    contextualCheckTransactionForCurrentBlock(const CTransaction &tx,
                                              TxValidationState &state) = 0;

    //! Return whether node has the block and optionally return block metadata
    //! or contents.
    virtual bool findBlock(const BlockHash &hash,
                           const FoundBlock &block = {}) = 0;

    //! Find first block in the chain with timestamp >= the given time
    //! and height >= than the given height, return false if there is no block
    //! with a high enough timestamp and height. Optionally return block
    //! information.
    virtual bool
    findFirstBlockWithTimeAndHeight(int64_t min_time, int min_height,
                                    const FoundBlock &block = {}) = 0;

    //! Find next block if block is part of current chain. Also flag if
    //! there was a reorg and the specified block hash is no longer in the
    //! current chain, and optionally return block information.
    virtual bool findNextBlock(const BlockHash &block_hash, int block_height,
                               const FoundBlock &next = {},
                               bool *reorg = nullptr) = 0;

    //! Find ancestor of block at specified height and optionally return
    //! ancestor information.
    virtual bool findAncestorByHeight(const BlockHash &block_hash,
                                      int ancestor_height,
                                      const FoundBlock &ancestor_out = {}) = 0;

    //! Return whether block descends from a specified ancestor, and
    //! optionally return ancestor information.
    virtual bool findAncestorByHash(const BlockHash &block_hash,
                                    const BlockHash &ancestor_hash,
                                    const FoundBlock &ancestor_out = {}) = 0;

    //! Find most recent common ancestor between two blocks and optionally
    //! return block information.
    virtual bool findCommonAncestor(const BlockHash &block_hash1,
                                    const BlockHash &block_hash2,
                                    const FoundBlock &ancestor_out = {},
                                    const FoundBlock &block1_out = {},
                                    const FoundBlock &block2_out = {}) = 0;

    //! Look up unspent output information. Returns coins in the mempool and in
    //! the current chain UTXO set. Iterates through all the keys in the map and
    //! populates the values.
    virtual void findCoins(std::map<COutPoint, Coin> &coins) = 0;

    //! Estimate fraction of total transactions verified if blocks up to
    //! the specified block hash are verified.
    virtual double guessVerificationProgress(const BlockHash &block_hash) = 0;

    //! Return true if data is available for all blocks in the specified range
    //! of blocks. This checks all blocks that are ancestors of block_hash in
    //! the height range from min_height to max_height, inclusive.
    virtual bool hasBlocks(const BlockHash &block_hash, int min_height = 0,
                           std::optional<int> max_height = {}) = 0;

    //! Check if transaction has descendants in mempool.
    virtual bool hasDescendantsInMempool(const TxId &txid) = 0;

    //! Transaction is added to memory pool, if the transaction fee is below the
    //! amount specified by max_tx_fee, and broadcast to all peers if relay is
    //! set to true. Return false if the transaction could not be added due to
    //! the fee or for another reason.
    virtual bool broadcastTransaction(const Config &config,
                                      const CTransactionRef &tx,
                                      const Amount &max_tx_fee, bool relay,
                                      std::string &err_string) = 0;

    //! Calculate mempool ancestor and descendant counts for the given
    //! transaction.
    virtual void getTransactionAncestry(const TxId &txid, size_t &ancestors,
                                        size_t &descendants) = 0;

    //! Get the node's package limits.
    //! Currently only returns the ancestor and descendant count limits, but
    //! could be enhanced to return more policy settings.
    virtual void getPackageLimits(size_t &limit_ancestor_count,
                                  size_t &limit_descendant_count) = 0;

    //! Check if transaction will pass the mempool's chain limits.
    virtual bool checkChainLimits(const CTransactionRef &tx) = 0;

    //! Estimate fee
    virtual CFeeRate estimateFee() const = 0;

    //! Relay current minimum fee (from -minrelaytxfee settings).
    virtual CFeeRate relayMinFee() = 0;

    //! Relay dust fee setting (-dustrelayfee), reflecting lowest rate it's
    //! economical to spend.
    virtual CFeeRate relayDustFee() = 0;

    //! Check if any block has been pruned.
    virtual bool havePruned() = 0;

    //! Check if the node is ready to broadcast transactions.
    virtual bool isReadyToBroadcast() = 0;

    //! Check if in IBD.
    virtual bool isInitialBlockDownload() = 0;

    //! Check if shutdown requested.
    virtual bool shutdownRequested() = 0;

    //! Get adjusted time.
    virtual int64_t getAdjustedTime() = 0;

    //! Send init message.
    virtual void initMessage(const std::string &message) = 0;

    //! Send init warning.
    virtual void initWarning(const bilingual_str &message) = 0;

    //! Send init error.
    virtual void initError(const bilingual_str &message) = 0;

    //! Send progress indicator.
    virtual void showProgress(const std::string &title, int progress,
                              bool resume_possible) = 0;

    //! Chain notifications.
    class Notifications {
    public:
        virtual ~Notifications() {}
        virtual void transactionAddedToMempool(const CTransactionRef &tx,
                                               uint64_t mempool_sequence) {}
        virtual void transactionRemovedFromMempool(const CTransactionRef &ptx,
                                                   MemPoolRemovalReason reason,
                                                   uint64_t mempool_sequence) {}
        virtual void blockConnected(const CBlock &block, int height) {}
        virtual void blockDisconnected(const CBlock &block, int height) {}
        virtual void updatedBlockTip() {}
        virtual void chainStateFlushed(const CBlockLocator &locator) {}
    };

    //! Register handler for notifications.
    virtual std::unique_ptr<Handler>
    handleNotifications(std::shared_ptr<Notifications> notifications) = 0;

    //! Wait for pending notifications to be processed unless block hash points
    //! to the current chain tip.
    virtual void waitForNotificationsIfTipChanged(const BlockHash &old_tip) = 0;

    //! Register handler for RPC. Command is not copied, so reference
    //! needs to remain valid until Handler is disconnected.
    virtual std::unique_ptr<Handler> handleRpc(const CRPCCommand &command) = 0;

    //! Check if deprecated RPC is enabled.
    virtual bool rpcEnableDeprecated(const std::string &method) = 0;

    //! Run function after given number of seconds. Cancel any previous calls
    //! with same name.
    virtual void rpcRunLater(const std::string &name, std::function<void()> fn,
                             int64_t seconds) = 0;

    //! Current RPC serialization flags.
    virtual int rpcSerializationFlags() = 0;

    //! Return <datadir>/settings.json setting value.
    virtual util::SettingsValue getRwSetting(const std::string &name) = 0;

    //! Write a setting to <datadir>/settings.json.
    virtual bool updateRwSetting(const std::string &name,
                                 const util::SettingsValue &value) = 0;

    //! Synchronously send transactionAddedToMempool notifications about all
    //! current mempool transactions to the specified handler and return after
    //! the last one is sent. These notifications aren't coordinated with async
    //! notifications sent by handleNotifications, so out of date async
    //! notifications from handleNotifications can arrive during and after
    //! synchronous notifications from requestMempoolTransactions. Clients need
    //! to be prepared to handle this by ignoring notifications about unknown
    //! removed transactions and already added new transactions.
    virtual void requestMempoolTransactions(Notifications &notifications) = 0;

    //! This Chain's parameters
    virtual const CChainParams &params() const = 0;
};

//! Interface to let node manage chain clients (wallets, or maybe tools for
//! monitoring and analysis in the future).
class ChainClient {
public:
    virtual ~ChainClient() {}

    //! Register rpcs.
    virtual void registerRpcs() = 0;

    //! Check for errors before loading.
    virtual bool verify() = 0;

    //! Load saved state.
    virtual bool load() = 0;

    //! Start client execution and provide a scheduler.
    virtual void start(CScheduler &scheduler) = 0;

    //! Save state to disk.
    virtual void flush() = 0;

    //! Shut down client.
    virtual void stop() = 0;

    //! Set mock time.
    virtual void setMockTime(int64_t time) = 0;
};

//! Return implementation of Chain interface.
std::unique_ptr<Chain> MakeChain(NodeContext &node, const CChainParams &params);

} // namespace interfaces

#endif // BITCOIN_INTERFACES_CHAIN_H
