// Copyright (c) 2011-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <blockencodings.h>

#include <chainparams.h>
#include <config.h>
#include <consensus/merkle.h>
#include <pow/pow.h>
#include <streams.h>
#include <txmempool.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

static std::vector<std::pair<TxHash, CTransactionRef>> extra_txn;

BOOST_FIXTURE_TEST_SUITE(blockencodings_tests, RegTestingSetup)

static COutPoint InsecureRandOutPoint() {
    return COutPoint(TxId(InsecureRand256()), 0);
}

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
    block.hashPrevBlock = BlockHash(InsecureRand256());
    block.nBits = 0x207fffff;

    tx.vin[0].prevout = InsecureRandOutPoint();
    block.vtx[1] = MakeTransactionRef(tx);

    tx.vin.resize(10);
    for (size_t i = 0; i < tx.vin.size(); i++) {
        tx.vin[i].prevout = InsecureRandOutPoint();
    }
    block.vtx[2] = MakeTransactionRef(tx);

    bool mutated;
    block.hashMerkleRoot = BlockMerkleRoot(block, &mutated);
    assert(!mutated);

    GlobalConfig config;
    const Consensus::Params &params = config.GetChainParams().GetConsensus();
    while (!CheckProofOfWork(block.GetHash(), block.nBits, params)) {
        ++block.nNonce;
    }

    return block;
}

// Number of shared use_counts we expect for a tx we haven't touched
// (block + mempool + our copy from the GetSharedTx call)
constexpr long SHARED_TX_OFFSET{3};

static void expectUseCount(const CTxMemPool &pool, const TxId &txid,
                           long expectedCount)
    EXCLUSIVE_LOCKS_REQUIRED(pool.cs) {
    AssertLockHeld(pool.cs);
    BOOST_CHECK_EQUAL((*pool.mapTx.find(txid))->GetSharedTx().use_count(),
                      SHARED_TX_OFFSET + expectedCount);
}

BOOST_AUTO_TEST_CASE(SimpleRoundTripTest) {
    CTxMemPool &pool = *Assert(m_node.mempool);
    TestMemPoolEntryHelper entry;
    CBlock block(BuildBlockTestCase());

    LOCK2(cs_main, pool.cs);
    pool.addUnchecked(entry.FromTx(block.vtx[2]));

    const TxId block_txid2 = block.vtx[2]->GetId();
    expectUseCount(pool, block_txid2, 0);

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

        expectUseCount(pool, block_txid2, 1);

        size_t poolSize = pool.size();
        pool.removeRecursive(*block.vtx[2], MemPoolRemovalReason::REPLACED);
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

    uint64_t GetShortID(const TxHash &txhash) const {
        CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
        stream << *this;
        CBlockHeaderAndShortTxIDs base;
        stream >> base;
        return base.GetShortID(txhash);
    }

    SERIALIZE_METHODS(TestHeaderAndShortIDs, obj) {
        READWRITE(
            obj.header, obj.nonce,
            Using<VectorFormatter<CustomUintFormatter<
                CBlockHeaderAndShortTxIDs::SHORTTXIDS_LENGTH>>>(obj.shorttxids),
            Using<VectorFormatter<DifferentialIndexedItemFormatter>>(
                obj.prefilledtxn));
    }
};

BOOST_AUTO_TEST_CASE(NonCoinbasePreforwardRTTest) {
    CTxMemPool &pool = *Assert(m_node.mempool);
    TestMemPoolEntryHelper entry;
    CBlock block(BuildBlockTestCase());

    LOCK2(cs_main, pool.cs);
    pool.addUnchecked(entry.FromTx(block.vtx[2]));

    const TxId block_txid2 = block.vtx[2]->GetId();
    expectUseCount(pool, block_txid2, 0);

    // Test with pre-forwarding tx 1, but not coinbase
    {
        TestHeaderAndShortIDs shortIDs(block);
        shortIDs.prefilledtxn.resize(1);
        shortIDs.prefilledtxn[0] = {1, block.vtx[1]};
        shortIDs.shorttxids.resize(2);
        shortIDs.shorttxids[0] = shortIDs.GetShortID(block.vtx[0]->GetHash());
        shortIDs.shorttxids[1] = shortIDs.GetShortID(block.vtx[2]->GetHash());

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

        // +1 because of partialBlock
        expectUseCount(pool, block_txid2, 1);

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
        // +2 because of partialBlock and block2
        expectUseCount(pool, block_txid2, 2);

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

        // +3 because of partialBlock and block2 and block3
        expectUseCount(pool, block_txid2, 3);

        block.vtx.clear();
        block2.vtx.clear();
        block3.vtx.clear();

        // + 1 because of partialBlock; -1 because of block.
        expectUseCount(pool, block_txid2, 0);
    }

    // -1 because of block
    expectUseCount(pool, block_txid2, -1);
}

