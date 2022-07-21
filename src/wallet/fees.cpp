// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2017 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <wallet/fees.h>

#include <config.h>
#include <txmempool.h>
#include <wallet/coincontrol.h>
#include <wallet/wallet.h>

Amount GetRequiredFee(const CWallet &wallet, unsigned int nTxBytes) {
    return GetRequiredFeeRate(wallet).GetFeeCeiling(nTxBytes);
}

Amount GetMinimumFee(const CWallet &wallet, unsigned int nTxBytes,
                     const CCoinControl &coin_control) {
    return GetMinimumFeeRate(wallet, coin_control).GetFeeCeiling(nTxBytes);
}

CFeeRate GetRequiredFeeRate(const CWallet &wallet) {
    return std::max(wallet.m_min_fee, wallet.chain().relayMinFee());
}

CFeeRate GetMinimumFeeRate(const CWallet &wallet,
                           const CCoinControl &coin_control) {
    CFeeRate neededFeeRate =
        (coin_control.fOverrideFeeRate && coin_control.m_feerate)
            ? *coin_control.m_feerate
            : wallet.m_pay_tx_fee;

    if (neededFeeRate == CFeeRate()) {
        neededFeeRate = wallet.chain().estimateFee();
        // ... unless we don't have enough mempool data for estimatefee, then
        // use fallback fee.
        if (neededFeeRate == CFeeRate()) {
            neededFeeRate = wallet.m_fallback_fee;
        }
    }

    // Prevent user from paying a fee below the min relay fee.
    return std::max(neededFeeRate, GetRequiredFeeRate(wallet));
}
