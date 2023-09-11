// Copyright (c) 2012-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <interfaces/chain.h>
#include <node/blockstorage.h>
#include <node/context.h>
#include <policy/policy.h>
#include <rpc/server.h>
#include <util/translation.h>
#include <validation.h>
#include <wallet/coincontrol.h>
#include <wallet/context.h>
#include <wallet/receive.h>
#include <wallet/rpc/backup.h>
#include <wallet/spend.h>
#include <wallet/wallet.h>

#include <test/util/logging.h>
#include <test/util/setup_common.h>
#include <wallet/test/wallet_test_fixture.h>

#include <boost/test/unit_test.hpp>

#include <univalue.h>

#include <any>
#include <cstdint>
#include <future>
#include <memory>
#include <variant>
#include <vector>

using node::MAX_BLOCKFILE_SIZE;

BOOST_FIXTURE_TEST_SUITE(wallet_tests, WalletTestingSetup)

static std::shared_ptr<CWallet> TestLoadWallet(WalletContext &context) {
    DatabaseOptions options;
    DatabaseStatus status;
    bilingual_str error;
    std::vector<bilingual_str> warnings;
    auto database = MakeWalletDatabase("", options, status, error);
    auto wallet = CWallet::Create(context, "", std::move(database),
                                  options.create_flags, error, warnings);
    NotifyWalletLoaded(context, wallet);
    if (context.chain) {
        wallet->postInitProcess();
    }
    return wallet;
}

static void TestUnloadWallet(std::shared_ptr<CWallet> &&wallet) {
    SyncWithValidationInterfaceQueue();
    wallet->m_chain_notifications_handler.reset();
    UnloadWallet(std::move(wallet));
}

static CMutableTransaction TestSimpleSpend(const CTransaction &from,
                                           uint32_t index, const CKey &key,
                                           const CScript &pubkey) {
    CMutableTransaction mtx;
    mtx.vout.push_back(
        {from.vout[index].nValue - DEFAULT_TRANSACTION_MAXFEE, pubkey});
    mtx.vin.push_back({CTxIn{from.GetId(), index}});
    FillableSigningProvider keystore;
    keystore.AddKey(key);
    std::map<COutPoint, Coin> coins;
    coins[mtx.vin[0].prevout].GetTxOut() = from.vout[index];
    std::map<int, std::string> input_errors;
    BOOST_CHECK(SignTransaction(mtx, &keystore, coins,
                                SigHashType().withForkId(), input_errors));
    return mtx;
}

static void AddKey(CWallet &wallet, const CKey &key) {
    auto spk_man = wallet.GetOrCreateLegacyScriptPubKeyMan();
    LOCK2(wallet.cs_wallet, spk_man->cs_KeyStore);
    spk_man->AddKeyPubKey(key, key.GetPubKey());
}

