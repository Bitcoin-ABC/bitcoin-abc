// Copyright (c) 2011-2019 The Bitcoin Core developers
// Copyright (c) 2017-2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <node/miner.h>

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
#include <timedata.h>
#include <txmempool.h>
#include <uint256.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/system.h>
#include <util/time.h>
#include <validation.h>

#include <test/util/mining.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <memory>

using node::BlockAssembler;
using node::CBlockTemplate;
using node::CBlockTemplateEntry;

namespace miner_tests {
struct MinerTestingSetup : public TestingSetup {
    void TestPackageSelection(const CChainParams &chainparams,
                              const CScript &scriptPubKey,
                              const std::vector<CTransactionRef> &txFirst)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main, m_node.mempool->cs);
    void TestBasicMining(const CChainParams &chainparams,
                         const CScript &scriptPubKey,
                         const std::vector<CTransactionRef> &txFirst,
                         int baseheight)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main, m_node.mempool->cs);
    void TestPrioritisedMining(const CChainParams &chainparams,
                               const CScript &scriptPubKey,
                               const std::vector<CTransactionRef> &txFirst)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main, m_node.mempool->cs);
    bool TestSequenceLocks(const CTransaction &tx)
        EXCLUSIVE_LOCKS_REQUIRED(::cs_main, m_node.mempool->cs) {
        CCoinsViewMemPool view_mempool(
            &m_node.chainman->ActiveChainstate().CoinsTip(), *m_node.mempool);
        return CheckSequenceLocksAtTip(m_node.chainman->ActiveChain().Tip(),
                                       view_mempool, tx);
    }
    BlockAssembler AssemblerForTest(const CChainParams &params);
};
} // namespace miner_tests

BOOST_FIXTURE_TEST_SUITE(miner_tests, MinerTestingSetup)

static CFeeRate blockMinFeeRate = CFeeRate(DEFAULT_BLOCK_MIN_TX_FEE_PER_KB);

BlockAssembler MinerTestingSetup::AssemblerForTest(const CChainParams &params) {
    BlockAssembler::Options options;
    options.blockMinFeeRate = blockMinFeeRate;
    return BlockAssembler{m_node.chainman->ActiveChainstate(),
                          m_node.mempool.get(), options};
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

static CBlockIndex CreateBlockIndex(int nHeight, CBlockIndex *active_chain_tip)
    EXCLUSIVE_LOCKS_REQUIRED(cs_main) {
    CBlockIndex index;
    index.nHeight = nHeight;
    index.pprev = active_chain_tip;
    return index;
}

// Test suite for feerate transaction selection.
// Implemented as an additional function, rather than a separate test case,
// to allow reusing the blockchain created in CreateNewBlock_validity.
void MinerTestingSetup::TestPackageSelection(
    const CChainParams &chainparams, const CScript &scriptPubKey,
    const std::vector<CTransactionRef> &txFirst) {
    // Test the ancestor feerate transaction selection.
    TestMemPoolEntryHelper entry;

    // Test that a medium fee transaction will be selected before a higher fee
    // transaction when the high-fee tx has a low fee parent.
    CMutableTransaction tx;
    tx.vin.resize(1);
    tx.vin[0].scriptSig = CScript() << OP_1;
    tx.vin[0].prevout = COutPoint(txFirst[0]->GetId(), 0);
    tx.vout.resize(1);
    tx.vout[0].nValue = int64_t(5000000000LL - 1000) * SATOSHI;
    // This tx has a low fee: 1000 satoshis.
    // Save this txid for later use.
    TxId parentTxId = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(1000 * SATOSHI).Time(GetTime()).FromTx(tx));

    // This tx has a medium fee: 10000 satoshis.
    tx.vin[0].prevout = COutPoint(txFirst[1]->GetId(), 0);
    tx.vout[0].nValue = int64_t(5000000000LL - 10000) * SATOSHI;
    TxId mediumFeeTxId = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(10000 * SATOSHI).Time(GetTime()).FromTx(tx));

    // This tx has a high fee, but depends on the first transaction.
    tx.vin[0].prevout = COutPoint(parentTxId, 0);
    // 50k satoshi fee.
    tx.vout[0].nValue = int64_t(5000000000LL - 1000 - 50000) * SATOSHI;
    TxId highFeeTxId = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(50000 * SATOSHI).Time(GetTime()).FromTx(tx));

    std::unique_ptr<CBlockTemplate> pblocktemplate =
        AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);

    BOOST_CHECK(pblocktemplate->block.vtx[1]->GetId() == mediumFeeTxId);
    BOOST_CHECK(pblocktemplate->block.vtx[2]->GetId() == parentTxId);
    BOOST_CHECK(pblocktemplate->block.vtx[3]->GetId() == highFeeTxId);

    // Test that a tranactions with ancestor below the block min tx fee doesn't
    // get included
    tx.vin[0].prevout = COutPoint(highFeeTxId, 0);
    // 0 fee.
    tx.vout[0].nValue = int64_t(5000000000LL - 1000 - 50000) * SATOSHI;
    TxId freeTxId = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(Amount::zero()).FromTx(tx));

    // Add a child transaction with high fee.
    Amount feeToUse = 50000 * SATOSHI;

    tx.vin[0].prevout = COutPoint(freeTxId, 0);
    tx.vout[0].nValue =
        int64_t(5000000000LL - 1000 - 50000) * SATOSHI - feeToUse;
    TxId highFeeDecendantTxId = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(feeToUse).FromTx(tx));
    pblocktemplate = AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);

    // Verify that the free tx and its high fee descendant tx didn't get
    // selected.
    for (const auto &txn : pblocktemplate->block.vtx) {
        BOOST_CHECK(txn->GetId() != freeTxId);
        BOOST_CHECK(txn->GetId() != highFeeDecendantTxId);
    }
}

