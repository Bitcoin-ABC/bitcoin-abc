// Copyright (c) 2024 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <seeder/db.h>

#include <boost/test/unit_test.hpp>

static CNetAddr ResolveIP(const std::string &ip) {
    CNetAddr addr;
    LookupHost(ip, addr, false);
    return addr;
}

static SeederAddrInfo BuildSeederAddrInfo(const CService &ip, bool good,
                                          uint64_t services = NODE_NETWORK,
                                          int clientVersion = REQUIRE_VERSION,
                                          bool checkpointVerified = true) {
    SeederAddrInfo info{};
    CDataStream info_stream(SER_NETWORK, PROTOCOL_VERSION);

    uint8_t version{5};

    // tried must be 1 if we want the deserialization to not abort.
    uint8_t tried{1};

    // The following values don't matter, some will be updated via
    // SeederAddrInfo::Update()
    int64_t lastTry{0};
    int64_t ourLastTry{0};
    int64_t ignoreTill{0};

    CAddrStat stat2H;
    CAddrStat stat8H;
    CAddrStat stat1D;
    CAddrStat stat1W;
    CAddrStat stat1M;
    int total{0};
    int success{0};
    std::string clientSubVersion{};
    int blocks{0};
    int64_t ourLastSuccess{0};

    info_stream << version << WithParams(CAddress::V1_DISK, ip) << services
                << lastTry << tried << ourLastTry << ignoreTill << stat2H
                << stat8H << stat1D << stat1W << stat1M << total << success
                << clientVersion << clientSubVersion << blocks << ourLastSuccess
                << checkpointVerified;

    info_stream >> WithParams(CAddress::V1_DISK, info);
    info.Update(good);
    return info;
}

BOOST_AUTO_TEST_SUITE(db_tests)

BOOST_AUTO_TEST_CASE(seederaddrinfo_test) {
    CService ip{ResolveIP("8.8.8.8"), uint16_t{1337}};

    // Any arbitrary port is OK
    auto info = BuildSeederAddrInfo(ip, /*good=*/true);
    BOOST_CHECK(info.IsReliable());
    BOOST_CHECK(info.GetReliabilityStatus() == ReliabilityStatus::OK);

    info = BuildSeederAddrInfo(CService{CNetAddr{}, uint16_t{1337}},
                               /*good=*/false);
    BOOST_CHECK(!info.IsReliable());
    BOOST_CHECK(info.GetReliabilityStatus() == ReliabilityStatus::NOT_ROUTABLE);

    // Check the effect of successive failure/success
    info = BuildSeederAddrInfo(ip, /*good=*/false);
    BOOST_CHECK(!info.IsReliable());
    BOOST_CHECK(info.GetReliabilityStatus() == ReliabilityStatus::BAD_UPTIME);
    info.Update(/*good=*/true);
    BOOST_CHECK(info.IsReliable());
    BOOST_CHECK(info.GetReliabilityStatus() == ReliabilityStatus::OK);
    // TODO: complete this test with more elaborate reliability scenarii

    // A node without the NODE_NETWORK service is considered unreliable
    info = BuildSeederAddrInfo(ip, /*good=*/true, /*services=*/0);
    BOOST_CHECK(!info.IsReliable());
    BOOST_CHECK(info.GetReliabilityStatus() ==
                ReliabilityStatus::NOT_NODE_NETWORK);

    // A node with clientVersion < REQUIRE_VERSION is considered unreliable
    info = BuildSeederAddrInfo(ip, /*good=*/true, /*services=*/NODE_NETWORK,
                               /*clientVersion=*/REQUIRE_VERSION - 1);
    BOOST_CHECK(!info.IsReliable());
    BOOST_CHECK(info.GetReliabilityStatus() ==
                ReliabilityStatus::NOT_REQUIRED_VERSION);

    // The checkpoint must be verified
    info = BuildSeederAddrInfo(ip, /*good=*/true, /*services=*/NODE_NETWORK,
                               /*clientVersion=*/REQUIRE_VERSION,
                               /*checkpointVerified=*/false);
    BOOST_CHECK(!info.IsReliable());
    BOOST_CHECK(info.GetReliabilityStatus() ==
                ReliabilityStatus::UNVERIFIED_CHECKPOINT);
}

BOOST_AUTO_TEST_SUITE_END()
