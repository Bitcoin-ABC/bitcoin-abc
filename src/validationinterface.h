// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_VALIDATIONINTERFACE_H
#define BITCOIN_VALIDATIONINTERFACE_H

#include <memory>

#include <boost/signals2/signal.hpp>

class CBlock;
class CBlockIndex;
struct CBlockLocator;
class CBlockIndex;
class CConnman;
class CReserveScript;
class CTransaction;
class CValidationInterface;
class CValidationState;
class uint256;

// These functions dispatch to one or all registered wallets

/** Register a wallet to receive updates from core */
void RegisterValidationInterface(CValidationInterface *pwalletIn);
/** Unregister a wallet from core */
void UnregisterValidationInterface(CValidationInterface *pwalletIn);
/** Unregister all wallets from core */
void UnregisterAllValidationInterfaces();

class CValidationInterface {
protected:
    virtual void UpdatedBlockTip(const CBlockIndex *pindexNew,
                                 const CBlockIndex *pindexFork,
                                 bool fInitialDownload) {}
    virtual void SyncTransaction(const CTransaction &tx,
                                 const CBlockIndex *pindex, int posInBlock) {}
    virtual void SetBestChain(const CBlockLocator &locator) {}
    virtual void UpdatedTransaction(const uint256 &hash) {}
    virtual void Inventory(const uint256 &hash) {}
    virtual void ResendWalletTransactions(int64_t nBestBlockTime,
                                          CConnman *connman) {}
    virtual void BlockChecked(const CBlock &, const CValidationState &) {}
    virtual void GetScriptForMining(std::shared_ptr<CReserveScript> &){};
    virtual void ResetRequestCount(const uint256 &hash){};
    virtual void NewPoWValidBlock(const CBlockIndex *pindex,
                                  const std::shared_ptr<const CBlock> &block){};
    friend void ::RegisterValidationInterface(CValidationInterface *);
    friend void ::UnregisterValidationInterface(CValidationInterface *);
    friend void ::UnregisterAllValidationInterfaces();
};

struct CMainSignals {
    /** Notifies listeners of updated block chain tip */
    boost::signals2::signal<void(const CBlockIndex *, const CBlockIndex *,
                                 bool fInitialDownload)>
        UpdatedBlockTip;
    /**
     * A posInBlock value for SyncTransaction calls for tranactions not included
     * in connected blocks such as transactions removed from mempool, accepted
     * to mempool or appearing in disconnected blocks.
     */
    static const int SYNC_TRANSACTION_NOT_IN_BLOCK = -1;
    /**
     * Notifies listeners of updated transaction data (transaction, and
     * optionally the block it is found in). Called with block data when
     * transaction is included in a connected block, and without block data when
     * transaction was accepted to mempool, removed from mempool (only when
     * removal was due to conflict from connected block), or appeared in a
     * disconnected block.
     */
    boost::signals2::signal<void(const CTransaction &,
                                 const CBlockIndex *pindex, int posInBlock)>
        SyncTransaction;
    /**
     * Notifies listeners of an updated transaction without new data (for now: a
     * coinbase potentially becoming visible).
     */
    boost::signals2::signal<void(const uint256 &)> UpdatedTransaction;
    /** Notifies listeners of a new active block chain. */
    boost::signals2::signal<void(const CBlockLocator &)> SetBestChain;
    /** Notifies listeners about an inventory item being seen on the network. */
    boost::signals2::signal<void(const uint256 &)> Inventory;
    /** Tells listeners to broadcast their data. */
    boost::signals2::signal<void(int64_t nBestBlockTime, CConnman *connman)>
        Broadcast;
    /** Notifies listeners of a block validation result */
    boost::signals2::signal<void(const CBlock &, const CValidationState &)>
        BlockChecked;
    /** Notifies listeners that a key for mining is required (coinbase) */
    boost::signals2::signal<void(std::shared_ptr<CReserveScript> &)>
        ScriptForMining;
    /** Notifies listeners that a block has been successfully mined */
    boost::signals2::signal<void(const uint256 &)> BlockFound;
    /**
     * Notifies listeners that a block which builds directly on our current tip
     * has been received and connected to the headers tree, though not validated
     * yet.
     */
    boost::signals2::signal<void(const CBlockIndex *,
                                 const std::shared_ptr<const CBlock> &)>
        NewPoWValidBlock;
};

CMainSignals &GetMainSignals();

#endif // BITCOIN_VALIDATIONINTERFACE_H
