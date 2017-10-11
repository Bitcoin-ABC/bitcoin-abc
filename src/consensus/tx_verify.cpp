// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/tx_verify.h>

#include <amount.h>
#include <chain.h>
#include <coins.h>
#include <consensus/activation.h>
#include <consensus/consensus.h>
#include <consensus/validation.h>
#include <primitives/transaction.h>
#include <script/script_flags.h>
#include <utilmoneystr.h> // For FormatMoney
#include <version.h>      // For PROTOCOL_VERSION

static bool IsFinalTx(const CTransaction &tx, int nBlockHeight,
                      int64_t nBlockTime) {
    if (tx.nLockTime == 0) {
        return true;
    }

    int64_t lockTime = tx.nLockTime;
    int64_t lockTimeLimit =
        (lockTime < LOCKTIME_THRESHOLD) ? nBlockHeight : nBlockTime;
    if (lockTime < lockTimeLimit) {
        return true;
    }

    for (const auto &txin : tx.vin) {
        if (txin.nSequence != CTxIn::SEQUENCE_FINAL) {
            return false;
        }
    }
    return true;
}

bool ContextualCheckTransaction(const Config &config, const CTransaction &tx,
                                CValidationState &state, int nHeight,
                                int64_t nLockTimeCutoff,
                                int64_t nMedianTimePast) {
    if (!IsFinalTx(tx, nHeight, nLockTimeCutoff)) {
        // While this is only one transaction, we use txns in the error to
        // ensure continuity with other clients.
        return state.DoS(10, false, REJECT_INVALID, "bad-txns-nonfinal", false,
                         "non-final transaction");
    }

    if (IsMagneticAnomalyEnabled(config, nHeight)) {
        // Size limit
        if (::GetSerializeSize(tx, SER_NETWORK, PROTOCOL_VERSION) <
            MIN_TX_SIZE) {
            return state.DoS(100, false, REJECT_INVALID, "bad-txns-undersize");
        }
    }

    return true;
}

/**
 * Calculates the block height and previous block's median time past at
 * which the transaction will be considered final in the context of BIP 68.
 * Also removes from the vector of input heights any entries which did not
 * correspond to sequence locked inputs as they do not affect the calculation.
 */
std::pair<int, int64_t> CalculateSequenceLocks(const CTransaction &tx,
                                               int flags,
                                               std::vector<int> *prevHeights,
                                               const CBlockIndex &block) {
    assert(prevHeights->size() == tx.vin.size());

    // Will be set to the equivalent height- and time-based nLockTime
    // values that would be necessary to satisfy all relative lock-
    // time constraints given our view of block chain history.
    // The semantics of nLockTime are the last invalid height/time, so
    // use -1 to have the effect of any height or time being valid.
    int nMinHeight = -1;
    int64_t nMinTime = -1;

    // tx.nVersion is signed integer so requires cast to unsigned otherwise
    // we would be doing a signed comparison and half the range of nVersion
    // wouldn't support BIP 68.
    bool fEnforceBIP68 = static_cast<uint32_t>(tx.nVersion) >= 2 &&
                         flags & LOCKTIME_VERIFY_SEQUENCE;

    // Do not enforce sequence numbers as a relative lock time
    // unless we have been instructed to
    if (!fEnforceBIP68) {
        return std::make_pair(nMinHeight, nMinTime);
    }

    for (size_t txinIndex = 0; txinIndex < tx.vin.size(); txinIndex++) {
        const CTxIn &txin = tx.vin[txinIndex];

        // Sequence numbers with the most significant bit set are not
        // treated as relative lock-times, nor are they given any
        // consensus-enforced meaning at this point.
        if (txin.nSequence & CTxIn::SEQUENCE_LOCKTIME_DISABLE_FLAG) {
            // The height of this input is not relevant for sequence locks
            (*prevHeights)[txinIndex] = 0;
            continue;
        }

        int nCoinHeight = (*prevHeights)[txinIndex];

        if (txin.nSequence & CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG) {
            int64_t nCoinTime = block.GetAncestor(std::max(nCoinHeight - 1, 0))
                                    ->GetMedianTimePast();
            // NOTE: Subtract 1 to maintain nLockTime semantics.
            // BIP 68 relative lock times have the semantics of calculating the
            // first block or time at which the transaction would be valid. When
            // calculating the effective block time or height for the entire
            // transaction, we switch to using the semantics of nLockTime which
            // is the last invalid block time or height. Thus we subtract 1 from
            // the calculated time or height.

            // Time-based relative lock-times are measured from the smallest
            // allowed timestamp of the block containing the txout being spent,
            // which is the median time past of the block prior.
            nMinTime = std::max(
                nMinTime,
                nCoinTime +
                    (int64_t)((txin.nSequence & CTxIn::SEQUENCE_LOCKTIME_MASK)
                              << CTxIn::SEQUENCE_LOCKTIME_GRANULARITY) -
                    1);
        } else {
            nMinHeight = std::max(
                nMinHeight,
                nCoinHeight +
                    (int)(txin.nSequence & CTxIn::SEQUENCE_LOCKTIME_MASK) - 1);
        }
    }

    return std::make_pair(nMinHeight, nMinTime);
}

