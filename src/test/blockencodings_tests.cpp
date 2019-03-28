// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include "blockencodings.h"
#include "chainparams.h"
#include "config.h"
#include "consensus/merkle.h"
#include "random.h"

#include "test/test_bitcoin.h"

#include <boost/test/unit_test.hpp>

std::vector<std::pair<uint256, CTransactionRef>> extra_txn;

struct RegtestingSetup : public TestingSetup {
    RegtestingSetup() : TestingSetup(CBaseChainParams::REGTEST) {}
};

BOOST_FIXTURE_TEST_SUITE(blockencodings_tests, RegtestingSetup)

static CBlock BuildBlockTestCase() {
    CBlock block;
    CMutableTransaction tx;
    tx.vin.resize(1);
    tx.vin[0].scriptSig.resize(10);
    tx.vout.resize(1);
    tx.vout[0].nValue = 42 * SATOSHI;

    block.vtx.resize(3);
    block.vtx[0] = MakeTransactionRef(tx);
    block.nVersion = 42;
    block.hashPrevBlock = InsecureRand256();
    block.nBits = 0x207fffff;

    tx.vin[0].prevout = COutPoint(InsecureRand256(), 0);
    block.vtx[1] = MakeTransactionRef(tx);

    tx.vin.resize(10);
    for (size_t i = 0; i < tx.vin.size(); i++) {
        tx.vin[i].prevout = COutPoint(InsecureRand256(), 0);
    }
    block.vtx[2] = MakeTransactionRef(tx);

    bool mutated;
    block.hashMerkleRoot = BlockMerkleRoot(block, &mutated);
    assert(!mutated);

    GlobalConfig config;
    while (!CheckProofOfWork(block.GetHash(), block.nBits, config)) {
        ++block.nNonce;
    }

    return block;
}

// Number of shared use_counts we expect for a tx we havent touched
// == 2 (mempool + our copy from the GetSharedTx call)
#define SHARED_TX_OFFSET 2

BOOST_AUTO_TEST_CASE(SimpleRoundTripTest) {
    CTxMemPool pool;
    TestMemPoolEntryHelper entry;
    CBlock block(BuildBlockTestCase());

    pool.addUnchecked(block.vtx[2]->GetId(), entry.FromTx(*block.vtx[2]));
    BOOST_CHECK_EQUAL(
        pool.mapTx.find(block.vtx[2]->GetId())->GetSharedTx().use_count(),
        SHARED_TX_OFFSET + 0);

    // Do a simple ShortTxIDs RT
    {
        CBlockHeaderAndShortTxIDs shortIDs(block);

        CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
        stream << shortIDs;

        CBlockHeaderAndShortTxIDs shortIDs2;
        stream >> shortIDs2;

        PartiallyDownloadedBlock partialBlock(GetConfig(), &pool);
        BOOST_CHECK(partialBlock.InitData(shortIDs2, extra_txn) ==
                    READ_STATUS_OK);
        BOOST_CHECK(partialBlock.IsTxAvailable(0));
        BOOST_CHECK(!partialBlock.IsTxAvailable(1));
        BOOST_CHECK(partialBlock.IsTxAvailable(2));

        BOOST_CHECK_EQUAL(
            pool.mapTx.find(block.vtx[2]->GetId())->GetSharedTx().use_count(),
            SHARED_TX_OFFSET + 1);

        size_t poolSize = pool.size();
        pool.removeRecursive(*block.vtx[2]);
        BOOST_CHECK_EQUAL(pool.size(), poolSize - 1);

        CBlock block2;
        {
            // No transactions.
            PartiallyDownloadedBlock tmp = partialBlock;
            BOOST_CHECK(partialBlock.FillBlock(block2, {}) ==
                        READ_STATUS_INVALID);
            partialBlock = tmp;
        }

        // Wrong transaction
        {
            // Current implementation doesn't check txn here, but don't require
            // that.
            PartiallyDownloadedBlock tmp = partialBlock;
            partialBlock.FillBlock(block2, {block.vtx[2]});
            partialBlock = tmp;
        }
        bool mutated;
        BOOST_CHECK(block.hashMerkleRoot != BlockMerkleRoot(block2, &mutated));

        CBlock block3;
        BOOST_CHECK(partialBlock.FillBlock(block3, {block.vtx[1]}) ==
                    READ_STATUS_OK);
        BOOST_CHECK_EQUAL(block.GetHash().ToString(),
                          block3.GetHash().ToString());
        BOOST_CHECK_EQUAL(block.hashMerkleRoot.ToString(),
                          BlockMerkleRoot(block3, &mutated).ToString());
        BOOST_CHECK(!mutated);
    }
}

