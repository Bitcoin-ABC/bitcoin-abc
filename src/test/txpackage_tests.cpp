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
#include <streams.h>
#include <txmempool.h>
#include <util/strencodings.h>
#include <validation.h>

#include <test/util/random.h>
#include <test/util/setup_common.h>
#include <test/util/txmempool.h>

#include <boost/test/unit_test.hpp>

// A fee amount that is above 1sat/B but below 5sat/B for most transactions
// created within these unit tests.
static const Amount low_fee_amt{200 * SATOSHI};

struct TxPackageTest : TestChain100Setup {
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
}; // struct TxPackageTest

// Create a TxId from a hex string
inline TxId TxIdFromString(std::string_view str) {
    return TxId(uint256S(str.data()));
}

BOOST_FIXTURE_TEST_SUITE(txpackage_tests, TxPackageTest)

BOOST_AUTO_TEST_CASE(package_hash_tests) {
    // Random real transaction
    DataStream stream_1{ParseHex(
        "0100000001750606002715da1314335c5150ee310a60b270e8e7e96878f3646ea6"
        "389b48a7000000008c493046022100bf870aeee6f40a1ec8d16d94cca59e9923d2"
        "80c2ed3efe508d64fb4b332cb116022100d8bcc14b47083e840a3b30099b030d4b"
        "f0fc2fecd3c52a8e532e1a097909545901410434666b37c97cae7d7d6b0e5178d7"
        "8b27471ca88fc014e4719f410952484efd7145bce0dce4c1a0f63232f63a5cba7b"
        "e726b3189dcc1c52957d0b69822613775fffffffff0221bd831d010000001976a9"
        "14fe91e42445fc4862e1b5566206b928764d9fc6b888ac5fad1502000000001976"
        "a914f883e595eb29b156edf2b0c2939a9e834a58e98f88ac00000000")};
    CTransaction tx_1(deserialize, stream_1);
    CTransactionRef ptx_1{MakeTransactionRef(tx_1)};

    // Random real transaction
    DataStream stream_2{ParseHex(
        "01000000010b26e9b7735eb6aabdf358bab62f9816a21ba9ebdb719d5299e88607"
        "d722c190000000008b4830450220070aca44506c5cef3a16ed519d7c3c39f8aab1"
        "92c4e1c90d065f37b8a4af6141022100a8e160b856c2d43d27d8fba71e5aef6405"
        "b8643ac4cb7cb3c462aced7f14711a0141046d11fee51b0e60666d5049a9101a72"
        "741df480b96ee26488a4d3466b95c9a40ac5eeef87e10a5cd336c19a84565f80fa"
        "6c547957b7700ff4dfbdefe76036c339ffffffff021bff3d11000000001976a914"
        "04943fdd508053c75000106d3bc6e2754dbcff1988ac2f15de00000000001976a9"
        "14a266436d2965547608b9e15d9032a7b9d64fa43188ac00000000")};
    CTransaction tx_2(deserialize, stream_2);
    CTransactionRef ptx_2{MakeTransactionRef(tx_2)};

    // Random real transaction
    DataStream stream_3{ParseHex(
        "01000000019d2149f3070ce44482b931988e34a8c185ca1b0dd9d0ef7745c1a14c"
        "0e5d260a010000008a473044022013d37787511163ccf1c2cc02521e0bd6ba32b0"
        "e60c47ffd1ffb8138184baa89102206bda0248965fb2b2d106c0fa40cb60747997"
        "df998d0940030dda69d11566bebc014104207a4f69b8fd04fa571a3d70105618cf"
        "7c71f7cb7f0753d660f0170139a92319705e94f2c6941bd8b9384bf392beaf72e5"
        "a33b5df5e29c726fa53b9a5816b286ffffffff0200477e25010000001976a914c7"
        "ff9b23b7c620df1617eb5f9a8a973c6eff693c88ac0068b63a010000001976a914"
        "3fcea20063968cb44c8afeea332223523f43d81788ac00000000")};
    CTransaction tx_3(deserialize, stream_3);
    CTransactionRef ptx_3{MakeTransactionRef(tx_3)};

    // It's easy to see that txids are sorted in lexicographical order:
    TxId txid_1{TxIdFromString(
        "0x679c453b9f260ba4b74cd5168615f39b4bb2508e44982c4e93e49e44bb274339")};
    TxId txid_2{TxIdFromString(
        "0xb4749f017444b051c44dfd2720e88f314ff94f3dd6d56d40ef65854fcd7fff6b")};
    TxId txid_3{TxIdFromString(
        "0xfc073689bfb493026d6a618ab07f9f008bd90e1748663c2728211675fb9e234c")};
    BOOST_CHECK_EQUAL(tx_1.GetId(), txid_1);
    BOOST_CHECK_EQUAL(tx_2.GetId(), txid_2);
    BOOST_CHECK_EQUAL(tx_3.GetId(), txid_3);

    BOOST_CHECK(txid_1 < txid_2);
    BOOST_CHECK(txid_2 < txid_3);
    // This test is not useful in itself but is here to demonstrate that our
    // codebase use the same ordering as Bitcoin Core. It only happens that the
    // uint256 comparison has been fixed to use the correct endianness in our
    // codebase so we don't have to use an expensive string conversion to do
    // the comparison.
    BOOST_CHECK(txid_1.GetHex() < txid_2.GetHex());
    BOOST_CHECK(txid_2.GetHex() < txid_3.GetHex());

    // All permutations of the package containing ptx_1, ptx_2, ptx_3 have the
    // same package hash
    std::vector<CTransactionRef> package_123{ptx_1, ptx_2, ptx_3};
    std::vector<CTransactionRef> package_132{ptx_1, ptx_3, ptx_2};
    std::vector<CTransactionRef> package_231{ptx_2, ptx_3, ptx_1};
    std::vector<CTransactionRef> package_213{ptx_2, ptx_1, ptx_3};
    std::vector<CTransactionRef> package_312{ptx_3, ptx_1, ptx_2};
    std::vector<CTransactionRef> package_321{ptx_3, ptx_2, ptx_1};

    uint256 calculated_hash_123 =
        (HashWriter{} << txid_1 << txid_2 << txid_3).GetSHA256();

    BOOST_CHECK_EQUAL(calculated_hash_123, GetPackageHash(package_123));
    BOOST_CHECK_EQUAL(calculated_hash_123, GetPackageHash(package_132));
    BOOST_CHECK_EQUAL(calculated_hash_123, GetPackageHash(package_231));
    BOOST_CHECK_EQUAL(calculated_hash_123, GetPackageHash(package_213));
    BOOST_CHECK_EQUAL(calculated_hash_123, GetPackageHash(package_312));
    BOOST_CHECK_EQUAL(calculated_hash_123, GetPackageHash(package_321));
}

