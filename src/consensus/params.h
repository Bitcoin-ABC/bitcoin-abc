// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONSENSUS_PARAMS_H
#define BITCOIN_CONSENSUS_PARAMS_H

#include <primitives/blockhash.h>
#include <uint256.h>

#include <chrono>
#include <limits>

namespace Consensus {

enum BuriedDeployment : int16_t {
    // buried deployments get negative values to avoid overlap with
    // DeploymentPos
    DEPLOYMENT_P2SH = std::numeric_limits<int16_t>::min(),
    DEPLOYMENT_HEIGHTINCB,
    DEPLOYMENT_CLTV,
    DEPLOYMENT_DERSIG,
    DEPLOYMENT_CSV,
};

constexpr bool ValidDeployment(BuriedDeployment dep) {
    return dep <= DEPLOYMENT_CSV;
}

/**
 * Parameters that influence chain consensus.
 */
struct Params {
    BlockHash hashGenesisBlock;
    int nSubsidyHalvingInterval;
    /** Block height at which BIP16 becomes active */
    int BIP16Height;
    /** Block height and hash at which BIP34 becomes active */
    int BIP34Height;
    BlockHash BIP34Hash;
    /** Block height at which BIP65 becomes active */
    int BIP65Height;
    /** Block height at which BIP66 becomes active */
    int BIP66Height;
    /** Block height at which CSV (BIP68, BIP112 and BIP113) becomes active */
    int CSVHeight;
    /** Block height at which UAHF kicks in */
    int uahfHeight;
    /** Block height at which the new DAA becomes active */
    int daaHeight;
    /** Block height at which the magnetic anomaly activation becomes active */
    int magneticAnomalyHeight;
    /** Block height at which the graviton activation becomes active */
    int gravitonHeight;
    /** Block height at which the phonon activation becomes active */
    int phononHeight;
    /** Block height at which the axion activation becomes active */
    int axionHeight;
    /** Block height at which the wellington activation becomes active */
    int wellingtonHeight;
    /** Block height at which the Cowperthwaite activation becomes active */
    int cowperthwaiteHeight;
    /** Unix time used for MTP activation of 15 May 2025 12:00:00 UTC upgrade */
    int schumpeterActivationTime;
    /** Unix time used for MTP activation of 15 May 2026 12:00:00 UTC upgrade */
    int obolenskyActivationTime;

    /** Enable or disable the miner fund by default */
    bool enableMinerFund;

    /** Enable or disable the staking rewards by default */
    bool enableStakingRewards;

    /** Proof of work parameters */
    uint256 powLimit;
    bool fPowAllowMinDifficultyBlocks;
    bool fPowNoRetargeting;
    int64_t nDAAHalfLife;
    int64_t nPowTargetSpacing;
    int64_t nPowTargetTimespan;
    std::chrono::seconds PowTargetSpacing() const {
        return std::chrono::seconds{nPowTargetSpacing};
    }
    int64_t DifficultyAdjustmentInterval() const {
        return nPowTargetTimespan / nPowTargetSpacing;
    }
    uint256 nMinimumChainWork;
    BlockHash defaultAssumeValid;

    int DeploymentHeight(BuriedDeployment dep) const {
        switch (dep) {
            case DEPLOYMENT_P2SH:
                return BIP16Height;
            case DEPLOYMENT_HEIGHTINCB:
                return BIP34Height;
            case DEPLOYMENT_CLTV:
                return BIP65Height;
            case DEPLOYMENT_DERSIG:
                return BIP66Height;
            case DEPLOYMENT_CSV:
                return CSVHeight;
        } // no default case, so the compiler can warn about missing cases
        return std::numeric_limits<int>::max();
    }
};

} // namespace Consensus

#endif // BITCOIN_CONSENSUS_PARAMS_H