BOOST_AUTO_TEST_CASE(SufficientPreforwardRTTest) {
    CTxMemPool &pool = *Assert(m_node.mempool);
    TestMemPoolEntryHelper entry;
    CBlock block(BuildBlockTestCase());

    LOCK2(cs_main, pool.cs);
    pool.addUnchecked(entry.FromTx(block.vtx[1]));

    const TxId block_txid1 = block.vtx[1]->GetId();
    expectUseCount(pool, block_txid1, 0);

    // Test with pre-forwarding coinbase + tx 2 with tx 1 in mempool
    {
        TestHeaderAndShortIDs shortIDs(block);
        shortIDs.prefilledtxn.resize(2);
        shortIDs.prefilledtxn[0] = {0, block.vtx[0]};
        shortIDs.prefilledtxn[1] = {2, block.vtx[2]};
        shortIDs.shorttxids.resize(1);
        shortIDs.shorttxids[0] = shortIDs.GetShortID(block.vtx[1]->GetHash());

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

        expectUseCount(pool, block_txid1, 1);

        CBlock block2;
        PartiallyDownloadedBlock partialBlockCopy = partialBlock;
        BOOST_CHECK(partialBlock.FillBlock(block2, {}) == READ_STATUS_OK);
        BOOST_CHECK_EQUAL(block.GetHash().ToString(),
                          block2.GetHash().ToString());
        bool mutated;
        BOOST_CHECK_EQUAL(block.hashMerkleRoot.ToString(),
                          BlockMerkleRoot(block2, &mutated).ToString());
        BOOST_CHECK(!mutated);

        block.vtx.clear();
        block2.vtx.clear();

        // + 1 because of partialBlock; -1 because of block.
        expectUseCount(pool, block_txid1, 0);
    }

    // -1 because of block
    expectUseCount(pool, block_txid1, -1);
}

