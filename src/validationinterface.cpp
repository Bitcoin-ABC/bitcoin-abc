// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <validationinterface.h>

#include <attributes.h>
#include <chain.h>
#include <consensus/validation.h>
#include <logging.h>
#include <primitives/block.h>
#include <primitives/transaction.h>
#include <scheduler.h>

#include <future>
#include <tuple>
#include <unordered_map>
#include <utility>

/**
 * MainSignalsImpl manages a list of shared_ptr<CValidationInterface>
 * callbacks.
 *
 * A std::unordered_map is used to track what callbacks are currently
 * registered, and a std::list is used to store the callbacks that are
 * currently registered as well as any callbacks that are just unregistered
 * and about to be deleted when they are done executing.
 */
class MainSignalsImpl {
private:
    Mutex m_mutex;
    //! List entries consist of a callback pointer and reference count. The
    //! count is equal to the number of current executions of that entry, plus 1
    //! if it's registered. It cannot be 0 because that would imply it is
    //! unregistered and also not being executed (so shouldn't exist).
    struct ListEntry {
        std::shared_ptr<CValidationInterface> callbacks;
        int count = 1;
    };
    std::list<ListEntry> m_list GUARDED_BY(m_mutex);
    std::unordered_map<CValidationInterface *, std::list<ListEntry>::iterator>
        m_map GUARDED_BY(m_mutex);

public:
    // We are not allowed to assume the scheduler only runs in one thread,
    // but must ensure all callbacks happen in-order, so we end up creating
    // our own queue here :(
    SingleThreadedSchedulerClient m_schedulerClient;

    explicit MainSignalsImpl(CScheduler &scheduler LIFETIMEBOUND)
        : m_schedulerClient(scheduler) {}

    void Register(std::shared_ptr<CValidationInterface> callbacks)
        EXCLUSIVE_LOCKS_REQUIRED(!m_mutex) {
        LOCK(m_mutex);
        auto inserted = m_map.emplace(callbacks.get(), m_list.end());
        if (inserted.second) {
            inserted.first->second = m_list.emplace(m_list.end());
        }
        inserted.first->second->callbacks = std::move(callbacks);
    }

    void Unregister(CValidationInterface *callbacks)
        EXCLUSIVE_LOCKS_REQUIRED(!m_mutex) {
        LOCK(m_mutex);
        auto it = m_map.find(callbacks);
        if (it != m_map.end()) {
            if (!--it->second->count) {
                m_list.erase(it->second);
            }
            m_map.erase(it);
        }
    }

    //! Clear unregisters every previously registered callback, erasing every
    //! map entry. After this call, the list may still contain callbacks that
    //! are currently executing, but it will be cleared when they are done
    //! executing.
    void Clear() EXCLUSIVE_LOCKS_REQUIRED(!m_mutex) {
        LOCK(m_mutex);
        for (const auto &entry : m_map) {
            if (!--entry.second->count) {
                m_list.erase(entry.second);
            }
        }
        m_map.clear();
    }

    template <typename F>
    void Iterate(F &&f) EXCLUSIVE_LOCKS_REQUIRED(!m_mutex) {
        WAIT_LOCK(m_mutex, lock);
        for (auto it = m_list.begin(); it != m_list.end();) {
            ++it->count;
            {
                REVERSE_LOCK(lock);
                f(*it->callbacks);
            }
            it = --it->count ? std::next(it) : m_list.erase(it);
        }
    }
};

static CMainSignals g_signals;

void CMainSignals::RegisterBackgroundSignalScheduler(CScheduler &scheduler) {
    assert(!m_internals);
    m_internals = std::make_unique<MainSignalsImpl>(scheduler);
}

void CMainSignals::UnregisterBackgroundSignalScheduler() {
    m_internals.reset(nullptr);
}

void CMainSignals::FlushBackgroundCallbacks() {
    if (m_internals) {
        m_internals->m_schedulerClient.EmptyQueue();
    }
}

size_t CMainSignals::CallbacksPending() {
    if (!m_internals) {
        return 0;
    }
    return m_internals->m_schedulerClient.CallbacksPending();
}

CMainSignals &GetMainSignals() {
    return g_signals;
}

void RegisterSharedValidationInterface(
    std::shared_ptr<CValidationInterface> callbacks) {
    // Each connection captures the shared_ptr to ensure that each callback is
    // executed before the subscriber is destroyed. For more details see #18338.
    g_signals.m_internals->Register(std::move(callbacks));
}

void RegisterValidationInterface(CValidationInterface *callbacks) {
    // Create a shared_ptr with a no-op deleter - CValidationInterface lifecycle
    // is managed by the caller.
    RegisterSharedValidationInterface(
        {callbacks, [](CValidationInterface *) {}});
}

void UnregisterSharedValidationInterface(
    std::shared_ptr<CValidationInterface> callbacks) {
    UnregisterValidationInterface(callbacks.get());
}

void UnregisterValidationInterface(CValidationInterface *callbacks) {
    if (g_signals.m_internals) {
        g_signals.m_internals->Unregister(callbacks);
    }
}

void UnregisterAllValidationInterfaces() {
    if (!g_signals.m_internals) {
        return;
    }
    g_signals.m_internals->Clear();
}

void CallFunctionInValidationInterfaceQueue(std::function<void()> func) {
    g_signals.m_internals->m_schedulerClient.AddToProcessQueue(std::move(func));
}

