// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_CONSENSUS_PARAMS_H
#define BITCOIN_CONSENSUS_PARAMS_H

#include <primitives/blockhash.h>
#include <uint256.h>

#include <limits>

namespace Consensus {

enum DeploymentPos {
    DEPLOYMENT_TESTDUMMY,
    DEPLOYEMENT_MINER_FUND,
    DEPLOYEMENT_MINER_FUND_ABC,
    DEPLOYEMENT_MINER_FUND_BCHD,
    DEPLOYEMENT_MINER_FUND_ELECTRON_CASH,
    // NOTE: Also add new deployments to VersionBitsDeploymentInfo in
    // versionbitsinfo.cpp
    MAX_VERSION_BITS_DEPLOYMENTS,
};

/**
 * Struct for each individual consensus rule change using BIP9.
 */
struct BIP9Deployment {
    /** Bit position to select the particular bit in nVersion. */
    int bit;
    /**
     * Minimum number of blocks within an activation window that must signal to
     * activate the deployement.
     * Default to 75% of 2016.
     */
    uint32_t nActivationThreshold = 1512;
    /**
     * Start MedianTime for version bits miner confirmation. Can be a date in
     * the past.
     */
    int64_t nStartTime = 0;
    /** Timeout/expiry MedianTime for the deployment attempt. */
    int64_t nTimeout = NO_TIMEOUT;

    /** Constant for nTimeout very far in the future. */
    static constexpr int64_t NO_TIMEOUT = std::numeric_limits<int64_t>::max();

    /**
     * Special value for nStartTime indicating that the deployment is always
     * active. This is useful for testing, as it means tests don't need to deal
     * with the activation process (which takes at least 3 BIP9 intervals). Only
     * tests that specifically test the behaviour during activation cannot use
     * this.
     */
    static constexpr int64_t ALWAYS_ACTIVE = -1;
};

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
    /** Unix time used for MTP activation of 15 May 2020 12:00:00 UTC upgrade */
    int phononActivationTime;
    /** Unix time used for MTP activation of 15 Nov 2020 12:00:00 UTC upgrade */
    int axionActivationTime;

    /**
     * Don't warn about unknown BIP 9 activations below this height.
     * This prevents us from warning about the CSV and segwit activations.
     */
    int MinBIP9WarningHeight;
    uint32_t nMinerConfirmationWindow;
    BIP9Deployment vDeployments[MAX_VERSION_BITS_DEPLOYMENTS];

    /** Enable or disable te miner fund by default */
    bool enableMinerFund;

    /** Proof of work parameters */
    uint256 powLimit;
    bool fPowAllowMinDifficultyBlocks;
    bool fPowNoRetargeting;
    int64_t nPowTargetSpacing;
    int64_t nPowTargetTimespan;
    int64_t DifficultyAdjustmentInterval() const {
        return nPowTargetTimespan / nPowTargetSpacing;
    }
    uint256 nMinimumChainWork;
    BlockHash defaultAssumeValid;
};
} // namespace Consensus

#endif // BITCOIN_CONSENSUS_PARAMS_H