BOOST_AUTO_TEST_CASE(package_sanitization_tests) {
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

    // Packages can't contain transactions with the same txid.
    Package package_duplicate_txids_empty;
    for (auto i{0}; i < 3; ++i) {
        CMutableTransaction empty_tx;
        package_duplicate_txids_empty.emplace_back(
            MakeTransactionRef(empty_tx));
    }
    PackageValidationState state_duplicates;
    BOOST_CHECK(!CheckPackage(package_duplicate_txids_empty, state_duplicates));
    BOOST_CHECK_EQUAL(state_duplicates.GetResult(),
                      PackageValidationResult::PCKG_POLICY);
    BOOST_CHECK_EQUAL(state_duplicates.GetRejectReason(),
                      "package-contains-duplicates");
}

BOOST_AUTO_TEST_CASE(package_validation_tests) {
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
    Package package_parent_child{tx_parent, tx_child};
    const auto result_parent_child =
        ProcessNewPackage(m_node.chainman->ActiveChainstate(), *m_node.mempool,
                          package_parent_child, /*test_accept=*/true);
    if (auto err_parent_child{CheckPackageMempoolAcceptResult(
            package_parent_child, result_parent_child, /*expect_valid=*/true,
            nullptr)}) {
        BOOST_ERROR(err_parent_child.value());
    } else {
        auto it_parent =
            result_parent_child.m_tx_results.find(tx_parent->GetId());
        auto it_child =
            result_parent_child.m_tx_results.find(tx_child->GetId());

        BOOST_CHECK(it_parent->second.m_effective_feerate.value().GetFeeCeiling(
                        GetVirtualTransactionSize(*tx_parent)) == COIN);
        BOOST_CHECK_EQUAL(
            it_parent->second.m_txids_fee_calculations.value().size(), 1);
        BOOST_CHECK_EQUAL(
            it_parent->second.m_txids_fee_calculations.value().front(),
            tx_parent->GetId());

        BOOST_CHECK(it_child->second.m_effective_feerate.value().GetFeeCeiling(
                        GetVirtualTransactionSize(*tx_child)) == COIN);
        BOOST_CHECK_EQUAL(
            it_child->second.m_txids_fee_calculations.value().size(), 1);
        BOOST_CHECK_EQUAL(
            it_child->second.m_txids_fee_calculations.value().front(),
            tx_child->GetId());
    }

    // A single, giant transaction submitted through ProcessNewPackage fails on
    // single tx policy.
    CTransactionRef giant_ptx = create_placeholder_tx(999, 999);
    BOOST_CHECK(GetVirtualTransactionSize(*giant_ptx) >
                MAX_PACKAGE_SIZE * 1000);
    Package package_single_giant{giant_ptx};
    auto result_single_large =
        ProcessNewPackage(m_node.chainman->ActiveChainstate(), *m_node.mempool,
                          package_single_giant, /*test_accept=*/true);
    if (auto err_single_large{CheckPackageMempoolAcceptResult(
            package_single_giant, result_single_large, /*expect_valid=*/false,
            nullptr)}) {
        BOOST_ERROR(err_single_large.value());
    } else {
        BOOST_CHECK_EQUAL(result_single_large.m_state.GetResult(),
                          PackageValidationResult::PCKG_TX);
        BOOST_CHECK_EQUAL(result_single_large.m_state.GetRejectReason(),
                          "transaction failed");
        auto it_giant_tx =
            result_single_large.m_tx_results.find(giant_ptx->GetId());
        BOOST_CHECK_EQUAL(it_giant_tx->second.m_state.GetRejectReason(),
                          "tx-size");
    }

    // Check that mempool size hasn't changed.
    BOOST_CHECK_EQUAL(m_node.mempool->size(), initialPoolSize);
}

