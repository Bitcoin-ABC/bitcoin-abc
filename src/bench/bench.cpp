// Copyright (c) 2015-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <bench/bench.h>

#include <fs.h>

#include <test/util/setup_common.h>

#include <chrono>
#include <fstream>
#include <iostream>
#include <map>
#include <regex>
#include <string>
#include <vector>

using namespace std::chrono_literals;

namespace {

void GenerateTemplateResults(
    const std::vector<ankerl::nanobench::Result> &benchmarkResults,
    const fs::path &file, const char *tpl) {
    if (benchmarkResults.empty() || file.empty()) {
        // nothing to write, bail out
        return;
    }
    std::ofstream fout{file};
    if (fout.is_open()) {
        ankerl::nanobench::render(tpl, benchmarkResults, fout);
        std::cout << "Created " << file << std::endl;
    } else {
        std::cout << "Could not write to file " << file << std::endl;
    }
}

} // namespace

benchmark::BenchRunner::BenchmarkMap &benchmark::BenchRunner::benchmarks() {
    static std::map<std::string, BenchFunction> benchmarks_map;
    return benchmarks_map;
}

benchmark::BenchRunner::BenchRunner(std::string name,
                                    benchmark::BenchFunction func) {
    benchmarks().insert(std::make_pair(name, func));
}

void benchmark::BenchRunner::RunAll(const Args &args) {
    std::regex reFilter(args.regex_filter);
    std::smatch baseMatch;

    std::vector<ankerl::nanobench::Result> benchmarkResults;

    for (const auto &p : benchmarks()) {
        if (!std::regex_match(p.first, baseMatch, reFilter)) {
            continue;
        }

        if (args.is_list_only) {
            std::cout << p.first << std::endl;
            continue;
        }

        Bench bench;
        bench.name(p.first);
        if (args.min_time > 0ms) {
            // convert to nanos before dividing to reduce rounding errors
            std::chrono::nanoseconds min_time_ns = args.min_time;
            bench.minEpochTime(min_time_ns / bench.epochs());
        }

        if (args.asymptote.empty()) {
            p.second(bench);
        } else {
            for (auto n : args.asymptote) {
                bench.complexityN(n);
                p.second(bench);
            }
            std::cout << bench.complexityBigO() << std::endl;
        }
        benchmarkResults.push_back(bench.results().back());
    }

    GenerateTemplateResults(
        benchmarkResults, args.output_csv,
        "# Benchmark, evals, iterations, total, min, max, median\n"
        "{{#result}}{{name}}, {{epochs}}, {{average(iterations)}}, "
        "{{sumProduct(iterations, elapsed)}}, {{minimum(elapsed)}}, "
        "{{maximum(elapsed)}}, {{median(elapsed)}}\n"
        "{{/result}}");
    GenerateTemplateResults(benchmarkResults, args.output_json,
                            ankerl::nanobench::templates::json());
}
