// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/processor.h>

#include <avalanche/avalanche.h>
#include <avalanche/delegationbuilder.h>
#include <avalanche/peermanager.h>
#include <avalanche/proofcomparator.h>
#include <avalanche/validation.h>
#include <avalanche/voterecord.h>
#include <chain.h>
#include <key_io.h> // For DecodeSecret
#include <net.h>
#include <netmessagemaker.h>
#include <reverse_iterator.h>
#include <scheduler.h>
#include <util/bitmanip.h>
#include <util/moneystr.h>
#include <util/translation.h>
#include <validation.h>

#include <chrono>
#include <tuple>

/**
 * Run the avalanche event loop every 10ms.
 */
static constexpr std::chrono::milliseconds AVALANCHE_TIME_STEP{10};

// Unfortunately, the bitcoind codebase is full of global and we are kinda
// forced into it here.
std::unique_ptr<avalanche::Processor> g_avalanche;

namespace avalanche {
static bool IsWorthPolling(const CBlockIndex *pindex)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    AssertLockHeld(cs_main);

    if (pindex->nStatus.isInvalid()) {
        // No point polling invalid blocks.
        return false;
    }

    if (::ChainstateActive().IsBlockFinalized(pindex)) {
        // There is no point polling finalized block.
        return false;
    }

    return true;
}

static bool VerifyProof(const Proof &proof, bilingual_str &error) {
    ProofValidationState proof_state;

    if (!proof.verify(proof_state)) {
        switch (proof_state.GetResult()) {
            case ProofValidationResult::NO_STAKE:
                error = _("The avalanche proof has no stake.");
                return false;
            case ProofValidationResult::DUST_THRESOLD:
                error = _("The avalanche proof stake is too low.");
                return false;
            case ProofValidationResult::DUPLICATE_STAKE:
                error = _("The avalanche proof has duplicated stake.");
                return false;
            case ProofValidationResult::INVALID_STAKE_SIGNATURE:
                error = _("The avalanche proof has invalid stake signatures.");
                return false;
            case ProofValidationResult::TOO_MANY_UTXOS:
                error = strprintf(
                    _("The avalanche proof has too many utxos (max: %u)."),
                    AVALANCHE_MAX_PROOF_STAKES);
                return false;
            default:
                error = _("The avalanche proof is invalid.");
                return false;
        }
    }

    return true;
}

static bool VerifyDelegation(const Delegation &dg,
                             const CPubKey &expectedPubKey,
                             bilingual_str &error) {
    DelegationState dg_state;

    CPubKey auth;
    if (!dg.verify(dg_state, auth)) {
        switch (dg_state.GetResult()) {
            case avalanche::DelegationResult::INVALID_SIGNATURE:
                error = _("The avalanche delegation has invalid signatures.");
                return false;
            case avalanche::DelegationResult::TOO_MANY_LEVELS:
                error = _(
                    "The avalanche delegation has too many delegation levels.");
                return false;
            default:
                error = _("The avalanche delegation is invalid.");
                return false;
        }
    }

    if (auth != expectedPubKey) {
        error = _(
            "The avalanche delegation does not match the expected public key.");
        return false;
    }

    return true;
}

struct Processor::PeerData {
    ProofRef proof;
    Delegation delegation;
};

class Processor::NotificationsHandler
    : public interfaces::Chain::Notifications {
    Processor *m_processor;

public:
    NotificationsHandler(Processor *p) : m_processor(p) {}

    void updatedBlockTip() override {
        LOCK(m_processor->cs_peerManager);

        if (m_processor->peerData && m_processor->peerData->proof) {
            m_processor->peerManager->registerProof(
                m_processor->peerData->proof);
        }

        m_processor->peerManager->updatedBlockTip();
    }
};

Processor::Processor(const ArgsManager &argsman, interfaces::Chain &chain,
                     CConnman *connmanIn, std::unique_ptr<PeerData> peerDataIn,
                     CKey sessionKeyIn, uint32_t minQuorumTotalScoreIn,
                     double minQuorumConnectedScoreRatioIn)
    : connman(connmanIn),
      queryTimeoutDuration(argsman.GetArg(
          "-avatimeout", AVALANCHE_DEFAULT_QUERY_TIMEOUT.count())),
      round(0), peerManager(std::make_unique<PeerManager>()),
      peerData(std::move(peerDataIn)), sessionKey(std::move(sessionKeyIn)),
      minQuorumScore(minQuorumTotalScoreIn),
      minQuorumConnectedScoreRatio(minQuorumConnectedScoreRatioIn) {
    // Make sure we get notified of chain state changes.
    chainNotificationsHandler =
        chain.handleNotifications(std::make_shared<NotificationsHandler>(this));
}

