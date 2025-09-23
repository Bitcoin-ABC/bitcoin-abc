// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROCESSOR_H
#define BITCOIN_AVALANCHE_PROCESSOR_H

#include <avalanche/config.h>
#include <avalanche/node.h>
#include <avalanche/proof.h>
#include <avalanche/proofcomparator.h>
#include <avalanche/protocol.h>
#include <avalanche/stakecontender.h>
#include <avalanche/voterecord.h> // For AVALANCHE_MAX_INFLIGHT_POLL
#include <blockindex.h>
#include <blockindexcomparators.h>
#include <common/bloom.h>
#include <eventloop.h>
#include <interfaces/chain.h>
#include <interfaces/handler.h>
#include <key.h>
#include <net.h>
#include <primitives/transaction.h>
#include <rwcollection.h>
#include <txmempool.h>
#include <util/variant.h>
#include <validationinterface.h>

#include <boost/multi_index/composite_key.hpp>
#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/member.hpp>
#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index_container.hpp>

#include <atomic>
#include <chrono>
#include <cstdint>
#include <memory>
#include <unordered_map>
#include <variant>
#include <vector>

class ArgsManager;
class CConnman;
class CNode;
class CScheduler;
class Config;
class PeerManager;
struct bilingual_str;

/**
 * Maximum item that can be polled at once.
 */
static constexpr size_t AVALANCHE_MAX_ELEMENT_POLL = 16;

/**
 * Maximum number of stake contenders to poll for, leaving room for polling
 * blocks and proofs in the same poll message.
 */
static constexpr size_t AVALANCHE_CONTENDER_MAX_POLLABLE = 12;

/**
 * How long before we consider that a query timed out.
 */
static constexpr std::chrono::milliseconds AVALANCHE_DEFAULT_QUERY_TIMEOUT{
    10000};

/**
 * The size of the finalized items filter. It should be large enough that an
 * influx of inventories cannot roll any particular item out of the filter on
 * demand. For example, transactions will roll blocks out of the filter.
 * Tracking many more items than can possibly be polled at once ensures that
 * recently polled items will come to a stable state on the network before
 * rolling out of the filter.
 */
static constexpr uint32_t AVALANCHE_FINALIZED_ITEMS_FILTER_NUM_ELEMENTS =
    AVALANCHE_MAX_INFLIGHT_POLL * 20;

namespace avalanche {

class Delegation;
class PeerManager;
class ProofRegistrationState;
struct VoteRecord;

enum struct VoteStatus : uint8_t {
    Invalid,
    Rejected,
    Accepted,
    Finalized,
    Stale,
};

using AnyVoteItem = std::variant<const ProofRef, const CBlockIndex *,
                                 const StakeContenderId, const CTransactionRef>;

class VoteItemUpdate {
    AnyVoteItem item;
    VoteStatus status;

public:
    VoteItemUpdate(AnyVoteItem itemIn, VoteStatus statusIn)
        : item(std::move(itemIn)), status(statusIn) {}

    const VoteStatus &getStatus() const { return status; }
    const AnyVoteItem &getVoteItem() const { return item; }
};

struct VoteMapComparator {
    bool operator()(const AnyVoteItem &lhs, const AnyVoteItem &rhs) const {
        // If the variants are of different types, sort them by variant index
        if (lhs.index() != rhs.index()) {
            return lhs.index() < rhs.index();
        }

        return std::visit(
            variant::overloaded{
                [](const ProofRef &lhs, const ProofRef &rhs) {
                    return ProofComparatorByScore()(lhs, rhs);
                },
                [](const CBlockIndex *lhs, const CBlockIndex *rhs) {
                    // Reverse ordering so we get the highest work first
                    return CBlockIndexWorkComparator()(rhs, lhs);
                },
                [](const StakeContenderId &lhs, const StakeContenderId &rhs) {
                    return lhs < rhs;
                },
                [](const CTransactionRef &lhs, const CTransactionRef &rhs) {
                    return lhs->GetId() < rhs->GetId();
                },
                [](const auto &lhs, const auto &rhs) {
                    // This serves 2 purposes:
                    //  - This makes sure that we don't forget to implement a
                    //    comparison case when adding a new variant type.
                    //  - This avoids having to write all the cross type cases
                    //    which are already handled by the index sort above.
                    //    Because the compiler has no way to determine that, we
                    //    cannot use static assertions here without having to
                    //    define the whole type matrix also.
                    assert(false);
                    // Return any bool, it's only there to make the compiler
                    // happy.
                    return false;
                },
            },
            lhs, rhs);
    }
};
using VoteMap = std::map<AnyVoteItem, VoteRecord, VoteMapComparator>;

struct query_timeout {};

namespace {
    struct AvalancheTest;
}

// FIXME Implement a proper notification handler for node disconnection instead
// of implementing the whole NetEventsInterface for a single interesting event.
class Processor final : public NetEventsInterface {
    Config avaconfig;
    CConnman *connman;
    ChainstateManager &chainman;
    CTxMemPool *mempool;

