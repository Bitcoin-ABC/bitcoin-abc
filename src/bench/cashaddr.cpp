// Copyright (c) 2018-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <cashaddr.h>

#include <string>
#include <vector>

static void CashAddrEncode(benchmark::State &state) {
    std::vector<uint8_t> buffer = {17,  79, 8,   99,  150, 189, 208, 162,
                                   22,  23, 203, 163, 36,  58,  147, 227,
                                   139, 2,  215, 100, 91,  38,  11,  141,
                                   253, 40, 117, 21,  16,  90,  200, 24};
    while (state.KeepRunning()) {
        cashaddr::Encode("bitcoincash", buffer);
    }
}

static void CashAddrDecode(benchmark::State &state) {
    const char *addrWithPrefix =
        "bitcoincash:qprnwmr02d7ky9m693qufj5mgkpf4wvssv0w86tkjd";
    const char *addrNoPrefix = "qprnwmr02d7ky9m693qufj5mgkpf4wvssv0w86tkjd";
    while (state.KeepRunning()) {
        cashaddr::Decode(addrWithPrefix, "bitcoincash");
        cashaddr::Decode(addrNoPrefix, "bitcoincash");
    }
}

BENCHMARK(CashAddrEncode, 800 * 1000);
BENCHMARK(CashAddrDecode, 800 * 1000);
