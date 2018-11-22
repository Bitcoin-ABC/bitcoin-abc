// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "avalanche.h"

#include "chain.h"
#include "netmessagemaker.h"
#include "scheduler.h"
#include "validation.h"

#include <boost/range/adaptor/reversed.hpp>

static bool IsWorthPolling(const CBlockIndex *pindex) {
    AssertLockHeld(cs_main);

    if (pindex->nStatus.isInvalid()) {
        // No point polling invalid blocks.
        return false;
    }

    if (IsBlockFinalized(pindex)) {
        // There is no point polling finalized block.
        return false;
    }

    return true;
}

bool AvalancheProcessor::addBlockToReconcile(const CBlockIndex *pindex) {
    bool isAccepted;

    {
        LOCK(cs_main);
        if (!IsWorthPolling(pindex)) {
            // There is no point polling this block.
            return false;
        }

        isAccepted = chainActive.Contains(pindex);
    }

    return vote_records.getWriteView()
        ->insert(std::make_pair(pindex, VoteRecord(isAccepted)))
        .second;
}

static const VoteRecord *
GetRecord(const RWCollection<BlockVoteMap> &vote_records,
          const CBlockIndex *pindex) {
    auto r = vote_records.getReadView();
    auto it = r->find(pindex);
    if (it == r.end()) {
        return nullptr;
    }

    return &it->second;
}

bool AvalancheProcessor::isAccepted(const CBlockIndex *pindex) const {
    if (auto vr = GetRecord(vote_records, pindex)) {
        return vr->isAccepted();
    }

    return false;
}

bool AvalancheProcessor::registerVotes(
    NodeId nodeid, const AvalancheResponse &response,
    std::vector<AvalancheBlockUpdate> &updates) {
    RequestRecord r;

    {
        // Check that the query exists.
        auto w = queries.getWriteView();
        auto it = w->find(nodeid);
        if (it == w.end()) {
            // NB: The request may be old, so we don't increase banscore.
            return false;
        }

        r = std::move(it->second);
        w->erase(it);
    }

    // Verify that the request and the vote are consistent.
    const std::vector<CInv> &invs = r.GetInvs();
    const std::vector<AvalancheVote> &votes = response.GetVotes();
    size_t size = invs.size();
    if (votes.size() != size) {
        // TODO: increase banscore for inconsistent response.
        // NB: This isn't timeout but actually node misbehaving.
        return false;
    }

    for (size_t i = 0; i < size; i++) {
        if (invs[i].hash != votes[i].GetHash()) {
            // TODO: increase banscore for inconsistent response.
            // NB: This isn't timeout but actually node misbehaving.
            return false;
        }
    }

    std::map<CBlockIndex *, AvalancheVote> responseIndex;

    {
        LOCK(cs_main);
        for (auto &v : votes) {
            BlockMap::iterator mi = mapBlockIndex.find(v.GetHash());
            if (mi == mapBlockIndex.end()) {
                // This should not happen, but just in case...
                continue;
            }

            CBlockIndex *pindex = mi->second;
            if (!IsWorthPolling(pindex)) {
                // There is no point polling this block.
                continue;
            }

            responseIndex.insert(std::make_pair(pindex, v));
        }
    }

    {
        // Register votes.
        auto w = vote_records.getWriteView();
        for (auto &p : responseIndex) {
            CBlockIndex *pindex = p.first;
            const AvalancheVote &v = p.second;

            auto it = w->find(pindex);
            if (it == w.end()) {
                // We are not voting on that item anymore.
                continue;
            }

            auto &vr = it->second;
            if (!vr.registerVote(v.IsValid())) {
                // This vote did not provide any extra information, move on.
                continue;
            }

            if (!vr.hasFinalized()) {
                // This item has note been finalized, so we have nothing more to
                // do.
                updates.emplace_back(
                    pindex,
                    vr.isAccepted() ? AvalancheBlockUpdate::Status::Accepted
                                    : AvalancheBlockUpdate::Status::Rejected);
                continue;
            }

            // We just finalized a vote. If it is valid, then let the caller
            // know. Either way, remove the item from the map.
            updates.emplace_back(pindex,
                                 vr.isAccepted()
                                     ? AvalancheBlockUpdate::Status::Finalized
                                     : AvalancheBlockUpdate::Status::Invalid);
            w->erase(it);
        }
    }

    // Put the node back in the list of queriable nodes.
    auto w = nodeids.getWriteView();
    w->insert(nodeid);
    return true;
}