BOOST_AUTO_TEST_CASE(noncontextual_package_tests) {
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
        BOOST_CHECK(IsChildWithParentsTree({tx_parent, tx_child}));
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
        BOOST_CHECK(IsChildWithParentsTree(package));

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
        BOOST_CHECK(!IsChildWithParentsTree(
            {tx_parent, tx_parent_also_child, tx_child}));
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

BOOST_AUTO_TEST_CASE(package_submission_tests) {
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
        // We don't expect m_tx_results for each transaction when basic sanity
        // checks haven't passed.
        BOOST_CHECK(result_unrelated_submit.m_state.IsInvalid());
        BOOST_CHECK_EQUAL(result_unrelated_submit.m_state.GetResult(),
                          PackageValidationResult::PCKG_POLICY);
        BOOST_CHECK_EQUAL(result_unrelated_submit.m_state.GetRejectReason(),
                          "package-not-child-with-parents");
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
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
    }

    // Parent and child package where transactions are invalid for reasons other
    // than fee and missing inputs, so the package validation isn't expected to
    // happen.
    {
        CMutableTransaction mtx_parent_invalid{mtx_parent};
        mtx_parent_invalid.vin[0].scriptSig << OP_FALSE;
        CTransactionRef tx_parent_invalid =
            MakeTransactionRef(mtx_parent_invalid);

        // This changed the parent txid so we have to update the child
        // accordingly
        auto mtx_child_of_invalid_parent = CreateValidMempoolTransaction(
            /*input_transaction=*/tx_parent_invalid, /*input_vout=*/0,
            /*input_height=*/101, /*input_signing_key=*/parent_key,
            /*output_destination=*/child_locking_script,
            /*output_amount=*/Amount(48 * COIN), /*submit=*/false);
        CTransactionRef tx_child_of_invalid_parent =
            MakeTransactionRef(mtx_child_of_invalid_parent);

        Package package_invalid_parent{tx_parent_invalid,
                                       tx_child_of_invalid_parent};
        auto result_quit_early = WITH_LOCK(
            cs_main, return ProcessNewPackage(
                         m_node.chainman->ActiveChainstate(), *m_node.mempool,
                         package_invalid_parent, /*test_accept=*/false));
        if (auto err_parent_invalid{CheckPackageMempoolAcceptResult(
                package_invalid_parent, result_quit_early,
                /*expect_valid=*/false, m_node.mempool.get())}) {
            BOOST_ERROR(err_parent_invalid.value());
        } else {
            auto it_parent =
                result_quit_early.m_tx_results.find(tx_parent_invalid->GetId());
            auto it_child = result_quit_early.m_tx_results.find(
                tx_child_of_invalid_parent->GetId());
            BOOST_CHECK_EQUAL(it_parent->second.m_state.GetResult(),
                              TxValidationResult::TX_CONSENSUS);
            BOOST_CHECK_EQUAL(
                it_parent->second.m_state.GetRejectReason(),
                "mandatory-script-verify-flag-failed (Script evaluated without "
                "error but finished with a false/empty top stack element)");
            BOOST_CHECK_EQUAL(it_child->second.m_state.GetResult(),
                              TxValidationResult::TX_MISSING_INPUTS);
            BOOST_CHECK_EQUAL(it_child->second.m_state.GetRejectReason(),
                              "bad-txns-inputs-missingorspent");
        }
        BOOST_CHECK_EQUAL(result_quit_early.m_state.GetResult(),
                          PackageValidationResult::PCKG_TX);
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
        BOOST_CHECK_EQUAL(submit_parent_child.m_tx_results.size(),
                          package_parent_child.size());
        auto it_parent =
            submit_parent_child.m_tx_results.find(tx_parent->GetId());
        auto it_child =
            submit_parent_child.m_tx_results.find(tx_child->GetId());
        BOOST_CHECK(it_parent != submit_parent_child.m_tx_results.end());
        BOOST_CHECK(it_parent->second.m_state.IsValid());
        BOOST_CHECK(it_parent->second.m_effective_feerate ==
                    CFeeRate(1 * COIN, GetVirtualTransactionSize(*tx_parent)));
        BOOST_CHECK_EQUAL(
            it_parent->second.m_txids_fee_calculations.value().size(), 1);
        BOOST_CHECK_EQUAL(
            it_parent->second.m_txids_fee_calculations.value().front(),
            tx_parent->GetId());
        BOOST_CHECK(it_child->second.m_effective_feerate ==
                    CFeeRate(1 * COIN, GetVirtualTransactionSize(*tx_child)));
        BOOST_CHECK_EQUAL(
            it_child->second.m_txids_fee_calculations.value().size(), 1);
        BOOST_CHECK_EQUAL(
            it_child->second.m_txids_fee_calculations.value().front(),
            tx_child->GetId());

        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
    }

    // Already-in-mempool transactions should be detected and de-duplicated.
    {
        LOCK(cs_main);
        const auto submit_deduped = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool,
            package_parent_child, /*test_accept=*/false);
        if (auto err_deduped{CheckPackageMempoolAcceptResult(
                package_parent_child, submit_deduped, /*expect_valid=*/true,
                m_node.mempool.get())}) {
            BOOST_ERROR(err_deduped.value());
        } else {
            auto it_parent_deduped =
                submit_deduped.m_tx_results.find(tx_parent->GetId());
            auto it_child_deduped =
                submit_deduped.m_tx_results.find(tx_child->GetId());
            BOOST_CHECK(it_parent_deduped->second.m_result_type ==
                        MempoolAcceptResult::ResultType::MEMPOOL_ENTRY);
            BOOST_CHECK(it_child_deduped->second.m_result_type ==
                        MempoolAcceptResult::ResultType::MEMPOOL_ENTRY);
        }
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
    }
}

