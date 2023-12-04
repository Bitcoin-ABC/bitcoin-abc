// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_POLICY_SETTINGS_H
#define BITCOIN_POLICY_SETTINGS_H

#include <policy/policy.h>

#include <cstdint>

class CFeeRate;
class CTransaction;

// Policy settings which are configurable at runtime.
extern CFeeRate dustRelayFee;
/**
 * A fee rate smaller than this is considered zero fee (for relaying, mining and
 * transaction creation)
 */
extern CFeeRate minRelayTxFee;
extern uint32_t nBytesPerSigCheck;
extern bool fIsBareMultisigStd;

static inline bool IsStandardTx(const CTransaction &tx, std::string &reason) {
    return IsStandardTx(tx, ::fIsBareMultisigStd, ::dustRelayFee, reason);
}

static inline int64_t GetVirtualTransactionSize(int64_t nSize,
                                                int64_t nSigChecks) {
    return GetVirtualTransactionSize(nSize, nSigChecks, ::nBytesPerSigCheck);
}

#endif // BITCOIN_POLICY_SETTINGS_H
