// Copyright (c) 2011-2022 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <addresstype.h>
#include <consensus/validation.h>
#include <net_processing.h>
#include <node/txdownloadman_impl.h>
#include <primitives/transaction.h>
#include <script/script.h>
#include <txmempool.h>
#include <txorphanage.h>
#include <validation.h>

#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <map>

BOOST_FIXTURE_TEST_SUITE(txdownload_tests, TestingSetup)

struct Behaviors {
    bool m_in_rejects;
    bool m_in_rejects_recon;
    bool m_keep_for_compact;
    bool m_ignore_inv;

    // Constructor. We are passing and casting ints because they are more
    // readable in a table (see expected_behaviors).
    Behaviors(bool rejects, bool recon, bool keep, bool inv)
        : m_in_rejects(rejects), m_in_rejects_recon(recon),
          m_keep_for_compact(keep), m_ignore_inv(inv) {}

    void CheckEqual(const Behaviors &other) {
        BOOST_CHECK_EQUAL(other.m_in_rejects, m_in_rejects);
        BOOST_CHECK_EQUAL(other.m_in_rejects_recon, m_in_rejects_recon);
        BOOST_CHECK_EQUAL(other.m_keep_for_compact, m_keep_for_compact);
        BOOST_CHECK_EQUAL(other.m_ignore_inv, m_ignore_inv);
    }
};

// Map from failure reason to expected behavior for a tx that fails.
// Note that TX_AVALANCHE_RECONSIDERABLE is handled by the PeerManager when
// avalanche preconsensus is activated. From the TxDownloadManager point of
// view it is a regular failure.
// clang-format off
static std::map<TxValidationResult, Behaviors> expected_behaviors{
    {TxValidationResult::TX_CONSENSUS,                {/*rejects*/1, /*recon*/0, /*keep*/1, /*inv*/1}},
    {TxValidationResult::TX_INPUTS_NOT_STANDARD,      {           1,          0,         1,        1}},
    {TxValidationResult::TX_NOT_STANDARD,             {           1,          0,         1,        1}},
    {TxValidationResult::TX_MISSING_INPUTS,           {           0,          0,         1,        1}},
    {TxValidationResult::TX_PREMATURE_SPEND,          {           1,          0,         1,        1}},
    {TxValidationResult::TX_DUPLICATE,                {           1,          0,         1,        1}},
    {TxValidationResult::TX_CONFLICT,                 {           1,          0,         1,        1}},
    {TxValidationResult::TX_CHILD_BEFORE_PARENT,      {           1,          0,         1,        1}},
    {TxValidationResult::TX_MEMPOOL_POLICY,           {           1,          0,         1,        1}},
    {TxValidationResult::TX_NO_MEMPOOL,               {           1,          0,         1,        1}},
    {TxValidationResult::TX_PACKAGE_RECONSIDERABLE,   {           0,          1,         1,        1}},
    {TxValidationResult::TX_AVALANCHE_RECONSIDERABLE, {           1,          0,         1,        1}},
    {TxValidationResult::TX_UNKNOWN,                  {           1,          0,         1,        1}},
};
// clang-format on

/**
 * In Bitcoin ABC the orphanage is owned by the mempool, so it is shared by all
 * the TxDownloadManagerImpl instances created in these tests. This wrapper
 * connects the peer upon construction and disconnects it upon destruction, so
 * that the orphans it added are removed from the mempool's orphanage and don't
 * leak into the next test case.
 */
struct TestTxDownloadManagerImpl : public node::TxDownloadManagerImpl {
    const NodeId m_nodeid;

    TestTxDownloadManagerImpl(const node::TxDownloadOptions &options,
                              NodeId nodeid,
                              const node::TxDownloadConnectionInfo &info)
        : node::TxDownloadManagerImpl(options), m_nodeid(nodeid) {
        ConnectedPeer(m_nodeid, info);
    }

    ~TestTxDownloadManagerImpl() { DisconnectedPeer(m_nodeid); }