BOOST_AUTO_TEST_CASE(package_mix) {
    // Mine blocks to mature coinbases.
    mineBlocks(5);
    MockMempoolMinFee(CFeeRate(5000 * SATOSHI));
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

    // parent2 will be a new transaction. Put a low feerate to make it invalid
    // on its own.
    auto mtx_parent2 = CreateValidMempoolTransaction(
        /*input_transaction=*/m_coinbase_txns[3], /*input_vout=*/0,
        /*input_height=*/0, /*input_signing_key=*/coinbaseKey,
        /*output_destination=*/acs_spk,
        /*output_amount=*/Amount{50 * COIN - low_fee_amt}, /*submit=*/false);
    CTransactionRef ptx_parent2 = MakeTransactionRef(mtx_parent2);
    package_mixed.push_back(ptx_parent2);
    BOOST_CHECK(m_node.mempool->GetMinFee().GetFee(
                    GetVirtualTransactionSize(*ptx_parent2)) > low_fee_amt);
    BOOST_CHECK(m_node.mempool->m_min_relay_feerate.GetFee(
                    GetVirtualTransactionSize(*ptx_parent2)) <= low_fee_amt);

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
    mtx_mixed_child.vout.push_back(
        CTxOut((49 + 50 - 1) * COIN, mixed_child_spk));
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
        if (auto err_mixed{CheckPackageMempoolAcceptResult(
                package_mixed, mixed_result, /*expect_valid=*/true,
                m_node.mempool.get())}) {
            BOOST_ERROR(err_mixed.value());
        } else {
            auto it_parent1 =
                mixed_result.m_tx_results.find(ptx_parent1->GetId());
            auto it_parent2 =
                mixed_result.m_tx_results.find(ptx_parent2->GetId());
            auto it_child =
                mixed_result.m_tx_results.find(ptx_mixed_child->GetId());

            BOOST_CHECK(it_parent1->second.m_result_type ==
                        MempoolAcceptResult::ResultType::MEMPOOL_ENTRY);
            BOOST_CHECK(it_parent2->second.m_result_type ==
                        MempoolAcceptResult::ResultType::VALID);
            BOOST_CHECK(it_child->second.m_result_type ==
                        MempoolAcceptResult::ResultType::VALID);

            // package feerate should include parent2 and child. It should not
            // include parent1.
            const CFeeRate expected_feerate(
                1 * COIN, GetVirtualTransactionSize(*ptx_parent2) +
                              GetVirtualTransactionSize(*ptx_mixed_child));
            BOOST_CHECK(it_parent2->second.m_effective_feerate.value() ==
                        expected_feerate);
            BOOST_CHECK(it_child->second.m_effective_feerate.value() ==
                        expected_feerate);
            std::vector<TxId> expected_txids(
                {ptx_parent2->GetId(), ptx_mixed_child->GetId()});
            BOOST_CHECK(it_parent2->second.m_txids_fee_calculations.value() ==
                        expected_txids);
            BOOST_CHECK(it_child->second.m_txids_fee_calculations.value() ==
                        expected_txids);
        }
    }
}

