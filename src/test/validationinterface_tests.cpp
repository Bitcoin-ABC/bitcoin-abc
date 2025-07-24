// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <avalanche/processor.h>
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
                  std::function<void(const CBlockIndex *,
                                     const std::shared_ptr<const CBlock> &)>
                      onBlockInvalidated_call = nullptr,
                  std::function<void(const CTransactionRef &)>
                      onTransactionFinalized_call = nullptr,
                  std::function<void(const CTransactionRef &)>
                      onTransactionInvalidated_call = nullptr,
                  std::function<void()> on_destroy = nullptr)
        : m_onBlockChecked_call(std::move(onBlockChecked_call)),
          m_onBlockFinalized_call(std::move(onBlockFinalized_call)),
          m_onBlockInvalidated_call(std::move(onBlockInvalidated_call)),
          m_onTransactionFinalized_call(std::move(onTransactionFinalized_call)),
          m_onTransactionInvalidated_call(
              std::move(onTransactionInvalidated_call)),
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

    void BlockInvalidated(const CBlockIndex *pindex,
                          const std::shared_ptr<const CBlock> &block) override {
        if (m_onBlockInvalidated_call) {
            m_onBlockInvalidated_call(pindex, block);
        }
    }

    static void
    CallBlockInvalidated(const CBlockIndex *pindex,
                         const std::shared_ptr<const CBlock> &block) {
        GetMainSignals().BlockInvalidated(pindex, block);
    }

    void TransactionFinalized(const CTransactionRef &tx) override {
        if (m_onTransactionFinalized_call) {
            m_onTransactionFinalized_call(tx);
        }
    }

    static void CallTransactionFinalized(const CTransactionRef &tx) {
        GetMainSignals().TransactionFinalized(tx);
    }

    void TransactionInvalidated(const CTransactionRef &tx) override {
        if (m_onTransactionInvalidated_call) {
            m_onTransactionInvalidated_call(tx);
        }
    }

    static void CallTransactionInvalidated(const CTransactionRef &tx) {
        GetMainSignals().TransactionInvalidated(tx);
    }

    std::function<void()> m_onBlockChecked_call;
    std::function<void(const CBlockIndex *)> m_onBlockFinalized_call;
    std::function<void(const CBlockIndex *,
                       const std::shared_ptr<const CBlock> &)>
        m_onBlockInvalidated_call;
    std::function<void(const CTransactionRef &)> m_onTransactionFinalized_call;
    std::function<void(const CTransactionRef &)>
        m_onTransactionInvalidated_call;
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
        nullptr, nullptr, nullptr, nullptr, [&] { destroyed = true; }));
    TestInterface::CallBlockChecked();
    BOOST_CHECK(destroyed);
}

BOOST_FIXTURE_TEST_CASE(block_finalized, TestChain100Setup) {
    uint32_t callCount = 0;
    const CBlockIndex *calledIndex;
    RegisterSharedValidationInterface(std::make_shared<TestInterface>(
        nullptr, [&](const CBlockIndex *pindex) {
            callCount++;
            calledIndex = pindex;
        }));

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

    bilingual_str error;
    auto avalanche = avalanche::Processor::MakeProcessor(
        *m_node.args, *m_node.chain, m_node.connman.get(), *m_node.chainman,
        m_node.mempool.get(), *m_node.scheduler, error);

    // Check calling from AvalancheFinalizedBlock
    Chainstate &activeChainState = m_node.chainman->ActiveChainstate();

    callCount = 0;
    calledIndex = nullptr;
    {
        LOCK(::cs_main);
        BOOST_CHECK(
            !activeChainState.AvalancheFinalizeBlock(nullptr, *avalanche));
    }
    SyncWithValidationInterfaceQueue();
    BOOST_CHECK_EQUAL(callCount, 0);
    BOOST_CHECK_EQUAL(calledIndex, nullptr);

    {
        LOCK(::cs_main);
        BOOST_CHECK(activeChainState.AvalancheFinalizeBlock(tip, *avalanche));
    }
    SyncWithValidationInterfaceQueue();
    BOOST_CHECK_EQUAL(callCount, 1);
    BOOST_CHECK_EQUAL(calledIndex, tip);

    // Successive calls won't call the validation again, because the block is
    // already finalized.
    for (size_t i = 0; i < 10; i++) {
        {
            LOCK(::cs_main);
            BOOST_CHECK(
                activeChainState.AvalancheFinalizeBlock(tip, *avalanche));
        }
        SyncWithValidationInterfaceQueue();
        BOOST_CHECK_EQUAL(callCount, 1);
        BOOST_CHECK_EQUAL(calledIndex, tip);
    }
}

