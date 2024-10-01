// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_STAKECONTENDERCACHE_H
#define BITCOIN_AVALANCHE_STAKECONTENDERCACHE_H

#include <avalanche/proof.h>
#include <avalanche/stakecontender.h>
#include <primitives/blockhash.h>
#include <script/script.h>
#include <util/hasher.h>

#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/member.hpp>
#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index_container.hpp>

#include <vector>

namespace avalanche {

enum StakeContenderStatus : uint8_t {
    UNKNOWN = 0,
    // Set according to avalanche acceptance
    ACCEPTED = (1 << 0),
    // If set, this contender should be in the stake winner set
    IN_WINNER_SET = (1 << 1),
};

struct StakeContenderCacheEntry {
    BlockHash prevblockhash;
    int blockheight;
    ProofId proofid;
    uint8_t status;
    // Cache payout script and proof score because the peer manager does not
    // track past-valid proofs.
    CScript payoutScriptPubkey;
    uint32_t score;

    StakeContenderCacheEntry(const BlockHash &_prevblockhash, int _blockheight,
                             const ProofId &_proofid, uint8_t _status,
                             const CScript &_payoutScriptPubkey,
                             uint32_t _score)
        : prevblockhash(_prevblockhash), blockheight(_blockheight),
          proofid(_proofid), status(_status),
          payoutScriptPubkey(_payoutScriptPubkey), score(_score) {}

    double computeRewardRank() const {
        return getStakeContenderId().ComputeProofRewardRank(score);
    }
    StakeContenderId getStakeContenderId() const {
        return StakeContenderId{prevblockhash, proofid};
    }
    bool isAccepted() const { return status & StakeContenderStatus::ACCEPTED; }
    bool isInWinnerSet() const {
        return status & StakeContenderStatus::IN_WINNER_SET;
    }
};

struct ManualWinners {
    BlockHash prevblockhash;
    int blockheight;
    std::vector<CScript> payoutScripts;

    ManualWinners(const BlockHash &_prevblockhash, int _blockheight,
                  std::vector<CScript> &_payoutScripts)
        : prevblockhash(_prevblockhash), blockheight(_blockheight),
          payoutScripts(_payoutScripts) {}
};

struct stakecontenderid_index {
    using result_type = StakeContenderId;
    result_type operator()(const StakeContenderCacheEntry &entry) const {
        return entry.getStakeContenderId();
    }
};

struct by_stakecontenderid;
struct by_prevblockhash;
struct by_blockheight;

namespace bmi = boost::multi_index;

/**
 * Cache to track stake contenders for recent blocks.
 */
class StakeContenderCache {
    using ContenderSet = boost::multi_index_container<
        StakeContenderCacheEntry,
        bmi::indexed_by<
            // index by stake contender id
            bmi::hashed_unique<bmi::tag<by_stakecontenderid>,
                               stakecontenderid_index, SaltedUint256Hasher>,
            // index by prevblockhash
            bmi::hashed_non_unique<
                bmi::tag<by_prevblockhash>,
                bmi::member<StakeContenderCacheEntry, BlockHash,
                            &StakeContenderCacheEntry::prevblockhash>,
                SaltedUint256Hasher>,
            // index by block height
            bmi::ordered_non_unique<
                bmi::tag<by_blockheight>,
                bmi::member<StakeContenderCacheEntry, int,
                            &StakeContenderCacheEntry::blockheight>>>>;

    ContenderSet contenders;

    using ManualWinnersSet = boost::multi_index_container<
        ManualWinners,
        bmi::indexed_by<
            // index by prevblockhash
            bmi::hashed_unique<bmi::tag<by_prevblockhash>,
                               bmi::member<ManualWinners, BlockHash,
                                           &ManualWinners::prevblockhash>,
                               SaltedUint256Hasher>,
            // index by block height
            bmi::ordered_unique<
                bmi::tag<by_blockheight>,
                bmi::member<ManualWinners, int, &ManualWinners::blockheight>>>>;

    ManualWinnersSet manualWinners;

public:
    StakeContenderCache() {}

    void cleanup(const int minHeight);

    /**
     * For tests.
     */
    size_t isEmpty() const {
        return (contenders.size() + manualWinners.size()) == 0;
    }

    /**
     * Add a proof to consider in staking rewards pre-consensus.
     */
    bool add(const CBlockIndex *pindex, const ProofRef &proof,
             uint8_t status = StakeContenderStatus::UNKNOWN);
    /**
     * Add a proof that should be treated as a winner (already finalized). This
     * should only be used for manually added winners via RPC.
     */
    bool addWinner(const CBlockIndex *pindex, const CScript &payoutScript);

    /**
     * Helpers to set avalanche state of a contender.
     */
    bool accept(const StakeContenderId &contenderId);
    bool finalize(const StakeContenderId &contenderId);
    bool reject(const StakeContenderId &contenderId);
    bool invalidate(const StakeContenderId &contenderId);

    /**
     * Get contender acceptance state for avalanche voting.
     * Returns 0 for accepted, 1 for rejected, and -1 for not in cache.
     */
    int getVoteStatus(const StakeContenderId &contenderId) const;

    /**
     * Get payout scripts of the winning proofs.
     */
    bool getWinners(const BlockHash &prevblockhash,
                    std::vector<CScript> &payouts) const;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_STAKECONTENDERCACHE_H
