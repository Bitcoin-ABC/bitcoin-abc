// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_AVALANCHE_PROCESSOR_H
#define BITCOIN_AVALANCHE_PROCESSOR_H

#include <avalanche/node.h>
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
struct VoteRecord;

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

    Processor(interfaces::Chain &chain, CConnman *connmanIn,
              std::unique_ptr<PeerData> peerDataIn, CKey sessionKeyIn);

public:
    ~Processor();

    static std::unique_ptr<Processor> MakeProcessor(const ArgsManager &argsman,
                                                    interfaces::Chain &chain,
                                                    CConnman *connman,
                                                    bilingual_str &error);

    void setQueryTimeoutDuration(std::chrono::milliseconds d) {
        queryTimeoutDuration = d;
    }

    bool addBlockToReconcile(const CBlockIndex *pindex);
    bool isAccepted(const CBlockIndex *pindex) const;
    int getConfidence(const CBlockIndex *pindex) const;

    // TODO: Refactor the API to remove the dependency on avalanche/protocol.h
    void sendResponse(CNode *pfrom, Response response) const;
    bool registerVotes(NodeId nodeid, const Response &response,
                       std::vector<BlockUpdate> &updates, int &banscore,
                       std::string &error);

    template <typename Callable> auto withPeerManager(Callable &&func) const {
        LOCK(cs_peerManager);
        return func(*peerManager);
    }

    CPubKey getSessionPubKey() const;
    bool sendHello(CNode *pfrom) const;

    std::shared_ptr<Proof> getLocalProof() const;

    /*
     * Return whether the avalanche service flag should be set.
     */
    bool isAvalancheServiceAvailable() { return !!peerData; }

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

#endif // BITCOIN_AVALANCHE_PROCESSOR_H
