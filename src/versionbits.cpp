// Copyright (c) 2016-2018 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/params.h>
#include <versionbits.h>

ThresholdState AbstractThresholdConditionChecker::GetStateFor(
    const CBlockIndex *pindexPrev, const Consensus::Params &params,
    ThresholdConditionCache &cache) const {
    int nPeriod = Period(params);
    int nThreshold = Threshold(params);
    int64_t nTimeStart = BeginTime(params);
    int64_t nTimeTimeout = EndTime(params);

    // Check if this deployment is always active.
    if (nTimeStart == Consensus::BIP9Deployment::ALWAYS_ACTIVE) {
        return ThresholdState::ACTIVE;
    }

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
        return params.vDeployments[id].nActivationThreshold;
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
        return uint32_t(1) << params.vDeployments[id].bit;
    }
};

} // namespace

uint32_t VersionBitsCache::Mask(const Consensus::Params &params,
                                Consensus::DeploymentPos pos) {
    return VersionBitsConditionChecker(pos).Mask(params);
}

int32_t VersionBitsCache::ComputeBlockVersion(const CBlockIndex *pindexPrev,
                                              const Consensus::Params &params) {
    LOCK(m_mutex);
    int32_t nVersion = VERSIONBITS_TOP_BITS;

    for (int i = 0; i < int{Consensus::MAX_VERSION_BITS_DEPLOYMENTS}; i++) {
        Consensus::DeploymentPos pos = static_cast<Consensus::DeploymentPos>(i);
        ThresholdState state = VersionBitsConditionChecker(pos).GetStateFor(
            pindexPrev, params, m_caches[pos]);
        if (state == ThresholdState::LOCKED_IN ||
            state == ThresholdState::STARTED) {
            nVersion |= Mask(params, pos);
        }
    }

    // Clear the last 4 bits (miner fund activation).
    return nVersion & ~uint32_t(0x0f);
}

