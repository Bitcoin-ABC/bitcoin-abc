// Copyright (c) 2011-2019 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <miner.h>

#include <chain.h>
#include <chainparams.h>
#include <coins.h>
#include <config.h>
#include <consensus/consensus.h>
#include <consensus/merkle.h>
#include <consensus/tx_verify.h>
#include <consensus/validation.h>
#include <policy/policy.h>
#include <script/standard.h>
#include <txmempool.h>
#include <uint256.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/system.h>
#include <util/time.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <memory>

namespace miner_tests {
struct MinerTestingSetup : public TestingSetup {
    void TestPackageSelection(const CChainParams &chainparams,
                              const CScript &scriptPubKey,
                              const std::vector<CTransactionRef> &txFirst)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main, m_node.mempool->cs);
    bool TestSequenceLocks(const CTransaction &tx, int flags)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main, m_node.mempool->cs) {
        return CheckSequenceLocks(*m_node.mempool, tx, flags);
    }
    BlockAssembler AssemblerForTest(const CChainParams &params);
};
} // namespace miner_tests

BOOST_FIXTURE_TEST_SUITE(miner_tests, MinerTestingSetup)

static CFeeRate blockMinFeeRate = CFeeRate(DEFAULT_BLOCK_MIN_TX_FEE_PER_KB);

BlockAssembler MinerTestingSetup::AssemblerForTest(const CChainParams &params) {
    BlockAssembler::Options options;
    options.blockMinFeeRate = blockMinFeeRate;
    return BlockAssembler(params, *m_node.mempool, options);
}

constexpr static struct {
    uint8_t extranonce;
    uint32_t nonce;
} blockinfo[] = {
    {4, 0xa4a3e223}, {2, 0x15c32f9e}, {1, 0x0375b547}, {1, 0x7004a8a5},
    {2, 0xce440296}, {2, 0x52cfe198}, {1, 0x77a72cd0}, {2, 0xbb5d6f84},
    {2, 0x83f30c2c}, {1, 0x48a73d5b}, {1, 0xef7dcd01}, {2, 0x6809c6c4},
    {2, 0x0883ab3c}, {1, 0x087bbbe2}, {2, 0x2104a814}, {2, 0xdffb6daa},
    {1, 0xee8a0a08}, {2, 0xba4237c1}, {1, 0xa70349dc}, {1, 0x344722bb},
    {3, 0xd6294733}, {2, 0xec9f5c94}, {2, 0xca2fbc28}, {1, 0x6ba4f406},
    {2, 0x015d4532}, {1, 0x6e119b7c}, {2, 0x43e8f314}, {2, 0x27962f38},
    {2, 0xb571b51b}, {2, 0xb36bee23}, {2, 0xd17924a8}, {2, 0x6bc212d9},
    {1, 0x630d4948}, {2, 0x9a4c4ebb}, {2, 0x554be537}, {1, 0xd63ddfc7},
    {2, 0xa10acc11}, {1, 0x759a8363}, {2, 0xfb73090d}, {1, 0xe82c6a34},
    {1, 0xe33e92d7}, {3, 0x658ef5cb}, {2, 0xba32ff22}, {5, 0x0227a10c},
    {1, 0xa9a70155}, {5, 0xd096d809}, {1, 0x37176174}, {1, 0x830b8d0f},
    {1, 0xc6e3910e}, {2, 0x823f3ca8}, {1, 0x99850849}, {1, 0x7521fb81},
    {1, 0xaacaabab}, {1, 0xd645a2eb}, {5, 0x7aea1781}, {5, 0x9d6e4b78},
    {1, 0x4ce90fd8}, {1, 0xabdc832d}, {6, 0x4a34f32a}, {2, 0xf2524c1c},
    {2, 0x1bbeb08a}, {1, 0xad47f480}, {1, 0x9f026aeb}, {1, 0x15a95049},
    {2, 0xd1cb95b2}, {2, 0xf84bbda5}, {1, 0x0fa62cd1}, {1, 0xe05f9169},
    {1, 0x78d194a9}, {5, 0x3e38147b}, {5, 0x737ba0d4}, {1, 0x63378e10},
    {1, 0x6d5f91cf}, {2, 0x88612eb8}, {2, 0xe9639484}, {1, 0xb7fabc9d},
    {2, 0x19b01592}, {1, 0x5a90dd31}, {2, 0x5bd7e028}, {2, 0x94d00323},
    {1, 0xa9b9c01a}, {1, 0x3a40de61}, {1, 0x56e7eec7}, {5, 0x859f7ef6},
    {1, 0xfd8e5630}, {1, 0x2b0c9f7f}, {1, 0xba700e26}, {1, 0x7170a408},
    {1, 0x70de86a8}, {1, 0x74d64cd5}, {1, 0x49e738a1}, {2, 0x6910b602},
    {0, 0x643c565f}, {1, 0x54264b3f}, {2, 0x97ea6396}, {2, 0x55174459},
    {2, 0x03e8779a}, {1, 0x98f34d8f}, {1, 0xc07b2b07}, {1, 0xdfe29668},
    {1, 0x3141c7c1}, {1, 0xb3b595f4}, {1, 0x735abf08}, {5, 0x623bfbce},
    {2, 0xd351e722}, {1, 0xf4ca48c9}, {1, 0x5b19c670}, {1, 0xa164bf0e},
    {2, 0xbbbeb305}, {2, 0xfe1c810a},
};