bool EvaluateSequenceLocks(const CBlockIndex &block,
                           std::pair<int, int64_t> lockPair) {
    assert(block.pprev);
    int64_t nBlockTime = block.pprev->GetMedianTimePast();
    if (lockPair.first >= block.nHeight || lockPair.second >= nBlockTime) {
        return false;
    }

    return true;
}

bool SequenceLocks(const CTransaction &tx, int flags,
                   std::vector<int> *prevHeights, const CBlockIndex &block) {
    return EvaluateSequenceLocks(
        block, CalculateSequenceLocks(tx, flags, prevHeights, block));
}

uint64_t GetSigOpCountWithoutP2SH(const CTransaction &tx, uint32_t flags) {
    uint64_t nSigOps = 0;
    for (const auto &txin : tx.vin) {
        nSigOps += txin.scriptSig.GetSigOpCount(flags, false);
    }
    for (const auto &txout : tx.vout) {
        nSigOps += txout.scriptPubKey.GetSigOpCount(flags, false);
    }
    return nSigOps;
}

uint64_t GetP2SHSigOpCount(const CTransaction &tx, const CCoinsViewCache &view,
                           uint32_t flags) {
    if ((flags & SCRIPT_VERIFY_P2SH) == 0 || tx.IsCoinBase()) {
        return 0;
    }

    uint64_t nSigOps = 0;
    for (auto &i : tx.vin) {
        const CTxOut &prevout = view.GetOutputFor(i);
        if (prevout.scriptPubKey.IsPayToScriptHash()) {
            nSigOps += prevout.scriptPubKey.GetSigOpCount(flags, i.scriptSig);
        }
    }

    return nSigOps;
}

uint64_t GetTransactionSigOpCount(const CTransaction &tx,
                                  const CCoinsViewCache &view, uint32_t flags) {
    return GetSigOpCountWithoutP2SH(tx, flags) +
           GetP2SHSigOpCount(tx, view, flags);
}

static bool CheckTransactionCommon(const CTransaction &tx,
                                   CValidationState &state) {
    // Basic checks that don't depend on any context
    if (tx.vin.empty()) {
        return state.DoS(10, false, REJECT_INVALID, "bad-txns-vin-empty");
    }

    if (tx.vout.empty()) {
        return state.DoS(10, false, REJECT_INVALID, "bad-txns-vout-empty");
    }

    // Size limit
    if (::GetSerializeSize(tx, SER_NETWORK, PROTOCOL_VERSION) > MAX_TX_SIZE) {
        return state.DoS(100, false, REJECT_INVALID, "bad-txns-oversize");
    }

    // Check for negative or overflow output values
    Amount nValueOut = Amount::zero();
    for (const auto &txout : tx.vout) {
        if (txout.nValue < Amount::zero()) {
            return state.DoS(100, false, REJECT_INVALID,
                             "bad-txns-vout-negative");
        }

        if (txout.nValue > MAX_MONEY) {
            return state.DoS(100, false, REJECT_INVALID,
                             "bad-txns-vout-toolarge");
        }

        nValueOut += txout.nValue;
        if (!MoneyRange(nValueOut)) {
            return state.DoS(100, false, REJECT_INVALID,
                             "bad-txns-txouttotal-toolarge");
        }
    }

    if (GetSigOpCountWithoutP2SH(tx, SCRIPT_VERIFY_CHECKDATASIG_SIGOPS) >
        MAX_TX_SIGOPS_COUNT) {
        return state.DoS(100, false, REJECT_INVALID, "bad-txn-sigops");
    }

    return true;
}