static void TestCoinbaseMessageEB(uint64_t eb, std::string cbmsg,
                                  const CTxMemPool &mempool,
                                  const ChainstateManager &chainman) {
    GlobalConfig config;
    config.SetMaxBlockSize(eb);

    CScript scriptPubKey =
        CScript() << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112"
                              "de5c384df7ba0b8d578a4c702b6bf11d5f")
                  << OP_CHECKSIG;

    std::unique_ptr<CBlockTemplate> pblocktemplate =
        BlockAssembler{config, chainman.ActiveChainstate(), &mempool}
            .CreateNewBlock(scriptPubKey);

    CBlock *pblock = &pblocktemplate->block;

    CBlockIndex *active_chain_tip =
        WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip());
    createCoinbaseAndMerkleRoot(pblock, active_chain_tip,
                                config.GetMaxBlockSize());

    unsigned int nHeight = active_chain_tip->nHeight + 1;
    std::vector<uint8_t> vec(cbmsg.begin(), cbmsg.end());
    BOOST_CHECK(pblock->vtx[0]->vin[0].scriptSig ==
                (CScript() << nHeight << vec));
}

// Coinbase scriptSig has to contains the correct EB value
// converted to MB, rounded down to the first decimal
BOOST_AUTO_TEST_CASE(CheckCoinbase_EB) {
    TestCoinbaseMessageEB(1000001, "/EB1.0/", *m_node.mempool,
                          *m_node.chainman);
    TestCoinbaseMessageEB(2000000, "/EB2.0/", *m_node.mempool,
                          *m_node.chainman);
    TestCoinbaseMessageEB(8000000, "/EB8.0/", *m_node.mempool,
                          *m_node.chainman);
    TestCoinbaseMessageEB(8320000, "/EB8.3/", *m_node.mempool,
                          *m_node.chainman);
}

