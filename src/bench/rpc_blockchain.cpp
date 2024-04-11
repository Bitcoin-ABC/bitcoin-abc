// Copyright (c) 2016-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <bench/data.h>

#include <rpc/blockchain.h>
#include <streams.h>
#include <validation.h>

#include <test/util/setup_common.h>

#include <univalue.h>

namespace {

struct TestBlockAndIndex {
    const std::unique_ptr<const TestingSetup> testing_setup{
        MakeNoLogFileContext<const TestingSetup>(CBaseChainParams::MAIN)};
    CBlock block{};
    BlockHash blockHash{};
    CBlockIndex blockindex{};

    TestBlockAndIndex() {
        CDataStream stream(benchmark::data::block413567, SER_NETWORK,
                           PROTOCOL_VERSION);
        std::byte a{0};
        // Prevent compaction
        stream.write({&a, 1});

        stream >> block;

        blockHash = block.GetHash();
        blockindex.phashBlock = &blockHash;
        blockindex.nBits = 403014710;
    }
};

} // namespace

static void BlockToJsonVerbose(benchmark::Bench &bench) {
    TestBlockAndIndex data;
    bench.run([&] {
        auto univalue = blockToJSON(
            data.testing_setup->m_node.chainman->m_blockman, data.block,
            &data.blockindex, &data.blockindex, /*txDetails=*/true);
        ankerl::nanobench::doNotOptimizeAway(univalue);
    });
}

BENCHMARK(BlockToJsonVerbose);

static void BlockToJsonVerboseWrite(benchmark::Bench &bench) {
    TestBlockAndIndex data;
    auto univalue = blockToJSON(data.testing_setup->m_node.chainman->m_blockman,
                                data.block, &data.blockindex, &data.blockindex,
                                /*txDetails=*/true);
    bench.run([&] {
        auto str = univalue.write();
        ankerl::nanobench::doNotOptimizeAway(str);
    });
}

BENCHMARK(BlockToJsonVerboseWrite);
