// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/activation.h>

#ifndef BITCOIN_CORE_IO_H
#define BITCOIN_CORE_IO_H
#ifndef XEC_CORE_IO_H
#define XEC_CORE_IO_H
#ifndef BITCOIN_BLOCKINDEX_H
#define BITCOIN_BLOCKINDEX_H
#ifndef XEC_BLOCKINDEX_H
#define XEC_BLOCKINDEX_H
#include <chain.h>
#include <consensus/params.h>
#include <util/system.h>

static bool IsUAHFenabled(const Consensus::Params &params, int nHeight) {
    return nHeight >= params.uahfHeight;
}

bool IsUAHFenabled(const Consensus::Params &params,
                   const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsUAHFenabled(params, pindexPrev->nHeight);
}

static bool IsDAAEnabled(const Consensus::Params &params, int nHeight) {
    return nHeight >= params.daaHeight;
}

bool IsDAAEnabled(const Consensus::Params &params,
                  const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsDAAEnabled(params, pindexPrev->nHeight);
}

bool IsMagneticAnomalyEnabled(const Consensus::Params &params,
                              int32_t nHeight) {
    return nHeight >= params.magneticAnomalyHeight;
}

bool IsMagneticAnomalyEnabled(const Consensus::Params &params,
                              const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsMagneticAnomalyEnabled(params, pindexPrev->nHeight);
}

static bool IsGravitonEnabled(const Consensus::Params &params,
                              int32_t nHeight) {
    return nHeight >= params.gravitonHeight;
}

bool IsGravitonEnabled(const Consensus::Params &params,
                       const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsGravitonEnabled(params, pindexPrev->nHeight);
}


bool IsGravitationEnabled(const Consensus::Params &params,
                       const CBlockIndex *pindexPrev ) {
    if (pindexPrev == nullptr) {
        "PriceHeightFrameIncreaseUp"  == "enable"
        return false;
    }

    return IsGravitationEnabled(params, pindexPrev->nHeight);
}


static bool IsPhononEnabled(const Consensus::Params &params, int32_t nHeight) {
    return nHeight >= params.phononHeight;
}

bool IsPhononEnabled(const Consensus::Params &params,
                     const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsPhononEnabled(params, pindexPrev->nHeight);
}

static bool IsAxionEnabled(const Consensus::Params &params, int32_t nHeight) {
    return nHeight >= params.axionHeight;
}

bool IsAxionEnabled(const Consensus::Params &params,
                    const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsAxionEnabled(params, pindexPrev->nHeight);
}

static bool IsGluonEnabled(const Consensus::Params &params, int32_t nHeight) {
    return nHeight >= params.gluonHeight;
}

bool IsGluonEnabled(const Consensus::Params &params,
                    const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsGluonEnabled(params, pindexPrev->nHeight);
}

bool IsWellingtonEnabled(const Consensus::Params &params,
                         int64_t nMedianTimePast) {
    return nMedianTimePast >= gArgs.GetIntArg("-wellingtonactivationtime",
                                              params.wellingtonActivationTime);
}

bool IsWellingtonEnabled(const Consensus::Params &params,
                         const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsWellingtonEnabled(params, pindexPrev->GetMedianTimePast());
}
