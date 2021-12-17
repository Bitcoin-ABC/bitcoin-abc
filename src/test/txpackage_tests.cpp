// Copyright (c) 2021 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>
#include <consensus/validation.h>
#include <policy/packages.h>
#include <policy/policy.h>
#include <primitives/transaction.h>
#include <script/script.h>
#include <script/standard.h>
#include <txmempool.h>
#include <validation.h>

#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(txpackage_tests)

// Create placeholder transactions that have no meaning.
inline CTransactionRef create_placeholder_tx(size_t num_inputs,
                                             size_t num_outputs) {
    CMutableTransaction mtx = CMutableTransaction();
    mtx.vin.resize(num_inputs);
    mtx.vout.resize(num_outputs);
    auto random_script = CScript() << ToByteVector(InsecureRand256())
                                   << ToByteVector(InsecureRand256());
    for (size_t i{0}; i < num_inputs; ++i) {
        mtx.vin[i].prevout = COutPoint(TxId{InsecureRand256()}, 0);
        mtx.vin[i].scriptSig = random_script;
    }
    for (size_t o{0}; o < num_outputs; ++o) {
        mtx.vout[o].nValue = 1 * CENT;
        mtx.vout[o].scriptPubKey = random_script;
    }
    return MakeTransactionRef(mtx);
}

BOOST_FIXTURE_TEST_CASE(package_sanitization_tests, TestChain100Setup) {
    // Packages can't have more than 50 transactions.
    Package package_too_many;
    package_too_many.reserve(MAX_PACKAGE_COUNT + 1);
    for (size_t i{0}; i < MAX_PACKAGE_COUNT + 1; ++i) {
        package_too_many.emplace_back(create_placeholder_tx(1, 1));
    }

    PackageValidationState state_too_many;
    BOOST_CHECK(!CheckPackage(package_too_many, state_too_many));
    BOOST_CHECK_EQUAL(state_too_many.GetResult(),
                      PackageValidationResult::PCKG_POLICY);
    BOOST_CHECK_EQUAL(state_too_many.GetRejectReason(),
                      "package-too-many-transactions");

    // Packages can't have a total size of more than 101KvB.
    CTransactionRef large_ptx = create_placeholder_tx(150, 150);
    Package package_too_large;
    auto size_large = GetVirtualTransactionSize(*large_ptx);
    size_t total_size{0};
    while (total_size <= MAX_PACKAGE_SIZE * 1000) {
        package_too_large.push_back(large_ptx);
        total_size += size_large;
    }
    BOOST_CHECK(package_too_large.size() <= MAX_PACKAGE_COUNT);
    PackageValidationState state_too_large;
    BOOST_CHECK(!CheckPackage(package_too_large, state_too_large));
    BOOST_CHECK_EQUAL(state_too_large.GetResult(),
                      PackageValidationResult::PCKG_POLICY);
    BOOST_CHECK_EQUAL(state_too_large.GetRejectReason(), "package-too-large");
}

