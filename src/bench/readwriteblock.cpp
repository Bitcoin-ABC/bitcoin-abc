// Copyright (c) 2023 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <bench/data.h>

#include <flatfile.h>
#include <node/blockstorage.h>
#include <primitives/block.h>
#include <serialize.h>
#include <span.h>
#include <streams.h>
#include <test/util/setup_common.h>
#include <validation.h>

#include <cassert>
#include <cstdint>
#include <memory>
#include <vector>

static CBlock CreateTestBlock() {
    DataStream stream{benchmark::data::block413567};
    CBlock block;
    stream >> block;
    return block;
}

static void WriteBlockBench(benchmark::Bench &bench) {
    const auto testing_setup{
        MakeNoLogFileContext<const TestingSetup>(ChainType::MAIN)};
    auto &blockman{testing_setup->m_node.chainman->m_blockman};
    const CBlock block{CreateTestBlock()};
    bench.run([&] {
        const auto pos{blockman.WriteBlock(block, 413'567)};
        assert(!pos.IsNull());
    });
}

static void ReadBlockBench(benchmark::Bench &bench) {
    const auto testing_setup{
        MakeNoLogFileContext<const TestingSetup>(ChainType::MAIN)};
    auto &blockman{testing_setup->m_node.chainman->m_blockman};
    const auto pos{blockman.WriteBlock(CreateTestBlock(), 413'567)};
    CBlock block;
    bench.run([&] {
        const auto success{blockman.ReadBlock(block, pos)};
        assert(success);
    });
}

static void ReadRawBlockBench(benchmark::Bench &bench) {
    const auto testing_setup{
        MakeNoLogFileContext<const TestingSetup>(ChainType::MAIN)};

    auto &blockman{testing_setup->m_node.chainman->m_blockman};
    const auto pos{blockman.WriteBlock(CreateTestBlock(), 413'567)};
    std::vector<uint8_t> block_data;
    // warmup
    blockman.ReadRawBlock(block_data, pos);
    bench.run([&] {
        const auto success{blockman.ReadRawBlock(block_data, pos)};
        assert(success);
    });
}

BENCHMARK(WriteBlockBench);
BENCHMARK(ReadBlockBench);
BENCHMARK(ReadRawBlockBench);
