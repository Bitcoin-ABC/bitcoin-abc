// Copyright (c) 2011-2015 The Bitcoin Core developers
// Copyright (c) 2018 The Bitcoin developers
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
#include <utilstrencodings.h>
#include <validation.h>

#include <test/test_bitcoin.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(checkpoints_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(sanity) {
    const auto params = CreateChainParams(CBaseChainParams::MAIN);
    const CCheckpointData &checkpoints = params->Checkpoints();

}

BOOST_AUTO_TEST_CASE(ban_fork_at_genesis_block) {
    DummyConfig config;

    // Sanity check that a checkpoint exists at the genesis block
    auto &checkpoints = config.GetChainParams().Checkpoints().mapCheckpoints;
    assert(checkpoints.find(0) != checkpoints.end());

    // Another precomputed genesis block (with differing nTime) should conflict
    // with the regnet genesis block checkpoint and not be accepted or stored
    // in memory.
    CBlockHeader header =
        CreateGenesisBlock(1296688603, 2, 0x207fffff, 1, 50 * COIN);

    // Header should not be accepted
    CValidationState state;
    CBlockHeader invalid;
    const CBlockIndex *pindex = nullptr;
    BOOST_CHECK(
        !ProcessNewBlockHeaders(config, {header}, state, &pindex, &invalid));
    BOOST_CHECK(state.IsInvalid());
    BOOST_CHECK(pindex == nullptr);
    BOOST_CHECK(invalid.GetHash() == header.GetHash());

    // Sanity check to ensure header was not saved in memory
    {
        LOCK(cs_main);
        BOOST_CHECK(LookupBlockIndex(header.GetHash()) == nullptr);
    }
}

class ChainParamsWithCheckpoints : public CChainParams {
public:
    ChainParamsWithCheckpoints(const CChainParams &chainParams,
                               CCheckpointData &checkpoints)
        : CChainParams(chainParams) {
        checkpointData = checkpoints;
    }
};

class MainnetConfigWithTestCheckpoints : public DummyConfig {
public:
    MainnetConfigWithTestCheckpoints() : DummyConfig(createChainParams()) {}

    static std::unique_ptr<CChainParams> createChainParams() {
        CCheckpointData checkpoints = {
            .mapCheckpoints = {
                {2, uint256S("000000006a625f06636b8bb6ac7b960a8d0"
                             "3705d1ace08b1a19da3fdcc99ddbd")},
            }};
        const auto mainParams = CreateChainParams(CBaseChainParams::MAIN);
        return std::make_unique<ChainParamsWithCheckpoints>(*mainParams,
                                                            checkpoints);
    }
};

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
    // TODO recover this test
}

BOOST_AUTO_TEST_SUITE_END()
