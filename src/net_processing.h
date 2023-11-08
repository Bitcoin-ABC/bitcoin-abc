// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NET_PROCESSING_H
#define BITCOIN_NET_PROCESSING_H

#include <net.h>
#include <sync.h>
#include <validationinterface.h>

namespace avalanche {
struct ProofId;
}

class AddrMan;
class CTxMemPool;
class ChainstateManager;
class Config;

/**
 * Default for -maxorphantx, maximum number of orphan transactions kept in
 * memory.
 */
static const unsigned int DEFAULT_MAX_ORPHAN_TRANSACTIONS = 100;
/**
 * Default number of orphan+recently-replaced txn to keep around for block
 * reconstruction.
 */
static const unsigned int DEFAULT_BLOCK_RECONSTRUCTION_EXTRA_TXN = 100;
static const bool DEFAULT_PEERBLOCKFILTERS = false;
/** Threshold for marking a node to be discouraged, e.g. disconnected and added
 * to the discouragement filter. */
static const int DISCOURAGEMENT_THRESHOLD{100};

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
};

class PeerManager : public CValidationInterface, public NetEventsInterface {
public:
    static std::unique_ptr<PeerManager> make(CConnman &connman,
                                             AddrMan &addrman, BanMan *banman,
                                             ChainstateManager &chainman,
                                             CTxMemPool &pool,
                                             bool ignore_incoming_txs);
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

    /**
     * Increment peer's misbehavior score. If the new value >=
     * DISCOURAGEMENT_THRESHOLD, mark the node to be discouraged, meaning the
     * peer might be disconnected and added to the discouragement filter. Public
     * for unit testing.
     */
    virtual void Misbehaving(const NodeId pnode, const int howmuch,
                             const std::string &message) = 0;

    /**
     * Evict extra outbound peers. If we think our tip may be stale, connect to
     * an extra outbound.
     */
    virtual void CheckForStaleTipAndEvictPeers() = 0;

    /** Process a single message from a peer. Public for fuzz testing */
    virtual void ProcessMessage(const Config &config, CNode &pfrom,
                                const std::string &msg_type, CDataStream &vRecv,
                                const std::chrono::microseconds time_received,
                                const std::atomic<bool> &interruptMsgProc) = 0;
};

#endif // BITCOIN_NET_PROCESSING_H