namespace {
/**
 * Run the avalanche event loop every 10ms.
 */
static int64_t AVALANCHE_TIME_STEP_MILLISECONDS = 10;
/**
 * Maximum item that can be polled at once.
 */
static size_t AVALANCHE_MAX_ELEMENT_POLL = 4096;
}

bool AvalancheProcessor::startEventLoop(CScheduler &scheduler) {
    LOCK(cs_running);
    if (running) {
        // Do not start the event loop twice.
        return false;
    }

    running = true;

    // Start the event loop.
    scheduler.scheduleEvery(
        [this]() -> bool {
            runEventLoop();
            if (!stopRequest) {
                return true;
            }

            LOCK(cs_running);
            running = false;

            cond_running.notify_all();

            // A stop request was made.
            return false;
        },
        AVALANCHE_TIME_STEP_MILLISECONDS);

    return true;
}

bool AvalancheProcessor::stopEventLoop() {
    WAIT_LOCK(cs_running, lock);
    if (!running) {
        return false;
    }

    // Request avalanche to stop.
    stopRequest = true;

    // Wait for avalanche to stop.
    cond_running.wait(lock, [this] { return !running; });

    stopRequest = false;
    return true;
}

std::vector<CInv> AvalancheProcessor::getInvsForNextPoll() const {
    std::vector<CInv> invs;

    auto r = vote_records.getReadView();
    for (const std::pair<const CBlockIndex *, VoteRecord> &p :
         boost::adaptors::reverse(r)) {
        const CBlockIndex *pindex = p.first;
        if (!IsWorthPolling(pindex)) {
            // Obviously do not poll if the block is not worth polling.
            continue;
        }

        // We don't have a decision, we need more votes.
        invs.emplace_back(MSG_BLOCK, p.first->GetBlockHash());
        if (invs.size() >= AVALANCHE_MAX_ELEMENT_POLL) {
            // Make sure we do not produce more invs than specified by the
            // protocol.
            return invs;
        }
    }

    return invs;
}

NodeId AvalancheProcessor::getSuitableNodeToQuery() {
    auto w = nodeids.getWriteView();
    if (w->empty()) {
        auto r = queries.getReadView();

        // We don't have any candidate node, so let's try to find some.
        connman->ForEachNode([&w, &r](CNode *pnode) {
            // If this node doesn't support avalanche, we remove.
            if (!(pnode->nServices & NODE_AVALANCHE)) {
                return;
            }

            // if we have a request in flight for that node.
            if (r->find(pnode->GetId()) != r.end()) {
                return;
            }

            w->insert(pnode->GetId());
        });
    }

    // We don't have any suitable candidate.
    if (w->empty()) {
        return -1;
    }

    auto it = w.begin();
    NodeId nodeid = *it;
    w->erase(it);

    return nodeid;
}

void AvalancheProcessor::runEventLoop() {
    std::vector<CInv> invs = getInvsForNextPoll();
    if (invs.empty()) {
        // If there are no invs to poll, we are done.
        return;
    }

    NodeId nodeid = getSuitableNodeToQuery();

    /**
     * If we lost contact to that node, then we remove it from nodeids, but
     * never add the request to queries, which ensures bad nodes get cleaned up
     * over time.
     */
    connman->ForNode(nodeid, [this, &invs](CNode *pnode) {
        {
            // Register the query.
            queries.getWriteView()->emplace(
                pnode->GetId(), RequestRecord(GetAdjustedTime(), invs));
        }

        // Send the query to the node.
        connman->PushMessage(
            pnode,
            CNetMsgMaker(pnode->GetSendVersion())
                .Make(NetMsgType::AVAPOLL,
                      AvalanchePoll(round++, std::move(invs))));
        return true;
    });
}