BOOST_FIXTURE_TEST_CASE(scan_for_wallet_transactions, TestChain100Setup) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    // Cap last block file size, and mine new block in a new block file.
    CBlockIndex *oldTip = WITH_LOCK(
        chainman.GetMutex(), return m_node.chainman->ActiveChain().Tip());
    WITH_LOCK(::cs_main, m_node.chainman->m_blockman
                             .GetBlockFileInfo(oldTip->GetBlockPos().nFile)
                             ->nSize = MAX_BLOCKFILE_SIZE);
    CreateAndProcessBlock({}, GetScriptForRawPubKey(coinbaseKey.GetPubKey()));
    CBlockIndex *newTip = WITH_LOCK(
        chainman.GetMutex(), return m_node.chainman->ActiveChain().Tip());

    // Verify ScanForWalletTransactions fails to read an unknown start block.
    {
        CWallet wallet(m_node.chain.get(), "", CreateDummyWalletDatabase());
        {
            LOCK(wallet.cs_wallet);
            LOCK(chainman.GetMutex());
            wallet.SetLastBlockProcessed(
                m_node.chainman->ActiveHeight(),
                m_node.chainman->ActiveTip()->GetBlockHash());
        }
        AddKey(wallet, coinbaseKey);
        WalletRescanReserver reserver(wallet);
        reserver.reserve();
        CWallet::ScanResult result = wallet.ScanForWalletTransactions(
            BlockHash() /* start_block */, 0 /* start_height */,
            {} /* max_height */, reserver, false /* update */);
        BOOST_CHECK_EQUAL(result.status, CWallet::ScanResult::FAILURE);
        BOOST_CHECK(result.last_failed_block.IsNull());
        BOOST_CHECK(result.last_scanned_block.IsNull());
        BOOST_CHECK(!result.last_scanned_height);
        BOOST_CHECK_EQUAL(GetBalance(wallet).m_mine_immature, Amount::zero());
    }

    // Verify ScanForWalletTransactions picks up transactions in both the old
    // and new block files.
    {
        CWallet wallet(m_node.chain.get(), "", CreateDummyWalletDatabase());
        {
            LOCK(wallet.cs_wallet);
            LOCK(chainman.GetMutex());
            wallet.SetLastBlockProcessed(
                m_node.chainman->ActiveHeight(),
                m_node.chainman->ActiveTip()->GetBlockHash());
        }
        AddKey(wallet, coinbaseKey);
        WalletRescanReserver reserver(wallet);
        reserver.reserve();
        CWallet::ScanResult result = wallet.ScanForWalletTransactions(
            oldTip->GetBlockHash(), oldTip->nHeight, {} /* max_height */,
            reserver, false /* update */);
        BOOST_CHECK_EQUAL(result.status, CWallet::ScanResult::SUCCESS);
        BOOST_CHECK(result.last_failed_block.IsNull());
        BOOST_CHECK_EQUAL(result.last_scanned_block, newTip->GetBlockHash());
        BOOST_CHECK_EQUAL(*result.last_scanned_height, newTip->nHeight);
        BOOST_CHECK_EQUAL(GetBalance(wallet).m_mine_immature, 100 * COIN);
    }

    // Prune the older block file.
    int file_number;
    {
        LOCK(cs_main);
        file_number = oldTip->GetBlockPos().nFile;
        Assert(m_node.chainman)->m_blockman.PruneOneBlockFile(file_number);
    }
    m_node.chainman->m_blockman.UnlinkPrunedFiles({file_number});

    // Verify ScanForWalletTransactions only picks transactions in the new block
    // file.
    {
        CWallet wallet(m_node.chain.get(), "", CreateDummyWalletDatabase());
        {
            LOCK(wallet.cs_wallet);
            LOCK(chainman.GetMutex());
            wallet.SetLastBlockProcessed(
                m_node.chainman->ActiveHeight(),
                m_node.chainman->ActiveTip()->GetBlockHash());
        }
        AddKey(wallet, coinbaseKey);
        WalletRescanReserver reserver(wallet);
        reserver.reserve();
        CWallet::ScanResult result = wallet.ScanForWalletTransactions(
            oldTip->GetBlockHash(), oldTip->nHeight, {} /* max_height */,
            reserver, false /* update */);
        BOOST_CHECK_EQUAL(result.status, CWallet::ScanResult::FAILURE);
        BOOST_CHECK_EQUAL(result.last_failed_block, oldTip->GetBlockHash());
        BOOST_CHECK_EQUAL(result.last_scanned_block, newTip->GetBlockHash());
        BOOST_CHECK_EQUAL(*result.last_scanned_height, newTip->nHeight);
        BOOST_CHECK_EQUAL(GetBalance(wallet).m_mine_immature, 50 * COIN);
    }

    // Prune the remaining block file.
    {
        LOCK(cs_main);
        file_number = newTip->GetBlockPos().nFile;
        Assert(m_node.chainman)->m_blockman.PruneOneBlockFile(file_number);
    }
    m_node.chainman->m_blockman.UnlinkPrunedFiles({file_number});

    // Verify ScanForWalletTransactions scans no blocks.
    {
        CWallet wallet(m_node.chain.get(), "", CreateDummyWalletDatabase());
        {
            LOCK(wallet.cs_wallet);
            LOCK(chainman.GetMutex());
            wallet.SetLastBlockProcessed(
                m_node.chainman->ActiveHeight(),
                m_node.chainman->ActiveTip()->GetBlockHash());
        }
        AddKey(wallet, coinbaseKey);
        WalletRescanReserver reserver(wallet);
        reserver.reserve();
        CWallet::ScanResult result = wallet.ScanForWalletTransactions(
            oldTip->GetBlockHash(), oldTip->nHeight, {} /* max_height */,
            reserver, false /* update */);
        BOOST_CHECK_EQUAL(result.status, CWallet::ScanResult::FAILURE);
        BOOST_CHECK_EQUAL(result.last_failed_block, newTip->GetBlockHash());
        BOOST_CHECK(result.last_scanned_block.IsNull());
        BOOST_CHECK(!result.last_scanned_height);
        BOOST_CHECK_EQUAL(GetBalance(wallet).m_mine_immature, Amount::zero());
    }
}