Processor::~Processor() {
    chainNotificationsHandler.reset();
    stopEventLoop();
}

std::unique_ptr<Processor> Processor::MakeProcessor(const ArgsManager &argsman,
                                                    interfaces::Chain &chain,
                                                    CConnman *connman,
                                                    bilingual_str &error) {
    std::unique_ptr<PeerData> peerData;
    CKey masterKey;
    CKey sessionKey;

    if (argsman.IsArgSet("-avasessionkey")) {
        sessionKey = DecodeSecret(argsman.GetArg("-avasessionkey", ""));
        if (!sessionKey.IsValid()) {
            error = _("The avalanche session key is invalid.");
            return nullptr;
        }
    } else {
        // Pick a random key for the session.
        sessionKey.MakeNewKey(true);
    }

    if (argsman.IsArgSet("-avaproof")) {
        if (!argsman.IsArgSet("-avamasterkey")) {
            error = _(
                "The avalanche master key is missing for the avalanche proof.");
            return nullptr;
        }

        masterKey = DecodeSecret(argsman.GetArg("-avamasterkey", ""));
        if (!masterKey.IsValid()) {
            error = _("The avalanche master key is invalid.");
            return nullptr;
        }

        auto proof = RCUPtr<Proof>::make();
        if (!Proof::FromHex(*proof, argsman.GetArg("-avaproof", ""), error)) {
            // error is set by FromHex
            return nullptr;
        }

        peerData = std::make_unique<PeerData>();
        peerData->proof = std::move(proof);
        if (!VerifyProof(*peerData->proof, error)) {
            // error is set by VerifyProof
            return nullptr;
        }

        std::unique_ptr<DelegationBuilder> dgb;
        const CPubKey &masterPubKey = masterKey.GetPubKey();

        if (argsman.IsArgSet("-avadelegation")) {
            Delegation dg;
            if (!Delegation::FromHex(dg, argsman.GetArg("-avadelegation", ""),
                                     error)) {
                // error is set by FromHex()
                return nullptr;
            }

            if (dg.getProofId() != peerData->proof->getId()) {
                error = _("The delegation does not match the proof.");
                return nullptr;
            }

            if (masterPubKey != dg.getDelegatedPubkey()) {
                error = _(
                    "The master key does not match the delegation public key.");
                return nullptr;
            }

            dgb = std::make_unique<DelegationBuilder>(dg);
        } else {
            if (masterPubKey != peerData->proof->getMaster()) {
                error =
                    _("The master key does not match the proof public key.");
                return nullptr;
            }

            dgb = std::make_unique<DelegationBuilder>(*peerData->proof);
        }

        // Generate the delegation to the session key.
        const CPubKey sessionPubKey = sessionKey.GetPubKey();
        if (sessionPubKey != masterPubKey) {
            if (!dgb->addLevel(masterKey, sessionPubKey)) {
                error = _("Failed to generate a delegation for this session.");
                return nullptr;
            }
        }
        peerData->delegation = dgb->build();

        if (!VerifyDelegation(peerData->delegation, sessionPubKey, error)) {
            // error is set by VerifyDelegation
            return nullptr;
        }
    }

    // Determine quorum parameters
    Amount minQuorumStake = AVALANCHE_DEFAULT_MIN_QUORUM_STAKE;
    if (gArgs.IsArgSet("-avaminquorumstake") &&
        !ParseMoney(gArgs.GetArg("-avaminquorumstake", ""), minQuorumStake)) {
        error = _("The avalanche min quorum stake amount is invalid.");
        return nullptr;
    }

    if (!MoneyRange(minQuorumStake)) {
        error = _("The avalanche min quorum stake amount is out of range.");
        return nullptr;
    }

    double minQuorumConnectedStakeRatio =
        AVALANCHE_DEFAULT_MIN_QUORUM_CONNECTED_STAKE_RATIO;
    if (gArgs.IsArgSet("-avaminquorumconnectedstakeratio") &&
        !ParseDouble(gArgs.GetArg("-avaminquorumconnectedstakeratio", ""),
                     &minQuorumConnectedStakeRatio)) {
        error = _("The avalanche min quorum connected stake ratio is invalid.");
        return nullptr;
    }

    if (minQuorumConnectedStakeRatio < 0 || minQuorumConnectedStakeRatio > 1) {
        error = _(
            "The avalanche min quorum connected stake ratio is out of range.");
        return nullptr;
    }

    // We can't use std::make_unique with a private constructor
    return std::unique_ptr<Processor>(new Processor(
        argsman, chain, connman, std::move(peerData), std::move(sessionKey),
        Proof::amountToScore(minQuorumStake), minQuorumConnectedStakeRatio));
}

