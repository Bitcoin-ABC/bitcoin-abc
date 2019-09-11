// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONSENSUS_TX_VERIFY_H
#define BITCOIN_CONSENSUS_TX_VERIFY_H

#include <cstdint>
#include <vector>

struct Amount;
class CBlockIndex;
class CCoinsViewCache;
class CTransaction;
class CValidationState;

/**
 * Context-independent validity checks for coinbase and non-coinbase
 * transactions.
 */
bool CheckRegularTransaction(const CTransaction &tx, CValidationState &state);
bool CheckCoinbase(const CTransaction &tx, CValidationState &state);

namespace Consensus {
struct Params;

/**
 * Check whether all inputs of this transaction are valid (no double spends and
 * amounts). This does not modify the UTXO set. This does not check scripts and
 * sigs.
 * @param[out] txfee Set to the transaction fee if successful.
 * Preconditions: tx.IsCoinBase() is false.
 */
bool CheckTxInputs(const CTransaction &tx, CValidationState &state,
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
                                const CTransaction &tx, CValidationState &state,
                                int nHeight, int64_t nLockTimeCutoff,
                                int64_t nMedianTimePast);

/**
 * Calculates the block height and previous block's median time past at which
 * the transaction will be considered final in the context of BIP 68.
 * Also removes from the vector of input heights any entries which did not
 * correspond to sequence locked inputs as they do not affect the calculation.
 */
std::pair<int, int64_t> CalculateSequenceLocks(const CTransaction &tx,
                                               int flags,
                                               std::vector<int> *prevHeights,
                                               const CBlockIndex &block);

bool EvaluateSequenceLocks(const CBlockIndex &block,
                           std::pair<int, int64_t> lockPair);

/**
 * Check if transaction is final per BIP 68 sequence numbers and can be included
 * in a block. Consensus critical. Takes as input a list of heights at which
 * tx's inputs (in order) confirmed.
 */
bool SequenceLocks(const CTransaction &tx, int flags,
                   std::vector<int> *prevHeights, const CBlockIndex &block);

/**
 * Count ECDSA signature operations the old-fashioned (pre-0.6) way
 * @return number of sigops this transaction's outputs will produce when spent
 * @see CTransaction::FetchInputs
 */
uint64_t GetSigOpCountWithoutP2SH(const CTransaction &tx, uint32_t flags);

/**
 * Count ECDSA signature operations in pay-to-script-hash inputs.
 *
 * @param[in] mapInputs Map of previous transactions that have outputs we're
 * spending
 * @return maximum number of sigops required to validate this transaction's
 * inputs
 * @see CTransaction::FetchInputs
 */
uint64_t GetP2SHSigOpCount(const CTransaction &tx,
                           const CCoinsViewCache &mapInputs, uint32_t flags);

/**
 * Compute total signature operation of a transaction.
 * @param[in] tx     Transaction for which we are computing the cost
 * @param[in] inputs Map of previous transactions that have outputs we're
 * spending
 * @param[in] flags  Script verification flags
 * @return Total signature operation cost of tx
 */
uint64_t GetTransactionSigOpCount(const CTransaction &tx,
                                  const CCoinsViewCache &inputs,
                                  uint32_t flags);

#endif // BITCOIN_CONSENSUS_TX_VERIFY_H
