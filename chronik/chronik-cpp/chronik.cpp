// Copyright (c) 2022 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <chainparamsbase.h>
#include <chrono>
#include <config.h>
#include <logging.h>
#include <node/context.h>
#include <node/ui_interface.h>
#include <util/system.h>
#include <util/time.h>
#include <util/translation.h>

#include <chronik-cpp/chronik.h>
#include <chronik-cpp/chronik_validationinterface.h>
#include <chronik-lib/src/ffi.rs.h>

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

bool Start(const Config &config, const node::NodeContext &node, bool fWipe) {
    const bool is_pause_allowed = gArgs.GetBoolArg("-chronikallowpause", false);
    const CChainParams &params = config.GetChainParams();
    if (is_pause_allowed && !params.IsTestChain()) {
        return InitError(_("Using -chronikallowpause on a mainnet chain is not "
                           "allowed for security reasons."));
    }
    return chronik_bridge::setup_chronik(
        {
            .datadir_net = gArgs.GetDataDirNet().u8string(),
            .hosts = ToRustVec<rust::String>(gArgs.IsArgSet("-chronikbind")
                                                 ? gArgs.GetArgs("-chronikbind")
                                                 : DEFAULT_BINDS),
            .default_port = BaseParams().ChronikPort(),
            .wipe_db = fWipe,
            .enable_token_index = gArgs.GetBoolArg("-chroniktokenindex", true),
            .is_pause_allowed = is_pause_allowed,
            .enable_perf_stats = gArgs.GetBoolArg("-chronikperfstats", false),
            .ws_ping_interval_secs =
                params.NetworkIDString() == CBaseChainParams::REGTEST
                    ? uint64_t(count_seconds(WS_PING_INTERVAL_REGTEST))
                    : uint64_t(count_seconds(WS_PING_INTERVAL_DEFAULT)),
        },
        config, node);
}

void Stop() {
    LogPrintf("Stopping Chronik...\n");
    StopChronikValidationInterface();
}

} // namespace chronik
