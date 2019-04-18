// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/fees.h>

#include <config.h>
#include <policy/policy.h>
#include <txmempool.h>
#include <util.h>
#include <validation.h>
#include <wallet/coincontrol.h>
#include <wallet/wallet.h>

Amount GetMinimumFee(unsigned int nTxBytes, const CTxMemPool &pool,
                     Amount targetFee) {
    Amount nFeeNeeded = targetFee;
    if (nFeeNeeded == Amount::zero()) {
        nFeeNeeded = pool.estimateFee().GetFeeCeiling(nTxBytes);
        // ... unless we don't have enough mempool data for estimatefee, then
        // use fallbackFee.
        if (nFeeNeeded == Amount::zero()) {
            nFeeNeeded = CWallet::fallbackFee.GetFeeCeiling(nTxBytes);
        }
    }

    // Prevent user from paying a fee below minRelayTxFee or minTxFee.
    nFeeNeeded =
        std::max(nFeeNeeded, GetConfig().GetMinFeePerKB().GetFee(nTxBytes));

    // But always obey the maximum.
    if (nFeeNeeded > maxTxFee) {
        nFeeNeeded = maxTxFee;
    }

    return nFeeNeeded;
}

Amount GetMinimumFee(unsigned int nTxBytes, const CTxMemPool &pool) {
    // payTxFee is the user-set global for desired feerate.
    return GetMinimumFee(nTxBytes, pool, payTxFee.GetFeeCeiling(nTxBytes));
}

Amount GetMinimumFee(unsigned int nTxBytes, const CTxMemPool &pool,
                     const CCoinControl &coinControl) {
    if (coinControl.fOverrideFeeRate && coinControl.m_feerate) {
        return GetMinimumFee(nTxBytes, pool,
                             coinControl.m_feerate->GetFee(nTxBytes));
    } else {
        return GetMinimumFee(nTxBytes, pool);
    }
}
