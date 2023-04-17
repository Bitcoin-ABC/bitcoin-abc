// Copyright (c) 2020-2021 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <dnsseeds.h>

#include <util/chaintype.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

BOOST_FIXTURE_TEST_SUITE(dnsseeds_tests, TestingSetup)

BOOST_AUTO_TEST_CASE(override_dns_seed) {
    // No override should always provide some DNS seeds
    const auto params = CreateChainParams(*m_node.args, ChainType::MAIN);
    BOOST_CHECK(GetRandomizedDNSSeeds(*params).size() > 0);

    // Overriding should only return that DNS seed
    gArgs.ForceSetArg("-overridednsseed", "localhost");
    BOOST_CHECK(GetRandomizedDNSSeeds(*params) ==
                std::vector<std::string>{{"localhost"}});
}

BOOST_AUTO_TEST_SUITE_END()
