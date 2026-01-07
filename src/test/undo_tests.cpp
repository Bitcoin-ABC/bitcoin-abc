// Copyright (c) 2017 Amaury SÉCHET
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <undo.h>

#include <chain.h>
#include <chainparams.h>
#include <consensus/validation.h>
#include <util/chaintype.h>
#include <validation.h>

#include <test/util/random.h>
#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(undo_tests, BasicTestingSetup)

static void UpdateUTXOSet(const CBlock &block, CCoinsViewCache &view,
                          CBlockUndo &blockundo,
                          const CChainParams &chainparams, uint32_t nHeight) {
    auto &coinbaseTx = *block.vtx[0];
    AddCoins(view, coinbaseTx, nHeight);

    for (size_t i = 1; i < block.vtx.size(); i++) {
        auto &tx = *block.vtx[1];

        blockundo.vtxundo.push_back(CTxUndo());
        UpdateCoins(view, tx, blockundo.vtxundo.back(), nHeight);
    }

    view.SetBestBlock(block.GetHash());
}

static void UndoBlock(const CBlock &block, CCoinsViewCache &view,
                      CBlockUndo &&blockUndo, const CChainParams &chainparams,
                      uint32_t nHeight) {
    CBlockIndex pindex;
    pindex.nHeight = nHeight;
    ApplyBlockUndo(std::move(blockUndo), block, &pindex, view);
}

static bool HasSpendableCoin(const CCoinsViewCache &view, const TxId &txid) {
    return !view.AccessCoin(COutPoint(txid, 0)).IsSpent();
}

BOOST_AUTO_TEST_CASE(connect_utxo_extblock) {
    SelectParams(ChainType::MAIN);
    const CChainParams &chainparams = Params();

    CBlock block;
    CMutableTransaction tx;

    CCoinsView coinsDummy;
    CCoinsViewCache view(&coinsDummy);

    block.hashPrevBlock = BlockHash(m_rng.rand256());
    view.SetBestBlock(block.hashPrevBlock);

    // Create a block with coinbase and resolution transaction.
    tx.vin.resize(1);
    tx.vin[0].scriptSig.resize(10);
    tx.vout.resize(1);
    tx.vout[0].nValue = 42 * SATOSHI;
    auto coinbaseTx = CTransaction(tx);

    block.vtx.resize(2);
    block.vtx[0] = MakeTransactionRef(tx);

    tx.vout[0].scriptPubKey = CScript() << OP_TRUE;
    tx.vin[0].prevout = COutPoint(TxId(m_rng.rand256()), 0);
    tx.vin[0].nSequence = CTxIn::SEQUENCE_FINAL;
    tx.vin[0].scriptSig.resize(0);
    tx.nVersion = 2;

    auto prevTx0 = CTransaction(tx);
    AddCoins(view, prevTx0, 100);

    tx.vin[0].prevout = COutPoint(prevTx0.GetId(), 0);
    auto tx0 = CTransaction(tx);
    block.vtx[1] = MakeTransactionRef(tx0);

    // Now update the UTXO set.
    CBlockUndo blockundo;
    UpdateUTXOSet(block, view, blockundo, chainparams, 123456);

    BOOST_CHECK(view.GetBestBlock() == block.GetHash());
    BOOST_CHECK(HasSpendableCoin(view, coinbaseTx.GetId()));
    BOOST_CHECK(HasSpendableCoin(view, tx0.GetId()));
    BOOST_CHECK(!HasSpendableCoin(view, prevTx0.GetId()));

    UndoBlock(block, view, std::move(blockundo), chainparams, 123456);

    BOOST_CHECK(view.GetBestBlock() == block.hashPrevBlock);
    BOOST_CHECK(!HasSpendableCoin(view, coinbaseTx.GetId()));
    BOOST_CHECK(!HasSpendableCoin(view, tx0.GetId()));
    BOOST_CHECK(HasSpendableCoin(view, prevTx0.GetId()));
}

BOOST_AUTO_TEST_SUITE_END()