bool CheckCoinbase(const CTransaction &tx, CValidationState &state) {
    if (!tx.IsCoinBase()) {
        return state.DoS(100, false, REJECT_INVALID, "bad-cb-missing", false,
                         "first tx is not coinbase");
    }

    if (!CheckTransactionCommon(tx, state)) {
        // CheckTransactionCommon fill in the state.
        return false;
    }

    if (tx.vin[0].scriptSig.size() < 2 ||
        tx.vin[0].scriptSig.size() > MAX_COINBASE_SCRIPTSIG_SIZE) {
        return state.DoS(100, false, REJECT_INVALID, "bad-cb-length");
    }

    return true;
}

bool CheckRegularTransaction(const CTransaction &tx, CValidationState &state) {
    if (tx.IsCoinBase()) {
        return state.DoS(100, false, REJECT_INVALID, "bad-tx-coinbase");
    }

    if (!CheckTransactionCommon(tx, state)) {
        // CheckTransactionCommon fill in the state.
        return false;
    }

    std::unordered_set<COutPoint, SaltedOutpointHasher> vInOutPoints;
    for (const auto &txin : tx.vin) {
        if (txin.prevout.IsNull()) {
            return state.DoS(10, false, REJECT_INVALID,
                             "bad-txns-prevout-null");
        }

        if (!vInOutPoints.insert(txin.prevout).second) {
            return state.DoS(100, false, REJECT_INVALID,
                             "bad-txns-inputs-duplicate");
        }
    }

    return true;
}

namespace Consensus {
bool CheckTxInputs(const CTransaction &tx, CValidationState &state,
                   const CCoinsViewCache &inputs, int nSpendHeight,
                   Amount &txfee) {
    // are the actual inputs available?
    if (!inputs.HaveInputs(tx)) {
        return state.DoS(100, false, REJECT_INVALID,
                         "bad-txns-inputs-missingorspent", false,
                         strprintf("%s: inputs missing/spent", __func__));
    }

    Amount nValueIn = Amount::zero();
    for (const auto &in : tx.vin) {
        const COutPoint &prevout = in.prevout;
        const Coin &coin = inputs.AccessCoin(prevout);
        assert(!coin.IsSpent());

        // If prev is coinbase, check that it's matured
        if (coin.IsCoinBase()) {
            if (nSpendHeight - coin.GetHeight() < COINBASE_MATURITY) {
                return state.Invalid(
                    false, REJECT_INVALID,
                    "bad-txns-premature-spend-of-coinbase",
                    strprintf("tried to spend coinbase at depth %d",
                              nSpendHeight - coin.GetHeight()));
            }
        }

        // Check for negative or overflow input values
        nValueIn += coin.GetTxOut().nValue;
        if (!MoneyRange(coin.GetTxOut().nValue) || !MoneyRange(nValueIn)) {
            return state.DoS(100, false, REJECT_INVALID,
                             "bad-txns-inputvalues-outofrange");
        }
    }

    const Amount value_out = tx.GetValueOut();
    if (nValueIn < value_out) {
        return state.DoS(
            100, false, REJECT_INVALID, "bad-txns-in-belowout", false,
            strprintf("value in (%s) < value out (%s)", FormatMoney(nValueIn),
                      FormatMoney(value_out)));
    }

    // Tally transaction fees
    const Amount txfee_aux = nValueIn - value_out;
    if (!MoneyRange(txfee_aux)) {
        return state.DoS(100, false, REJECT_INVALID, "bad-txns-fee-outofrange");
    }

    txfee = txfee_aux;
    return true;
}
} // namespace Consensus
