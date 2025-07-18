// Copyright (c) 2017-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <index/txindex.h>

#include <chainparams.h>
#include <interfaces/chain.h>
#include <script/standard.h>
#include <util/time.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_AUTO_TEST_SUITE(txindex_tests)

BOOST_FIXTURE_TEST_CASE(txindex_initial_sync, TestChain100Setup) {
    TxIndex txindex(interfaces::MakeChain(m_node, Params()), 1 << 20, true);
    BOOST_REQUIRE(txindex.Init());

    CTransactionRef tx_disk;
    BlockHash block_hash;

    // Transaction should not be found in the index before it is started.
    for (const auto &txn : m_coinbase_txns) {
        BOOST_CHECK(!txindex.FindTx(txn->GetId(), block_hash, tx_disk));
    }

    // BlockUntilSyncedToCurrentChain should return false before txindex is
    // started.
    BOOST_CHECK(!txindex.BlockUntilSyncedToCurrentChain());

    BOOST_REQUIRE(txindex.StartBackgroundSync());

    // Allow tx index to catch up with the block index.
    constexpr auto timeout{10s};
    const auto time_start{SteadyClock::now()};
    while (!txindex.BlockUntilSyncedToCurrentChain()) {
        BOOST_REQUIRE(time_start + timeout > SteadyClock::now());
        UninterruptibleSleep(std::chrono::milliseconds{100});
    }

    // Check that txindex excludes genesis block transactions.
    const CBlock &genesis_block = Params().GenesisBlock();
    for (const auto &txn : genesis_block.vtx) {
        BOOST_CHECK(!txindex.FindTx(txn->GetId(), block_hash, tx_disk));
    }

    // Check that txindex has all txs that were in the chain before it started.
    for (const auto &txn : m_coinbase_txns) {
        if (!txindex.FindTx(txn->GetId(), block_hash, tx_disk)) {
            BOOST_ERROR("FindTx failed");
        } else if (tx_disk->GetId() != txn->GetId()) {
            BOOST_ERROR("Read incorrect tx");
        }
    }

    // Check that new transactions in new blocks make it into the index.
    for (int i = 0; i < 10; i++) {
        CScript coinbase_script_pub_key =
            GetScriptForDestination(PKHash(coinbaseKey.GetPubKey()));
        std::vector<CMutableTransaction> no_txns;
        const CBlock &block =
            CreateAndProcessBlock(no_txns, coinbase_script_pub_key);
        const CTransactionRef &txn = block.vtx[0];

        BOOST_CHECK(txindex.BlockUntilSyncedToCurrentChain());
        if (!txindex.FindTx(txn->GetId(), block_hash, tx_disk)) {
            BOOST_ERROR("FindTx failed");
        } else if (tx_disk->GetId() != txn->GetId()) {
            BOOST_ERROR("Read incorrect tx");
        }
    }

    // shutdown sequence (c.f. Shutdown() in init.cpp)
    txindex.Stop();

    // Let scheduler events finish running to avoid accessing any memory related
    // to txindex after it is destructed
    SyncWithValidationInterfaceQueue();
}

BOOST_AUTO_TEST_SUITE_END()