bool Processor::addBlockToReconcile(const CBlockIndex *pindex) {
    bool isAccepted;

    if (!pindex) {
        // IsWorthPolling expects this to be non-null, so bail early.
        return false;
    }

    {
        LOCK(cs_main);
        if (!IsWorthPolling(pindex)) {
            // There is no point polling this block.
            return false;
        }

        isAccepted = ::ChainActive().Contains(pindex);
    }

    return blockVoteRecords.getWriteView()
        ->insert(std::make_pair(pindex, VoteRecord(isAccepted)))
        .second;
}

void Processor::addProofToReconcile(const ProofRef &proof) {
    // TODO We don't want to accept an infinite number of conflicting proofs.
    // They should be some rules to make them expensive and/or limited by
    // design.
    const bool isAccepted = WITH_LOCK(
        cs_peerManager, return peerManager->isBoundToPeer(proof->getId()));

    proofVoteRecords.getWriteView()->insert(
        std::make_pair(proof, VoteRecord(isAccepted)));
}

bool Processor::isAccepted(const CBlockIndex *pindex) const {
    if (!pindex) {
        // CBlockIndexWorkComparator expects this to be non-null, so bail early.
        return false;
    }

    auto r = blockVoteRecords.getReadView();
    auto it = r->find(pindex);
    if (it == r.end()) {
        return false;
    }

    return it->second.isAccepted();
}

bool Processor::isAccepted(const ProofRef &proof) const {
    auto r = proofVoteRecords.getReadView();
    auto it = r->find(proof);
    if (it == r.end()) {
        return false;
    }

    return it->second.isAccepted();
}

int Processor::getConfidence(const CBlockIndex *pindex) const {
    if (!pindex) {
        // CBlockIndexWorkComparator expects this to be non-null, so bail early.
        return -1;
    }

    auto r = blockVoteRecords.getReadView();
    auto it = r->find(pindex);
    if (it == r.end()) {
        return -1;
    }

    return it->second.getConfidence();
}

int Processor::getConfidence(const ProofRef &proof) const {
    auto r = proofVoteRecords.getReadView();
    auto it = r->find(proof);
    if (it == r.end()) {
        return -1;
    }

    return it->second.getConfidence();
}

namespace {
    /**
     * When using TCP, we need to sign all messages as the transport layer is
     * not secure.
     */
    class TCPResponse {
        Response response;
        SchnorrSig sig;

    public:
        TCPResponse(Response responseIn, const CKey &key)
            : response(std::move(responseIn)) {
            CHashWriter hasher(SER_GETHASH, 0);
            hasher << response;
            const uint256 hash = hasher.GetHash();

            // Now let's sign!
            if (!key.SignSchnorr(hash, sig)) {
                sig.fill(0);
            }
        }

        // serialization support
        SERIALIZE_METHODS(TCPResponse, obj) {
            READWRITE(obj.response, obj.sig);
        }
    };
} // namespace

void Processor::sendResponse(CNode *pfrom, Response response) const {
    connman->PushMessage(
        pfrom, CNetMsgMaker(pfrom->GetCommonVersion())
                   .Make(NetMsgType::AVARESPONSE,
                         TCPResponse(std::move(response), sessionKey)));
}