void MinerTestingSetup::TestBasicMining(
    const CChainParams &chainparams, const CScript &scriptPubKey,
    const std::vector<CTransactionRef> &txFirst, int baseheight) {
    CMutableTransaction tx;
    TestMemPoolEntryHelper entry;
    entry.nFee = 11 * SATOSHI;
    entry.nHeight = 11;

    // Just to make sure we can still make simple blocks.
    auto pblocktemplate =
        AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);
    BOOST_CHECK(pblocktemplate);

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
        m_node.mempool->addUnchecked(
            entry.Fee(LOWFEE).Time(GetTime()).FromTx(tx));
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
    m_node.mempool->addUnchecked(entry.Fee(HIGHFEE).Time(GetTime()).FromTx(tx));
    tx.vin[0].prevout = COutPoint(txid, 0);
    tx.vin.resize(2);
    tx.vin[1].scriptSig = CScript() << OP_1;
    tx.vin[1].prevout = COutPoint(txFirst[0]->GetId(), 0);
    // First txn output + fresh coinbase - new txn fee.
    tx.vout[0].nValue = tx.vout[0].nValue + BLOCKSUBSIDY - HIGHERFEE;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(HIGHERFEE).Time(GetTime()).FromTx(tx));
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
    m_node.mempool->addUnchecked(entry.Fee(LOWFEE).Time(GetTime()).FromTx(tx));
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
    m_node.mempool->addUnchecked(entry.Fee(HIGHFEE).Time(GetTime()).FromTx(tx));
    tx.vout[0].scriptPubKey = CScript() << OP_2;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(HIGHFEE).Time(GetTime()).FromTx(tx));
    BOOST_CHECK_EXCEPTION(
        AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey),
        std::runtime_error, HasReason("bad-txns-inputs-missingorspent"));
    m_node.mempool->clear();

    // Subsidy changing.
    int nHeight = m_node.chainman->ActiveHeight();
    // Create an actual 209999-long block chain (without valid blocks).
    while (m_node.chainman->ActiveHeight() < 209999) {
        CBlockIndex *prev = m_node.chainman->ActiveTip();
        CBlockIndex *next = new CBlockIndex();
        next->phashBlock = new BlockHash(InsecureRand256());
        m_node.chainman->ActiveChainstate().CoinsTip().SetBestBlock(
            next->GetBlockHash());
        next->pprev = prev;
        next->nHeight = prev->nHeight + 1;
        next->BuildSkip();
        m_node.chainman->ActiveChain().SetTip(next);
    }
    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));
    // Extend to a 210000-long block chain.
    while (m_node.chainman->ActiveHeight() < 210000) {
        CBlockIndex *prev = m_node.chainman->ActiveTip();
        CBlockIndex *next = new CBlockIndex();
        next->phashBlock = new BlockHash(InsecureRand256());
        m_node.chainman->ActiveChainstate().CoinsTip().SetBestBlock(
            next->GetBlockHash());
        next->pprev = prev;
        next->nHeight = prev->nHeight + 1;
        next->BuildSkip();
        m_node.chainman->ActiveChain().SetTip(next);
    }

    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));

    // Invalid p2sh txn in mempool, template creation fails
    tx.vin[0].prevout = COutPoint(txFirst[0]->GetId(), 0);
    tx.vin[0].scriptSig = CScript() << OP_1;
    tx.vout[0].nValue = BLOCKSUBSIDY - LOWFEE;
    CScript script = CScript() << OP_0;
    tx.vout[0].scriptPubKey = GetScriptForDestination(ScriptHash(script));
    txid = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(LOWFEE).Time(GetTime()).FromTx(tx));
    tx.vin[0].prevout = COutPoint(txid, 0);
    tx.vin[0].scriptSig = CScript()
                          << std::vector<uint8_t>(script.begin(), script.end());
    tx.vout[0].nValue -= LOWFEE;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(LOWFEE).Time(GetTime()).FromTx(tx));
    // Should throw blk-bad-inputs
    BOOST_CHECK_EXCEPTION(
        AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey),
        std::runtime_error, HasReason("blk-bad-inputs"));
    m_node.mempool->clear();

    // Delete the dummy blocks again.
    while (m_node.chainman->ActiveHeight() > nHeight) {
        CBlockIndex *del = m_node.chainman->ActiveTip();
        m_node.chainman->ActiveChain().SetTip(del->pprev);
        m_node.chainman->ActiveChainstate().CoinsTip().SetBestBlock(
            del->pprev->GetBlockHash());
        delete del->phashBlock;
        delete del;
    }

    // non-final txs in mempool
    SetMockTime(m_node.chainman->ActiveTip()->GetMedianTimePast() + 1);
    const uint32_t flags{LOCKTIME_VERIFY_SEQUENCE};
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
    tx.vin[0].nSequence = m_node.chainman->ActiveHeight() + 1;
    prevheights[0] = baseheight + 1;
    tx.vout.resize(1);
    tx.vout[0].nValue = BLOCKSUBSIDY - HIGHFEE;
    tx.vout[0].scriptPubKey = CScript() << OP_1;
    tx.nLockTime = 0;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(HIGHFEE).Time(GetTime()).FromTx(tx));

    const Consensus::Params &params = chainparams.GetConsensus();

    {
        // Locktime passes.
        TxValidationState state;
        BOOST_CHECK(ContextualCheckTransactionForCurrentBlock(
            m_node.chainman->ActiveTip(), params, CTransaction{tx}, state));
    }

    // Sequence locks fail.
    BOOST_CHECK(!TestSequenceLocks(CTransaction{tx}));

    // Sequence locks pass on 2nd block.
    BOOST_CHECK(
        SequenceLocks(CTransaction{tx}, flags, prevheights,
                      CreateBlockIndex(m_node.chainman->ActiveHeight() + 2,
                                       m_node.chainman->ActiveTip())));

    // Relative time locked.
    tx.vin[0].prevout = COutPoint(txFirst[1]->GetId(), 0);
    // txFirst[1] is the 3rd block.
    tx.vin[0].nSequence =
        CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG |
        (((m_node.chainman->ActiveTip()->GetMedianTimePast() + 1 -
           m_node.chainman->ActiveChain()[1]->GetMedianTimePast()) >>
          CTxIn::SEQUENCE_LOCKTIME_GRANULARITY) +
         1);
    prevheights[0] = baseheight + 2;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(entry.Time(GetTime()).FromTx(tx));

    {
        // Locktime passes.
        TxValidationState state;
        BOOST_CHECK(ContextualCheckTransactionForCurrentBlock(
            m_node.chainman->ActiveTip(), params, CTransaction{tx}, state));
    }

    // Sequence locks fail.
    BOOST_CHECK(!TestSequenceLocks(CTransaction{tx}));

    // Sequence locks pass 512 seconds later
    const int SEQUENCE_LOCK_TIME = 512;
    for (int i = 0; i < CBlockIndex::nMedianTimeSpan; ++i) {
        // Trick the MedianTimePast
        m_node.chainman->ActiveTip()
            ->GetAncestor(m_node.chainman->ActiveHeight() - i)
            ->nTime += SEQUENCE_LOCK_TIME;
    }

    BOOST_CHECK(
        SequenceLocks(CTransaction(tx), flags, prevheights,
                      CreateBlockIndex(m_node.chainman->ActiveHeight() + 1,
                                       m_node.chainman->ActiveTip())));

    for (int i = 0; i < CBlockIndex::nMedianTimeSpan; i++) {
        CBlockIndex *ancestor{
            Assert(m_node.chainman->ActiveChain().Tip()->GetAncestor(
                m_node.chainman->ActiveHeight() - i))};
        // Undo tricked MTP.
        ancestor->nTime -= SEQUENCE_LOCK_TIME;
    }

    // Absolute height locked.
    tx.vin[0].prevout = COutPoint(txFirst[2]->GetId(), 0);
    tx.vin[0].nSequence = CTxIn::SEQUENCE_FINAL - 1;
    prevheights[0] = baseheight + 3;
    tx.nLockTime = m_node.chainman->ActiveHeight() + 1;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(entry.Time(GetTime()).FromTx(tx));

    {
        // Locktime fails.
        TxValidationState state;
        BOOST_CHECK(!ContextualCheckTransactionForCurrentBlock(
            m_node.chainman->ActiveTip(), params, CTransaction{tx}, state));
        BOOST_CHECK_EQUAL(state.GetRejectReason(), "bad-txns-nonfinal");
    }

    // Sequence locks pass.
    BOOST_CHECK(TestSequenceLocks(CTransaction{tx}));

    {
        // Locktime passes on 2nd block.
        TxValidationState state;
        int64_t nMedianTimePast =
            m_node.chainman->ActiveTip()->GetMedianTimePast();
        BOOST_CHECK(ContextualCheckTransaction(
            params, CTransaction{tx}, state,
            m_node.chainman->ActiveHeight() + 2, nMedianTimePast));
    }

    // Absolute time locked.
    tx.vin[0].prevout = COutPoint(txFirst[3]->GetId(), 0);
    tx.nLockTime = m_node.chainman->ActiveTip()->GetMedianTimePast();
    prevheights.resize(1);
    prevheights[0] = baseheight + 4;
    txid = tx.GetId();
    m_node.mempool->addUnchecked(entry.Time(GetTime()).FromTx(tx));

    {
        // Locktime fails.
        TxValidationState state;
        BOOST_CHECK(!ContextualCheckTransactionForCurrentBlock(
            m_node.chainman->ActiveTip(), params, CTransaction{tx}, state));
        BOOST_CHECK_EQUAL(state.GetRejectReason(), "bad-txns-nonfinal");
    }

    // Sequence locks pass.
    BOOST_CHECK(TestSequenceLocks(CTransaction{tx}));

    {
        // Locktime passes 1 second later.
        TxValidationState state;
        int64_t nMedianTimePast =
            m_node.chainman->ActiveTip()->GetMedianTimePast() + 1;
        BOOST_CHECK(ContextualCheckTransaction(
            params, CTransaction{tx}, state,
            m_node.chainman->ActiveHeight() + 1, nMedianTimePast));
    }

    // mempool-dependent transactions (not added)
    tx.vin[0].prevout = COutPoint(txid, 0);
    prevheights[0] = m_node.chainman->ActiveHeight() + 1;
    tx.nLockTime = 0;
    tx.vin[0].nSequence = 0;

    {
        // Locktime passes.
        TxValidationState state;
        BOOST_CHECK(ContextualCheckTransactionForCurrentBlock(
            m_node.chainman->ActiveTip(), params, CTransaction{tx}, state));
    }

    // Sequence locks pass.
    BOOST_CHECK(TestSequenceLocks(CTransaction{tx}));
    tx.vin[0].nSequence = 1;
    // Sequence locks fail.
    BOOST_CHECK(!TestSequenceLocks(CTransaction{tx}));
    tx.vin[0].nSequence = CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG;
    // Sequence locks pass.
    BOOST_CHECK(TestSequenceLocks(CTransaction{tx}));
    tx.vin[0].nSequence = CTxIn::SEQUENCE_LOCKTIME_TYPE_FLAG | 1;
    // Sequence locks fail.
    BOOST_CHECK(!TestSequenceLocks(CTransaction{tx}));

    pblocktemplate = AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);
    BOOST_CHECK(pblocktemplate);

    // None of the of the absolute height/time locked tx should have made it
    // into the template because we still check IsFinalTx in CreateNewBlock, but
    // relative locked txs will if inconsistently added to g_mempool. For now
    // these will still generate a valid template until BIP68 soft fork.
    BOOST_CHECK_EQUAL(pblocktemplate->block.vtx.size(), 3UL);
    // However if we advance height by 1 and time by SEQUENCE_LOCK_TIME, all of
    // them should be mined.
    for (int i = 0; i < CBlockIndex::nMedianTimeSpan; i++) {
        CBlockIndex *ancestor{
            Assert(m_node.chainman->ActiveChain().Tip()->GetAncestor(
                m_node.chainman->ActiveHeight() - i))};
        // Trick the MedianTimePast.
        ancestor->nTime += SEQUENCE_LOCK_TIME;
    }
    m_node.chainman->ActiveTip()->nHeight++;
    SetMockTime(m_node.chainman->ActiveTip()->GetMedianTimePast() + 1);

    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));
    BOOST_CHECK_EQUAL(pblocktemplate->block.vtx.size(), 5UL);
}

