// Copyright (c) 2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>
#include <consensus/validation.h>
#include <hash.h>
#include <node/context.h>
#include <node/txdownloadman.h>
#include <node/txdownloadman_impl.h>
#include <policy/packages.h>
#include <primitives/block.h>
#include <primitives/transaction.h>
#include <txmempool.h>
#include <txorphanage.h>
#include <validation.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>
#include <test/util/script.h>
#include <test/util/setup_common.h>

#include <chrono>
#include <memory>
#include <vector>

namespace {

const TestingSetup *g_setup;

constexpr size_t NUM_COINS{50};
COutPoint COINS[NUM_COINS];

static TxValidationResult TESTED_TX_RESULTS[] = {
    // Skip TX_RESULT_UNSET
    TxValidationResult::TX_CONSENSUS,
    TxValidationResult::TX_INPUTS_NOT_STANDARD,
    TxValidationResult::TX_NOT_STANDARD,
    TxValidationResult::TX_MISSING_INPUTS,
    TxValidationResult::TX_PREMATURE_SPEND,
    TxValidationResult::TX_DUPLICATE,
    TxValidationResult::TX_CONFLICT,
    TxValidationResult::TX_CHILD_BEFORE_PARENT,
    TxValidationResult::TX_MEMPOOL_POLICY,
    // Skip TX_NO_MEMPOOL
    TxValidationResult::TX_PACKAGE_RECONSIDERABLE,
    TxValidationResult::TX_AVALANCHE_RECONSIDERABLE,
    TxValidationResult::TX_UNKNOWN,
};

// Precomputed transactions. Some may conflict with each other.
std::vector<CTransactionRef> TRANSACTIONS;

// Limit the total number of peers because we don't expect coverage to change
// much with lots more peers.
constexpr int NUM_PEERS = 16;

// Precomputed random durations (positive and negative, each ~exponentially
// distributed).
std::chrono::microseconds TIME_SKIPS[128];

static CTransactionRef
MakeTransactionSpending(const std::vector<COutPoint> &outpoints,
                        size_t num_outputs) {
    CMutableTransaction tx;
    for (const auto &outpoint : outpoints) {
        tx.vin.emplace_back(outpoint);
    }
    for (size_t o = 0; o < num_outputs; ++o) {
        tx.vout.emplace_back(CENT, P2SH_OP_TRUE);
    }
    return MakeTransactionRef(tx);
}

static std::vector<COutPoint>
PickCoins(FuzzedDataProvider &fuzzed_data_provider) {
    std::vector<COutPoint> ret;
    ret.push_back(fuzzed_data_provider.PickValueInArray(COINS));
    LIMITED_WHILE(fuzzed_data_provider.ConsumeBool(), 10) {
        ret.push_back(fuzzed_data_provider.PickValueInArray(COINS));
    }
    return ret;
}

void initialize() {
    static const auto testing_setup =
        MakeNoLogFileContext<const TestingSetup>();
    g_setup = testing_setup.get();
    for (uint32_t i = 0; i < uint32_t{NUM_COINS}; ++i) {
        COINS[i] = COutPoint{TxId{(HashWriter() << i).GetHash()}, i};
    }
    size_t outpoints_index = 0;
    // 2 parents 1 child
    {
        auto tx_parent_1{MakeTransactionSpending({COINS[outpoints_index++]},
                                                 /*num_outputs=*/1)};
        TRANSACTIONS.emplace_back(tx_parent_1);
        auto tx_parent_2{MakeTransactionSpending({COINS[outpoints_index++]},
                                                 /*num_outputs=*/1)};
        TRANSACTIONS.emplace_back(tx_parent_2);
        TRANSACTIONS.emplace_back(
            MakeTransactionSpending({COutPoint{tx_parent_1->GetId(), 0},
                                     COutPoint{tx_parent_2->GetId(), 0}},
                                    /*num_outputs=*/1));
    }
    // 1 parent 2 children
    {
        auto tx_parent{MakeTransactionSpending({COINS[outpoints_index++]},
                                               /*num_outputs=*/2)};
        TRANSACTIONS.emplace_back(tx_parent);
        TRANSACTIONS.emplace_back(MakeTransactionSpending(
            {COutPoint{tx_parent->GetId(), 0}}, /*num_outputs=*/1));
        TRANSACTIONS.emplace_back(MakeTransactionSpending(
            {COutPoint{tx_parent->GetId(), 1}}, /*num_outputs=*/1));
    }
    // 2 chains of 5
    for (auto chain{0}; chain < 2; ++chain) {
        COutPoint &last_outpoint = COINS[outpoints_index++];
        for (auto i{0}; i < 5; ++i) {
            auto tx{MakeTransactionSpending({last_outpoint},
                                            /*num_outputs=*/1)};
            TRANSACTIONS.emplace_back(tx);
            last_outpoint = COutPoint{tx->GetId(), 0};
        }
    }
    // Also create a loose tx for each outpoint. Some of these transactions
    // conflict with the above or have the same txid.
    for (const auto &outpoint : COINS) {
        TRANSACTIONS.emplace_back(
            MakeTransactionSpending({outpoint}, /*num_outputs=*/1));
    }

    // Create random-looking time jumps
    int i = 0;
    // TIME_SKIPS[N] for N=0..15 is just N microseconds.
    for (; i < 16; ++i) {
        TIME_SKIPS[i] = std::chrono::microseconds{i};
    }
    // TIME_SKIPS[N] for N=16..127 has randomly-looking but roughly
    // exponentially increasing values up to 198.416453 seconds.
    for (; i < 128; ++i) {
        int diff_bits = ((i - 10) * 2) / 9;
        uint64_t diff =
            1 + (CSipHasher(0, 0).Write(i).Finalize() >> (64 - diff_bits));
        TIME_SKIPS[i] = TIME_SKIPS[i - 1] + std::chrono::microseconds{diff};
    }
}

void CheckPackageToValidate(const node::PackageToValidate &package_to_validate,
                            NodeId peer) {
    Assert(package_to_validate.m_senders.size() == 2);
    Assert(package_to_validate.m_senders.front() == peer);
    Assert(package_to_validate.m_senders.back() < NUM_PEERS);

    // Package is a 1p1c
    const auto &package = package_to_validate.m_txns;
    Assert(IsChildWithParents(package));
    Assert(package.size() == 2);
}

FUZZ_TARGET_INIT(txdownloadman, initialize) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());

    // Initialize txdownloadman
    CTxMemPool pool{GetConfig(), MemPoolOptionsForTest(g_setup->m_node)};
    const auto max_orphan_count =
        fuzzed_data_provider.ConsumeIntegralInRange<unsigned int>(0, 300);
    node::TxDownloadManager txdownloadman{
        node::TxDownloadOptions{pool, max_orphan_count, true}};

    std::chrono::microseconds time{244466666};

    LIMITED_WHILE(fuzzed_data_provider.ConsumeBool(), 10000) {
        NodeId rand_peer = fuzzed_data_provider.ConsumeIntegralInRange<int64_t>(
            0, NUM_PEERS - 1);

        // Transaction can be one of the premade ones or a randomly generated
        // one
        auto rand_tx =
            fuzzed_data_provider.ConsumeBool()
                ? MakeTransactionSpending(
                      PickCoins(fuzzed_data_provider),
                      /*num_outputs=*/
                      fuzzed_data_provider.ConsumeIntegralInRange(1, 500))
                : TRANSACTIONS.at(
                      fuzzed_data_provider.ConsumeIntegralInRange<unsigned>(
                          0, TRANSACTIONS.size() - 1));

        CallOneOf(
            fuzzed_data_provider,
            [&] {
                node::TxDownloadConnectionInfo info{
                    .m_preferred = fuzzed_data_provider.ConsumeBool(),
                    .m_relay_permissions = fuzzed_data_provider.ConsumeBool(),
                };
                txdownloadman.ConnectedPeer(rand_peer, info);
            },
            [&] {
                txdownloadman.DisconnectedPeer(rand_peer);
                txdownloadman.CheckIsEmpty(rand_peer);
            },
            [&] { txdownloadman.ActiveTipChange(); },
            [&] {
                CBlock block;
                block.vtx.push_back(rand_tx);
                txdownloadman.BlockConnected(std::make_shared<CBlock>(block));
            },
            [&] { txdownloadman.BlockDisconnected(); },
            [&] { txdownloadman.MempoolAcceptedTx(rand_tx); },
            [&] {
                TxValidationState state;
                state.Invalid(
                    fuzzed_data_provider.PickValueInArray(TESTED_TX_RESULTS),
                    "");
                bool first_time_failure{fuzzed_data_provider.ConsumeBool()};

                node::RejectedTxTodo todo = txdownloadman.MempoolRejectedTx(
                    rand_tx, state, rand_peer, first_time_failure);
                Assert(first_time_failure ||
                       !todo.m_should_add_extra_compact_tx);
            },
            [&] {
                txdownloadman.AddTxAnnouncement(
                    rand_peer, rand_tx->GetId(), time,
                    /*p2p_inv=*/fuzzed_data_provider.ConsumeBool());
            },
            [&] { txdownloadman.GetRequestsToSend(rand_peer, time); },
            [&] {
                txdownloadman.ReceivedTx(rand_peer, rand_tx);
                const auto &[should_validate, maybe_package] =
                    txdownloadman.ReceivedTx(rand_peer, rand_tx);
                // The only possible results should be:
                // - Don't validate the tx, no package.
                // - Don't validate the tx, package.
                // - Validate the tx, no package.
                // The only combination that doesn't make sense is validate
                // both tx and package.
                Assert(!(should_validate && maybe_package.has_value()));
                if (maybe_package.has_value()) {
                    CheckPackageToValidate(*maybe_package, rand_peer);
                }
            },
            [&] {
                txdownloadman.ReceivedNotFound(rand_peer, {rand_tx->GetId()});
            },
            [&] {
                const bool expect_work{txdownloadman.HaveMoreWork(rand_peer)};
                const auto ptx = txdownloadman.GetTxToReconsider(rand_peer);
                // expect_work=true doesn't necessarily mean the next item from
                // the workset isn't a nullptr, as the transaction could have
                // been removed from orphanage without being removed from the
                // peer's workset.
                if (ptx) {
                    // However, if there was a non-null tx in the workset,
                    // HaveMoreWork should have returned true.
                    Assert(expect_work);
                }
            });
        // Jump forwards or backwards
        auto time_skip = fuzzed_data_provider.PickValueInArray(TIME_SKIPS);
        if (fuzzed_data_provider.ConsumeBool()) {
            time_skip *= -1;
        }
        time += time_skip;
    }
    // Disconnect everybody, check that all data structures are empty.
    for (NodeId nodeid = 0; nodeid < NUM_PEERS; ++nodeid) {
        txdownloadman.DisconnectedPeer(nodeid);
        txdownloadman.CheckIsEmpty(nodeid);
    }
    txdownloadman.CheckIsEmpty();
}

