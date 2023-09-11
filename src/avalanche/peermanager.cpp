// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/peermanager.h>

#include <avalanche/avalanche.h>
#include <avalanche/delegation.h>
#include <avalanche/rewardrankcomparator.h>
#include <avalanche/stakecontender.h>
#include <avalanche/validation.h>
#include <cashaddrenc.h>
#include <clientversion.h>
#include <common/args.h>
#include <consensus/activation.h>
#include <logging.h>
#include <random.h>
#include <scheduler.h>
#include <threadsafety.h>
#include <uint256.h>
#include <util/fastrange.h>
#include <util/fs_helpers.h>
#include <util/strencodings.h>
#include <util/time.h>
#include <validation.h> // For ChainstateManager

#include <algorithm>
#include <cassert>
#include <limits>

namespace avalanche {
static constexpr uint64_t PEERS_DUMP_VERSION{1};

bool PeerManager::addNode(NodeId nodeid, const ProofId &proofid) {
    auto &pview = peers.get<by_proofid>();
    auto it = pview.find(proofid);
    if (it == pview.end()) {
        // If the node exists, it is actually updating its proof to an unknown
        // one. In this case we need to remove it so it is not both active and
        // pending at the same time.
        removeNode(nodeid);
        pendingNodes.emplace(proofid, nodeid);
        return false;
    }

    return addOrUpdateNode(peers.project<0>(it), nodeid);
}

bool PeerManager::addOrUpdateNode(const PeerSet::iterator &it, NodeId nodeid) {
    assert(it != peers.end());

    const PeerId peerid = it->peerid;

    auto nit = nodes.find(nodeid);
    if (nit == nodes.end()) {
        if (!nodes.emplace(nodeid, peerid).second) {
            return false;
        }
    } else {
        const PeerId oldpeerid = nit->peerid;
        if (!nodes.modify(nit, [&](Node &n) { n.peerid = peerid; })) {
            return false;
        }

        // We actually have this node already, we need to update it.
        bool success = removeNodeFromPeer(peers.find(oldpeerid));
        assert(success);
    }

    // Then increase the node counter, and create the slot if needed
    bool success = addNodeToPeer(it);
    assert(success);

    // If the added node was in the pending set, remove it
    pendingNodes.get<by_nodeid>().erase(nodeid);

    // If the proof was in the dangling pool, remove it
    const ProofId &proofid = it->getProofId();
    if (danglingProofPool.getProof(proofid)) {
        danglingProofPool.removeProof(proofid);
    }

    // We know for sure there is at least 1 node. Note that this can fail if
    // there is more than 1, in this case it's a no-op.
    shareableProofs.insert(it->proof);

    return true;
}

bool PeerManager::addNodeToPeer(const PeerSet::iterator &it) {
    assert(it != peers.end());
    return peers.modify(it, [&](Peer &p) {
        if (p.node_count++ > 0) {
            // We are done.
            return;
        }

        // We need to allocate this peer.
        p.index = uint32_t(slots.size());
        const uint32_t score = p.getScore();
        const uint64_t start = slotCount;
        slots.emplace_back(start, score, it->peerid);
        slotCount = start + score;

        // Add to our allocated score when we allocate a new peer in the slots
        connectedPeersScore += score;
    });
}

bool PeerManager::removeNode(NodeId nodeid) {
    // Remove all the remote proofs from this node
    auto &remoteProofsView = remoteProofs.get<by_nodeid>();
    auto [begin, end] = remoteProofsView.equal_range(nodeid);
    remoteProofsView.erase(begin, end);

    if (pendingNodes.get<by_nodeid>().erase(nodeid) > 0) {
        // If this was a pending node, there is nothing else to do.
        return true;
    }

    auto it = nodes.find(nodeid);
    if (it == nodes.end()) {
        return false;
    }

    const PeerId peerid = it->peerid;
    nodes.erase(it);

    // Keep the track of the reference count.
    bool success = removeNodeFromPeer(peers.find(peerid));
    assert(success);

    return true;
}

bool PeerManager::removeNodeFromPeer(const PeerSet::iterator &it,
                                     uint32_t count) {
    // It is possible for nodes to be dangling. If there was an inflight query
    // when the peer gets removed, the node was not erased. In this case there
    // is nothing to do.
    if (it == peers.end()) {
        return true;
    }

    assert(count <= it->node_count);
    if (count == 0) {
        // This is a NOOP.
        return false;
    }

    const uint32_t new_count = it->node_count - count;
    if (!peers.modify(it, [&](Peer &p) { p.node_count = new_count; })) {
        return false;
    }

    if (new_count > 0) {
        // We are done.
        return true;
    }

    // There are no more nodes left, we need to clean up. Remove from the radix
    // tree (unless it's our local proof), subtract allocated score and remove
    // from slots.
    if (!localProof || it->getProofId() != localProof->getId()) {
        const auto removed = shareableProofs.remove(it->getProofId());
        assert(removed);
    }

    const size_t i = it->index;
    assert(i < slots.size());
    assert(connectedPeersScore >= slots[i].getScore());
    connectedPeersScore -= slots[i].getScore();

    if (i + 1 == slots.size()) {
        slots.pop_back();
        slotCount = slots.empty() ? 0 : slots.back().getStop();
    } else {
        fragmentation += slots[i].getScore();
        slots[i] = slots[i].withPeerId(NO_PEER);
    }

    return true;
}

bool PeerManager::updateNextRequestTime(NodeId nodeid,
                                        SteadyMilliseconds timeout) {
    auto it = nodes.find(nodeid);
    if (it == nodes.end()) {
        return false;
    }

    return nodes.modify(it, [&](Node &n) { n.nextRequestTime = timeout; });
}

bool PeerManager::latchAvaproofsSent(NodeId nodeid) {
    auto it = nodes.find(nodeid);
    if (it == nodes.end()) {
        return false;
    }

    return !it->avaproofsSent &&
           nodes.modify(it, [&](Node &n) { n.avaproofsSent = true; });
}

static bool isImmatureState(const ProofValidationState &state) {
    return state.GetResult() == ProofValidationResult::IMMATURE_UTXO;
}

bool PeerManager::updateNextPossibleConflictTime(
    PeerId peerid, const std::chrono::seconds &nextTime) {
    auto it = peers.find(peerid);
    if (it == peers.end()) {
        // No such peer
        return false;
    }

    // Make sure we don't move the time in the past.
    peers.modify(it, [&](Peer &p) {
        p.nextPossibleConflictTime =
            std::max(p.nextPossibleConflictTime, nextTime);
    });

    return it->nextPossibleConflictTime == nextTime;
}

bool PeerManager::setFinalized(PeerId peerid) {
    auto it = peers.find(peerid);
    if (it == peers.end()) {
        // No such peer
        return false;
    }

    peers.modify(it, [&](Peer &p) { p.hasFinalized = true; });

    return true;
}

template <typename ProofContainer>
void PeerManager::moveToConflictingPool(const ProofContainer &proofs) {
    auto &peersView = peers.get<by_proofid>();
    for (const ProofRef &proof : proofs) {
        auto it = peersView.find(proof->getId());
        if (it != peersView.end()) {
            removePeer(it->peerid);
        }

        conflictingProofPool.addProofIfPreferred(proof);
    }
}

bool PeerManager::registerProof(const ProofRef &proof,
                                ProofRegistrationState &registrationState,
                                RegistrationMode mode) {
    assert(proof);

    const ProofId &proofid = proof->getId();

    auto invalidate = [&](ProofRegistrationResult result,
                          const std::string &message) {
        return registrationState.Invalid(
            result, message, strprintf("proofid: %s", proofid.ToString()));
    };

    if ((mode != RegistrationMode::FORCE_ACCEPT ||
         !isInConflictingPool(proofid)) &&
        exists(proofid)) {
        // In default mode, we expect the proof to be unknown, i.e. in none of
        // the pools.
        // In forced accept mode, the proof can be in the conflicting pool.
        return invalidate(ProofRegistrationResult::ALREADY_REGISTERED,
                          "proof-already-registered");
    }

    if (danglingProofPool.getProof(proofid) &&
        pendingNodes.count(proofid) == 0) {
        // Don't attempt to register a proof that we already evicted because it
        // was dangling, but rather attempt to retrieve an associated node.
        needMoreNodes = true;
        return invalidate(ProofRegistrationResult::DANGLING, "dangling-proof");
    }

    // Check the proof's validity.
    ProofValidationState validationState;
    if (!WITH_LOCK(cs_main, return proof->verify(stakeUtxoDustThreshold,
                                                 chainman, validationState))) {
        if (isImmatureState(validationState)) {
            immatureProofPool.addProofIfPreferred(proof);
            if (immatureProofPool.countProofs() >
                AVALANCHE_MAX_IMMATURE_PROOFS) {
                // Adding this proof exceeds the immature pool limit, so evict
                // the lowest scoring proof.
                immatureProofPool.removeProof(
                    immatureProofPool.getLowestScoreProof()->getId());
            }

            return invalidate(ProofRegistrationResult::IMMATURE,
                              "immature-proof");
        }

        if (validationState.GetResult() ==
            ProofValidationResult::MISSING_UTXO) {
            return invalidate(ProofRegistrationResult::MISSING_UTXO,
                              "utxo-missing-or-spent");
        }

        // Reject invalid proof.
        return invalidate(ProofRegistrationResult::INVALID, "invalid-proof");
    }

    auto now = GetTime<std::chrono::seconds>();
    auto nextCooldownTimePoint =
        now + std::chrono::seconds(gArgs.GetIntArg(
                  "-avalancheconflictingproofcooldown",
                  AVALANCHE_DEFAULT_CONFLICTING_PROOF_COOLDOWN));

    ProofPool::ConflictingProofSet conflictingProofs;
    switch (validProofPool.addProofIfNoConflict(proof, conflictingProofs)) {
        case ProofPool::AddProofStatus::REJECTED: {
            if (mode != RegistrationMode::FORCE_ACCEPT) {
                auto bestPossibleConflictTime = std::chrono::seconds(0);
                auto &pview = peers.get<by_proofid>();
                for (auto &conflictingProof : conflictingProofs) {
                    auto it = pview.find(conflictingProof->getId());
                    assert(it != pview.end());

                    // Search the most recent time over the peers
                    bestPossibleConflictTime = std::max(
                        bestPossibleConflictTime, it->nextPossibleConflictTime);

                    updateNextPossibleConflictTime(it->peerid,
                                                   nextCooldownTimePoint);
                }

                if (bestPossibleConflictTime > now) {
                    // Cooldown not elapsed, reject the proof.
                    return invalidate(
                        ProofRegistrationResult::COOLDOWN_NOT_ELAPSED,
                        "cooldown-not-elapsed");
                }

                // Give the proof a chance to replace the conflicting ones.
                if (validProofPool.addProofIfPreferred(proof)) {
                    // If we have overridden other proofs due to conflict,
                    // remove the peers and attempt to move them to the
                    // conflicting pool.
                    moveToConflictingPool(conflictingProofs);

                    // Replacement is successful, continue to peer creation
                    break;
                }

                // Not the preferred proof, or replacement is not enabled
                return conflictingProofPool.addProofIfPreferred(proof) ==
                               ProofPool::AddProofStatus::REJECTED
                           ? invalidate(ProofRegistrationResult::REJECTED,
                                        "rejected-proof")
                           : invalidate(ProofRegistrationResult::CONFLICTING,
                                        "conflicting-utxos");
            }

            conflictingProofPool.removeProof(proofid);

            // Move the conflicting proofs from the valid pool to the
            // conflicting pool
            moveToConflictingPool(conflictingProofs);

            auto status = validProofPool.addProofIfNoConflict(proof);
            assert(status == ProofPool::AddProofStatus::SUCCEED);

            break;
        }
        case ProofPool::AddProofStatus::DUPLICATED:
            // If the proof was already in the pool, don't duplicate the peer.
            return invalidate(ProofRegistrationResult::ALREADY_REGISTERED,
                              "proof-already-registered");
        case ProofPool::AddProofStatus::SUCCEED:
            break;

            // No default case, so the compiler can warn about missing cases
    }

    // At this stage we are going to create a peer so the proof should never
    // exist in the conflicting pool, but use belt and suspenders.
    conflictingProofPool.removeProof(proofid);

    // New peer means new peerid!
    const PeerId peerid = nextPeerId++;

    // We have no peer for this proof, time to create it.
    auto inserted = peers.emplace(peerid, proof, nextCooldownTimePoint);
    assert(inserted.second);

    if (localProof && proof->getId() == localProof->getId()) {
        // Add it to the shareable proofs even if there is no node, we are the
        // node. Otherwise it will be inserted after a node is attached to the
        // proof.
        shareableProofs.insert(proof);
    }

    // Add to our registered score when adding to the peer list
    totalPeersScore += proof->getScore();

    // If there are nodes waiting for this proof, add them
    auto &pendingNodesView = pendingNodes.get<by_proofid>();
    auto range = pendingNodesView.equal_range(proofid);

    // We want to update the nodes then remove them from the pending set. That
    // will invalidate the range iterators, so we need to save the node ids
    // first before we can loop over them.
    std::vector<NodeId> nodeids;
    nodeids.reserve(std::distance(range.first, range.second));
    std::transform(range.first, range.second, std::back_inserter(nodeids),
                   [](const PendingNode &n) { return n.nodeid; });

    for (const NodeId &nodeid : nodeids) {
        addOrUpdateNode(inserted.first, nodeid);
    }

    if (isStakingPreconsensusActivated()) {
        addStakeContender(proof);
    }

    return true;
}

bool PeerManager::rejectProof(const ProofId &proofid, RejectionMode mode) {
    if (isDangling(proofid) && mode == RejectionMode::INVALIDATE) {
        danglingProofPool.removeProof(proofid);
        return true;
    }

    if (!exists(proofid)) {
        return false;
    }

    if (immatureProofPool.removeProof(proofid)) {
        return true;
    }

    if (mode == RejectionMode::DEFAULT &&
        conflictingProofPool.getProof(proofid)) {
        // In default mode we keep the proof in the conflicting pool
        return true;
    }

    if (mode == RejectionMode::INVALIDATE &&
        conflictingProofPool.removeProof(proofid)) {
        // In invalidate mode we remove the proof completely
        return true;
    }

    auto &pview = peers.get<by_proofid>();
    auto it = pview.find(proofid);
    assert(it != pview.end());

    const ProofRef proof = it->proof;

    if (!removePeer(it->peerid)) {
        return false;
    }

    // If there was conflicting proofs, attempt to pull them back
    for (const SignedStake &ss : proof->getStakes()) {
        const ProofRef conflictingProof =
            conflictingProofPool.getProof(ss.getStake().getUTXO());
        if (!conflictingProof) {
            continue;
        }

        conflictingProofPool.removeProof(conflictingProof->getId());
        registerProof(conflictingProof);
    }

    if (mode == RejectionMode::DEFAULT) {
        conflictingProofPool.addProofIfPreferred(proof);
    }

    return true;
}

void PeerManager::cleanupDanglingProofs(
    std::unordered_set<ProofRef, SaltedProofHasher> &registeredProofs) {
    registeredProofs.clear();
    const auto now = GetTime<std::chrono::seconds>();

    std::vector<ProofRef> newlyDanglingProofs;
    for (const Peer &peer : peers) {
        // If the peer is not our local proof, has been registered for some
        // time and has no node attached, discard it.
        if ((!localProof || peer.getProofId() != localProof->getId()) &&
            peer.node_count == 0 &&
            (peer.registration_time + Peer::DANGLING_TIMEOUT) <= now) {
            // Check the remotes status to determine if we should set the proof
            // as dangling. This prevents from dropping a proof on our own due
            // to a network issue. If the remote presence status is inconclusive
            // we assume our own position (missing = false).
            if (!getRemotePresenceStatus(peer.getProofId()).value_or(false)) {
                newlyDanglingProofs.push_back(peer.proof);
            }
        }
    }

    // Similarly, check if we have dangling proofs that could be pulled back
    // because the network says so.
    std::vector<ProofRef> previouslyDanglingProofs;
    danglingProofPool.forEachProof([&](const ProofRef &proof) {
        if (getRemotePresenceStatus(proof->getId()).value_or(false)) {
            previouslyDanglingProofs.push_back(proof);
        }
    });
    for (const ProofRef &proof : previouslyDanglingProofs) {
        danglingProofPool.removeProof(proof->getId());
        if (registerProof(proof)) {
            registeredProofs.insert(proof);
        }
    }

    for (const ProofRef &proof : newlyDanglingProofs) {
        rejectProof(proof->getId(), RejectionMode::INVALIDATE);
        if (danglingProofPool.addProofIfPreferred(proof)) {
            // If the proof is added, it means there is no better conflicting
            // dangling proof and this is not a duplicated, so it's worth
            // printing a message to the log.
            LogPrint(BCLog::AVALANCHE,
                     "Proof dangling for too long (no connected node): %s\n",
                     proof->getId().GetHex());
        }
    }

    // If we have dangling proof, this is a good indicator that we need to
    // request more nodes from our peers.
    needMoreNodes = !newlyDanglingProofs.empty();
}

NodeId PeerManager::selectNode() {
    for (int retry = 0; retry < SELECT_NODE_MAX_RETRY; retry++) {
        const PeerId p = selectPeer();

        // If we cannot find a peer, it may be due to the fact that it is
        // unlikely due to high fragmentation, so compact and retry.
        if (p == NO_PEER) {
            compact();
            continue;
        }

        // See if that peer has an available node.
        auto &nview = nodes.get<next_request_time>();
        auto it = nview.lower_bound(boost::make_tuple(p, SteadyMilliseconds()));
        if (it != nview.end() && it->peerid == p &&
            it->nextRequestTime <= Now<SteadyMilliseconds>()) {
            return it->nodeid;
        }
    }

    // We failed to find a node to query, flag this so we can request more
    needMoreNodes = true;

    return NO_NODE;
}

std::unordered_set<ProofRef, SaltedProofHasher> PeerManager::updatedBlockTip() {
    std::vector<ProofId> invalidProofIds;
    std::vector<ProofRef> newImmatures;

    {
        LOCK(cs_main);

        for (const auto &p : peers) {
            ProofValidationState state;
            if (!p.proof->verify(stakeUtxoDustThreshold, chainman, state)) {
                if (isImmatureState(state)) {
                    newImmatures.push_back(p.proof);
                }
                invalidProofIds.push_back(p.getProofId());

                LogPrint(BCLog::AVALANCHE,
                         "Invalidating proof %s: verification failed (%s)\n",
                         p.proof->getId().GetHex(), state.ToString());
            }
        }

        // Disable thread safety analysis here because it does not play nicely
        // with the lambda
        danglingProofPool.forEachProof(
            [&](const ProofRef &proof) NO_THREAD_SAFETY_ANALYSIS {
                AssertLockHeld(cs_main);
                ProofValidationState state;
                if (!proof->verify(stakeUtxoDustThreshold, chainman, state)) {
                    invalidProofIds.push_back(proof->getId());

                    LogPrint(
                        BCLog::AVALANCHE,
                        "Invalidating dangling proof %s: verification failed "
                        "(%s)\n",
                        proof->getId().GetHex(), state.ToString());
                }
            });
    }

    // Remove the invalid proofs before the immature rescan. This makes it
    // possible to pull back proofs with utxos that conflicted with these
    // invalid proofs.
    for (const ProofId &invalidProofId : invalidProofIds) {
        rejectProof(invalidProofId, RejectionMode::INVALIDATE);
    }

    auto registeredProofs = immatureProofPool.rescan(*this);

    for (auto &p : newImmatures) {
        immatureProofPool.addProofIfPreferred(p);
    }

    return registeredProofs;
}

ProofRef PeerManager::getProof(const ProofId &proofid) const {
    ProofRef proof;

    forPeer(proofid, [&](const Peer &p) {
        proof = p.proof;
        return true;
    });

    if (!proof) {
        proof = conflictingProofPool.getProof(proofid);
    }

    if (!proof) {
        proof = immatureProofPool.getProof(proofid);
    }

    return proof;
}

bool PeerManager::isBoundToPeer(const ProofId &proofid) const {
    auto &pview = peers.get<by_proofid>();
    return pview.find(proofid) != pview.end();
}

bool PeerManager::isImmature(const ProofId &proofid) const {
    return immatureProofPool.getProof(proofid) != nullptr;
}

bool PeerManager::isInConflictingPool(const ProofId &proofid) const {
    return conflictingProofPool.getProof(proofid) != nullptr;
}

bool PeerManager::isDangling(const ProofId &proofid) const {
    return danglingProofPool.getProof(proofid) != nullptr;
}

void PeerManager::setInvalid(const ProofId &proofid) {
    invalidProofs.insert(proofid);
}

bool PeerManager::isInvalid(const ProofId &proofid) const {
    return invalidProofs.contains(proofid);
}

void PeerManager::clearAllInvalid() {
    invalidProofs.reset();
}

bool PeerManager::saveRemoteProof(const ProofId &proofid, const NodeId nodeid,
                                  const bool present) {
    if (present && isStakingPreconsensusActivated() && isBoundToPeer(proofid) &&
        !isRemotelyPresentProof(proofid)) {
        // If this is the first time this peer's proof becomes a remote proof of
        // any node, ensure it is included in the contender cache. There is a
        // special case where the contender cache can lose track of a proof if
        // it is not saved as a remote proof before the next finalized block
        // (triggering promotion, where non-remote cache entries are dropped).
        // This does not happen in the hot path since receiving a proof
        // immediately saves it as a remote, however it becomes more likely if
        // the proof was loaded from a file (-persistavapeers) or added via RPC.
        addStakeContender(getProof(proofid));
    }

    // Get how many proofs this node has announced
    auto &remoteProofsByLastUpdate = remoteProofs.get<by_lastUpdate>();
    auto [begin, end] = remoteProofsByLastUpdate.equal_range(nodeid);

    // Limit the number of proofs a single node can save:
    //  - At least MAX_REMOTE_PROOFS
    //  - Up to 2x as much as we have
    // The MAX_REMOTE_PROOFS minimum is there to ensure we don't overlimit at
    // startup when we don't have proofs yet.
    while (size_t(std::distance(begin, end)) >=
           std::max(MAX_REMOTE_PROOFS, 2 * peers.size())) {
        // Remove the proof with the oldest update time
        begin = remoteProofsByLastUpdate.erase(begin);
    }

    auto it = remoteProofs.find(boost::make_tuple(proofid, nodeid));
    if (it != remoteProofs.end()) {
        remoteProofs.erase(it);
    }

    return remoteProofs
        .emplace(RemoteProof{proofid, nodeid, GetTime<std::chrono::seconds>(),
                             present})
        .second;
}

std::vector<RemoteProof>
PeerManager::getRemoteProofs(const NodeId nodeid) const {
    std::vector<RemoteProof> nodeRemoteProofs;

    auto &remoteProofsByLastUpdate = remoteProofs.get<by_lastUpdate>();
    auto [begin, end] = remoteProofsByLastUpdate.equal_range(nodeid);

    for (auto &it = begin; it != end; it++) {
        nodeRemoteProofs.emplace_back(*it);
    }

    return nodeRemoteProofs;
}

bool PeerManager::hasRemoteProofStatus(const ProofId &proofid) const {
    auto &view = remoteProofs.get<by_proofid>();
    return view.count(proofid) > 0;
}

bool PeerManager::isRemotelyPresentProof(const ProofId &proofid) const {
    auto &view = remoteProofs.get<by_proofid>();
    auto [begin, end] = view.equal_range(proofid);
    return std::any_of(begin, end, [](const auto &remoteProof) {
        return remoteProof.present;
    });
}

bool PeerManager::removePeer(const PeerId peerid) {
    auto it = peers.find(peerid);
    if (it == peers.end()) {
        return false;
    }

    // Remove all nodes from this peer.
    removeNodeFromPeer(it, it->node_count);

    auto &nview = nodes.get<next_request_time>();

    // Add the nodes to the pending set
    auto range = nview.equal_range(peerid);
    for (auto &nit = range.first; nit != range.second; ++nit) {
        pendingNodes.emplace(it->getProofId(), nit->nodeid);
    };

    // Remove nodes associated with this peer, unless their timeout is still
    // active. This ensure that we don't overquery them in case they are
    // subsequently added to another peer.
    nview.erase(
        nview.lower_bound(boost::make_tuple(peerid, SteadyMilliseconds())),
        nview.upper_bound(
            boost::make_tuple(peerid, Now<SteadyMilliseconds>())));

    // Release UTXOs attached to this proof.
    validProofPool.removeProof(it->getProofId());

    // If there were nodes attached, remove from the radix tree as well
    auto removed = shareableProofs.remove(Uint256RadixKey(it->getProofId()));

    m_unbroadcast_proofids.erase(it->getProofId());

    // Remove the peer from the PeerSet and remove its score from the registered
    // score total.
    assert(totalPeersScore >= it->getScore());
    totalPeersScore -= it->getScore();
    peers.erase(it);
    return true;
}

PeerId PeerManager::selectPeer() const {
    if (slots.empty() || slotCount == 0) {
        return NO_PEER;
    }

    const uint64_t max = slotCount;
    for (int retry = 0; retry < SELECT_PEER_MAX_RETRY; retry++) {
        size_t i =
            selectPeerImpl(slots, FastRandomContext().randrange(max), max);
        if (i != NO_PEER) {
            return i;
        }
    }

    return NO_PEER;
}

uint64_t PeerManager::compact() {
    // There is nothing to compact.
    if (fragmentation == 0) {
        return 0;
    }

    std::vector<Slot> newslots;
    newslots.reserve(peers.size());

    uint64_t prevStop = 0;
    uint32_t i = 0;
    for (auto it = peers.begin(); it != peers.end(); it++) {
        if (it->node_count == 0) {
            continue;
        }

        newslots.emplace_back(prevStop, it->getScore(), it->peerid);
        prevStop = slots[i].getStop();
        if (!peers.modify(it, [&](Peer &p) { p.index = i++; })) {
            return 0;
        }
    }

    slots = std::move(newslots);

    const uint64_t saved = slotCount - prevStop;
    slotCount = prevStop;
    fragmentation = 0;

    return saved;
}

bool PeerManager::verify() const {
    uint64_t prevStop = 0;
    uint32_t scoreFromSlots = 0;
    for (size_t i = 0; i < slots.size(); i++) {
        const Slot &s = slots[i];

        // Slots must be in correct order.
        if (s.getStart() < prevStop) {
            return false;
        }

        prevStop = s.getStop();

        // If this is a dead slot, then nothing more needs to be checked.
        if (s.getPeerId() == NO_PEER) {
            continue;
        }

        // We have a live slot, verify index.
        auto it = peers.find(s.getPeerId());
        if (it == peers.end() || it->index != i) {
            return false;
        }

        // Accumulate score across slots
        scoreFromSlots += slots[i].getScore();
    }

    // Score across slots must be the same as our allocated score
    if (scoreFromSlots != connectedPeersScore) {
        return false;
    }

    uint32_t scoreFromAllPeers = 0;
    uint32_t scoreFromPeersWithNodes = 0;

    std::unordered_set<COutPoint, SaltedOutpointHasher> peersUtxos;
    for (const auto &p : peers) {
        // Accumulate the score across peers to compare with total known score
        scoreFromAllPeers += p.getScore();

        // A peer should have a proof attached
        if (!p.proof) {
            return false;
        }

        // Check proof pool consistency
        for (const auto &ss : p.proof->getStakes()) {
            const COutPoint &outpoint = ss.getStake().getUTXO();
            auto proof = validProofPool.getProof(outpoint);

            if (!proof) {
                // Missing utxo
                return false;
            }
            if (proof != p.proof) {
                // Wrong proof
                return false;
            }

            if (!peersUtxos.emplace(outpoint).second) {
                // Duplicated utxo
                return false;
            }
        }

        // Count node attached to this peer.
        const auto count_nodes = [&]() {
            size_t count = 0;
            auto &nview = nodes.get<next_request_time>();
            auto begin = nview.lower_bound(
                boost::make_tuple(p.peerid, SteadyMilliseconds()));
            auto end = nview.upper_bound(
                boost::make_tuple(p.peerid + 1, SteadyMilliseconds()));

            for (auto it = begin; it != end; ++it) {
                count++;
            }

            return count;
        };

        if (p.node_count != count_nodes()) {
            return false;
        }

        // If there are no nodes attached to this peer, then we are done.
        if (p.node_count == 0) {
            continue;
        }

        scoreFromPeersWithNodes += p.getScore();
        // The index must point to a slot refering to this peer.
        if (p.index >= slots.size() || slots[p.index].getPeerId() != p.peerid) {
            return false;
        }

        // If the score do not match, same thing.
        if (slots[p.index].getScore() != p.getScore()) {
            return false;
        }

        // Check the proof is in the radix tree only if there are nodes attached
        if (((localProof && p.getProofId() == localProof->getId()) ||
             p.node_count > 0) &&
            shareableProofs.get(p.getProofId()) == nullptr) {
            return false;
        }
        if (p.node_count == 0 &&
            shareableProofs.get(p.getProofId()) != nullptr) {
            return false;
        }
    }

    // Check our accumulated scores against our registred and allocated scores
    if (scoreFromAllPeers != totalPeersScore) {
        return false;
    }
    if (scoreFromPeersWithNodes != connectedPeersScore) {
        return false;
    }

    // We checked the utxo consistency for all our peers utxos already, so if
    // the pool size differs from the expected one there are dangling utxos.
    if (validProofPool.size() != peersUtxos.size()) {
        return false;
    }

    // Check there is no dangling proof in the radix tree
    return shareableProofs.forEachLeaf([&](RCUPtr<const Proof> pLeaf) {
        return isBoundToPeer(pLeaf->getId());
    });
}

PeerId selectPeerImpl(const std::vector<Slot> &slots, const uint64_t slot,
                      const uint64_t max) {
    assert(slot <= max);

    size_t begin = 0, end = slots.size();
    uint64_t bottom = 0, top = max;

    // Try to find the slot using dichotomic search.
    while ((end - begin) > 8) {
        // The slot we picked in not allocated.
        if (slot < bottom || slot >= top) {
            return NO_PEER;
        }

        // Guesstimate the position of the slot.
        size_t i = begin + ((slot - bottom) * (end - begin) / (top - bottom));
        assert(begin <= i && i < end);

        // We have a match.
        if (slots[i].contains(slot)) {
            return slots[i].getPeerId();
        }

        // We undershooted.
        if (slots[i].precedes(slot)) {
            begin = i + 1;
            if (begin >= end) {
                return NO_PEER;
            }

            bottom = slots[begin].getStart();
            continue;
        }

        // We overshooted.
        if (slots[i].follows(slot)) {
            end = i;
            top = slots[end].getStart();
            continue;
        }

        // We have an unalocated slot.
        return NO_PEER;
    }

    // Enough of that nonsense, let fallback to linear search.
    for (size_t i = begin; i < end; i++) {
        // We have a match.
        if (slots[i].contains(slot)) {
            return slots[i].getPeerId();
        }
    }

    // We failed to find a slot, retry.
    return NO_PEER;
}

void PeerManager::addUnbroadcastProof(const ProofId &proofid) {
    // The proof should be bound to a peer
    if (isBoundToPeer(proofid)) {
        m_unbroadcast_proofids.insert(proofid);
    }
}

void PeerManager::removeUnbroadcastProof(const ProofId &proofid) {
    m_unbroadcast_proofids.erase(proofid);
}

bool PeerManager::selectStakingRewardWinner(
    const CBlockIndex *pprev,
    std::vector<std::pair<ProofId, CScript>> &winners) {
    if (!pprev) {
        return false;
    }

    // Don't select proofs that have not been known for long enough, i.e. at
    // least since twice the dangling proof cleanup timeout before the last
    // block time, so we're sure to not account for proofs more recent than the
    // previous block or lacking node connected.
    // The previous block time is capped to now for the unlikely event the
    // previous block time is in the future.
    auto registrationDelay = std::chrono::duration_cast<std::chrono::seconds>(
        4 * Peer::DANGLING_TIMEOUT);
    auto maxRegistrationDelay =
        std::chrono::duration_cast<std::chrono::seconds>(
            6 * Peer::DANGLING_TIMEOUT);
    auto minRegistrationDelay =
        std::chrono::duration_cast<std::chrono::seconds>(
            2 * Peer::DANGLING_TIMEOUT);

    const int64_t refTime = std::min(pprev->GetBlockTime(), GetTime());

    const int64_t targetRegistrationTime = refTime - registrationDelay.count();
    const int64_t maxRegistrationTime = refTime - minRegistrationDelay.count();
    const int64_t minRegistrationTime = refTime - maxRegistrationDelay.count();

    const BlockHash prevblockhash = pprev->GetBlockHash();

    std::vector<ProofRef> selectedProofs;
    ProofRef firstCompliantProof = ProofRef();
    while (selectedProofs.size() < peers.size()) {
        double bestRewardRank = std::numeric_limits<double>::max();
        ProofRef selectedProof = ProofRef();
        int64_t selectedProofRegistrationTime{0};
        StakeContenderId bestRewardHash;

        for (const Peer &peer : peers) {
            if (!peer.proof) {
                // Should never happen, continue
                continue;
            }

            if (!peer.hasFinalized ||
                peer.registration_time.count() >= maxRegistrationTime) {
                continue;
            }

            if (std::find_if(selectedProofs.begin(), selectedProofs.end(),
                             [&peer](const ProofRef &proof) {
                                 return peer.getProofId() == proof->getId();
                             }) != selectedProofs.end()) {
                continue;
            }

            StakeContenderId proofRewardHash(prevblockhash, peer.getProofId());
            if (proofRewardHash == uint256::ZERO) {
                // This either the result of an incredibly unlikely lucky hash,
                // or a the hash is getting abused. In this case, skip the
                // proof.
                LogPrintf(
                    "Staking reward hash has a suspicious value of zero for "
                    "proof %s and blockhash %s, skipping\n",
                    peer.getProofId().ToString(), prevblockhash.ToString());
                continue;
            }

            double proofRewardRank =
                proofRewardHash.ComputeProofRewardRank(peer.getScore());
            // If selectedProof is nullptr, this means that bestRewardRank is
            // MAX_DOUBLE so the comparison will always select this proof as the
            // preferred one. As a consequence it is safe to use 0 as a proofid.
            if (RewardRankComparator()(
                    proofRewardHash, proofRewardRank, peer.getProofId(),
                    bestRewardHash, bestRewardRank,
                    selectedProof ? selectedProof->getId()
                                  : ProofId(uint256::ZERO))) {
                bestRewardRank = proofRewardRank;
                selectedProof = peer.proof;
                selectedProofRegistrationTime = peer.registration_time.count();
                bestRewardHash = proofRewardHash;
            }
        }

        if (!selectedProof) {
            // No winner
            break;
        }

        if (!firstCompliantProof &&
            selectedProofRegistrationTime < targetRegistrationTime) {
            firstCompliantProof = selectedProof;
        }

        selectedProofs.push_back(selectedProof);

        if (selectedProofRegistrationTime < minRegistrationTime &&
            !isFlaky(selectedProof->getId())) {
            break;
        }
    }

    winners.clear();

    if (!firstCompliantProof) {
        return false;
    }

    winners.reserve(selectedProofs.size());

    // Find the winner
    for (const ProofRef &proof : selectedProofs) {
        if (proof->getId() == firstCompliantProof->getId()) {
            winners.push_back({proof->getId(), proof->getPayoutScript()});
        }
    }
    // Add the others (if any) after the winner
    for (const ProofRef &proof : selectedProofs) {
        if (proof->getId() != firstCompliantProof->getId()) {
            winners.push_back({proof->getId(), proof->getPayoutScript()});
        }
    }

    return true;
}

bool PeerManager::setFlaky(const ProofId &proofid) {
    return manualFlakyProofids.insert(proofid).second;
}

bool PeerManager::unsetFlaky(const ProofId &proofid) {
    return manualFlakyProofids.erase(proofid) > 0;
}

bool PeerManager::isFlaky(const ProofId &proofid) const {
    if (localProof && proofid == localProof->getId()) {
        return false;
    }

    if (manualFlakyProofids.count(proofid) > 0) {
        return true;
    }

    // If we are missing connection to this proof, consider flaky
    if (forPeer(proofid,
                [](const Peer &peer) { return peer.node_count == 0; })) {
        return true;
    }

    auto &remoteProofsByNodeId = remoteProofs.get<by_nodeid>();
    auto &nview = nodes.get<next_request_time>();

    std::unordered_map<PeerId, std::unordered_set<ProofId, SaltedProofIdHasher>>
        missing_per_peer;

    // Construct a set of missing proof ids per peer
    double total_score{0};
    for (const Peer &peer : peers) {
        const PeerId peerid = peer.peerid;

        total_score += peer.getScore();

        auto nodes_range = nview.equal_range(peerid);
        for (auto &nit = nodes_range.first; nit != nodes_range.second; ++nit) {
            auto proofs_range = remoteProofsByNodeId.equal_range(nit->nodeid);
            for (auto &proofit = proofs_range.first;
                 proofit != proofs_range.second; ++proofit) {
                if (!proofit->present) {
                    missing_per_peer[peerid].insert(proofit->proofid);
                }
            }
        };
    }

    double missing_score{0};

    // Now compute a score for the missing proof
    for (const auto &[peerid, missingProofs] : missing_per_peer) {
        if (missingProofs.size() > 3) {
            // Ignore peers with too many missing proofs
            continue;
        }

        auto pit = peers.find(peerid);
        if (pit == peers.end()) {
            // Peer not found
            continue;
        }

        if (missingProofs.count(proofid) > 0) {
            missing_score += pit->getScore();
        }
    }

    return (missing_score / total_score) > 0.3;
}

std::optional<bool>
PeerManager::getRemotePresenceStatus(const ProofId &proofid) const {
    auto &remoteProofsView = remoteProofs.get<by_proofid>();
    auto [begin, end] = remoteProofsView.equal_range(proofid);

    if (begin == end) {
        // No remote registered anything yet, we are on our own
        return std::nullopt;
    }

    double total_score{0};
    double present_score{0};
    double missing_score{0};

    for (auto it = begin; it != end; it++) {
        auto nit = nodes.find(it->nodeid);
        if (nit == nodes.end()) {
            // No such node
            continue;
        }

        const PeerId peerid = nit->peerid;

        auto pit = peers.find(peerid);
        if (pit == peers.end()) {
            // Peer not found
            continue;
        }

        uint32_t node_count = pit->node_count;
        if (localProof && pit->getProofId() == localProof->getId()) {
            // If that's our local proof, account for ourself
            ++node_count;
        }

        if (node_count == 0) {
            // should never happen
            continue;
        }

        const double score = double(pit->getScore()) / node_count;

        total_score += score;
        if (it->present) {
            present_score += score;
        } else {
            missing_score += score;
        }
    }

    if (localProof) {
        auto &peersByProofid = peers.get<by_proofid>();

        // Do we have a node connected for that proof ?
        bool present = false;
        auto pit = peersByProofid.find(proofid);
        if (pit != peersByProofid.end()) {
            present = pit->node_count > 0;
        }

        pit = peersByProofid.find(localProof->getId());
        if (pit != peersByProofid.end()) {
            // Also divide by node_count, we can have several nodes even for our
            // local proof.
            const double score =
                double(pit->getScore()) / (1 + pit->node_count);

            total_score += score;
            if (present) {
                present_score += score;
            } else {
                missing_score += score;
            }
        }
    }

    if (present_score / total_score > 0.55) {
        return std::make_optional(true);
    }

    if (missing_score / total_score > 0.55) {
        return std::make_optional(false);
    }

    return std::nullopt;
}

bool PeerManager::dumpPeersToFile(const fs::path &dumpPath) const {
    try {
        const fs::path dumpPathTmp = dumpPath + ".new";
        FILE *filestr = fsbridge::fopen(dumpPathTmp, "wb");
        if (!filestr) {
            return false;
        }

        CAutoFile file{filestr, CLIENT_VERSION};
        file << PEERS_DUMP_VERSION;
        file << uint64_t(peers.size());
        for (const Peer &peer : peers) {
            file << peer.proof;
            file << peer.hasFinalized;
            file << int64_t(peer.registration_time.count());
            file << int64_t(peer.nextPossibleConflictTime.count());
        }

        if (!FileCommit(file.Get())) {
            throw std::runtime_error(strprintf("Failed to commit to file %s",
                                               PathToString(dumpPathTmp)));
        }
        file.fclose();

        if (!RenameOver(dumpPathTmp, dumpPath)) {
            throw std::runtime_error(strprintf("Rename failed from %s to %s",
                                               PathToString(dumpPathTmp),
                                               PathToString(dumpPath)));
        }
    } catch (const std::exception &e) {
        LogPrint(BCLog::AVALANCHE, "Failed to dump the avalanche peers: %s.\n",
                 e.what());
        return false;
    }

    LogPrint(BCLog::AVALANCHE, "Successfully dumped %d peers to %s.\n",
             peers.size(), PathToString(dumpPath));

    return true;
}

bool PeerManager::loadPeersFromFile(
    const fs::path &dumpPath,
    std::unordered_set<ProofRef, SaltedProofHasher> &registeredProofs) {
    registeredProofs.clear();

    FILE *filestr = fsbridge::fopen(dumpPath, "rb");
    CAutoFile file{filestr, CLIENT_VERSION};
    if (file.IsNull()) {
        LogPrint(BCLog::AVALANCHE,
                 "Failed to open avalanche peers file from disk.\n");
        return false;
    }

    try {
        uint64_t version;
        file >> version;

        if (version != PEERS_DUMP_VERSION) {
            LogPrint(BCLog::AVALANCHE,
                     "Unsupported avalanche peers file version.\n");
            return false;
        }

        uint64_t numPeers;
        file >> numPeers;

        auto &peersByProofId = peers.get<by_proofid>();

        for (uint64_t i = 0; i < numPeers; i++) {
            ProofRef proof;
            bool hasFinalized;
            int64_t registrationTime;
            int64_t nextPossibleConflictTime;

            file >> proof;
            file >> hasFinalized;
            file >> registrationTime;
            file >> nextPossibleConflictTime;

            if (registerProof(proof)) {
                auto it = peersByProofId.find(proof->getId());
                if (it == peersByProofId.end()) {
                    // Should never happen
                    continue;
                }

                // We don't modify any key so we don't need to rehash.
                // If the modify fails, it means we don't get the full benefit
                // from the file but we still added our peer to the set. The
                // non-overridden fields will be set the normal way.
                peersByProofId.modify(it, [&](Peer &p) {
                    p.hasFinalized = hasFinalized;
                    p.registration_time =
                        std::chrono::seconds{registrationTime};
                    p.nextPossibleConflictTime =
                        std::chrono::seconds{nextPossibleConflictTime};
                });

                registeredProofs.insert(proof);
            }
        }
    } catch (const std::exception &e) {
        LogPrint(BCLog::AVALANCHE,
                 "Failed to read the avalanche peers file data on disk: %s.\n",
                 e.what());
        return false;
    }

    return true;
}

void PeerManager::cleanupStakeContenders(const int requestedMinHeight) {
    stakeContenderCache.cleanup(requestedMinHeight);
}

void PeerManager::addStakeContender(const ProofRef &proof) {
    const CBlockIndex *tip = WITH_LOCK(cs_main, return chainman.ActiveTip());
    stakeContenderCache.add(tip, proof);

    const BlockHash blockhash = tip->GetBlockHash();
    const ProofId &proofid = proof->getId();
    LogTrace(BCLog::AVALANCHE,
             "Cached stake contender with proofid %s, payout %s at block "
             "%s (height %d) with id %s\n",
             proofid.ToString(), HexStr(proof->getPayoutScript()),
             blockhash.ToString(), tip->nHeight,
             StakeContenderId(blockhash, proofid).ToString());
}

int PeerManager::getStakeContenderStatus(const StakeContenderId &contenderId,
                                         BlockHash &prevblockhashout) const {
    return stakeContenderCache.getVoteStatus(contenderId, prevblockhashout);
}

void PeerManager::acceptStakeContender(const StakeContenderId &contenderId) {
    stakeContenderCache.accept(contenderId);
}

void PeerManager::finalizeStakeContender(
    const StakeContenderId &contenderId, BlockHash &prevblockhash,
    std::vector<std::pair<ProofId, CScript>> &newWinners) {
    stakeContenderCache.finalize(contenderId);

    // Get block hash related to this contender. We should not assume the
    // current chain tip is the block this contender is a winner for.
    getStakeContenderStatus(contenderId, prevblockhash);

    // Calculate the new winners for this block
    stakeContenderCache.getWinners(prevblockhash, newWinners);
}

void PeerManager::rejectStakeContender(const StakeContenderId &contenderId) {
    stakeContenderCache.reject(contenderId);
}

void PeerManager::promoteStakeContendersToBlock(const CBlockIndex *pindex) {
    stakeContenderCache.promoteToBlock(pindex, [&](const ProofId &proofid) {
        return isBoundToPeer(proofid) ||
               // isDangling check appears redundant, but remote proofs are not
               // guaranteed to be cleaned up when one of our peers is removed
               // for dangling too long. Whether or not a proof is dangling is
               // gated by remote presence status, so only proofs that are very
               // poorly connected to the network will stop being promoted.
               (isRemotelyPresentProof(proofid) && isDangling(proofid));
    });
}

bool PeerManager::setContenderStatusForLocalWinners(
    const CBlockIndex *prevblock,
    const std::vector<std::pair<ProofId, CScript>> winners, size_t maxPollable,
    std::vector<StakeContenderId> &pollableContenders) {
    const BlockHash prevblockhash = prevblock->GetBlockHash();
    // Set status for local winners
    for (const auto &winner : winners) {
        const StakeContenderId contenderId(prevblockhash, winner.first);
        stakeContenderCache.finalize(contenderId);
        LogTrace(BCLog::AVALANCHE,
                 "Stake contender set as local winner: proofid %s, payout "
                 "%s at block %s (height %d) with id %s\n",
                 winner.first.ToString(), HexStr(winner.second),
                 prevblockhash.ToString(), prevblock->nHeight,
                 contenderId.ToString());
    }

    // Treat the highest ranking contender similarly to local winners except
    // that it is not automatically included in the winner set (unless it
    // happens to be selected as a local winner).
    if (stakeContenderCache.getPollableContenders(prevblockhash, maxPollable,
                                                  pollableContenders) > 0) {
        // Accept the highest ranking contender. This is a no-op if the highest
        // ranking contender is already the local winner.
        stakeContenderCache.accept(pollableContenders[0]);
        LogTrace(BCLog::AVALANCHE,
                 "Stake contender set as best contender: id %s at block "
                 "%s (height %d)\n",
                 pollableContenders[0].ToString(), prevblockhash.ToString(),
                 prevblock->nHeight);
        return true;
    }

    return false;
}

bool PeerManager::setStakeContenderWinners(
    const CBlockIndex *pindex, const std::vector<CScript> &payoutScripts) {
    return stakeContenderCache.setWinners(pindex, payoutScripts);
}

} // namespace avalanche