BOOST_FIXTURE_TEST_CASE(importmulti_rescan, TestChain100Setup) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    // Cap last block file size, and mine new block in a new block file.
    CBlockIndex *oldTip = WITH_LOCK(
        chainman.GetMutex(), return m_node.chainman->ActiveChain().Tip());
    WITH_LOCK(::cs_main, m_node.chainman->m_blockman
                             .GetBlockFileInfo(oldTip->GetBlockPos().nFile)
                             ->nSize = MAX_BLOCKFILE_SIZE);
    CreateAndProcessBlock({}, GetScriptForRawPubKey(coinbaseKey.GetPubKey()));
    CBlockIndex *newTip = WITH_LOCK(
        chainman.GetMutex(), return m_node.chainman->ActiveChain().Tip());

    // Prune the older block file.
    int file_number;
    {
        LOCK(cs_main);
        file_number = oldTip->GetBlockPos().nFile;
        chainman.m_blockman.PruneOneBlockFile(file_number);
    }
    m_node.chainman->m_blockman.UnlinkPrunedFiles({file_number});

    // Set this flag so that pwallet->chain().havePruned() returns true, which
    // affects the RPC error message below.
    m_node.chainman->m_blockman.m_have_pruned = true;

    // Verify importmulti RPC returns failure for a key whose creation time is
    // before the missing block, and success for a key whose creation time is
    // after.
    {
        std::shared_ptr<CWallet> wallet = std::make_shared<CWallet>(
            m_node.chain.get(), "", CreateDummyWalletDatabase());
        wallet->SetupLegacyScriptPubKeyMan();
        WITH_LOCK(wallet->cs_wallet,
                  wallet->SetLastBlockProcessed(newTip->nHeight,
                                                newTip->GetBlockHash()));
        WalletContext context;
        AddWallet(context, wallet);
        UniValue keys;
        keys.setArray();
        UniValue key;
        key.setObject();
        key.pushKV("scriptPubKey",
                   HexStr(GetScriptForRawPubKey(coinbaseKey.GetPubKey())));
        key.pushKV("timestamp", 0);
        key.pushKV("internal", UniValue(true));
        keys.push_back(key);
        key.clear();
        key.setObject();
        CKey futureKey;
        futureKey.MakeNewKey(true);
        key.pushKV("scriptPubKey",
                   HexStr(GetScriptForRawPubKey(futureKey.GetPubKey())));
        key.pushKV("timestamp",
                   newTip->GetBlockTimeMax() + TIMESTAMP_WINDOW + 1);
        key.pushKV("internal", UniValue(true));
        keys.push_back(std::move(key));
        JSONRPCRequest request;
        request.context = &context;
        request.params.setArray();
        request.params.push_back(std::move(keys));

        UniValue response = importmulti().HandleRequest(GetConfig(), request);
        BOOST_CHECK_EQUAL(
            response.write(),
            strprintf("[{\"success\":false,\"error\":{\"code\":-1,\"message\":"
                      "\"Rescan failed for key with creation timestamp %d. "
                      "There was an error reading a block from time %d, which "
                      "is after or within %d seconds of key creation, and "
                      "could contain transactions pertaining to the key. As a "
                      "result, transactions and coins using this key may not "
                      "appear in the wallet. This error could be caused by "
                      "pruning or data corruption (see bitcoind log for "
                      "details) and could be dealt with by downloading and "
                      "rescanning the relevant blocks (see -reindex option "
                      "and rescanblockchain RPC).\"}},{\"success\":true}]",
                      0, oldTip->GetBlockTimeMax(), TIMESTAMP_WINDOW));
        RemoveWallet(context, wallet, /*load_on_start=*/std::nullopt);
    }
}

// Verify importwallet RPC starts rescan at earliest block with timestamp
// greater or equal than key birthday. Previously there was a bug where
// importwallet RPC would start the scan at the latest block with timestamp less
// than or equal to key birthday.
BOOST_FIXTURE_TEST_CASE(importwallet_rescan, TestChain100Setup) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    // Create two blocks with same timestamp to verify that importwallet rescan
    // will pick up both blocks, not just the first.
    const int64_t BLOCK_TIME =
        WITH_LOCK(chainman.GetMutex(),
                  return chainman.ActiveTip()->GetBlockTimeMax() + 5);
    SetMockTime(BLOCK_TIME);
    m_coinbase_txns.emplace_back(
        CreateAndProcessBlock({},
                              GetScriptForRawPubKey(coinbaseKey.GetPubKey()))
            .vtx[0]);
    m_coinbase_txns.emplace_back(
        CreateAndProcessBlock({},
                              GetScriptForRawPubKey(coinbaseKey.GetPubKey()))
            .vtx[0]);

    // Set key birthday to block time increased by the timestamp window, so
    // rescan will start at the block time.
    const int64_t KEY_TIME = BLOCK_TIME + TIMESTAMP_WINDOW;
    SetMockTime(KEY_TIME);
    m_coinbase_txns.emplace_back(
        CreateAndProcessBlock({},
                              GetScriptForRawPubKey(coinbaseKey.GetPubKey()))
            .vtx[0]);

    std::string backup_file =
        fs::PathToString(gArgs.GetDataDirNet() / "wallet.backup");

    // Import key into wallet and call dumpwallet to create backup file.
    {
        WalletContext context;
        std::shared_ptr<CWallet> wallet = std::make_shared<CWallet>(
            m_node.chain.get(), "", CreateDummyWalletDatabase());
        {
            auto spk_man = wallet->GetOrCreateLegacyScriptPubKeyMan();
            LOCK2(wallet->cs_wallet, spk_man->cs_KeyStore);
            spk_man->mapKeyMetadata[coinbaseKey.GetPubKey().GetID()]
                .nCreateTime = KEY_TIME;
            spk_man->AddKeyPubKey(coinbaseKey, coinbaseKey.GetPubKey());

            AddWallet(context, wallet);
            LOCK(chainman.GetMutex());
            wallet->SetLastBlockProcessed(chainman.ActiveHeight(),
                                          chainman.ActiveTip()->GetBlockHash());
        }
        JSONRPCRequest request;
        request.context = &context;
        request.params.setArray();
        request.params.push_back(backup_file);
        ::dumpwallet().HandleRequest(GetConfig(), request);
        RemoveWallet(context, wallet, /*load_on_start=*/std::nullopt);
    }

    // Call importwallet RPC and verify all blocks with timestamps >= BLOCK_TIME
    // were scanned, and no prior blocks were scanned.
    {
        std::shared_ptr<CWallet> wallet = std::make_shared<CWallet>(
            m_node.chain.get(), "", CreateDummyWalletDatabase());
        LOCK(wallet->cs_wallet);
        wallet->SetupLegacyScriptPubKeyMan();

        WalletContext context;
        JSONRPCRequest request;
        request.context = &context;
        request.params.setArray();
        request.params.push_back(backup_file);
        AddWallet(context, wallet);
        {
            LOCK(chainman.GetMutex());
            wallet->SetLastBlockProcessed(chainman.ActiveHeight(),
                                          chainman.ActiveTip()->GetBlockHash());
        }
        ::importwallet().HandleRequest(GetConfig(), request);
        RemoveWallet(context, wallet, /*load_on_start=*/std::nullopt);

        BOOST_CHECK_EQUAL(wallet->mapWallet.size(), 3U);
        BOOST_CHECK_EQUAL(m_coinbase_txns.size(), 103U);
        for (size_t i = 0; i < m_coinbase_txns.size(); ++i) {
            bool found = wallet->GetWalletTx(m_coinbase_txns[i]->GetId());
            bool expected = i >= 100;
            BOOST_CHECK_EQUAL(found, expected);
        }
    }
}

