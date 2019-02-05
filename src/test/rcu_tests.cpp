// Copyright (c) 2018 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "rcu.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

#include <chrono>

struct RCUTest {
    static uint64_t getRevision() { return RCUInfos::revision.load(); }

    static uint64_t hasSyncedTo(uint64_t syncRev) {
        return RCUInfos::infos.hasSyncedTo(syncRev);
    }

    static std::map<uint64_t, std::function<void()>> &getCleanups() {
        return RCUInfos::infos.cleanups;
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
    assert(step == RCUTestStep::Init);

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

    assert(!RCUTest::hasSyncedTo(syncRev));

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
    assert(step == RCUTestStep::Init);
    WAIT_LOCK(cs, lock);

    // Wait for th eother thread to be locked.
    WAIT_FOR_STEP(RCUTestStep::Locked);
    step = RCUTestStep::LockAck;

    // Wait for the synchronizing tread to take its RCU lock.
    WAIT_FOR_STEP(RCUTestStep::RCULocked);
    assert(!RCUTest::hasSyncedTo(syncRev));

    {
        RCULock rculock;

        // Update master step.
        step = RCUTestStep::RCULocked;

        while (RCUTest::getRevision() < syncRev) {
            WAIT_FOR_STEP(RCUTestStep::Synchronizing);
        }

        assert(RCUTest::getRevision() >= syncRev);
        assert(otherstep.load() == RCUTestStep::Synchronizing);
    }

    assert(RCUTest::hasSyncedTo(syncRev) >= syncRev);
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

BOOST_AUTO_TEST_CASE(cleanup_test) {
    RCULock::synchronize();
    BOOST_CHECK(RCUTest::getCleanups().empty());

    bool isClean1 = false;
    RCULock::registerCleanup([&] { isClean1 = true; });

    BOOST_CHECK(!isClean1);
    BOOST_CHECK_EQUAL(RCUTest::getCleanups().size(), 1);
    BOOST_CHECK_EQUAL(RCUTest::getRevision(),
                      RCUTest::getCleanups().begin()->first);

    // Synchronize runs the cleanups.
    RCULock::synchronize();
    BOOST_CHECK(RCUTest::getCleanups().empty());
    BOOST_CHECK(isClean1);

    // Check multiple callbacks.
    isClean1 = false;
    bool isClean2 = false;
    bool isClean3 = false;
    RCULock::registerCleanup([&] { isClean1 = true; });
    RCULock::registerCleanup([&] { isClean2 = true; });
    RCULock::registerCleanup([&] { isClean3 = true; });

    BOOST_CHECK_EQUAL(RCUTest::getCleanups().size(), 3);
    RCULock::synchronize();
    BOOST_CHECK(RCUTest::getCleanups().empty());
    BOOST_CHECK(isClean1);
    BOOST_CHECK(isClean2);
    BOOST_CHECK(isClean3);

    // Check callbacks adding each others.
    isClean1 = false;
    isClean2 = false;
    isClean3 = false;

    RCULock::registerCleanup([&] {
        isClean1 = true;
        RCULock::registerCleanup([&] {
            isClean2 = true;
            RCULock::registerCleanup([&] { isClean3 = true; });
        });
    });

    BOOST_CHECK_EQUAL(RCUTest::getCleanups().size(), 1);
    RCULock::synchronize();
    BOOST_CHECK(RCUTest::getCleanups().empty());
    BOOST_CHECK(isClean1);
    BOOST_CHECK(isClean2);
    BOOST_CHECK(isClean3);
}

class RCURefTestItem {
    IMPLEMENT_RCU_REFCOUNT(uint32_t);
    const std::function<void()> cleanupfun;

public:
    explicit RCURefTestItem(const std::function<void()> &fun)
        : cleanupfun(fun) {}
    ~RCURefTestItem() { cleanupfun(); }

    uint32_t getRefCount() const { return refcount.load(); }
};

BOOST_AUTO_TEST_CASE(rcuptr_test) {
    // Make sure it works for null.
    {
        RCURefTestItem *ptr = nullptr;
        RCUPtr<RCURefTestItem>::copy(ptr);
        RCUPtr<RCURefTestItem>::acquire(ptr);
    }

    // Check the destruction mechanism.
    bool isDestroyed = false;

    {
        auto rcuptr = RCUPtr<RCURefTestItem>::make([&] { isDestroyed = true; });
        BOOST_CHECK_EQUAL(rcuptr->getRefCount(), 0);
    }

    // rcuptr waits for synchronization to destroy.
    BOOST_CHECK(!isDestroyed);
    RCULock::synchronize();
    BOOST_CHECK(isDestroyed);

    // Check that copy behaves properly.
    isDestroyed = false;
    RCUPtr<RCURefTestItem> gptr;

    {
        auto rcuptr = RCUPtr<RCURefTestItem>::make([&] { isDestroyed = true; });
        BOOST_CHECK_EQUAL(rcuptr->getRefCount(), 0);

        gptr = rcuptr;
        BOOST_CHECK_EQUAL(rcuptr->getRefCount(), 1);
        BOOST_CHECK_EQUAL(gptr->getRefCount(), 1);

        auto rcuptrcopy = rcuptr;
        BOOST_CHECK_EQUAL(rcuptrcopy->getRefCount(), 2);
        BOOST_CHECK_EQUAL(rcuptr->getRefCount(), 2);
        BOOST_CHECK_EQUAL(gptr->getRefCount(), 2);
    }

    BOOST_CHECK_EQUAL(gptr->getRefCount(), 0);
    RCULock::synchronize();
    BOOST_CHECK(!isDestroyed);

    gptr = RCUPtr<RCURefTestItem>();
    BOOST_CHECK(!isDestroyed);
    RCULock::synchronize();
    BOOST_CHECK(isDestroyed);
}

BOOST_AUTO_TEST_CASE(rcuptr_operator_test) {
    auto gptr = RCUPtr<RCURefTestItem>();
    auto ptr = new RCURefTestItem([] {});
    auto oldPtr = ptr;

    auto altptr = RCUPtr<RCURefTestItem>::make([] {});

    // Check various operators.
    BOOST_CHECK_EQUAL(gptr.get(), NULLPTR(RCURefTestItem));
    BOOST_CHECK_EQUAL(&*gptr, NULLPTR(RCURefTestItem));
    BOOST_CHECK_EQUAL(gptr, NULLPTR(RCURefTestItem));
    BOOST_CHECK(!gptr);

    auto copyptr = gptr;
    BOOST_CHECK(gptr == nullptr);
    BOOST_CHECK(gptr != oldPtr);
    BOOST_CHECK(gptr == copyptr);
    BOOST_CHECK(gptr != altptr);

    gptr = RCUPtr<RCURefTestItem>::acquire(ptr);
    BOOST_CHECK_EQUAL(ptr, NULLPTR(RCURefTestItem));

    BOOST_CHECK_EQUAL(gptr.get(), oldPtr);
    BOOST_CHECK_EQUAL(&*gptr, oldPtr);
    BOOST_CHECK_EQUAL(gptr, oldPtr);
    BOOST_CHECK(gptr);

    copyptr = gptr;
    BOOST_CHECK(gptr != nullptr);
    BOOST_CHECK(gptr == oldPtr);
    BOOST_CHECK(gptr == copyptr);
    BOOST_CHECK(gptr != altptr);
}

BOOST_AUTO_TEST_CASE(const_rcuptr_test) {
    bool isDestroyed = false;
    auto ptr = RCUPtr<const RCURefTestItem>::make([&] { isDestroyed = true; });

    // Now let's destroy it.
    ptr = RCUPtr<const RCURefTestItem>();
    BOOST_CHECK(!isDestroyed);
    RCULock::synchronize();
    BOOST_CHECK(isDestroyed);
}

class RCURefMoveTestItem {
    const std::function<void()> cleanupfun;

public:
    explicit RCURefMoveTestItem(const std::function<void()> &fun)
        : cleanupfun(fun) {}
    ~RCURefMoveTestItem() { cleanupfun(); }

    void acquire() {
        throw std::runtime_error("RCUPtr incremented the refcount");
    }
    void release() {
        RCULock::registerCleanup([this] { delete this; });
    }
};

BOOST_AUTO_TEST_CASE(move_rcuptr_test) {
    bool isDestroyed = false;

    // Check tat copy is failing.
    auto rcuptr1 =
        RCUPtr<RCURefMoveTestItem>::make([&] { isDestroyed = true; });
    BOOST_CHECK_THROW(rcuptr1->acquire(), std::runtime_error);
    BOOST_CHECK_THROW(auto rcuptrcopy = rcuptr1;, std::runtime_error);

    // Try to move.
    auto rcuptr2 = std::move(rcuptr1);
    RCULock::synchronize();
    BOOST_CHECK(!isDestroyed);

    // Move to a local and check proper destruction.
    { auto rcuptr3 = std::move(rcuptr2); }

    BOOST_CHECK(!isDestroyed);
    RCULock::synchronize();
    BOOST_CHECK(isDestroyed);

    // Let's try to swap.
    isDestroyed = false;
    rcuptr1 = RCUPtr<RCURefMoveTestItem>::make([&] { isDestroyed = true; });
    std::swap(rcuptr1, rcuptr2);

    RCULock::synchronize();
    BOOST_CHECK(!isDestroyed);

    // Chain moves to make sure there are no double free.
    {
        auto rcuptr3 = std::move(rcuptr2);
        auto rcuptr4 = std::move(rcuptr3);
        std::swap(rcuptr1, rcuptr4);
    }

    RCULock::synchronize();
    BOOST_CHECK(!isDestroyed);

    // Check we can return from a function.
    {
        auto r = ([&] {
            auto moved = std::move(rcuptr1);
            return moved;
        })();

        RCULock::synchronize();
        BOOST_CHECK(!isDestroyed);
    }

    BOOST_CHECK(!isDestroyed);
    RCULock::synchronize();
    BOOST_CHECK(isDestroyed);

    // Acquire/release workflow.
    isDestroyed = false;
    auto ptr = new RCURefMoveTestItem([&] { isDestroyed = true; });
    auto ptrCopy = ptr;
    BOOST_CHECK_THROW(RCUPtr<RCURefMoveTestItem>::copy(ptr),
                      std::runtime_error);

    rcuptr1 = RCUPtr<RCURefMoveTestItem>::acquire(ptr);
    BOOST_CHECK_EQUAL(rcuptr1, ptrCopy);
    BOOST_CHECK_EQUAL(ptr, NULLPTR(RCURefMoveTestItem));

    ptr = rcuptr1.release();
    BOOST_CHECK_EQUAL(rcuptr1, NULLPTR(RCURefMoveTestItem));
    BOOST_CHECK_EQUAL(ptr, ptrCopy);

    RCULock::synchronize();
    BOOST_CHECK(!isDestroyed);

    RCUPtr<RCURefMoveTestItem>::acquire(ptr);
    BOOST_CHECK_EQUAL(ptr, NULLPTR(RCURefMoveTestItem));
    BOOST_CHECK(!isDestroyed);
    RCULock::synchronize();
    BOOST_CHECK(isDestroyed);
}

BOOST_AUTO_TEST_SUITE_END()