static CBlockIndex CreateBlockIndex(int nHeight)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    CBlockIndex index;
    index.nHeight = nHeight;
    index.pprev = ::ChainActive().Tip();
    return index;
}

// Test suite for ancestor feerate transaction selection.
// Implemented as an additional function, rather than a separate test case,
// to allow reusing the blockchain created in CreateNewBlock_validity.
void MinerTestingSetup::TestPackageSelection(
    const CChainParams &chainparams, const CScript &scriptPubKey,
    const std::vector<CTransactionRef> &txFirst) {
    // Test the ancestor feerate transaction selection.
    TestMemPoolEntryHelper entry;

    // Test that a medium fee transaction will be selected after a higher fee
    // rate package with a low fee rate parent.
    CMutableTransaction tx;
    tx.vin.resize(1);
    tx.vin[0].scriptSig = CScript() << OP_1;
    tx.vin[0].prevout = COutPoint(txFirst[0]->GetId(), 0);
    tx.vout.resize(1);
    tx.vout[0].nValue = int64_t(5000000000LL - 1000) * SATOSHI;
    // This tx has a low fee: 1000 satoshis.
    // Save this txid for later use.
    TxId parentTxId = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(1000 * SATOSHI)
                                     .Time(GetTime())
                                     .SpendsCoinbase(true)
                                     .FromTx(tx));

    // This tx has a medium fee: 10000 satoshis.
    tx.vin[0].prevout = COutPoint(txFirst[1]->GetId(), 0);
    tx.vout[0].nValue = int64_t(5000000000LL - 10000) * SATOSHI;
    TxId mediumFeeTxId = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(10000 * SATOSHI)
                                     .Time(GetTime())
                                     .SpendsCoinbase(true)
                                     .FromTx(tx));

    // This tx has a high fee, but depends on the first transaction.
    tx.vin[0].prevout = COutPoint(parentTxId, 0);
    // 50k satoshi fee.
    tx.vout[0].nValue = int64_t(5000000000LL - 1000 - 50000) * SATOSHI;
    TxId highFeeTxId = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(50000 * SATOSHI)
                                     .Time(GetTime())
                                     .SpendsCoinbase(false)
                                     .FromTx(tx));

    std::unique_ptr<CBlockTemplate> pblocktemplate =
        AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);
    BOOST_CHECK(pblocktemplate->block.vtx[1]->GetId() == parentTxId);
    BOOST_CHECK(pblocktemplate->block.vtx[2]->GetId() == highFeeTxId);
    BOOST_CHECK(pblocktemplate->block.vtx[3]->GetId() == mediumFeeTxId);

    // Test that a package below the block min tx fee doesn't get included
    tx.vin[0].prevout = COutPoint(highFeeTxId, 0);
    // 0 fee.
    tx.vout[0].nValue = int64_t(5000000000LL - 1000 - 50000) * SATOSHI;
    TxId freeTxId = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(Amount::zero()).FromTx(tx));
    size_t freeTxSize = GetSerializeSize(tx, PROTOCOL_VERSION);

    // Calculate a fee on child transaction that will put the package just
    // below the block min tx fee (assuming 1 child tx of the same size).
    Amount feeToUse = blockMinFeeRate.GetFee(2 * freeTxSize) - SATOSHI;

    tx.vin[0].prevout = COutPoint(freeTxId, 0);
    tx.vout[0].nValue =
        int64_t(5000000000LL - 1000 - 50000) * SATOSHI - feeToUse;
    TxId lowFeeTxId = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(feeToUse).FromTx(tx));
    pblocktemplate = AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);
    // Verify that the free tx and the low fee tx didn't get selected.
    for (const auto &txn : pblocktemplate->block.vtx) {
        BOOST_CHECK(txn->GetId() != freeTxId);
        BOOST_CHECK(txn->GetId() != lowFeeTxId);
    }

    // Test that packages above the min relay fee do get included, even if one
    // of the transactions is below the min relay fee. Remove the low fee
    // transaction and replace with a higher fee transaction
    m_node.mempool->removeRecursive(CTransaction(tx),
                                    MemPoolRemovalReason::REPLACED);
    // Now we should be just over the min relay fee.
    tx.vout[0].nValue -= 2 * SATOSHI;
    lowFeeTxId = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(feeToUse + 2 * SATOSHI).FromTx(tx));
    pblocktemplate = AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);
    BOOST_CHECK(pblocktemplate->block.vtx[4]->GetId() == freeTxId);
    BOOST_CHECK(pblocktemplate->block.vtx[5]->GetId() == lowFeeTxId);

    // Test that transaction selection properly updates ancestor fee
    // calculations as ancestor transactions get included in a block. Add a
    // 0-fee transaction that has 2 outputs.
    tx.vin[0].prevout = COutPoint(txFirst[2]->GetId(), 0);
    tx.vout.resize(2);
    tx.vout[0].nValue = int64_t(5000000000LL - 100000000) * SATOSHI;
    // 1BCC output.
    tx.vout[1].nValue = 100000000 * SATOSHI;
    TxId freeTxId2 = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(Amount::zero()).SpendsCoinbase(true).FromTx(tx));

    // This tx can't be mined by itself.
    tx.vin[0].prevout = COutPoint(freeTxId2, 0);
    tx.vout.resize(1);
    feeToUse = blockMinFeeRate.GetFee(freeTxSize);
    tx.vout[0].nValue = int64_t(5000000000LL - 100000000) * SATOSHI - feeToUse;
    TxId lowFeeTxId2 = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(feeToUse).SpendsCoinbase(false).FromTx(tx));
    pblocktemplate = AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);

    // Verify that this tx isn't selected.
    for (const auto &txn : pblocktemplate->block.vtx) {
        BOOST_CHECK(txn->GetId() != freeTxId2);
        BOOST_CHECK(txn->GetId() != lowFeeTxId2);
    }

    // This tx will be mineable, and should cause lowFeeTxId2 to be selected as
    // well.
    tx.vin[0].prevout = COutPoint(freeTxId2, 1);
    // 10k satoshi fee.
    tx.vout[0].nValue = (100000000 - 10000) * SATOSHI;
    m_node.mempool->addUnchecked(entry.Fee(10000 * SATOSHI).FromTx(tx));
    pblocktemplate = AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);
    BOOST_CHECK(pblocktemplate->block.vtx[8]->GetId() == lowFeeTxId2);
}