// Give node 0 relay permissions, and nobody else. This helps us remember who is
// a RelayPermissions peer without tracking anything (this is only for the
// txdownload_impl target).
static bool HasRelayPermissions(NodeId peer) {
    return peer == 0;
}

static bool HaveOrphan(const node::TxDownloadManagerImpl &txdownload_impl,
                       const TxId &txid) {
    return txdownload_impl.m_opts.m_mempool.withOrphanage(
        [&txid](const TxOrphanage &orphanage) {
            return orphanage.HaveTx(txid);
        });
}

static void CheckInvariants(const node::TxDownloadManagerImpl &txdownload_impl,
                            size_t max_orphan_count) {
    // Orphanage usage should never exceed what is allowed
    Assert(txdownload_impl.m_opts.m_mempool.withOrphanage(
               [](const TxOrphanage &orphanage) { return orphanage.Size(); }) <=
           max_orphan_count);

    // We should never have more than the maximum in-flight requests out for a
    // peer.
    for (NodeId peer = 0; peer < NUM_PEERS; ++peer) {
        if (!HasRelayPermissions(peer)) {
            Assert(txdownload_impl.m_txrequest.Count(peer) <=
                   node::TX_REQUEST_PARAMS.max_peer_announcements);
        }
    }
    txdownload_impl.m_txrequest.SanityCheck();
}