bool Processor::registerVotes(NodeId nodeid, const Response &response,
                              std::vector<BlockUpdate> &blockUpdates,
                              std::vector<ProofUpdate> &proofUpdates,
                              int &banscore, std::string &error) {
    {
        // Save the time at which we can query again.
        LOCK(cs_peerManager);

        // FIXME: This will override the time even when we received an old stale
        // message. This should check that the message is indeed the most up to
        // date one before updating the time.
        peerManager->updateNextRequestTime(
            nodeid, std::chrono::steady_clock::now() +
                        std::chrono::milliseconds(response.getCooldown()));
    }

    std::vector<CInv> invs;

    {
        // Check that the query exists.
        auto w = queries.getWriteView();
        auto it = w->find(std::make_tuple(nodeid, response.getRound()));
        if (it == w.end()) {
            banscore = 2;
            error = "unexpected-ava-response";
            return false;
        }

        invs = std::move(it->invs);
        w->erase(it);
    }

    // Verify that the request and the vote are consistent.
    const std::vector<Vote> &votes = response.GetVotes();
    size_t size = invs.size();
    if (votes.size() != size) {
        banscore = 100;
        error = "invalid-ava-response-size";
        return false;
    }

    for (size_t i = 0; i < size; i++) {
        if (invs[i].hash != votes[i].GetHash()) {
            banscore = 100;
            error = "invalid-ava-response-content";
            return false;
        }
    }

    std::map<CBlockIndex *, Vote> responseIndex;
    std::map<ProofRef, Vote, ProofRefComparatorByAddress> responseProof;

    // At this stage we are certain that invs[i] matches votes[i], so we can use
    // the inv type to retrieve what is being voted on.
    for (size_t i = 0; i < size; i++) {
        if (invs[i].IsMsgBlk()) {
            CBlockIndex *pindex;
            {
                LOCK(cs_main);
                pindex = g_chainman.m_blockman.LookupBlockIndex(
                    BlockHash(votes[i].GetHash()));
                if (!pindex) {
                    // This should not happen, but just in case...
                    continue;
                }

                if (!IsWorthPolling(pindex)) {
                    // There is no point polling this block.
                    continue;
                }
            }

            responseIndex.insert(std::make_pair(pindex, votes[i]));
        }

        if (invs[i].IsMsgProof()) {
            const ProofId proofid(votes[i].GetHash());

            const ProofRef proof = WITH_LOCK(
                cs_peerManager, return peerManager->getProof(proofid));
            if (!proof) {
                continue;
            }

            responseProof.insert(std::make_pair(proof, votes[i]));
        }
    }

    // Thanks to C++14 generic lambdas, we can apply the same logic to various
    // parameter types sharing the same interface.
    auto registerVoteItems = [&](auto voteRecordsWriteView, auto &updates,
                                 auto responseItems) {
        // Register votes.
        for (const auto &p : responseItems) {
            auto item = p.first;
            const Vote &v = p.second;

            auto it = voteRecordsWriteView->find(item);
            if (it == voteRecordsWriteView.end()) {
                // We are not voting on that item anymore.
                continue;
            }

            auto &vr = it->second;
            if (!vr.registerVote(nodeid, v.GetError())) {
                // This vote did not provide any extra information, move on.
                continue;
            }

            if (!vr.hasFinalized()) {
                // This item has note been finalized, so we have nothing more to
                // do.
                updates.emplace_back(item, vr.isAccepted()
                                               ? VoteStatus::Accepted
                                               : VoteStatus::Rejected);
                continue;
            }

            // We just finalized a vote. If it is valid, then let the caller
            // know. Either way, remove the item from the map.
            updates.emplace_back(item, vr.isAccepted() ? VoteStatus::Finalized
                                                       : VoteStatus::Invalid);
            voteRecordsWriteView->erase(it);
        }
    };

    registerVoteItems(blockVoteRecords.getWriteView(), blockUpdates,
                      responseIndex);
    registerVoteItems(proofVoteRecords.getWriteView(), proofUpdates,
                      responseProof);

    return true;
}

CPubKey Processor::getSessionPubKey() const {
    return sessionKey.GetPubKey();
}