// Check that GetImmatureCredit() returns a newly calculated value instead of
// the cached value after a MarkDirty() call.
//
// This is a regression test written to verify a bugfix for the immature credit
// function. Similar tests probably should be written for the other credit and
// debit functions.
BOOST_FIXTURE_TEST_CASE(coin_mark_dirty_immature_credit, TestChain100Setup) {
    ChainstateManager &chainman = *Assert(m_node.chainman);
    CWallet wallet(m_node.chain.get(), "", CreateDummyWalletDatabase());
    auto spk_man = wallet.GetOrCreateLegacyScriptPubKeyMan();
    CWalletTx wtx(m_coinbase_txns.back());

    LOCK2(wallet.cs_wallet, spk_man->cs_KeyStore);
    LOCK(chainman.GetMutex());
    wallet.SetLastBlockProcessed(chainman.ActiveHeight(),
                                 chainman.ActiveTip()->GetBlockHash());

    CWalletTx::Confirmation confirm(CWalletTx::Status::CONFIRMED,
                                    chainman.ActiveHeight(),
                                    chainman.ActiveTip()->GetBlockHash(), 0);
    wtx.m_confirm = confirm;

    // Call GetImmatureCredit() once before adding the key to the wallet to
    // cache the current immature credit amount, which is 0.
    BOOST_CHECK_EQUAL(CachedTxGetImmatureCredit(wallet, wtx), Amount::zero());

    // Invalidate the cached value, add the key, and make sure a new immature
    // credit amount is calculated.
    wtx.MarkDirty();
    BOOST_CHECK(spk_man->AddKeyPubKey(coinbaseKey, coinbaseKey.GetPubKey()));
    BOOST_CHECK_EQUAL(CachedTxGetImmatureCredit(wallet, wtx), 50 * COIN);
}

static int64_t AddTx(ChainstateManager &chainman, CWallet &wallet,
                     uint32_t lockTime, int64_t mockTime, int64_t blockTime) {
    CMutableTransaction tx;
    CWalletTx::Confirmation confirm;
    tx.nLockTime = lockTime;
    SetMockTime(mockTime);
    CBlockIndex *block = nullptr;
    if (blockTime > 0) {
        LOCK(cs_main);
        auto inserted = chainman.BlockIndex().emplace(
            std::piecewise_construct, std::make_tuple(GetRandHash()),
            std::make_tuple());
        assert(inserted.second);
        const BlockHash &hash = inserted.first->first;
        block = &inserted.first->second;
        block->nTime = blockTime;
        block->phashBlock = &hash;
        confirm = {CWalletTx::Status::CONFIRMED, block->nHeight, hash, 0};
    }

    // If transaction is already in map, to avoid inconsistencies,
    // unconfirmation is needed before confirm again with different block.
    return wallet
        .AddToWallet(MakeTransactionRef(tx), confirm,
                     [&](CWalletTx &wtx, bool /* new_tx */) {
                         wtx.setUnconfirmed();
                         return true;
                     })
        ->nTimeSmart;
}

// Simple test to verify assignment of CWalletTx::nSmartTime value. Could be
// expanded to cover more corner cases of smart time logic.
BOOST_AUTO_TEST_CASE(ComputeTimeSmart) {
    // New transaction should use clock time if lower than block time.
    BOOST_CHECK_EQUAL(AddTx(*m_node.chainman, m_wallet, 1, 100, 120), 100);

    // Test that updating existing transaction does not change smart time.
    BOOST_CHECK_EQUAL(AddTx(*m_node.chainman, m_wallet, 1, 200, 220), 100);

    // New transaction should use clock time if there's no block time.
    BOOST_CHECK_EQUAL(AddTx(*m_node.chainman, m_wallet, 2, 300, 0), 300);

    // New transaction should use block time if lower than clock time.
    BOOST_CHECK_EQUAL(AddTx(*m_node.chainman, m_wallet, 3, 420, 400), 400);

    // New transaction should use latest entry time if higher than
    // min(block time, clock time).
    BOOST_CHECK_EQUAL(AddTx(*m_node.chainman, m_wallet, 4, 500, 390), 400);

    // If there are future entries, new transaction should use time of the
    // newest entry that is no more than 300 seconds ahead of the clock time.
    BOOST_CHECK_EQUAL(AddTx(*m_node.chainman, m_wallet, 5, 50, 600), 300);

    // Reset mock time for other tests.
    SetMockTime(0);
}

