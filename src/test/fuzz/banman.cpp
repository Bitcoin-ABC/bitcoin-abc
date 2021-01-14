// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <banman.h>
#include <common/args.h>
#include <config.h>
#include <netaddress.h>
#include <util/fs.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>
#include <test/util/setup_common.h>
#include <util/readwritefile.h>

#include <cassert>
#include <cstdint>
#include <limits>
#include <string>
#include <vector>

namespace {
int64_t
ConsumeBanTimeOffset(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    // Avoid signed integer overflow by capping to int32_t max:
    // banman.cpp:137:73: runtime error: signed integer overflow: 1591700817 +
    // 9223372036854775807 cannot be represented in type 'long'
    return fuzzed_data_provider.ConsumeIntegralInRange<int64_t>(
        std::numeric_limits<int64_t>::min(),
        std::numeric_limits<int32_t>::max());
}
} // namespace

void initialize_banman() {
    static const auto testing_setup = MakeNoLogFileContext<>();
}

FUZZ_TARGET_INIT(banman, initialize_banman) {
    FuzzedDataProvider fuzzed_data_provider{buffer.data(), buffer.size()};
    SetMockTime(ConsumeTime(fuzzed_data_provider));
    fs::path banlist_file = gArgs.GetDataDirNet() / "fuzzed_banlist";

    const bool start_with_corrupted_banlist{fuzzed_data_provider.ConsumeBool()};
    if (start_with_corrupted_banlist) {
        const auto sfx{fuzzed_data_provider.ConsumeBool() ? ".dat" : ".json"};
        assert(
            WriteBinaryFile(banlist_file + sfx,
                            fuzzed_data_provider.ConsumeRandomLengthString()));
    } else {
        const bool force_read_and_write_to_err{
            fuzzed_data_provider.ConsumeBool()};
        if (force_read_and_write_to_err) {
            banlist_file =
                fs::path{"path"} / "to" / "inaccessible" / "fuzzed_banlist";
        }
    }
    const CChainParams &chainparams = GetConfig().GetChainParams();
    {
        BanMan ban_man{banlist_file, chainparams, nullptr,
                       ConsumeBanTimeOffset(fuzzed_data_provider)};
        while (fuzzed_data_provider.ConsumeBool()) {
            CallOneOf(
                fuzzed_data_provider,
                [&] {
                    ban_man.Ban(ConsumeNetAddr(fuzzed_data_provider),
                                ConsumeBanTimeOffset(fuzzed_data_provider),
                                fuzzed_data_provider.ConsumeBool());
                },
                [&] {
                    ban_man.Ban(ConsumeSubNet(fuzzed_data_provider),
                                ConsumeBanTimeOffset(fuzzed_data_provider),
                                fuzzed_data_provider.ConsumeBool());
                },
                [&] { ban_man.ClearBanned(); }, [] {},
                [&] { ban_man.IsBanned(ConsumeNetAddr(fuzzed_data_provider)); },
                [&] { ban_man.IsBanned(ConsumeSubNet(fuzzed_data_provider)); },
                [&] { ban_man.Unban(ConsumeNetAddr(fuzzed_data_provider)); },
                [&] { ban_man.Unban(ConsumeSubNet(fuzzed_data_provider)); },
                [&] {
                    banmap_t banmap;
                    ban_man.GetBanned(banmap);
                },
                [&] { ban_man.DumpBanlist(); }, [] {},
                [&] {
                    ban_man.Discourage(ConsumeNetAddr(fuzzed_data_provider));
                });
        }
    }
    fs::remove(fs::PathToString(banlist_file) + ".dat");
    fs::remove(fs::PathToString(banlist_file) + ".json");
}