    /**
     * Items to run avalanche on.
     */
    RWCollection<VoteMap> voteRecords;

    /**
     * Keep track of peers and queries sent.
     */
    std::atomic<uint64_t> round;

    /**
     * Keep track of the peers and associated infos.
     */
    mutable Mutex cs_peerManager;
    std::unique_ptr<PeerManager> peerManager GUARDED_BY(cs_peerManager);

    struct Query {
        NodeId nodeid;
        uint64_t round;
        SteadyMilliseconds timeout;

        /**
         * We declare this as mutable so it can be modified in the multi_index.
         * This is ok because we do not use this field to index in anyway.
         *
         * /!\ Do not use any mutable field as index.
         */
        mutable std::vector<CInv> invs;
    };

    using QuerySet = boost::multi_index_container<
        Query,
        boost::multi_index::indexed_by<
            // index by nodeid/round
            boost::multi_index::hashed_unique<boost::multi_index::composite_key<
                Query,
                boost::multi_index::member<Query, NodeId, &Query::nodeid>,
                boost::multi_index::member<Query, uint64_t, &Query::round>>>,
            // sorted by timeout
            boost::multi_index::ordered_non_unique<
                boost::multi_index::tag<query_timeout>,
                boost::multi_index::member<Query, SteadyMilliseconds,
                                           &Query::timeout>>>>;

    RWCollection<QuerySet> queries;

    /** Data required to participate. */
    struct PeerData;
    std::unique_ptr<PeerData> peerData;
    CKey sessionKey;

    /** Event loop machinery. */
    EventLoop eventLoop;

    /**
     * Quorum management.
     */
    uint32_t minQuorumScore;
    double minQuorumConnectedScoreRatio;
    std::atomic<bool> quorumIsEstablished{false};
    std::atomic<bool> m_canShareLocalProof{false};
    int64_t minAvaproofsNodeCount;
    std::atomic<int64_t> avaproofsNodeCounter{0};

    /** Voting parameters. */
    const uint32_t staleVoteThreshold;
    const uint32_t staleVoteFactor;

    /** Registered interfaces::Chain::Notifications handler. */
    class NotificationsHandler;
    std::unique_ptr<interfaces::Handler> chainNotificationsHandler;

    mutable Mutex cs_finalizationTip;
    const CBlockIndex *finalizationTip GUARDED_BY(cs_finalizationTip){nullptr};

    mutable Mutex cs_delayedAvahelloNodeIds;
    /**
     * A list of the nodes that did not get our proof announced via avahello
     * yet because we had no inbound connection.
     */
    std::unordered_set<NodeId>
        delayedAvahelloNodeIds GUARDED_BY(cs_delayedAvahelloNodeIds);

    struct StakingReward {
        int blockheight;
        // Ordered list of acceptable winners, only the first is used for mining
        std::vector<std::pair<ProofId, CScript>> winners;
    };

    mutable Mutex cs_stakingRewards;
    std::unordered_map<BlockHash, StakingReward, SaltedUint256Hasher>
        stakingRewards GUARDED_BY(cs_stakingRewards);

    Processor(Config avaconfig, interfaces::Chain &chain, CConnman *connmanIn,
              ChainstateManager &chainman, CTxMemPool *mempoolIn,
              CScheduler &scheduler, std::unique_ptr<PeerData> peerDataIn,
              CKey sessionKeyIn, uint32_t minQuorumTotalScoreIn,
              double minQuorumConnectedScoreRatioIn,
              int64_t minAvaproofsNodeCountIn, uint32_t staleVoteThresholdIn,
              uint32_t staleVoteFactorIn, Amount stakeUtxoDustThresholdIn,
              bool preConsensus, bool stakingPreConsensus);

    const bool m_preConsensus{false};
    const bool m_stakingPreConsensus{false};

public:
    ~Processor();

