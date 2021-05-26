// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROCESSOR_H
#define BITCOIN_AVALANCHE_PROCESSOR_H

#include <avalanche/node.h>
#include <avalanche/peermanager.h>
#include <avalanche/protocol.h>
#include <blockindexworkcomparator.h>
#include <eventloop.h>
#include <interfaces/chain.h>
#include <interfaces/handler.h>
#include <key.h>
#include <rwcollection.h>

#include <boost/multi_index/composite_key.hpp>
#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/member.hpp>
#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index_container.hpp>

#include <atomic>
#include <chrono>
#include <cstdint>
#include <memory>
#include <vector>

class ArgsManager;
class Config;
class CBlockIndex;
class CScheduler;
class PeerManager;
struct bilingual_str;

using NodePeerManager = PeerManager;

/**
 * Is avalanche enabled by default.
 */
static constexpr bool AVALANCHE_DEFAULT_ENABLED = false;

/**
 * Finalization score.
 */
static constexpr int AVALANCHE_FINALIZATION_SCORE = 128;

/**
 * Maximum item that can be polled at once.
 */
static constexpr size_t AVALANCHE_MAX_ELEMENT_POLL = 16;
/**
 * Avalanche default cooldown in milliseconds.
 */
static constexpr size_t AVALANCHE_DEFAULT_COOLDOWN = 100;
/**
 * How long before we consider that a query timed out.
 */
static constexpr std::chrono::milliseconds AVALANCHE_DEFAULT_QUERY_TIMEOUT{
    10000};

/**
 * How many inflight requests can exist for one item.
 */
static constexpr int AVALANCHE_MAX_INFLIGHT_POLL = 10;

namespace avalanche {

class Delegation;
class PeerManager;
class Proof;

/**
 * Vote history.
 */
struct VoteRecord {
private:
    // confidence's LSB bit is the result. Higher bits are actual confidence
    // score.
    uint16_t confidence = 0;

    // Historical record of votes.
    uint8_t votes = 0;
    // Each bit indicate if the vote is to be considered.
    uint8_t consider = 0;
    // How many in flight requests exists for this element.
    mutable std::atomic<uint8_t> inflight{0};

    // Seed for pseudorandom operations.
    const uint32_t seed = 0;

    // Track how many successful votes occured.
    uint32_t successfulVotes = 0;

    // Track the nodes which are part of the quorum.
    std::array<uint16_t, 8> nodeFilter{{0, 0, 0, 0, 0, 0, 0, 0}};

public:
    explicit VoteRecord(bool accepted) : confidence(accepted) {}

    /**
     * Copy semantic
     */
    VoteRecord(const VoteRecord &other)
        : confidence(other.confidence), votes(other.votes),
          consider(other.consider), inflight(other.inflight.load()),
          successfulVotes(other.successfulVotes), nodeFilter(other.nodeFilter) {
    }

    /**
     * Vote accounting facilities.
     */
    bool isAccepted() const { return confidence & 0x01; }

    uint16_t getConfidence() const { return confidence >> 1; }
    bool hasFinalized() const {
        return getConfidence() >= AVALANCHE_FINALIZATION_SCORE;
    }

    /**
     * Register a new vote for an item and update confidence accordingly.
     * Returns true if the acceptance or finalization state changed.
     */
    bool registerVote(NodeId nodeid, uint32_t error);

    /**
     * Register that a request is being made regarding that item.
     * The method is made const so that it can be accessed via a read only view
     * of vote_records. It's not a problem as it is made thread safe.
     */
    bool registerPoll() const;

    /**
     * Return if this item is in condition to be polled at the moment.
     */
    bool shouldPoll() const { return inflight < AVALANCHE_MAX_INFLIGHT_POLL; }

    /**
     * Clear `count` inflight requests.
     */
    void clearInflightRequest(uint8_t count = 1) { inflight -= count; }

private:
    /**
     * Add the node to the quorum.
     * Returns true if the node was added, false if the node already was in the
     * quorum.
     */
    bool addNodeToQuorum(NodeId nodeid);
};

class BlockUpdate {
    union {
        CBlockIndex *pindex;
        uintptr_t raw;
    };