FUZZ_TARGET_INIT(txdownloadman_impl, initialize) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());

    // Initialize a TxDownloadManagerImpl
    CTxMemPool pool{GetConfig(), MemPoolOptionsForTest(g_setup->m_node)};
    const auto max_orphan_count =
        fuzzed_data_provider.ConsumeIntegralInRange<unsigned int>(0, 300);
    node::TxDownloadManagerImpl txdownload_impl{
        node::TxDownloadOptions{pool, max_orphan_count, true}};

    std::chrono::microseconds time{244466666};

    LIMITED_WHILE(fuzzed_data_provider.ConsumeBool(), 10000) {
        NodeId rand_peer = fuzzed_data_provider.ConsumeIntegralInRange<int64_t>(
            0, NUM_PEERS - 1);

        // Transaction can be one of the premade ones or a randomly generated
        // one
        auto rand_tx =
            fuzzed_data_provider.ConsumeBool()
                ? MakeTransactionSpending(
                      PickCoins(fuzzed_data_provider),
                      /*num_outputs=*/
                      fuzzed_data_provider.ConsumeIntegralInRange(1, 500))
                : TRANSACTIONS.at(
                      fuzzed_data_provider.ConsumeIntegralInRange<unsigned>(
                          0, TRANSACTIONS.size() - 1));

        CallOneOf(
            fuzzed_data_provider,
            [&] {
                node::TxDownloadConnectionInfo info{
                    .m_preferred = fuzzed_data_provider.ConsumeBool(),
                    .m_relay_permissions = HasRelayPermissions(rand_peer),
                };
                txdownload_impl.ConnectedPeer(rand_peer, info);
            },
            [&] {
                txdownload_impl.DisconnectedPeer(rand_peer);
                txdownload_impl.CheckIsEmpty(rand_peer);
            },
            [&] {
                txdownload_impl.ActiveTipChange();
                // After a block update, nothing should be in the rejection
                // caches
                for (const auto &tx : TRANSACTIONS) {
                    Assert(!txdownload_impl.RecentRejectsFilter().contains(
                        tx->GetId()));
                    Assert(!txdownload_impl
                                .RecentRejectsPackageReconsiderableFilter()
                                .contains(tx->GetId()));
                }
            },
            [&] {
                CBlock block;
                block.vtx.push_back(rand_tx);
                txdownload_impl.BlockConnected(std::make_shared<CBlock>(block));
                // Block transactions must be removed from orphanage
                Assert(!HaveOrphan(txdownload_impl, rand_tx->GetId()));
            },
            [&] {
                txdownload_impl.BlockDisconnected();
                Assert(!txdownload_impl.RecentConfirmedTransactionsFilter()
                            .contains(rand_tx->GetId()));
            },
            [&] { txdownload_impl.MempoolAcceptedTx(rand_tx); },
            [&] {
                TxValidationState state;
                state.Invalid(
                    fuzzed_data_provider.PickValueInArray(TESTED_TX_RESULTS),
                    "");
                bool first_time_failure{fuzzed_data_provider.ConsumeBool()};

                bool reject_contains_txid{
                    txdownload_impl.RecentRejectsFilter().contains(
                        rand_tx->GetId())};

                node::RejectedTxTodo todo = txdownload_impl.MempoolRejectedTx(
                    rand_tx, state, rand_peer, first_time_failure);
                Assert(first_time_failure ||
                       !todo.m_should_add_extra_compact_tx);
                if (!reject_contains_txid) {
                    Assert(todo.m_unique_parents.size() <= rand_tx->vin.size());
                }
            },
            [&] {
                txdownload_impl.AddTxAnnouncement(
                    rand_peer, rand_tx->GetId(), time,
                    /*p2p_inv=*/fuzzed_data_provider.ConsumeBool());
            },
            [&] {
                const auto getdata_requests =
                    txdownload_impl.GetRequestsToSend(rand_peer, time);
                // TxDownloadManager should not be telling us to request things
                // we already have. Exclude
                // m_recent_rejects_package_reconsiderable because it may
                // request low-feerate parent of orphan.
                for (const auto &txid : getdata_requests) {
                    Assert(!txdownload_impl.AlreadyHaveTx(
                        txid, /*include_reconsiderable=*/false));
                }
            },
            [&] {
                const auto &[should_validate, maybe_package] =
                    txdownload_impl.ReceivedTx(rand_peer, rand_tx);
                // The only possible results should be:
                // - Don't validate the tx, no package.
                // - Don't validate the tx, package.
                // - Validate the tx, no package.
                // The only combination that doesn't make sense is validate
                // both tx and package.
                Assert(!(should_validate && maybe_package.has_value()));
                if (should_validate) {
                    Assert(!txdownload_impl.AlreadyHaveTx(
                        rand_tx->GetId(), /*include_reconsiderable=*/true));
                }
                if (maybe_package.has_value()) {
                    CheckPackageToValidate(*maybe_package, rand_peer);

                    const auto &package = maybe_package->m_txns;
                    // Parent is in m_recent_rejects_package_reconsiderable and
                    // child is in the orphanage
                    Assert(txdownload_impl
                               .RecentRejectsPackageReconsiderableFilter()
                               .contains(rand_tx->GetId()));
                    Assert(HaveOrphan(txdownload_impl,
                                      maybe_package->m_txns.back()->GetId()));
                    // Package has not been rejected
                    Assert(!txdownload_impl
                                .RecentRejectsPackageReconsiderableFilter()
                                .contains(GetPackageHash(package)));
                    // Neither is in m_recent_rejects
                    Assert(!txdownload_impl.RecentRejectsFilter().contains(
                        package.front()->GetId()));
                    Assert(!txdownload_impl.RecentRejectsFilter().contains(
                        package.back()->GetId()));
                }
            },
            [&] {
                txdownload_impl.ReceivedNotFound(rand_peer, {rand_tx->GetId()});
            },
            [&] {
                const bool expect_work{txdownload_impl.HaveMoreWork(rand_peer)};
                const auto ptx{txdownload_impl.GetTxToReconsider(rand_peer)};
                // expect_work=true doesn't necessarily mean the next item from
                // the workset isn't a nullptr, as the transaction could have
                // been removed from orphanage without being removed from the
                // peer's workset.
                if (ptx) {
                    // However, if there was a non-null tx in the workset,
                    // HaveMoreWork should have returned true.
                    Assert(expect_work);
                    Assert(txdownload_impl.AlreadyHaveTx(
                        ptx->GetId(), /*include_reconsiderable=*/false));
                    // Presumably we have validated this tx. Use "missing
                    // inputs" to keep it in the orphanage longer. Later
                    // iterations might call MempoolAcceptedTx or
                    // MempoolRejectedTx with a different error.
                    TxValidationState state_missing_inputs;
                    state_missing_inputs.Invalid(
                        TxValidationResult::TX_MISSING_INPUTS, "");
                    txdownload_impl.MempoolRejectedTx(
                        ptx, state_missing_inputs, rand_peer,
                        fuzzed_data_provider.ConsumeBool());
                }
            });

        auto time_skip = fuzzed_data_provider.PickValueInArray(TIME_SKIPS);
        if (fuzzed_data_provider.ConsumeBool()) {
            time_skip *= -1;
        }
        time += time_skip;
        CheckInvariants(txdownload_impl, max_orphan_count);
    }
    // Disconnect everybody, check that all data structures are empty.
    for (NodeId nodeid = 0; nodeid < NUM_PEERS; ++nodeid) {
        txdownload_impl.DisconnectedPeer(nodeid);
        txdownload_impl.CheckIsEmpty(nodeid);
    }
    txdownload_impl.CheckIsEmpty();
}

} // namespace