BOOST_FIXTURE_TEST_CASE(block_invalidated, TestChain100Setup) {
    uint32_t callCount = 0;
    const CBlockIndex *calledIndex;
    std::shared_ptr<const CBlock> calledBlock;
    RegisterSharedValidationInterface(std::make_shared<TestInterface>(
        nullptr, nullptr,
        [&](const CBlockIndex *pindex,
            const std::shared_ptr<const CBlock> &block) {
            callCount++;
            calledIndex = pindex;
            calledBlock = block;
        }));

    for (size_t i = 0; i < 10; i++) {
        TestInterface::CallBlockInvalidated(nullptr, nullptr);
    }
    SyncWithValidationInterfaceQueue();
    BOOST_CHECK_EQUAL(callCount, 10);
    BOOST_CHECK_EQUAL(calledIndex, nullptr);
    BOOST_CHECK_EQUAL(calledBlock, nullptr);

    callCount = 0;

    CBlockIndex index;
    for (size_t i = 0; i < 10; i++) {
        TestInterface::CallBlockInvalidated(&index, nullptr);
    }
    SyncWithValidationInterfaceQueue();
    BOOST_CHECK_EQUAL(callCount, 10);
    BOOST_CHECK_EQUAL(calledIndex, &index);
    BOOST_CHECK_EQUAL(calledBlock, nullptr);

    callCount = 0;

    auto block = std::make_shared<const CBlock>();
    for (size_t i = 0; i < 10; i++) {
        TestInterface::CallBlockInvalidated(nullptr, block);
    }
    SyncWithValidationInterfaceQueue();
    BOOST_CHECK_EQUAL(callCount, 10);
    BOOST_CHECK_EQUAL(calledIndex, nullptr);
    BOOST_CHECK_EQUAL(calledBlock, block);

    callCount = 0;

    for (size_t i = 0; i < 10; i++) {
        TestInterface::CallBlockInvalidated(&index, block);
    }
    SyncWithValidationInterfaceQueue();
    BOOST_CHECK_EQUAL(callCount, 10);
    BOOST_CHECK_EQUAL(calledIndex, &index);
    BOOST_CHECK_EQUAL(calledBlock, block);
}

