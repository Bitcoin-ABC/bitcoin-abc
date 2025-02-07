// Copyright (c) 2023 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

// Test to verify all the Bridge* functions in chronik_bridge.cpp are working
// correctly.

#include <chainparams.h>
#include <chronik-bridge/src/ffi.rs.h>
#include <chronik-cpp/chronik_bridge.h>
#include <chronik-cpp/util/collection.h>
#include <chronik-cpp/util/hash.h>
#include <config.h>
#include <node/blockstorage.h>
#include <streams.h>
#include <undo.h>
#include <util/strencodings.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

using namespace chronik::util;
using node::BlockManager;

BOOST_AUTO_TEST_SUITE(bridgeprimitives_tests)

void CheckTxsEqual(const chronik_bridge::Tx &left,
                   const chronik_bridge::Tx &right) {
    BOOST_CHECK_EQUAL(HexStr(left.txid), HexStr(right.txid));
    BOOST_CHECK_EQUAL(left.version, right.version);
    BOOST_CHECK_EQUAL(left.locktime, right.locktime);
    BOOST_CHECK_EQUAL(left.inputs.size(), right.inputs.size());
    for (size_t inputIdx = 0; inputIdx < left.inputs.size(); ++inputIdx) {
        const chronik_bridge::TxInput &inLeft = left.inputs[inputIdx];
        const chronik_bridge::TxInput &inRight = right.inputs.at(inputIdx);
        BOOST_CHECK_EQUAL(HexStr(inLeft.prev_out.txid),
                          HexStr(inRight.prev_out.txid));
        BOOST_CHECK_EQUAL(inLeft.prev_out.out_idx, inRight.prev_out.out_idx);
        BOOST_CHECK_EQUAL(HexStr(inLeft.script), HexStr(inRight.script));
        BOOST_CHECK_EQUAL(inLeft.sequence, inRight.sequence);
        BOOST_CHECK_EQUAL(inLeft.coin.output.sats, inRight.coin.output.sats);
        BOOST_CHECK_EQUAL(HexStr(inLeft.coin.output.script),
                          HexStr(inRight.coin.output.script));
        BOOST_CHECK_EQUAL(inLeft.coin.height, inRight.coin.height);
        BOOST_CHECK_EQUAL(inLeft.coin.is_coinbase, inRight.coin.is_coinbase);
    }
    BOOST_CHECK_EQUAL(left.outputs.size(), right.outputs.size());
    for (size_t outputIdx = 0; outputIdx < left.outputs.size(); ++outputIdx) {
        const chronik_bridge::TxOutput &outLeft = left.outputs[outputIdx];
        const chronik_bridge::TxOutput &outRight = right.outputs.at(outputIdx);
        BOOST_CHECK_EQUAL(outLeft.sats, outRight.sats);
        BOOST_CHECK_EQUAL(HexStr(outLeft.script), HexStr(outRight.script));
    }
}

void CheckBlocksEqual(const chronik_bridge::Block &left,
                      const chronik_bridge::Block &right) {
    BOOST_CHECK_EQUAL(HexStr(left.hash), HexStr(right.hash));
    BOOST_CHECK_EQUAL(HexStr(left.prev_hash), HexStr(right.prev_hash));
    BOOST_CHECK_EQUAL(left.n_bits, right.n_bits);
    BOOST_CHECK_EQUAL(left.timestamp, right.timestamp);
    BOOST_CHECK_EQUAL(left.height, right.height);
    BOOST_CHECK_EQUAL(left.file_num, right.file_num);
    BOOST_CHECK_EQUAL(left.data_pos, right.data_pos);
    BOOST_CHECK_EQUAL(left.undo_pos, right.undo_pos);
    BOOST_CHECK_EQUAL(left.size, right.size);

    BOOST_CHECK_EQUAL(left.txs.size(), right.txs.size());
    for (size_t txIdx = 0; txIdx < left.txs.size(); ++txIdx) {
        const chronik_bridge::BlockTx &txLeft = left.txs[txIdx];
        const chronik_bridge::BlockTx &txRight = right.txs.at(txIdx);
        BOOST_CHECK_EQUAL(txLeft.data_pos, txRight.data_pos);
        BOOST_CHECK_EQUAL(txLeft.undo_pos, txRight.undo_pos);
        CheckTxsEqual(txLeft.tx, txRight.tx);
    }
}

