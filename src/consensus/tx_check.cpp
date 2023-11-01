// Copyright (c) 2017-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <coins.h>
#include <consensus/amount.h>
#include <consensus/consensus.h>
#include <consensus/validation.h>
#include <primitives/transaction.h>
#include <version.h>

#include <unordered_set>

static bool CheckTransactionCommon(const CTransaction &tx,
                                   TxValidationState &state) {
    // Basic checks that don't depend on any context
    if (tx.vin.empty()) {
        return state.Invalid(TxValidationResult::TX_CONSENSUS,
                             "bad-txns-vin-empty");
    }

    if (tx.vout.empty()) {
        return state.Invalid(TxValidationResult::TX_CONSENSUS,
                             "bad-txns-vout-empty");
    }

    // Size limit
    if (::GetSerializeSize(tx) > MAX_TX_SIZE) {
        return state.Invalid(TxValidationResult::TX_CONSENSUS,
                             "bad-txns-oversize");
    }

    // Check for negative or overflow output values (see CVE-2010-5139)
    Amount nValueOut = Amount::zero();
    for (const auto &txout : tx.vout) {
        if (txout.nValue < Amount::zero()) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS,
                                 "bad-txns-vout-negative");
        }

        if (txout.nValue > MAX_MONEY) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS,
                                 "bad-txns-vout-toolarge");
        }

        nValueOut += txout.nValue;
        if (!MoneyRange(nValueOut)) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS,
                                 "bad-txns-txouttotal-toolarge");
        }
    }

    return true;
}

bool CheckCoinbase(const CTransaction &tx, TxValidationState &state) {
    if (!tx.IsCoinBase()) {
        return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-cb-missing",
                             "first tx is not coinbase");
    }

    if (!CheckTransactionCommon(tx, state)) {
        // CheckTransactionCommon fill in the state.
        return false;
    }

    if (tx.vin[0].scriptSig.size() < 2 ||
        tx.vin[0].scriptSig.size() > MAX_COINBASE_SCRIPTSIG_SIZE) {
        return state.Invalid(TxValidationResult::TX_CONSENSUS, "bad-cb-length");
    }

    return true;
}

bool CheckRegularTransaction(const CTransaction &tx, TxValidationState &state) {
    if (tx.IsCoinBase()) {
        return state.Invalid(TxValidationResult::TX_CONSENSUS,
                             "bad-tx-coinbase");
    }

    if (!CheckTransactionCommon(tx, state)) {
        // CheckTransactionCommon fill in the state.
        return false;
    }

    std::unordered_set<COutPoint, SaltedOutpointHasher> vInOutPoints;
    for (const auto &txin : tx.vin) {
        if (txin.prevout.IsNull()) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS,
                                 "bad-txns-prevout-null");
        }

        // Check for duplicate inputs (see CVE-2018-17144)
        // While Consensus::CheckTxInputs does check if all inputs of a tx are
        // available, and UpdateCoins marks all inputs of a tx as spent, it does
        // not check if the tx has duplicate inputs. Failure to run this check
        // will result in either a crash or an inflation bug, depending on the
        // implementation of the underlying coins database.
        if (!vInOutPoints.insert(txin.prevout).second) {
            return state.Invalid(TxValidationResult::TX_CONSENSUS,
                                 "bad-txns-inputs-duplicate");
        }
    }

    return true;
}
