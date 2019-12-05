// Copyright (c) 2011-2016 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#define BOOST_TEST_MODULE Bitcoin Test Suite
#define BOOST_TEST_NO_MAIN

#include <banman.h>
#include <net.h>
#include <util/system.h>

#include <boost/test/unit_test.hpp>

#include <memory>

std::unique_ptr<CConnman> g_connman;
std::unique_ptr<BanMan> g_banman;

[[noreturn]] void Shutdown(void *parg) {
    std::exit(EXIT_SUCCESS);
}

[[noreturn]] void StartShutdown() {
    std::exit(EXIT_SUCCESS);
}

bool ShutdownRequested() {
    return false;
}

int main(int argc, char *argv[]) {
    // Additional CLI params supported by test_bitcoin:
    std::set<std::string> testArgs = {
        "-phononactivationtime",
    };

    // Note: gArgs.ParseParameters() cannot be called here or it will fail to
    // parse BOOST runtime params.
    for (int i = 1; i < argc; i++) {
        std::string key(argv[i]);
        std::string value;
        if (ParseKeyValue(key, value)) {
            if (testArgs.count(key) > 0) {
                gArgs.ForceSetArg(key, value);
            }
        }
    }
    return boost::unit_test::unit_test_main(&init_unit_test, argc, argv);
}
