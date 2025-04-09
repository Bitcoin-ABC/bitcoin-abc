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
#include <common/args.h>
#include <key_io.h> // For DecodeSecret
#include <net.h>
#include <netbase.h>
#include <netmessagemaker.h>
#include <policy/block/stakingrewards.h>
#include <scheduler.h>
#include <util/bitmanip.h>
#include <util/moneystr.h>
#include <util/time.h>
#include <util/translation.h>
#include <validation.h>

#include <chrono>
#include <limits>
#include <tuple>

/**
 * Run the avalanche event loop every 10ms.
 */
static constexpr std::chrono::milliseconds AVALANCHE_TIME_STEP{10};

static const std::string AVAPEERS_FILE_NAME{"avapeers.dat"};

namespace avalanche {
static const uint256 GetVoteItemId(const AnyVoteItem &item) {
    return std::visit(variant::overloaded{
                          [](const ProofRef &proof) {
                              uint256 id = proof->getId();
                              return id;
                          },
                          [](const CBlockIndex *pindex) {
                              uint256 hash = pindex->GetBlockHash();
                              return hash;
                          },
                          [](const StakeContenderId &contenderId) {
                              return uint256(contenderId);
                          },
                          [](const CTransactionRef &tx) {
                              uint256 id = tx->GetId();
                              return id;
                          },
                      },
                      item);
}

static bool VerifyProof(const Amount &stakeUtxoDustThreshold,
                        const Proof &proof, bilingual_str &error) {
    ProofValidationState proof_state;

    if (!proof.verify(stakeUtxoDustThreshold, proof_state)) {
        switch (proof_state.GetResult()) {
            case ProofValidationResult::NO_STAKE:
                error = _("The avalanche proof has no stake.");
                return false;
            case ProofValidationResult::DUST_THRESHOLD:
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

    mutable Mutex cs_proofState;
    ProofRegistrationState proofState GUARDED_BY(cs_proofState);
};

class Processor::NotificationsHandler
    : public interfaces::Chain::Notifications {
    Processor *m_processor;

public:
    NotificationsHandler(Processor *p) : m_processor(p) {}

    void updatedBlockTip() override { m_processor->updatedBlockTip(); }

    void transactionAddedToMempool(const CTransactionRef &tx,
                                   uint64_t mempool_sequence) override {
        m_processor->transactionAddedToMempool(tx);
    }
};

Processor::Processor(Config avaconfigIn, interfaces::Chain &chain,
                     CConnman *connmanIn, ChainstateManager &chainmanIn,
                     CTxMemPool *mempoolIn, CScheduler &scheduler,
                     std::unique_ptr<PeerData> peerDataIn, CKey sessionKeyIn,
                     uint32_t minQuorumTotalScoreIn,
                     double minQuorumConnectedScoreRatioIn,
                     int64_t minAvaproofsNodeCountIn,
                     uint32_t staleVoteThresholdIn, uint32_t staleVoteFactorIn,
                     Amount stakeUtxoDustThreshold, bool preConsensus,
                     bool stakingPreConsensus)
    : avaconfig(std::move(avaconfigIn)), connman(connmanIn),
      chainman(chainmanIn), mempool(mempoolIn), round(0),
      peerManager(std::make_unique<PeerManager>(
          stakeUtxoDustThreshold, chainman, stakingPreConsensus,
          peerDataIn ? peerDataIn->proof : ProofRef())),
      peerData(std::move(peerDataIn)), sessionKey(std::move(sessionKeyIn)),
      minQuorumScore(minQuorumTotalScoreIn),
      minQuorumConnectedScoreRatio(minQuorumConnectedScoreRatioIn),
      minAvaproofsNodeCount(minAvaproofsNodeCountIn),
      staleVoteThreshold(staleVoteThresholdIn),
      staleVoteFactor(staleVoteFactorIn), m_preConsensus(preConsensus),
      m_stakingPreConsensus(stakingPreConsensus) {
    // Make sure we get notified of chain state changes.
    chainNotificationsHandler =
        chain.handleNotifications(std::make_shared<NotificationsHandler>(this));

    scheduler.scheduleEvery(
        [this]() -> bool {
            std::unordered_set<ProofRef, SaltedProofHasher> registeredProofs;
            WITH_LOCK(cs_peerManager,
                      peerManager->cleanupDanglingProofs(registeredProofs));
            for (const auto &proof : registeredProofs) {
                LogPrint(BCLog::AVALANCHE,
                         "Promoting previously dangling proof %s\n",
                         proof->getId().ToString());
                reconcileOrFinalize(proof);
            }
            return true;
        },
        5min);

    if (!gArgs.GetBoolArg("-persistavapeers", DEFAULT_PERSIST_AVAPEERS)) {
        return;
    }

    std::unordered_set<ProofRef, SaltedProofHasher> registeredProofs;

    // Attempt to load the peer file if it exists.
    const fs::path dumpPath = gArgs.GetDataDirNet() / AVAPEERS_FILE_NAME;
    WITH_LOCK(cs_peerManager, return peerManager->loadPeersFromFile(
                                  dumpPath, registeredProofs));

    // We just loaded the previous finalization status, but make sure to trigger
    // another round of vote for these proofs to avoid issue if the network
    // status changed since the peers file was dumped.
    for (const auto &proof : registeredProofs) {
        addToReconcile(proof);
    }

    LogPrint(BCLog::AVALANCHE, "Loaded %d peers from the %s file\n",
             registeredProofs.size(), PathToString(dumpPath));
}

Processor::~Processor() {
    chainNotificationsHandler.reset();
    stopEventLoop();

    if (!gArgs.GetBoolArg("-persistavapeers", DEFAULT_PERSIST_AVAPEERS)) {
        return;
    }

    LOCK(cs_peerManager);
    // Discard the status output: if it fails we want to continue normally.
    peerManager->dumpPeersToFile(gArgs.GetDataDirNet() / AVAPEERS_FILE_NAME);
}

std::unique_ptr<Processor>
Processor::MakeProcessor(const ArgsManager &argsman, interfaces::Chain &chain,
                         CConnman *connman, ChainstateManager &chainman,
                         CTxMemPool *mempool, CScheduler &scheduler,
                         bilingual_str &error) {
    std::unique_ptr<PeerData> peerData;
    CKey masterKey;
    CKey sessionKey;

    Amount stakeUtxoDustThreshold = PROOF_DUST_THRESHOLD;
    if (argsman.IsArgSet("-avaproofstakeutxodustthreshold") &&
        !ParseMoney(argsman.GetArg("-avaproofstakeutxodustthreshold", ""),
                    stakeUtxoDustThreshold)) {
        error = _("The avalanche stake utxo dust threshold amount is invalid.");
        return nullptr;
    }

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
        peerData->proof = proof;
        if (!VerifyProof(stakeUtxoDustThreshold, *peerData->proof, error)) {
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

    const auto queryTimeoutDuration =
        std::chrono::milliseconds(argsman.GetIntArg(
            "-avatimeout", AVALANCHE_DEFAULT_QUERY_TIMEOUT.count()));

    // Determine quorum parameters
    Amount minQuorumStake = AVALANCHE_DEFAULT_MIN_QUORUM_STAKE;
    if (argsman.IsArgSet("-avaminquorumstake") &&
        !ParseMoney(argsman.GetArg("-avaminquorumstake", ""), minQuorumStake)) {
        error = _("The avalanche min quorum stake amount is invalid.");
        return nullptr;
    }

    if (!MoneyRange(minQuorumStake)) {
        error = _("The avalanche min quorum stake amount is out of range.");
        return nullptr;
    }

    double minQuorumConnectedStakeRatio =
        AVALANCHE_DEFAULT_MIN_QUORUM_CONNECTED_STAKE_RATIO;
    if (argsman.IsArgSet("-avaminquorumconnectedstakeratio")) {
        // Parse the parameter with a precision of 0.000001.
        int64_t megaMinRatio;
        if (!ParseFixedPoint(
                argsman.GetArg("-avaminquorumconnectedstakeratio", ""), 6,
                &megaMinRatio)) {
            error =
                _("The avalanche min quorum connected stake ratio is invalid.");
            return nullptr;
        }
        minQuorumConnectedStakeRatio = double(megaMinRatio) / 1000000;
    }

    if (minQuorumConnectedStakeRatio < 0 || minQuorumConnectedStakeRatio > 1) {
        error = _(
            "The avalanche min quorum connected stake ratio is out of range.");
        return nullptr;
    }

    int64_t minAvaproofsNodeCount =
        argsman.GetIntArg("-avaminavaproofsnodecount",
                          AVALANCHE_DEFAULT_MIN_AVAPROOFS_NODE_COUNT);
    if (minAvaproofsNodeCount < 0) {
        error = _("The minimum number of node that sent avaproofs message "
                  "should be non-negative");
        return nullptr;
    }

    // Determine voting parameters
    int64_t staleVoteThreshold = argsman.GetIntArg(
        "-avastalevotethreshold", AVALANCHE_VOTE_STALE_THRESHOLD);
    if (staleVoteThreshold < AVALANCHE_VOTE_STALE_MIN_THRESHOLD) {
        error = strprintf(_("The avalanche stale vote threshold must be "
                            "greater than or equal to %d"),
                          AVALANCHE_VOTE_STALE_MIN_THRESHOLD);
        return nullptr;
    }
    if (staleVoteThreshold > std::numeric_limits<uint32_t>::max()) {
        error = strprintf(_("The avalanche stale vote threshold must be less "
                            "than or equal to %d"),
                          std::numeric_limits<uint32_t>::max());
        return nullptr;
    }

    int64_t staleVoteFactor =
        argsman.GetIntArg("-avastalevotefactor", AVALANCHE_VOTE_STALE_FACTOR);
    if (staleVoteFactor <= 0) {
        error = _("The avalanche stale vote factor must be greater than 0");
        return nullptr;
    }
    if (staleVoteFactor > std::numeric_limits<uint32_t>::max()) {
        error = strprintf(_("The avalanche stale vote factor must be less than "
                            "or equal to %d"),
                          std::numeric_limits<uint32_t>::max());
        return nullptr;
    }

    Config avaconfig(queryTimeoutDuration);

    // We can't use std::make_unique with a private constructor
    return std::unique_ptr<Processor>(new Processor(
        std::move(avaconfig), chain, connman, chainman, mempool, scheduler,
        std::move(peerData), std::move(sessionKey),
        Proof::amountToScore(minQuorumStake), minQuorumConnectedStakeRatio,
        minAvaproofsNodeCount, staleVoteThreshold, staleVoteFactor,
        stakeUtxoDustThreshold,
        argsman.GetBoolArg("-avalanchepreconsensus",
                           DEFAULT_AVALANCHE_PRECONSENSUS),
        argsman.GetBoolArg("-avalanchestakingpreconsensus",
                           DEFAULT_AVALANCHE_STAKING_PRECONSENSUS)));
}

static bool isNull(const AnyVoteItem &item) {
    return item.valueless_by_exception() ||
           std::visit(variant::overloaded{
                          [](const StakeContenderId &contenderId) {
                              return contenderId == uint256::ZERO;
                          },
                          [](const auto &item) { return item == nullptr; },
                      },
                      item);
};

bool Processor::addToReconcile(const AnyVoteItem &item) {
    if (isNull(item)) {
        return false;
    }

    if (!isWorthPolling(item)) {
        return false;
    }

    // getLocalAcceptance() takes the voteRecords read lock, so we can't inline
    // the calls or we get a deadlock.
    const bool accepted = getLocalAcceptance(item);

    return voteRecords.getWriteView()
        ->insert(std::make_pair(item, VoteRecord(accepted)))
        .second;
}

bool Processor::reconcileOrFinalize(const ProofRef &proof) {
    if (!proof) {
        return false;
    }

    if (isRecentlyFinalized(proof->getId())) {
        PeerId peerid;
        LOCK(cs_peerManager);
        if (peerManager->forPeer(proof->getId(), [&](const Peer &peer) {
                peerid = peer.peerid;
                return true;
            })) {
            return peerManager->setFinalized(peerid);
        }
    }

    return addToReconcile(proof);
}

bool Processor::isAccepted(const AnyVoteItem &item) const {
    if (isNull(item)) {
        return false;
    }

    auto r = voteRecords.getReadView();
    auto it = r->find(item);
    if (it == r.end()) {
        return false;
    }

    return it->second.isAccepted();
}

int Processor::getConfidence(const AnyVoteItem &item) const {
    if (isNull(item)) {
        return -1;
    }

    auto r = voteRecords.getReadView();
    auto it = r->find(item);
    if (it == r.end()) {
        return -1;
    }

    return it->second.getConfidence();
}

bool Processor::isRecentlyFinalized(const uint256 &itemId) const {
    return WITH_LOCK(cs_finalizedItems, return finalizedItems.contains(itemId));
}

void Processor::setRecentlyFinalized(const uint256 &itemId) {
    WITH_LOCK(cs_finalizedItems, finalizedItems.insert(itemId));
}

void Processor::clearFinalizedItems() {
    LOCK(cs_finalizedItems);
    finalizedItems.reset();
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
            HashWriter hasher{};
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
                              std::vector<VoteItemUpdate> &updates,
                              int &banscore, std::string &error) {
    updates.clear();
    {
        // Save the time at which we can query again.
        LOCK(cs_peerManager);

        // FIXME: This will override the time even when we received an old stale
        // message. This should check that the message is indeed the most up to
        // date one before updating the time.
        peerManager->updateNextRequestTime(
            nodeid, Now<SteadyMilliseconds>() +
                        std::chrono::milliseconds(response.getCooldown()));
    }

    std::vector<CInv> invs;

    {
        // Check that the query exists. There is a possibility that it has been
        // deleted if the query timed out, so we don't increase the ban score to
        // slowly banning nodes for poor networking over time. Banning has to be
        // handled at callsite to avoid DoS.
        auto w = queries.getWriteView();
        auto it = w->find(std::make_tuple(nodeid, response.getRound()));
        if (it == w.end()) {
            banscore = 0;
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

    std::map<AnyVoteItem, Vote, VoteMapComparator> responseItems;

    // At this stage we are certain that invs[i] matches votes[i], so we can use
    // the inv type to retrieve what is being voted on.
    for (size_t i = 0; i < size; i++) {
        auto item = getVoteItemFromInv(invs[i]);

        if (isNull(item)) {
            // This should not happen, but just in case...
            continue;
        }

        if (!isWorthPolling(item)) {
            // There is no point polling this item.
            continue;
        }

        responseItems.insert(std::make_pair(std::move(item), votes[i]));
    }

    auto voteRecordsWriteView = voteRecords.getWriteView();

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
            if (vr.isStale(staleVoteThreshold, staleVoteFactor)) {
                updates.emplace_back(std::move(item), VoteStatus::Stale);

                // Just drop stale votes. If we see this item again, we'll
                // do a new vote.
                voteRecordsWriteView->erase(it);
            }
            // This vote did not provide any extra information, move on.
            continue;
        }

        if (!vr.hasFinalized()) {
            // This item has not been finalized, so we have nothing more to
            // do.
            updates.emplace_back(std::move(item), vr.isAccepted()
                                                      ? VoteStatus::Accepted
                                                      : VoteStatus::Rejected);
            continue;
        }

        // We just finalized a vote. If it is valid, then let the caller
        // know. Either way, remove the item from the map.
        updates.emplace_back(std::move(item), vr.isAccepted()
                                                  ? VoteStatus::Finalized
                                                  : VoteStatus::Invalid);
        voteRecordsWriteView->erase(it);
    }

    // FIXME This doesn't belong here as it has nothing to do with vote
    // registration.
    for (const auto &update : updates) {
        if (update.getStatus() != VoteStatus::Finalized &&
            update.getStatus() != VoteStatus::Invalid) {
            continue;
        }

        const auto &item = update.getVoteItem();

        if (!std::holds_alternative<const CBlockIndex *>(item)) {
            continue;
        }

        if (update.getStatus() == VoteStatus::Invalid) {
            // Track invalidated blocks. Other invalidated types are not
            // tracked because they may be rejected for transient reasons
            // (ex: immature proofs or orphaned txs) With blocks this is not
            // the case. A rejected block will not be mined on. To prevent
            // reorgs, invalidated blocks should never be polled again.
            LOCK(cs_invalidatedBlocks);
            invalidatedBlocks.insert(GetVoteItemId(item));
            continue;
        }

        // At this point the block index can only be finalized
        const CBlockIndex *pindex = std::get<const CBlockIndex *>(item);
        LOCK(cs_finalizationTip);
        if (finalizationTip &&
            finalizationTip->GetAncestor(pindex->nHeight) == pindex) {
            continue;
        }

        finalizationTip = pindex;
    }

    return true;
}

CPubKey Processor::getSessionPubKey() const {
    return sessionKey.GetPubKey();
}

bool Processor::sendHelloInternal(CNode *pfrom) {
    AssertLockHeld(cs_delayedAvahelloNodeIds);

    Delegation delegation;
    if (peerData) {
        if (!canShareLocalProof()) {
            if (!delayedAvahelloNodeIds.emplace(pfrom->GetId()).second) {
                // Nothing to do
                return false;
            }
        } else {
            delegation = peerData->delegation;
        }
    }

    HashWriter hasher{};
    hasher << delegation.getId();
    hasher << pfrom->GetLocalNonce();
    hasher << pfrom->nRemoteHostNonce;
    hasher << pfrom->GetLocalExtraEntropy();
    hasher << pfrom->nRemoteExtraEntropy;

    // Now let's sign!
    SchnorrSig sig;
    if (!sessionKey.SignSchnorr(hasher.GetHash(), sig)) {
        return false;
    }

    connman->PushMessage(
        pfrom, CNetMsgMaker(pfrom->GetCommonVersion())
                   .Make(NetMsgType::AVAHELLO, Hello(delegation, sig)));

    return delegation.getLimitedProofId() != uint256::ZERO;
}

bool Processor::sendHello(CNode *pfrom) {
    return WITH_LOCK(cs_delayedAvahelloNodeIds,
                     return sendHelloInternal(pfrom));
}

void Processor::sendDelayedAvahello() {
    LOCK(cs_delayedAvahelloNodeIds);

    auto it = delayedAvahelloNodeIds.begin();
    while (it != delayedAvahelloNodeIds.end()) {
        if (connman->ForNode(*it, [&](CNode *pnode) EXCLUSIVE_LOCKS_REQUIRED(
                                      cs_delayedAvahelloNodeIds) {
                return sendHelloInternal(pnode);
            })) {
            // Our proof has been announced to this node
            it = delayedAvahelloNodeIds.erase(it);
        } else {
            ++it;
        }
    }
}

ProofRef Processor::getLocalProof() const {
    return peerData ? peerData->proof : ProofRef();
}

ProofRegistrationState Processor::getLocalProofRegistrationState() const {
    return peerData
               ? WITH_LOCK(peerData->cs_proofState, return peerData->proofState)
               : ProofRegistrationState();
}

bool Processor::startEventLoop(CScheduler &scheduler) {
    return eventLoop.startEventLoop(
        scheduler, [this]() { this->runEventLoop(); }, AVALANCHE_TIME_STEP);
}

bool Processor::stopEventLoop() {
    return eventLoop.stopEventLoop();
}

void Processor::avaproofsSent(NodeId nodeid) {
    AssertLockNotHeld(cs_main);

    if (chainman.IsInitialBlockDownload()) {
        // Before IBD is complete there is no way to make sure a proof is valid
        // or not, e.g. it can be spent in a block we don't know yet. In order
        // to increase confidence that our proof set is similar to other nodes
        // on the network, the messages received during IBD are not accounted.
        return;
    }

    LOCK(cs_peerManager);
    if (peerManager->latchAvaproofsSent(nodeid)) {
        avaproofsNodeCounter++;
    }
}

/*
 * Returns a bool indicating whether we have a usable Avalanche quorum enabling
 * us to take decisions based on polls.
 */
bool Processor::isQuorumEstablished() {
    AssertLockNotHeld(cs_main);

    {
        LOCK(cs_peerManager);
        if (peerManager->getNodeCount() < 8) {
            // There is no point polling if we know the vote cannot converge
            return false;
        }
    }

    /*
     * The following parameters can naturally go temporarly below the threshold
     * under normal circumstances, like during a proof replacement with a lower
     * stake amount, or the discovery of a new proofs for which we don't have a
     * node yet.
     * In order to prevent our node from starting and stopping the polls
     * spuriously on such event, the quorum establishement is latched. The only
     * parameters that should not latched is the minimum node count, as this
     * would cause the poll to be inconclusive anyway and should not happen
     * under normal circumstances.
     */
    if (quorumIsEstablished) {
        return true;
    }

    // Don't do Avalanche while node is IBD'ing
    if (chainman.IsInitialBlockDownload()) {
        return false;
    }

    if (avaproofsNodeCounter < minAvaproofsNodeCount) {
        return false;
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

    // Attempt to compute the staking rewards winner now so we don't have to
    // wait for a block if we already have all the prerequisites.
    const CBlockIndex *pprev = WITH_LOCK(cs_main, return chainman.ActiveTip());
    if (pprev && IsStakingRewardsActivated(chainman.GetConsensus(), pprev)) {
        computeStakingReward(pprev);
    }

    return true;
}

bool Processor::canShareLocalProof() {
    // The flag is latched
    if (m_canShareLocalProof) {
        return true;
    }

    // Don't share our proof if we don't have any inbound connection.
    // This is a best effort measure to prevent advertising a proof if we have
    // limited network connectivity.
    m_canShareLocalProof = connman->GetNodeCount(ConnectionDirection::In) > 0;

    return m_canShareLocalProof;
}

bool Processor::computeStakingReward(const CBlockIndex *pindex) {
    if (!pindex) {
        return false;
    }

    // If the quorum is not established there is no point picking a winner that
    // will be rejected.
    if (!isQuorumEstablished()) {
        return false;
    }

    {
        LOCK(cs_stakingRewards);
        if (stakingRewards.count(pindex->GetBlockHash()) > 0) {
            return true;
        }
    }

    StakingReward _stakingRewards;
    _stakingRewards.blockheight = pindex->nHeight;

    bool rewardsInserted = false;
    if (WITH_LOCK(cs_peerManager, return peerManager->selectStakingRewardWinner(
                                      pindex, _stakingRewards.winners))) {
        {
            LOCK(cs_stakingRewards);
            rewardsInserted =
                stakingRewards
                    .emplace(pindex->GetBlockHash(), std::move(_stakingRewards))
                    .second;
        }

        if (m_stakingPreConsensus) {
            // If pindex has not been promoted in the contender cache yet, this
            // will be a no-op.
            std::vector<StakeContenderId> pollableContenders;
            if (setContenderStatusForLocalWinners(pindex, pollableContenders)) {
                for (const StakeContenderId &contender : pollableContenders) {
                    addToReconcile(contender);
                }
            }
        }
    }

    return rewardsInserted;
}

bool Processor::eraseStakingRewardWinner(const BlockHash &prevBlockHash) {
    LOCK(cs_stakingRewards);
    return stakingRewards.erase(prevBlockHash) > 0;
}

void Processor::cleanupStakingRewards(const int minHeight) {
    // Avoid cs_main => cs_peerManager reverse order locking
    AssertLockNotHeld(::cs_main);
    AssertLockNotHeld(cs_stakingRewards);
    AssertLockNotHeld(cs_peerManager);

    {
        LOCK(cs_stakingRewards);
        // std::erase_if is only defined since C++20
        for (auto it = stakingRewards.begin(); it != stakingRewards.end();) {
            if (it->second.blockheight < minHeight) {
                it = stakingRewards.erase(it);
            } else {
                ++it;
            }
        }
    }

    if (m_stakingPreConsensus) {
        WITH_LOCK(cs_peerManager,
                  return peerManager->cleanupStakeContenders(minHeight));
    }
}

bool Processor::getStakingRewardWinners(
    const BlockHash &prevBlockHash,
    std::vector<std::pair<ProofId, CScript>> &winners) const {
    LOCK(cs_stakingRewards);
    auto it = stakingRewards.find(prevBlockHash);
    if (it == stakingRewards.end()) {
        return false;
    }

    winners = it->second.winners;
    return true;
}

bool Processor::getStakingRewardWinners(const BlockHash &prevBlockHash,
                                        std::vector<CScript> &payouts) const {
    std::vector<std::pair<ProofId, CScript>> winners;
    if (!getStakingRewardWinners(prevBlockHash, winners)) {
        return false;
    }

    payouts.clear();
    payouts.reserve(winners.size());
    for (auto &winner : winners) {
        payouts.push_back(std::move(winner.second));
    }

    return true;
}

bool Processor::setStakingRewardWinners(const CBlockIndex *pprev,
                                        const std::vector<CScript> &payouts) {
    assert(pprev);

    StakingReward stakingReward;
    stakingReward.blockheight = pprev->nHeight;

    stakingReward.winners.reserve(payouts.size());
    for (const CScript &payout : payouts) {
        stakingReward.winners.push_back({ProofId(), payout});
    }

    if (m_stakingPreConsensus) {
        LOCK(cs_peerManager);
        peerManager->setStakeContenderWinners(pprev, payouts);
    }

    LOCK(cs_stakingRewards);
    return stakingRewards.insert_or_assign(pprev->GetBlockHash(), stakingReward)
        .second;
}

bool Processor::setStakingRewardWinners(
    const CBlockIndex *pprev,
    const std::vector<std::pair<ProofId, CScript>> &winners) {
    assert(pprev);

    StakingReward stakingReward;
    stakingReward.blockheight = pprev->nHeight;
    stakingReward.winners = winners;

    LOCK(cs_stakingRewards);
    return stakingRewards.insert_or_assign(pprev->GetBlockHash(), stakingReward)
        .second;
}

void Processor::FinalizeNode(const ::Config &config, const CNode &node) {
    AssertLockNotHeld(cs_main);

    const NodeId nodeid = node.GetId();
    WITH_LOCK(cs_peerManager, peerManager->removeNode(nodeid));
    WITH_LOCK(cs_delayedAvahelloNodeIds, delayedAvahelloNodeIds.erase(nodeid));
}

int Processor::getStakeContenderStatus(
    const StakeContenderId &contenderId) const {
    AssertLockNotHeld(cs_peerManager);
    AssertLockNotHeld(cs_stakingRewards);

    BlockHash prevblockhash;
    int status =
        WITH_LOCK(cs_peerManager, return peerManager->getStakeContenderStatus(
                                      contenderId, prevblockhash));

    if (status != -1) {
        std::vector<std::pair<ProofId, CScript>> winners;
        getStakingRewardWinners(prevblockhash, winners);
        if (winners.size() == 0) {
            // If we have not selected a local staking rewards winner yet,
            // indicate this contender is pending to avoid convergence issues.
            return -2;
        }
    }

    return status;
}

void Processor::acceptStakeContender(const StakeContenderId &contenderId) {
    LOCK(cs_peerManager);
    peerManager->acceptStakeContender(contenderId);
}

void Processor::finalizeStakeContender(const StakeContenderId &contenderId) {
    AssertLockNotHeld(cs_main);

    BlockHash prevblockhash;
    std::vector<std::pair<ProofId, CScript>> winners;
    {
        LOCK(cs_peerManager);
        peerManager->finalizeStakeContender(contenderId, prevblockhash,
                                            winners);
    }

    // Set staking rewards to include newly finalized contender
    if (winners.size() > 0) {
        const CBlockIndex *block = WITH_LOCK(
            cs_main,
            return chainman.m_blockman.LookupBlockIndex(prevblockhash));
        if (block) {
            setStakingRewardWinners(block, winners);
        }
    }
}

void Processor::rejectStakeContender(const StakeContenderId &contenderId) {
    LOCK(cs_peerManager);
    peerManager->rejectStakeContender(contenderId);
}

void Processor::promoteStakeContendersToTip() {
    const CBlockIndex *activeTip =
        WITH_LOCK(cs_main, return chainman.ActiveTip());
    assert(activeTip);

    if (!hasFinalizedTip()) {
        // Avoid growing the contender cache until we have finalized a block
        return;
    }

    {
        LOCK(cs_peerManager);
        peerManager->promoteStakeContendersToBlock(activeTip);
    }

    // If staking rewards have not been computed yet, we will try again when
    // they have been.
    std::vector<StakeContenderId> pollableContenders;
    if (setContenderStatusForLocalWinners(activeTip, pollableContenders)) {
        for (const StakeContenderId &contender : pollableContenders) {
            addToReconcile(contender);
        }
    }
}

bool Processor::setContenderStatusForLocalWinners(
    const CBlockIndex *pindex,
    std::vector<StakeContenderId> &pollableContenders) {
    const BlockHash prevblockhash = pindex->GetBlockHash();
    std::vector<std::pair<ProofId, CScript>> winners;
    getStakingRewardWinners(prevblockhash, winners);

    LOCK(cs_peerManager);
    return peerManager->setContenderStatusForLocalWinners(
        pindex, winners, AVALANCHE_CONTENDER_MAX_POLLABLE, pollableContenders);
}

void Processor::updatedBlockTip() {
    const bool registerLocalProof = canShareLocalProof();
    auto registerProofs = [&]() {
        LOCK(cs_peerManager);

        auto registeredProofs = peerManager->updatedBlockTip();

        ProofRegistrationState localProofState;
        if (peerData && peerData->proof && registerLocalProof) {
            if (peerManager->registerProof(peerData->proof, localProofState)) {
                registeredProofs.insert(peerData->proof);
            }

            if (localProofState.GetResult() ==
                ProofRegistrationResult::ALREADY_REGISTERED) {
                // If our proof already exists, that's fine but we don't want to
                // erase the state with a duplicated proof status, so let's
                // retrieve the proper state. It also means we are able to
                // update the status should the proof move from one pool to the
                // other.
                const ProofId &localProofId = peerData->proof->getId();
                if (peerManager->isImmature(localProofId)) {
                    localProofState.Invalid(ProofRegistrationResult::IMMATURE,
                                            "immature-proof");
                }
                if (peerManager->isInConflictingPool(localProofId)) {
                    localProofState.Invalid(
                        ProofRegistrationResult::CONFLICTING,
                        "conflicting-utxos");
                }
                if (peerManager->isBoundToPeer(localProofId)) {
                    localProofState = ProofRegistrationState();
                }
            }

            WITH_LOCK(peerData->cs_proofState,
                      peerData->proofState = std::move(localProofState));
        }

        return registeredProofs;
    };

    auto registeredProofs = registerProofs();
    for (const auto &proof : registeredProofs) {
        reconcileOrFinalize(proof);
    }

    if (m_stakingPreConsensus) {
        promoteStakeContendersToTip();
    }
}

void Processor::transactionAddedToMempool(const CTransactionRef &tx) {
    if (m_preConsensus) {
        addToReconcile(tx);
    }
}

void Processor::runEventLoop() {
    // Don't poll if quorum hasn't been established yet
    if (!isQuorumEstablished()) {
        return;
    }

    // First things first, check if we have requests that timed out and clear
    // them.
    clearTimedoutRequests();

    // Make sure there is at least one suitable node to query before gathering
    // invs.
    NodeId nodeid = WITH_LOCK(cs_peerManager, return peerManager->selectNode());
    if (nodeid == NO_NODE) {
        return;
    }
    std::vector<CInv> invs = getInvsForNextPoll();
    if (invs.empty()) {
        return;
    }

    LOCK(cs_peerManager);

    do {
        /**
         * If we lost contact to that node, then we remove it from nodeids, but
         * never add the request to queries, which ensures bad nodes get cleaned
         * up over time.
         */
        bool hasSent = connman->ForNode(
            nodeid, [this, &invs](CNode *pnode) EXCLUSIVE_LOCKS_REQUIRED(
                        cs_peerManager) {
                uint64_t current_round = round++;

                {
                    // Compute the time at which this requests times out.
                    auto timeout = Now<SteadyMilliseconds>() +
                                   avaconfig.queryTimeoutDuration;
                    // Register the query.
                    queries.getWriteView()->insert(
                        {pnode->GetId(), current_round, timeout, invs});
                    // Set the timeout.
                    peerManager->updateNextRequestTime(pnode->GetId(), timeout);
                }

                pnode->invsPolled(invs.size());

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

        // This node is obsolete, delete it.
        peerManager->removeNode(nodeid);

        // Get next suitable node to try again
        nodeid = peerManager->selectNode();
    } while (nodeid != NO_NODE);
}

void Processor::clearTimedoutRequests() {
    auto now = Now<SteadyMilliseconds>();
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

    // In flight request accounting.
    auto voteRecordsWriteView = voteRecords.getWriteView();
    for (const auto &p : timedout_items) {
        auto item = getVoteItemFromInv(p.first);

        if (isNull(item)) {
            continue;
        }

        auto it = voteRecordsWriteView->find(item);
        if (it == voteRecordsWriteView.end()) {
            continue;
        }

        it->second.clearInflightRequest(p.second);
    }
}

std::vector<CInv> Processor::getInvsForNextPoll(bool forPoll) {
    std::vector<CInv> invs;

    {
        // First remove all items that are not worth polling.
        auto w = voteRecords.getWriteView();
        for (auto it = w->begin(); it != w->end();) {
            if (!isWorthPolling(it->first)) {
                it = w->erase(it);
            } else {
                ++it;
            }
        }
    }

    auto buildInvFromVoteItem = variant::overloaded{
        [](const ProofRef &proof) {
            return CInv(MSG_AVA_PROOF, proof->getId());
        },
        [](const CBlockIndex *pindex) {
            return CInv(MSG_BLOCK, pindex->GetBlockHash());
        },
        [](const StakeContenderId &contenderId) {
            return CInv(MSG_AVA_STAKE_CONTENDER, contenderId);
        },
        [](const CTransactionRef &tx) { return CInv(MSG_TX, tx->GetHash()); },
    };

    auto r = voteRecords.getReadView();
    for (const auto &[item, voteRecord] : r) {
        if (invs.size() >= AVALANCHE_MAX_ELEMENT_POLL) {
            // Make sure we do not produce more invs than specified by the
            // protocol.
            return invs;
        }

        const bool shouldPoll =
            forPoll ? voteRecord.registerPoll() : voteRecord.shouldPoll();

        if (!shouldPoll) {
            continue;
        }

        invs.emplace_back(std::visit(buildInvFromVoteItem, item));
    }

    return invs;
}

AnyVoteItem Processor::getVoteItemFromInv(const CInv &inv) const {
    if (inv.IsMsgBlk()) {
        return WITH_LOCK(cs_main, return chainman.m_blockman.LookupBlockIndex(
                                      BlockHash(inv.hash)));
    }

    if (inv.IsMsgProof()) {
        return WITH_LOCK(cs_peerManager,
                         return peerManager->getProof(ProofId(inv.hash)));
    }

    if (inv.IsMsgStakeContender()) {
        return StakeContenderId(inv.hash);
    }

    if (mempool && inv.IsMsgTx()) {
        LOCK(mempool->cs);
        if (CTransactionRef tx = mempool->get(TxId(inv.hash))) {
            return tx;
        }
        if (CTransactionRef tx = mempool->withConflicting(
                [&inv](const TxConflicting &conflicting) {
                    return conflicting.GetTx(TxId(inv.hash));
                })) {
            return tx;
        }
    }

    return {nullptr};
}

bool Processor::IsWorthPolling::operator()(const CBlockIndex *pindex) const {
    AssertLockNotHeld(cs_main);

    LOCK(cs_main);

    if (pindex->nStatus.isInvalid()) {
        // No point polling invalid blocks.
        return false;
    }

    if (WITH_LOCK(processor.cs_finalizationTip,
                  return processor.finalizationTip &&
                         processor.finalizationTip->GetAncestor(
                             pindex->nHeight) == pindex)) {
        // There is no point polling blocks that are ancestor of a block that
        // has been accepted by the network.
        return false;
    }

    if (WITH_LOCK(processor.cs_invalidatedBlocks,
                  return processor.invalidatedBlocks.contains(
                      pindex->GetBlockHash()))) {
        // Blocks invalidated by Avalanche should not be polled twice.
        return false;
    }

    return true;
}

bool Processor::IsWorthPolling::operator()(const ProofRef &proof) const {
    // Avoid lock order issues cs_main -> cs_peerManager
    AssertLockNotHeld(::cs_main);
    AssertLockNotHeld(processor.cs_peerManager);

    const ProofId &proofid = proof->getId();

    LOCK(processor.cs_peerManager);

    // No point polling immature or discarded proofs
    return processor.peerManager->isBoundToPeer(proofid) ||
           processor.peerManager->isInConflictingPool(proofid);
}

bool Processor::IsWorthPolling::operator()(
    const StakeContenderId &contenderId) const {
    AssertLockNotHeld(processor.cs_peerManager);
    AssertLockNotHeld(processor.cs_stakingRewards);

    // Only worth polling for contenders that we know about
    return processor.getStakeContenderStatus(contenderId) != -1;
}

bool Processor::IsWorthPolling::operator()(const CTransactionRef &tx) const {
    if (!processor.mempool) {
        return false;
    }

    AssertLockNotHeld(processor.mempool->cs);
    return WITH_LOCK(processor.mempool->cs,
                     return processor.mempool->isWorthPolling(tx));
}

bool Processor::isWorthPolling(const AnyVoteItem &item) const {
    return !isRecentlyFinalized(GetVoteItemId(item)) &&
           std::visit(IsWorthPolling(*this), item);
}

bool Processor::GetLocalAcceptance::operator()(
    const CBlockIndex *pindex) const {
    AssertLockNotHeld(cs_main);

    return WITH_LOCK(cs_main,
                     return processor.chainman.ActiveChain().Contains(pindex));
}

bool Processor::GetLocalAcceptance::operator()(const ProofRef &proof) const {
    AssertLockNotHeld(processor.cs_peerManager);

    return WITH_LOCK(
        processor.cs_peerManager,
        return processor.peerManager->isBoundToPeer(proof->getId()));
}

bool Processor::GetLocalAcceptance::operator()(
    const StakeContenderId &contenderId) const {
    AssertLockNotHeld(processor.cs_peerManager);
    AssertLockNotHeld(processor.cs_stakingRewards);

    return processor.getStakeContenderStatus(contenderId) == 0;
}

bool Processor::GetLocalAcceptance::operator()(
    const CTransactionRef &tx) const {
    if (!processor.mempool) {
        return false;
    }

    AssertLockNotHeld(processor.mempool->cs);

    return WITH_LOCK(processor.mempool->cs,
                     return processor.mempool->exists(tx->GetId()));
}

} // namespace avalanche
