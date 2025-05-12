// Copyright (c) 2023 The Bitcoin Core developers
// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <kernel/disconnected_transactions.h>

#include <chain.h>
#include <consensus/consensus.h>
#include <primitives/transaction.h>
#include <reverse_iterator.h>
#include <sync.h>
#include <validation.h>
#include <validationinterface.h>

/** Maximum bytes for transactions to store for processing during reorg */
static const size_t MAX_DISCONNECTED_TX_POOL_SIZE = 20 * DEFAULT_MAX_BLOCK_SIZE;

const DisconnectedBlockTransactions::TxInfo *
DisconnectedBlockTransactions::getTxInfo(const CTransactionRef &tx) const {
    if (auto it = txInfo.find(tx->GetId()); it != txInfo.end()) {
        return &it->second;
    }

    return nullptr;
}

void DisconnectedBlockTransactions::importMempool(CTxMemPool &pool) {
    AssertLockHeld(pool.cs);
    // addForBlock's algorithm sorts a vector of transactions back into
    // topological order. We use it in a separate object to create a valid
    // ordering of all mempool transactions, which we then splice in front of
    // the current queuedTx. This results in a valid sequence of transactions to
    // be reprocessed in updateMempoolForReorg.

    // We create vtx in order of the entry_id index to facilitate for
    // addForBlocks (which iterates in reverse order), as vtx probably end in
    // the correct ordering for queuedTx.
    std::vector<CTransactionRef> vtx;

    vtx.reserve(pool.mapTx.size());
    txInfo.reserve(pool.mapTx.size());
    for (const CTxMemPoolEntryRef &e : pool.mapTx.get<entry_id>()) {
        vtx.push_back(e->GetSharedTx());
        // save entry time, feeDelta, and height for use in
        // updateMempoolForReorg()
        txInfo.try_emplace(e->GetTx().GetId(), e->GetTime(),
                           e->GetModifiedFee() - e->GetFee(), e->GetHeight());
    }
    for (const CTxMemPoolEntryRef &e :
         reverse_iterate(pool.mapTx.get<entry_id>())) {
        // Notify all observers of this (possibly temporary) removal. This is
        // necessary for tracking the transactions that are removed from the
        // mempool during a reorg and can't be added back due to missing parent.
        // Transactions that are added back to the mempool will trigger another
        // notification. Make sure to notify in reverse topological order,
        // children first.
        GetMainSignals().TransactionRemovedFromMempool(
            e->GetSharedTx(), MemPoolRemovalReason::REORG,
            pool.GetAndIncrementSequence());
    }
    pool.clear();

    // Use addForBlocks to sort the transactions and then splice them in front
    // of queuedTx
    DisconnectedBlockTransactions orderedTxnPool;
    orderedTxnPool.addForBlock(vtx, pool);
    cachedInnerUsage += orderedTxnPool.cachedInnerUsage;
    queuedTx.get<insertion_order>().splice(
        queuedTx.get<insertion_order>().begin(),
        orderedTxnPool.queuedTx.get<insertion_order>());

    // We limit memory usage because we can't know if more blocks will be
    // disconnected
    while (DynamicMemoryUsage() > MAX_DISCONNECTED_TX_POOL_SIZE) {
        // Drop the earliest entry which, by definition, has no children
        removeEntry(queuedTx.get<insertion_order>().begin());
    }
}

void DisconnectedBlockTransactions::addForBlock(
    const std::vector<CTransactionRef> &vtx, CTxMemPool &pool) {
    AssertLockHeld(pool.cs);
    for (const auto &tx : reverse_iterate(vtx)) {
        // If we already added it, just skip.
        auto it = queuedTx.find(tx->GetId());
        if (it != queuedTx.end()) {
            continue;
        }

        // Insert the transaction into the pool.
        addTransaction(tx);

        // Fill in the set of parents.
        std::unordered_set<TxId, SaltedTxIdHasher> parents;
        for (const CTxIn &in : tx->vin) {
            parents.insert(in.prevout.GetTxId());
        }

        // In order to make sure we keep things in topological order, we check
        // if we already know of the parent of the current transaction. If so,
        // we remove them from the set and then add them back.
        while (parents.size() > 0) {
            std::unordered_set<TxId, SaltedTxIdHasher> worklist(
                std::move(parents));
            parents.clear();

            for (const TxId &txid : worklist) {
                // If we do not have that txid in the set, nothing needs to be
                // done.
                auto pit = queuedTx.find(txid);
                if (pit == queuedTx.end()) {
                    continue;
                }

                // We have parent in our set, we reinsert them at the right
                // position.
                // NOLINTNEXTLINE(performance-unnecessary-copy-initialization)
                const CTransactionRef ptx = *pit;
                queuedTx.erase(pit);
                queuedTx.insert(ptx);

                // And we make sure ancestors are covered.
                for (const CTxIn &in : ptx->vin) {
                    parents.insert(in.prevout.GetTxId());
                }
            }
        }
    }

    // Keep the size under control.
    while (DynamicMemoryUsage() > MAX_DISCONNECTED_TX_POOL_SIZE) {
        // Drop the earliest entry, and remove its children from the
        // mempool.
        auto it = queuedTx.get<insertion_order>().begin();
        pool.removeRecursive(**it, MemPoolRemovalReason::REORG);
        removeEntry(it);
    }
}

