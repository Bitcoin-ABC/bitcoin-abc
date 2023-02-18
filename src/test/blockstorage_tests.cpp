// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <config.h>
#include <node/blockstorage.h>
#include <undo.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using node::BlockManager;

BOOST_FIXTURE_TEST_SUITE(blockstorage_tests, TestChain100Setup)

static void CheckReadTx(const BlockManager &blockman, FlatFilePos pos,
                        const CTransaction &expected) {
    CMutableTransaction tx;
    BOOST_CHECK(blockman.ReadTxFromDisk(tx, pos));
    BOOST_CHECK_EQUAL(tx.GetId(), expected.GetId());
    BOOST_CHECK_EQUAL(tx.GetHash(), expected.GetHash());
}

static void CheckReadTxUndo(const BlockManager &blockman, FlatFilePos pos,
                            const std::vector<Coin> &expected) {
    CTxUndo txundo;
    BOOST_CHECK(blockman.ReadTxUndoFromDisk(txundo, pos));
    BOOST_CHECK_EQUAL(txundo.vprevout.size(), expected.size());
    for (size_t idx = 0; idx < expected.size(); ++idx) {
        const Coin &expectedCoin = expected[idx];
        const Coin &actualCoin = txundo.vprevout.at(idx);
        BOOST_CHECK(actualCoin.GetTxOut() == expectedCoin.GetTxOut());
        BOOST_CHECK_EQUAL(actualCoin.GetHeight(), expectedCoin.GetHeight());
        BOOST_CHECK_EQUAL(actualCoin.IsCoinBase(), expectedCoin.IsCoinBase());
    }
}

BOOST_AUTO_TEST_CASE(read_tx_data_from_disk) {
    ChainstateManager &chainman = *Assert(m_node.chainman);

    // Read 100 existing coinbase txs
    auto active_tip =
        WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip());
    for (int32_t height = 0; height < 100; ++height) {
        CBlockIndex *pindex = active_tip->GetAncestor(height);
        CBlock block;
        BOOST_CHECK(chainman.m_blockman.ReadBlockFromDisk(block, *pindex));
        // + 81 = CBlockHeader + CompactSize
        CheckReadTx(
            chainman.m_blockman,
            WITH_LOCK(cs_main,
                      return FlatFilePos(pindex->nFile, pindex->nDataPos + 81)),
            *block.vtx[0]);
    }

    // Test with undo data
    CBlock coinsBlock = CreateAndProcessBlock({}, CScript() << OP_1,
                                              &chainman.ActiveChainstate());
    mineBlocks(100);
    CMutableTransaction tx;
    tx.nVersion = 1;
    tx.vin = {CTxIn(coinsBlock.vtx[0]->GetId(), 0)};
    tx.vout = {CTxOut(50 * COIN - 10000 * SATOSHI,
                      CScript() << OP_RETURN << std::vector<uint8_t>(100))};
    CBlock testBlock = CreateAndProcessBlock({tx}, CScript() << OP_1,
                                             &chainman.ActiveChainstate());

    CBlockIndex *ptest =
        WITH_LOCK(chainman.GetMutex(), return chainman.ActiveTip());
    BOOST_CHECK_EQUAL(ptest->GetBlockHash(), testBlock.GetHash());

    // Check coinbase tx
    CheckReadTx(chainman.m_blockman,
                WITH_LOCK(cs_main, return FlatFilePos(ptest->nFile,
                                                      ptest->nDataPos + 81)),
                *testBlock.vtx[0]);
    // Check 2nd tx
    CheckReadTx(
        chainman.m_blockman,
        WITH_LOCK(cs_main,
                  return FlatFilePos(ptest->nFile,
                                     ptest->nDataPos + 81 +
                                         ::GetSerializeSize(testBlock.vtx[0]))),
        *testBlock.vtx[1]);
    // Check undo data of 2nd tx
    // + 1 = CompactSize
    CheckReadTxUndo(chainman.m_blockman,
                    WITH_LOCK(cs_main, return FlatFilePos(ptest->nFile,
                                                          ptest->nUndoPos + 1)),
                    {Coin(CTxOut(50 * COIN, CScript() << OP_1), 101, true)});
}

BOOST_AUTO_TEST_CASE(read_tx_data_from_disk_bad) {
    CMutableTransaction tx;
    CTxUndo txundo;
    ChainstateManager &chainman = *Assert(m_node.chainman);
    BOOST_CHECK(
        !chainman.m_blockman.ReadTxFromDisk(tx, FlatFilePos(0x7fffffff, 0)));
    BOOST_CHECK(
        !chainman.m_blockman.ReadTxFromDisk(tx, FlatFilePos(0, 0x7fffffff)));
    BOOST_CHECK(!chainman.m_blockman.ReadTxUndoFromDisk(
        txundo, FlatFilePos(0x7fffffff, 0)));
    BOOST_CHECK(!chainman.m_blockman.ReadTxUndoFromDisk(
        txundo, FlatFilePos(0, 0x7fffffff)));
}

BOOST_AUTO_TEST_SUITE_END()