    static std::unique_ptr<Processor>
    MakeProcessor(const ArgsManager &argsman, interfaces::Chain &chain,
                  CConnman *connman, ChainstateManager &chainman,
                  CTxMemPool *mempoolIn, CScheduler &scheduler,
                  bilingual_str &error);

    bool addToReconcile(const AnyVoteItem &item)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_finalizedItems);
    /**
     * Wrapper around the addToReconcile for proofs that adds back the
     * finalization flag to the peer if it is not polled due to being recently
     * finalized.
     */
    bool reconcileOrFinalize(const ProofRef &proof)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_finalizedItems);
    bool isAccepted(const AnyVoteItem &item) const;
    int getConfidence(const AnyVoteItem &item) const;
    bool isPolled(const AnyVoteItem &item) const;

    bool isRecentlyFinalized(const uint256 &itemId) const
        EXCLUSIVE_LOCKS_REQUIRED(!cs_finalizedItems);
    void setRecentlyFinalized(const uint256 &itemId)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_finalizedItems);
    void clearFinalizedItems() EXCLUSIVE_LOCKS_REQUIRED(!cs_finalizedItems);

    // TODO: Refactor the API to remove the dependency on avalanche/protocol.h
    void sendResponse(CNode *pfrom, Response response) const;
    bool registerVotes(NodeId nodeid, const Response &response,
                       std::vector<VoteItemUpdate> &updates, bool &disconnect,
                       std::string &error)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_finalizedItems,
                                 !cs_invalidatedBlocks, !cs_finalizationTip);

    template <typename Callable>
    auto withPeerManager(Callable &&func) const
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager) {
        LOCK(cs_peerManager);
        return func(*peerManager);
    }

    CPubKey getSessionPubKey() const;
    /**
     * @brief Send a avahello message
     *
     * @param pfrom The node to send the message to
     * @return True if a non-null delegation has been announced
     */
    bool sendHello(CNode *pfrom)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_delayedAvahelloNodeIds);
    void sendDelayedAvahello()
        EXCLUSIVE_LOCKS_REQUIRED(!cs_delayedAvahelloNodeIds);

    ProofRef getLocalProof() const;
    ProofRegistrationState getLocalProofRegistrationState() const
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager);

    /*
     * Return whether the avalanche service flag should be set.
     */
    bool isAvalancheServiceAvailable() { return !!peerData; }

    /** Whether there is a finalized tip */
    bool hasFinalizedTip() const EXCLUSIVE_LOCKS_REQUIRED(!cs_finalizationTip) {
        LOCK(cs_finalizationTip);
        return finalizationTip != nullptr;
    }

    bool startEventLoop(CScheduler &scheduler);
    bool stopEventLoop();

    void avaproofsSent(NodeId nodeid) LOCKS_EXCLUDED(cs_main)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager);
    int64_t getAvaproofsNodeCounter() const {
        return avaproofsNodeCounter.load();
    }
    bool isQuorumEstablished() LOCKS_EXCLUDED(cs_main)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_stakingRewards,
                                 !cs_finalizedItems);
    bool canShareLocalProof();

    bool computeStakingReward(const CBlockIndex *pindex)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_stakingRewards,
                                 !cs_finalizedItems);
    bool eraseStakingRewardWinner(const BlockHash &prevBlockHash)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_stakingRewards);
    void cleanupStakingRewards(const int minHeight)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_stakingRewards, !cs_peerManager);
    bool getStakingRewardWinners(
        const BlockHash &prevBlockHash,
        std::vector<std::pair<ProofId, CScript>> &winners) const
        EXCLUSIVE_LOCKS_REQUIRED(!cs_stakingRewards);
    bool getStakingRewardWinners(const BlockHash &prevBlockHash,
                                 std::vector<CScript> &payouts) const
        EXCLUSIVE_LOCKS_REQUIRED(!cs_stakingRewards);
    bool setStakingRewardWinners(const CBlockIndex *pprev,
                                 const std::vector<CScript> &payouts)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_stakingRewards, !cs_peerManager);
    bool setStakingRewardWinners(
        const CBlockIndex *pprev,
        const std::vector<std::pair<ProofId, CScript>> &winners)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_stakingRewards);

    // Implement NetEventInterface. Only FinalizeNode is of interest.
    void InitializeNode(const ::Config &config, CNode &pnode,
                        ServiceFlags our_services) override {}
    bool ProcessMessages(const ::Config &config, CNode *pnode,
                         std::atomic<bool> &interrupt) override {
        return false;
    }
    bool SendMessages(const ::Config &config, CNode *pnode) override {
        return false;
    }

    /** Handle removal of a node */
    void FinalizeNode(const ::Config &config,
                      const CNode &node) override LOCKS_EXCLUDED(cs_main)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_delayedAvahelloNodeIds);

    /** Track votes on stake contenders */
    int getStakeContenderStatus(const StakeContenderId &contenderId) const
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_stakingRewards);
    void acceptStakeContender(const StakeContenderId &contenderId)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager);
    void finalizeStakeContender(const StakeContenderId &contenderId)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_stakingRewards);
    void rejectStakeContender(const StakeContenderId &contenderId)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager);

    /** Promote stake contender cache entries to a given block and then poll */
    void promoteAndPollStakeContenders(const CBlockIndex *pprev)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_stakingRewards, !cs_peerManager,
                                 !cs_finalizedItems);

    bool isPreconsensusActivated() const;
    bool isStakingPreconsensusActivated() const;