static void CheckMatchesDisk(const BlockManager &blockman, const CBlock &block,
                             const chronik_bridge::Block &bridgedBlock) {
    for (size_t idx = 0; idx < block.vtx.size(); ++idx) {
        const chronik_bridge::BlockTx blockTx = bridgedBlock.txs[idx];
        CMutableTransaction txFromDisk;
        BOOST_CHECK(blockman.ReadTxFromDisk(
            txFromDisk, FlatFilePos(bridgedBlock.file_num, blockTx.data_pos)));
        BOOST_CHECK(txFromDisk.GetHash() == block.vtx[idx]->GetHash());

        if (idx == 0) {
            continue;
        }

        CTxUndo txundo;
        BOOST_CHECK(blockman.ReadTxUndoFromDisk(
            txundo, FlatFilePos(bridgedBlock.file_num, blockTx.undo_pos)));
        BOOST_CHECK_EQUAL(txundo.vprevout.size(), txFromDisk.vin.size());
        for (size_t inputIdx = 0; inputIdx < blockTx.tx.inputs.size();
             ++inputIdx) {
            const Coin &coin = txundo.vprevout[inputIdx];
            const chronik_bridge::Coin &bridgeCoin =
                blockTx.tx.inputs[inputIdx].coin;
            BOOST_CHECK_EQUAL(coin.GetTxOut().nValue / SATOSHI,
                              bridgeCoin.output.sats);
            BOOST_CHECK_EQUAL(HexStr(coin.GetTxOut().scriptPubKey),
                              HexStr(bridgeCoin.output.script));
            BOOST_CHECK_EQUAL(coin.GetHeight(), bridgeCoin.height);
            BOOST_CHECK_EQUAL(coin.IsCoinBase(), bridgeCoin.is_coinbase);
        }
    }
}

BOOST_FIXTURE_TEST_CASE(test_bridge_genesis, TestChain100Setup) {
    LOCK(cs_main);

    ChainstateManager &chainman = *Assert(m_node.chainman);
    const chronik_bridge::ChronikBridge bridge(m_node);

    CBlockIndex *pgenesis = chainman.ActiveTip()->GetAncestor(0);
    const CBlock &genesisBlock = chainman.GetParams().GenesisBlock();

    // Loading genesis unblock data returns an empty undo
    std::unique_ptr<CBlockUndo> genesisBlockUndo =
        bridge.load_block_undo(*pgenesis);
    BOOST_CHECK(genesisBlockUndo->vtxundo.empty());

    chronik_bridge::Block bridgedGenesisBlock = chronik_bridge::bridge_block(
        genesisBlock, *genesisBlockUndo, *pgenesis);
    chronik_bridge::Tx expectedGenesisTx = {
        .txid = HashToArray(genesisBlock.vtx[0]->GetId()),
        .version = 1,
        .inputs = {{
            .prev_out = chronik_bridge::OutPoint({
                .txid = {},
                .out_idx = 0xffff'ffff,
            }),
            .script = ToRustVec<uint8_t>(genesisBlock.vtx[0]->vin[0].scriptSig),
            .sequence = 0xffff'ffff,
            .coin = {}, // null coin
        }},
        .outputs = {{
            .sats = 5000000000,
            .script =
                ToRustVec<uint8_t>(genesisBlock.vtx[0]->vout[0].scriptPubKey),
        }},
        .locktime = 0,
    };
    chronik_bridge::Block expectedBridgedGenesisBlock = {
        .hash = HashToArray(genesisBlock.GetHash()),
        .prev_hash = {},
        .n_bits = 0x207fffff,
        .timestamp = 1296688602,
        .height = 0,
        .file_num = 0,
        .data_pos = 8, // 8 magic bytes in block file
        .undo_pos = 0, // genesis has no undo data
        .size = 285,
        .txs = {{
            .tx = expectedGenesisTx,
            .data_pos = 89, // +80 header +1 compact size
            .undo_pos = 0   // coinbase has no undo data
        }}};

    CheckBlocksEqual(bridgedGenesisBlock, expectedBridgedGenesisBlock);

    chronik_bridge::BlockTx &bridgedGenesisTx = bridgedGenesisBlock.txs[0];
    CMutableTransaction genesisTxFromDisk;
    BOOST_CHECK(chainman.m_blockman.ReadTxFromDisk(
        genesisTxFromDisk,
        FlatFilePos(bridgedGenesisBlock.file_num, bridgedGenesisTx.data_pos)));
    BOOST_CHECK(genesisTxFromDisk.GetHash() == genesisBlock.vtx[0]->GetHash());

    CheckTxsEqual(bridge.load_tx(bridgedGenesisBlock.file_num,
                                 bridgedGenesisTx.data_pos,
                                 bridgedGenesisTx.undo_pos),
                  bridgedGenesisTx.tx);

    CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
    ss << genesisBlock.vtx[0];
    BOOST_CHECK_EQUAL(HexStr(ss),
                      HexStr(bridge.load_raw_tx(bridgedGenesisBlock.file_num,
                                                bridgedGenesisTx.data_pos)));
}