void MinerTestingSetup::TestPrioritisedMining(
    const CChainParams &chainparams, const CScript &scriptPubKey,
    const std::vector<CTransactionRef> &txFirst) {
    TestMemPoolEntryHelper entry;

    // Test that a tx below min fee but prioritised is included
    CMutableTransaction tx;
    tx.vin.resize(1);
    tx.vin[0].prevout = COutPoint{txFirst[0]->GetId(), 0};
    tx.vin[0].scriptSig = CScript() << OP_1;
    tx.vout.resize(1);
    const int64_t fiveBillion = 5000000000;
    // 0 fee
    tx.vout[0].nValue = fiveBillion * SATOSHI;
    const TxId hashFreePrioritisedTx = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(Amount::zero()).Time(GetTime()).FromTx(tx));
    m_node.mempool->PrioritiseTransaction(hashFreePrioritisedTx, 5 * COIN);

    // This tx has a low fee: 1000 satoshis
    tx.vin[0].prevout = COutPoint{txFirst[1]->GetId(), 0};
    tx.vout[0].nValue = (fiveBillion - 1000) * SATOSHI;
    // save this txid for later use
    const TxId hashParentTx = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(1000 * SATOSHI).Time(GetTime()).FromTx(tx));

    // This tx has a medium fee: 10000 satoshis
    tx.vin[0].prevout = COutPoint{txFirst[2]->GetId(), 0};
    tx.vout[0].nValue = (fiveBillion - 10000) * SATOSHI;
    const TxId hashMediumFeeTx = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(10000 * SATOSHI).Time(GetTime()).FromTx(tx));
    m_node.mempool->PrioritiseTransaction(hashMediumFeeTx, -5 * COIN);

    // This tx also has a low fee, but is prioritised
    tx.vin[0].prevout = COutPoint{hashParentTx, 0};
    // 1000 satoshi fee
    tx.vout[0].nValue = (fiveBillion - 1000 - 1000) * SATOSHI;
    const TxId hashPrioritisedChild = tx.GetId();
    m_node.mempool->addUnchecked(
        entry.Fee(1000 * SATOSHI).Time(GetTime()).FromTx(tx));
    m_node.mempool->PrioritiseTransaction(hashPrioritisedChild, 2 * COIN);

    // Test that transaction selection properly updates ancestor fee
    // calculations as prioritised parents get included in a block. Create a
    // transaction with two prioritised ancestors, each included by itself:
    // FreeParent <- FreeChild <- FreeGrandchild. When FreeParent is added, a
    // modified entry will be created for FreeChild + FreeGrandchild
    // FreeParent's prioritisation should not be included in that entry.
    // When FreeChild is included, FreeChild's prioritisation should also not be
    // included.
    tx.vin[0].prevout = COutPoint{txFirst[3]->GetId(), 0};
    // 0 fee
    tx.vout[0].nValue = fiveBillion * SATOSHI;
    const TxId hashFreeParent = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(Amount::zero()).FromTx(tx));
    m_node.mempool->PrioritiseTransaction(hashFreeParent, 10 * COIN);

    tx.vin[0].prevout = COutPoint{hashFreeParent, 0};
    // 0 fee
    tx.vout[0].nValue = fiveBillion * SATOSHI;
    const TxId hashFreeChild = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(Amount::zero()).FromTx(tx));
    m_node.mempool->PrioritiseTransaction(hashFreeChild, 1 * COIN);

    tx.vin[0].prevout = COutPoint{hashFreeChild, 0};
    // 0 fee
    tx.vout[0].nValue = fiveBillion * SATOSHI;
    const TxId hashFreeGrandchild = tx.GetId();
    m_node.mempool->addUnchecked(entry.Fee(Amount::zero()).FromTx(tx));

    auto pblocktemplate =
        AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey);
    BOOST_REQUIRE_EQUAL(pblocktemplate->block.vtx.size(), 6U);
    BOOST_CHECK(pblocktemplate->block.vtx[1]->GetId() == hashFreeParent);
    BOOST_CHECK(pblocktemplate->block.vtx[2]->GetId() == hashFreePrioritisedTx);
    BOOST_CHECK(pblocktemplate->block.vtx[3]->GetId() == hashFreeChild);
    BOOST_CHECK(pblocktemplate->block.vtx[4]->GetId() == hashParentTx);
    BOOST_CHECK(pblocktemplate->block.vtx[5]->GetId() == hashPrioritisedChild);
    for (size_t i = 0; i < pblocktemplate->block.vtx.size(); ++i) {
        // The FreeParent and FreeChild's prioritisations should not impact the
        // child.
        BOOST_CHECK(pblocktemplate->block.vtx[i]->GetId() !=
                    hashFreeGrandchild);
        // De-prioritised transaction should not be included.
        BOOST_CHECK(pblocktemplate->block.vtx[i]->GetId() != hashMediumFeeTx);
    }
}