BOOST_FIXTURE_TEST_CASE(transaction_finalized, TestChain100Setup) {
    uint32_t callCount = 0;
    TxId calledTxId;
    RegisterSharedValidationInterface(std::make_shared<TestInterface>(
        nullptr, nullptr, nullptr, [&](const CTransactionRef &tx) {
            callCount++;
            calledTxId = tx->GetId();
        }));

    CMutableTransaction mtx;
    mtx.nVersion = 2;
    mtx.vin.emplace_back(COutPoint{TxId(FastRandomContext().rand256()), 0});
    CScript scriptPubKey;
    for (size_t i = 0; i < 100; i++) {
        // Make sure the tx size is larger than 100 bytes
        scriptPubKey << OP_11;
    }
    mtx.vout.emplace_back(1 * COIN, scriptPubKey);

    {
        CTransactionRef tx = MakeTransactionRef(mtx);
        for (size_t i = 0; i < 10; i++) {
            TestInterface::CallTransactionFinalized(tx);
        }
        SyncWithValidationInterfaceQueue();
        BOOST_CHECK_EQUAL(callCount, 10);
        BOOST_CHECK_EQUAL(calledTxId, tx->GetId());
    }

    callCount = 0;
    calledTxId = TxId();

    for (size_t i = 0; i < 10; i++) {
        mtx.vin[0] = CTxIn(COutPoint{TxId(FastRandomContext().rand256()), 0});
        CTransactionRef tx = MakeTransactionRef(mtx);

        TestInterface::CallTransactionFinalized(tx);
        SyncWithValidationInterfaceQueue();

        BOOST_CHECK_EQUAL(callCount, i + 1);
        BOOST_CHECK_EQUAL(calledTxId, tx->GetId());
    }

    callCount = 0;
    calledTxId = TxId();

    bilingual_str error;
    auto avalanche = avalanche::Processor::MakeProcessor(
        *m_node.args, *m_node.chain, m_node.connman.get(), *m_node.chainman,
        m_node.mempool.get(), *m_node.scheduler, error);

    TestMemPoolEntryHelper entryHelper;

    for (size_t i = 0; i < 10; i++) {
        mtx.vin[0] = CTxIn(COutPoint{TxId(FastRandomContext().rand256()), 0});
        CTransactionRef tx = MakeTransactionRef(mtx);

        auto entry = entryHelper.Fee(1000 * SATOSHI).FromTx(tx);

        std::vector<TxId> finalizedTxIds;
        {
            LOCK2(::cs_main, m_node.mempool->cs);
            m_node.mempool->addUnchecked(entry);
            BOOST_CHECK(m_node.mempool->setAvalancheFinalized(
                entry, m_node.chainman->GetConsensus(),
                *m_node.chainman->ActiveChain().Tip(), finalizedTxIds));
        }
        BOOST_CHECK_EQUAL(finalizedTxIds.size(), 1);
        BOOST_CHECK_EQUAL(finalizedTxIds[0], tx->GetId());

        SyncWithValidationInterfaceQueue();
        BOOST_CHECK_EQUAL(callCount, i + 1);
        BOOST_CHECK_EQUAL(calledTxId, tx->GetId());

        // Successive calls won't call the validation again, because the
        // transaction is already finalized.
        finalizedTxIds.clear();
        {
            LOCK2(::cs_main, m_node.mempool->cs);
            BOOST_CHECK(m_node.mempool->setAvalancheFinalized(
                entry, m_node.chainman->GetConsensus(),
                *m_node.chainman->ActiveChain().Tip(), finalizedTxIds));
        }
        BOOST_CHECK_EQUAL(finalizedTxIds.size(), 0);

        SyncWithValidationInterfaceQueue();
        BOOST_CHECK_EQUAL(callCount, i + 1);
        BOOST_CHECK_EQUAL(calledTxId, tx->GetId());
    }
}

BOOST_FIXTURE_TEST_CASE(transaction_invalidated, TestChain100Setup) {
    uint32_t callCount = 0;
    TxId calledTxId;
    RegisterSharedValidationInterface(std::make_shared<TestInterface>(
        nullptr, nullptr, nullptr, nullptr, [&](const CTransactionRef &tx) {
            callCount++;
            calledTxId = tx->GetId();
        }));

    CMutableTransaction mtx;
    mtx.nVersion = 2;
    mtx.vin.emplace_back(COutPoint{TxId(FastRandomContext().rand256()), 0});
    CScript scriptPubKey;
    for (size_t i = 0; i < 100; i++) {
        // Make sure the tx size is larger than 100 bytes
        scriptPubKey << OP_11;
    }
    mtx.vout.emplace_back(1 * COIN, scriptPubKey);

    {
        CTransactionRef tx = MakeTransactionRef(mtx);
        for (size_t i = 0; i < 10; i++) {
            TestInterface::CallTransactionInvalidated(tx);
        }
        SyncWithValidationInterfaceQueue();
        BOOST_CHECK_EQUAL(callCount, 10);
        BOOST_CHECK_EQUAL(calledTxId, tx->GetId());
    }

    callCount = 0;
    calledTxId = TxId();

    for (size_t i = 0; i < 10; i++) {
        mtx.vin[0] = CTxIn(COutPoint{TxId(FastRandomContext().rand256()), 0});
        CTransactionRef tx = MakeTransactionRef(mtx);

        TestInterface::CallTransactionInvalidated(tx);
        SyncWithValidationInterfaceQueue();

        BOOST_CHECK_EQUAL(callCount, i + 1);
        BOOST_CHECK_EQUAL(calledTxId, tx->GetId());
    }
}

BOOST_AUTO_TEST_SUITE_END()
