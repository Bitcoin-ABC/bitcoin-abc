// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pow/pow.h>

#include <arith_uint256.h>
#include <chain.h>
#include <chainparams.h>
#include <consensus/activation.h>
#include <consensus/params.h>
#include <pow/aserti32d.h>
#include <pow/daa.h>
#include <pow/eda.h>
#include <primitives/blockhash.h>
#include <util/system.h>

uint32_t GetNextWorkRequired(const CBlockIndex *pindexPrev,
                             const CBlockHeader *pblock,
                             const CChainParams &chainParams) {
    // GetNextWorkRequired should never be called on the genesis block
    assert(pindexPrev != nullptr);

    const Consensus::Params &params = chainParams.GetConsensus();

    // Special rule for regtest: we never retarget.
    if (params.fPowNoRetargeting) {
        return pindexPrev->nBits;
    }

    if (IsAxionEnabled(params, pindexPrev)) {
        return GetNextASERTWorkRequired(pindexPrev, pblock, params);
    }

    if (IsDAAEnabled(params, pindexPrev)) {
        return GetNextDAAWorkRequired(pindexPrev, pblock, params);
    }

    return GetNextEDAWorkRequired(pindexPrev, pblock, params);
}

bool CheckProofOfWork(const BlockHash &hash, uint32_t nBits,
                      const Consensus::Params &params) {
    bool fNegative;
    bool fOverflow;
    arith_uint256 bnTarget;

    bnTarget.SetCompact(nBits, &fNegative, &fOverflow);

    // Check range
    if (fNegative || bnTarget == 0 || fOverflow ||
        bnTarget > UintToArith256(params.powLimit)) {
        return false;
    }

    // Check proof of work matches claimed amount
    if (UintToArith256(hash) > bnTarget) {
        return false;
    }

    return true;
}
