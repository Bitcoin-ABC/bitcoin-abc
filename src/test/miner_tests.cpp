// Copyright (c) 2011-2016 The Bitcoin Core developers
// Copyright (c) 2017-2018 The Bitcoin developers
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
#include <pubkey.h>
#include <script/standard.h>
#include <txmempool.h>
#include <uint256.h>
#include <util.h>
#include <utilstrencodings.h>
#include <validation.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

#include <memory>

BOOST_FIXTURE_TEST_SUITE(miner_tests, TestingSetup)

static CFeeRate blockMinFeeRate = CFeeRate(DEFAULT_BLOCK_MIN_TX_FEE_PER_KB);

static struct {
    uint8_t extranonce;
    uint32_t nonce;
} blockinfo[] = {
   // TODO need recover
};

CBlockIndex CreateBlockIndex(int nHeight) {
    CBlockIndex index;
    index.nHeight = nHeight;
    index.pprev = chainActive.Tip();
    return index;
}

bool TestSequenceLocks(const CTransaction &tx, int flags) {
    LOCK(g_mempool.cs);
    return CheckSequenceLocks(tx, flags);
}

// Test suite for ancestor feerate transaction selection.
// Implemented as an additional function, rather than a separate test case, to
// allow reusing the blockchain created in CreateNewBlock_validity.
// Note that this test assumes blockprioritypercentage is 0.
void TestPackageSelection(Config &config, CScript scriptPubKey,
                          std::vector<CTransactionRef> &txFirst) {
    // Test the ancestor feerate transaction selection.
    TestMemPoolEntryHelper entry;

    // these 3 tests assume blockprioritypercentage is 0.
    config.SetBlockPriorityPercentage(0);

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
    g_mempool.addUnchecked(parentTxId, entry.Fee(1000 * SATOSHI)
                                           .Time(GetTime())
                                           .SpendsCoinbase(true)
                                           .FromTx(tx));

    // This tx has a medium fee: 10000 satoshis.
    tx.vin[0].prevout = COutPoint(txFirst[1]->GetId(), 0);
    tx.vout[0].nValue = int64_t(5000000000LL - 10000) * SATOSHI;
    TxId mediumFeeTxId = tx.GetId();
    g_mempool.addUnchecked(mediumFeeTxId, entry.Fee(10000 * SATOSHI)
                                              .Time(GetTime())
                                              .SpendsCoinbase(true)
                                              .FromTx(tx));

    // This tx has a high fee, but depends on the first transaction.
    tx.vin[0].prevout = COutPoint(parentTxId, 0);
    // 50k satoshi fee.
    tx.vout[0].nValue = int64_t(5000000000LL - 1000 - 50000) * SATOSHI;
    TxId highFeeTxId = tx.GetId();
    g_mempool.addUnchecked(highFeeTxId, entry.Fee(50000 * SATOSHI)
                                            .Time(GetTime())
                                            .SpendsCoinbase(false)
                                            .FromTx(tx));

    std::unique_ptr<CBlockTemplate> pblocktemplate =
        BlockAssembler(config, g_mempool).CreateNewBlock(scriptPubKey);
    BOOST_CHECK(pblocktemplate->block.vtx[1]->GetId() == parentTxId);
    BOOST_CHECK(pblocktemplate->block.vtx[2]->GetId() == highFeeTxId);
    BOOST_CHECK(pblocktemplate->block.vtx[3]->GetId() == mediumFeeTxId);

    // Test that a package below the block min tx fee doesn't get included
    tx.vin[0].prevout = COutPoint(highFeeTxId, 0);
    // 0 fee.
    tx.vout[0].nValue = int64_t(5000000000LL - 1000 - 50000) * SATOSHI;
    TxId freeTxId = tx.GetId();
    g_mempool.addUnchecked(freeTxId, entry.Fee(Amount::zero()).FromTx(tx));
    size_t freeTxSize = GetVirtualTransactionSize(CTransaction(tx));

    // Calculate a fee on child transaction that will put the package just
    // below the block min tx fee (assuming 1 child tx of the same size).
    Amount feeToUse = blockMinFeeRate.GetFee(2 * freeTxSize) - SATOSHI;

    tx.vin[0].prevout = COutPoint(freeTxId, 0);
    tx.vout[0].nValue =
        int64_t(5000000000LL - 1000 - 50000) * SATOSHI - feeToUse;
    TxId lowFeeTxId = tx.GetId();
    g_mempool.addUnchecked(lowFeeTxId, entry.Fee(feeToUse).FromTx(tx));
    pblocktemplate =
        BlockAssembler(config, g_mempool).CreateNewBlock(scriptPubKey);
    // Verify that the free tx and the low fee tx didn't get selected.
    for (const auto &txn : pblocktemplate->block.vtx) {
        BOOST_CHECK(txn->GetId() != freeTxId);
        BOOST_CHECK(txn->GetId() != lowFeeTxId);
    }

    // Test that packages above the min relay fee do get included, even if one
    // of the transactions is below the min relay fee. Remove the low fee
    // transaction and replace with a higher fee transaction
    g_mempool.removeRecursive(CTransaction(tx));
    // Now we should be just over the min relay fee.
    tx.vout[0].nValue -= 2 * SATOSHI;
    lowFeeTxId = tx.GetId();
    g_mempool.addUnchecked(lowFeeTxId,
                           entry.Fee(feeToUse + 2 * SATOSHI).FromTx(tx));
    pblocktemplate =
        BlockAssembler(config, g_mempool).CreateNewBlock(scriptPubKey);
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
    g_mempool.addUnchecked(
        freeTxId2, entry.Fee(Amount::zero()).SpendsCoinbase(true).FromTx(tx));

    // This tx can't be mined by itself.
    tx.vin[0].prevout = COutPoint(freeTxId2, 0);
    tx.vout.resize(1);
    feeToUse = blockMinFeeRate.GetFee(freeTxSize);
    tx.vout[0].nValue = int64_t(5000000000LL - 100000000) * SATOSHI - feeToUse;
    TxId lowFeeTxId2 = tx.GetId();
    g_mempool.addUnchecked(
        lowFeeTxId2, entry.Fee(feeToUse).SpendsCoinbase(false).FromTx(tx));
    pblocktemplate =
        BlockAssembler(config, g_mempool).CreateNewBlock(scriptPubKey);

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
    g_mempool.addUnchecked(tx.GetId(), entry.Fee(10000 * SATOSHI).FromTx(tx));
    pblocktemplate =
        BlockAssembler(config, g_mempool).CreateNewBlock(scriptPubKey);
    BOOST_CHECK(pblocktemplate->block.vtx[8]->GetId() == lowFeeTxId2);
}

