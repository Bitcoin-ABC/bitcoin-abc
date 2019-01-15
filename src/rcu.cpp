// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rcu.h"
#include "sync.h"

#include <algorithm>
#include <chrono>
#include <condition_variable>

std::atomic<uint64_t> RCUInfos::revision{0};
thread_local RCUInfos RCUInfos::infos{};

/**
 * How many time a busy loop runs before yelding.
 */
static const int RCU_ACTIVE_LOOP_COUNT = 10;

/**
 * We maintain a linked list of all the RCUInfos for each active thread. Upon
 * start, a new thread adds itself to the head of the liked list and the node is
 * then removed when the threads shuts down.
 *
 * Insertion is fairly straightforward. The first step is to set the next
 * pointer of the node being inserted as the first node in the list as follow:
 *
 * threadInfos -> Node -> ...
 *                 ^
 *         Nadded -|
 *
 * The second step is to update threadInfos to point on the inserted node. This
 * is done using compare and swap. If the head of the list changed during this
 * process - for instance due to another insertion, CAS will fail and we can
 * start again.
 *
 * threadInfos    Node -> ...
 *     |           ^
 *     \-> Nadded -|
 *
 * Deletion is a slightly more complex process. The general idea is to go over
 * the list, find the parent of the item we want to remove and set it's next
 * pointer to jump over it.
 *
 * Nparent -> Ndelete -> Nchild
 *
 * Nparent    Ndelete -> Nchild
 *    |                    ^
 *    \--------------------|
 *
 * We run into problems when a nodes is deleted concurrently with another node
 * being inserted. Hopefully, we can solve that problem with CAS as well.
 *
 * threadInfos -> Ndelete -> Nchild
 *                   ^
 *           Nadded -|
 *
 * The insertion will try to update threadInfos to point to Nadded, while the
 * deletion will try to update it to point to Nchild. Whichever goes first will
 * cause the other to fail its CAS and restart its process.
 *
 * threadInfos    Ndelete -> Nchild
 *      |            ^
 *      \--> Nadded -|
 *
 * After a successful insertion, threadInfos now points to Nadded, and the CAS
 * to move it to Nchild will fail, causing the deletion process to restart from
 * scratch.
 *
 *      /----------------------|
 *      |                      V
 * threadInfos    Ndelete -> Nchild
 *                   ^
 *           Nadded -|
 *
 * After a succesful deletion, threadInfos now points to NChild and the CAS to
 * move it to Nadded will fail, causing the insertion process to fail.
 *
 * We also run into problems when several nodes are deleted concurrently.
 * Because it is not possible to read Ndelete->next and update Nparent->next
 * atomically, we may end up setting Nparent->next to a stale value if Nchild is
 * deleted.
 *
 *               /----------------------|
 *               |                      V
 * Nparent    Ndelete    Nchild -> Ngrandchild
 *    |                    ^
 *    \--------------------|
 *
 * This would cause Nchild to be 'resurrected', which is obviously a problem. In
 * order to avoid this problem, we make sure that no concurrent deletion takes
 * places using a good old mutex. Using a mutex for deletion also ensures we are
 * safe from the ABA problem.
 *
 * Once a node is deleted from the list, we cannot destroy it right away.
 * Readers do not hold the mutex and may still be using that node. We need to
 * leverage RCU to make sure all the readers have finished their work before
 * allowing the node to be destroyed. We need to keep the mutex during that
 * process, because we just removed our thread from the list of thread to wait
 * for. A concurrent deletion would not wait for us and may end up deleting data
 * we rely on as a result.
 */
static std::atomic<RCUInfos *> threadInfos{nullptr};
static CCriticalSection csThreadInfosDelete;

RCUInfos::RCUInfos() : state(0), next(nullptr) {
    RCUInfos *head = threadInfos.load();
    do {
        next.store(head);
    } while (!threadInfos.compare_exchange_weak(head, this));

    // Release the lock.
    readFree();
}

RCUInfos::~RCUInfos() {
    /**
     * Before the thread is removed from the list, make sure we cleanup
     * everything.
     */
    runCleanups();
    while (cleanups.size() > 0) {
        synchronize();
    }

    while (true) {
        LOCK(csThreadInfosDelete);

        std::atomic<RCUInfos *> *ptr;

        {
            RCULock lock(this);
            ptr = &threadInfos;
            while (true) {
                RCUInfos *current = ptr->load();
                if (current == this) {
                    break;
                }

                assert(current != nullptr);
                ptr = &current->next;
            }
        }

        /**
         * We have our node and the parent is ready to be updated.
         * NB: The CAS operation only checks for *ptr and not for next. This
         * would be a big problem in the general case, but because we only
         * insert at the tip of the list and cannot have concurrent deletion
         * thanks to the use of a mutex, we are safe.
         */
        RCUInfos *current = this;
        if (!ptr->compare_exchange_strong(current, next.load())) {
            continue;
        }

        /**
         * We now wait for possible readers to go past the synchronization
         * point. We need to do so while holding the lock as this operation
         * require us to a be a reader, but we just removed ourselves from the
         * list of reader to check and may therefore not be waited for.
         */
        synchronize();
        break;
    }
}

void RCUInfos::synchronize() {
    uint64_t syncRev = ++revision;

    // Loop a few time lock free.
    for (int i = 0; i < RCU_ACTIVE_LOOP_COUNT; i++) {
        runCleanups();
        if (cleanups.empty() && hasSyncedTo(syncRev)) {
            return;
        }
    }

    // It seems like we have some contention. Let's try to not starve the
    // system. Let's make sure threads that land here proceed one by one.
    // XXX: The best option long term is most likely to use a futex on one of
    // the thread causing synchronization delay so this thread can be waked up
    // at an apropriate time.
    static std::condition_variable cond;
    static CWaitableCriticalSection cs;
    WAIT_LOCK(cs, lock);

    do {
        runCleanups();
        cond.notify_one();
    } while (!cond.wait_for(lock, std::chrono::microseconds(1), [&] {
        return cleanups.empty() && hasSyncedTo(syncRev);
    }));
}

void RCUInfos::runCleanups() {
    // By the time we run a set of cleanups, we may have more cleanups
    // available so we loop until there is nothing available for cleanup.
    while (true) {
        if (cleanups.empty()) {
            // There is nothing to cleanup.
            return;
        }

        auto it = cleanups.begin();
        uint64_t syncedTo = hasSyncedTo(it->first);
        while (it != cleanups.end() && it->first <= syncedTo) {
            // Run the cleanup and remove it from the map.
            it->second();
            cleanups.erase(it++);
        }
    }
}

uint64_t RCUInfos::hasSyncedTo(uint64_t cutoff) {
    uint64_t syncedTo = revision.load();

    // Go over the list and check all threads are past the synchronization
    // point.
    RCULock lock(this);
    RCUInfos *current = threadInfos.load();
    while (current != nullptr) {
        syncedTo = std::min(syncedTo, current->state.load());
        if (syncedTo < cutoff) {
            return 0;
        }

        current = current->next.load();
    }

    return syncedTo;
}
