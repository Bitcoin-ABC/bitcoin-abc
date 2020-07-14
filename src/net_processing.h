// Copyright (c) 2009-2010 Satoshi Nakamoto
// Copyright (c) 2009-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_NET_PROCESSING_H
#define BITCOIN_NET_PROCESSING_H

#include <consensus/params.h>
#include <net.h>
#include <sync.h>
#include <validationinterface.h>

extern RecursiveMutex cs_main;
extern RecursiveMutex g_cs_orphans;

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

class PeerLogicValidation final : public CValidationInterface,
                                  public NetEventsInterface {
private:
    CConnman *const connman;
    BanMan *const m_banman;
    ChainstateManager &m_chainman;
    CTxMemPool &m_mempool;

    bool CheckIfBanned(CNode &pnode) EXCLUSIVE_LOCKS_REQUIRED(cs_main);

public:
    PeerLogicValidation(CConnman *connman, BanMan *banman,
                        CScheduler &scheduler, ChainstateManager &chainman,
                        CTxMemPool &pool);

    /**
     * Overridden from CValidationInterface.
     */
    void
    BlockConnected(const std::shared_ptr<const CBlock> &pblock,
                   const CBlockIndex *pindexConnected,
                   const std::vector<CTransactionRef> &vtxConflicted) override;
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
    void
    CheckForStaleTipAndEvictPeers(const Consensus::Params &consensusParams);
    /**
     * If we have extra outbound peers, try to disconnect the one with the
     * oldest block announcement.
     */
    void EvictExtraOutboundPeers(int64_t time_in_seconds)
        EXCLUSIVE_LOCKS_REQUIRED(cs_main);

private:
    //! Next time to check for stale tip
    int64_t m_stale_tip_check_time;
};

struct CNodeStateStats {
    int nMisbehavior = 0;
    int nSyncHeight = -1;
    int nCommonHeight = -1;
    std::vector<int> vHeightInFlight;
};

/** Get statistics from node state */
bool GetNodeStateStats(NodeId nodeid, CNodeStateStats &stats);
/**
 * Increment peer's misbehavior score. If the new value >=
 * DISCOURAGEMENT_THRESHOLD, mark the node to be discouraged, meaning the peer
 * might be disconnected and added to the discouragement filter.
 */
void Misbehaving(NodeId nodeid, int howmuch, const std::string &message = "")
    EXCLUSIVE_LOCKS_REQUIRED(cs_main);

/** Relay transaction to every node */
void RelayTransaction(const TxId &txid, const CConnman &connman);

bool ProcessMessage(const Config &config, CNode &pfrom,
                    const std::string &msg_type, CDataStream &vRecv,
                    int64_t nTimeReceived, CTxMemPool &mempool,
                    ChainstateManager &chainman, CConnman &connman,
                    BanMan *banman, const std::atomic<bool> &interruptMsgProc);

#endif // BITCOIN_NET_PROCESSING_H