void TestCoinbaseMessageEB(uint64_t eb, std::string cbmsg) {
    GlobalConfig config;
    config.SetMaxBlockSize(eb);

    CScript scriptPubKey =
        CScript() << ParseHex("04678afdb0fe5548271967f1a67130b7105cd6a828e03909"
                              "a67962e0ea1f61deb649f6bc3f4cef38c4f35504e51ec112"
                              "de5c384df7ba0b8d578a4c702b6bf11d5f")
                  << OP_CHECKSIG;

    std::unique_ptr<CBlockTemplate> pblocktemplate =
        BlockAssembler(config, g_mempool).CreateNewBlock(scriptPubKey);

    CBlock *pblock = &pblocktemplate->block;

    // IncrementExtraNonce creates a valid coinbase and merkleRoot
    unsigned int extraNonce = 0;
    IncrementExtraNonce(config, pblock, chainActive.Tip(), extraNonce);
    unsigned int nHeight = chainActive.Tip()->nHeight + 1;
    std::vector<uint8_t> vec(cbmsg.begin(), cbmsg.end());
    BOOST_CHECK(pblock->vtx[0]->vin[0].scriptSig ==
                ((CScript() << nHeight << CScriptNum(extraNonce) << vec) +
                 COINBASE_FLAGS));
}