void TestCoinbaseMessageEB(uint64_t eb, std::string cbmsg,
                           const CTxMemPool &mempool) {
    GlobalConfig config;
    config.SetMaxBlockSize(eb);

    CScript scriptPubKey =
        CScript() << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112"
                              "de5c384df7ba0b8d578a4c702b6bf11d5f")
                  << OP_CHECKSIG;

    std::unique_ptr<CBlockTemplate> pblocktemplate =
        BlockAssembler(config, mempool).CreateNewBlock(scriptPubKey);

    CBlock *pblock = &pblocktemplate->block;

    // IncrementExtraNonce creates a valid coinbase and merkleRoot
    unsigned int extraNonce = 0;
    IncrementExtraNonce(pblock, ::ChainActive().Tip(), config.GetMaxBlockSize(),
                        extraNonce);
    unsigned int nHeight = ::ChainActive().Tip()->nHeight + 1;
    std::vector<uint8_t> vec(cbmsg.begin(), cbmsg.end());
    BOOST_CHECK(pblock->vtx[0]->vin[0].scriptSig ==
                (CScript() << nHeight << CScriptNum(extraNonce) << vec));
}

// Coinbase scriptSig has to contains the correct EB value
// converted to MB, rounded down to the first decimal
BOOST_AUTO_TEST_CASE(CheckCoinbase_EB) {
    TestCoinbaseMessageEB(1000001, "/EB1.0/", *m_node.mempool);
    TestCoinbaseMessageEB(2000000, "/EB2.0/", *m_node.mempool);
    TestCoinbaseMessageEB(8000000, "/EB8.0/", *m_node.mempool);
    TestCoinbaseMessageEB(8320000, "/EB8.3/", *m_node.mempool);
}

