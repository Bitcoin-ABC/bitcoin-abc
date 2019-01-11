// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2017 The Bitcoin Core developers
// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_WALLET_FEES_H
#define BITCOIN_WALLET_FEES_H

#include "amount.h"

class CBlockPolicyEstimator;
class CCoinControl;
class CFeeRate;
class CTxMemPool;
struct FeeCalculation;

/**
 * Estimate the minimum fee considering user set parameters
 * and the required fee
 */
Amount GetMinimumFee(unsigned int nTxBytes, unsigned int nConfirmTarget,
                     const CTxMemPool &pool);

/**
 * Estimate the minimum fee considering required fee and targetFee or if 0
 * then fee estimation for nConfirmTarget
 */

Amount GetMinimumFee(unsigned int nTxBytes, unsigned int nConfirmTarget,
                     const CTxMemPool &pool, Amount targetFee);

#endif // BITCOIN_WALLET_FEES_H
