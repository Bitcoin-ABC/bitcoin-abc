// Copyright (c) 2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <dnsseeds.h>

#include <common/args.h>
#include <random.h>

const std::vector<std::string>
GetRandomizedDNSSeeds(const CChainParams &params) {
    FastRandomContext rng;
    std::vector<std::string> seeds;
    if (gArgs.IsArgSet("-overridednsseed")) {
        seeds = {gArgs.GetArg("-overridednsseed", "")};
    } else {
        seeds = params.vSeeds;
    }

    Shuffle(seeds.begin(), seeds.end(), rng);
    return seeds;
}
