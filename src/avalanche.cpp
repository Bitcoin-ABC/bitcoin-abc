// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "avalanche.h"

#include "chain.h"
#include "netmessagemaker.h"
#include "scheduler.h"
#include "validation.h"

#include <boost/range/adaptor/reversed.hpp>

bool AvalancheProcessor::addBlockToReconcile(const CBlockIndex *pindex) {
    return vote_records.getWriteView()
        ->insert(std::make_pair(pindex, VoteRecord()))
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
    const AvalancheResponse &response,
    std::vector<AvalancheBlockUpdate> &updates) {
    const std::vector<AvalancheVote> &votes = response.GetVotes();

    std::map<CBlockIndex *, AvalancheVote> responseIndex;

    {
        LOCK(cs_main);
        for (auto &v : votes) {
            BlockMap::iterator mi = mapBlockIndex.find(v.GetHash());
            if (mi == mapBlockIndex.end()) {
                // This should not happen, but just in case...
                continue;
            }

            responseIndex.insert(std::make_pair(mi->second, v));
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
        const VoteRecord &v = p.second;
        if (v.hasFinalized()) {
            // If this has finalized, we can just skip.
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
