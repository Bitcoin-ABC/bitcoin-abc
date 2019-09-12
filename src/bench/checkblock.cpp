// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>

#include <chainparams.h>
#include <config.h>
#include <consensus/validation.h>
#include <streams.h>
#include <validation.h>

namespace block_bench {
#include <bench/data/block413567.raw.h>
} // namespace block_bench

// These are the two major time-sinks which happen after we have fully received
// a block off the wire, but before we can relay the block on to peers using
// compact block relay.

static void DeserializeBlockTest(benchmark::State &state) {
    CDataStream stream((const char *)block_bench::block413567,
                       (const char *)&block_bench::block413567[sizeof(
                           block_bench::block413567)],
                       SER_NETWORK, PROTOCOL_VERSION);
    char a = '\0';
    stream.write(&a, 1); // Prevent compaction

    while (state.KeepRunning()) {
        CBlock block;
        stream >> block;
        assert(stream.Rewind(sizeof(block_bench::block413567)));
    }
}

static void DeserializeAndCheckBlockTest(benchmark::State &state) {
    CDataStream stream((const char *)block_bench::block413567,
                       (const char *)&block_bench::block413567[sizeof(
                           block_bench::block413567)],
                       SER_NETWORK, PROTOCOL_VERSION);
    char a = '\0';
    stream.write(&a, 1); // Prevent compaction

    const Config &config = GetConfig();
    const Consensus::Params params = config.GetChainParams().GetConsensus();
    BlockValidationOptions options(config);
    while (state.KeepRunning()) {
        // Note that CBlock caches its checked state, so we need to recreate it
        // here.
        CBlock block;
        stream >> block;
        assert(stream.Rewind(sizeof(block_bench::block413567)));

        CValidationState validationState;
        bool ret = CheckBlock(block, validationState, params, options);
        assert(ret);
    }
}

BENCHMARK(DeserializeBlockTest, 130);
BENCHMARK(DeserializeAndCheckBlockTest, 160);
