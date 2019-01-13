// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rcu.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

#include <chrono>

struct RCUTest {
    static uint64_t getRevision() { return RCUInfos::revision.load(); }

    static uint64_t hasSynced(uint64_t syncRev) {
        return RCUInfos::infos.hasSynced(syncRev);
    }
};

BOOST_FIXTURE_TEST_SUITE(rcu_tests, BasicTestingSetup)

enum RCUTestStep {
    Init,
    Locked,
    LockAck,
    RCULocked,
    Synchronizing,
    Synchronized,
};

#define WAIT_FOR_STEP(step)                                                    \
    do {                                                                       \
        cond.notify_all();                                                     \
    } while (!cond.wait_for(lock, std::chrono::milliseconds(1),                \
                            [&] { return otherstep == step; }))

void synchronize(std::atomic<RCUTestStep> &step,
                 const std::atomic<RCUTestStep> &otherstep,
                 CWaitableCriticalSection &cs, std::condition_variable &cond,
                 std::atomic<uint64_t> &syncRev) {
    BOOST_CHECK(step == RCUTestStep::Init);

    {
        WAIT_LOCK(cs, lock);
        step = RCUTestStep::Locked;

        // Wait for our lock to be acknowledged.
        WAIT_FOR_STEP(RCUTestStep::LockAck);

        RCULock rculock;

        // Update step.
        step = RCUTestStep::RCULocked;

        // Wait for master.
        WAIT_FOR_STEP(RCUTestStep::RCULocked);
    }

    // Update step.
    syncRev = RCUTest::getRevision() + 1;
    step = RCUTestStep::Synchronizing;

    BOOST_CHECK(!RCUTest::hasSynced(syncRev));

    // We wait for readers.
    RCULock::synchronize();

    // Update step.
    step = RCUTestStep::Synchronized;
}

void lockAndWaitForSynchronize(std::atomic<RCUTestStep> &step,
                               const std::atomic<RCUTestStep> &otherstep,
                               CWaitableCriticalSection &cs,
                               std::condition_variable &cond,
                               std::atomic<uint64_t> &syncRev) {
    BOOST_CHECK(step == RCUTestStep::Init);
    WAIT_LOCK(cs, lock);

    // Wait for th eother thread to be locked.
    WAIT_FOR_STEP(RCUTestStep::Locked);
    step = RCUTestStep::LockAck;

    // Wait for the synchronizing tread to take its RCU lock.
    WAIT_FOR_STEP(RCUTestStep::RCULocked);
    BOOST_CHECK(!RCUTest::hasSynced(syncRev));

    {
        RCULock rculock;

        // Update master step.
        step = RCUTestStep::RCULocked;

        while (RCUTest::getRevision() < syncRev) {
            WAIT_FOR_STEP(RCUTestStep::Synchronizing);
        }

        BOOST_CHECK(RCUTest::getRevision() >= syncRev);
        BOOST_CHECK_EQUAL(otherstep.load(), RCUTestStep::Synchronizing);
    }

    BOOST_CHECK(RCUTest::hasSynced(syncRev));
    WAIT_FOR_STEP(RCUTestStep::Synchronized);
}

static const int COUNT = 128;

BOOST_AUTO_TEST_CASE(synchronize_test) {
    CWaitableCriticalSection cs;
    std::condition_variable cond;
    std::atomic<RCUTestStep> parentstep;
    std::atomic<RCUTestStep> childstep;
    std::atomic<uint64_t> syncRev;

    for (int i = 0; i < COUNT; i++) {
        parentstep = RCUTestStep::Init;
        childstep = RCUTestStep::Init;
        syncRev = RCUTest::getRevision() + 1;

        std::thread tlock([&] {
            lockAndWaitForSynchronize(parentstep, childstep, cs, cond, syncRev);
        });

        std::thread tsync(
            [&] { synchronize(childstep, parentstep, cs, cond, syncRev); });

        tlock.join();
        tsync.join();
    }
}

BOOST_AUTO_TEST_SUITE_END()