BOOST_FIXTURE_TEST_CASE(test_bridge_detailled, TestChain100Setup) {
    LOCK(cs_main);

    const chronik_bridge::ChronikBridge bridge(m_node);
    ChainstateManager &chainman = *Assert(m_node.chainman);

    CBlock coinsBlock = CreateAndProcessBlock({}, CScript() << OP_1,
                                              &chainman.ActiveChainstate());
    mineBlocks(100);

    CScript scriptPad = CScript() << OP_RETURN << std::vector<uint8_t>(100);
    CMutableTransaction tx1;
    tx1.nVersion = 1;
    tx1.vin = {CTxIn(coinsBlock.vtx[0]->GetId(), 0)};
    tx1.vout = {
        CTxOut(50 * COIN - 10000 * SATOSHI, CScript() << OP_3),
        CTxOut(1000 * SATOSHI, CScript() << OP_4),
        CTxOut(Amount::zero(), scriptPad),
    };
    tx1.nLockTime = 123;

    CMutableTransaction tx2;
    tx2.nVersion = 1;
    tx2.vin = {CTxIn(tx1.GetId(), 0), CTxIn(tx1.GetId(), 1)};
    tx2.vout = {
        CTxOut(50 * COIN - 30000 * SATOSHI, CScript() << OP_5),
        CTxOut(Amount::zero(), scriptPad),
    };

    BOOST_CHECK(tx1.GetId() < tx2.GetId());

    CBlock testBlock = CreateAndProcessBlock({tx1, tx2}, CScript() << OP_2,
                                             &chainman.ActiveChainstate());
    std::unique_ptr<CBlockUndo> testBlockUndo =
        bridge.load_block_undo(*chainman.ActiveTip());

    BOOST_CHECK_EQUAL(chainman.ActiveTip()->GetBlockHash(),
                      testBlock.GetHash());
    chronik_bridge::Block bridgedTestBlock = chronik_bridge::bridge_block(
        testBlock, *testBlockUndo, *chainman.ActiveTip());

    chronik_bridge::Tx expectedTestTx0 = {
        .txid = HashToArray(testBlock.vtx[0]->GetId()),
        .version = 2,
        .inputs = {{
            .prev_out = chronik_bridge::OutPoint({
                .txid = {},
                .out_idx = 0xffff'ffff,
            }),
            .script = ToRustVec<uint8_t>(testBlock.vtx[0]->vin[0].scriptSig),
            .sequence = 0xffff'ffff,
            .coin = {}, // null coin
        }},
        .outputs = {{
            .sats = 2500000000,
            .script = {0x52},
        }},
        .locktime = 0,
    };
    chronik_bridge::Tx expectedTestTx1 = {
        .txid = HashToArray(tx1.GetId()),
        .version = 1,
        .inputs = {{
            .prev_out = chronik_bridge::OutPoint({
                .txid = HashToArray(coinsBlock.vtx[0]->GetId()),
                .out_idx = 0,
            }),
            .script = {},
            .sequence = 0xffff'ffff,
            .coin = chronik_bridge::Coin({
                .output = {5000000000, {0x51}},
                .height = 101,
                .is_coinbase = true,
            }),
        }},
        .outputs = {{4999990000, {0x53}},
                    {1000, {0x54}},
                    {0, ToRustVec<uint8_t>(scriptPad)}},
        .locktime = 123,
    };
    chronik_bridge::Tx
        expectedTestTx2 =
            {
                .txid = HashToArray(tx2.GetId()),
                .version = 1,
                .inputs = {chronik_bridge::TxInput(
                               {
                                   .prev_out = chronik_bridge::OutPoint({
                                       .txid = HashToArray(tx1.GetId()),
                                       .out_idx = 0,
                                   }),
                                   .script = {},
                                   .sequence = 0xffff'ffff,
                                   .coin =
                                       {
                                           .output = {4999990000, {0x53}},
                                           .height = 202,
                                           .is_coinbase = false,
                                       },
                               }),
                           chronik_bridge::TxInput(
                               {
                                   .prev_out = chronik_bridge::OutPoint(
                                       {
                                           .txid = HashToArray(tx1.GetId()),
                                           .out_idx = 1,
                                       }),
                                   .script = {},
                                   .sequence = 0xffff'ffff,
                                   .coin =
                                       {
                                           .output = {1000, {0x54}},
                                           .height = 202,
                                           .is_coinbase = false,
                                       },
                               })},
                .outputs = {{
                                .sats = 4999970000,
                                .script = {0x55},
                            },
                            {
                                .sats = 0,
                                .script = ToRustVec<uint8_t>(scriptPad),
                            }},
                .locktime = 0,
            };
    chronik_bridge::Block expectedBridgedTestBlock = {
        .hash = HashToArray(testBlock.GetHash()),
        .prev_hash = HashToArray(testBlock.hashPrevBlock),
        .n_bits = 0x207fffff,
        .timestamp = 1598888152,
        .height = 202,
        .file_num = 0,
        .data_pos = 39548,
        .undo_pos = 8249,
        .size = 578,
        .txs = {
            {.tx = expectedTestTx0, .data_pos = 39629, .undo_pos = 0},
            {.tx = expectedTestTx1, .data_pos = 39729, .undo_pos = 8250},
            {.tx = expectedTestTx2, .data_pos = 39912, .undo_pos = 8257},
        }};

    CheckBlocksEqual(bridgedTestBlock, expectedBridgedTestBlock);

    CheckMatchesDisk(chainman.m_blockman, testBlock, bridgedTestBlock);

    for (const chronik_bridge::BlockTx &bridgedTx : bridgedTestBlock.txs) {
        CheckTxsEqual(bridge.load_tx(bridgedTestBlock.file_num,
                                     bridgedTx.data_pos, bridgedTx.undo_pos),
                      bridgedTx.tx);
    }

    for (size_t i = 0; i < testBlock.vtx.size(); ++i) {
        CDataStream ss(SER_NETWORK, PROTOCOL_VERSION);
        ss << testBlock.vtx[i];
        BOOST_CHECK_EQUAL(HexStr(ss), HexStr(bridge.load_raw_tx(
                                          bridgedTestBlock.file_num,
                                          bridgedTestBlock.txs[i].data_pos)));
    }
}