    static const size_t STATUS_BITS = 2;
    static const uintptr_t MASK = (1 << STATUS_BITS) - 1;

    static_assert(
        alignof(CBlockIndex) >= (1 << STATUS_BITS),
        "CBlockIndex alignement doesn't allow for Status to be stored.");

public:
    enum Status : uint8_t {
        Invalid,
        Rejected,
        Accepted,
        Finalized,
    };

    BlockUpdate(CBlockIndex *pindexIn, Status statusIn) : pindex(pindexIn) {
        raw |= statusIn;
    }

    Status getStatus() const { return Status(raw & MASK); }

    CBlockIndex *getBlockIndex() {
        return reinterpret_cast<CBlockIndex *>(raw & ~MASK);
    }

    const CBlockIndex *getBlockIndex() const {
        return const_cast<BlockUpdate *>(this)->getBlockIndex();
    }
};

using BlockVoteMap =
    std::map<const CBlockIndex *, VoteRecord, CBlockIndexWorkComparator>;

struct query_timeout {};

namespace {
    struct AvalancheTest;
}

class Processor {
    CConnman *connman;
    NodePeerManager *nodePeerManager;
    std::chrono::milliseconds queryTimeoutDuration;

    /**
     * Blocks to run avalanche on.
     */
    RWCollection<BlockVoteMap> vote_records;

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

    /** Registered interfaces::Chain::Notifications handler. */
    class NotificationsHandler;
    std::unique_ptr<interfaces::Handler> chainNotificationsHandler;

    /**
     * Flag indicating that the proof must be registered at first new block
     * after IBD
     */
    bool mustRegisterProof = false;

    Processor(interfaces::Chain &chain, CConnman *connmanIn,
              NodePeerManager *nodePeerManagerIn,
              std::unique_ptr<PeerData> peerDataIn, CKey sessionKeyIn);

public:
    ~Processor();

    static std::unique_ptr<Processor>
    MakeProcessor(const ArgsManager &argsman, interfaces::Chain &chain,
                  CConnman *connman, NodePeerManager *nodePeerManager,
                  bilingual_str &error);

    void setQueryTimeoutDuration(std::chrono::milliseconds d) {
        queryTimeoutDuration = d;
    }

    bool addBlockToReconcile(const CBlockIndex *pindex);
    bool isAccepted(const CBlockIndex *pindex) const;
    int getConfidence(const CBlockIndex *pindex) const;

    // TDOD: Refactor the API to remove the dependency on avalanche/protocol.h
    void sendResponse(CNode *pfrom, Response response) const;
    bool registerVotes(NodeId nodeid, const Response &response,
                       std::vector<BlockUpdate> &updates);

    bool addNode(NodeId nodeid, const Proof &proof,
                 const Delegation &delegation);
    bool forNode(NodeId nodeid, std::function<bool(const Node &n)> func) const;

    CPubKey getSessionPubKey() const;
    bool sendHello(CNode *pfrom) const;

    /**
     * Build and return the challenge whose signature we expect a peer to
     * include in his AVAHELLO message.
     */
    uint256 buildRemoteSighash(CNode *pfrom) const;

    /*
     * Return whether the avalanche service flag should be set.
     */
    bool isAvalancheServiceAvailable() { return !!peerData; }

    std::vector<avalanche::Peer> getPeers() const;
    std::vector<NodeId> getNodeIdsForPeer(PeerId peerId) const;

    bool startEventLoop(CScheduler &scheduler);
    bool stopEventLoop();

private:
    void runEventLoop();
    void clearTimedoutRequests();
    std::vector<CInv> getInvsForNextPoll(bool forPoll = true);
    NodeId getSuitableNodeToQuery();

    /**
     * Build and return the challenge whose signature is included in the
     * AVAHELLO message that we send to a peer.
     */
    uint256 buildLocalSighash(CNode *pfrom) const;

    friend struct ::avalanche::AvalancheTest;
};

} // namespace avalanche

/**
 * Global avalanche instance.
 */
extern std::unique_ptr<avalanche::Processor> g_avalanche;

#endif // BITCOIN_AVALANCHE_PROCESSOR_H