uint256 Processor::buildLocalSighash(CNode *pfrom) const {
    CHashWriter hasher(SER_GETHASH, 0);
    hasher << peerData->delegation.getId();
    hasher << pfrom->GetLocalNonce();
    hasher << pfrom->nRemoteHostNonce;
    hasher << pfrom->GetLocalExtraEntropy();
    hasher << pfrom->nRemoteExtraEntropy;
    return hasher.GetHash();
}

bool Processor::sendHello(CNode *pfrom) const {
    if (!peerData) {
        // We do not have a delegation to advertise.
        return false;
    }

    // Now let's sign!
    SchnorrSig sig;

    {
        const uint256 hash = buildLocalSighash(pfrom);

        if (!sessionKey.SignSchnorr(hash, sig)) {
            return false;
        }
    }

    connman->PushMessage(pfrom, CNetMsgMaker(pfrom->GetCommonVersion())
                                    .Make(NetMsgType::AVAHELLO,
                                          Hello(peerData->delegation, sig)));

    pfrom->AddKnownProof(peerData->delegation.getProofId());

    return true;
}

ProofRef Processor::getLocalProof() const {
    return peerData ? peerData->proof : ProofRef();
}

bool Processor::startEventLoop(CScheduler &scheduler) {
    return eventLoop.startEventLoop(
        scheduler, [this]() { this->runEventLoop(); }, AVALANCHE_TIME_STEP);
}

bool Processor::stopEventLoop() {
    return eventLoop.stopEventLoop();
}

std::vector<CInv> Processor::getInvsForNextPoll(bool forPoll) {
    std::vector<CInv> invs;

    auto extractVoteRecordsToInvs = [&](const auto &itemVoteRecordRange,
                                        auto buildInvFromVoteItem) {
        for (const auto &[item, voteRecord] : itemVoteRecordRange) {
            if (invs.size() >= AVALANCHE_MAX_ELEMENT_POLL) {
                // Make sure we do not produce more invs than specified by the
                // protocol.
                return true;
            }

            const bool shouldPoll =
                forPoll ? voteRecord.registerPoll() : voteRecord.shouldPoll();

            if (!shouldPoll) {
                continue;
            }

            invs.emplace_back(buildInvFromVoteItem(item));
        }

        return invs.size() >= AVALANCHE_MAX_ELEMENT_POLL;
    };

    if (extractVoteRecordsToInvs(proofVoteRecords.getReadView(),
                                 [](const ProofRef &proof) {
                                     return CInv(MSG_AVA_PROOF, proof->getId());
                                 })) {
        // The inventory vector is full, we're done
        return invs;
    }

    // First remove all blocks that are not worth polling.
    {
        LOCK(cs_main);
        auto w = blockVoteRecords.getWriteView();
        for (auto it = w->begin(); it != w->end();) {
            const CBlockIndex *pindex = it->first;
            if (!IsWorthPolling(pindex)) {
                w->erase(it++);
            } else {
                ++it;
            }
        }
    }

    auto r = blockVoteRecords.getReadView();
    extractVoteRecordsToInvs(reverse_iterate(r), [](const CBlockIndex *pindex) {
        return CInv(MSG_BLOCK, pindex->GetBlockHash());
    });

    return invs;
}

NodeId Processor::getSuitableNodeToQuery() {
    LOCK(cs_peerManager);
    return peerManager->selectNode();
}

void Processor::clearTimedoutRequests() {
    auto now = std::chrono::steady_clock::now();
    std::map<CInv, uint8_t> timedout_items{};

    {
        // Clear expired requests.
        auto w = queries.getWriteView();
        auto it = w->get<query_timeout>().begin();
        while (it != w->get<query_timeout>().end() && it->timeout < now) {
            for (const auto &i : it->invs) {
                timedout_items[i]++;
            }

            w->get<query_timeout>().erase(it++);
        }
    }

    if (timedout_items.empty()) {
        return;
    }

    auto clearInflightRequest = [&](auto &voteRecords, const auto &voteItem,
                                    uint8_t count) {
        if (!voteItem) {
            return false;
        }

        auto voteRecordsWriteView = voteRecords.getWriteView();
        auto it = voteRecordsWriteView->find(voteItem);
        if (it == voteRecordsWriteView.end()) {
            return false;
        }

        it->second.clearInflightRequest(count);

        return true;
    };

    // In flight request accounting.
    for (const auto &p : timedout_items) {
        const CInv &inv = p.first;
        if (inv.IsMsgBlk()) {
            const CBlockIndex *pindex = WITH_LOCK(
                cs_main, return g_chainman.m_blockman.LookupBlockIndex(
                             BlockHash(inv.hash)));

            if (!clearInflightRequest(blockVoteRecords, pindex, p.second)) {
                continue;
            }
        }

        if (inv.IsMsgProof()) {
            const ProofRef proof =
                WITH_LOCK(cs_peerManager,
                          return peerManager->getProof(ProofId(inv.hash)));

            if (!clearInflightRequest(proofVoteRecords, proof, p.second)) {
                continue;
            }
        }
    }
}