BOOST_AUTO_TEST_CASE(LoadReceiveRequests) {
    CTxDestination dest = PKHash();
    LOCK(m_wallet.cs_wallet);
    WalletBatch batch{m_wallet.GetDatabase()};
    m_wallet.AddDestData(batch, dest, "misc", "val_misc");
    m_wallet.AddDestData(batch, dest, "rr0", "val_rr0");
    m_wallet.AddDestData(batch, dest, "rr1", "val_rr1");

    auto values = m_wallet.GetDestValues("rr");
    BOOST_CHECK_EQUAL(values.size(), 2U);
    BOOST_CHECK_EQUAL(values[0], "val_rr0");
    BOOST_CHECK_EQUAL(values[1], "val_rr1");
}

// Test some watch-only LegacyScriptPubKeyMan methods by the procedure of
// loading (LoadWatchOnly), checking (HaveWatchOnly), getting (GetWatchPubKey)
// and removing (RemoveWatchOnly) a given PubKey, resp. its corresponding P2PK
// Script. Results of the the impact on the address -> PubKey map is dependent
// on whether the PubKey is a point on the curve
static void TestWatchOnlyPubKey(LegacyScriptPubKeyMan *spk_man,
                                const CPubKey &add_pubkey) {
    CScript p2pk = GetScriptForRawPubKey(add_pubkey);
    CKeyID add_address = add_pubkey.GetID();
    CPubKey found_pubkey;
    LOCK(spk_man->cs_KeyStore);

    // all Scripts (i.e. also all PubKeys) are added to the general watch-only
    // set
    BOOST_CHECK(!spk_man->HaveWatchOnly(p2pk));
    spk_man->LoadWatchOnly(p2pk);
    BOOST_CHECK(spk_man->HaveWatchOnly(p2pk));

    // only PubKeys on the curve shall be added to the watch-only address ->
    // PubKey map
    bool is_pubkey_fully_valid = add_pubkey.IsFullyValid();
    if (is_pubkey_fully_valid) {
        BOOST_CHECK(spk_man->GetWatchPubKey(add_address, found_pubkey));
        BOOST_CHECK(found_pubkey == add_pubkey);
    } else {
        BOOST_CHECK(!spk_man->GetWatchPubKey(add_address, found_pubkey));
        // passed key is unchanged
        BOOST_CHECK(found_pubkey == CPubKey());
    }

    spk_man->RemoveWatchOnly(p2pk);
    BOOST_CHECK(!spk_man->HaveWatchOnly(p2pk));

    if (is_pubkey_fully_valid) {
        BOOST_CHECK(!spk_man->GetWatchPubKey(add_address, found_pubkey));
        // passed key is unchanged
        BOOST_CHECK(found_pubkey == add_pubkey);
    }
}

// Cryptographically invalidate a PubKey whilst keeping length and first byte
static void PollutePubKey(CPubKey &pubkey) {
    assert(pubkey.size() > 0);
    std::vector<uint8_t> pubkey_raw(pubkey.begin(), pubkey.end());
    std::fill(pubkey_raw.begin() + 1, pubkey_raw.end(), 0);
    pubkey = CPubKey(pubkey_raw);
    assert(!pubkey.IsFullyValid());
    assert(pubkey.IsValid());
}

// Test watch-only logic for PubKeys
BOOST_AUTO_TEST_CASE(WatchOnlyPubKeys) {
    CKey key;
    CPubKey pubkey;
    LegacyScriptPubKeyMan *spk_man =
        m_wallet.GetOrCreateLegacyScriptPubKeyMan();

    BOOST_CHECK(!spk_man->HaveWatchOnly());

    // uncompressed valid PubKey
    key.MakeNewKey(false);
    pubkey = key.GetPubKey();
    assert(!pubkey.IsCompressed());
    TestWatchOnlyPubKey(spk_man, pubkey);

    // uncompressed cryptographically invalid PubKey
    PollutePubKey(pubkey);
    TestWatchOnlyPubKey(spk_man, pubkey);

    // compressed valid PubKey
    key.MakeNewKey(true);
    pubkey = key.GetPubKey();
    assert(pubkey.IsCompressed());
    TestWatchOnlyPubKey(spk_man, pubkey);

    // compressed cryptographically invalid PubKey
    PollutePubKey(pubkey);
    TestWatchOnlyPubKey(spk_man, pubkey);

    // invalid empty PubKey
    pubkey = CPubKey();
    TestWatchOnlyPubKey(spk_man, pubkey);
}

class ListCoinsTestingSetup : public TestChain100Setup {
public:
    ListCoinsTestingSetup() {
        ChainstateManager &chainman = *Assert(m_node.chainman);
        CreateAndProcessBlock({},
                              GetScriptForRawPubKey(coinbaseKey.GetPubKey()));
        wallet = std::make_unique<CWallet>(m_node.chain.get(), "",
                                           CreateMockWalletDatabase());
        {
            LOCK2(wallet->cs_wallet, ::cs_main);
            wallet->SetLastBlockProcessed(chainman.ActiveHeight(),
                                          chainman.ActiveTip()->GetBlockHash());
        }
        wallet->LoadWallet();
        AddKey(*wallet, coinbaseKey);
        WalletRescanReserver reserver(*wallet);
        reserver.reserve();
        CWallet::ScanResult result = wallet->ScanForWalletTransactions(
            m_node.chainman->ActiveChain().Genesis()->GetBlockHash(),
            0 /* start_height */, {} /* max_height */, reserver,
            false /* update */);
        BOOST_CHECK_EQUAL(result.status, CWallet::ScanResult::SUCCESS);
        LOCK(chainman.GetMutex());
        BOOST_CHECK_EQUAL(result.last_scanned_block,
                          chainman.ActiveTip()->GetBlockHash());
        BOOST_CHECK_EQUAL(*result.last_scanned_height, chainman.ActiveHeight());
        BOOST_CHECK(result.last_failed_block.IsNull());
    }