BOOST_AUTO_TEST_CASE(EmptyBlockRoundTripTest) {
    CTxMemPool &pool = *Assert(m_node.mempool);
    CMutableTransaction coinbase;
    coinbase.vin.resize(1);
    coinbase.vin[0].scriptSig.resize(10);
    coinbase.vout.resize(1);
    coinbase.vout[0].nValue = 42 * SATOSHI;

    CBlock block;
    block.vtx.resize(1);
    block.vtx[0] = MakeTransactionRef(std::move(coinbase));
    block.nVersion = 42;
    block.hashPrevBlock = BlockHash(InsecureRand256());
    block.nBits = 0x207fffff;

    bool mutated;
    block.hashMerkleRoot = BlockMerkleRoot(block, &mutated);
    assert(!mutated);

    GlobalConfig config;
    const Consensus::Params &params = config.GetChainParams().GetConsensus();
    while (!CheckProofOfWork(block.GetHash(), block.nBits, params)) {
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
    req1.blockhash = BlockHash(InsecureRand256());
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

BOOST_AUTO_TEST_CASE(TransactionsRequestDeserializationMaxTest) {
    // Check that the highest legal index is decoded correctly
    BlockTransactionsRequest req0;
    req0.blockhash = BlockHash(InsecureRand256());
    req0.indices.resize(1);

    using indiceType = decltype(req0.indices)::value_type;
    static_assert(MAX_SIZE < std::numeric_limits<indiceType>::max(),
                  "The max payload size cannot fit into the indice type");

    req0.indices[0] = MAX_SIZE;

    CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
    stream << req0;

    BlockTransactionsRequest req1;
    stream >> req1;
    BOOST_CHECK_EQUAL(req0.indices.size(), req1.indices.size());
    BOOST_CHECK_EQUAL(req0.indices[0], req1.indices[0]);

    req0.indices[0] += 1;
    stream << req0;
    BlockTransactionsRequest req2;
    BOOST_CHECK_EXCEPTION(stream >> req2, std::ios_base::failure,
                          HasReason("ReadCompactSize(): size too large"));
}

BOOST_AUTO_TEST_CASE(TransactionsRequestDeserializationOverflowTest) {
    // Any set of index deltas that starts with N values that sum to
    // (0x100000000 - N) causes the edge-case overflow that was originally not
    // checked for. Such a request cannot be created by serializing a real
    // BlockTransactionsRequest due to the overflow, so here we'll serialize
    // from raw deltas. This can only occur if MAX_SIZE is greater than the
    // maximum value for that the indice type can handle.
    BlockTransactionsRequest req0;
    req0.blockhash = BlockHash(InsecureRand256());
    req0.indices.resize(3);

    using indiceType = decltype(req0.indices)::value_type;
    static_assert(std::is_same<indiceType, uint32_t>::value,
                  "This test expects the indice type to be an uint32_t");

    req0.indices[0] = 0x7000;
    req0.indices[1] = 0x100000000 - 0x7000 - 2;
    req0.indices[2] = 0;
    CDataStream stream(SER_NETWORK, PROTOCOL_VERSION);
    stream << req0.blockhash;
    WriteCompactSize(stream, req0.indices.size());
    WriteCompactSize(stream, req0.indices[0]);
    WriteCompactSize(stream, req0.indices[1]);
    WriteCompactSize(stream, req0.indices[2]);

    BlockTransactionsRequest req1;
    // If MAX_SIZE is the limiting factor, the deserialization should throw.
    // Otherwise make sure that the overflow edge-case is under control.
    BOOST_CHECK_EXCEPTION(stream >> req1, std::ios_base::failure,
                          HasReason((MAX_SIZE < req0.indices[1])
                                        ? "ReadCompactSize(): size too large"
                                        : "differential value overflow"));
}

BOOST_AUTO_TEST_CASE(compactblock_overflow) {
    for (uint32_t firstIndex : {0u, 1u, std::numeric_limits<uint32_t>::max()}) {
        TestHeaderAndShortIDs cb((CBlockHeaderAndShortTxIDs()));

        cb.prefilledtxn.push_back({firstIndex, MakeTransactionRef()});
        cb.prefilledtxn.push_back({0u, MakeTransactionRef()});

        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        BOOST_CHECK_EXCEPTION(ss << cb, std::ios_base::failure,
                              HasReason("differential value overflow"));
    }

    auto checkShortdTxIdsSizeException = [&](size_t compactSize,
                                             const std::string &reason) {
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        // header, nonce
        ss << CBlockHeader() << uint64_t(0);
        // shorttxids.size()
        WriteCompactSize(ss, compactSize);

        CBlockHeaderAndShortTxIDs cb;
        BOOST_CHECK_EXCEPTION(ss >> cb, std::ios_base::failure,
                              HasReason(reason));
    };
    // Here we want to check against the max compact size, so there is no point
    // in building a valid compact block with MAX_SIZE + 1 shortid in it.
    // We just check the stream expects more data as a matter of verifying that
    // the overflow check did not trigger while saving test time and memory by
    // not constructing the large object.
    checkShortdTxIdsSizeException(MAX_SIZE, "CDataStream::read(): end of data");
    checkShortdTxIdsSizeException(MAX_SIZE + 1,
                                  "ReadCompactSize(): size too large");

    auto checkPrefilledTxnSizeException = [&](size_t compactSize,
                                              const std::string &reason) {
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        // header, nonce
        ss << CBlockHeader() << uint64_t(0);
        // shorttxids.size()
        WriteCompactSize(ss, 0);
        // prefilledtxn.size()
        WriteCompactSize(ss, compactSize);

        CBlockHeaderAndShortTxIDs cb;
        BOOST_CHECK_EXCEPTION(ss >> cb, std::ios_base::failure,
                              HasReason(reason));
    };
    // Here we want to check against the max compact size, so there is no point
    // in building a valid compact block with MAX_SIZE + 1 transactions in it.
    // We just check the stream expects more data as a matter of verifying that
    // the overflow check did not trigger while saving test time and memory by
    // not constructing the large object.
    checkPrefilledTxnSizeException(MAX_SIZE,
                                   "CDataStream::read(): end of data");
    checkPrefilledTxnSizeException(MAX_SIZE + 1,
                                   "ReadCompactSize(): size too large");

    auto checkPrefilledTxnIndexSizeException = [&](size_t compactSize,
                                                   const std::string &reason) {
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        // header, nonce
        ss << CBlockHeader() << uint64_t(0);
        // shorttxids.size()
        WriteCompactSize(ss, 0);
        // prefilledtxn.size()
        WriteCompactSize(ss, 1);
        // prefilledtxn[0].index
        WriteCompactSize(ss, compactSize);
        // prefilledtxn[0].tx
        ss << MakeTransactionRef();

        CBlockHeaderAndShortTxIDs cb;
        BOOST_CHECK_EXCEPTION(ss >> cb, std::ios_base::failure,
                              HasReason(reason));
    };
    // Here we want to check against the max compact size, so there is no point
    // in building a valid compact block with MAX_SIZE shortid in it.
    // We just check the stream expects more data as a matter of verifying that
    // the overflow check did not trigger while saving test time and memory by
    // not constructing the large object.
    checkPrefilledTxnIndexSizeException(MAX_SIZE, "non contiguous indexes");
    checkPrefilledTxnIndexSizeException(MAX_SIZE + 1,
                                        "ReadCompactSize(): size too large");

    // Compute the number of MAX_SIZE increment we need to cause an overflow
    const uint64_t overflow =
        uint64_t(std::numeric_limits<uint32_t>::max()) + 1;
    // Due to differential encoding, a value of MAX_SIZE bumps the index by
    // MAX_SIZE + 1
    BOOST_CHECK_GE(overflow, MAX_SIZE + 1);
    const uint64_t overflowIter = overflow / (MAX_SIZE + 1);

    // Make sure the iteration fits in an uint32_t and is <= MAX_SIZE
    BOOST_CHECK_LE(overflowIter, std::numeric_limits<uint32_t>::max());
    BOOST_CHECK_LE(overflowIter, MAX_SIZE);
    uint32_t remainder = uint32_t(overflow - ((MAX_SIZE + 1) * overflowIter));

    {
        CDataStream ss(SER_DISK, PROTOCOL_VERSION);
        // header, nonce
        ss << CBlockHeader() << uint64_t(0);
        // shorttxids.size()
        WriteCompactSize(ss, 0);
        // prefilledtxn.size()
        WriteCompactSize(ss, overflowIter + 1);
        for (uint32_t i = 0; i < overflowIter; i++) {
            // prefilledtxn[i].index
            WriteCompactSize(ss, MAX_SIZE);
            // prefilledtxn[i].tx
            ss << MakeTransactionRef();
        }
        // This is the prefilled tx causing the overflow
        WriteCompactSize(ss, remainder);
        ss << MakeTransactionRef();

        CBlockHeaderAndShortTxIDs cb;
        BOOST_CHECK_EXCEPTION(ss >> cb, std::ios_base::failure,
                              HasReason("differential value overflow"));
    }

    {
        CDataStream ss(SER_DISK, PROTOCOL_VERSION);
        // header, nonce
        ss << CBlockHeader() << uint64_t(0);
        // shorttxids.size()
        WriteCompactSize(ss, 1);
        // shorttxids[0]
        CustomUintFormatter<CBlockHeaderAndShortTxIDs::SHORTTXIDS_LENGTH>().Ser(
            ss, 0u);
        // prefilledtxn.size()
        WriteCompactSize(ss, overflowIter + 1);
        for (uint32_t i = 0; i < overflowIter; i++) {
            // prefilledtxn[i].index
            WriteCompactSize(ss, MAX_SIZE);
            // prefilledtxn[i].tx
            ss << MakeTransactionRef();
        }
        // This prefilled tx isn't enough to cause the overflow alone, but it
        // overflows due to the extra shortid.
        WriteCompactSize(ss, remainder - 1);
        ss << MakeTransactionRef();

        CBlockHeaderAndShortTxIDs cb;
        // ss >> cp;
        BOOST_CHECK_EXCEPTION(ss >> cb, std::ios_base::failure,
                              HasReason("indexes overflowed 32 bits"));
    }

    {
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        // header, nonce
        ss << CBlockHeader() << uint64_t(0);
        // shorttxids.size()
        WriteCompactSize(ss, 0);
        // prefilledtxn.size()
        WriteCompactSize(ss, 2);
        // prefilledtxn[0].index
        WriteCompactSize(ss, 0);
        // prefilledtxn[0].tx
        ss << MakeTransactionRef();
        // prefilledtxn[1].index = 1 is differentially encoded, which means
        // it has an absolute index of 2. This leaves no tx at index 1.
        WriteCompactSize(ss, 1);
        // prefilledtxn[1].tx
        ss << MakeTransactionRef();

        CBlockHeaderAndShortTxIDs cb;
        BOOST_CHECK_EXCEPTION(ss >> cb, std::ios_base::failure,
                              HasReason("non contiguous indexes"));
    }
}

BOOST_AUTO_TEST_SUITE_END()