class TestHeaderAndShortIDs {
    // Utility to encode custom CBlockHeaderAndShortTxIDs
public:
    CBlockHeader header;
    uint64_t nonce;
    std::vector<uint64_t> shorttxids;
    std::vector<PrefilledTransaction> prefilledtxn;

    explicit TestHeaderAndShortIDs(const CBlockHeaderAndShortTxIDs &orig) {
        CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
        stream << orig;
        stream >> *this;
    }
    explicit TestHeaderAndShortIDs(const CBlock &block)
        : TestHeaderAndShortIDs(CBlockHeaderAndShortTxIDs(block)) {}

    uint64_t GetShortID(const uint256 &txhash) const {
        CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
        stream << *this;
        CBlockHeaderAndShortTxIDs base;
        stream >> base;
        return base.GetShortID(txhash);
    }

    ADD_SERIALIZE_METHODS;

    template <typename Stream, typename Operation>
    inline void SerializationOp(Stream &s, Operation ser_action) {
        READWRITE(header);
        READWRITE(nonce);
        size_t shorttxids_size = shorttxids.size();
        READWRITE(VARINT(shorttxids_size));
        shorttxids.resize(shorttxids_size);
        for (size_t i = 0; i < shorttxids.size(); i++) {
            uint32_t lsb = shorttxids[i] & 0xffffffff;
            uint16_t msb = (shorttxids[i] >> 32) & 0xffff;
            READWRITE(lsb);
            READWRITE(msb);
            shorttxids[i] = (uint64_t(msb) << 32) | uint64_t(lsb);
        }
        READWRITE(prefilledtxn);
    }
};