    ~ListCoinsTestingSetup() { wallet.reset(); }

    CWalletTx &AddTx(CRecipient recipient) {
        ChainstateManager &chainman = *Assert(m_node.chainman);
        CTransactionRef tx;
        CCoinControl dummy;
        {
            constexpr int RANDOM_CHANGE_POSITION = -1;
            auto res = CreateTransaction(*wallet, {recipient},
                                         RANDOM_CHANGE_POSITION, dummy);
            BOOST_CHECK(res);
            tx = res->tx;
        }
        BOOST_CHECK_EQUAL(tx->nLockTime, 0);

        wallet->CommitTransaction(tx, {}, {});
        CMutableTransaction blocktx;
        {
            LOCK(wallet->cs_wallet);
            blocktx =
                CMutableTransaction(*wallet->mapWallet.at(tx->GetId()).tx);
        }
        CreateAndProcessBlock({CMutableTransaction(blocktx)},
                              GetScriptForRawPubKey(coinbaseKey.GetPubKey()));

        LOCK(wallet->cs_wallet);
        LOCK(chainman.GetMutex());
        wallet->SetLastBlockProcessed(wallet->GetLastBlockHeight() + 1,
                                      chainman.ActiveTip()->GetBlockHash());
        auto it = wallet->mapWallet.find(tx->GetId());
        BOOST_CHECK(it != wallet->mapWallet.end());
        CWalletTx::Confirmation confirm(
            CWalletTx::Status::CONFIRMED, chainman.ActiveHeight(),
            chainman.ActiveTip()->GetBlockHash(), 1);
        it->second.m_confirm = confirm;
        return it->second;
    }

    std::unique_ptr<CWallet> wallet;
};

BOOST_FIXTURE_TEST_CASE(ListCoinsTest, ListCoinsTestingSetup) {
    std::string coinbaseAddress = coinbaseKey.GetPubKey().GetID().ToString();

    // Confirm ListCoins initially returns 1 coin grouped under coinbaseKey
    // address.
    std::map<CTxDestination, std::vector<COutput>> list;
    {
        LOCK(wallet->cs_wallet);
        list = ListCoins(*wallet);
    }
    BOOST_CHECK_EQUAL(list.size(), 1U);
    BOOST_CHECK_EQUAL(std::get<PKHash>(list.begin()->first).ToString(),
                      coinbaseAddress);
    BOOST_CHECK_EQUAL(list.begin()->second.size(), 1U);

    // Check initial balance from one mature coinbase transaction.
    BOOST_CHECK_EQUAL(50 * COIN, GetAvailableBalance(*wallet));

    // Add a transaction creating a change address, and confirm ListCoins still
    // returns the coin associated with the change address underneath the
    // coinbaseKey pubkey, even though the change address has a different
    // pubkey.
    AddTx(CRecipient{GetScriptForRawPubKey({}), 1 * COIN,
                     false /* subtract fee */});
    {
        LOCK(wallet->cs_wallet);
        list = ListCoins(*wallet);
    }
    BOOST_CHECK_EQUAL(list.size(), 1U);
    BOOST_CHECK_EQUAL(std::get<PKHash>(list.begin()->first).ToString(),
                      coinbaseAddress);
    BOOST_CHECK_EQUAL(list.begin()->second.size(), 2U);

    // Lock both coins. Confirm number of available coins drops to 0.
    {
        LOCK(wallet->cs_wallet);
        std::vector<COutput> available;
        AvailableCoins(*wallet, available);
        BOOST_CHECK_EQUAL(available.size(), 2U);
    }
    for (const auto &group : list) {
        for (const auto &coin : group.second) {
            LOCK(wallet->cs_wallet);
            wallet->LockCoin(COutPoint(coin.tx->GetId(), coin.i));
        }
    }
    {
        LOCK(wallet->cs_wallet);
        std::vector<COutput> available;
        AvailableCoins(*wallet, available);
        BOOST_CHECK_EQUAL(available.size(), 0U);
    }
    // Confirm ListCoins still returns same result as before, despite coins
    // being locked.
    {
        LOCK(wallet->cs_wallet);
        list = ListCoins(*wallet);
    }
    BOOST_CHECK_EQUAL(list.size(), 1U);
    BOOST_CHECK_EQUAL(std::get<PKHash>(list.begin()->first).ToString(),
                      coinbaseAddress);
    BOOST_CHECK_EQUAL(list.begin()->second.size(), 2U);
}