// NOTE: These tests rely on CreateNewBlock doing its own self-validation!
BOOST_AUTO_TEST_CASE(CreateNewBlock_validity) {
    // Note that by default, these tests run with size accounting enabled.
    GlobalConfig config;
    const CChainParams &chainparams = config.GetChainParams();
    CScript scriptPubKey =
        CScript() << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112"
                              "de5c384df7ba0b8d578a4c702b6bf11d5f")
                  << OP_CHECKSIG;
    std::unique_ptr<CBlockTemplate> pblocktemplate;
    CMutableTransaction tx;
    CScript script;
    TestMemPoolEntryHelper entry;
    entry.nFee = 11 * SATOSHI;
    entry.nHeight = 11;

    fCheckpointsEnabled = false;

    // Simple block creation, nothing special yet:
    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));

    // We can't make transactions until we have inputs.
    // Therefore, load 110 blocks :)
    static_assert(sizeof(blockinfo) / sizeof(*blockinfo) == 110,
                  "Should have 110 blocks to import");
    int baseheight = 0;
    std::vector<CTransactionRef> txFirst;
    for (size_t i = 0; i < sizeof(blockinfo) / sizeof(*blockinfo); ++i) {
        // pointer for convenience.
        CBlock *pblock = &pblocktemplate->block;
        {
            LOCK(cs_main);
            pblock->nVersion = 1;
            pblock->nTime = ::ChainActive().Tip()->GetMedianTimePast() + 1;
            CMutableTransaction txCoinbase(*pblock->vtx[0]);
            txCoinbase.nVersion = 1;
            txCoinbase.vin[0].scriptSig = CScript();
            txCoinbase.vin[0].scriptSig.push_back(blockinfo[i].extranonce);
            txCoinbase.vin[0].scriptSig.push_back(::ChainActive().Height());
            txCoinbase.vout.resize(1);
            txCoinbase.vout[0].scriptPubKey = CScript();
            pblock->vtx[0] = MakeTransactionRef(std::move(txCoinbase));
            if (txFirst.size() == 0) {
                baseheight = ::ChainActive().Height();
            }
            if (txFirst.size() < 4) {
                txFirst.push_back(pblock->vtx[0]);
            }
            pblock->hashMerkleRoot = BlockMerkleRoot(*pblock);
            pblock->nNonce = blockinfo[i].nonce;
        }
        std::shared_ptr<const CBlock> shared_pblock =
            std::make_shared<const CBlock>(*pblock);
        BOOST_CHECK(
            Assert(m_node.chainman)
                ->ProcessNewBlock(config, shared_pblock, true, nullptr));
        pblock->hashPrevBlock = pblock->GetHash();
    }

    LOCK(cs_main);
    LOCK(m_node.mempool->cs);

    // Just to make sure we can still make simple blocks.
    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));

    const Amount BLOCKSUBSIDY = 50 * COIN;
    const Amount LOWFEE = CENT;
    const Amount HIGHFEE = COIN;
    const Amount HIGHERFEE = 4 * COIN;

    // block size > limit
    tx.vin.resize(1);
    tx.vin[0].scriptSig = CScript();
    // 18 * (520char + DROP) + OP_1 = 9433 bytes
    std::vector<uint8_t> vchData(520);
    for (unsigned int i = 0; i < 18; ++i) {
        tx.vin[0].scriptSig << vchData << OP_DROP;
    }

    tx.vin[0].scriptSig << OP_1;
    tx.vin[0].prevout = COutPoint(txFirst[0]->GetId(), 0);
    tx.vout.resize(1);
    tx.vout[0].nValue = BLOCKSUBSIDY;
    for (unsigned int i = 0; i < 128; ++i) {
        tx.vout[0].nValue -= LOWFEE;
        const TxId txid = tx.GetId();
        // Only first tx spends coinbase.
        bool spendsCoinbase = i == 0;
        m_node.mempool->addUnchecked(entry.Fee(LOWFEE)
                                         .Time(GetTime())
                                         .SpendsCoinbase(spendsCoinbase)
                                         .FromTx(tx));
        tx.vin[0].prevout = COutPoint(txid, 0);
    }

    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));
    m_node.mempool->clear();

    // Orphan in mempool, template creation fails.
    m_node.mempool->addUnchecked(entry.Fee(LOWFEE).Time(GetTime()).FromTx(tx));
    BOOST_CHECK_EXCEPTION(
        AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey),
        std::runtime_error, HasReason("bad-txns-inputs-missingorspent"));
    m_node.mempool->clear();

    // Child with higher priority than parent.
    tx.vin[0].scriptSig = CScript() << OP_1;
    tx.vin[0].prevout = COutPoint(txFirst[1]->GetId(), 0);
    tx.vout[0].nValue = BLOCKSUBSIDY - HIGHFEE;
    TxId txid = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(HIGHFEE).Time(GetTime()).SpendsCoinbase(true).FromTx(tx));
    tx.vin[0].prevout = COutPoint(txid, 0);
    tx.vin.resize(2);
    tx.vin[1].scriptSig = CScript() << OP_1;
    tx.vin[1].prevout = COutPoint(txFirst[0]->GetId(), 0);
    // First txn output + fresh coinbase - new txn fee.
    tx.vout[0].nValue = tx.vout[0].nValue + BLOCKSUBSIDY - HIGHERFEE;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(HIGHERFEE).Time(GetTime()).SpendsCoinbase(true).FromTx(tx));
    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));
    m_node.mempool->clear();

    // Coinbase in mempool, template creation fails.
    tx.vin.resize(1);
    tx.vin[0].prevout = COutPoint();
    tx.vin[0].scriptSig = CScript() << OP_0 << OP_1;
    tx.vout[0].nValue = Amount::zero();
    txid = tx.GetId();
    // Give it a fee so it'll get mined.
    m_node.mempool->addUnchecked(
        entry.Fee(LOWFEE).Time(GetTime()).SpendsCoinbase(false).FromTx(tx));
    // Should throw bad-tx-coinbase
    BOOST_CHECK_EXCEPTION(
        AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey),
        std::runtime_error, HasReason("bad-tx-coinbase"));
    m_node.mempool->clear();

    // Double spend txn pair in mempool, template creation fails.
    tx.vin[0].prevout = COutPoint(txFirst[0]->GetId(), 0);
    tx.vin[0].scriptSig = CScript() << OP_1;
    tx.vout[0].nValue = BLOCKSUBSIDY - HIGHFEE;
    tx.vout[0].scriptPubKey = CScript() << OP_1;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(HIGHFEE).Time(GetTime()).SpendsCoinbase(true).FromTx(tx));
    tx.vout[0].scriptPubKey = CScript() << OP_2;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(HIGHFEE).Time(GetTime()).SpendsCoinbase(true).FromTx(tx));
    BOOST_CHECK_EXCEPTION(
        AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey),
        std::runtime_error, HasReason("bad-txns-inputs-missingorspent"));
    m_node.mempool->clear();

    // Subsidy changing.
    int nHeight = ::ChainActive().Height();
    // Create an actual 209999-long block chain (without valid blocks).
    while (::ChainActive().Tip()->nHeight < 209999) {
        CBlockIndex *prev = ::ChainActive().Tip();
        CBlockIndex *next = new CBlockIndex();
        next->phashBlock = new BlockHash(InsecureRand256());
        ::ChainstateActive().CoinsTip().SetBestBlock(next->GetBlockHash());
        next->pprev = prev;
        next->nHeight = prev->nHeight + 1;
        next->BuildSkip();
        ::ChainActive().SetTip(next);
    }
    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));
    // Extend to a 210000-long block chain.
    while (::ChainActive().Tip()->nHeight < 210000) {
        CBlockIndex *prev = ::ChainActive().Tip();
        CBlockIndex *next = new CBlockIndex();
        next->phashBlock = new BlockHash(InsecureRand256());
        ::ChainstateActive().CoinsTip().SetBestBlock(next->GetBlockHash());
        next->pprev = prev;
        next->nHeight = prev->nHeight + 1;
        next->BuildSkip();
        ::ChainActive().SetTip(next);
    }

    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));

    // Invalid p2sh txn in mempool, template creation fails
    tx.vin[0].prevout = COutPoint(txFirst[0]->GetId(), 0);
    tx.vin[0].scriptSig = CScript() << OP_1;
    tx.vout[0].nValue = BLOCKSUBSIDY - LOWFEE;
    script = CScript() << OP_0;
    tx.vout[0].scriptPubKey = GetScriptForDestination(ScriptHash(script));
    txid = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(LOWFEE).Time(GetTime()).SpendsCoinbase(true).FromTx(tx));
    tx.vin[0].prevout = COutPoint(txid, 0);
    tx.vin[0].scriptSig = CScript()
                          << std::vector<uint8_t>(script.begin(), script.end());
    tx.vout[0].nValue -= LOWFEE;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(LOWFEE).Time(GetTime()).SpendsCoinbase(false).FromTx(tx));
    // Should throw blk-bad-inputs
    BOOST_CHECK_EXCEPTION(
        AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey),
        std::runtime_error, HasReason("blk-bad-inputs"));
    m_node.mempool->clear();

    // Delete the dummy blocks again.
    while (::ChainActive().Tip()->nHeight > nHeight) {
        CBlockIndex *del = ::ChainActive().Tip();
        ::ChainActive().SetTip(del->pprev);
        ::ChainstateActive().CoinsTip().SetBestBlock(
            del->pprev->GetBlockHash());
        delete del->phashBlock;
        delete del;
    }

    // non-final txs in mempool
    SetMockTime(::ChainActive().Tip()->GetMedianTimePast() + 1);
    uint32_t flags = LOCKTIME_VERIFY_SEQUENCE | LOCKTIME_MEDIAN_TIME_PAST;
    // height map
    std::vector<int> prevheights;

    // Relative height locked.
    tx.nVersion = 2;
    tx.vin.resize(1);
    prevheights.resize(1);
    // Only 1 transaction.
    tx.vin[0].prevout = COutPoint(txFirst[0]->GetId(), 0);
    tx.vin[0].scriptSig = CScript() << OP_1;
    // txFirst[0] is the 2nd block
    tx.vin[0].nSequence = ::ChainActive().Tip()->nHeight + 1;
    prevheights[0] = baseheight + 1;
    tx.vout.resize(1);
    tx.vout[0].nValue = BLOCKSUBSIDY - HIGHFEE;
    tx.vout[0].scriptPubKey = CScript() << OP_1;
    tx.nLockTime = 0;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(HIGHFEE).Time(GetTime()).SpendsCoinbase(true).FromTx(tx));

    const Consensus::Params &params = chainparams.GetConsensus();

    {
        // Locktime passes.
        TxValidationState state;
        BOOST_CHECK(ContextualCheckTransactionForCurrentBlock(
            params, CTransaction(tx), state, flags));
    }

    // Sequence locks fail.
    BOOST_CHECK(!TestSequenceLocks(CTransaction(tx), flags));
    // Sequence locks pass on 2nd block.
    BOOST_CHECK(
        SequenceLocks(CTransaction(tx), flags, prevheights,
                      CreateBlockIndex(::ChainActive().Tip()->nHeight + 2)));

    // Relative time locked.
    tx.vin[0].prevout = COutPoint(txFirst[1]->GetId(), 0);
    // txFirst[1] is the 3rd block.
    tx.vin[0].nSequence = CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG |
                          (((::ChainActive().Tip()->GetMedianTimePast() + 1 -
                             ::ChainActive()[1]->GetMedianTimePast()) >>
                            CTxIn::SEQUENCE_LOCKTIME_GRANULARITY) +
                           1);
    prevheights[0] = baseheight + 2;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(entry.Time(GetTime()).FromTx(tx));

    {
        // Locktime passes.
        TxValidationState state;
        BOOST_CHECK(ContextualCheckTransactionForCurrentBlock(
            params, CTransaction(tx), state, flags));
    }

    // Sequence locks fail.
    BOOST_CHECK(!TestSequenceLocks(CTransaction(tx), flags));

    for (int i = 0; i < CBlockIndex::nMedianTimeSpan; i++) {
        // Trick the MedianTimePast.
        ::ChainActive()
            .Tip()
            ->GetAncestor(::ChainActive().Tip()->nHeight - i)
            ->nTime += 512;
    }
    // Sequence locks pass 512 seconds later.
    BOOST_CHECK(
        SequenceLocks(CTransaction(tx), flags, prevheights,
                      CreateBlockIndex(::ChainActive().Tip()->nHeight + 1)));
    for (int i = 0; i < CBlockIndex::nMedianTimeSpan; i++) {
        // Undo tricked MTP.
        ::ChainActive()
            .Tip()
            ->GetAncestor(::ChainActive().Tip()->nHeight - i)
            ->nTime -= 512;
    }

    // Absolute height locked.
    tx.vin[0].prevout = COutPoint(txFirst[2]->GetId(), 0);
    tx.vin[0].nSequence = CTxIn::SEQUENCE_FINAL - 1;
    prevheights[0] = baseheight + 3;
    tx.nLockTime = ::ChainActive().Tip()->nHeight + 1;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(entry.Time(GetTime()).FromTx(tx));

    {
        // Locktime fails.
        TxValidationState state;
        BOOST_CHECK(!ContextualCheckTransactionForCurrentBlock(
            params, CTransaction(tx), state, flags));
        BOOST_CHECK_EQUAL(state.GetRejectReason(), "bad-txns-nonfinal");
    }

    // Sequence locks pass.
    BOOST_CHECK(TestSequenceLocks(CTransaction(tx), flags));

    {
        // Locktime passes on 2nd block.
        TxValidationState state;
        int64_t nMedianTimePast = ::ChainActive().Tip()->GetMedianTimePast();
        BOOST_CHECK(ContextualCheckTransaction(
            params, CTransaction(tx), state, ::ChainActive().Tip()->nHeight + 2,
            nMedianTimePast, nMedianTimePast));
    }

    // Absolute time locked.
    tx.vin[0].prevout = COutPoint(txFirst[3]->GetId(), 0);
    tx.nLockTime = ::ChainActive().Tip()->GetMedianTimePast();
    prevheights.resize(1);
    prevheights[0] = baseheight + 4;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(entry.Time(GetTime()).FromTx(tx));

    {
        // Locktime fails.
        TxValidationState state;
        BOOST_CHECK(!ContextualCheckTransactionForCurrentBlock(
            params, CTransaction(tx), state, flags));
        BOOST_CHECK_EQUAL(state.GetRejectReason(), "bad-txns-nonfinal");
    }

    // Sequence locks pass.
    BOOST_CHECK(TestSequenceLocks(CTransaction(tx), flags));

    {
        // Locktime passes 1 second later.
        TxValidationState state;
        int64_t nMedianTimePast =
            ::ChainActive().Tip()->GetMedianTimePast() + 1;
        BOOST_CHECK(ContextualCheckTransaction(
            params, CTransaction(tx), state, ::ChainActive().Tip()->nHeight + 1,
            nMedianTimePast, nMedianTimePast));
    }

    // mempool-dependent transactions (not added)
    tx.vin[0].prevout = COutPoint(txid, 0);
    prevheights[0] = ::ChainActive().Tip()->nHeight + 1;
    tx.nLockTime = 0;
    tx.vin[0].nSequence = 0;

    {
        // Locktime passes.
        TxValidationState state;
        BOOST_CHECK(ContextualCheckTransactionForCurrentBlock(
            params, CTransaction(tx), state, flags));
    }

    // Sequence locks pass.
    BOOST_CHECK(TestSequenceLocks(CTransaction(tx), flags));
    tx.vin[0].nSequence = 1;
    // Sequence locks fail.
    BOOST_CHECK(!TestSequenceLocks(CTransaction(tx), flags));
    tx.vin[0].nSequence = CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG;
    // Sequence locks pass.
    BOOST_CHECK(TestSequenceLocks(CTransaction(tx), flags));
    tx.vin[0].nSequence = CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG | 1;
    // Sequence locks fail.
    BOOST_CHECK(!TestSequenceLocks(CTransaction(tx), flags));

    pblocktemplate = AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);
    BOOST_CHECK(pblocktemplate);

    // None of the of the absolute height/time locked tx should have made it
    // into the template because we still check IsFinalTx in CreateNewBlock, but
    // relative locked txs will if inconsistently added to g_mempool. For now
    // these will still generate a valid template until BIP68 soft fork.
    BOOST_CHECK_EQUAL(pblocktemplate->block.vtx.size(), 3UL);
    // However if we advance height by 1 and time by 512, all of them should be
    // mined.
    for (int i = 0; i < CBlockIndex::nMedianTimeSpan; i++) {
        // Trick the MedianTimePast.
        ::ChainActive()
            .Tip()
            ->GetAncestor(::ChainActive().Tip()->nHeight - i)
            ->nTime += 512;
    }
    ::ChainActive().Tip()->nHeight++;
    SetMockTime(::ChainActive().Tip()->GetMedianTimePast() + 1);

    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));
    BOOST_CHECK_EQUAL(pblocktemplate->block.vtx.size(), 5UL);

    ::ChainActive().Tip()->nHeight--;
    SetMockTime(0);
    m_node.mempool->clear();

    TestPackageSelection(chainparams, scriptPubKey, txFirst);

    fCheckpointsEnabled = true;
}