BOOST_FIXTURE_TEST_CASE(package_validation_tests, TestChain100Setup) {
    LOCK(cs_main);
    unsigned int initialPoolSize = m_node.mempool->size();

    // Parent and Child Package
    CKey parent_key;
    parent_key.MakeNewKey(true);
    CScript parent_locking_script =
        GetScriptForDestination(PKHash(parent_key.GetPubKey()));
    auto mtx_parent = CreateValidMempoolTransaction(
        /* input_transaction */ m_coinbase_txns[0], /* vout */ 0,
        /* input_height */ 0, /* input_signing_key */ coinbaseKey,
        /* output_destination */ parent_locking_script,
        /* output_amount */ Amount(49 * COIN), /* submit */ false);
    CTransactionRef tx_parent = MakeTransactionRef(mtx_parent);

    CKey child_key;
    child_key.MakeNewKey(true);
    CScript child_locking_script =
        GetScriptForDestination(PKHash(child_key.GetPubKey()));
    auto mtx_child = CreateValidMempoolTransaction(
        /* input_transaction */ tx_parent, /* vout */ 0,
        /* input_height */ 101, /* input_signing_key */ parent_key,
        /* output_destination */ child_locking_script,
        /* output_amount */ Amount(48 * COIN), /* submit */ false);
    CTransactionRef tx_child = MakeTransactionRef(mtx_child);
    const auto result_parent_child =
        ProcessNewPackage(m_node.chainman->ActiveChainstate(), *m_node.mempool,
                          {tx_parent, tx_child}, /* test_accept */ true);
    BOOST_CHECK_MESSAGE(result_parent_child.m_state.IsValid(),
                        "Package validation unexpectedly failed: "
                            << result_parent_child.m_state.GetRejectReason());
    auto it_parent = result_parent_child.m_tx_results.find(tx_parent->GetId());
    auto it_child = result_parent_child.m_tx_results.find(tx_child->GetId());
    BOOST_CHECK(it_parent != result_parent_child.m_tx_results.end());
    BOOST_CHECK_MESSAGE(it_parent->second.m_state.IsValid(),
                        "Package validation unexpectedly failed: "
                            << it_parent->second.m_state.GetRejectReason());
    BOOST_CHECK(it_child != result_parent_child.m_tx_results.end());
    BOOST_CHECK_MESSAGE(it_child->second.m_state.IsValid(),
                        "Package validation unexpectedly failed: "
                            << it_child->second.m_state.GetRejectReason());
    BOOST_CHECK(result_parent_child.m_package_feerate.has_value());
    BOOST_CHECK(result_parent_child.m_package_feerate.value() ==
                CFeeRate(2 * COIN, GetVirtualTransactionSize(*tx_parent) +
                                       GetVirtualTransactionSize(*tx_child)));

    // A single, giant transaction submitted through ProcessNewPackage fails on
    // single tx policy.
    CTransactionRef giant_ptx = create_placeholder_tx(999, 999);
    BOOST_CHECK(GetVirtualTransactionSize(*giant_ptx) >
                MAX_PACKAGE_SIZE * 1000);
    auto result_single_large =
        ProcessNewPackage(m_node.chainman->ActiveChainstate(), *m_node.mempool,
                          {giant_ptx}, /* test_accept */ true);
    BOOST_CHECK(result_single_large.m_state.IsInvalid());
    BOOST_CHECK_EQUAL(result_single_large.m_state.GetResult(),
                      PackageValidationResult::PCKG_TX);
    BOOST_CHECK_EQUAL(result_single_large.m_state.GetRejectReason(),
                      "transaction failed");
    auto it_giant_tx =
        result_single_large.m_tx_results.find(giant_ptx->GetId());
    BOOST_CHECK(it_giant_tx != result_single_large.m_tx_results.end());
    BOOST_CHECK_EQUAL(it_giant_tx->second.m_state.GetRejectReason(), "tx-size");
    BOOST_CHECK(result_single_large.m_package_feerate == std::nullopt);

    // Check that mempool size hasn't changed.
    BOOST_CHECK_EQUAL(m_node.mempool->size(), initialPoolSize);
}