BOOST_AUTO_TEST_CASE(package_cpfp_tests) {
    mineBlocks(5);
    MockMempoolMinFee(CFeeRate(5000 * SATOSHI));
    LOCK(::cs_main);
    size_t expected_pool_size = m_node.mempool->size();
    CKey child_key;
    child_key.MakeNewKey(true);
    CScript parent_spk = GetScriptForDestination(PKHash(child_key.GetPubKey()));
    CKey grandchild_key;
    grandchild_key.MakeNewKey(true);
    CScript child_spk =
        GetScriptForDestination(PKHash(grandchild_key.GetPubKey()));

    // low-fee parent and high-fee child package
    const Amount coinbase_value{50 * COIN};
    const Amount parent_value{coinbase_value - low_fee_amt};
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
    // into account. De-prioritise the parent transaction to bring the package
    // feerate to 0.
    m_node.mempool->PrioritiseTransaction(tx_parent->GetId(),
                                          child_value - coinbase_value);
    {
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        const auto submit_cpfp_deprio = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool, package_cpfp,
            /*test_accept=*/false);
        if (auto err_cpfp_deprio{CheckPackageMempoolAcceptResult(
                package_cpfp, submit_cpfp_deprio, /*expect_valid=*/false,
                m_node.mempool.get())}) {
            BOOST_ERROR(err_cpfp_deprio.value());
        } else {
            BOOST_CHECK_EQUAL(submit_cpfp_deprio.m_state.GetResult(),
                              PackageValidationResult::PCKG_TX);
            BOOST_CHECK_EQUAL(
                submit_cpfp_deprio.m_tx_results.find(tx_parent->GetId())
                    ->second.m_state.GetResult(),
                TxValidationResult::TX_MEMPOOL_POLICY);
            BOOST_CHECK_EQUAL(
                submit_cpfp_deprio.m_tx_results.find(tx_child->GetId())
                    ->second.m_state.GetResult(),
                TxValidationResult::TX_MISSING_INPUTS);
            BOOST_CHECK(
                submit_cpfp_deprio.m_tx_results.find(tx_parent->GetId())
                    ->second.m_state.GetRejectReason() ==
                "min relay fee not met");
            BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        }
    }

    // Clear the prioritisation of the parent transaction.
    WITH_LOCK(m_node.mempool->cs,
              m_node.mempool->ClearPrioritisation(tx_parent->GetId()));

    // Package CPFP: Even though the parent's feerate is below the mempool
    // minimum feerate, the child pays enough for the package feerate to meet
    // the threshold.
    {
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
        const auto submit_cpfp = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool, package_cpfp,
            /*test_accept=*/false);
        if (auto err_cpfp{CheckPackageMempoolAcceptResult(
                package_cpfp, submit_cpfp, /*expect_valid=*/true,
                m_node.mempool.get())}) {
            BOOST_ERROR(err_cpfp.value());
        } else {
            auto it_parent = submit_cpfp.m_tx_results.find(tx_parent->GetId());
            auto it_child = submit_cpfp.m_tx_results.find(tx_child->GetId());
            BOOST_CHECK(it_parent->second.m_result_type ==
                        MempoolAcceptResult::ResultType::VALID);
            BOOST_CHECK(it_parent->second.m_base_fees.value() ==
                        coinbase_value - parent_value);
            BOOST_CHECK(it_child->second.m_result_type ==
                        MempoolAcceptResult::ResultType::VALID);
            BOOST_CHECK(it_child->second.m_base_fees.value() == COIN);

            const CFeeRate expected_feerate(
                coinbase_value - child_value,
                GetVirtualTransactionSize(*tx_parent) +
                    GetVirtualTransactionSize(*tx_child));
            BOOST_CHECK(it_parent->second.m_effective_feerate.value() ==
                        expected_feerate);
            BOOST_CHECK(it_child->second.m_effective_feerate.value() ==
                        expected_feerate);
            std::vector<TxId> expected_txids(
                {tx_parent->GetId(), tx_child->GetId()});
            BOOST_CHECK(it_parent->second.m_txids_fee_calculations.value() ==
                        expected_txids);
            BOOST_CHECK(it_child->second.m_txids_fee_calculations.value() ==
                        expected_txids);
            BOOST_CHECK(expected_feerate.GetFeePerK() > 1000 * SATOSHI);
        }
        expected_pool_size += 2;
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
    }

    // Just because we allow low-fee parents doesn't mean we allow low-feerate
    // packages. The mempool minimum feerate is 5sat/vB, but this package just
    // pays 1400 satoshis total. The child fees would be able to pay for itself,
    // but isn't enough for the entire package.
    Package package_still_too_low;
    const Amount parent_fee{200 * SATOSHI};
    const Amount child_fee{1200 * SATOSHI};
    auto mtx_parent_cheap = CreateValidMempoolTransaction(
        /*input_transaction=*/m_coinbase_txns[1], /*input_vout=*/0,
        /*input_height=*/0, /*input_signing_key=*/coinbaseKey,
        /*output_destination=*/parent_spk,
        /*output_amount=*/coinbase_value - parent_fee, /*submit=*/false);
    CTransactionRef tx_parent_cheap = MakeTransactionRef(mtx_parent_cheap);
    package_still_too_low.push_back(tx_parent_cheap);
    BOOST_CHECK(m_node.mempool->GetMinFee().GetFee(
                    GetVirtualTransactionSize(*tx_parent_cheap)) > parent_fee);
    BOOST_CHECK(m_node.mempool->m_min_relay_feerate.GetFee(
                    GetVirtualTransactionSize(*tx_parent_cheap)) <= parent_fee);

    auto mtx_child_cheap = CreateValidMempoolTransaction(
        /*input_transaction=*/tx_parent_cheap, /*input_vout=*/0,
        /*input_height=*/101, /* input_signing_key */ child_key,
        /*output_destination=*/child_spk,
        /*output_amount=*/coinbase_value - parent_fee - child_fee,
        /*submit=*/false);
    CTransactionRef tx_child_cheap = MakeTransactionRef(mtx_child_cheap);
    package_still_too_low.push_back(tx_child_cheap);
    BOOST_CHECK(m_node.mempool->GetMinFee().GetFee(
                    GetVirtualTransactionSize(*tx_child_cheap)) <= child_fee);
    BOOST_CHECK(m_node.mempool->GetMinFee().GetFee(
                    GetVirtualTransactionSize(*tx_parent_cheap) +
                    GetVirtualTransactionSize(*tx_child_cheap)) >
                parent_fee + child_fee);
    BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);

    // Cheap package should fail for being too low fee.
    {
        const auto submit_package_too_low = ProcessNewPackage(
            m_node.chainman->ActiveChainstate(), *m_node.mempool,
            package_still_too_low, /* test_accept */ false);
        if (auto err_package_too_low{CheckPackageMempoolAcceptResult(
                package_still_too_low, submit_package_too_low,
                /*expect_valid=*/false, m_node.mempool.get())}) {
            BOOST_ERROR(err_package_too_low.value());
        } else {
            // Individual feerate of parent is too low.
            BOOST_CHECK_EQUAL(
                submit_package_too_low.m_tx_results.at(tx_parent_cheap->GetId())
                    .m_state.GetResult(),
                TxValidationResult::TX_PACKAGE_RECONSIDERABLE);
            BOOST_CHECK(
                submit_package_too_low.m_tx_results.at(tx_parent_cheap->GetId())
                    .m_effective_feerate.value() ==
                CFeeRate(parent_fee,
                         GetVirtualTransactionSize(*tx_parent_cheap)));
            // Package feerate of parent + child is too low.
            BOOST_CHECK_EQUAL(
                submit_package_too_low.m_tx_results.at(tx_child_cheap->GetId())
                    .m_state.GetResult(),
                TxValidationResult::TX_PACKAGE_RECONSIDERABLE);
            BOOST_CHECK(
                submit_package_too_low.m_tx_results.at(tx_child_cheap->GetId())
                    .m_effective_feerate.value() ==
                CFeeRate(parent_fee + child_fee,
                         GetVirtualTransactionSize(*tx_parent_cheap) +
                             GetVirtualTransactionSize(*tx_child_cheap)));
        }
        BOOST_CHECK_EQUAL(submit_package_too_low.m_state.GetResult(),
                          PackageValidationResult::PCKG_TX);
        BOOST_CHECK_EQUAL(submit_package_too_low.m_state.GetRejectReason(),
                          "transaction failed");
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
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
        if (auto err_prioritised{CheckPackageMempoolAcceptResult(
                package_still_too_low, submit_prioritised_package,
                /*expect_valid=*/true, m_node.mempool.get())}) {
            BOOST_ERROR(err_prioritised.value());
        } else {
            const CFeeRate expected_feerate(
                1 * COIN + parent_fee + child_fee,
                GetVirtualTransactionSize(*tx_parent_cheap) +
                    GetVirtualTransactionSize(*tx_child_cheap));
            BOOST_CHECK_EQUAL(submit_prioritised_package.m_tx_results.size(),
                              package_still_too_low.size());
            auto it_parent = submit_prioritised_package.m_tx_results.find(
                tx_parent_cheap->GetId());
            auto it_child = submit_prioritised_package.m_tx_results.find(
                tx_child_cheap->GetId());
            BOOST_CHECK(it_parent->second.m_result_type ==
                        MempoolAcceptResult::ResultType::VALID);
            BOOST_CHECK(it_parent->second.m_base_fees.value() == parent_fee);
            BOOST_CHECK(it_parent->second.m_effective_feerate.value() ==
                        expected_feerate);
            BOOST_CHECK(it_child->second.m_result_type ==
                        MempoolAcceptResult::ResultType::VALID);
            BOOST_CHECK(it_child->second.m_base_fees.value() == child_fee);
            BOOST_CHECK(it_child->second.m_effective_feerate.value() ==
                        expected_feerate);
            std::vector<TxId> expected_txids(
                {tx_parent_cheap->GetId(), tx_child_cheap->GetId()});
            BOOST_CHECK(it_parent->second.m_txids_fee_calculations.value() ==
                        expected_txids);
            BOOST_CHECK(it_child->second.m_txids_fee_calculations.value() ==
                        expected_txids);
        }
        expected_pool_size += 2;
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
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
        if (auto err_rich_parent{CheckPackageMempoolAcceptResult(
                package_rich_parent, submit_rich_parent, /*expect_valid=*/false,
                m_node.mempool.get())}) {
            BOOST_ERROR(err_rich_parent.value());
        } else {
            // The child would have been validated on its own and failed.
            BOOST_CHECK_EQUAL(submit_rich_parent.m_state.GetResult(),
                              PackageValidationResult::PCKG_TX);
            BOOST_CHECK_EQUAL(submit_rich_parent.m_state.GetRejectReason(),
                              "transaction failed");

            auto it_parent =
                submit_rich_parent.m_tx_results.find(tx_parent_rich->GetId());
            auto it_child =
                submit_rich_parent.m_tx_results.find(tx_child_poor->GetId());
            BOOST_CHECK(it_parent->second.m_result_type ==
                        MempoolAcceptResult::ResultType::VALID);
            BOOST_CHECK(it_child->second.m_result_type ==
                        MempoolAcceptResult::ResultType::INVALID);
            BOOST_CHECK(it_parent->second.m_state.GetRejectReason() == "");
            BOOST_CHECK_MESSAGE(
                it_parent->second.m_base_fees.value() == high_parent_fee,
                strprintf("rich parent: expected fee %s, got %s",
                          high_parent_fee,
                          it_parent->second.m_base_fees.value()));
            BOOST_CHECK(it_parent->second.m_effective_feerate ==
                        CFeeRate(high_parent_fee,
                                 GetVirtualTransactionSize(*tx_parent_rich)));
            BOOST_CHECK_EQUAL(it_child->second.m_result_type,
                              MempoolAcceptResult::ResultType::INVALID);
            BOOST_CHECK_EQUAL(it_child->second.m_state.GetResult(),
                              TxValidationResult::TX_MEMPOOL_POLICY);
            BOOST_CHECK(it_child->second.m_state.GetRejectReason() ==
                        "min relay fee not met");
        }
        expected_pool_size += 1;
        BOOST_CHECK_EQUAL(m_node.mempool->size(), expected_pool_size);
    }
}
BOOST_AUTO_TEST_SUITE_END()
