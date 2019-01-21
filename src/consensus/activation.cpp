// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "activation.h"

#include "chain.h"
#include "chainparams.h"
#include "config.h"
#include "util.h"

static bool IsUAHFenabled(const Config &config, int nHeight) {
    return nHeight >= config.GetChainParams().GetConsensus().uahfHeight;
}

bool IsUAHFenabled(const Config &config, const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsUAHFenabled(config, pindexPrev->nHeight);
}

static bool IsDAAEnabled(const Config &config, int nHeight) {
    return nHeight >= config.GetChainParams().GetConsensus().daaHeight;
}

bool IsDAAEnabled(const Config &config, const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsDAAEnabled(config, pindexPrev->nHeight);
}

bool IsMagneticAnomalyEnabled(const Config &config, int32_t nHeight) {
    return nHeight >=
           config.GetChainParams().GetConsensus().magneticAnomalyHeight;
}

bool IsMagneticAnomalyEnabled(const Config &config,
                              const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsMagneticAnomalyEnabled(config, pindexPrev->nHeight);
}

bool IsGreatWallEnabled(const Config &config, const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return pindexPrev->GetMedianTimePast() >=
           gArgs.GetArg(
               "-greatwallactivationtime",
               config.GetChainParams().GetConsensus().greatWallActivationTime);
}