BOOST_FIXTURE_TEST_CASE(wallet_disableprivkeys, TestChain100Setup) {
    std::shared_ptr<CWallet> wallet = std::make_shared<CWallet>(
        m_node.chain.get(), "", CreateDummyWalletDatabase());
    wallet->SetupLegacyScriptPubKeyMan();
    wallet->SetMinVersion(FEATURE_LATEST);
    wallet->SetWalletFlag(WALLET_FLAG_DISABLE_PRIVATE_KEYS);
    BOOST_CHECK(!wallet->TopUpKeyPool(1000));
    BOOST_CHECK(!wallet->GetNewDestination(OutputType::LEGACY, ""));
}

// Explicit calculation which is used to test the wallet constant
static size_t CalculateP2PKHInputSize(bool use_max_sig) {
    // Generate ephemeral valid pubkey
    CKey key;
    key.MakeNewKey(true);
    CPubKey pubkey = key.GetPubKey();

    // Generate pubkey hash
    PKHash key_hash(pubkey);

    // Create script to enter into keystore. Key hash can't be 0...
    CScript script = GetScriptForDestination(key_hash);

    // Add script to key store and key to watchonly
    FillableSigningProvider keystore;
    keystore.AddKeyPubKey(key, pubkey);

    // Fill in dummy signatures for fee calculation.
    SignatureData sig_data;
    if (!ProduceSignature(keystore,
                          use_max_sig ? DUMMY_MAXIMUM_SIGNATURE_CREATOR
                                      : DUMMY_SIGNATURE_CREATOR,
                          script, sig_data)) {
        // We're hand-feeding it correct arguments; shouldn't happen
        assert(false);
    }

    CTxIn tx_in;
    UpdateInput(tx_in, sig_data);
    return (size_t)GetVirtualTransactionInputSize(tx_in);
}

BOOST_FIXTURE_TEST_CASE(dummy_input_size_test, TestChain100Setup) {
    BOOST_CHECK(CalculateP2PKHInputSize(false) <= DUMMY_P2PKH_INPUT_SIZE);
    BOOST_CHECK_EQUAL(CalculateP2PKHInputSize(true), DUMMY_P2PKH_INPUT_SIZE);
}

bool malformed_descriptor(std::ios_base::failure e) {
    std::string s(e.what());
    return s.find("Missing checksum") != std::string::npos;
}

BOOST_FIXTURE_TEST_CASE(wallet_descriptor_test, BasicTestingSetup) {
    std::vector<uint8_t> malformed_record;
    CVectorWriter vw(0, malformed_record, 0);
    vw << std::string("notadescriptor");
    vw << (uint64_t)0;
    vw << (int32_t)0;
    vw << (int32_t)0;
    vw << (int32_t)1;

    SpanReader vr{0, malformed_record};
    WalletDescriptor w_desc;
    BOOST_CHECK_EXCEPTION(vr >> w_desc, std::ios_base::failure,
                          malformed_descriptor);
}