BOOST_FIXTURE_TEST_CASE(noncontextual_package_tests, TestChain100Setup) {
    // The signatures won't be verified so we can just use a placeholder
    CKey placeholder_key;
    placeholder_key.MakeNewKey(true);
    CScript spk = GetScriptForDestination(PKHash(placeholder_key.GetPubKey()));
    CKey placeholder_key_2;
    placeholder_key_2.MakeNewKey(true);
    CScript spk2 =
        GetScriptForDestination(PKHash(placeholder_key_2.GetPubKey()));

    // Parent and Child Package
    {
        auto mtx_parent = CreateValidMempoolTransaction(
            m_coinbase_txns[0], 0, 0, coinbaseKey, spk, Amount(49 * COIN),
            /* submit */ false);
        CTransactionRef tx_parent = MakeTransactionRef(mtx_parent);

        auto mtx_child = CreateValidMempoolTransaction(
            tx_parent, 0, 101, placeholder_key, spk2, Amount(48 * COIN),
            /* submit */ false);
        CTransactionRef tx_child = MakeTransactionRef(mtx_child);

        PackageValidationState state;
        BOOST_CHECK(CheckPackage({tx_parent, tx_child}, state));
        BOOST_CHECK(!CheckPackage({tx_child, tx_parent}, state));
        BOOST_CHECK_EQUAL(state.GetResult(),
                          PackageValidationResult::PCKG_POLICY);
        BOOST_CHECK_EQUAL(state.GetRejectReason(), "package-not-sorted");
        BOOST_CHECK(IsChildWithParents({tx_parent, tx_child}));
    }

    // 49 Parents and 1 Child
    {
        Package package;
        CMutableTransaction child;
        for (int i{0}; i < 49; ++i) {
            auto parent = MakeTransactionRef(CreateValidMempoolTransaction(
                m_coinbase_txns[i + 1], 0, 0, coinbaseKey, spk,
                Amount(48 * COIN), false));
            package.emplace_back(parent);
            child.vin.push_back(CTxIn(COutPoint(parent->GetId(), 0)));
        }
        child.vout.push_back(CTxOut(47 * COIN, spk2));

        // The child must be in the package.
        BOOST_CHECK(!IsChildWithParents(package));

        // The parents can be in any order.
        FastRandomContext rng;
        Shuffle(package.begin(), package.end(), rng);
        package.push_back(MakeTransactionRef(child));

        PackageValidationState state;
        BOOST_CHECK(CheckPackage(package, state));
        BOOST_CHECK(IsChildWithParents(package));

        package.erase(package.begin());
        BOOST_CHECK(IsChildWithParents(package));

        // The package cannot have unrelated transactions.
        package.insert(package.begin(), m_coinbase_txns[0]);
        BOOST_CHECK(!IsChildWithParents(package));
    }

    // 2 Parents and 1 Child where one parent depends on the other.
    {
        CMutableTransaction mtx_parent;
        mtx_parent.vin.push_back(
            CTxIn(COutPoint(m_coinbase_txns[0]->GetId(), 0)));
        mtx_parent.vout.push_back(CTxOut(20 * COIN, spk));
        mtx_parent.vout.push_back(CTxOut(20 * COIN, spk2));
        CTransactionRef tx_parent = MakeTransactionRef(mtx_parent);

        CMutableTransaction mtx_parent_also_child;
        mtx_parent_also_child.vin.push_back(
            CTxIn(COutPoint(tx_parent->GetId(), 0)));
        mtx_parent_also_child.vout.push_back(CTxOut(20 * COIN, spk));
        CTransactionRef tx_parent_also_child =
            MakeTransactionRef(mtx_parent_also_child);

        CMutableTransaction mtx_child;
        mtx_child.vin.push_back(CTxIn(COutPoint(tx_parent->GetId(), 1)));
        mtx_child.vin.push_back(
            CTxIn(COutPoint(tx_parent_also_child->GetId(), 0)));
        mtx_child.vout.push_back(CTxOut(39 * COIN, spk));
        CTransactionRef tx_child = MakeTransactionRef(mtx_child);

        PackageValidationState state;
        BOOST_CHECK(IsChildWithParents({tx_parent, tx_parent_also_child}));
        BOOST_CHECK(IsChildWithParents({tx_parent, tx_child}));
        BOOST_CHECK(
            IsChildWithParents({tx_parent, tx_parent_also_child, tx_child}));
        // IsChildWithParents does not detect unsorted parents.
        BOOST_CHECK(
            IsChildWithParents({tx_parent_also_child, tx_parent, tx_child}));
        BOOST_CHECK(
            CheckPackage({tx_parent, tx_parent_also_child, tx_child}, state));
        BOOST_CHECK(
            !CheckPackage({tx_parent_also_child, tx_parent, tx_child}, state));
        BOOST_CHECK_EQUAL(state.GetResult(),
                          PackageValidationResult::PCKG_POLICY);
        BOOST_CHECK_EQUAL(state.GetRejectReason(), "package-not-sorted");
    }
}