// NOTE: These tests rely on CreateNewBlock doing its own self-validation!
BOOST_AUTO_TEST_CASE(CreateNewBlock_validity) {
    // FIXME Update the below blocks to create a valid miner fund coinbase.
    // This requires to update the blockinfo nonces.
    gArgs.ForceSetArg("-enableminerfund", "0");
    // Note that by default, these tests run with size accounting enabled.
    GlobalConfig config;
    const CChainParams &chainparams = config.GetChainParams();
    CScript scriptPubKey =
        CScript() << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112"
                              "de5c384df7ba0b8d578a4c702b6bf11d5f")
                  << OP_CHECKSIG;
    std::unique_ptr<CBlockTemplate> pblocktemplate;

    fCheckpointsEnabled = false;

    // Simple block creation, nothing special yet:
    BOOST_CHECK(pblocktemplate =
                    AssemblerForTest(chainparams).CreateNewBlock(scriptPubKey));

    // We can't make transactions until we have inputs.
    // Therefore, load 110 blocks :)
    static_assert(std::size(blockinfo) == 110,
                  "Should have 110 blocks to import");
    int baseheight = 0;
    std::vector<CTransactionRef> txFirst;
    for (const auto &bi : blockinfo) {
        // pointer for convenience
        CBlock *pblock = &pblocktemplate->block;
        {
            LOCK(cs_main);
            pblock->nVersion = 1;
            pblock->nTime =
                m_node.chainman->ActiveTip()->GetMedianTimePast() + 1;
            CMutableTransaction txCoinbase(*pblock->vtx[0]);
            txCoinbase.nVersion = 1;
            txCoinbase.vin[0].scriptSig = CScript();
            txCoinbase.vin[0].scriptSig.push_back(bi.extranonce);
            txCoinbase.vin[0].scriptSig.push_back(
                m_node.chainman->ActiveHeight());
            txCoinbase.vout.resize(1);
            txCoinbase.vout[0].scriptPubKey = CScript();
            pblock->vtx[0] = MakeTransactionRef(std::move(txCoinbase));
            if (txFirst.size() == 0) {
                baseheight = m_node.chainman->ActiveHeight();
            }
            if (txFirst.size() < 4) {
                txFirst.push_back(pblock->vtx[0]);
            }
            pblock->hashMerkleRoot = BlockMerkleRoot(*pblock);
            pblock->nNonce = bi.nonce;
        }
        std::shared_ptr<const CBlock> shared_pblock =
            std::make_shared<const CBlock>(*pblock);
        BOOST_CHECK(
            Assert(m_node.chainman)
                ->ProcessNewBlock(config, shared_pblock, true, true, nullptr));
        pblock->hashPrevBlock = pblock->GetHash();
    }

    LOCK(cs_main);
    LOCK(m_node.mempool->cs);

    TestBasicMining(chainparams, scriptPubKey, txFirst, baseheight);

    m_node.chainman->ActiveTip()->nHeight--;
    SetMockTime(0);
    m_node.mempool->clear();

    TestPackageSelection(chainparams, scriptPubKey, txFirst);

    m_node.chainman->ActiveChain().Tip()->nHeight--;
    SetMockTime(0);
    m_node.mempool->clear();

    TestPrioritisedMining(chainparams, scriptPubKey, txFirst);

    fCheckpointsEnabled = true;

    gArgs.ClearForcedArg("-enableminerfund");
}

