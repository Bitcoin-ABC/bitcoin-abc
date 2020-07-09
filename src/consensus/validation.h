// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONSENSUS_VALIDATION_H
#define BITCOIN_CONSENSUS_VALIDATION_H

#include <cassert>
#include <string>

/** "reject" message codes */
static const uint8_t REJECT_MALFORMED = 0x01;
static const uint8_t REJECT_INVALID = 0x10;
static const uint8_t REJECT_OBSOLETE = 0x11;
static const uint8_t REJECT_DUPLICATE = 0x12;
static const uint8_t REJECT_NONSTANDARD = 0x40;
static const uint8_t REJECT_INSUFFICIENTFEE = 0x42;
static const uint8_t REJECT_CHECKPOINT = 0x43;

/**
 * A "reason" why something was invalid, suitable for determining whether the
 * provider of the object should be banned/ignored/disconnected/etc. These are
 * much more granular than the rejection codes, which may be more useful for
 * some other use-cases.
 */
enum class ValidationInvalidReason {
    // txn and blocks:
    //! not actually invalid
    NONE,
    //! invalid by consensus rules (excluding any below reasons)
    CONSENSUS,
    /**
     * Invalid by a recent change to consensus rules.
     * Currently unused as there are no such consensus rule changes.
     */
    RECENT_CONSENSUS_CHANGE,
    // Only blocks (or headers):
    //! this object was cached as being invalid, but we don't know why
    CACHED_INVALID,
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
    //! block finalization problems.
    BLOCK_FINALIZATION,
    // Only loose txn:
    //! didn't meet our local policy rules
    TX_NOT_STANDARD,
    //! a transaction was missing some of its inputs
    TX_MISSING_INPUTS,
    //! transaction spends a coinbase too early, or violates locktime/sequence
    //! locks
    TX_PREMATURE_SPEND,
    /**
     * Tx already in mempool or conflicts with a tx in the chain
     * TODO: Currently this is only used if the transaction already exists in
     * the mempool or on chain,
     * TODO: ATMP's fMissingInputs and a valid CValidationState being used to
     * indicate missing inputs
     */
    TX_CONFLICT,
    //! violated mempool's fee/size/descendant/etc limits
    TX_MEMPOOL_POLICY,
};

inline bool IsTransactionReason(ValidationInvalidReason r) {
    return r == ValidationInvalidReason::NONE ||
           r == ValidationInvalidReason::CONSENSUS ||
           r == ValidationInvalidReason::RECENT_CONSENSUS_CHANGE ||
           r == ValidationInvalidReason::TX_NOT_STANDARD ||
           r == ValidationInvalidReason::TX_PREMATURE_SPEND ||
           r == ValidationInvalidReason::TX_MISSING_INPUTS ||
           r == ValidationInvalidReason::TX_CONFLICT ||
           r == ValidationInvalidReason::TX_MEMPOOL_POLICY;
}

inline bool IsBlockReason(ValidationInvalidReason r) {
    return r == ValidationInvalidReason::NONE ||
           r == ValidationInvalidReason::CONSENSUS ||
           r == ValidationInvalidReason::RECENT_CONSENSUS_CHANGE ||
           r == ValidationInvalidReason::CACHED_INVALID ||
           r == ValidationInvalidReason::BLOCK_INVALID_HEADER ||
           r == ValidationInvalidReason::BLOCK_MUTATED ||
           r == ValidationInvalidReason::BLOCK_MISSING_PREV ||
           r == ValidationInvalidReason::BLOCK_INVALID_PREV ||
           r == ValidationInvalidReason::BLOCK_TIME_FUTURE ||
           r == ValidationInvalidReason::BLOCK_CHECKPOINT ||
           r == ValidationInvalidReason::BLOCK_FINALIZATION;
}

/** Capture information about block/transaction validation */
class CValidationState {
private:
    enum mode_state {
        MODE_VALID,   //!< everything ok
        MODE_INVALID, //!< network rule violation (DoS value may be set)
        MODE_ERROR,   //!< run-time error
    } mode;
    ValidationInvalidReason m_reason;
    std::string strRejectReason;
    unsigned int chRejectCode;
    std::string strDebugMessage;

public:
    CValidationState()
        : mode(MODE_VALID), m_reason(ValidationInvalidReason::NONE),
          chRejectCode(0) {}
    bool Invalid(ValidationInvalidReason reasonIn,
                 unsigned int chRejectCodeIn = 0,
                 const std::string &strRejectReasonIn = "",
                 const std::string &strDebugMessageIn = "") {
        m_reason = reasonIn;
        chRejectCode = chRejectCodeIn;
        strRejectReason = strRejectReasonIn;
        strDebugMessage = strDebugMessageIn;
        if (mode == MODE_ERROR) {
            return false;
        }
        mode = MODE_INVALID;
        return false;
    }
    bool Error(const std::string &strRejectReasonIn) {
        if (mode == MODE_VALID) {
            strRejectReason = strRejectReasonIn;
        }

        mode = MODE_ERROR;
        return false;
    }
    bool IsValid() const { return mode == MODE_VALID; }
    bool IsInvalid() const { return mode == MODE_INVALID; }
    bool IsError() const { return mode == MODE_ERROR; }
    ValidationInvalidReason GetReason() const { return m_reason; }
    unsigned int GetRejectCode() const { return chRejectCode; }
    std::string GetRejectReason() const { return strRejectReason; }
    std::string GetDebugMessage() const { return strDebugMessage; }
};

#endif // BITCOIN_CONSENSUS_VALIDATION_H