// Coinbase scriptSig has to contains the correct EB value
// converted to MB, rounded down to the first decimal
BOOST_AUTO_TEST_CASE(CheckCoinbase_EB) {
    TestCoinbaseMessageEB(1000001, "/EB1.0/");
    TestCoinbaseMessageEB(2000000, "/EB2.0/");
    TestCoinbaseMessageEB(8000000, "/EB8.0/");
    TestCoinbaseMessageEB(8320000, "/EB8.3/");
}

// NOTE: These tests rely on CreateNewBlock doing its own self-validation!
BOOST_AUTO_TEST_CASE(CreateNewBlock_validity) {
    // Note that by default, these tests run with size accounting enabled.
    // TODO need recover
}

void CheckBlockMaxSize(const Config &config, uint64_t size, uint64_t expected) {
    gArgs.ForceSetArg("-blockmaxsize", std::to_string(size));

    BlockAssembler ba(config, g_mempool);
    BOOST_CHECK_EQUAL(ba.GetMaxGeneratedBlockSize(), expected);
}

BOOST_AUTO_TEST_CASE(BlockAssembler_construction) {
    GlobalConfig config;

    // We are working on a fake chain and need to protect ourselves.
    LOCK(cs_main);

    // Test around historical 1MB (plus one byte because that's mandatory)
    config.SetMaxBlockSize(ONE_MEGABYTE + 1);
    CheckBlockMaxSize(config, 0, 1000);
    CheckBlockMaxSize(config, 1000, 1000);
    CheckBlockMaxSize(config, 1001, 1001);
    CheckBlockMaxSize(config, 12345, 12345);

    CheckBlockMaxSize(config, ONE_MEGABYTE - 1001, ONE_MEGABYTE - 1001);
    CheckBlockMaxSize(config, ONE_MEGABYTE - 1000, ONE_MEGABYTE - 1000);
    CheckBlockMaxSize(config, ONE_MEGABYTE - 999, ONE_MEGABYTE - 999);
    CheckBlockMaxSize(config, ONE_MEGABYTE, ONE_MEGABYTE - 999);

    // Test around default cap
    config.SetMaxBlockSize(DEFAULT_MAX_BLOCK_SIZE);

    // Now we can use the default max block size.
    CheckBlockMaxSize(config, DEFAULT_MAX_BLOCK_SIZE - 1001,
                      DEFAULT_MAX_BLOCK_SIZE - 1001);
    CheckBlockMaxSize(config, DEFAULT_MAX_BLOCK_SIZE - 1000,
                      DEFAULT_MAX_BLOCK_SIZE - 1000);
    CheckBlockMaxSize(config, DEFAULT_MAX_BLOCK_SIZE - 999,
                      DEFAULT_MAX_BLOCK_SIZE - 1000);
    CheckBlockMaxSize(config, DEFAULT_MAX_BLOCK_SIZE,
                      DEFAULT_MAX_BLOCK_SIZE - 1000);

    // If the parameter is not specified, we use
    // DEFAULT_MAX_GENERATED_BLOCK_SIZE
    {
        gArgs.ClearArg("-blockmaxsize");
        BlockAssembler ba(config, g_mempool);
        BOOST_CHECK_EQUAL(ba.GetMaxGeneratedBlockSize(),
                          DEFAULT_MAX_GENERATED_BLOCK_SIZE);
    }
}

BOOST_AUTO_TEST_CASE(TestCBlockTemplateEntry) {
    const CTransaction tx;
    CTransactionRef txRef = MakeTransactionRef(tx);
    CBlockTemplateEntry txEntry(txRef, 1 * SATOSHI, 200, 10);
    BOOST_CHECK_MESSAGE(txEntry.tx == txRef, "Transactions did not match");
    BOOST_CHECK_EQUAL(txEntry.txFee, 1 * SATOSHI);
    BOOST_CHECK_EQUAL(txEntry.txSize, 200);
    BOOST_CHECK_EQUAL(txEntry.txSigOps, 10);
}

BOOST_AUTO_TEST_SUITE_END()
