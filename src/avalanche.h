// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_H
#define BITCOIN_AVALANCHE_H

#include "blockindexworkcomparator.h"
#include "net.h"
#include "protocol.h" // for CInv
#include "rwcollection.h"
#include "serialize.h"
#include "uint256.h"

#include <boost/multi_index/composite_key.hpp>
#include <boost/multi_index/hashed_index.hpp>
#include <boost/multi_index/member.hpp>
#include <boost/multi_index/ordered_index.hpp>
#include <boost/multi_index_container.hpp>

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdint>
#include <vector>

class Config;
class CBlockIndex;
class CScheduler;

namespace {
/**
 * Finalization score.
 */
static const int AVALANCHE_FINALIZATION_SCORE = 128;

/**
 * How long before we consider that a query timed out.
 */
static const int AVALANCHE_DEFAULT_QUERY_TIMEOUT_DURATION_MILLISECONDS = 10000;

/**
 * How many inflight requests can exist for one item.
 */
static const int AVALANCHE_MAX_INFLIGHT_POLL = 10;

/**
 * Special NodeId that represent no node.
 */
static const NodeId NO_NODE = -1;
}

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
    VoteRecord(bool accepted) : confidence(accepted) {}

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

class AvalancheVote {
    uint32_t error;
    uint256 hash;

public:
    AvalancheVote() : error(-1), hash() {}
    AvalancheVote(uint32_t errorIn, uint256 hashIn)
        : error(errorIn), hash(hashIn) {}

    const uint256 &GetHash() const { return hash; }
    uint32_t GetError() const { return error; }

    // serialization support
    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(error);
        READWRITE(hash);
    }
};

class AvalancheResponse {
    uint64_t round;
    uint32_t cooldown;
    std::vector<AvalancheVote> votes;

public:
    AvalancheResponse(uint64_t roundIn, uint32_t cooldownIn,
                      std::vector<AvalancheVote> votesIn)
        : round(roundIn), cooldown(cooldownIn), votes(votesIn) {}

    uint64_t getRound() const { return round; }
    uint32_t getCooldown() const { return cooldown; }
    const std::vector<AvalancheVote> &GetVotes() const { return votes; }

    // serialization support
    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(round);
        READWRITE(cooldown);
        READWRITE(votes);
    }
};

class AvalanchePoll {
    uint64_t round;
    std::vector<CInv> invs;

public:
    AvalanchePoll(uint64_t roundIn, std::vector<CInv> invsIn)
        : round(roundIn), invs(invsIn) {}

    const std::vector<CInv> &GetInvs() const { return invs; }

    // serialization support
    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(round);
        READWRITE(invs);
    }
};

class AvalancheBlockUpdate {
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

    AvalancheBlockUpdate(CBlockIndex *pindexIn, Status statusIn)
        : pindex(pindexIn) {
        raw |= statusIn;
    }

    Status getStatus() const { return Status(raw & MASK); }

    CBlockIndex *getBlockIndex() {
        return reinterpret_cast<CBlockIndex *>(raw & ~MASK);
    }

    const CBlockIndex *getBlockIndex() const {
        return const_cast<AvalancheBlockUpdate *>(this)->getBlockIndex();
    }
};

typedef std::map<const CBlockIndex *, VoteRecord, CBlockIndexWorkComparator>
    BlockVoteMap;

struct next_request_time {};
struct query_timeout {};

class AvalancheProcessor {
private:
    CConnman *connman;
    std::chrono::milliseconds queryTimeoutDuration;

    /**
     * Blocks to run avalanche on.
     */
    RWCollection<BlockVoteMap> vote_records;

    /**
     * Keep track of peers and queries sent.
     */
    std::atomic<uint64_t> round;

    typedef std::chrono::time_point<std::chrono::steady_clock> TimePoint;

    struct Peer {
        NodeId nodeid;
        int64_t score;

        TimePoint nextRequestTime;
    };

    typedef boost::multi_index_container<
        Peer, boost::multi_index::indexed_by<
                  // index by nodeid
                  boost::multi_index::hashed_unique<
                      boost::multi_index::member<Peer, NodeId, &Peer::nodeid>>,
                  // sorted by nextRequestTime
                  boost::multi_index::ordered_non_unique<
                      boost::multi_index::tag<next_request_time>,
                      boost::multi_index::member<Peer, TimePoint,
                                                 &Peer::nextRequestTime>>>>
        PeerSet;

    RWCollection<PeerSet> peerSet;

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

    typedef boost::multi_index_container<
        Query,
        boost::multi_index::indexed_by<
            // index by nodeid/round
            boost::multi_index::ordered_unique<
                boost::multi_index::composite_key<
                    Query,
                    boost::multi_index::member<Query, NodeId, &Query::nodeid>,
                    boost::multi_index::member<Query, uint64_t,
                                               &Query::round>>>,
            // sorted by timeout
            boost::multi_index::ordered_non_unique<
                boost::multi_index::tag<query_timeout>,
                boost::multi_index::member<Query, TimePoint, &Query::timeout>>>>
        QuerySet;

    RWCollection<QuerySet> queries;

    /**
     * Start stop machinery.
     */
    std::atomic<bool> stopRequest;
    bool running GUARDED_BY(cs_running);

    CWaitableCriticalSection cs_running;
    std::condition_variable cond_running;

public:
    AvalancheProcessor(CConnman *connmanIn)
        : connman(connmanIn),
          queryTimeoutDuration(
              AVALANCHE_DEFAULT_QUERY_TIMEOUT_DURATION_MILLISECONDS),
          round(0), stopRequest(false), running(false) {}
    ~AvalancheProcessor() { stopEventLoop(); }

    void setQueryTimeoutDuration(std::chrono::milliseconds d) {
        queryTimeoutDuration = d;
    }

    bool addBlockToReconcile(const CBlockIndex *pindex);
    bool isAccepted(const CBlockIndex *pindex) const;
    int getConfidence(const CBlockIndex *pindex) const;

    bool registerVotes(NodeId nodeid, const AvalancheResponse &response,
                       std::vector<AvalancheBlockUpdate> &updates);

    bool addPeer(NodeId nodeid, int64_t score);

    bool startEventLoop(CScheduler &scheduler);
    bool stopEventLoop();

private:
    void runEventLoop();
    void clearTimedoutRequests();
    std::vector<CInv> getInvsForNextPoll(bool forPoll = true) const;
    NodeId getSuitableNodeToQuery();

    friend struct AvalancheTest;
};

#endif // BITCOIN_AVALANCHE_H