    bool HaveOrphan(const TxId &txid) const {
        return m_opts.m_mempool.withOrphanage(
            [&txid](const TxOrphanage &orphanage) {
                return orphanage.HaveTx(txid);
            });
    }
};

static bool CheckOrphanBehavior(TestTxDownloadManagerImpl &txdownload_impl,
                                const CTransactionRef &tx,
                                const node::RejectedTxTodo &ret,
                                std::string &err_msg, bool expect_orphan,
                                bool expect_keep,
                                unsigned int expected_parents) {
    // Missing inputs can never result in a PackageToValidate.
    if (ret.m_package_to_validate.has_value()) {
        err_msg = strprintf("returned a PackageToValidate on missing inputs");
        return false;
    }

    if (expect_orphan != txdownload_impl.HaveOrphan(tx->GetId())) {
        err_msg = strprintf("unexpectedly %s tx in orpanage",
                            expect_orphan ? "did not find" : "found");
        return false;
    }
    if (expect_keep != ret.m_should_add_extra_compact_tx) {
        err_msg =
            strprintf("unexpectedly returned %s add to vExtraTxnForCompact",
                      expect_keep ? "should not" : "should");
        return false;
    }
    if (expected_parents != ret.m_unique_parents.size()) {
        err_msg = strprintf("expected %u unique_parents, got %u",
                            expected_parents, ret.m_unique_parents.size());
        return false;
    }
    return true;
}

static CTransactionRef CreatePlaceholderTx() {
    // Each tx returned from here spends the previous one.
    static TxId prevout_txid{};

    CMutableTransaction mtx;
    mtx.vin.emplace_back(COutPoint{prevout_txid, 0});
    mtx.vout.emplace_back(CENT, CScript());
    auto ptx = MakeTransactionRef(mtx);
    prevout_txid = ptx->GetId();
    return ptx;
}

BOOST_FIXTURE_TEST_CASE(tx_rejection_types, TestChain100Setup) {
    CTxMemPool &pool = *Assert(m_node.mempool);
    FastRandomContext det_rand{true};
    node::TxDownloadOptions DEFAULT_OPTS{pool, det_rand,
                                         DEFAULT_MAX_ORPHAN_TRANSACTIONS, true};

    // A new TxDownloadManagerImpl is created for each tx so we can just reuse
    // the same one.
    TxValidationState state;
    NodeId nodeid{0};
    const auto now{GetTime<std::chrono::microseconds>()};
    node::TxDownloadConnectionInfo connection_info{
        /*m_preferred=*/false, /*m_relay_permissions=*/false};

    const auto ptx_parent = CreatePlaceholderTx();
    const auto ptx_child = CreatePlaceholderTx();
    const auto &parent_txid = ptx_parent->GetId();
    const auto &child_txid = ptx_child->GetId();

    for (const auto &[result, expected_behavior] : expected_behaviors) {
        TestTxDownloadManagerImpl txdownload_impl{DEFAULT_OPTS, nodeid,
                                                  connection_info};
        // Parent failure
        state.Invalid(result, "");
        const auto &[keep, unique_txids, package_to_validate] =
            txdownload_impl.MempoolRejectedTx(ptx_parent, state, nodeid,
                                              /*first_time_failure=*/true);

        Behaviors actual_behavior{
            /*rejects=*/txdownload_impl.RecentRejectsFilter().contains(
                parent_txid),
            /*recon=*/
            txdownload_impl.RecentRejectsPackageReconsiderableFilter().contains(
                parent_txid),
            /*keep=*/keep,
            /*inv=*/
            txdownload_impl.AddTxAnnouncement(nodeid, parent_txid, now,
                                              /*p2p_inv=*/true),
        };
        BOOST_TEST_MESSAGE("Testing behavior for result "
                           << static_cast<int>(result));
        actual_behavior.CheckEqual(expected_behavior);

        // Later, a child of this transaction fails for missing inputs
        state.Invalid(TxValidationResult::TX_MISSING_INPUTS, "");
        txdownload_impl.MempoolRejectedTx(ptx_child, state, nodeid,
                                          /*first_time_failure=*/true);

        // If parent was rejected, child is too.
        const bool parent_rejected{expected_behavior.m_in_rejects};
        BOOST_CHECK_EQUAL(
            parent_rejected,
            txdownload_impl.RecentRejectsFilter().contains(child_txid));

        // Unless rejected, the child should be in orphanage.
        BOOST_CHECK_EQUAL(!parent_rejected,
                          txdownload_impl.HaveOrphan(child_txid));
    }
}

