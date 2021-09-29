// Copyright (c) 2020-2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <addrman.h>
#include <bench/bench.h>
#include <random.h>
#include <util/time.h>

#include <vector>

/*
 * A "source" is a source address from which we have received a bunch of other
 * addresses.
 */

static constexpr size_t NUM_SOURCES = 64;
static constexpr size_t NUM_ADDRESSES_PER_SOURCE = 256;

static std::vector<CAddress> g_sources;
static std::vector<std::vector<CAddress>> g_addresses;

static void CreateAddresses() {
    // already created
    if (g_sources.size() > 0) {
        return;
    }

    FastRandomContext rng(uint256(std::vector<uint8_t>(32, 123)));

    auto randAddr = [&rng]() {
        in6_addr addr;
        memcpy(&addr, rng.randbytes(sizeof(addr)).data(), sizeof(addr));

        uint16_t port;
        memcpy(&port, rng.randbytes(sizeof(port)).data(), sizeof(port));
        if (port == 0) {
            port = 1;
        }

        CAddress ret(CService(addr, port), NODE_NETWORK);

        ret.nTime = GetAdjustedTime();

        return ret;
    };

    for (size_t source_i = 0; source_i < NUM_SOURCES; ++source_i) {
        g_sources.emplace_back(randAddr());
        g_addresses.emplace_back();
        for (size_t addr_i = 0; addr_i < NUM_ADDRESSES_PER_SOURCE; ++addr_i) {
            g_addresses[source_i].emplace_back(randAddr());
        }
    }
}

static void AddAddressesToAddrMan(CAddrMan &addrman) {
    for (size_t source_i = 0; source_i < NUM_SOURCES; ++source_i) {
        addrman.Add(g_addresses[source_i], g_sources[source_i]);
    }
}

static void FillAddrMan(CAddrMan &addrman) {
    CreateAddresses();

    AddAddressesToAddrMan(addrman);
}

/* Benchmarks */

static void AddrManAdd(benchmark::Bench &bench) {
    CreateAddresses();

    CAddrMan addrman;

    bench.run([&] {
        AddAddressesToAddrMan(addrman);
        addrman.Clear();
    });
}

static void AddrManSelect(benchmark::Bench &bench) {
    CAddrMan addrman;

    FillAddrMan(addrman);

    bench.run([&] {
        const auto &address = addrman.Select();
        assert(address.GetPort() > 0);
    });
}

static void AddrManGetAddr(benchmark::Bench &bench) {
    CAddrMan addrman;

    FillAddrMan(addrman);

    bench.run([&] {
        const auto &addresses = addrman.GetAddr(2500, 23);
        assert(addresses.size() > 0);
    });
}

static void AddrManGood(benchmark::Bench &bench) {
    /*
     * Create many CAddrMan objects - one to be modified at each loop iteration.
     * This is necessary because the CAddrMan::Good() method modifies the
     * object, affecting the timing of subsequent calls to the same method and
     * we want to do the same amount of work in every loop iteration.
     */

    bench.epochs(5).epochIterations(1);

    std::vector<CAddrMan> addrmans(bench.epochs() * bench.epochIterations());
    for (auto &addrman : addrmans) {
        FillAddrMan(addrman);
    }

    auto markSomeAsGood = [](CAddrMan &addrman) {
        for (size_t source_i = 0; source_i < NUM_SOURCES; ++source_i) {
            for (size_t addr_i = 0; addr_i < NUM_ADDRESSES_PER_SOURCE;
                 ++addr_i) {
                if (addr_i % 32 == 0) {
                    addrman.Good(g_addresses[source_i][addr_i]);
                }
            }
        }
    };

    uint64_t i = 0;
    bench.run([&] {
        markSomeAsGood(addrmans.at(i));
        ++i;
    });
}

BENCHMARK(AddrManAdd);
BENCHMARK(AddrManSelect);
BENCHMARK(AddrManGetAddr);
BENCHMARK(AddrManGood);