void DisconnectedBlockTransactions::removeForBlock(
    const std::vector<CTransactionRef> &vtx, CTxMemPool &pool) {
    AssertLockHeld(pool.cs);

    if (pool.mapTx.empty() && pool.mapDeltas.empty()) {
        // fast-path for IBD and/or when mempool is empty; there is no need to
        // do any of the set-up work below which eats precious cycles.
        // Note that this also skips updating the rolling fee udpate, which is
        // fine: it is only recomputed when the mempool has to be trimmed down
        // because it is full which is contradictory with this condition.
        return;
    }

    addForBlock(vtx, pool);

    for (const CTransactionRef &tx :
         reverse_iterate(queuedTx.get<insertion_order>())) {
        CTxMemPool::txiter it = pool.mapTx.find(tx->GetId());
        if (it != pool.mapTx.end()) {
            CTxMemPool::setEntries stage;
            stage.insert(it);
            pool.RemoveStaged(stage, MemPoolRemovalReason::BLOCK);
        } else {
            // Conflicting txs can only exist if the tx was not in the mempool
            pool.removeConflicts(*tx);
        }
        pool.ClearPrioritisation(tx->GetId());
    }

    pool.updateFeeForBlock();

    removeForBlock(vtx);
}

void DisconnectedBlockTransactions::updateMempoolForReorg(
    Chainstate &active_chainstate, bool fAddToMempool, CTxMemPool &pool) {
    AssertLockHeld(cs_main);
    AssertLockHeld(pool.cs);

    if (fAddToMempool) {
        // disconnectpool's insertion_order index sorts the entries from oldest
        // to newest, but the oldest entry will be the last tx from the latest
        // mined block that was disconnected.
        // Iterate disconnectpool in reverse, so that we add transactions back
        // to the mempool starting with the earliest transaction that had been
        // previously seen in a block.
        for (const CTransactionRef &tx :
             reverse_iterate(queuedTx.get<insertion_order>())) {
            if (tx->IsCoinBase()) {
                continue;
            }
            // restore saved PrioritiseTransaction state and nAcceptTime
            const auto ptxInfo = getTxInfo(tx);
            bool hasFeeDelta = false;
            if (ptxInfo && ptxInfo->feeDelta != Amount::zero()) {
                // manipulate mapDeltas directly (faster than calling
                // PrioritiseTransaction)
                pool.mapDeltas[tx->GetId()] = ptxInfo->feeDelta;
                hasFeeDelta = true;
            }
            // ignore validation errors in resurrected transactions
            auto result = AcceptToMemoryPool(
                active_chainstate, tx,
                /*accept_time=*/ptxInfo ? ptxInfo->time.count() : GetTime(),
                /*bypass_limits=*/true, /*test_accept=*/false,
                /*heightOverride=*/ptxInfo ? ptxInfo->height : 0);
            if (result.m_result_type !=
                MempoolAcceptResult::ResultType::VALID) {
                LogPrint(
                    BCLog::MEMPOOLREJ,
                    "AcceptToMemoryPool: tx %s rejected after reorg (%s)\n",
                    tx->GetId().ToString(), result.m_state.ToString());

                if (hasFeeDelta) {
                    // tx not accepted: undo mapDelta insertion from above
                    pool.mapDeltas.erase(tx->GetId());
                }
            } else {
                LogPrint(BCLog::MEMPOOL,
                         "AcceptToMemoryPool: tx %s accepted after reorg\n",
                         tx->GetId().ToString());
            }
        }
    }

    queuedTx.clear();
    txInfo.clear();

    // Re-limit mempool size, in case we added any transactions
    pool.LimitSize(active_chainstate.CoinsTip());
}
