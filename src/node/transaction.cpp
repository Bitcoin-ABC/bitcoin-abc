// Copyright (c) 2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/transaction.h>

#include <config.h>
#include <consensus/validation.h>
#include <index/txindex.h>
#include <net.h>
#include <net_processing.h>
#include <node/blockstorage.h>
#include <node/context.h>
#include <primitives/blockhash.h>
#include <primitives/txid.h>
#include <txmempool.h>
#include <validation.h>
#include <validationinterface.h>

#include <future>

namespace node {
static TransactionError HandleATMPError(const TxValidationState &state,
                                        std::string &err_string_out) {
    err_string_out = state.ToString();
    if (state.IsInvalid()) {
        if (state.GetResult() == TxValidationResult::TX_MISSING_INPUTS) {
            return TransactionError::MISSING_INPUTS;
        }
        return TransactionError::MEMPOOL_REJECTED;
    } else {
        return TransactionError::MEMPOOL_ERROR;
    }
}

TransactionError BroadcastTransaction(const NodeContext &node,
                                      const CTransactionRef tx,
                                      std::string &err_string,
                                      const Amount max_tx_fee, bool relay,
                                      bool wait_callback) {
    // BroadcastTransaction can be called by either sendrawtransaction RPC or
    // the wallet. chainman, mempool and peerman are initialized before the RPC
    // server and wallet are started and reset after the RPC server and wallet
    // are stopped.
    assert(node.chainman);
    assert(node.mempool);
    assert(node.peerman);

    std::promise<void> promise;
    TxId txid = tx->GetId();
    bool callback_set = false;

    {
        LOCK(cs_main);

        // If the transaction is already confirmed in the chain, don't do
        // anything and return early.
        CCoinsViewCache &view = node.chainman->ActiveChainstate().CoinsTip();
        for (size_t o = 0; o < tx->vout.size(); o++) {
            const Coin &existingCoin = view.AccessCoin(COutPoint(txid, o));
            // IsSpent doesn't mean the coin is spent, it means the output
            // doesn't exist. So if the output does exist, then this transaction
            // exists in the chain.
            if (!existingCoin.IsSpent()) {
                return TransactionError::ALREADY_IN_CHAIN;
            }
        }

        if (!node.mempool->exists(txid)) {
            // Transaction is not already in the mempool.
            if (max_tx_fee > Amount::zero()) {
                // First, call ATMP with test_accept and check the fee. If ATMP
                // fails here, return error immediately.
                const MempoolAcceptResult result =
                    node.chainman->ProcessTransaction(tx, /*test_accept=*/true);
                if (result.m_result_type !=
                    MempoolAcceptResult::ResultType::VALID) {
                    return HandleATMPError(result.m_state, err_string);
                } else if (result.m_base_fees.value() > max_tx_fee) {
                    return TransactionError::MAX_FEE_EXCEEDED;
                }
            }
            // Try to submit the transaction to the mempool.
            const MempoolAcceptResult result =
                node.chainman->ProcessTransaction(tx, /*test_accept=*/false);
            if (result.m_result_type !=
                MempoolAcceptResult::ResultType::VALID) {
                return HandleATMPError(result.m_state, err_string);
            }

            // Transaction was accepted to the mempool.

            if (relay) {
                // the mempool tracks locally submitted transactions to make a
                // best-effort of initial broadcast
                node.mempool->AddUnbroadcastTx(txid);
            }

            if (wait_callback) {
                // For transactions broadcast from outside the wallet, make sure
                // that the wallet has been notified of the transaction before
                // continuing.
                //
                // This prevents a race where a user might call
                // sendrawtransaction with a transaction to/from their wallet,
                // immediately call some wallet RPC, and get a stale result
                // because callbacks have not yet been processed.
                CallFunctionInValidationInterfaceQueue(
                    [&promise] { promise.set_value(); });
                callback_set = true;
            }
        }
    } // cs_main

    if (callback_set) {
        // Wait until Validation Interface clients have been notified of the
        // transaction entering the mempool.
        promise.get_future().wait();
    }

    if (relay) {
        node.peerman->RelayTransaction(txid);
    }

    return TransactionError::OK;
}

CTransactionRef GetTransaction(const CBlockIndex *const block_index,
                               const CTxMemPool *const mempool,
                               const TxId &txid, BlockHash &hashBlock,
                               const BlockManager &blockman) {
    if (mempool && !block_index) {
        CTransactionRef ptx = mempool->get(txid);
        if (ptx) {
            return ptx;
        }
    }
    if (g_txindex) {
        CTransactionRef tx;
        BlockHash block_hash;
        if (g_txindex->FindTx(txid, block_hash, tx)) {
            if (!block_index || block_index->GetBlockHash() == block_hash) {
                // Don't return the transaction if the provided block hash
                // doesn't match.
                // The case where a transaction appears in multiple blocks
                // (e.g. reorgs or BIP30) is handled by the block lookup below.
                hashBlock = block_hash;
                return tx;
            }
        }
    }
    if (block_index) {
        CBlock block;
        if (blockman.ReadBlockFromDisk(block, *block_index)) {
            for (const auto &tx : block.vtx) {
                if (tx->GetId() == txid) {
                    hashBlock = block_index->GetBlockHash();
                    return tx;
                }
            }
        }
    }
    return nullptr;
}
} // namespace node
