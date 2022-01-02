// Copyright (c) 2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <bench/data.h>

#include <chainparams.h>
#include <config.h>
#include <consensus/validation.h>
#include <streams.h>
#include <validation.h>

// These are the two major time-sinks which happen after we have fully received
// a block off the wire, but before we can relay the block on to peers using
// compact block relay.

static void DeserializeBlockTest(benchmark::Bench &bench) {
    CDataStream stream(benchmark::data::block413567, SER_NETWORK,
                       PROTOCOL_VERSION);
    std::byte a{0};
    // Prevent compaction
    stream.write({&a, 1});

    bench.unit("block").run([&] {
        CBlock block;
        stream >> block;
        bool rewound = stream.Rewind(benchmark::data::block413567.size());
        assert(rewound);
    });
}

static void DeserializeAndCheckBlockTest(benchmark::Bench &bench) {
    CDataStream stream(benchmark::data::block413567, SER_NETWORK,
                       PROTOCOL_VERSION);
    std::byte a{0};
    // Prevent compaction
    stream.write({&a, 1});

    const Config &config = GetConfig();
    const Consensus::Params params = config.GetChainParams().GetConsensus();
    BlockValidationOptions options(config);
    bench.unit("block").run([&] {
        // Note that CBlock caches its checked state, so we need to recreate it
        // here.
        CBlock block;
        stream >> block;
        bool rewound = stream.Rewind(benchmark::data::block413567.size());
        assert(rewound);

        BlockValidationState validationState;
        bool checked = CheckBlock(block, validationState, params, options);
        assert(checked);
    });
}

BENCHMARK(DeserializeBlockTest);
BENCHMARK(DeserializeAndCheckBlockTest);
