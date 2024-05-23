// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <pow/pow.h>

#include <arith_uint256.h>
#include <chain.h>
#include <chainparams.h>
#include <common/system.h>
#include <consensus/activation.h>
#include <consensus/params.h>
#include <pow/aserti32d.h>
#include <pow/daa.h>
#include <pow/eda.h>
#include <pow/grasberg.h>
#include <primitives/blockhash.h>

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

// Check that on difficulty adjustments, the new difficulty does not increase
// or decrease beyond the permitted limits.
bool PermittedDifficultyTransition(const Consensus::Params &params,
                                   int64_t height, uint32_t old_nbits,
                                   uint32_t new_nbits) {
    if (params.fPowAllowMinDifficultyBlocks) {
        return true;
    }

    // Keeping the same difficulty as the prev block is always permitted,
    // assuming the initial difficulty was valid, so bail out early.
    // The initial difficulty is valid because we start from the genesis block
    // and we stop calling this function as soon as it returns false.
    // This avoids further computation for most blocks prior to the BCH fork.
    if (old_nbits == new_nbits) {
        return true;
    }

    // Prior to the UAHF, the difficulty could change only every 2016 blocks,
    // so we can bail out early if we observe a difficulty change at an
    // unexpected block height.
    if (!IsUAHFenabled(params, height - 1) &&
        height % params.DifficultyAdjustmentInterval() != 0) {
        return false;
    }

    // Check [0, powLimit] range for all DAA algorithms.
    bool fNegative;
    bool fOverflow;
    arith_uint256 observed_new_target;
    observed_new_target.SetCompact(new_nbits, &fNegative, &fOverflow);
    if (fNegative || observed_new_target == 0 || fOverflow ||
        observed_new_target > UintToArith256(params.powLimit)) {
        return false;
    }

    // The newer difficulty adjustement algorithms (CW-144 and Aserti32d) do
    // not have other hard rules for permitted difficulty transitions.
    if (IsDAAEnabled(params, height - 1)) {
        return true;
    }

    return PermittedEDADifficultyTransition(params, old_nbits,
                                            observed_new_target);
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