BOOST_FIXTURE_TEST_CASE(package_submission_tests, TestChain100Setup) {
    unsigned int expected_pool_size = m_node.mempool->size();
    CKey parent_key;
    parent_key.MakeNewKey(true);
    CScript parent_locking_script =
        GetScriptForDestination(PKHash(parent_key.GetPubKey()));

    // Unrelated transactions are not allowed in package submission.
    Package package_unrelated;
    for (size_t i{0}; i < 10; ++i) {
        auto mtx = CreateValidMempoolTransaction(
            /*input_transaction=*/m_coinbase_txns[i + 25], /*input_vout=*/0,
            /*input_height=*/0, /*input_signing_key=*/coinbaseKey,
            /*output_destination=*/parent_locking_script,
            /*output_amount=*/Amount(49 * COIN), /*submit=*/false);
        package_unrelated.emplace_back(MakeTransactionRef(mtx));
    }

    {
        LOCK(cs_main);
        auto result_unrelated_submit = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool,
            package_unrelated, /*test_accept=*/false);
        BOOST_CHECK(result_unrelated_submit.m_state.IsInvalid());
        BOOST_CHECK_EQUAL(result_unrelated_submit.m_state.GetResult(),
                          PackageValidationResult::PCKG_POLICY);
        BOOST_CHECK_EQUAL(result_unrelated_submit.m_state.GetRejectReason(),
                          "package-not-child-with-parents");
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        BOOST_CHECK(result_unrelated_submit.m_package_feerate == std::nullopt);
    }

    // Parent and Child (and Grandchild) Package
    Package package_parent_child;
    Package package_3gen;
    auto mtx_parent = CreateValidMempoolTransaction(
        /*input_transaction=*/m_coinbase_txns[0], /*input_vout=*/0,
        /*input_height=*/0, /*input_signing_key=*/coinbaseKey,
        /*output_destination=*/parent_locking_script,
        /*output_amount=*/Amount(49 * COIN), /*submit=*/false);
    CTransactionRef tx_parent = MakeTransactionRef(mtx_parent);
    package_parent_child.push_back(tx_parent);
    package_3gen.push_back(tx_parent);

    CKey child_key;
    child_key.MakeNewKey(true);
    CScript child_locking_script =
        GetScriptForDestination(PKHash(child_key.GetPubKey()));
    auto mtx_child = CreateValidMempoolTransaction(
        /*input_transaction=*/tx_parent, /*input_vout=*/0,
        /*input_height=*/101, /*input_signing_key=*/parent_key,
        /*output_destination=*/child_locking_script,
        /*output_amount=*/Amount(48 * COIN), /*submit=*/false);
    CTransactionRef tx_child = MakeTransactionRef(mtx_child);
    package_parent_child.push_back(tx_child);
    package_3gen.push_back(tx_child);

    CKey grandchild_key;
    grandchild_key.MakeNewKey(true);
    CScript grandchild_locking_script =
        GetScriptForDestination(PKHash(grandchild_key.GetPubKey()));
    auto mtx_grandchild = CreateValidMempoolTransaction(
        /*input_transaction=*/tx_child, /*input_vout=*/0,
        /*input_height=*/101, /*input_signing_key=*/child_key,
        /*output_destination=*/grandchild_locking_script,
        /*output_amount=*/Amount(47 * COIN), /*submit=*/false);
    CTransactionRef tx_grandchild = MakeTransactionRef(mtx_grandchild);
    package_3gen.push_back(tx_grandchild);

    // 3 Generations is not allowed.
    {
        LOCK(cs_main);
        auto result_3gen_submit = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool, package_3gen,
            /*test_accept=*/false);
        BOOST_CHECK(result_3gen_submit.m_state.IsInvalid());
        BOOST_CHECK_EQUAL(result_3gen_submit.m_state.GetResult(),
                          PackageValidationResult::PCKG_POLICY);
        BOOST_CHECK_EQUAL(result_3gen_submit.m_state.GetRejectReason(),
                          "package-not-child-with-parents");
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        BOOST_CHECK(result_3gen_submit.m_package_feerate == std::nullopt);
    }

    // Child with missing parent.
    mtx_child.vin.push_back(CTxIn(COutPoint(package_unrelated[0]->GetId(), 0)));
    Package package_missing_parent;
    package_missing_parent.push_back(tx_parent);
    package_missing_parent.push_back(MakeTransactionRef(mtx_child));
    {
        LOCK(cs_main);
        const auto result_missing_parent = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool,
            package_missing_parent, /*test_accept=*/false);
        BOOST_CHECK(result_missing_parent.m_state.IsInvalid());
        BOOST_CHECK_EQUAL(result_missing_parent.m_state.GetResult(),
                          PackageValidationResult::PCKG_POLICY);
        BOOST_CHECK_EQUAL(result_missing_parent.m_state.GetRejectReason(),
                          "package-not-child-with-unconfirmed-parents");
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);

        BOOST_CHECK(result_missing_parent.m_package_feerate == std::nullopt);
    }

    // Submit package with parent + child.
    {
        LOCK(cs_main);
        const auto submit_parent_child = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool,
            package_parent_child, /*test_accept=*/false);
        expected_pool_size += 2;
        BOOST_CHECK_MESSAGE(
            submit_parent_child.m_state.IsValid(),
            "Package validation unexpectedly failed: "
                << submit_parent_child.m_state.GetRejectReason());
        auto it_parent =
            submit_parent_child.m_tx_results.find(tx_parent->GetId());
        auto it_child =
            submit_parent_child.m_tx_results.find(tx_child->GetId());
        BOOST_CHECK(it_parent != submit_parent_child.m_tx_results.end());
        BOOST_CHECK(it_parent->second.m_state.IsValid());
        BOOST_CHECK(it_child != submit_parent_child.m_tx_results.end());
        BOOST_CHECK(it_child->second.m_state.IsValid());

        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        BOOST_CHECK(m_node.mempool->exists(tx_parent->GetId()));
        BOOST_CHECK(m_node.mempool->exists(tx_child->GetId()));

        // Since both transactions have high feerates, they each passed
        // validation individually. Package validation was unnecessary, so there
        // is no package feerate.
        BOOST_CHECK(submit_parent_child.m_package_feerate == std::nullopt);
    }

    // Already-in-mempool transactions should be detected and de-duplicated.
    {
        LOCK(cs_main);
        const auto submit_deduped = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool,
            package_parent_child, /*test_accept=*/false);
        BOOST_CHECK_MESSAGE(submit_deduped.m_state.IsValid(),
                            "Package validation unexpectedly failed: "
                                << submit_deduped.m_state.GetRejectReason());
        auto it_parent_deduped =
            submit_deduped.m_tx_results.find(tx_parent->GetId());
        auto it_child_deduped =
            submit_deduped.m_tx_results.find(tx_child->GetId());
        BOOST_CHECK(it_parent_deduped != submit_deduped.m_tx_results.end());
        BOOST_CHECK(it_parent_deduped->second.m_state.IsValid());
        BOOST_CHECK(it_parent_deduped->second.m_result_type ==
                    MempoolAcceptResult::ResultType::MEMPOOL_ENTRY);
        BOOST_CHECK(it_child_deduped != submit_deduped.m_tx_results.end());
        BOOST_CHECK(it_child_deduped->second.m_state.IsValid());
        BOOST_CHECK(it_child_deduped->second.m_result_type ==
                    MempoolAcceptResult::ResultType::MEMPOOL_ENTRY);

        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        BOOST_CHECK(m_node.mempool->exists(tx_parent->GetId()));
        BOOST_CHECK(m_node.mempool->exists(tx_child->GetId()));

        BOOST_CHECK(submit_deduped.m_package_feerate == std::nullopt);
    }
}