BOOST_AUTO_TEST_CASE(NonCoinbasePreforwardRTTest) {
    CTxMemPool pool;
    TestMemPoolEntryHelper entry;
    CBlock block(BuildBlockTestCase());

    pool.addUnchecked(block.vtx[2]->GetId(), entry.FromTx(*block.vtx[2]));
    BOOST_CHECK_EQUAL(
        pool.mapTx.find(block.vtx[2]->GetId())->GetSharedTx().use_count(),
        SHARED_TX_OFFSET + 0);

    uint256 txhash;

    // Test with pre-forwarding tx 1, but not coinbase
    {
        TestHeaderAndShortIDs shortIDs(block);
        shortIDs.prefilledtxn.resize(1);
        shortIDs.prefilledtxn[0] = {1, block.vtx[1]};
        shortIDs.shorttxids.resize(2);
        shortIDs.shorttxids[0] = shortIDs.GetShortID(block.vtx[0]->GetId());
        shortIDs.shorttxids[1] = shortIDs.GetShortID(block.vtx[2]->GetId());

        CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
        stream << shortIDs;

        CBlockHeaderAndShortTxIDs shortIDs2;
        stream >> shortIDs2;

        PartiallyDownloadedBlock partialBlock(GetConfig(), &pool);
        BOOST_CHECK(partialBlock.InitData(shortIDs2, extra_txn) ==
                    READ_STATUS_OK);
        BOOST_CHECK(!partialBlock.IsTxAvailable(0));
        BOOST_CHECK(partialBlock.IsTxAvailable(1));
        BOOST_CHECK(partialBlock.IsTxAvailable(2));

        BOOST_CHECK_EQUAL(
            pool.mapTx.find(block.vtx[2]->GetId())->GetSharedTx().use_count(),
            SHARED_TX_OFFSET + 1);

        CBlock block2;
        {
            // No transactions.
            PartiallyDownloadedBlock tmp = partialBlock;
            BOOST_CHECK(partialBlock.FillBlock(block2, {}) ==
                        READ_STATUS_INVALID);
            partialBlock = tmp;
        }

        // Wrong transaction
        {
            // Current implementation doesn't check txn here, but don't require
            // that.
            PartiallyDownloadedBlock tmp = partialBlock;
            partialBlock.FillBlock(block2, {block.vtx[1]});
            partialBlock = tmp;
        }
        bool mutated;
        BOOST_CHECK(block.hashMerkleRoot != BlockMerkleRoot(block2, &mutated));

        CBlock block3;
        PartiallyDownloadedBlock partialBlockCopy = partialBlock;
        BOOST_CHECK(partialBlock.FillBlock(block3, {block.vtx[0]}) ==
                    READ_STATUS_OK);
        BOOST_CHECK_EQUAL(block.GetHash().ToString(),
                          block3.GetHash().ToString());
        BOOST_CHECK_EQUAL(block.hashMerkleRoot.ToString(),
                          BlockMerkleRoot(block3, &mutated).ToString());
        BOOST_CHECK(!mutated);

        txhash = block.vtx[2]->GetId();
        block.vtx.clear();
        block2.vtx.clear();
        block3.vtx.clear();

        // + 1 because of partialBlockCopy.
        BOOST_CHECK_EQUAL(pool.mapTx.find(txhash)->GetSharedTx().use_count(),
                          SHARED_TX_OFFSET + 1);
    }
    BOOST_CHECK_EQUAL(pool.mapTx.find(txhash)->GetSharedTx().use_count(),
                      SHARED_TX_OFFSET + 0);
}

BOOST_AUTO_TEST_CASE(SufficientPreforwardRTTest) {
    CTxMemPool pool;
    TestMemPoolEntryHelper entry;
    CBlock block(BuildBlockTestCase());

    pool.addUnchecked(block.vtx[1]->GetId(), entry.FromTx(*block.vtx[1]));
    BOOST_CHECK_EQUAL(
        pool.mapTx.find(block.vtx[1]->GetId())->GetSharedTx().use_count(),
        SHARED_TX_OFFSET + 0);

    uint256 txhash;

    // Test with pre-forwarding coinbase + tx 2 with tx 1 in mempool
    {
        TestHeaderAndShortIDs shortIDs(block);
        shortIDs.prefilledtxn.resize(2);
        shortIDs.prefilledtxn[0] = {0, block.vtx[0]};
        // id == 1 as it is 1 after index 1
        shortIDs.prefilledtxn[1] = {1, block.vtx[2]};
        shortIDs.shorttxids.resize(1);
        shortIDs.shorttxids[0] = shortIDs.GetShortID(block.vtx[1]->GetId());

        CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
        stream << shortIDs;

        CBlockHeaderAndShortTxIDs shortIDs2;
        stream >> shortIDs2;

        PartiallyDownloadedBlock partialBlock(GetConfig(), &pool);
        BOOST_CHECK(partialBlock.InitData(shortIDs2, extra_txn) ==
                    READ_STATUS_OK);
        BOOST_CHECK(partialBlock.IsTxAvailable(0));
        BOOST_CHECK(partialBlock.IsTxAvailable(1));
        BOOST_CHECK(partialBlock.IsTxAvailable(2));

        BOOST_CHECK_EQUAL(
            pool.mapTx.find(block.vtx[1]->GetId())->GetSharedTx().use_count(),
            SHARED_TX_OFFSET + 1);

        CBlock block2;
        PartiallyDownloadedBlock partialBlockCopy = partialBlock;
        BOOST_CHECK(partialBlock.FillBlock(block2, {}) == READ_STATUS_OK);
        BOOST_CHECK_EQUAL(block.GetHash().ToString(),
                          block2.GetHash().ToString());
        bool mutated;
        BOOST_CHECK_EQUAL(block.hashMerkleRoot.ToString(),
                          BlockMerkleRoot(block2, &mutated).ToString());
        BOOST_CHECK(!mutated);

        txhash = block.vtx[1]->GetId();
        block.vtx.clear();
        block2.vtx.clear();

        // + 1 because of partialBlockCopy.
        BOOST_CHECK_EQUAL(pool.mapTx.find(txhash)->GetSharedTx().use_count(),
                          SHARED_TX_OFFSET + 1);
    }
    BOOST_CHECK_EQUAL(pool.mapTx.find(txhash)->GetSharedTx().use_count(),
                      SHARED_TX_OFFSET + 0);
}