//! Test CWallet::Create() and its behavior handling potential race
//! conditions if it's called the same time an incoming transaction shows up in
//! the mempool or a new block.
//!
//! It isn't possible to verify there aren't race condition in every case, so
//! this test just checks two specific cases and ensures that timing of
//! notifications in these cases doesn't prevent the wallet from detecting
//! transactions.
//!
//! In the first case, block and mempool transactions are created before the
//! wallet is loaded, but notifications about these transactions are delayed
//! until after it is loaded. The notifications are superfluous in this case, so
//! the test verifies the transactions are detected before they arrive.
//!
//! In the second case, block and mempool transactions are created after the
//! wallet rescan and notifications are immediately synced, to verify the wallet
//! must already have a handler in place for them, and there's no gap after
//! rescanning where new transactions in new blocks could be lost.
BOOST_FIXTURE_TEST_CASE(CreateWallet, TestChain100Setup) {
    // Create new wallet with known key and unload it.
    WalletContext context;
    context.chain = m_node.chain.get();
    auto wallet = TestLoadWallet(context);
    CKey key;
    key.MakeNewKey(true);
    AddKey(*wallet, key);
    TestUnloadWallet(std::move(wallet));

    // Add log hook to detect AddToWallet events from rescans, blockConnected,
    // and transactionAddedToMempool notifications
    int addtx_count = 0;
    DebugLogHelper addtx_counter("[default wallet] AddToWallet",
                                 [&](const std::string *s) {
                                     if (s) {
                                         ++addtx_count;
                                     }
                                     return false;
                                 });

    bool rescan_completed = false;
    DebugLogHelper rescan_check("[default wallet] Rescan completed",
                                [&](const std::string *s) {
                                    if (s) {
                                        rescan_completed = true;
                                    }
                                    return false;
                                });

    // Block the queue to prevent the wallet receiving blockConnected and
    // transactionAddedToMempool notifications, and create block and mempool
    // transactions paying to the wallet
    std::promise<void> promise;
    CallFunctionInValidationInterfaceQueue(
        [&promise] { promise.get_future().wait(); });
    std::string error;
    m_coinbase_txns.push_back(
        CreateAndProcessBlock({},
                              GetScriptForRawPubKey(coinbaseKey.GetPubKey()))
            .vtx[0]);
    auto block_tx = TestSimpleSpend(*m_coinbase_txns[0], 0, coinbaseKey,
                                    GetScriptForRawPubKey(key.GetPubKey()));
    m_coinbase_txns.push_back(
        CreateAndProcessBlock({block_tx},
                              GetScriptForRawPubKey(coinbaseKey.GetPubKey()))
            .vtx[0]);
    auto mempool_tx = TestSimpleSpend(*m_coinbase_txns[1], 0, coinbaseKey,
                                      GetScriptForRawPubKey(key.GetPubKey()));
    BOOST_CHECK(m_node.chain->broadcastTransaction(
        GetConfig(), MakeTransactionRef(mempool_tx), DEFAULT_TRANSACTION_MAXFEE,
        false, error));

    // Reload wallet and make sure new transactions are detected despite events
    // being blocked
    wallet = TestLoadWallet(context);
    BOOST_CHECK(rescan_completed);
    BOOST_CHECK_EQUAL(addtx_count, 2);
    {
        LOCK(wallet->cs_wallet);
        BOOST_CHECK_EQUAL(wallet->mapWallet.count(block_tx.GetId()), 1U);
        BOOST_CHECK_EQUAL(wallet->mapWallet.count(mempool_tx.GetId()), 1U);
    }

    // Unblock notification queue and make sure stale blockConnected and
    // transactionAddedToMempool events are processed
    promise.set_value();
    SyncWithValidationInterfaceQueue();
    BOOST_CHECK_EQUAL(addtx_count, 4);

    TestUnloadWallet(std::move(wallet));

    // Load wallet again, this time creating new block and mempool transactions
    // paying to the wallet as the wallet finishes loading and syncing the
    // queue so the events have to be handled immediately. Releasing the wallet
    // lock during the sync is a little artificial but is needed to avoid a
    // deadlock during the sync and simulates a new block notification happening
    // as soon as possible.
    addtx_count = 0;
    auto handler = HandleLoadWallet(
        context, [&](std::unique_ptr<interfaces::Wallet> wallet_param) {
            BOOST_CHECK(rescan_completed);
            m_coinbase_txns.push_back(
                CreateAndProcessBlock(
                    {}, GetScriptForRawPubKey(coinbaseKey.GetPubKey()))
                    .vtx[0]);
            block_tx = TestSimpleSpend(*m_coinbase_txns[2], 0, coinbaseKey,
                                       GetScriptForRawPubKey(key.GetPubKey()));
            m_coinbase_txns.push_back(
                CreateAndProcessBlock(
                    {block_tx}, GetScriptForRawPubKey(coinbaseKey.GetPubKey()))
                    .vtx[0]);
            mempool_tx =
                TestSimpleSpend(*m_coinbase_txns[3], 0, coinbaseKey,
                                GetScriptForRawPubKey(key.GetPubKey()));
            BOOST_CHECK(m_node.chain->broadcastTransaction(
                GetConfig(), MakeTransactionRef(mempool_tx),
                DEFAULT_TRANSACTION_MAXFEE, false, error));
            SyncWithValidationInterfaceQueue();
        });
    wallet = TestLoadWallet(context);
    BOOST_CHECK_EQUAL(addtx_count, 4);
    {
        LOCK(wallet->cs_wallet);
        BOOST_CHECK_EQUAL(wallet->mapWallet.count(block_tx.GetId()), 1U);
        BOOST_CHECK_EQUAL(wallet->mapWallet.count(mempool_tx.GetId()), 1U);
    }

    TestUnloadWallet(std::move(wallet));
}

BOOST_FIXTURE_TEST_CASE(CreateWalletWithoutChain, BasicTestingSetup) {
    WalletContext context;
    auto wallet = TestLoadWallet(context);
    BOOST_CHECK(wallet);
    UnloadWallet(std::move(wallet));
}

BOOST_FIXTURE_TEST_CASE(ZapSelectTx, TestChain100Setup) {
    WalletContext context;
    context.chain = m_node.chain.get();
    auto wallet = TestLoadWallet(context);
    CKey key;
    key.MakeNewKey(true);
    AddKey(*wallet, key);

    std::string error;
    m_coinbase_txns.push_back(
        CreateAndProcessBlock({},
                              GetScriptForRawPubKey(coinbaseKey.GetPubKey()))
            .vtx[0]);
    auto block_tx = TestSimpleSpend(*m_coinbase_txns[0], 0, coinbaseKey,
                                    GetScriptForRawPubKey(key.GetPubKey()));
    CreateAndProcessBlock({block_tx},
                          GetScriptForRawPubKey(coinbaseKey.GetPubKey()));

    SyncWithValidationInterfaceQueue();

    {
        auto block_id = block_tx.GetId();
        auto prev_id = m_coinbase_txns[0]->GetId();

        LOCK(wallet->cs_wallet);
        BOOST_CHECK(wallet->HasWalletSpend(prev_id));
        BOOST_CHECK_EQUAL(wallet->mapWallet.count(block_id), 1u);

        std::vector<TxId> vIdIn{block_id}, vIdOut;
        BOOST_CHECK_EQUAL(wallet->ZapSelectTx(vIdIn, vIdOut),
                          DBErrors::LOAD_OK);

        BOOST_CHECK(!wallet->HasWalletSpend(prev_id));
        BOOST_CHECK_EQUAL(wallet->mapWallet.count(block_id), 0u);
    }

    TestUnloadWallet(std::move(wallet));
}

BOOST_AUTO_TEST_SUITE_END()
