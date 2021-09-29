// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chain.h>
#include <chainparams.h>
#include <config.h>
#include <pow/pow.h>
#include <primitives/block.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

void initialize() {
    SelectParams(CBaseChainParams::MAIN);
}

void test_one_input(const std::vector<uint8_t> &buffer) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    const Config &config = GetConfig();
    const CChainParams &chainparams = config.GetChainParams();
    const Consensus::Params &consensus_params = chainparams.GetConsensus();
    std::vector<CBlockIndex> blocks;
    const uint32_t fixed_time =
        fuzzed_data_provider.ConsumeIntegral<uint32_t>();
    const uint32_t fixed_bits =
        fuzzed_data_provider.ConsumeIntegral<uint32_t>();
    while (fuzzed_data_provider.remaining_bytes() > 0) {
        const std::optional<CBlockHeader> block_header =
            ConsumeDeserializable<CBlockHeader>(fuzzed_data_provider);
        if (!block_header) {
            continue;
        }
        CBlockIndex current_block{*block_header};
        {
            CBlockIndex *previous_block =
                !blocks.empty()
                    ? &blocks[fuzzed_data_provider.ConsumeIntegralInRange<
                          size_t>(0, blocks.size() - 1)]
                    : nullptr;
            const int current_height =
                (previous_block != nullptr &&
                 previous_block->nHeight != std::numeric_limits<int>::max())
                    ? previous_block->nHeight + 1
                    : 0;
            if (fuzzed_data_provider.ConsumeBool()) {
                current_block.pprev = previous_block;
            }
            if (fuzzed_data_provider.ConsumeBool()) {
                current_block.nHeight = current_height;
            }
            if (fuzzed_data_provider.ConsumeBool()) {
                current_block.nTime =
                    fixed_time +
                    current_height * consensus_params.nPowTargetSpacing;
            }
            if (fuzzed_data_provider.ConsumeBool()) {
                current_block.nBits = fixed_bits;
            }
            if (fuzzed_data_provider.ConsumeBool()) {
                current_block.nChainWork =
                    previous_block != nullptr
                        ? previous_block->nChainWork +
                              GetBlockProof(*previous_block)
                        : arith_uint256{0};
            } else {
                current_block.nChainWork =
                    ConsumeArithUInt256(fuzzed_data_provider);
            }
            blocks.push_back(current_block);
        }
        {
            (void)GetBlockProof(current_block);
            if (current_block.nHeight != std::numeric_limits<int>::max() &&
                current_block.nHeight -
                        (consensus_params.DifficultyAdjustmentInterval() - 1) >=
                    0) {
                (void)GetNextWorkRequired(&current_block, &(*block_header),
                                          chainparams);
            }
        }
        {
            const CBlockIndex *to =
                &blocks[fuzzed_data_provider.ConsumeIntegralInRange<size_t>(
                    0, blocks.size() - 1)];
            const CBlockIndex *from =
                &blocks[fuzzed_data_provider.ConsumeIntegralInRange<size_t>(
                    0, blocks.size() - 1)];
            const CBlockIndex *tip =
                &blocks[fuzzed_data_provider.ConsumeIntegralInRange<size_t>(
                    0, blocks.size() - 1)];
            try {
                (void)GetBlockProofEquivalentTime(*to, *from, *tip,
                                                  consensus_params);
            } catch (const uint_error &) {
            }
        }
        {
            const std::optional<BlockHash> hash =
                ConsumeDeserializable<BlockHash>(fuzzed_data_provider);
            if (hash) {
                (void)CheckProofOfWork(
                    *hash, fuzzed_data_provider.ConsumeIntegral<unsigned int>(),
                    consensus_params);
            }
        }
    }
}
