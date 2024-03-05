// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NET_PROCESSING_H
#define BITCOIN_NET_PROCESSING_H

#include <avalanche/avalanche.h>
#include <net.h>
#include <sync.h>
#include <validationinterface.h>

namespace avalanche {
struct ProofId;
class Processor;
} // namespace avalanche

class AddrMan;
class CTxMemPool;
class ChainstateManager;
class Config;

/**
 * Default for -maxorphantx, maximum number of orphan transactions kept in
 * memory.
 */
static const uint32_t DEFAULT_MAX_ORPHAN_TRANSACTIONS{100};
/**
 * Maximum number of conflicting transactions kept in memory.
 */
static const uint32_t DEFAULT_MAX_CONFLICTING_TRANSACTIONS{100};
/**
 * Default number of non-mempool transactions to keep around for block
 * reconstruction. Includes orphan and rejected transactions.
 */
static const uint32_t DEFAULT_BLOCK_RECONSTRUCTION_EXTRA_TXN{100};
static const bool DEFAULT_PEERBLOCKFILTERS = false;
/** Maximum number of outstanding CMPCTBLOCK requests for the same block. */
static const unsigned int MAX_CMPCTBLOCKS_INFLIGHT_PER_BLOCK = 3;
/** The maximum number of address records permitted in an ADDR message. */
static constexpr size_t MAX_ADDR_TO_SEND{1000};

/**
 * Number of headers sent in one getheaders result. We rely on the assumption
 * that if a peer sends less than this number, we reached its tip. Changing
 * this value is a protocol upgrade.
 */
static const unsigned int MAX_HEADERS_RESULTS = 2000;

struct CNodeStateStats {
    int nSyncHeight = -1;
    int nCommonHeight = -1;
    int m_starting_height = -1;
    std::chrono::microseconds m_ping_wait;
    std::vector<int> vHeightInFlight;
    bool m_relay_txs;
    Amount m_fee_filter_received;
    uint64_t m_addr_processed = 0;
    uint64_t m_addr_rate_limited = 0;
    bool m_addr_relay_enabled{false};
    ServiceFlags their_services;
    int64_t presync_height{-1};
};

class PeerManager : public CValidationInterface, public NetEventsInterface {
public:
    struct Options {
        //! Whether this node is running in -blocksonly mode
        bool ignore_incoming_txs{DEFAULT_BLOCKSONLY};
        //! Maximum number of orphan transactions kept in memory
        uint32_t max_orphan_txs{DEFAULT_MAX_ORPHAN_TRANSACTIONS};
        //! Maximum number of conflicting transactions kept in memory
        uint32_t max_conflicting_txs{DEFAULT_MAX_CONFLICTING_TRANSACTIONS};
        //! Number of non-mempool transactions to keep around for block
        //! reconstruction. Includes orphan and rejected transactions.
        uint32_t max_extra_txs{DEFAULT_BLOCK_RECONSTRUCTION_EXTRA_TXN};
        //! Whether all P2P messages are captured to disk
        bool capture_messages{false};
        //! Number of addresses a node may send in an ADDR message.
        //! This can be modified for tests only. Changing it on main net may
        //! cause disconnections.
        size_t max_addr_to_send{MAX_ADDR_TO_SEND};

        //! Minimum time between two AVAPOLL messages.
        int64_t avalanche_cooldown{AVALANCHE_DEFAULT_COOLDOWN};
        //! Minimum time before we will consider replacing a finalized proof
        //! with a conflicting one.
        int64_t avalanche_peer_replacement_cooldown{
            AVALANCHE_DEFAULT_PEER_REPLACEMENT_COOLDOWN};
        //! Whether this node has enabled avalanche preconsensus.
        bool avalanche_preconsensus{DEFAULT_AVALANCHE_PRECONSENSUS};
        //! Whether this node has enabled avalanche staking rewards
        //! preconsensus.
        bool avalanche_staking_preconsensus{
            DEFAULT_AVALANCHE_STAKING_PRECONSENSUS};

        //! Whether or not the internal RNG behaves deterministically (this is
        //! a test-only option).
        bool deterministic_rng{false};
    };

    static std::unique_ptr<PeerManager>
    make(CConnman &connman, AddrMan &addrman, BanMan *banman,
         ChainstateManager &chainman, CTxMemPool &pool,
         avalanche::Processor *const avalanche, Options opts);
    virtual ~PeerManager() {}

    /**
     * Attempt to manually fetch block from a given peer. We must already have
     * the header.
     *
     * @param[in]  config       The global config
     * @param[in]  peer_id      The peer id
     * @param[in]  block_index  The block index
     * @returns std::nullopt if a request was successfully made, otherwise an
     *     error message
     */
    virtual std::optional<std::string>
    FetchBlock(const Config &config, NodeId peer_id,
               const CBlockIndex &block_index) = 0;

    /** Begin running background tasks, should only be called once */
    virtual void StartScheduledTasks(CScheduler &scheduler) = 0;

    /** Get statistics from node state */
    virtual bool GetNodeStateStats(NodeId nodeid,
                                   CNodeStateStats &stats) const = 0;

    /** Whether this node ignores txs received over p2p. */
    virtual bool IgnoresIncomingTxs() = 0;

    /** Relay transaction to all peers. */
    virtual void RelayTransaction(const TxId &txid) = 0;

    /** Relay proof to all peers */
    virtual void RelayProof(const avalanche::ProofId &proofid) = 0;

    /** Send ping message to all peers */
    virtual void SendPings() = 0;

    /** Set the best height */
    virtual void SetBestHeight(int height) = 0;

    /** Public for unit testing. */
    virtual void UnitTestMisbehaving(const NodeId peer_id) = 0;

    /**
     * Evict extra outbound peers. If we think our tip may be stale, connect to
     * an extra outbound.
     */
    virtual void CheckForStaleTipAndEvictPeers() = 0;

    /** Process a single message from a peer. Public for fuzz testing */
    virtual void ProcessMessage(const Config &config, CNode &pfrom,
                                const std::string &msg_type, CDataStream &vRecv,
                                const std::chrono::microseconds time_received,
                                const std::atomic<bool> &interruptMsgProc)
        EXCLUSIVE_LOCKS_REQUIRED(g_msgproc_mutex) = 0;

    /**
     * This function is used for testing the stale tip eviction logic, see
     * denialofservice_tests.cpp
     */
    virtual void UpdateLastBlockAnnounceTime(NodeId node,
                                             int64_t time_in_seconds) = 0;
};

#endif // BITCOIN_NET_PROCESSING_H
