// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <consensus/validation.h>
#include <primitives/block.h>
#include <scheduler.h>
#include <util/check.h>
#include <validation.h>
#include <validationinterface.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(validationinterface_tests, ChainTestingSetup)

struct TestSubscriberNoop final : public CValidationInterface {
    void BlockChecked(const CBlock &, const BlockValidationState &) override {}
};

BOOST_AUTO_TEST_CASE(unregister_validation_interface_race) {
    std::atomic<bool> generate{true};

    // Start thread to generate notifications
    std::thread gen{[&] {
        const CBlock block_dummy;
        BlockValidationState state_dummy;
        while (generate) {
            GetMainSignals().BlockChecked(block_dummy, state_dummy);
        }
    }};

    // Start thread to consume notifications
    std::thread sub{[&] {
        // keep going for about 1 sec, which is 250k iterations
        for (int i = 0; i < 250000; i++) {
            auto subscriber = std::make_shared<TestSubscriberNoop>();
            RegisterSharedValidationInterface(subscriber);
            UnregisterSharedValidationInterface(subscriber);
        }
        // tell the other thread we are done
        generate = false;
    }};

    gen.join();
    sub.join();
    BOOST_CHECK(!generate);
}

class TestInterface : public CValidationInterface {
public:
    TestInterface(std::function<void()> onBlockChecked_call = nullptr,
                  std::function<void(const CBlockIndex *)>
                      onBlockFinalized_call = nullptr,
                  std::function<void()> on_destroy = nullptr)
        : m_onBlockChecked_call(std::move(onBlockChecked_call)),
          m_onBlockFinalized_call(std::move(onBlockFinalized_call)),
          m_on_destroy(std::move(on_destroy)) {}
    virtual ~TestInterface() {
        if (m_on_destroy) {
            m_on_destroy();
        }
    }
    void BlockChecked(const CBlock &block,
                      const BlockValidationState &state) override {
        if (m_onBlockChecked_call) {
            m_onBlockChecked_call();
        }
    }
    static void CallBlockChecked() {
        CBlock block;
        BlockValidationState state;
        GetMainSignals().BlockChecked(block, state);
    }

    void BlockFinalized(const CBlockIndex *pindex) override {
        if (m_onBlockFinalized_call) {
            m_onBlockFinalized_call(pindex);
        }
    }

    static void CallBlockFinalized(const CBlockIndex *pindex) {
        GetMainSignals().BlockFinalized(pindex);
    }

    std::function<void()> m_onBlockChecked_call;
    std::function<void(const CBlockIndex *)> m_onBlockFinalized_call;
    std::function<void()> m_on_destroy;
};

// Regression test to ensure UnregisterAllValidationInterfaces calls don't
// destroy a validation interface while it is being called. Bug:
// https://github.com/bitcoin/bitcoin/pull/18551
BOOST_AUTO_TEST_CASE(unregister_all_during_call) {
    bool destroyed = false;
    RegisterSharedValidationInterface(std::make_shared<TestInterface>(
        [&] {
            // First call should decrements reference count 2 -> 1
            UnregisterAllValidationInterfaces();
            BOOST_CHECK(!destroyed);
            // Second call should not decrement reference count 1 -> 0
            UnregisterAllValidationInterfaces();
            BOOST_CHECK(!destroyed);
        },
        nullptr, [&] { destroyed = true; }));
    TestInterface::CallBlockChecked();
    BOOST_CHECK(destroyed);
}

BOOST_FIXTURE_TEST_CASE(block_finalized, TestChain100Setup) {
    uint32_t callCount = 0;
    const CBlockIndex *calledIndex;
    RegisterSharedValidationInterface(std::make_shared<TestInterface>(
        nullptr,
        [&](const CBlockIndex *pindex) {
            callCount++;
            calledIndex = pindex;
        },
        nullptr));

    for (size_t i = 0; i < 10; i++) {
        TestInterface::CallBlockFinalized(nullptr);
    }
    SyncWithValidationInterfaceQueue();
    BOOST_CHECK_EQUAL(callCount, 10);
    BOOST_CHECK_EQUAL(calledIndex, nullptr);

    CBlockIndex *tip = WITH_LOCK(m_node.chainman->GetMutex(),
                                 return m_node.chainman->ActiveTip());
    int tipHeight = WITH_LOCK(m_node.chainman->GetMutex(),
                              return m_node.chainman->ActiveHeight());

    // If pindex is null the following test is pointless
    BOOST_CHECK_NE(tip, nullptr);

    callCount = 0;
    CBlockIndex *pindex = tip;
    while (pindex) {
        TestInterface::CallBlockFinalized(pindex);
        SyncWithValidationInterfaceQueue();
        BOOST_CHECK_EQUAL(calledIndex, pindex);
        pindex = pindex->pprev;
    }

    // Make sure the test function was actually called
    BOOST_CHECK_EQUAL(callCount, tipHeight + 1);

    // Check calling from AvalancheFinalizedBlock
    Chainstate &activeChainState = m_node.chainman->ActiveChainstate();

    callCount = 0;
    calledIndex = nullptr;
    BOOST_CHECK(!activeChainState.AvalancheFinalizeBlock(nullptr));
    SyncWithValidationInterfaceQueue();
    BOOST_CHECK_EQUAL(callCount, 0);
    BOOST_CHECK_EQUAL(calledIndex, nullptr);

    BOOST_CHECK(activeChainState.AvalancheFinalizeBlock(tip));
    SyncWithValidationInterfaceQueue();
    BOOST_CHECK_EQUAL(callCount, 1);
    BOOST_CHECK_EQUAL(calledIndex, tip);

    // Successive calls won't call the validation again, because the block is
    // already finalized.
    for (size_t i = 0; i < 10; i++) {
        BOOST_CHECK(activeChainState.AvalancheFinalizeBlock(tip));
        SyncWithValidationInterfaceQueue();
        BOOST_CHECK_EQUAL(callCount, 1);
        BOOST_CHECK_EQUAL(calledIndex, tip);
    }
}

BOOST_AUTO_TEST_SUITE_END()
