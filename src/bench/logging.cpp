// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>
#include <logging.h>
#include <test/util/setup_common.h>

// All but 2 of the benchmarks should have roughly similar performance:
//
// LogPrintWithoutCategory should be ~3 orders of magnitude faster, as nothing
// is logged.
//
// LogWithoutWriteToFile should be ~2 orders of magnitude faster, as it avoids
// disk writes.

static void Logging(benchmark::Bench &bench,
                    const std::vector<const char *> &extra_args,
                    const std::function<void()> &log) {
    // Reset any enabled logging categories from a previous benchmark run.
    LogInstance().DisableCategory(BCLog::LogFlags::ALL);

    TestingSetup test_setup{
        ChainType::REGTEST,
        extra_args,
    };

    bench.run([&] { log(); });
}

static void LogPrintWithCategory(benchmark::Bench &bench) {
    Logging(bench, {"-logthreadnames=0", "-debug=net"},
            [] { LogPrint(BCLog::NET, "%s\n", "test"); });
}

static void LogPrintWithoutCategory(benchmark::Bench &bench) {
    Logging(bench, {"-logthreadnames=0", "-debug=0"},
            [] { LogPrint(BCLog::NET, "%s\n", "test"); });
}

static void LogWithThreadNames(benchmark::Bench &bench) {
    Logging(bench, {"-logthreadnames=1"}, [] { LogInfo("%s\n", "test"); });
}

static void LogWithoutThreadNames(benchmark::Bench &bench) {
    Logging(bench, {"-logthreadnames=0"}, [] { LogInfo("%s\n", "test"); });
}

static void LogWithoutWriteToFile(benchmark::Bench &bench) {
    // Disable writing the log to a file, as used for unit tests and fuzzing in
    // `MakeNoLogFileContext`.
    Logging(bench, {"-nodebuglogfile", "-debug=1"}, [] {
        LogPrintf("%s\n", "test");
        LogInfo("%s\n", "test");
        LogPrint(BCLog::NET, "%s\n", "test");
    });
}

BENCHMARK(LogPrintWithCategory);
BENCHMARK(LogPrintWithoutCategory);
BENCHMARK(LogWithThreadNames);
BENCHMARK(LogWithoutThreadNames);
BENCHMARK(LogWithoutWriteToFile);