BOOST_FIXTURE_TEST_CASE(test_bridge_bad, TestChain100Setup) {
    LOCK(cs_main);

    ChainstateManager &chainman = *Assert(m_node.chainman);
    const chronik_bridge::ChronikBridge bridge(m_node);

    // Incompatible CBlock and CBlockUndo:
    // CBlock has a tx that the CBlockUndo doesn't have.
    CBlock badBlock1 = CreateBlock({CMutableTransaction()}, CScript() << OP_1,
                                   chainman.ActiveChainstate());
    CBlockUndo badBlockUndo1;
    BOOST_CHECK_EXCEPTION(chronik_bridge::bridge_block(badBlock1, badBlockUndo1,
                                                       *chainman.ActiveTip()),
                          std::runtime_error, [](const std::runtime_error &ex) {
                              BOOST_CHECK_EQUAL(ex.what(),
                                                "Missing undo data for tx");
                              return true;
                          });

    CBlock coinsBlock = CreateAndProcessBlock({}, CScript() << OP_1,
                                              &chainman.ActiveChainstate());
    mineBlocks(100);

    // Create block with some undo data
    CMutableTransaction tx;
    tx.nVersion = 1;
    tx.vin = {CTxIn(coinsBlock.vtx[0]->GetId(), 0)};
    tx.vout = {CTxOut(50 * COIN - 10000 * SATOSHI,
                      CScript() << OP_RETURN << std::vector<uint8_t>(100))};
    CreateAndProcessBlock({tx}, CScript() << OP_1,
                          &chainman.ActiveChainstate());
    std::unique_ptr<CBlockUndo> blockUndo =
        bridge.load_block_undo(*chainman.ActiveTip());

    // This time, bad CBlock has two inputs whereas the disk has only one.
    CMutableTransaction badTx;
    badTx.vin.resize(2);
    CBlock badBlock2 =
        CreateBlock({badTx}, CScript() << OP_1, chainman.ActiveChainstate());
    BOOST_CHECK_EXCEPTION(chronik_bridge::bridge_block(badBlock2, *blockUndo,
                                                       *chainman.ActiveTip()),
                          std::runtime_error, [](const std::runtime_error &ex) {
                              BOOST_CHECK_EQUAL(ex.what(),
                                                "Missing coin for input");
                              return true;
                          });
}

