// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "versionbits.h"

#include "consensus/params.h"

const struct BIP9DeploymentInfo
    VersionBitsDeploymentInfo[Consensus::MAX_VERSION_BITS_DEPLOYMENTS] = {
        {
            /*.name =*/"testdummy",
            /*.gbt_force =*/true,
        },
};

ThresholdState AbstractThresholdConditionChecker::GetStateFor(
    const CBlockIndex *pindexPrev, const Consensus::Params &params,
    ThresholdConditionCache &cache) const {
    int nPeriod = Period(params);
    int nThreshold = Threshold(params);
    int64_t nTimeStart = BeginTime(params);
    int64_t nTimeTimeout = EndTime(params);

    // A block's state is always the same as that of the first of its period, so
    // it is computed based on a pindexPrev whose height equals a multiple of
    // nPeriod - 1.
    if (pindexPrev != nullptr) {
        pindexPrev = pindexPrev->GetAncestor(
            pindexPrev->nHeight - ((pindexPrev->nHeight + 1) % nPeriod));
    }

    // Walk backwards in steps of nPeriod to find a pindexPrev whose information
    // is known
    std::vector<const CBlockIndex *> vToCompute;
    while (cache.count(pindexPrev) == 0) {
        if (pindexPrev == nullptr) {
            // The genesis block is by definition defined.
            cache[pindexPrev] = ThresholdState::DEFINED;
            break;
        }
        if (pindexPrev->GetMedianTimePast() < nTimeStart) {
            // Optimization: don't recompute down further, as we know every
            // earlier block will be before the start time
            cache[pindexPrev] = ThresholdState::DEFINED;
            break;
        }
        vToCompute.push_back(pindexPrev);
        pindexPrev = pindexPrev->GetAncestor(pindexPrev->nHeight - nPeriod);
    }

    // At this point, cache[pindexPrev] is known
    assert(cache.count(pindexPrev));
    ThresholdState state = cache[pindexPrev];

    // Now walk forward and compute the state of descendants of pindexPrev
    while (!vToCompute.empty()) {
        ThresholdState stateNext = state;
        pindexPrev = vToCompute.back();
        vToCompute.pop_back();

        switch (state) {
            case ThresholdState::DEFINED: {
                if (pindexPrev->GetMedianTimePast() >= nTimeTimeout) {
                    stateNext = ThresholdState::FAILED;
                } else if (pindexPrev->GetMedianTimePast() >= nTimeStart) {
                    stateNext = ThresholdState::STARTED;
                }
                break;
            }
            case ThresholdState::STARTED: {
                if (pindexPrev->GetMedianTimePast() >= nTimeTimeout) {
                    stateNext = ThresholdState::FAILED;
                    break;
                }
                // We need to count
                const CBlockIndex *pindexCount = pindexPrev;
                int count = 0;
                for (int i = 0; i < nPeriod; i++) {
                    if (Condition(pindexCount, params)) {
                        count++;
                    }
                    pindexCount = pindexCount->pprev;
                }
                if (count >= nThreshold) {
                    stateNext = ThresholdState::LOCKED_IN;
                }
                break;
            }
            case ThresholdState::LOCKED_IN: {
                // Always progresses into ACTIVE.
                stateNext = ThresholdState::ACTIVE;
                break;
            }
            case ThresholdState::FAILED:
            case ThresholdState::ACTIVE: {
                // Nothing happens, these are terminal states.
                break;
            }
        }
        cache[pindexPrev] = state = stateNext;
    }

    return state;
}

int AbstractThresholdConditionChecker::GetStateSinceHeightFor(
    const CBlockIndex *pindexPrev, const Consensus::Params &params,
    ThresholdConditionCache &cache) const {
    const ThresholdState initialState = GetStateFor(pindexPrev, params, cache);

    // BIP 9 about state DEFINED: "The genesis block is by definition in this
    // state for each deployment."
    if (initialState == ThresholdState::DEFINED) {
        return 0;
    }

    const int nPeriod = Period(params);

    // A block's state is always the same as that of the first of its period, so
    // it is computed based on a pindexPrev whose height equals a multiple of
    // nPeriod - 1. To ease understanding of the following height calculation,
    // it helps to remember that right now pindexPrev points to the block prior
    // to the block that we are computing for, thus: if we are computing for the
    // last block of a period, then pindexPrev points to the second to last
    // block of the period, and if we are computing for the first block of a
    // period, then pindexPrev points to the last block of the previous period.
    // The parent of the genesis block is represented by nullptr.
    pindexPrev = pindexPrev->GetAncestor(pindexPrev->nHeight -
                                         ((pindexPrev->nHeight + 1) % nPeriod));

    const CBlockIndex *previousPeriodParent =
        pindexPrev->GetAncestor(pindexPrev->nHeight - nPeriod);

    while (previousPeriodParent != nullptr &&
           GetStateFor(previousPeriodParent, params, cache) == initialState) {
        pindexPrev = previousPeriodParent;
        previousPeriodParent =
            pindexPrev->GetAncestor(pindexPrev->nHeight - nPeriod);
    }

    // Adjust the result because right now we point to the parent block.
    return pindexPrev->nHeight + 1;
}

namespace {
/**
 * Class to implement versionbits logic.
 */
class VersionBitsConditionChecker : public AbstractThresholdConditionChecker {
private:
    const Consensus::DeploymentPos id;

protected:
    int64_t BeginTime(const Consensus::Params &params) const override {
        return params.vDeployments[id].nStartTime;
    }
    int64_t EndTime(const Consensus::Params &params) const override {
        return params.vDeployments[id].nTimeout;
    }
    int Period(const Consensus::Params &params) const override {
        return params.nMinerConfirmationWindow;
    }
    int Threshold(const Consensus::Params &params) const override {
        return params.nRuleChangeActivationThreshold;
    }

    bool Condition(const CBlockIndex *pindex,
                   const Consensus::Params &params) const override {
        return (((pindex->nVersion & VERSIONBITS_TOP_MASK) ==
                 VERSIONBITS_TOP_BITS) &&
                (pindex->nVersion & Mask(params)) != 0);
    }

public:
    explicit VersionBitsConditionChecker(Consensus::DeploymentPos id_)
        : id(id_) {}
    uint32_t Mask(const Consensus::Params &params) const {
        return ((uint32_t)1) << params.vDeployments[id].bit;
    }
};
} // namespace

ThresholdState VersionBitsState(const CBlockIndex *pindexPrev,
                                const Consensus::Params &params,
                                Consensus::DeploymentPos pos,
                                VersionBitsCache &cache) {
    return VersionBitsConditionChecker(pos).GetStateFor(pindexPrev, params,
                                                        cache.caches[pos]);
}

int VersionBitsStateSinceHeight(const CBlockIndex *pindexPrev,
                                const Consensus::Params &params,
                                Consensus::DeploymentPos pos,
                                VersionBitsCache &cache) {
    return VersionBitsConditionChecker(pos).GetStateSinceHeightFor(
        pindexPrev, params, cache.caches[pos]);
}

uint32_t VersionBitsMask(const Consensus::Params &params,
                         Consensus::DeploymentPos pos) {
    return VersionBitsConditionChecker(pos).Mask(params);
}

void VersionBitsCache::Clear() {
    for (unsigned int d = 0; d < Consensus::MAX_VERSION_BITS_DEPLOYMENTS; d++) {
        caches[d].clear();
    }
}