BOOST_FIXTURE_TEST_CASE(package_mix, TestChain100Setup) {
    // Mine blocks to mature coinbases.
    mineBlocks(5);
    LOCK(::cs_main);

    // A package Package{parent1, parent2, child} where the parents are a
    // mixture of identical-tx-in-mempool and new transaction.
    Package package_mixed;

    // Give all the parents anyone-can-spend scripts so we don't have to deal
    // with signing the child.
    CScript acs_script = CScript() << OP_TRUE;
    CScript acs_scriptsig = CScript() << std::vector<uint8_t>{OP_TRUE};
    CScript acs_spk = GetScriptForDestination(ScriptHash(acs_script));

    // parent1 will already be in the mempool
    auto mtx_parent1 = CreateValidMempoolTransaction(
        /*input_transaction=*/m_coinbase_txns[1], /*input_vout=*/0,
        /*input_height=*/0, /*input_signing_key=*/coinbaseKey,
        /*output_destination=*/acs_spk,
        /*output_amount=*/Amount{49 * COIN}, /*submit=*/true);
    CTransactionRef ptx_parent1 = MakeTransactionRef(mtx_parent1);
    package_mixed.push_back(ptx_parent1);

    // parent2 will be a new transaction
    auto mtx_parent2 = CreateValidMempoolTransaction(
        /*input_transaction=*/m_coinbase_txns[3], /*input_vout=*/0,
        /*input_height=*/0, /*input_signing_key=*/coinbaseKey,
        /*output_destination=*/acs_spk,
        /*output_amount=*/Amount{49 * COIN}, /*submit=*/false);
    CTransactionRef ptx_parent2 = MakeTransactionRef(mtx_parent2);
    package_mixed.push_back(ptx_parent2);

    // child spends parent1 and parent2
    CKey mixed_grandchild_key;
    mixed_grandchild_key.MakeNewKey(true);
    CScript mixed_child_spk =
        GetScriptForDestination(PKHash(mixed_grandchild_key.GetPubKey()));

    CMutableTransaction mtx_mixed_child;
    mtx_mixed_child.vin.push_back(
        CTxIn(COutPoint(ptx_parent1->GetId(), 0), acs_scriptsig));
    mtx_mixed_child.vin.push_back(
        CTxIn(COutPoint(ptx_parent2->GetId(), 0), acs_scriptsig));
    mtx_mixed_child.vout.push_back(CTxOut(97 * COIN, mixed_child_spk));
    CTransactionRef ptx_mixed_child = MakeTransactionRef(mtx_mixed_child);
    package_mixed.push_back(ptx_mixed_child);

    // Submit package:
    // parent1 should be ignored
    // parent2 should be accepted
    // child should be accepted
    {
        const auto mixed_result =
            ProcessNewPackage(m_node.chainman->ActiveChainstate(),
                              *m_node.mempool, package_mixed, false);
        BOOST_CHECK_MESSAGE(mixed_result.m_state.IsValid(),
                            mixed_result.m_state.GetRejectReason());
        auto it_parent1 = mixed_result.m_tx_results.find(ptx_parent1->GetId());
        auto it_parent2 = mixed_result.m_tx_results.find(ptx_parent2->GetId());
        auto it_child =
            mixed_result.m_tx_results.find(ptx_mixed_child->GetId());
        BOOST_CHECK(it_parent1 != mixed_result.m_tx_results.end());
        BOOST_CHECK(it_parent2 != mixed_result.m_tx_results.end());
        BOOST_CHECK(it_child != mixed_result.m_tx_results.end());

        BOOST_CHECK(it_parent1->second.m_result_type ==
                    MempoolAcceptResult::ResultType::MEMPOOL_ENTRY);
        BOOST_CHECK(it_parent2->second.m_result_type ==
                    MempoolAcceptResult::ResultType::VALID);
        BOOST_CHECK(it_child->second.m_result_type ==
                    MempoolAcceptResult::ResultType::VALID);

        BOOST_CHECK(m_node.mempool->exists(ptx_parent1->GetId()));
        BOOST_CHECK(m_node.mempool->exists(ptx_parent2->GetId()));
        BOOST_CHECK(m_node.mempool->exists(ptx_mixed_child->GetId()));
    }
}