// It's easy to make a hard to detect off-by-one error when using
// GetSizeOfCompactSize, therefore we test blocks with "dangerous" number of
// txs, which cover the cases where GetSizeOfCompactSize goes from 1 -> 3 -> 5.
BOOST_FIXTURE_TEST_CASE(test_bridge_big, TestChain100Setup) {
    LOCK(cs_main);

    ChainstateManager &chainman = *Assert(m_node.chainman);
    const chronik_bridge::ChronikBridge bridge(m_node);

    std::vector<size_t> testNumTxsCases = {
        0,   1,   2,   3,   10,  62,  63,  64,  65,  126, 127, 128,
        129, 130, 250, 251, 252, 253, 254, 255, 256, 257, 258, 65536};

    std::vector<CBlock> coinblocks;
    for (size_t idx = 0; idx < testNumTxsCases.size(); ++idx) {
        CBlock coinblock = CreateAndProcessBlock({}, CScript() << OP_1,
                                                 &chainman.ActiveChainstate());
        coinblocks.push_back(coinblock);
        BOOST_CHECK_EQUAL(chainman.ActiveTip()->GetBlockHash(),
                          coinblock.GetHash());
    }
    mineBlocks(100);

    CScript scriptPad = CScript() << OP_RETURN << std::vector<uint8_t>(100);

    for (size_t idx = 0; idx < testNumTxsCases.size(); ++idx) {
        size_t numTxs = testNumTxsCases[idx];
        std::vector<CMutableTransaction> txs;
        txs.reserve(numTxs);
        const CTransactionRef &coinbase = coinblocks[idx].vtx[0];
        Amount available = coinbase->vout[0].nValue;
        TxId coinTxId = coinbase->GetId();
        for (size_t txIdx = 0; txIdx < numTxs; ++txIdx) {
            CMutableTransaction tx;
            tx.nVersion = 1;
            tx.vin = {CTxIn(coinTxId, 0)};
            available -= 10000 * SATOSHI;
            tx.vout = {
                CTxOut(available, CScript() << OP_2),
                CTxOut(Amount::zero(), scriptPad),
            };
            coinTxId = tx.GetId();
            txs.push_back(tx);
        }
        CBlock testBlock = CreateAndProcessBlock(txs, CScript() << OP_1,
                                                 &chainman.ActiveChainstate());
        BOOST_CHECK_EQUAL(chainman.ActiveTip()->GetBlockHash(),
                          testBlock.GetHash());

        std::unique_ptr<CBlockUndo> testBlockUndo =
            bridge.load_block_undo(*chainman.ActiveTip());

        // test matches disk
        chronik_bridge::Block bridgedBlock = chronik_bridge::bridge_block(
            testBlock, *testBlockUndo, *chainman.ActiveTip());
        CheckMatchesDisk(chainman.m_blockman, testBlock, bridgedBlock);

        for (const chronik_bridge::BlockTx &bridgedTx : bridgedBlock.txs) {
            CheckTxsEqual(bridge.load_tx(bridgedBlock.file_num,
                                         bridgedTx.data_pos,
                                         bridgedTx.undo_pos),
                          bridgedTx.tx);
        }
    }
}

BOOST_FIXTURE_TEST_CASE(test_load_tx_bad, TestChain100Setup) {
    const chronik_bridge::ChronikBridge bridge(m_node);

    BOOST_CHECK_EXCEPTION(
        bridge.load_tx(0x7fffffff, 0, 0), std::runtime_error,
        [](const std::runtime_error &ex) {
            BOOST_CHECK_EQUAL(ex.what(), "Reading tx data from disk failed");
            return true;
        });
    BOOST_CHECK_EXCEPTION(
        bridge.load_tx(0, 0x7fffffff, 0), std::runtime_error,
        [](const std::runtime_error &ex) {
            BOOST_CHECK_EQUAL(ex.what(), "Reading tx data from disk failed");
            return true;
        });
    uint32_t genesisCbDataPos = 89;
    BOOST_CHECK_EXCEPTION(bridge.load_tx(0, genesisCbDataPos, 0x7fffffff),
                          std::runtime_error, [](const std::runtime_error &ex) {
                              BOOST_CHECK_EQUAL(
                                  ex.what(),
                                  "Reading tx undo data from disk failed");
                              return true;
                          });
    // sanity check
    bridge.load_tx(0, genesisCbDataPos, 0);
}

BOOST_AUTO_TEST_SUITE_END()