void CheckBlockMaxSize(const Config &config, const CTxMemPool &mempool,
                       uint64_t size, uint64_t expected) {
    gArgs.ForceSetArg("-blockmaxsize", ToString(size));

    BlockAssembler ba(config, mempool);
    BOOST_CHECK_EQUAL(ba.GetMaxGeneratedBlockSize(), expected);
}

BOOST_AUTO_TEST_CASE(BlockAssembler_construction) {
    GlobalConfig config;

    // We are working on a fake chain and need to protect ourselves.
    LOCK(cs_main);

    // Test around historical 1MB (plus one byte because that's mandatory)
    config.SetMaxBlockSize(ONE_MEGABYTE + 1);
    CheckBlockMaxSize(config, *m_node.mempool, 0, 1000);
    CheckBlockMaxSize(config, *m_node.mempool, 1000, 1000);
    CheckBlockMaxSize(config, *m_node.mempool, 1001, 1001);
    CheckBlockMaxSize(config, *m_node.mempool, 12345, 12345);

    CheckBlockMaxSize(config, *m_node.mempool, ONE_MEGABYTE - 1001,
                      ONE_MEGABYTE - 1001);
    CheckBlockMaxSize(config, *m_node.mempool, ONE_MEGABYTE - 1000,
                      ONE_MEGABYTE - 1000);
    CheckBlockMaxSize(config, *m_node.mempool, ONE_MEGABYTE - 999,
                      ONE_MEGABYTE - 999);
    CheckBlockMaxSize(config, *m_node.mempool, ONE_MEGABYTE,
                      ONE_MEGABYTE - 999);

    // Test around default cap
    config.SetMaxBlockSize(DEFAULT_MAX_BLOCK_SIZE);

    // Now we can use the default max block size.
    CheckBlockMaxSize(config, *m_node.mempool, DEFAULT_MAX_BLOCK_SIZE - 1001,
                      DEFAULT_MAX_BLOCK_SIZE - 1001);
    CheckBlockMaxSize(config, *m_node.mempool, DEFAULT_MAX_BLOCK_SIZE - 1000,
                      DEFAULT_MAX_BLOCK_SIZE - 1000);
    CheckBlockMaxSize(config, *m_node.mempool, DEFAULT_MAX_BLOCK_SIZE - 999,
                      DEFAULT_MAX_BLOCK_SIZE - 1000);
    CheckBlockMaxSize(config, *m_node.mempool, DEFAULT_MAX_BLOCK_SIZE,
                      DEFAULT_MAX_BLOCK_SIZE - 1000);

    // If the parameter is not specified, we use
    // DEFAULT_MAX_GENERATED_BLOCK_SIZE
    {
        gArgs.ClearForcedArg("-blockmaxsize");
        BlockAssembler ba(config, *m_node.mempool);
        BOOST_CHECK_EQUAL(ba.GetMaxGeneratedBlockSize(),
                          DEFAULT_MAX_GENERATED_BLOCK_SIZE);
    }
}

BOOST_AUTO_TEST_CASE(TestCBlockTemplateEntry) {
    const CTransaction tx;
    CTransactionRef txRef = MakeTransactionRef(tx);
    CBlockTemplateEntry txEntry(txRef, 1 * SATOSHI, 10);
    BOOST_CHECK_MESSAGE(txEntry.tx == txRef, "Transactions did not match");
    BOOST_CHECK_EQUAL(txEntry.fees, 1 * SATOSHI);
    BOOST_CHECK_EQUAL(txEntry.sigOpCount, 10);
}

BOOST_AUTO_TEST_SUITE_END()
