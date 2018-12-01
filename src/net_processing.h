// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NET_PROCESSING_H
#define BITCOIN_NET_PROCESSING_H

#include "consensus/params.h"
#include "net.h"
#include "validationinterface.h"

class Config;

/**
 * Default for -maxorphantx, maximum number of orphan transactions kept in
 * memory.
 */
static const unsigned int DEFAULT_MAX_ORPHAN_TRANSACTIONS = 100;
/** Expiration time for orphan transactions in seconds */
static const int64_t ORPHAN_TX_EXPIRE_TIME = 20 * 60;
/** Minimum time between orphan transactions expire time checks in seconds */
static const int64_t ORPHAN_TX_EXPIRE_INTERVAL = 5 * 60;
/**
 * Default number of orphan+recently-replaced txn to keep around for block
 * reconstruction.
 */
static const unsigned int DEFAULT_BLOCK_RECONSTRUCTION_EXTRA_TXN = 100;
/**
 * Headers download timeout expressed in microseconds.
 * Timeout = base + per_header * (expected number of headers)
 */
// 15 minutes
static constexpr int64_t HEADERS_DOWNLOAD_TIMEOUT_BASE = 15 * 60 * 1000000;
// 1ms/header
static constexpr int64_t HEADERS_DOWNLOAD_TIMEOUT_PER_HEADER = 1000;
/**
 * Protect at least this many outbound peers from disconnection due to
 * slow/behind headers chain.
 */
static constexpr int32_t MAX_OUTBOUND_PEERS_TO_PROTECT_FROM_DISCONNECT = 4;
/**
 * Timeout for (unprotected) outbound peers to sync to our chainwork, in
 * seconds.
 */
// 20 minutes
static constexpr int64_t CHAIN_SYNC_TIMEOUT = 20 * 60;
/** How frequently to check for stale tips, in seconds */
// 10 minutes
static constexpr int64_t STALE_CHECK_INTERVAL = 10 * 60;
/**
 * How frequently to check for extra outbound peers and disconnect, in seconds.
 */
static constexpr int64_t EXTRA_PEER_CHECK_INTERVAL = 45;
/**
 * Minimum time an outbound-peer-eviction candidate must be connected for, in
 * order to evict, in seconds.
 */
static constexpr int64_t MINIMUM_CONNECT_TIME = 30;

class PeerLogicValidation final : public CValidationInterface,
                                  public NetEventsInterface {
private:
    CConnman *const connman;

public:
    explicit PeerLogicValidation(CConnman *connman, CScheduler &scheduler);

    void
    BlockConnected(const std::shared_ptr<const CBlock> &pblock,
                   const CBlockIndex *pindexConnected,
                   const std::vector<CTransactionRef> &vtxConflicted) override;
    void UpdatedBlockTip(const CBlockIndex *pindexNew,
                         const CBlockIndex *pindexFork,
                         bool fInitialDownload) override;
    void BlockChecked(const CBlock &block,
                      const CValidationState &state) override;
    void NewPoWValidBlock(const CBlockIndex *pindex,
                          const std::shared_ptr<const CBlock> &pblock) override;

    void InitializeNode(const Config &config, CNode *pnode) override;
    void FinalizeNode(const Config &config, NodeId nodeid,
                      bool &fUpdateConnectionTime) override;
    /**
     * Process protocol messages received from a given node.
     */
    bool ProcessMessages(const Config &config, CNode *pfrom,
                         std::atomic<bool> &interrupt) override;
    /**
     * Send queued protocol messages to be sent to a give node.
     *
     * @param[in]   pto             The node which we are sending messages to.
     * @param[in]   interrupt       Interrupt condition for processing threads
     * @return                      True if there is more work to be done
     */
    bool SendMessages(const Config &config, CNode *pto,
                      std::atomic<bool> &interrupt) override;

    void ConsiderEviction(CNode *pto, int64_t time_in_seconds);
    void
    CheckForStaleTipAndEvictPeers(const Consensus::Params &consensusParams);
    void EvictExtraOutboundPeers(int64_t time_in_seconds);

private:
    //! Next time to check for stale tip
    int64_t m_stale_tip_check_time;
};

struct CNodeStateStats {
    int nMisbehavior;
    int nSyncHeight;
    int nCommonHeight;
    std::vector<int> vHeightInFlight;
};

/** Get statistics from node state */
bool GetNodeStateStats(NodeId nodeid, CNodeStateStats &stats);
/** Increase a node's misbehavior score. */
void Misbehaving(NodeId nodeid, int howmuch, const std::string &reason);

#endif // BITCOIN_NET_PROCESSING_H
