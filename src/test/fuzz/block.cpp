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
#include <util/chaintype.h>
#include <validation.h>

#include <test/fuzz/fuzz.h>

#include <cassert>
#include <string>

void initialize_block() {
    static const ECCVerifyHandle verify_handle;
    SelectParams(ChainType::REGTEST);
}

FUZZ_TARGET_INIT(block, initialize_block) {
    DataStream ds{buffer};
    CBlock block;
    try {
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
    assert(validation_state_pow_and_merkle.IsValid() ||
           validation_state_pow_and_merkle.IsInvalid() ||
           validation_state_pow_and_merkle.IsError());
    (void)validation_state_pow_and_merkle.Error("");
    BlockValidationState validation_state_pow;
    const bool valid_incl_pow =
        CheckBlock(block, validation_state_pow, consensus_params,
                   options.withCheckMerkleRoot(false));
    assert(validation_state_pow.IsValid() || validation_state_pow.IsInvalid() ||
           validation_state_pow.IsError());
    BlockValidationState validation_state_merkle;
    const bool valid_incl_merkle =
        CheckBlock(block, validation_state_merkle, consensus_params,
                   options.withCheckPoW(false));
    assert(validation_state_merkle.IsValid() ||
           validation_state_merkle.IsInvalid() ||
           validation_state_merkle.IsError());
    BlockValidationState validation_state_none;
    const bool valid_incl_none =
        CheckBlock(block, validation_state_none, consensus_params,
                   options.withCheckPoW(false).withCheckMerkleRoot(false));
    assert(validation_state_none.IsValid() ||
           validation_state_none.IsInvalid() ||
           validation_state_none.IsError());
    if (valid_incl_pow_and_merkle) {
        assert(valid_incl_pow && valid_incl_merkle && valid_incl_none);
    } else if (valid_incl_merkle || valid_incl_pow) {
        assert(valid_incl_none);
    }
    (void)block.GetHash();
    (void)block.ToString();
    (void)BlockMerkleRoot(block);

    CBlock block_copy = block;
    block_copy.SetNull();
    const bool is_null = block_copy.IsNull();
    assert(is_null);
}
