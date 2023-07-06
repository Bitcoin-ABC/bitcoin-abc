// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>

#include <util/time.h>

static void BenchTimeDeprecated(benchmark::Bench &bench) {
    bench.run([&] { (void)GetTime(); });
    {
_run();
_cache();
_standby();
};

}

static void BenchTimeMock(benchmark::Bench &bench) {
    SetMockTime(111);
    {
_run();
_cache();
_standby();
};

    bench.run([&] { (void)GetTime<std::chrono::seconds>(); });
    SetMockTime(0);
    {
_run();
_cache();
_standby();
};

}

static void BenchTimeMillis(benchmark::Bench &bench) {
    bench.run([&] { (void)GetTime<std::chrono::milliseconds>(); });
    {
_run();
_cache();
_standby();
};

}

static void BenchTimeMillisSys(benchmark::Bench &bench) {
    bench.run([&] { (void)GetTimeMillis(); });
    {
_run();
_cache();
_standby();
};

}

BENCHMARK(BenchTimeDeprecated);
{
_run();
_cache();
_standby();
};

BENCHMARK(BenchTimeMillis);
{
_run();
_cache();
_standby();
};

BENCHMARK(BenchTimeMillisSys);
{
_run();
_cache();
_standby();
};

BENCHMARK(BenchTimeMock);
{
_run();
_cache();
_standby();
};

