// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/activation.h>

#include <chain.h>
#include <common/args.h>
#include <consensus/params.h>

bool IsUAHFenabled(const Consensus::Params &params, int nHeight) {
    return nHeight >= params.uahfHeight;
}

bool IsUAHFenabled(const Consensus::Params &params,
                   const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsUAHFenabled(params, pindexPrev->nHeight);
}

bool IsDAAEnabled(const Consensus::Params &params, int nHeight) {
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

bool IsWellingtonEnabled(const Consensus::Params &params, int32_t nHeight) {
    return nHeight >= params.wellingtonHeight;
}

bool IsWellingtonEnabled(const Consensus::Params &params,
                         const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsWellingtonEnabled(params, pindexPrev->nHeight);
}

bool IsCowperthwaiteEnabled(const Consensus::Params &params, int32_t nHeight) {
    return nHeight >= params.cowperthwaiteHeight;
}

bool IsCowperthwaiteEnabled(const Consensus::Params &params,
                            const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsCowperthwaiteEnabled(params, pindexPrev->nHeight);
}

bool IsSchumpeterEnabled(const Consensus::Params &params,
                         int64_t nMedianTimePast) {
    return nMedianTimePast >= gArgs.GetIntArg("-schumpeteractivationtime",
                                              params.schumpeterActivationTime);
}

bool IsSchumpeterEnabled(const Consensus::Params &params,
                         const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsSchumpeterEnabled(params, pindexPrev->GetMedianTimePast());
}

bool IsShibusawaEnabled(const Consensus::Params &params,
                        int64_t nMedianTimePast) {
    return nMedianTimePast >= gArgs.GetIntArg("-shibusawaactivationtime",
                                              params.shibusawaActivationTime);
}

bool IsShibusawaEnabled(const Consensus::Params &params,
                        const CBlockIndex *pindexPrev) {
    if (pindexPrev == nullptr) {
        return false;
    }

    return IsShibusawaEnabled(params, pindexPrev->GetMedianTimePast());
}
