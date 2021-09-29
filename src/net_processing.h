// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NET_PROCESSING_H
#define BITCOIN_NET_PROCESSING_H

#include <consensus/params.h>
#include <invrequest.h>
#include <net.h>
#include <sync.h>
#include <validationinterface.h>

extern RecursiveMutex cs_main;
extern RecursiveMutex g_cs_orphans;

namespace avalanche {
struct ProofId;
}

class BlockTransactionsRequest;
class BlockValidationState;
class CBlockHeader;
class CTxMemPool;
class ChainstateManager;
class Config;
class TxValidationState;

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

class PeerManager final : public CValidationInterface,
                          public NetEventsInterface {
public:
    PeerManager(const CChainParams &chainparams, CConnman &connman,
                BanMan *banman, CScheduler &scheduler,
                ChainstateManager &chainman, CTxMemPool &pool);

    /**
     * Overridden from CValidationInterface.
     */
    void BlockConnected(const std::shared_ptr<const CBlock> &pblock,
                        const CBlockIndex *pindexConnected) override;
    void BlockDisconnected(const std::shared_ptr<const CBlock> &block,
                           const CBlockIndex *pindex) override;
    /**
     * Overridden from CValidationInterface.
     */
    void UpdatedBlockTip(const CBlockIndex *pindexNew,
                         const CBlockIndex *pindexFork,
                         bool fInitialDownload) override;
    /**
     * Overridden from CValidationInterface.
     */
    void BlockChecked(const CBlock &block,
                      const BlockValidationState &state) override;
    /**
     * Overridden from CValidationInterface.
     */
    void NewPoWValidBlock(const CBlockIndex *pindex,
                          const std::shared_ptr<const CBlock> &pblock) override;

    /**
     * Initialize a peer by adding it to mapNodeState and pushing a message
     * requesting its version.
     */
    void InitializeNode(const Config &config, CNode *pnode) override;
    /**
     * Handle removal of a peer by updating various state and removing it from
     * mapNodeState.
     */
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
                      std::atomic<bool> &interrupt) override
        EXCLUSIVE_LOCKS_REQUIRED(pto->cs_sendProcessing);

    /**
     * Consider evicting an outbound peer based on the amount of time they've
     * been behind our tip.
     */
    void ConsiderEviction(CNode &pto, int64_t time_in_seconds)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);
    /**
     * Evict extra outbound peers. If we think our tip may be stale, connect to
     * an extra outbound.
     */
    void CheckForStaleTipAndEvictPeers();
    /**
     * If we have extra outbound peers, try to disconnect the one with the
     * oldest block announcement.
     */
    void EvictExtraOutboundPeers(int64_t time_in_seconds)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

    /** Process a single message from a peer. Public for fuzz testing */
    void ProcessMessage(const Config &config, CNode &pfrom,
                        const std::string &msg_type, CDataStream &vRecv,
                        const std::chrono::microseconds time_received,
                        const std::atomic<bool> &interruptMsgProc);

    /**
     * Increment peer's misbehavior score. If the new value >=
     * DISCOURAGEMENT_THRESHOLD, mark the node to be discouraged, meaning the
     * peer might be disconnected and added to the discouragement filter. Public
     * for unit testing.
     */
    void Misbehaving(const NodeId pnode, const int howmuch,
                     const std::string &message);

    /**
     * Retrieve unbroadcast transactions from the mempool and reattempt
     * sending to peers
     */
    void ReattemptInitialBroadcast(CScheduler &scheduler) const;

    /**
     * Update the avalanche statistics for all the nodes
     */
    void UpdateAvalancheStatistics() const;

private:
    // overloaded variant of above to operate on CNode*s
    void Misbehaving(const CNode &node, int howmuch,
                     const std::string &message) {
        Misbehaving(node.GetId(), howmuch, message);
    }

    /**
     * Potentially mark a node discouraged based on the contents of a
     * BlockValidationState object
     *
     * @param[in] via_compact_block this bool is passed in because
     * net_processing should punish peers differently depending on whether the
     * data was provided in a compact block message or not. If the compact block
     * had a valid header, but contained invalid txs, the peer should not be
     * punished. See BIP 152.
     *
     * @return Returns true if the peer was punished (probably disconnected)
     */
    bool MaybePunishNodeForBlock(NodeId nodeid,
                                 const BlockValidationState &state,
                                 bool via_compact_block,
                                 const std::string &message = "");

    /**
     * Potentially disconnect and discourage a node based on the contents of a
     * TxValidationState object
     *
     * @return Returns true if the peer was punished (probably disconnected)
     */
    bool MaybePunishNodeForTx(NodeId nodeid, const TxValidationState &state,
                              const std::string &message = "");

    /**
     * Maybe disconnect a peer and discourage future connections from its
     * address.
     *
     * @param[in]   pnode     The node to check.
     * @return                True if the peer was marked for disconnection in
     * this function
     */
    bool MaybeDiscourageAndDisconnect(CNode &pnode);

    void ProcessOrphanTx(const Config &config, std::set<TxId> &orphan_work_set)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main, g_cs_orphans);
    /** Process a single headers message from a peer. */
    void ProcessHeadersMessage(const Config &config, CNode &pfrom,
                               const std::vector<CBlockHeader> &headers,
                               bool via_compact_block);

    void SendBlockTransactions(CNode &pfrom, const CBlock &block,
                               const BlockTransactionsRequest &req);

    /**
     * Register with InvRequestTracker that a TX INV has been received from a
     * peer. The announcement parameters are decided in PeerManager and then
     * passed to InvRequestTracker.
     */
    void AddTxAnnouncement(const CNode &node, const TxId &txid,
                           std::chrono::microseconds current_time)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main);

    /**
     * Register with InvRequestTracker that a PROOF INV has been received from a
     * peer. The announcement parameters are decided in PeerManager and then
     * passed to InvRequestTracker.
     */
    void
    AddProofAnnouncement(const CNode &node, const avalanche::ProofId &proofid,
                         std::chrono::microseconds current_time, bool preferred)
        EXCLUSIVE_LOCKS_REQUIRED(cs_proofrequest);

    const CChainParams &m_chainparams;
    CConnman &m_connman;
    /**
     * Pointer to this node's banman. May be nullptr - check existence before
     * dereferencing.
     */
    BanMan *const m_banman;
    ChainstateManager &m_chainman;
    CTxMemPool &m_mempool;
    InvRequestTracker<TxId> m_txrequest GUARDED_BY(::cs_main);

    Mutex cs_proofrequest;
    InvRequestTracker<avalanche::ProofId>
        m_proofrequest GUARDED_BY(cs_proofrequest);

    //! Next time to check for stale tip
    int64_t m_stale_tip_check_time;
};

struct CNodeStateStats {
    int m_misbehavior_score = 0;
    int nSyncHeight = -1;
    int nCommonHeight = -1;
    std::vector<int> vHeightInFlight;
};

/** Get statistics from node state */
bool GetNodeStateStats(NodeId nodeid, CNodeStateStats &stats);

/** Relay transaction to every node */
void RelayTransaction(const TxId &txid, const CConnman &connman);

/** Relay proof to every node */
void RelayProof(const avalanche::ProofId &proofid, const CConnman &connman);

#endif // BITCOIN_NET_PROCESSING_H
