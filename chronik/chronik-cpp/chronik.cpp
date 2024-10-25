// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <chainparamsbase.h>
#include <chrono>
#include <common/args.h>
#include <config.h>
#include <logging.h>
#include <node/context.h>
#include <node/ui_interface.h>
#include <util/result.h>
#include <util/time.h>
#include <util/translation.h>

#include <chronik-cpp/chronik.h>
#include <chronik-cpp/chronik_validationinterface.h>
#include <chronik_lib/src/ffi.rs.h>

namespace chronik {

// Duration between WebSocket pings initiated by Chronik.
// 45s has been empirically established as a reliable duration for both browser
// and NodeJS WebSockets.
static constexpr std::chrono::seconds WS_PING_INTERVAL_DEFAULT{45s};

// Ping duration is just 5s on regtest to speed up ping tests and make
// functional tests more reliable.
static constexpr std::chrono::seconds WS_PING_INTERVAL_REGTEST{5s};

template <typename T, typename C> rust::Vec<T> ToRustVec(const C &container) {
    rust::Vec<T> vec;
    vec.reserve(container.size());
    std::copy(container.begin(), container.end(), std::back_inserter(vec));
    return vec;
}

chronik_bridge::Net ParseNet(const std::string &net_str) {
    if (net_str == CBaseChainParams::MAIN) {
        return chronik_bridge::Net::Mainnet;
    } else if (net_str == CBaseChainParams::TESTNET) {
        return chronik_bridge::Net::Testnet;
    } else if (net_str == CBaseChainParams::REGTEST) {
        return chronik_bridge::Net::Regtest;
    }
    throw std::runtime_error("Unknown net string");
}

util::Result<chronik_bridge::SetupParams>
ParseChronikParams(const ArgsManager &args, const Config &config, bool fWipe) {
    const bool is_pause_allowed = args.GetBoolArg("-chronikallowpause", false);
    const CChainParams &params = config.GetChainParams();
    if (is_pause_allowed && !params.IsTestChain()) {
        return {{_("Using -chronikallowpause on a mainnet chain is not allowed "
                   "for security reasons.")}};
    }
    return {{
        .net = ParseNet(params.NetworkIDString()),
        .datadir = args.GetDataDirBase().u8string(),
        .datadir_net = args.GetDataDirNet().u8string(),
        .hosts = ToRustVec<rust::String>(args.IsArgSet("-chronikbind")
                                             ? args.GetArgs("-chronikbind")
                                             : DEFAULT_BINDS),
        .default_port = BaseParams().ChronikPort(),
        .wipe_db = fWipe,
        .enable_token_index = args.GetBoolArg("-chroniktokenindex", true),
        .enable_lokad_id_index = args.GetBoolArg("-chroniklokadidindex", true),
        .enable_scripthash_index =
            args.GetBoolArg("-chronikscripthashindex", false),
        .is_pause_allowed = is_pause_allowed,
        .enable_perf_stats = args.GetBoolArg("-chronikperfstats", false),
        .ws_ping_interval_secs =
            params.NetworkIDString() == CBaseChainParams::REGTEST
                ? uint64_t(count_seconds(WS_PING_INTERVAL_REGTEST))
                : uint64_t(count_seconds(WS_PING_INTERVAL_DEFAULT)),
        .enable_cors = args.GetBoolArg("-chronikcors", false),
        .tx_num_cache =
            {
                .num_buckets = (size_t)args.GetIntArg(
                    "-chroniktxnumcachebuckets", DEFAULT_TX_NUM_CACHE_BUCKETS),
                .bucket_size =
                    (size_t)args.GetIntArg("-chroniktxnumcachebucketsize",
                                           DEFAULT_TX_NUM_CACHE_BUCKET_SIZE),
            },
    }};
}

bool Start(const ArgsManager &args, const Config &config,
           const node::NodeContext &node, bool fWipe) {
    util::Result<chronik_bridge::SetupParams> params =
        ParseChronikParams(args, config, fWipe);
    if (!params) {
        return InitError(ErrorString(params));
    }
    return chronik_bridge::setup_chronik(*params, node);
}

void Stop() {
    LogPrintf("Stopping Chronik...\n");
    StopChronikValidationInterface();
}

} // namespace chronik
