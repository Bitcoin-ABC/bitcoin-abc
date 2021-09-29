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
extern uint32_t nBytesPerSigOp;
extern bool fIsBareMultisigStd;

static inline bool IsStandardTx(const CTransaction &tx, std::string &reason) {
    return IsStandardTx(tx, ::fIsBareMultisigStd, ::dustRelayFee, reason);
}

static inline int64_t GetVirtualTransactionSize(int64_t nSize,
                                                int64_t nSigOpCount) {
    return GetVirtualTransactionSize(nSize, nSigOpCount, ::nBytesPerSigOp);
}

static inline int64_t GetVirtualTransactionSize(const CTransaction &tx,
                                                int64_t sigop_cost) {
    return GetVirtualTransactionSize(tx, sigop_cost, ::nBytesPerSigOp);
}

#endif // BITCOIN_POLICY_SETTINGS_H