private:
    void updatedBlockTip()
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_finalizedItems,
                                 !cs_finalizationTip, !cs_stakingRewards);
    void transactionAddedToMempool(const CTransactionRef &tx)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_finalizedItems);
    void runEventLoop()
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_stakingRewards,
                                 !cs_finalizedItems);
    void clearTimedoutRequests() EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager);
    std::vector<CInv> getInvsForNextPoll(bool forPoll = true)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_finalizedItems);
    bool sendHelloInternal(CNode *pfrom)
        EXCLUSIVE_LOCKS_REQUIRED(cs_delayedAvahelloNodeIds);
    AnyVoteItem getVoteItemFromInv(const CInv &inv) const
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager);

    /**
     * Helper to set the vote status for local winners in the contender cache.
     * pollableContenders are the highest ranking contenders that we should
     * poll.
     */
    bool setContenderStatusForLocalWinners(
        const CBlockIndex *pindex,
        std::vector<StakeContenderId> &pollableContenders)
        EXCLUSIVE_LOCKS_REQUIRED(!cs_peerManager, !cs_stakingRewards);

    /**
     * We don't need many blocks but a low false positive rate.
     * In the event of a false positive the node might skip polling this block.
     * Such a block will not get marked as finalized until it is reconsidered
     * for polling (if the filter changed its state) or another block is found.
     */
    mutable Mutex cs_invalidatedBlocks;
    CRollingBloomFilter invalidatedBlocks GUARDED_BY(cs_invalidatedBlocks){
        100, 0.0000001};

    /**
     * Rolling bloom filter to track recently finalized inventory items of any
     * type. Once placed in this filter, those items will not be polled again
     * unless they roll out. Note that this one filter tracks all types so
     * blocks may be rolled out by transaction activity for example.
     *
     * We want a low false positive rate to prevent accidentally not polling
     * for an item when it is first seen.
     */
    mutable Mutex cs_finalizedItems;
    CRollingBloomFilter finalizedItems GUARDED_BY(cs_finalizedItems){
        AVALANCHE_FINALIZED_ITEMS_FILTER_NUM_ELEMENTS, 0.0000001};

    struct IsWorthPolling {
        const Processor &processor;

        IsWorthPolling(const Processor &_processor) : processor(_processor){};

        bool operator()(const CBlockIndex *pindex) const
            LOCKS_EXCLUDED(cs_main);
        bool operator()(const ProofRef &proof) const
            LOCKS_EXCLUDED(cs_peerManager);
        bool operator()(const StakeContenderId &contenderId) const
            LOCKS_EXCLUDED(cs_peerManager, cs_stakingRewards);
        bool operator()(const CTransactionRef &tx) const;
    };
    bool isWorthPolling(const AnyVoteItem &item) const
        EXCLUSIVE_LOCKS_REQUIRED(!cs_finalizedItems);

    struct GetLocalAcceptance {
        const Processor &processor;

        GetLocalAcceptance(const Processor &_processor)
            : processor(_processor){};

        bool operator()(const CBlockIndex *pindex) const
            LOCKS_EXCLUDED(cs_main);
        bool operator()(const ProofRef &proof) const
            LOCKS_EXCLUDED(cs_peerManager);
        bool operator()(const StakeContenderId &contenderId) const;
        bool operator()(const CTransactionRef &tx) const;
    };
    bool getLocalAcceptance(const AnyVoteItem &item) const {
        return std::visit(GetLocalAcceptance(*this), item);
    }

    friend struct ::avalanche::AvalancheTest;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROCESSOR_H
