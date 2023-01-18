// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROCESSOR_H
#define BITCOIN_AVALANCHE_PROCESSOR_H

#include <avalanche/config.h>
#include <avalanche/node.h>
#include <avalanche/proofcomparator.h>
#include <avalanche/protocol.h>
#include <blockindexworkcomparator.h>
#include <eventloop.h>
#include <interfaces/chain.h>
#include <interfaces/handler.h>
#include <key.h>
#include <net.h>
#include <rwcollection.h>
#include <util/variant.h>

#include <boost/multi_index/composite_key.hpp>
#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/member.hpp>
#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index_container.hpp>

#include <atomic>
#include <chrono>
#include <cstdint>
#include <memory>
#include <variant>
#include <vector>

class ArgsManager;
class CBlockIndex;
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
 * How long before we consider that a query timed out.
 */
static constexpr std::chrono::milliseconds AVALANCHE_DEFAULT_QUERY_TIMEOUT{
    10000};

namespace avalanche {

class Delegation;
class PeerManager;
class Proof;
class ProofRegistrationState;
struct VoteRecord;

enum struct VoteStatus : uint8_t {
    Invalid,
    Rejected,
    Accepted,
    Finalized,
    Stale,
};

using AnyVoteItem = std::variant<const ProofRef, const CBlockIndex *>;

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
        TimePoint timeout;

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
                boost::multi_index::member<Query, TimePoint,
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

    Processor(Config avaconfig, interfaces::Chain &chain, CConnman *connmanIn,
              ChainstateManager &chainman, CScheduler &scheduler,
              std::unique_ptr<PeerData> peerDataIn, CKey sessionKeyIn,
              uint32_t minQuorumTotalScoreIn,
              double minQuorumConnectedScoreRatioIn,
              int64_t minAvaproofsNodeCountIn, uint32_t staleVoteThresholdIn,
              uint32_t staleVoteFactorIn, Amount stakeUtxoDustThresholdIn);

public:
    ~Processor();

    static std::unique_ptr<Processor>
    MakeProcessor(const ArgsManager &argsman, interfaces::Chain &chain,
                  CConnman *connman, ChainstateManager &chainman,
                  CScheduler &scheduler, bilingual_str &error);

    bool addToReconcile(const AnyVoteItem &item);
    bool isAccepted(const AnyVoteItem &item) const;
    int getConfidence(const AnyVoteItem &item) const;

    // TODO: Refactor the API to remove the dependency on avalanche/protocol.h
    void sendResponse(CNode *pfrom, Response response) const;
    bool registerVotes(NodeId nodeid, const Response &response,
                       std::vector<VoteItemUpdate> &updates, int &banscore,
                       std::string &error);

    template <typename Callable> auto withPeerManager(Callable &&func) const {
        LOCK(cs_peerManager);
        return func(*peerManager);
    }

    CPubKey getSessionPubKey() const;
    bool sendHello(CNode *pfrom) const;

    ProofRef getLocalProof() const;
    ProofRegistrationState getLocalProofRegistrationState() const;

    /*
     * Return whether the avalanche service flag should be set.
     */
    bool isAvalancheServiceAvailable() { return !!peerData; }

    bool startEventLoop(CScheduler &scheduler);
    bool stopEventLoop();

    void avaproofsSent(NodeId nodeid) LOCKS_EXCLUDED(cs_main);
    int64_t getAvaproofsNodeCounter() const {
        return avaproofsNodeCounter.load();
    }
    bool isQuorumEstablished() LOCKS_EXCLUDED(cs_main);

    // Implement NetEventInterface. Only FinalizeNode is of interest.
    void InitializeNode(const ::Config &config, CNode *pnode) override {}
    bool ProcessMessages(const ::Config &config, CNode *pnode,
                         std::atomic<bool> &interrupt) override {
        return false;
    }
    bool SendMessages(const ::Config &config, CNode *pnode) override {
        return false;
    }

    /** Handle removal of a node */
    void FinalizeNode(const ::Config &config, const CNode &node) override
        LOCKS_EXCLUDED(cs_main);

private:
    void runEventLoop();
    void clearTimedoutRequests();
    std::vector<CInv> getInvsForNextPoll(bool forPoll = true);

    struct IsWorthPolling {
        const Processor &processor;

        IsWorthPolling(const Processor &_processor) : processor(_processor){};

        bool operator()(const CBlockIndex *pindex) const
            LOCKS_EXCLUDED(cs_main);
        bool operator()(const ProofRef &proof) const
            LOCKS_EXCLUDED(cs_peerManager);
    };
    bool isWorthPolling(const AnyVoteItem &item) const {
        return std::visit(IsWorthPolling(*this), item);
    }

    struct GetLocalAcceptance {
        const Processor &processor;

        GetLocalAcceptance(const Processor &_processor)
            : processor(_processor){};

        bool operator()(const CBlockIndex *pindex) const
            LOCKS_EXCLUDED(cs_main);
        bool operator()(const ProofRef &proof) const
            LOCKS_EXCLUDED(cs_peerManager);
    };
    bool getLocalAcceptance(const AnyVoteItem &item) const {
        return std::visit(GetLocalAcceptance(*this), item);
    }

    friend struct ::avalanche::AvalancheTest;
};

} // namespace avalanche

#endif // BITCOIN_AVALANCHE_PROCESSOR_H
