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

Amount GetRequiredFee(const CWallet &wallet, unsigned int nTxBytes) {
    return GetRequiredFeeRate(wallet).GetFeeCeiling(nTxBytes);
}

Amount GetMinimumFee(const CWallet &wallet, unsigned int nTxBytes,
                     const CCoinControl &coin_control, const CTxMemPool &pool) {
    Amount nFeeNeeded =
        GetMinimumFeeRate(wallet, coin_control, pool).GetFeeCeiling(nTxBytes);

    // But always obey the maximum.
    if (nFeeNeeded > maxTxFee) {
        nFeeNeeded = maxTxFee;
    }

    return nFeeNeeded;
}

CFeeRate GetRequiredFeeRate(const CWallet &wallet) {
    return std::max(wallet.m_min_fee, ::minRelayTxFee);
}

CFeeRate GetMinimumFeeRate(const CWallet &wallet,
                           const CCoinControl &coin_control,
                           const CTxMemPool &pool) {
    CFeeRate neededFeeRate =
        (coin_control.fOverrideFeeRate && coin_control.m_feerate)
            ? *coin_control.m_feerate
            : wallet.m_pay_tx_fee;

    if (neededFeeRate == CFeeRate()) {
        neededFeeRate = pool.estimateFee();
        // ... unless we don't have enough mempool data for estimatefee, then
        // use fallback fee.
        if (neededFeeRate == CFeeRate()) {
            neededFeeRate = wallet.m_fallback_fee;
        }
    }

    // Prevent user from paying a fee below minRelayTxFee or minTxFee.
    return std::max(neededFeeRate, GetRequiredFeeRate(wallet));
}