static void CheckBlockMaxSize(const Config &config, const CTxMemPool &mempool,
                              Chainstate &active_chainstate, uint64_t size,
                              uint64_t expected) {
    gArgs.ForceSetArg("-blockmaxsize", ToString(size));

    BlockAssembler ba{config, active_chainstate, &mempool};
    BOOST_CHECK_EQUAL(ba.GetMaxGeneratedBlockSize(), expected);
}

BOOST_AUTO_TEST_CASE(BlockAssembler_construction) {
    GlobalConfig config;

    // We are working on a fake chain and need to protect ourselves.
    LOCK(cs_main);

    const CTxMemPool &mempool = *m_node.mempool;
    Chainstate &active_chainstate = m_node.chainman->ActiveChainstate();

    // Test around historical 1MB (plus one byte because that's mandatory)
    config.SetMaxBlockSize(ONE_MEGABYTE + 1);
    CheckBlockMaxSize(config, mempool, active_chainstate, 0, 1000);
    CheckBlockMaxSize(config, mempool, active_chainstate, 1000, 1000);
    CheckBlockMaxSize(config, mempool, active_chainstate, 1001, 1001);
    CheckBlockMaxSize(config, mempool, active_chainstate, 12345, 12345);

    CheckBlockMaxSize(config, mempool, active_chainstate, ONE_MEGABYTE - 1001,
                      ONE_MEGABYTE - 1001);
    CheckBlockMaxSize(config, mempool, active_chainstate, ONE_MEGABYTE - 1000,
                      ONE_MEGABYTE - 1000);
    CheckBlockMaxSize(config, mempool, active_chainstate, ONE_MEGABYTE - 999,
                      ONE_MEGABYTE - 999);
    CheckBlockMaxSize(config, mempool, active_chainstate, ONE_MEGABYTE,
                      ONE_MEGABYTE - 999);

    // Test around default cap
    config.SetMaxBlockSize(DEFAULT_MAX_BLOCK_SIZE);

    // Now we can use the default max block size.
    CheckBlockMaxSize(config, mempool, active_chainstate,
                      DEFAULT_MAX_BLOCK_SIZE - 1001,
                      DEFAULT_MAX_BLOCK_SIZE - 1001);
    CheckBlockMaxSize(config, mempool, active_chainstate,
                      DEFAULT_MAX_BLOCK_SIZE - 1000,
                      DEFAULT_MAX_BLOCK_SIZE - 1000);
    CheckBlockMaxSize(config, mempool, active_chainstate,
                      DEFAULT_MAX_BLOCK_SIZE - 999,
                      DEFAULT_MAX_BLOCK_SIZE - 1000);
    CheckBlockMaxSize(config, mempool, active_chainstate,
                      DEFAULT_MAX_BLOCK_SIZE, DEFAULT_MAX_BLOCK_SIZE - 1000);

    // If the parameter is not specified, we use
    // DEFAULT_MAX_GENERATED_BLOCK_SIZE
    {
        gArgs.ClearForcedArg("-blockmaxsize");
        BlockAssembler ba{config, m_node.chainman->ActiveChainstate(),
                          m_node.mempool.get()};
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
    BOOST_CHECK_EQUAL(txEntry.sigChecks, 10);
}

BOOST_AUTO_TEST_SUITE_END()