void SyncWithValidationInterfaceQueue() {
    AssertLockNotHeld(cs_main);
    // Block until the validation queue drains
    std::promise<void> promise;
    CallFunctionInValidationInterfaceQueue([&promise] { promise.set_value(); });
    promise.get_future().wait();
}

// Use a macro instead of a function for conditional logging to prevent
// evaluating arguments when logging is not enabled.
//
// NOTE: The lambda captures all local variables by value.
#define ENQUEUE_AND_LOG_EVENT(event, fmt, name, ...)                           \
    do {                                                                       \
        auto local_name = (name);                                              \
        LOG_EVENT("Enqueuing " fmt, local_name, __VA_ARGS__);                  \
        m_internals->m_schedulerClient.AddToProcessQueue([=] {                 \
            LOG_EVENT(fmt, local_name, __VA_ARGS__);                           \
            event();                                                           \
        });                                                                    \
    } while (0)

#define LOG_EVENT(fmt, ...) LogPrint(BCLog::VALIDATION, fmt "\n", __VA_ARGS__)

void CMainSignals::UpdatedBlockTip(const CBlockIndex *pindexNew,
                                   const CBlockIndex *pindexFork,
                                   bool fInitialDownload) {
    // Dependencies exist that require UpdatedBlockTip events to be delivered in
    // the order in which the chain actually updates. One way to ensure this is
    // for the caller to invoke this signal in the same critical section where
    // the chain is updated

    auto event = [pindexNew, pindexFork, fInitialDownload, this] {
        m_internals->Iterate([&](CValidationInterface &callbacks) {
            callbacks.UpdatedBlockTip(pindexNew, pindexFork, fInitialDownload);
        });
    };
    ENQUEUE_AND_LOG_EVENT(
        event, "%s: new block hash=%s fork block hash=%s (in IBD=%s)", __func__,
        pindexNew->GetBlockHash().ToString(),
        pindexFork ? pindexFork->GetBlockHash().ToString() : "null",
        fInitialDownload);
}

void CMainSignals::TransactionAddedToMempool(
    const CTransactionRef &tx,
    std::shared_ptr<const std::vector<Coin>> spent_coins,
    uint64_t mempool_sequence) {
    auto event = [tx, spent_coins, mempool_sequence, this] {
        m_internals->Iterate([&](CValidationInterface &callbacks) {
            callbacks.TransactionAddedToMempool(tx, spent_coins,
                                                mempool_sequence);
        });
    };
    ENQUEUE_AND_LOG_EVENT(event, "%s: txid=%s", __func__,
                          tx->GetHash().ToString());
}

void CMainSignals::TransactionRemovedFromMempool(const CTransactionRef &tx,
                                                 MemPoolRemovalReason reason,
                                                 uint64_t mempool_sequence) {
    auto event = [tx, reason, mempool_sequence, this] {
        m_internals->Iterate([&](CValidationInterface &callbacks) {
            callbacks.TransactionRemovedFromMempool(tx, reason,
                                                    mempool_sequence);
        });
    };
    ENQUEUE_AND_LOG_EVENT(event, "%s: txid=%s", __func__,
                          tx->GetHash().ToString());
}

void CMainSignals::BlockConnected(const std::shared_ptr<const CBlock> &pblock,
                                  const CBlockIndex *pindex) {
    auto event = [pblock, pindex, this] {
        m_internals->Iterate([&](CValidationInterface &callbacks) {
            callbacks.BlockConnected(pblock, pindex);
        });
    };
    ENQUEUE_AND_LOG_EVENT(event, "%s: block hash=%s block height=%d", __func__,
                          pblock->GetHash().ToString(), pindex->nHeight);
}

void CMainSignals::BlockDisconnected(
    const std::shared_ptr<const CBlock> &pblock, const CBlockIndex *pindex) {
    auto event = [pblock, pindex, this] {
        m_internals->Iterate([&](CValidationInterface &callbacks) {
            callbacks.BlockDisconnected(pblock, pindex);
        });
    };
    ENQUEUE_AND_LOG_EVENT(event, "%s: block hash=%s", __func__,
                          pblock->GetHash().ToString());
}

void CMainSignals::ChainStateFlushed(const CBlockLocator &locator) {
    auto event = [locator, this] {
        m_internals->Iterate([&](CValidationInterface &callbacks) {
            callbacks.ChainStateFlushed(locator);
        });
    };
    ENQUEUE_AND_LOG_EVENT(event, "%s: block hash=%s", __func__,
                          locator.IsNull() ? "null"
                                           : locator.vHave.front().ToString());
}

void CMainSignals::BlockChecked(const CBlock &block,
                                const BlockValidationState &state) {
    LOG_EVENT("%s: block hash=%s state=%s", __func__,
              block.GetHash().ToString(), state.ToString());
    m_internals->Iterate([&](CValidationInterface &callbacks) {
        callbacks.BlockChecked(block, state);
    });
}

void CMainSignals::NewPoWValidBlock(
    const CBlockIndex *pindex, const std::shared_ptr<const CBlock> &block) {
    LOG_EVENT("%s: block hash=%s", __func__, block->GetHash().ToString());
    m_internals->Iterate([&](CValidationInterface &callbacks) {
        callbacks.NewPoWValidBlock(pindex, block);
    });
}

void CMainSignals::BlockFinalized(const CBlockIndex *pindex) {
    LOG_EVENT("%s: block hash=%s", __func__,
              pindex ? pindex->GetBlockHash().ToString() : "null");
    m_internals->Iterate([&](CValidationInterface &callbacks) {
        callbacks.BlockFinalized(pindex);
    });
}
