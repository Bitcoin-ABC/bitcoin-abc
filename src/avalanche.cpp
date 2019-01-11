// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "avalanche.h"

#include "chain.h"
#include "config/bitcoin-config.h"
#include "netmessagemaker.h"
#include "reverse_iterator.h"
#include "scheduler.h"
#include "validation.h"

#include <tuple>

static uint32_t countBits(uint32_t v) {
#if HAVE_DECL___BUILTIN_POPCOUNT
    return __builtin_popcount(v);
#else
    /**
     * Computes the number of bits set in each group of 8bits then uses a
     * multiplication to sum all of them in the 8 most significant bits and
     * return these.
     * More detailed explanation can be found at
     * https://www.playingwithpointers.com/blog/swar.html
     */
    v = v - ((v >> 1) & 0x55555555);
    v = (v & 0x33333333) + ((v >> 2) & 0x33333333);
    return (((v + (v >> 4)) & 0xF0F0F0F) * 0x1010101) >> 24;
#endif
}

bool VoteRecord::registerVote(uint32_t error) {
    /**
     * The result of the vote is determined from the error code. If the error
     * code is 0, there is no error and therefore the vote is yes. If there is
     * an error, we check the most significant bit to decide if the vote is a no
     * (for instance, the block is invalid) or is the vote inconclusive (for
     * instance, the queried node does not have the block yet).
     */
    votes = (votes << 1) | (error == 0);
    consider = (consider << 1) | (int32_t(error) >= 0);

    /**
     * We compute the number of yes and/or no votes as follow:
     *
     * votes:     1010
     * consider:  1100
     *
     * yes votes: 1000 using votes & consider
     * no votes:  0100 using ~votes & consider
     */
    bool yes = countBits(votes & consider & 0xff) > 6;
    if (!yes) {
        bool no = countBits(~votes & consider & 0xff) > 6;
        if (!no) {
            // The round is inconclusive.
            return false;
        }
    }

    // If the round is in agreement with previous rounds, increase confidence.
    if (isAccepted() == yes) {
        confidence += 2;
        return getConfidence() == AVALANCHE_FINALIZATION_SCORE;
    }

    // The round changed our state. We reset the confidence.
    confidence = yes;
    return true;
}

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

int AvalancheProcessor::getConfidence(const CBlockIndex *pindex) const {
    if (auto vr = GetRecord(vote_records, pindex)) {
        return vr->getConfidence();
    }

    return -1;
}

bool AvalancheProcessor::registerVotes(
    NodeId nodeid, const AvalancheResponse &response,
    std::vector<AvalancheBlockUpdate> &updates) {
    {
        // Save the time at which we can query again.
        auto w = peerSet.getWriteView();
        auto it = w->find(nodeid);
        if (it != w->end()) {
            w->modify(it, [&response](Peer &p) {
                // FIXME: This will override the time even when we received an
                // old stale message. This should check that the message is
                // indeed the most up to date one before updating the time.
                p.nextRequestTime =
                    std::chrono::steady_clock::now() +
                    std::chrono::milliseconds(response.getCooldown());
            });
        }
    }

    std::vector<CInv> invs;

    {
        // Check that the query exists.
        auto w = queries.getWriteView();
        auto it = w->find(std::make_tuple(nodeid, response.getRound()));
        if (it == w.end()) {
            // NB: The request may be old, so we don't increase banscore.
            return false;
        }

        invs = std::move(it->invs);
        w->erase(it);
    }

    // Verify that the request and the vote are consistent.
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
            if (!vr.registerVote(v.GetError())) {
                // This vote did not provide any extra information, move on.
                continue;
            }

            if (!vr.hasFinalized()) {
                // This item has note been finalized, so we have nothing more to
                // do.
                updates.emplace_back(
                    pindex, vr.isAccepted()
                                ? AvalancheBlockUpdate::Status::Accepted
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

    return true;
}

bool AvalancheProcessor::addPeer(NodeId nodeid, int64_t score) {
    return peerSet.getWriteView()
        ->insert({nodeid, score, std::chrono::steady_clock::now()})
        .second;
}

namespace {
/**
 * Run the avalanche event loop every 10ms.
 */
static int64_t AVALANCHE_TIME_STEP_MILLISECONDS = 10;
/**
 * Maximum item count that can be polled at once.
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
    cond_running.wait(lock, [this]() EXCLUSIVE_LOCKS_REQUIRED(cs_running) {
        return !running;
    });

    stopRequest = false;
    return true;
}

std::vector<CInv> AvalancheProcessor::getInvsForNextPoll() const {
    std::vector<CInv> invs;

    LOCK(cs_main);

    auto r = vote_records.getReadView();
    for (const std::pair<const CBlockIndex *, VoteRecord> &p :
         reverse_iterate(r)) {
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
    auto r = peerSet.getReadView();
    auto it = r->get<next_request_time>().begin();
    if (it == r->get<next_request_time>().end()) {
        return NO_NODE;
    }

    if (it->nextRequestTime <= std::chrono::steady_clock::now()) {
        return it->nodeid;
    }

    return NO_NODE;
}

void AvalancheProcessor::runEventLoop() {
    auto now = std::chrono::steady_clock::now();

    {
        // Clear expired requests.
        auto w = queries.getWriteView();
        auto it = w->get<query_timeout>().begin();
        while (it != w->get<query_timeout>().end() && it->timeout < now) {
            w->get<query_timeout>().erase(it++);
        }
    }

    std::vector<CInv> invs = getInvsForNextPoll();
    if (invs.empty()) {
        // If there are no invs to poll, we are done.
        return;
    }

    while (true) {
        NodeId nodeid = getSuitableNodeToQuery();
        if (nodeid == NO_NODE) {
            return;
        }

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
                auto w = peerSet.getWriteView();
                auto it = w->find(pnode->GetId());
                if (it != w->end()) {
                    w->modify(it, [&timeout](Peer &p) {
                        p.nextRequestTime = timeout;
                    });
                }
            }

            // Send the query to the node.
            connman->PushMessage(
                pnode,
                CNetMsgMaker(pnode->GetSendVersion())
                    .Make(NetMsgType::AVAPOLL,
                          AvalanchePoll(current_round, std::move(invs))));
            return true;
        });

        // Success!
        if (hasSent) {
            return;
        }

        // This node is obsolete, delete it.
        peerSet.getWriteView()->erase(nodeid);
    }
}