BOOST_FIXTURE_TEST_CASE(package_cpfp_tests, TestChain100Setup) {
    mineBlocks(5);
    LOCK(::cs_main);
    size_t expected_pool_size = m_node.mempool->size();
    CKey child_key;
    child_key.MakeNewKey(true);
    CScript parent_spk = GetScriptForDestination(PKHash(child_key.GetPubKey()));
    CKey grandchild_key;
    grandchild_key.MakeNewKey(true);
    CScript child_spk =
        GetScriptForDestination(PKHash(grandchild_key.GetPubKey()));

    // zero-fee parent and high-fee child package
    const Amount coinbase_value{50 * COIN};
    const Amount parent_value{coinbase_value - Amount::zero()};
    const Amount child_value{parent_value - COIN};

    Package package_cpfp;
    auto mtx_parent = CreateValidMempoolTransaction(
        /*input_transaction=*/m_coinbase_txns[0], /*input_vout=*/0,
        /*input_height=*/0, /*input_signing_key=*/coinbaseKey,
        /*output_destination=*/parent_spk,
        /*output_amount=*/parent_value, /*submit=*/false);
    CTransactionRef tx_parent = MakeTransactionRef(mtx_parent);
    package_cpfp.push_back(tx_parent);

    auto mtx_child = CreateValidMempoolTransaction(
        /*input_transaction=*/tx_parent, /*input_vout=*/0,
        /*input_height=*/101, /*input_signing_key=*/child_key,
        /*output_destination=*/child_spk,
        /*output_amount=*/child_value, /*submit=*/false);
    CTransactionRef tx_child = MakeTransactionRef(mtx_child);
    package_cpfp.push_back(tx_child);

    // Package feerate is calculated using modified fees, and
    // prioritisetransaction accepts negative fee deltas. This should be taken
    // into account. De-prioritise the parent transaction by -1 MegXEC, bringing
    // the package feerate to 0.
    m_node.mempool->PrioritiseTransaction(tx_parent->GetId(), -1 * COIN);
    {
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        const auto submit_cpfp_deprio = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool, package_cpfp,
            /*test_accept=*/false);
        BOOST_CHECK_MESSAGE(
            submit_cpfp_deprio.m_state.IsInvalid(),
            "Package validation unexpectedly succeeded: "
                << submit_cpfp_deprio.m_state.GetRejectReason());
        BOOST_CHECK(submit_cpfp_deprio.m_tx_results.empty());
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        const CFeeRate expected_feerate(
            Amount::zero(), GetVirtualTransactionSize(*tx_parent) +
                                GetVirtualTransactionSize(*tx_child));
        BOOST_CHECK(submit_cpfp_deprio.m_package_feerate.has_value());
        BOOST_CHECK(submit_cpfp_deprio.m_package_feerate.value() ==
                    CFeeRate{Amount::zero()});
        BOOST_CHECK_MESSAGE(
            submit_cpfp_deprio.m_package_feerate.value() == expected_feerate,
            strprintf("Expected package feerate %s, got %s",
                      expected_feerate.ToString(),
                      submit_cpfp_deprio.m_package_feerate.value().ToString()));
    }

    // Clear the prioritisation of the parent transaction.
    WITH_LOCK(m_node.mempool->cs,
              m_node.mempool->ClearPrioritisation(tx_parent->GetId()));

    // Package CPFP: Even though the parent pays 0 absolute fees, the child pays
    // 1 MegXEC which is enough for the package feerate to meet the threshold.
    {
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        const auto submit_cpfp = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool, package_cpfp,
            /*test_accept=*/false);
        expected_pool_size += 2;
        BOOST_CHECK_MESSAGE(submit_cpfp.m_state.IsValid(),
                            "Package validation unexpectedly failed: "
                                << submit_cpfp.m_state.GetRejectReason());
        auto it_parent = submit_cpfp.m_tx_results.find(tx_parent->GetId());
        auto it_child = submit_cpfp.m_tx_results.find(tx_child->GetId());
        BOOST_CHECK(it_parent != submit_cpfp.m_tx_results.end());
        BOOST_CHECK(it_parent->second.m_result_type ==
                    MempoolAcceptResult::ResultType::VALID);
        BOOST_CHECK(it_parent->second.m_base_fees.value() == Amount::zero());
        BOOST_CHECK(it_child != submit_cpfp.m_tx_results.end());
        BOOST_CHECK(it_child->second.m_result_type ==
                    MempoolAcceptResult::ResultType::VALID);
        BOOST_CHECK(it_child->second.m_base_fees.value() == COIN);

        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        BOOST_CHECK(m_node.mempool->exists(tx_parent->GetId()));
        BOOST_CHECK(m_node.mempool->exists(tx_child->GetId()));

        const CFeeRate expected_feerate(
            coinbase_value - child_value,
            GetVirtualTransactionSize(*tx_parent) +
                GetVirtualTransactionSize(*tx_child));
        BOOST_CHECK(expected_feerate.GetFeePerK() > 1000 * SATOSHI);
        BOOST_CHECK(submit_cpfp.m_package_feerate.has_value());
        BOOST_CHECK_MESSAGE(
            submit_cpfp.m_package_feerate.value() == expected_feerate,
            strprintf("Expected package feerate %s, got %s",
                      expected_feerate.ToString(),
                      submit_cpfp.m_package_feerate.value().ToString()));
    }

    // Just because we allow low-fee parents doesn't mean we allow low-feerate
    // packages. This package just pays 200 satoshis total. This would be enough
    // to pay for the child alone, but isn't enough for the entire package to
    // meet the 1sat/vbyte minimum.
    Package package_still_too_low;
    auto mtx_parent_cheap = CreateValidMempoolTransaction(
        /*input_transaction=*/m_coinbase_txns[1], /*input_vout=*/0,
        /*input_height=*/0, /*input_signing_key=*/coinbaseKey,
        /*output_destination=*/parent_spk,
        /*output_amount=*/coinbase_value, /*submit=*/false);
    CTransactionRef tx_parent_cheap = MakeTransactionRef(mtx_parent_cheap);
    package_still_too_low.push_back(tx_parent_cheap);

    auto mtx_child_cheap = CreateValidMempoolTransaction(
        /*input_transaction=*/tx_parent_cheap, /*input_vout=*/0,
        /*input_height=*/101, /* input_signing_key */ child_key,
        /*output_destination=*/child_spk,
        /*output_amount=*/coinbase_value - 200 * SATOSHI, /*submit=*/false);
    CTransactionRef tx_child_cheap = MakeTransactionRef(mtx_child_cheap);
    package_still_too_low.push_back(tx_child_cheap);

    // Cheap package should fail with package-fee-too-low.
    {
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        const auto submit_package_too_low = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool,
            package_still_too_low, /* test_accept */ false);
        BOOST_CHECK_MESSAGE(submit_package_too_low.m_state.IsInvalid(),
                            "Package validation unexpectedly succeeded");
        BOOST_CHECK_EQUAL(submit_package_too_low.m_state.GetResult(),
                          PackageValidationResult::PCKG_POLICY);
        BOOST_CHECK_EQUAL(submit_package_too_low.m_state.GetRejectReason(),
                          "package-fee-too-low");
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        const CFeeRate child_feerate(
            200 * SATOSHI, GetVirtualTransactionSize(*tx_child_cheap));
        BOOST_CHECK(child_feerate.GetFeePerK() > 1000 * SATOSHI);
        const CFeeRate expected_feerate(
            200 * SATOSHI, GetVirtualTransactionSize(*tx_parent_cheap) +
                               GetVirtualTransactionSize(*tx_child_cheap));
        BOOST_CHECK(expected_feerate.GetFeePerK() < 1000 * SATOSHI);
        BOOST_CHECK(submit_package_too_low.m_package_feerate.has_value());
        BOOST_CHECK_MESSAGE(
            submit_package_too_low.m_package_feerate.value() ==
                expected_feerate,
            strprintf(
                "Expected package feerate %s, got %s",
                expected_feerate.ToString(),
                submit_package_too_low.m_package_feerate.value().ToString()));
    }

    // Package feerate includes the modified fees of the transactions.
    // This means a child with its fee delta from prioritisetransaction can pay
    // for a parent.
    m_node.mempool->PrioritiseTransaction(tx_child_cheap->GetId(), 1 * COIN);
    // Now that the child's fees have "increased" by 1 MegXEC, the cheap package
    // should succeed.
    {
        const auto submit_prioritised_package = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool,
            package_still_too_low, /*test_accept=*/false);
        expected_pool_size += 2;
        BOOST_CHECK_MESSAGE(
            submit_prioritised_package.m_state.IsValid(),
            "Package validation unexpectedly failed"
                << submit_prioritised_package.m_state.GetRejectReason());
        const CFeeRate expected_feerate(
            1 * COIN + 200 * SATOSHI,
            GetVirtualTransactionSize(*tx_parent_cheap) +
                GetVirtualTransactionSize(*tx_child_cheap));
        BOOST_CHECK(submit_prioritised_package.m_package_feerate.has_value());
        BOOST_CHECK_MESSAGE(
            submit_prioritised_package.m_package_feerate.value() ==
                expected_feerate,
            strprintf("Expected package feerate %s, got %s",
                      expected_feerate.ToString(),
                      submit_prioritised_package.m_package_feerate.value()
                          .ToString()));
    }

    // Package feerate is calculated without topology in mind; it's just
    // aggregating fees and sizes. However, this should not allow parents to pay
    // for children. Each transaction should be validated individually first,
    // eliminating sufficient-feerate parents before they are unfairly included
    // in the package feerate. It's also important that the low-fee child
    // doesn't prevent the parent from being accepted.
    Package package_rich_parent;
    const Amount high_parent_fee{1 * COIN};
    auto mtx_parent_rich = CreateValidMempoolTransaction(
        /*input_transaction=*/m_coinbase_txns[2], /*input_vout=*/0,
        /*input_height=*/0, /*input_signing_key=*/coinbaseKey,
        /*output_destination=*/parent_spk,
        /*output_amount=*/coinbase_value - high_parent_fee, /*submit=*/false);
    CTransactionRef tx_parent_rich = MakeTransactionRef(mtx_parent_rich);
    package_rich_parent.push_back(tx_parent_rich);

    auto mtx_child_poor = CreateValidMempoolTransaction(
        /*input_transaction=*/tx_parent_rich, /*input_vout=*/0,
        /*input_height=*/101, /*input_signing_key=*/child_key,
        /*output_destination=*/child_spk,
        /*output_amount=*/coinbase_value - high_parent_fee, /*submit=*/false);
    CTransactionRef tx_child_poor = MakeTransactionRef(mtx_child_poor);
    package_rich_parent.push_back(tx_child_poor);

    // Parent pays 1 MegXec and child pays none. The parent should be accepted
    // without the child.
    {
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        const auto submit_rich_parent = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool,
            package_rich_parent, /* test_accept */ false);
        expected_pool_size += 1;
        BOOST_CHECK_MESSAGE(submit_rich_parent.m_state.IsInvalid(),
                            "Package validation unexpectedly succeeded");

        // The child would have been validated on its own and failed, then
        // submitted as a "package" of 1. The package feerate is just the
        // child's feerate, which is 0 sat/vb.
        BOOST_CHECK(submit_rich_parent.m_package_feerate.has_value());
        BOOST_CHECK_MESSAGE(
            submit_rich_parent.m_package_feerate.value() == CFeeRate(),
            "expected 0, got "
                << submit_rich_parent.m_package_feerate.value().ToString());
        BOOST_CHECK_EQUAL(submit_rich_parent.m_state.GetResult(),
                          PackageValidationResult::PCKG_POLICY);
        BOOST_CHECK_EQUAL(submit_rich_parent.m_state.GetRejectReason(),
                          "package-fee-too-low");

        auto it_parent =
            submit_rich_parent.m_tx_results.find(tx_parent_rich->GetId());
        BOOST_CHECK(it_parent != submit_rich_parent.m_tx_results.end());
        BOOST_CHECK(it_parent->second.m_result_type ==
                    MempoolAcceptResult::ResultType::VALID);
        BOOST_CHECK(it_parent->second.m_state.GetRejectReason() == "");
        BOOST_CHECK_MESSAGE(
            it_parent->second.m_base_fees.value() == high_parent_fee,
            strprintf("rich parent: expected fee %s, got %s", high_parent_fee,
                      it_parent->second.m_base_fees.value()));

        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        BOOST_CHECK(m_node.mempool->exists(tx_parent_rich->GetId()));
        BOOST_CHECK(!m_node.mempool->exists(tx_child_poor->GetId()));
    }
}
BOOST_AUTO_TEST_SUITE_END()