void Processor::runEventLoop() {
    // Don't do Avalanche while node is IBD'ing
    if (::ChainstateActive().IsInitialBlockDownload()) {
        return;
    }

    // Don't poll if quorum hasn't been established yet
    if (!isQuorumEstablished()) {
        return;
    }

    // First things first, check if we have requests that timed out and clear
    // them.
    clearTimedoutRequests();

    // Make sure there is at least one suitable node to query before gathering
    // invs.
    NodeId nodeid = getSuitableNodeToQuery();
    if (nodeid == NO_NODE) {
        return;
    }
    std::vector<CInv> invs = getInvsForNextPoll();
    if (invs.empty()) {
        return;
    }

    do {
        /**
         * If we lost contact to that node, then we remove it from nodeids, but
         * never add the request to queries, which ensures bad nodes get cleaned
         * up over time.
         */
        bool hasSent = connman->ForNode(nodeid, [this, &invs](CNode *pnode) {
            uint64_t current_round = round++;

            {
                // Compute the time at which this requests times out.
                auto timeout =
                    std::chrono::steady_clock::now() + queryTimeoutDuration;
                // Register the query.
                queries.getWriteView()->insert(
                    {pnode->GetId(), current_round, timeout, invs});
                // Set the timeout.
                LOCK(cs_peerManager);
                peerManager->updateNextRequestTime(pnode->GetId(), timeout);
            }

            pnode->m_avalanche_state->invsPolled(invs.size());

            // Send the query to the node.
            connman->PushMessage(
                pnode, CNetMsgMaker(pnode->GetCommonVersion())
                           .Make(NetMsgType::AVAPOLL,
                                 Poll(current_round, std::move(invs))));
            return true;
        });

        // Success!
        if (hasSent) {
            return;
        }

        {
            // This node is obsolete, delete it.
            LOCK(cs_peerManager);
            peerManager->removeNode(nodeid);
        }

        // Get next suitable node to try again
        nodeid = getSuitableNodeToQuery();
    } while (nodeid != NO_NODE);
}

/*
 * Returns a bool indicating whether we have a usable Avalanche quorum enabling
 * us to take decisions based on polls.
 */
bool Processor::isQuorumEstablished() {
    if (quorumIsEstablished) {
        return true;
    }

    auto localProof = getLocalProof();

    // Get the registered proof score and registered score we have nodes for
    uint32_t totalPeersScore;
    uint32_t connectedPeersScore;
    {
        LOCK(cs_peerManager);
        totalPeersScore = peerManager->getTotalPeersScore();
        connectedPeersScore = peerManager->getConnectedPeersScore();

        // Consider that we are always connected to our proof, even if we are
        // the single node using that proof.
        if (localProof &&
            peerManager->forPeer(localProof->getId(), [](const Peer &peer) {
                return peer.node_count == 0;
            })) {
            connectedPeersScore += localProof->getScore();
        }
    }

    // Ensure enough is being staked overall
    if (totalPeersScore < minQuorumScore) {
        return false;
    }

    // Ensure we have connected score for enough of the overall score
    uint32_t minConnectedScore =
        std::round(double(totalPeersScore) * minQuorumConnectedScoreRatio);
    if (connectedPeersScore < minConnectedScore) {
        return false;
    }

    quorumIsEstablished = true;
    return true;
}

void Processor::FinalizeNode(const Config &config, const CNode &node,
                             bool &update_connection_time) {
    WITH_LOCK(cs_peerManager, peerManager->removeNode(node.GetId()));
}

} // namespace avalanche
