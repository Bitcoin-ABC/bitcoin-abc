// Copyright (c) 2018-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONSENSUS_TX_VERIFY_H
#define BITCOIN_CONSENSUS_TX_VERIFY_H

#include <kernel/cs_main.h>
#include <threadsafety.h>

#include <cstdint>
#include <vector>

struct Amount;
class CBlockIndex;
class CCoinsViewCache;
class CTransaction;
class TxValidationState;

namespace Consensus {
struct Params;

/**
 * Check whether all inputs of this transaction are valid (no double spends and
 * amounts). This does not modify the UTXO set. This does not check scripts and
 * sigs.
 * @param[out] txfee Set to the transaction fee if successful.
 * Preconditions: tx.IsCoinBase() is false.
 */
bool CheckTxInputs(const CTransaction &tx, TxValidationState &state,
                   const CCoinsViewCache &inputs, int nSpendHeight,
                   Amount &txfee);

} // namespace Consensus

/**
 * Context dependent validity checks for non coinbase transactions. This
 * doesn't check the validity of the transaction against the UTXO set, but
 * simply characteristic that are suceptible to change over time such as feature
 * activation/deactivation and CLTV.
 */
bool ContextualCheckTransaction(const Consensus::Params &params,
                                const CTransaction &tx,
                                TxValidationState &state, int nHeight,
                                int64_t nMedianTimePast);

/**
 * This is a variant of ContextualCheckTransaction which computes the contextual
 * check for a transaction based on the chain tip.
 */
bool ContextualCheckTransactionForCurrentBlock(
    const CBlockIndex &active_chain_tip, const Consensus::Params &params,
    const CTransaction &tx, TxValidationState &state)
    EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

/**
 * Calculates the block height and previous block's median time past at which
 * the transaction will be considered final in the context of BIP 68.
 * Also removes from the vector of input heights any entries which did not
 * correspond to sequence locked inputs as they do not affect the calculation.
 */
std::pair<int, int64_t> CalculateSequenceLocks(const CTransaction &tx,
                                               int flags,
                                               std::vector<int> &prevHeights,
                                               const CBlockIndex &block);

bool EvaluateSequenceLocks(const CBlockIndex &block,
                           std::pair<int, int64_t> lockPair);

/**
 * Check if transaction is final per BIP 68 sequence numbers and can be included
 * in a block. Consensus critical. Takes as input a list of heights at which
 * tx's inputs (in order) confirmed.
 */
bool SequenceLocks(const CTransaction &tx, int flags,
                   std::vector<int> &prevHeights, const CBlockIndex &block);

#endif // BITCOIN_CONSENSUS_TX_VERIFY_H
