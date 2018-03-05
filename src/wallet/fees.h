// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2017 The Bitcoin Core developers
// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_FEES_H
#define BITCOIN_WALLET_FEES_H

#include <amount.h>
#include <feerate.h>

class CCoinControl;
class CTxMemPool;

/**
 * Return the minimum required fee taking into account the
 * floating relay fee and user set minimum transaction fee
 */
Amount GetRequiredFee(unsigned int nTxBytes);

/**
 * Estimate the minimum fee considering user set parameters
 * and the required fee
 */
Amount GetMinimumFee(unsigned int nTxBytes, const CCoinControl &coinControl,
                     const CTxMemPool &pool);

/**
 * Return the minimum required feerate taking into account the
 * floating relay feerate and user set minimum transaction feerate
 */
CFeeRate GetRequiredFeeRate();

/**
 * Estimate the minimum fee rate considering user set parameters
 * and the required fee
 */
CFeeRate GetMinimumFeeRate(const CCoinControl &coin_control,
                           const CTxMemPool &pool);

#endif // BITCOIN_WALLET_FEES_H