BOOST_AUTO_TEST_CASE(EmptyBlockRoundTripTest) {
    CTxMemPool pool;
    CMutableTransaction coinbase;
    coinbase.vin.resize(1);
    coinbase.vin[0].scriptSig.resize(10);
    coinbase.vout.resize(1);
    coinbase.vout[0].nValue = 42 * SATOSHI;

    CBlock block;
    block.vtx.resize(1);
    block.vtx[0] = MakeTransactionRef(std::move(coinbase));
    block.nVersion = 42;
    block.hashPrevBlock = InsecureRand256();
    block.nBits = 0x207fffff;

    bool mutated;
    block.hashMerkleRoot = BlockMerkleRoot(block, &mutated);
    assert(!mutated);

    GlobalConfig config;
    while (!CheckProofOfWork(block.GetHash(), block.nBits, config)) {
        ++block.nNonce;
    }

    // Test simple header round-trip with only coinbase
    {
        CBlockHeaderAndShortTxIDs shortIDs(block);

        CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
        stream << shortIDs;

        CBlockHeaderAndShortTxIDs shortIDs2;
        stream >> shortIDs2;

        PartiallyDownloadedBlock partialBlock(GetConfig(), &pool);
        BOOST_CHECK(partialBlock.InitData(shortIDs2, extra_txn) ==
                    READ_STATUS_OK);
        BOOST_CHECK(partialBlock.IsTxAvailable(0));

        CBlock block2;
        std::vector<CTransactionRef> vtx_missing;
        BOOST_CHECK(partialBlock.FillBlock(block2, vtx_missing) ==
                    READ_STATUS_OK);
        BOOST_CHECK_EQUAL(block.GetHash().ToString(),
                          block2.GetHash().ToString());
        BOOST_CHECK_EQUAL(block.hashMerkleRoot.ToString(),
                          BlockMerkleRoot(block2, &mutated).ToString());
        BOOST_CHECK(!mutated);
    }
}

BOOST_AUTO_TEST_CASE(TransactionsRequestSerializationTest) {
    BlockTransactionsRequest req1;
    req1.blockhash = InsecureRand256();
    req1.indices.resize(4);
    req1.indices[0] = 0;
    req1.indices[1] = 1;
    req1.indices[2] = 3;
    req1.indices[3] = 4;

    CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
    stream << req1;

    BlockTransactionsRequest req2;
    stream >> req2;

    BOOST_CHECK_EQUAL(req1.blockhash.ToString(), req2.blockhash.ToString());
    BOOST_CHECK_EQUAL(req1.indices.size(), req2.indices.size());
    BOOST_CHECK_EQUAL(req1.indices[0], req2.indices[0]);
    BOOST_CHECK_EQUAL(req1.indices[1], req2.indices[1]);
    BOOST_CHECK_EQUAL(req1.indices[2], req2.indices[2]);
    BOOST_CHECK_EQUAL(req1.indices[3], req2.indices[3]);
}

BOOST_AUTO_TEST_SUITE_END()
