// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONSENSUS_VALIDATION_H
#define BITCOIN_CONSENSUS_VALIDATION_H

#include <cassert>
#include <string>

/**
 * A "reason" why a transaction was invalid, suitable for determining whether
 * the provider of the transaction should be banned/ignored/disconnected/etc.
 */
enum class TxValidationResult {
    //! initial value. Tx has not yet been rejected
    TX_RESULT_UNSET = 0,
    //! invalid by consensus rules
    TX_CONSENSUS,
    //! inputs failed policy rules
    TX_INPUTS_NOT_STANDARD,
    //! otherwise didn't meet our local policy rules
    TX_NOT_STANDARD,
    //! transaction was missing some of its inputs
    TX_MISSING_INPUTS,
    //! transaction spends a coinbase too early, or violates locktime/sequence
    //! locks
    TX_PREMATURE_SPEND,
    /** Tx already in mempool or in the chain. */
    TX_DUPLICATE,
    /**
     * Tx conflicts with a finalized tx, i.e. spends the same coin.
     */
    TX_CONFLICT,
    /**
     * This tx outputs are already spent in the mempool. This should never
     * happen and is a symptom of a mempool bug/corruption.
     */
    TX_CHILD_BEFORE_PARENT,
    //! violated mempool's fee/size/descendant/etc limits
    TX_MEMPOOL_POLICY,
    //! this node does not have a mempool so can't validate the transaction
    TX_NO_MEMPOOL,
    //! fails some policy, but might be acceptable if submitted in a (different)
    //! package
    TX_PACKAGE_RECONSIDERABLE,
    //! fails some policy, but might be reconsidered by avalanche voting
    TX_AVALANCHE_RECONSIDERABLE,
    //! transaction was not validated because package failed
    TX_UNKNOWN,
};

/**
 * A "reason" why a block was invalid, suitable for determining whether the
 * provider of the block should be banned/ignored/disconnected/etc.
 * These are much more granular than the rejection codes, which may be more
 * useful for some other use-cases.
 */
enum class BlockValidationResult {
    //! initial value. Block has not yet been rejected
    BLOCK_RESULT_UNSET = 0,
    //! invalid by consensus rules (excluding any below reasons)
    BLOCK_CONSENSUS,
    //! this block was cached as being invalid and we didn't store the reason
    //! why
    BLOCK_CACHED_INVALID,
    //! invalid proof of work or time too old
    BLOCK_INVALID_HEADER,
    //! the block's data didn't match the data committed to by the PoW
    BLOCK_MUTATED,
    //! We don't have the previous block the checked one is built on
    BLOCK_MISSING_PREV,
    //! A block this one builds on is invalid
    BLOCK_INVALID_PREV,
    //! block timestamp was > 2 hours in the future (or our clock is bad)
    BLOCK_TIME_FUTURE,
    //! the block failed to meet one of our checkpoints
    BLOCK_CHECKPOINT,
    //! the block header may be on a too-little-work chain
    BLOCK_HEADER_LOW_WORK
};

/**
 * Template for capturing information about block/transaction validation.
 * This is instantiated by TxValidationState and BlockValidationState for
 * validation information on transactions and blocks respectively.
 */
template <typename Result> class ValidationState {
private:
    enum class ModeState {
        M_VALID,   //!< everything ok
        M_INVALID, //!< network rule violation (DoS value may be set)
        M_ERROR,   //!< run-time error
    } m_mode{ModeState::M_VALID};
    Result m_result{};
    std::string m_reject_reason;
    std::string m_debug_message;

public:
    bool Invalid(Result result, const std::string &reject_reason = "",
                 const std::string &debug_message = "") {
        m_result = result;
        m_reject_reason = reject_reason;
        m_debug_message = debug_message;
        if (m_mode != ModeState::M_ERROR) {
            m_mode = ModeState::M_INVALID;
        }
        return false;
    }

    bool Error(const std::string &reject_reason) {
        if (m_mode == ModeState::M_VALID) {
            m_reject_reason = reject_reason;
        }
        m_mode = ModeState::M_ERROR;
        return false;
    }
    bool IsValid() const { return m_mode == ModeState::M_VALID; }
    bool IsInvalid() const { return m_mode == ModeState::M_INVALID; }
    bool IsError() const { return m_mode == ModeState::M_ERROR; }
    Result GetResult() const { return m_result; }
    std::string GetRejectReason() const { return m_reject_reason; }
    std::string GetDebugMessage() const { return m_debug_message; }
    std::string ToString() const {
        if (IsValid()) {
            return "Valid";
        }

        if (!m_debug_message.empty()) {
            return m_reject_reason + ", " + m_debug_message;
        }

        return m_reject_reason;
    }
};

class TxValidationState : public ValidationState<TxValidationResult> {};
class BlockValidationState : public ValidationState<BlockValidationResult> {};

#endif // BITCOIN_CONSENSUS_VALIDATION_H
