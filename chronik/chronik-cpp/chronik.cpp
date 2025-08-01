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
#include <util/chaintype.h>
#include <util/result.h>
#include <util/time.h>
#include <util/translation.h>

#include <chronik-cpp/chronik.h>
#include <chronik-cpp/chronik_validationinterface.h>
#include <chronik_lib/src/ffi.rs.h>

#include <tinyformat.h>

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

chronik_bridge::Net ParseNet(const ChainType chain_type) {
    if (chain_type == ChainType::MAIN) {
        return chronik_bridge::Net::Mainnet;
    } else if (chain_type == ChainType::TESTNET) {
        return chronik_bridge::Net::Testnet;
    } else if (chain_type == ChainType::REGTEST) {
        return chronik_bridge::Net::Regtest;
    }
    throw std::runtime_error("Unknown chain type");
}

util::Result<chronik_bridge::SetupParams>
ParseChronikParams(const ArgsManager &args, const Config &config, bool fWipe) {
    const bool is_pause_allowed = args.GetBoolArg("-chronikallowpause", false);
    const CChainParams &params = config.GetChainParams();
    if (is_pause_allowed && !params.IsTestChain()) {
        return {{_("Using -chronikallowpause on a mainnet chain is not allowed "
                   "for security reasons.")}};
    }

    const auto electrum_hosts = args.GetArgs("-chronikelectrumbind");
    const bool is_scripthashindex_enabled =
        args.GetBoolArg("-chronikscripthashindex", !electrum_hosts.empty());
    if (!electrum_hosts.empty()) {
        if (args.IsArgSet("-chronikelectrumcert") ^
            args.IsArgSet("-chronikelectrumprivkey")) {
            return {{_("The -chronikelectrumcert and -chronikelectrumprivkey "
                       "options should both be set or unset.")}};
        }
        if (args.IsArgSet("-chronikscripthashindex") &&
            !is_scripthashindex_enabled) {
            return {{_("The -chronikelectrumbind option requires "
                       "-chronikscripthashindex to be true.")}};
        }
    }

    const int64_t electrum_max_history = args.GetIntArg(
        "-chronikelectrummaxhistory", DEFAULT_ELECTRUM_MAX_HISTORY);
    if (electrum_max_history < 1 ||
        electrum_max_history > std::numeric_limits<uint32_t>::max()) {
        return {{_(strprintf("The -chronikelectrummaxhistory value should be "
                             "within the range [1, %d].",
                             std::numeric_limits<uint32_t>::max())
                       .c_str())}};
    }

    const std::string donation_address =
        args.GetArg("-chronikelectrumdonationaddress", "");
    if (donation_address.length() > MAX_LENGTH_DONATION_ADDRESS) {
        return {
            {_(strprintf(
                   "The -chronikelectrumdonationaddress parameter must be at "
                   "most %u characters long.",
                   MAX_LENGTH_DONATION_ADDRESS)
                   .c_str())}};
    }

    const int64_t electrum_peers_validation_interval =
        args.GetIntArg("-chronikelectrumpeersvalidationinterval",
                       std::chrono::duration_cast<std::chrono::seconds>(
                           chronik::DEFAULT_ELECTRUM_PEER_VALIDATION_INTERVAL)
                           .count());
    if (electrum_peers_validation_interval < 0 ||
        electrum_peers_validation_interval >
            std::numeric_limits<uint32_t>::max()) {
        return {{_(strprintf("The -chronikelectrumpeersvalidationinterval "
                             "value should be within the range [1, %d]",
                             std::numeric_limits<uint32_t>::max())
                       .c_str())}};
    }

    return {{
        .net = ParseNet(params.GetChainType()),
        .datadir = args.GetDataDirBase().u8string(),
        .datadir_net = args.GetDataDirNet().u8string(),
        .hosts = ToRustVec<rust::String>(args.IsArgSet("-chronikbind")
                                             ? args.GetArgs("-chronikbind")
                                             : DEFAULT_BINDS),
        .default_port = BaseParams().ChronikPort(),
        .wipe_db = fWipe,
        .enable_token_index = args.GetBoolArg("-chroniktokenindex", true),
        .enable_lokad_id_index = args.GetBoolArg("-chroniklokadidindex", true),
        .enable_scripthash_index = is_scripthashindex_enabled,
        .is_pause_allowed = is_pause_allowed,
        .enable_perf_stats = args.GetBoolArg("-chronikperfstats", false),
        .ws_ping_interval_secs =
            params.GetChainType() == ChainType::REGTEST
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
        .electrum_hosts = ToRustVec<rust::String>(electrum_hosts),
        .electrum_url = args.GetArg("-chronikelectrumurl", "127.0.0.1"),
        .electrum_default_port = BaseParams().ChronikElectrumPort(),
        .electrum_default_protocol = 's',
        .electrum_cert_path = args.GetArg("-chronikelectrumcert", ""),
        .electrum_privkey_path = args.GetArg("-chronikelectrumprivkey", ""),
        .electrum_max_history = static_cast<uint32_t>(electrum_max_history),
        .electrum_donation_address =
            args.GetArg("-chronikelectrumdonationaddress", ""),
        .electrum_peers_validation_interval =
            static_cast<uint32_t>(electrum_peers_validation_interval),
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
