// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_VALIDATIONINTERFACE_H
#define BITCOIN_VALIDATIONINTERFACE_H

#include "primitives/transaction.h" // CTransaction(Ref)

#include <functional>
#include <memory>

class CBlock;
class CBlockIndex;
struct CBlockLocator;
class CBlockIndex;
class CConnman;
class CReserveScript;
class CValidationInterface;
class CValidationState;
class uint256;
class CScheduler;
class CTxMemPool;
enum class MemPoolRemovalReason;

// These functions dispatch to one or all registered wallets

/** Register a wallet to receive updates from core */
void RegisterValidationInterface(CValidationInterface *pwalletIn);
/** Unregister a wallet from core */
void UnregisterValidationInterface(CValidationInterface *pwalletIn);
/** Unregister all wallets from core */
void UnregisterAllValidationInterfaces();
/**
 * Pushes a function to callback onto the notification queue, guaranteeing any
 * callbacks generated prior to now are finished when the function is called.
 *
 * Be very careful blocking on func to be called if any locks are held -
 * validation interface clients may not be able to make progress as they often
 * wait for things like cs_main, so blocking until func is called with cs_main
 * will result in a deadlock (that DEBUG_LOCKORDER will miss).
 */
void CallFunctionInValidationInterfaceQueue(std::function<void()> func);

class CValidationInterface {
protected:
    /**
     * Protected destructor so that instances can only be deleted by derived
     * classes. If that restriction is no longer desired, this should be made
     * public and virtual.
     */
    ~CValidationInterface() = default;
    /**
     * Notifies listeners of updated block chain tip
     *
     * Called on a background thread.
     */
    virtual void UpdatedBlockTip(const CBlockIndex *pindexNew,
                                 const CBlockIndex *pindexFork,
                                 bool fInitialDownload) {}
    /**
     * Notifies listeners of a transaction having been added to mempool.
     *
     * Called on a background thread.
     */
    virtual void TransactionAddedToMempool(const CTransactionRef &ptxn) {}
    /**
     * Notifies listeners of a transaction leaving mempool.
     *
     * This only fires for transactions which leave mempool because of expiry,
     * size limiting, reorg (changes in lock times/coinbase maturity), or
     * replacement. This does not include any transactions which are included
     * in BlockConnectedDisconnected either in block->vtx or in txnConflicted.
     *
     * Called on a background thread.
     */
    virtual void TransactionRemovedFromMempool(const CTransactionRef &ptx) {}
    /**
     * Notifies listeners of a block being connected.
     * Provides a vector of transactions evicted from the mempool as a result.
     */
    virtual void
    BlockConnected(const std::shared_ptr<const CBlock> &block,
                   const CBlockIndex *pindex,
                   const std::vector<CTransactionRef> &txnConflicted) {}
    /** Notifies listeners of a block being disconnected */
    virtual void BlockDisconnected(const std::shared_ptr<const CBlock> &block) {
    }
    /** Notifies listeners of the new active block chain on-disk. */
    virtual void SetBestChain(const CBlockLocator &locator) {}
    /** Notifies listeners about an inventory item being seen on the network. */
    virtual void Inventory(const uint256 &hash) {}
    /** Tells listeners to broadcast their data. */
    virtual void ResendWalletTransactions(int64_t nBestBlockTime,
                                          CConnman *connman) {}
    /**
     * Notifies listeners of a block validation result.
     * If the provided CValidationState IsValid, the provided block
     * is guaranteed to be the current best block at the time the
     * callback was generated (not necessarily now)
     */
    virtual void BlockChecked(const CBlock &, const CValidationState &) {}
    /**
     * Notifies listeners that a block which builds directly on our current tip
     * has been received and connected to the headers tree, though not validated
     * yet.
     */
    virtual void NewPoWValidBlock(const CBlockIndex *pindex,
                                  const std::shared_ptr<const CBlock> &block){};
    friend void ::RegisterValidationInterface(CValidationInterface *);
    friend void ::UnregisterValidationInterface(CValidationInterface *);
    friend void ::UnregisterAllValidationInterfaces();
};

struct MainSignalsInstance;
class CMainSignals {
private:
    std::unique_ptr<MainSignalsInstance> m_internals;

    friend void ::RegisterValidationInterface(CValidationInterface *);
    friend void ::UnregisterValidationInterface(CValidationInterface *);
    friend void ::UnregisterAllValidationInterfaces();
    friend void ::CallFunctionInValidationInterfaceQueue(
        std::function<void()> func);

    void MempoolEntryRemoved(CTransactionRef tx, MemPoolRemovalReason reason);

public:
    /**
     * Register a CScheduler to give callbacks which should run in the
     * background (may only be called once)
     */
    void RegisterBackgroundSignalScheduler(CScheduler &scheduler);
    /**
     * Unregister a CScheduler to give callbacks which should run in the
     * background - these callbacks will now be dropped!
     */
    void UnregisterBackgroundSignalScheduler();
    /** Call any remaining callbacks on the calling thread */
    void FlushBackgroundCallbacks();

    /** Register with mempool to call TransactionRemovedFromMempool callbacks */
    void RegisterWithMempoolSignals(CTxMemPool &pool);
    /** Unregister with mempool */
    void UnregisterWithMempoolSignals(CTxMemPool &pool);

    void UpdatedBlockTip(const CBlockIndex *, const CBlockIndex *,
                         bool fInitialDownload);
    void TransactionAddedToMempool(const CTransactionRef &);
    void BlockConnected(const std::shared_ptr<const CBlock> &,
                        const CBlockIndex *pindex,
                        const std::vector<CTransactionRef> &);
    void BlockDisconnected(const std::shared_ptr<const CBlock> &);
    void SetBestChain(const CBlockLocator &);
    void Inventory(const uint256 &);
    void Broadcast(int64_t nBestBlockTime, CConnman *connman);
    void BlockChecked(const CBlock &, const CValidationState &);
    void NewPoWValidBlock(const CBlockIndex *,
                          const std::shared_ptr<const CBlock> &);
};

CMainSignals &GetMainSignals();

#endif // BITCOIN_VALIDATIONINTERFACE_H
