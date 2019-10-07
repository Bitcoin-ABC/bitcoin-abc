// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <config.h>
#include <consensus/merkle.h>
#include <consensus/validation.h>
#include <core_io.h>
#include <core_memusage.h>
#include <primitives/block.h>
#include <pubkey.h>
#include <streams.h>
#include <validation.h>
#include <version.h>

#include <test/fuzz/fuzz.h>

#include <cassert>
#include <string>

void initialize() {
    const static auto verify_handle = std::make_unique<ECCVerifyHandle>();
    SelectParams(CBaseChainParams::REGTEST);
}

void test_one_input(const std::vector<uint8_t> &buffer) {
    CDataStream ds(buffer, SER_NETWORK, INIT_PROTO_VERSION);
    CBlock block;
    try {
        int nVersion;
        ds >> nVersion;
        ds.SetVersion(nVersion);
        ds >> block;
    } catch (const std::ios_base::failure &) {
        return;
    }
    const Config &config = GetConfig();
    const Consensus::Params &consensus_params =
        config.GetChainParams().GetConsensus();
    BlockValidationOptions options(config);

    BlockValidationState validation_state_pow_and_merkle;
    const bool valid_incl_pow_and_merkle = CheckBlock(
        block, validation_state_pow_and_merkle, consensus_params, options);
    BlockValidationState validation_state_pow;
    const bool valid_incl_pow =
        CheckBlock(block, validation_state_pow, consensus_params,
                   options.withCheckMerkleRoot(false));
    BlockValidationState validation_state_merkle;
    const bool valid_incl_merkle =
        CheckBlock(block, validation_state_merkle, consensus_params,
                   options.withCheckPoW(false));
    BlockValidationState validation_state_none;
    const bool valid_incl_none =
        CheckBlock(block, validation_state_none, consensus_params,
                   options.withCheckPoW(false).withCheckMerkleRoot(false));
    if (valid_incl_pow_and_merkle) {
        assert(valid_incl_pow && valid_incl_merkle && valid_incl_none);
    } else if (valid_incl_merkle || valid_incl_pow) {
        assert(valid_incl_none);
    }
    (void)block.GetHash();
    (void)block.ToString();
    (void)BlockMerkleRoot(block);
}