BOOST_FIXTURE_TEST_CASE(handle_missing_inputs, TestChain100Setup) {
    CTxMemPool &pool = *Assert(m_node.mempool);
    FastRandomContext det_rand{true};
    node::TxDownloadOptions DEFAULT_OPTS{pool, det_rand,
                                         DEFAULT_MAX_ORPHAN_TRANSACTIONS, true};
    NodeId nodeid{1};
    node::TxDownloadConnectionInfo DEFAULT_CONN{/*m_preferred=*/false,
                                                /*m_relay_permissions=*/false};

    // We need mature coinbases
    mineBlocks(20);

    // Transactions with missing inputs are treated differently depending on
    // how much we know about their parents.
    CKey wallet_key;
    wallet_key.MakeNewKey(true);
    CScript destination =
        GetScriptForDestination(PKHash(wallet_key.GetPubKey()));
    // Amount for spending coinbase in a 1-in-1-out tx, at depth n, each time
    // deducting 1000 from the amount as fees.
    const Amount amount_depth_1{50 * COIN - 1000 * SATOSHI};
    const Amount amount_depth_2{amount_depth_1 - 1000 * SATOSHI};
    // Amount for spending coinbase in a 1-in-2-out tx, deducting 1000 in fees
    const Amount amount_split_half{25 * COIN - 500 * SATOSHI};
    int test_chain_height{100};

    TxValidationState state_orphan;
    state_orphan.Invalid(TxValidationResult::TX_MISSING_INPUTS, "");

    // Transactions are not all submitted to mempool. Conserve the number of
    // m_coinbase_txns we consume, and only increment this index number when we
    // would conflict with an existing mempool transaction.
    size_t coinbase_idx{0};

    for (int decisions = 0; decisions < (1 << 4); ++decisions) {
        auto mtx_single_parent = CreateValidMempoolTransaction(
            m_coinbase_txns[coinbase_idx], /*input_vout=*/0, test_chain_height,
            coinbaseKey, destination, amount_depth_1, /*submit=*/false);
        auto single_parent = MakeTransactionRef(mtx_single_parent);

        auto mtx_orphan = CreateValidMempoolTransaction(
            single_parent, /*input_vout=*/0, test_chain_height, wallet_key,
            destination, amount_depth_2, /*submit=*/false);
        auto orphan = MakeTransactionRef(mtx_orphan);

        TestTxDownloadManagerImpl txdownload_impl{DEFAULT_OPTS, nodeid,
                                                  DEFAULT_CONN};

        // Each bit of decisions tells us whether the parent is in a particular
        // cache. It is definitely possible for a transaction to be in multiple
        // caches. For example, it may have both a low feerate and found to
        // violate some mempool policy when validated in a 1p1c.
        const bool parent_recent_rej(decisions & 1);
        const bool parent_recent_rej_recon((decisions >> 1) & 1);
        const bool parent_recent_conf((decisions >> 2) & 1);
        const bool parent_in_mempool((decisions >> 3) & 1);

        if (parent_recent_rej) {
            txdownload_impl.RecentRejectsFilter().insert(
                single_parent->GetId());
        }
        if (parent_recent_rej_recon) {
            txdownload_impl.RecentRejectsPackageReconsiderableFilter().insert(
                single_parent->GetId());
        }
        if (parent_recent_conf) {
            txdownload_impl.RecentConfirmedTransactionsFilter().insert(
                single_parent->GetId());
        }
        if (parent_in_mempool) {
            const auto mempool_result = WITH_LOCK(
                ::cs_main,
                return m_node.chainman->ProcessTransaction(single_parent));
            BOOST_CHECK(mempool_result.m_result_type ==
                        MempoolAcceptResult::ResultType::VALID);
            coinbase_idx += 1;
            assert(coinbase_idx < m_coinbase_txns.size());
        }

        // Whether or not the transaction is added as an orphan depends solely
        // on whether or not it's in RecentRejectsFilter. Specifically, the
        // parent is allowed to be in RecentRejectsPackageReconsiderableFilter,
        // but it cannot be in RecentRejectsFilter.
        const bool expect_keep_orphan = !parent_recent_rej;
        const auto ret_1p1c = txdownload_impl.MempoolRejectedTx(
            orphan, state_orphan, nodeid, /*first_time_failure=*/true);
        std::string err_msg;
        const bool ok = CheckOrphanBehavior(
            txdownload_impl, orphan, ret_1p1c, err_msg,
            /*expect_orphan=*/expect_keep_orphan, /*expect_keep=*/true,
            /*expected_parents=*/expect_keep_orphan ? 1 : 0);
        BOOST_CHECK_MESSAGE(ok, err_msg);
    }

    // Orphan with multiple parents
    {
        std::vector<CTransactionRef> parents;
        int32_t num_parents{24};
        for (int32_t i = 0; i < num_parents; ++i) {
            assert(coinbase_idx < m_coinbase_txns.size());
            auto mtx_parent = CreateValidMempoolTransaction(
                m_coinbase_txns[coinbase_idx++], /*input_vout=*/0,
                test_chain_height, coinbaseKey, destination,
                amount_depth_1 + i * SATOSHI, /*submit=*/false);
            parents.emplace_back(MakeTransactionRef(mtx_parent));
        }

        // Send all coins to 1 output. This transaction is never submitted to
        // the mempool, so there is no need to sign it.
        CMutableTransaction mtx_orphan;
        for (const auto &parent : parents) {
            mtx_orphan.vin.emplace_back(COutPoint{parent->GetId(), 0});
        }
        mtx_orphan.vout.emplace_back(int64_t{num_parents} * amount_depth_2,
                                     destination);
        auto orphan = MakeTransactionRef(mtx_orphan);

        // 1 parent in RecentRejectsPackageReconsiderableFilter, the rest are
        // unknown
        {
            TestTxDownloadManagerImpl txdownload_impl{DEFAULT_OPTS, nodeid,
                                                      DEFAULT_CONN};

            txdownload_impl.RecentRejectsPackageReconsiderableFilter().insert(
                parents[0]->GetId());
            const auto ret_1p1c_parent_reconsiderable =
                txdownload_impl.MempoolRejectedTx(orphan, state_orphan, nodeid,
                                                  /*first_time_failure=*/true);
            std::string err_msg;
            const bool ok = CheckOrphanBehavior(
                txdownload_impl, orphan, ret_1p1c_parent_reconsiderable,
                err_msg,
                /*expect_orphan=*/true, /*expect_keep=*/true,
                /*expected_parents=*/num_parents);
            BOOST_CHECK_MESSAGE(ok, err_msg);
        }

        // 1 parent in RecentRejectsPackageReconsiderableFilter, the rest are
        // confirmed
        {
            TestTxDownloadManagerImpl txdownload_impl{DEFAULT_OPTS, nodeid,
                                                      DEFAULT_CONN};

            txdownload_impl.RecentRejectsPackageReconsiderableFilter().insert(
                parents[0]->GetId());
            for (int32_t i = 1; i < num_parents; ++i) {
                txdownload_impl.RecentConfirmedTransactionsFilter().insert(
                    parents[i]->GetId());
            }

            const auto ret_1recon_conf =
                txdownload_impl.MempoolRejectedTx(orphan, state_orphan, nodeid,
                                                  /*first_time_failure=*/true);
            std::string err_msg;
            const bool ok = CheckOrphanBehavior(
                txdownload_impl, orphan, ret_1recon_conf, err_msg,
                /*expect_orphan=*/true, /*expect_keep=*/true,
                /*expected_parents=*/num_parents);
            BOOST_CHECK_MESSAGE(ok, err_msg);
        }

        // 1 parent in RecentRejectsPackageReconsiderableFilter, 1 other in
        // {RecentRejectsPackageReconsiderableFilter, RecentRejectsFilter}
        for (int i = 0; i < 2; ++i) {
            TestTxDownloadManagerImpl txdownload_impl{DEFAULT_OPTS, nodeid,
                                                      DEFAULT_CONN};

            txdownload_impl.RecentRejectsPackageReconsiderableFilter().insert(
                parents[1]->GetId());

            // Doesn't really matter which parent
            auto &alreadyhave_parent = parents[0];
            if (i == 0) {
                txdownload_impl.RecentRejectsPackageReconsiderableFilter()
                    .insert(alreadyhave_parent->GetId());
            } else if (i == 1) {
                txdownload_impl.RecentRejectsFilter().insert(
                    alreadyhave_parent->GetId());
            }

            const auto ret_2_problems =
                txdownload_impl.MempoolRejectedTx(orphan, state_orphan, nodeid,
                                                  /*first_time_failure=*/true);
            std::string err_msg;
            const bool ok = CheckOrphanBehavior(
                txdownload_impl, orphan, ret_2_problems, err_msg,
                /*expect_orphan=*/false, /*expect_keep=*/true,
                /*expected_parents=*/0);
            BOOST_CHECK_MESSAGE(ok, err_msg);
        }
    }

    // Orphan with multiple inputs spending from a single parent. These
    // transactions are never submitted to the mempool, so there is no need to
    // sign them.
    {
        assert(coinbase_idx < m_coinbase_txns.size());
        CMutableTransaction mtx_parent_2outputs;
        mtx_parent_2outputs.vin.emplace_back(
            COutPoint{m_coinbase_txns[coinbase_idx]->GetId(), 0});
        mtx_parent_2outputs.vout.emplace_back(amount_split_half, destination);
        mtx_parent_2outputs.vout.emplace_back(amount_split_half, destination);
        auto parent_2outputs = MakeTransactionRef(mtx_parent_2outputs);

        CMutableTransaction mtx_orphan;
        mtx_orphan.vin.emplace_back(COutPoint{parent_2outputs->GetId(), 0});
        mtx_orphan.vin.emplace_back(COutPoint{parent_2outputs->GetId(), 1});
        mtx_orphan.vout.emplace_back(amount_depth_2, destination);
        auto orphan = MakeTransactionRef(mtx_orphan);

        // Parent is in RecentRejectsPackageReconsiderableFilter. Inputs will
        // find it twice, but this should only counts as 1 parent in the filter.
        {
            TestTxDownloadManagerImpl txdownload_impl{DEFAULT_OPTS, nodeid,
                                                      DEFAULT_CONN};

            txdownload_impl.RecentRejectsPackageReconsiderableFilter().insert(
                parent_2outputs->GetId());
            const auto ret_1p1c_2reconsiderable =
                txdownload_impl.MempoolRejectedTx(orphan, state_orphan, nodeid,
                                                  /*first_time_failure=*/true);
            std::string err_msg;
            const bool ok = CheckOrphanBehavior(
                txdownload_impl, orphan, ret_1p1c_2reconsiderable, err_msg,
                /*expect_orphan=*/true, /*expect_keep=*/true,
                /*expected_parents=*/1);
            BOOST_CHECK_MESSAGE(ok, err_msg);
        }
    }
}

BOOST_AUTO_TEST_SUITE_END()
