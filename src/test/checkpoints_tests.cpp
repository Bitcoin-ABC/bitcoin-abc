// Copyright (c) 2011-2015 The Bitcoin Core developers
// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

//
// Unit tests for block-chain checkpoints
//

#include <checkpoints.h>

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/validation.h>
#include <streams.h>
#include <uint256.h>
#include <util/chaintype.h>
#include <util/strencodings.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <memory>

BOOST_FIXTURE_TEST_SUITE(checkpoints_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(sanity) {
    const auto params = CreateChainParams(*m_node.args, ChainType::MAIN);
    const CCheckpointData &checkpoints = params->Checkpoints();
    BlockHash p11111 = BlockHash::fromHex(
        "0000000069e244f73d78e8fd29ba2fd2ed618bd6fa2ee92559f542fdb26e7c1d");
    BlockHash p134444 = BlockHash::fromHex(
        "00000000000005b12ffd4cd315cd34ffd4a594f430ac814c91184a0d42d2b0fe");
    BOOST_CHECK(Checkpoints::CheckBlock(checkpoints, 11111, p11111));
    BOOST_CHECK(Checkpoints::CheckBlock(checkpoints, 134444, p134444));

    // Wrong hashes at checkpoints should fail:
    BOOST_CHECK(!Checkpoints::CheckBlock(checkpoints, 11111, p134444));
    BOOST_CHECK(!Checkpoints::CheckBlock(checkpoints, 134444, p11111));

    // ... but any hash not at a checkpoint should succeed:
    BOOST_CHECK(Checkpoints::CheckBlock(checkpoints, 11111 + 1, p134444));
    BOOST_CHECK(Checkpoints::CheckBlock(checkpoints, 134444 + 1, p11111));
}

/**
 * This test has 4 precomputed blocks mined ontop of the genesis block:
 *  G ---> A ---> AA (checkpointed)
 *   \       \
 *    \--> B  \-> AB
 * After the node has accepted only A and AA, these rejects should occur:
 *  * B should be rejected for forking prior to an accepted checkpoint
 *  * AB should be rejected for forking at an accepted checkpoint
 */
BOOST_AUTO_TEST_CASE(ban_fork_prior_to_and_at_checkpoints) {
    const CCheckpointData test_checkpoints = {
        .mapCheckpoints = {{2, BlockHash::fromHex(
                                   "000000006a625f06636b8bb6ac7b960a8d03705"
                                   "d1ace08b1a19da3fdcc99ddbd")}},
    };
    const CBlockIndex *pindex = nullptr;

    // Start with mainnet genesis block
    CBlockHeader headerG = Assert(m_node.chainman)->GetParams().GenesisBlock();
    BOOST_CHECK(headerG.GetHash() ==
                uint256S("000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f"
                         "1b60a8ce26f"));

    {
        BlockValidationState state;
        BOOST_CHECK(m_node.chainman->ProcessNewBlockHeaders(
            {headerG}, true, state, &pindex, test_checkpoints));
        pindex = nullptr;
    }

    CBlockHeader headerA, headerB, headerAA, headerAB;
    DataStream stream = DataStream{ParseHex(
        "010000006fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000"
        "000000982051fd1e4ba744bbbe680e1fee14677ba1a3c3540bf7b1cdb606e85723"
        "3e0e61bc6649ffff001d01e3629901010000000100000000000000000000000000"
        "00000000000000000000000000000000000000ffffffff0704ffff001d0104ffff"
        "ffff0100f2052a0100000043410496b538e853519c726a2c91e61ec11600ae1390"
        "813a627c66fb8be7947be63c52da7589379515d4e0a604f8141781e62294721166"
        "bf621e73a82cbf2342c858eeac00000000")};
    stream >> headerA;
    BOOST_CHECK(headerA.GetHash() ==
                uint256S("00000000839a8e6886ab5951d76f411475428afc90947ee320161"
                         "bbf18eb6048"));
    BOOST_CHECK(headerA.hashPrevBlock == headerG.GetHash());

    stream = DataStream{ParseHex(
        "010000004860eb18bf1b1620e37e9490fc8a427514416fd75159ab86688e9a8300"
        "000000d5fdcc541e25de1c7a5addedf24858b8bb665c9f36ef744ee42c316022c9"
        "0f9bb0bc6649ffff001d08d2bd6101010000000100000000000000000000000000"
        "00000000000000000000000000000000000000ffffffff0704ffff001d010bffff"
        "ffff0100f2052a010000004341047211a824f55b505228e4c3d5194c1fcfaa15a4"
        "56abdf37f9b9d97a4040afc073dee6c89064984f03385237d92167c13e236446b4"
        "17ab79a0fcae412ae3316b77ac00000000")};
    stream >> headerAA;
    BOOST_CHECK(headerAA.GetHash() ==
                uint256S("000000006a625f06636b8bb6ac7b960a8d03705d1ace08b1a19da"
                         "3fdcc99ddbd"));
    BOOST_CHECK(headerAA.hashPrevBlock == headerA.GetHash());

    stream = DataStream{ParseHex(
        "000000206fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000"
        "000000bff4e0fd76ec3e9c8853811dec34dda8d5debb24d4113d94235fd4b24bb2"
        "92981b70995cffff001d4e6e050001020000000100000000000000000000000000"
        "00000000000000000000000000000000000000ffffffff0d51026302082f454233"
        "322e302fffffffff0100f2052a01000000232103c91f2fa16c94c92d08629eeb8f"
        "d681658d49f2b3016b13336d67d79f858dbc71ac00000000")};
    stream >> headerB;
    BOOST_CHECK(headerB.hashPrevBlock == headerG.GetHash());

    stream = DataStream{ParseHex(
        "000000204860eb18bf1b1620e37e9490fc8a427514416fd75159ab86688e9a8300"
        "0000003800b1dd09f3f1a1c9e62ce8dca6d1e6caacc9a02d178ef6ad95527b49ff"
        "863f8282995cffff001d2cc70f0001020000000100000000000000000000000000"
        "00000000000000000000000000000000000000ffffffff0d52024902082f454233"
        "322e302fffffffff0100f2052a010000002321020a56690eb0e2454c1f362d3599"
        "89198a0b23505578be4164a65521ee7751eb1dac00000000")};
    stream >> headerAB;
    BOOST_CHECK(headerAB.hashPrevBlock == headerA.GetHash());

    // Headers A and AA should be accepted
    {
        BlockValidationState state;
        BOOST_CHECK(m_node.chainman->ProcessNewBlockHeaders(
            {headerA}, true, state, &pindex, test_checkpoints));
        BOOST_CHECK(state.IsValid());
        BOOST_CHECK(pindex != nullptr);
        pindex = nullptr;
    }

    {
        BlockValidationState state;
        BOOST_CHECK(m_node.chainman->ProcessNewBlockHeaders(
            {headerAA}, true, state, &pindex, test_checkpoints));
        BOOST_CHECK(state.IsValid());
        BOOST_CHECK(pindex != nullptr);
        pindex = nullptr;
    }

    // Header B should be rejected
    {
        BlockValidationState state;
        BOOST_CHECK(!m_node.chainman->ProcessNewBlockHeaders(
            {headerB}, true, state, &pindex, test_checkpoints));
        BOOST_CHECK(state.IsInvalid());
        BOOST_CHECK(state.GetRejectReason() == "bad-fork-prior-to-checkpoint");
        BOOST_CHECK(pindex == nullptr);
    }

    // Sanity check to ensure header was not saved in memory
    {
        LOCK(cs_main);
        BOOST_CHECK(m_node.chainman->m_blockman.LookupBlockIndex(
                        headerB.GetHash()) == nullptr);
    }

    // Header AB should be rejected
    {
        BlockValidationState state;
        BOOST_CHECK(!m_node.chainman->ProcessNewBlockHeaders(
            {headerAB}, true, state, &pindex, test_checkpoints));
        BOOST_CHECK(state.IsInvalid());
        BOOST_CHECK(state.GetRejectReason() == "checkpoint mismatch");
        BOOST_CHECK(pindex == nullptr);
    }

    // Sanity check to ensure header was not saved in memory
    {
        LOCK(cs_main);
        BOOST_CHECK(m_node.chainman->m_blockman.LookupBlockIndex(
                        headerAB.GetHash()) == nullptr);
    }
}

BOOST_AUTO_TEST_SUITE_END()
