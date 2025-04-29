// Copyright (c) 2012-2019 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#include <net.h>

#include <addrman.h>
#include <avalanche/avalanche.h>
#include <avalanche/processor.h>
#include <avalanche/statistics.h>
#include <chainparams.h>
#include <clientversion.h>
#include <compat.h>
#include <config.h>
#include <net_processing.h>
#include <netaddress.h>
#include <netbase.h>
#include <netmessagemaker.h>
#include <serialize.h>
#include <span.h>
#include <streams.h>
#include <test/util/validation.h>
#include <threadsafety.h>
#include <timedata.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <util/translation.h> // for bilingual_str
#include <version.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <algorithm>
#include <chrono>
#include <cmath>
#include <condition_variable>
#include <cstdint>
#include <functional>
#include <ios>
#include <memory>
#include <string>

using namespace std::literals;

static CNetAddr ip(uint32_t ip) {
    struct in_addr s;
    s.s_addr = ip;
    return CNetAddr(s);
}

namespace {
struct CConnmanTest : public CConnman {
    using CConnman::CConnman;

    Mutex cs;
    size_t outboundFullRelayCount GUARDED_BY(cs);
    size_t avalancheOutboundsCount GUARDED_BY(cs);

    std::condition_variable cvar;

    NodeId nodeid = 0;

    ~CConnmanTest() { ClearNodes(); }

    void AddNode(ConnectionType type) {
        CAddress addr(
            CService(ip(GetRand<uint32_t>()), Params().GetDefaultPort()),
            NODE_NONE);

        return AddNode(addr, type);
    }

    void AddNode(const CAddress &addr, ConnectionType type) {
        CNode *pnode = new CNode(nodeid++, /*sock=*/nullptr, addr,
                                 CalculateKeyedNetGroup(addr),
                                 /* nLocalHostNonceIn */ 0,
                                 /* nLocalExtraEntropyIn */ 0, addr,
                                 /* pszDest */ "", type,
                                 /* inbound_onion */ false);

        LOCK(m_nodes_mutex);
        m_nodes.push_back(pnode);
        pnode->fSuccessfullyConnected = true;
    }

    void ClearNodes() {
        LOCK(m_nodes_mutex);
        for (CNode *node : m_nodes) {
            delete node;
        }
        m_nodes.clear();
    }

    void SetMaxOutbounds(int maxFullRelayOutbounds, int maxAvalancheOutbounds) {
        Options options;
        options.nMaxConnections = DEFAULT_MAX_PEER_CONNECTIONS;
        options.m_max_outbound_full_relay = maxFullRelayOutbounds;
        options.m_max_avalanche_outbound = maxAvalancheOutbounds;
        Init(options);
    };

    void Init(const Options &connOptions) {
        CConnman::Init(connOptions);

        if (semOutbound == nullptr) {
            // initialize semaphore
            semOutbound = std::make_unique<CSemaphore>(
                std::min(m_max_outbound, nMaxConnections));
        }
        if (semAddnode == nullptr) {
            // initialize semaphore
            semAddnode = std::make_unique<CSemaphore>(nMaxAddnode);
        }
    }

    void openNetworkConnection(const CAddress &addrConnect,
                               ConnectionType connType)
        EXCLUSIVE_LOCKS_REQUIRED(!cs) {
        bool newConnection = !AlreadyConnectedToAddress(addrConnect);
        addrman.Attempt(addrConnect, true);

        if (newConnection) {
            {
                LOCK(cs);

                if (connType == ConnectionType::AVALANCHE_OUTBOUND) {
                    avalancheOutboundsCount++;
                }
                if (connType == ConnectionType::OUTBOUND_FULL_RELAY) {
                    outboundFullRelayCount++;
                }
            }

            AddNode(addrConnect, connType);
            BOOST_CHECK(AlreadyConnectedToAddress(addrConnect));
            addrman.Connected(addrConnect);
        }

        cvar.notify_all();
    }

    struct TestAddresses {
        uint32_t group;
        uint32_t services;
        size_t quantity;
    };

    bool checkContiguousAddressesConnection(
        const std::vector<TestAddresses> &testAddresses,
        size_t expectedOutboundFullRelayCount,
        size_t expectedAvalancheOutboundsCount) EXCLUSIVE_LOCKS_REQUIRED(!cs) {
        {
            LOCK(cs);

            // Reset
            outboundFullRelayCount = 0;
            avalancheOutboundsCount = 0;
        }

        ClearNodes();

        struct IpGen {
            uint32_t baseIp;
            uint32_t offset;
        };
        std::vector<IpGen> ipGroups{
            {0x00010101, 1}, {0x00010164, 1}, {0x000101c8, 1}, {0x00010201, 1},
            {0x00010264, 1}, {0x000102c8, 1}, {0x00010301, 1}, {0x00010364, 1},
            {0x000103c8, 1}, {0x00010401, 1}, {0x00010464, 1}, {0x000104c8, 1}};

        {
            // Make sure we produce addresses in different groups as expected
            std::set<std::vector<uint8_t>> groups;
            for (auto &[baseIp, _] : ipGroups) {
                for (uint32_t j = 0; j < 255; j++) {
                    CNetAddr addr = ip(baseIp + (j << 24));
                    groups.insert(addr.GetGroup({}));
                }
            }
            BOOST_CHECK_EQUAL(groups.size(), ipGroups.size());
        }

        // Generate contiguous addresses
        auto getAddrGroup = [&](size_t group, uint64_t services) {
            CNetAddr addr =
                ip(ipGroups[group].baseIp + (ipGroups[group].offset++ << 24));
            return CAddress(CService(addr, Params().GetDefaultPort()),
                            ServiceFlags(services));
        };

        size_t addressCount = 0;
        for (const TestAddresses &addresses : testAddresses) {
            assert(addresses.group < ipGroups.size());

            addressCount += addresses.quantity;
            do {
                addrman.Add({getAddrGroup(addresses.group,
                                          ServiceFlags(addresses.services))},
                            CNetAddr());
            } while (addrman.size() < addressCount);
        }

        interruptNet.reset();
        std::vector<std::string> empty;
        threadOpenConnections = std::thread(
            &CConnman::ThreadOpenConnections, this, empty,
            std::bind(&CConnmanTest::openNetworkConnection, this,
                      std::placeholders::_1, std::placeholders::_2));

        Mutex mutex;
        WAIT_LOCK(mutex, lock);
        bool ret = cvar.wait_for(lock, 60s, [&]() {
            LOCK(cs);
            return outboundFullRelayCount == expectedOutboundFullRelayCount &&
                   avalancheOutboundsCount == expectedAvalancheOutboundsCount;
        });

        interruptNet();
        if (threadOpenConnections.joinable()) {
            threadOpenConnections.join();
        }

        // Check each non avalanche outbound node belongs to a different group
        std::set<std::vector<uint8_t>> groups;
        ForEachNode([&](const CNode *pnode) {
            if (!pnode->IsAvalancheOutboundConnection()) {
                groups.insert(pnode->addr.GetGroup({}));
            }
        });
        BOOST_CHECK_EQUAL(groups.size(), expectedOutboundFullRelayCount);

        return ret;
    }

    bool AlreadyConnectedToAddress(const CAddress &addr) {
        return CConnman::AlreadyConnectedToAddress(addr);
    }
};
} // namespace

class NetTestConfig : public DummyConfig {
public:
    bool SetMaxBlockSize(uint64_t maxBlockSize) override {
        nMaxBlockSize = maxBlockSize;
        return true;
    }
    uint64_t GetMaxBlockSize() const override { return nMaxBlockSize; }

private:
    uint64_t nMaxBlockSize;
};

// Use TestingSetup or a daughter class so that m_node.addrman is non-null
BOOST_FIXTURE_TEST_SUITE(net_tests, RegTestingSetup)

BOOST_AUTO_TEST_CASE(cnode_listen_port) {
    // test default
    uint16_t port{GetListenPort()};
    BOOST_CHECK(port == Params().GetDefaultPort());
    // test set port
    uint16_t altPort = 12345;
    BOOST_CHECK(gArgs.SoftSetArg("-port", ToString(altPort)));
    port = GetListenPort();
    BOOST_CHECK(port == altPort);
}

BOOST_AUTO_TEST_CASE(cnode_simple_test) {
    NodeId id = 0;

    in_addr ipv4Addr;
    ipv4Addr.s_addr = 0xa0b0c001;

    CAddress addr = CAddress(CService(ipv4Addr, 7777), NODE_NETWORK);
    std::string pszDest;

    auto pnode1 =
        std::make_unique<CNode>(id++, /*sock=*/nullptr, addr,
                                /* nKeyedNetGroupIn = */ 0,
                                /* nLocalHostNonceIn = */ 0,
                                /* nLocalExtraEntropyIn */ 0, CAddress(),
                                pszDest, ConnectionType::OUTBOUND_FULL_RELAY,
                                /* inbound_onion = */ false);
    BOOST_CHECK(pnode1->IsFullOutboundConn() == true);
    BOOST_CHECK(pnode1->IsManualConn() == false);
    BOOST_CHECK(pnode1->IsBlockOnlyConn() == false);
    BOOST_CHECK(pnode1->IsFeelerConn() == false);
    BOOST_CHECK(pnode1->IsAddrFetchConn() == false);
    BOOST_CHECK(pnode1->IsInboundConn() == false);
    BOOST_CHECK(pnode1->m_inbound_onion == false);
    BOOST_CHECK_EQUAL(pnode1->ConnectedThroughNetwork(), Network::NET_IPV4);

    auto pnode2 = std::make_unique<CNode>(id++, /*sock=*/nullptr, addr, 1, 1, 1,
                                          CAddress(), pszDest,
                                          ConnectionType::INBOUND, false);
    BOOST_CHECK(pnode2->IsFullOutboundConn() == false);
    BOOST_CHECK(pnode2->IsManualConn() == false);
    BOOST_CHECK(pnode2->IsBlockOnlyConn() == false);
    BOOST_CHECK(pnode2->IsFeelerConn() == false);
    BOOST_CHECK(pnode2->IsAddrFetchConn() == false);
    BOOST_CHECK(pnode2->IsInboundConn() == true);
    BOOST_CHECK(pnode2->m_inbound_onion == false);
    BOOST_CHECK_EQUAL(pnode2->ConnectedThroughNetwork(), Network::NET_IPV4);

    auto pnode3 = std::make_unique<CNode>(
        id++, /*sock=*/nullptr, addr, 0, 0, 0, CAddress(), pszDest,
        ConnectionType::OUTBOUND_FULL_RELAY, false);
    BOOST_CHECK(pnode3->IsFullOutboundConn() == true);
    BOOST_CHECK(pnode3->IsManualConn() == false);
    BOOST_CHECK(pnode3->IsBlockOnlyConn() == false);
    BOOST_CHECK(pnode3->IsFeelerConn() == false);
    BOOST_CHECK(pnode3->IsAddrFetchConn() == false);
    BOOST_CHECK(pnode3->IsInboundConn() == false);
    BOOST_CHECK(pnode3->m_inbound_onion == false);
    BOOST_CHECK_EQUAL(pnode3->ConnectedThroughNetwork(), Network::NET_IPV4);

    auto pnode4 = std::make_unique<CNode>(id++, /*sock=*/nullptr, addr, 1, 1, 1,
                                          CAddress(), pszDest,
                                          ConnectionType::INBOUND, true);
    BOOST_CHECK(pnode4->IsFullOutboundConn() == false);
    BOOST_CHECK(pnode4->IsManualConn() == false);
    BOOST_CHECK(pnode4->IsBlockOnlyConn() == false);
    BOOST_CHECK(pnode4->IsFeelerConn() == false);
    BOOST_CHECK(pnode4->IsAddrFetchConn() == false);
    BOOST_CHECK(pnode4->IsInboundConn() == true);
    BOOST_CHECK(pnode4->m_inbound_onion == true);
    BOOST_CHECK_EQUAL(pnode4->ConnectedThroughNetwork(), Network::NET_ONION);
}

BOOST_AUTO_TEST_CASE(test_getSubVersionEB) {
    BOOST_CHECK_EQUAL(getSubVersionEB(13800000000), "13800.0");
    BOOST_CHECK_EQUAL(getSubVersionEB(3800000000), "3800.0");
    BOOST_CHECK_EQUAL(getSubVersionEB(14000000), "14.0");
    BOOST_CHECK_EQUAL(getSubVersionEB(1540000), "1.5");
    BOOST_CHECK_EQUAL(getSubVersionEB(1560000), "1.5");
    BOOST_CHECK_EQUAL(getSubVersionEB(210000), "0.2");
    BOOST_CHECK_EQUAL(getSubVersionEB(10000), "0.0");
    BOOST_CHECK_EQUAL(getSubVersionEB(0), "0.0");
}

BOOST_AUTO_TEST_CASE(test_userAgent) {
    NetTestConfig config;

    config.SetMaxBlockSize(8000000);
    const std::string uacomment = "A very nice comment";
    gArgs.ForceSetMultiArg("-uacomment", {uacomment});

    const std::string versionMessage =
        "/Bitcoin ABC:" + ToString(CLIENT_VERSION_MAJOR) + "." +
        ToString(CLIENT_VERSION_MINOR) + "." +
        ToString(CLIENT_VERSION_REVISION) + "(EB8.0; " + uacomment + ")/";

    BOOST_CHECK_EQUAL(userAgent(config), versionMessage);
}

BOOST_AUTO_TEST_CASE(LimitedAndReachable_Network) {
    BOOST_CHECK_EQUAL(IsReachable(NET_IPV4), true);
    BOOST_CHECK_EQUAL(IsReachable(NET_IPV6), true);
    BOOST_CHECK_EQUAL(IsReachable(NET_ONION), true);

    SetReachable(NET_IPV4, false);
    SetReachable(NET_IPV6, false);
    SetReachable(NET_ONION, false);

    BOOST_CHECK_EQUAL(IsReachable(NET_IPV4), false);
    BOOST_CHECK_EQUAL(IsReachable(NET_IPV6), false);
    BOOST_CHECK_EQUAL(IsReachable(NET_ONION), false);

    SetReachable(NET_IPV4, true);
    SetReachable(NET_IPV6, true);
    SetReachable(NET_ONION, true);

    BOOST_CHECK_EQUAL(IsReachable(NET_IPV4), true);
    BOOST_CHECK_EQUAL(IsReachable(NET_IPV6), true);
    BOOST_CHECK_EQUAL(IsReachable(NET_ONION), true);
}

BOOST_AUTO_TEST_CASE(LimitedAndReachable_NetworkCaseUnroutableAndInternal) {
    BOOST_CHECK_EQUAL(IsReachable(NET_UNROUTABLE), true);
    BOOST_CHECK_EQUAL(IsReachable(NET_INTERNAL), true);

    SetReachable(NET_UNROUTABLE, false);
    SetReachable(NET_INTERNAL, false);

    // Ignored for both networks
    BOOST_CHECK_EQUAL(IsReachable(NET_UNROUTABLE), true);
    BOOST_CHECK_EQUAL(IsReachable(NET_INTERNAL), true);
}

CNetAddr UtilBuildAddress(uint8_t p1, uint8_t p2, uint8_t p3, uint8_t p4) {
    uint8_t ip[] = {p1, p2, p3, p4};

    struct sockaddr_in sa;
    // initialize the memory block
    memset(&sa, 0, sizeof(sockaddr_in));
    memcpy(&(sa.sin_addr), &ip, sizeof(ip));
    return CNetAddr(sa.sin_addr);
}

BOOST_AUTO_TEST_CASE(LimitedAndReachable_CNetAddr) {
    // 1.1.1.1
    CNetAddr addr = UtilBuildAddress(0x001, 0x001, 0x001, 0x001);

    SetReachable(NET_IPV4, true);
    BOOST_CHECK_EQUAL(IsReachable(addr), true);

    SetReachable(NET_IPV4, false);
    BOOST_CHECK_EQUAL(IsReachable(addr), false);

    // have to reset this, because this is stateful.
    SetReachable(NET_IPV4, true);
}

BOOST_AUTO_TEST_CASE(LocalAddress_BasicLifecycle) {
    // 2.1.1.1:1000
    CService addr =
        CService(UtilBuildAddress(0x002, 0x001, 0x001, 0x001), 1000);

    SetReachable(NET_IPV4, true);

    BOOST_CHECK_EQUAL(IsLocal(addr), false);
    BOOST_CHECK_EQUAL(AddLocal(addr, 1000), true);
    BOOST_CHECK_EQUAL(IsLocal(addr), true);

    RemoveLocal(addr);
    BOOST_CHECK_EQUAL(IsLocal(addr), false);
}

BOOST_AUTO_TEST_CASE(cnetaddr_basic) {
    CNetAddr addr;

    // IPv4, INADDR_ANY
    BOOST_REQUIRE(LookupHost("0.0.0.0", addr, false));
    BOOST_REQUIRE(!addr.IsValid());
    BOOST_REQUIRE(addr.IsIPv4());

    BOOST_CHECK(addr.IsBindAny());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "0.0.0.0");

    // IPv4, INADDR_NONE
    BOOST_REQUIRE(LookupHost("255.255.255.255", addr, false));
    BOOST_REQUIRE(!addr.IsValid());
    BOOST_REQUIRE(addr.IsIPv4());

    BOOST_CHECK(!addr.IsBindAny());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "255.255.255.255");

    // IPv4, casual
    BOOST_REQUIRE(LookupHost("12.34.56.78", addr, false));
    BOOST_REQUIRE(addr.IsValid());
    BOOST_REQUIRE(addr.IsIPv4());

    BOOST_CHECK(!addr.IsBindAny());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "12.34.56.78");

    // IPv6, in6addr_any
    BOOST_REQUIRE(LookupHost("::", addr, false));
    BOOST_REQUIRE(!addr.IsValid());
    BOOST_REQUIRE(addr.IsIPv6());

    BOOST_CHECK(addr.IsBindAny());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "::");

    // IPv6, casual
    BOOST_REQUIRE(
        LookupHost("1122:3344:5566:7788:9900:aabb:ccdd:eeff", addr, false));
    BOOST_REQUIRE(addr.IsValid());
    BOOST_REQUIRE(addr.IsIPv6());

    BOOST_CHECK(!addr.IsBindAny());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(),
                      "1122:3344:5566:7788:9900:aabb:ccdd:eeff");

    // IPv6, scoped/link-local. See https://tools.ietf.org/html/rfc4007
    // We support non-negative decimal integers (uint32_t) as zone id indices.
    // Normal link-local scoped address functionality is to append "%" plus the
    // zone id, for example, given a link-local address of "fe80::1" and a zone
    // id of "32", return the address as "fe80::1%32".
    const std::string link_local{"fe80::1"};
    const std::string scoped_addr{link_local + "%32"};
    BOOST_REQUIRE(LookupHost(scoped_addr, addr, false));
    BOOST_REQUIRE(addr.IsValid());
    BOOST_REQUIRE(addr.IsIPv6());
    BOOST_CHECK(!addr.IsBindAny());
    BOOST_CHECK_EQUAL(addr.ToString(), scoped_addr);

    // Test that the delimiter "%" and default zone id of 0 can be omitted for
    // the default scope.
    BOOST_REQUIRE(LookupHost(link_local + "%0", addr, false));
    BOOST_REQUIRE(addr.IsValid());
    BOOST_REQUIRE(addr.IsIPv6());
    BOOST_CHECK(!addr.IsBindAny());
    BOOST_CHECK_EQUAL(addr.ToString(), link_local);

    // TORv2
    BOOST_REQUIRE(addr.SetSpecial("6hzph5hv6337r6p2.onion"));
    BOOST_REQUIRE(addr.IsValid());
    BOOST_REQUIRE(addr.IsTor());

    BOOST_CHECK(!addr.IsI2P());
    BOOST_CHECK(!addr.IsBindAny());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "6hzph5hv6337r6p2.onion");

    // TORv3
    const char *torv3_addr =
        "pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscryd.onion";
    BOOST_REQUIRE(addr.SetSpecial(torv3_addr));
    BOOST_REQUIRE(addr.IsValid());
    BOOST_REQUIRE(addr.IsTor());

    BOOST_CHECK(!addr.IsI2P());
    BOOST_CHECK(!addr.IsBindAny());
    BOOST_CHECK(!addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), torv3_addr);

    // TORv3, broken, with wrong checksum
    BOOST_CHECK(!addr.SetSpecial(
        "pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscsad.onion"));

    // TORv3, broken, with wrong version
    BOOST_CHECK(!addr.SetSpecial(
        "pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscrye.onion"));

    // TORv3, malicious
    BOOST_CHECK(!addr.SetSpecial(std::string{
        "pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscryd\0wtf.onion",
        66}));

    // TOR, bogus length
    BOOST_CHECK(!addr.SetSpecial(std::string{"mfrggzak.onion"}));

    // TOR, invalid base32
    BOOST_CHECK(!addr.SetSpecial(std::string{"mf*g zak.onion"}));

    // I2P
    const char *i2p_addr =
        "UDHDrtrcetjm5sxzskjyr5ztpeszydbh4dpl3pl4utgqqw2v4jna.b32.I2P";
    BOOST_REQUIRE(addr.SetSpecial(i2p_addr));
    BOOST_REQUIRE(addr.IsValid());
    BOOST_REQUIRE(addr.IsI2P());

    BOOST_CHECK(!addr.IsTor());
    BOOST_CHECK(!addr.IsBindAny());
    BOOST_CHECK(!addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), ToLower(i2p_addr));

    // I2P, correct length, but decodes to less than the expected number of
    // bytes.
    BOOST_CHECK(!addr.SetSpecial(
        "udhdrtrcetjm5sxzskjyr5ztpeszydbh4dpl3pl4utgqqw2v4jn=.b32.i2p"));

    // I2P, extra unnecessary padding
    BOOST_CHECK(!addr.SetSpecial(
        "udhdrtrcetjm5sxzskjyr5ztpeszydbh4dpl3pl4utgqqw2v4jna=.b32.i2p"));

    // I2P, malicious
    BOOST_CHECK(!addr.SetSpecial(
        "udhdrtrcetjm5sxzskjyr5ztpeszydbh4dpl3pl4utgqqw2v\0wtf.b32.i2p"s));

    // I2P, valid but unsupported (56 Base32 characters)
    // See "Encrypted LS with Base 32 Addresses" in
    // https://geti2p.net/spec/encryptedleaseset.txt
    BOOST_CHECK(!addr.SetSpecial(
        "pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscsad.b32.i2p"));

    // I2P, invalid base32
    BOOST_CHECK(!addr.SetSpecial(std::string{"tp*szydbh4dp.b32.i2p"}));

    // Internal
    addr.SetInternal("esffpp");
    // "internal" is considered invalid
    BOOST_REQUIRE(!addr.IsValid());
    BOOST_REQUIRE(addr.IsInternal());

    BOOST_CHECK(!addr.IsBindAny());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "esffpvrt3wpeaygy.internal");

    // Totally bogus
    BOOST_CHECK(!addr.SetSpecial("totally bogus"));
}

BOOST_AUTO_TEST_CASE(cnetaddr_serialize_v1) {
    CNetAddr addr;
    CDataStream s(SER_NETWORK, PROTOCOL_VERSION);

    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "00000000000000000000000000000000");
    s.clear();

    BOOST_REQUIRE(LookupHost("1.2.3.4", addr, false));
    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "00000000000000000000ffff01020304");
    s.clear();

    BOOST_REQUIRE(
        LookupHost("1a1b:2a2b:3a3b:4a4b:5a5b:6a6b:7a7b:8a8b", addr, false));
    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "1a1b2a2b3a3b4a4b5a5b6a6b7a7b8a8b");
    s.clear();

    BOOST_REQUIRE(addr.SetSpecial("6hzph5hv6337r6p2.onion"));
    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "fd87d87eeb43f1f2f3f4f5f6f7f8f9fa");
    s.clear();

    BOOST_REQUIRE(addr.SetSpecial(
        "pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscryd.onion"));
    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "00000000000000000000000000000000");
    s.clear();

    addr.SetInternal("a");
    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "fd6b88c08724ca978112ca1bbdcafac2");
    s.clear();
}

BOOST_AUTO_TEST_CASE(cnetaddr_serialize_v2) {
    CNetAddr addr;
    CDataStream s(SER_NETWORK, PROTOCOL_VERSION);
    // Add ADDRV2_FORMAT to the version so that the CNetAddr
    // serialize method produces an address in v2 format.
    s.SetVersion(s.GetVersion() | ADDRV2_FORMAT);

    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "021000000000000000000000000000000000");
    s.clear();

    BOOST_REQUIRE(LookupHost("1.2.3.4", addr, false));
    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "010401020304");
    s.clear();

    BOOST_REQUIRE(
        LookupHost("1a1b:2a2b:3a3b:4a4b:5a5b:6a6b:7a7b:8a8b", addr, false));
    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "02101a1b2a2b3a3b4a4b5a5b6a6b7a7b8a8b");
    s.clear();

    BOOST_REQUIRE(addr.SetSpecial("6hzph5hv6337r6p2.onion"));
    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "030af1f2f3f4f5f6f7f8f9fa");
    s.clear();

    BOOST_REQUIRE(addr.SetSpecial(
        "kpgvmscirrdqpekbqjsvw5teanhatztpp2gl6eee4zkowvwfxwenqaid.onion"));
    s << addr;
    BOOST_CHECK_EQUAL(
        HexStr(s),
        "042053cd5648488c4707914182655b7664034e09e66f7e8cbf1084e654eb56c5bd88");
    s.clear();

    BOOST_REQUIRE(addr.SetInternal("a"));
    s << addr;
    BOOST_CHECK_EQUAL(HexStr(s), "0210fd6b88c08724ca978112ca1bbdcafac2");
    s.clear();
}

BOOST_AUTO_TEST_CASE(cnetaddr_unserialize_v2) {
    CNetAddr addr;
    CDataStream s(SER_NETWORK, PROTOCOL_VERSION);
    // Add ADDRV2_FORMAT to the version so that the CNetAddr
    // unserialize method expects an address in v2 format.
    s.SetVersion(s.GetVersion() | ADDRV2_FORMAT);

    // Valid IPv4.
    s << Span{ParseHex("01"          // network type (IPv4)
                       "04"          // address length
                       "01020304")}; // address
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsIPv4());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "1.2.3.4");
    BOOST_REQUIRE(s.empty());

    // Invalid IPv4, valid length but address itself is shorter.
    s << Span{ParseHex("01"      // network type (IPv4)
                       "04"      // address length
                       "0102")}; // address
    BOOST_CHECK_EXCEPTION(s >> addr, std::ios_base::failure,
                          HasReason("end of data"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Invalid IPv4, with bogus length.
    s << Span{ParseHex("01"          // network type (IPv4)
                       "05"          // address length
                       "01020304")}; // address
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 IPv4 address with length 5 (should be 4)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Invalid IPv4, with extreme length.
    s << Span{ParseHex("01"          // network type (IPv4)
                       "fd0102"      // address length (513 as CompactSize)
                       "01020304")}; // address
    BOOST_CHECK_EXCEPTION(s >> addr, std::ios_base::failure,
                          HasReason("Address too long: 513 > 512"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Valid IPv6.
    s << Span{ParseHex("02" // network type (IPv6)
                       "10" // address length
                       "0102030405060708090a0b0c0d0e0f10")}; // address
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsIPv6());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "102:304:506:708:90a:b0c:d0e:f10");
    BOOST_REQUIRE(s.empty());

    // Valid IPv6, contains embedded "internal".
    s << Span{
        ParseHex("02"                                  // network type (IPv6)
                 "10"                                  // address length
                 "fd6b88c08724ca978112ca1bbdcafac2")}; // address: 0xfd +
                                                       // sha256("bitcoin")[0:5]
                                                       // + sha256(name)[0:10]
    s >> addr;
    BOOST_CHECK(addr.IsInternal());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "zklycewkdo64v6wc.internal");
    BOOST_REQUIRE(s.empty());

    // Invalid IPv6, with bogus length.
    s << Span{ParseHex("02"    // network type (IPv6)
                       "04"    // address length
                       "00")}; // address
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 IPv6 address with length 4 (should be 16)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Invalid IPv6, contains embedded IPv4.
    s << Span{ParseHex("02" // network type (IPv6)
                       "10" // address length
                       "00000000000000000000ffff01020304")}; // address
    s >> addr;
    BOOST_CHECK(!addr.IsValid());
    BOOST_REQUIRE(s.empty());

    // Invalid IPv6, contains embedded TORv2.
    s << Span{ParseHex("02" // network type (IPv6)
                       "10" // address length
                       "fd87d87eeb430102030405060708090a")}; // address
    s >> addr;
    BOOST_CHECK(!addr.IsValid());
    BOOST_REQUIRE(s.empty());

    // Valid TORv2.
    s << Span{ParseHex("03"                      // network type (TORv2)
                       "0a"                      // address length
                       "f1f2f3f4f5f6f7f8f9fa")}; // address
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsTor());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "6hzph5hv6337r6p2.onion");
    BOOST_REQUIRE(s.empty());

    // Invalid TORv2, with bogus length.
    s << Span{ParseHex("03"    // network type (TORv2)
                       "07"    // address length
                       "00")}; // address
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 TORv2 address with length 7 (should be 10)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Valid TORv3.
    s << Span{ParseHex("04" // network type (TORv3)
                       "20" // address length
                       "79bcc625184b05194975c28b66b66b04" // address
                       "69f7f6556fb1ac3189a79b40dda32f1f")};
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsTor());
    BOOST_CHECK(!addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(
        addr.ToString(),
        "pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscryd.onion");
    BOOST_REQUIRE(s.empty());

    // Invalid TORv3, with bogus length.
    s << Span{ParseHex("04" // network type (TORv3)
                       "00" // address length
                       "00" // address
                       )};
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 TORv3 address with length 0 (should be 32)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Valid I2P.
    s << Span{ParseHex("05"                               // network type (I2P)
                       "20"                               // address length
                       "a2894dabaec08c0051a481a6dac88b64" // address
                       "f98232ae42d4b6fd2fa81952dfe36a87")};
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsI2P());
    BOOST_CHECK(!addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(
        addr.ToString(),
        "ukeu3k5oycgaauneqgtnvselmt4yemvoilkln7jpvamvfx7dnkdq.b32.i2p");
    BOOST_REQUIRE(s.empty());

    // Invalid I2P, with bogus length.
    s << Span{ParseHex("05" // network type (I2P)
                       "03" // address length
                       "00" // address
                       )};
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 I2P address with length 3 (should be 32)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Valid CJDNS.
    s << Span{ParseHex("06" // network type (CJDNS)
                       "10" // address length
                       "fc000001000200030004000500060007" // address
                       )};
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsCJDNS());
    BOOST_CHECK(!addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "fc00:1:2:3:4:5:6:7");
    BOOST_REQUIRE(s.empty());

    // Invalid CJDNS, with bogus length.
    s << Span{ParseHex("06" // network type (CJDNS)
                       "01" // address length
                       "00" // address
                       )};
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 CJDNS address with length 1 (should be 16)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Unknown, with extreme length.
    s << Span{ParseHex("aa"         // network type (unknown)
                       "fe00000002" // address length (CompactSize's MAX_SIZE)
                       "01020304050607" // address
                       )};

    BOOST_CHECK_EXCEPTION(s >> addr, std::ios_base::failure,
                          HasReason("Address too long: 33554432 > 512"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Unknown, with reasonable length.
    s << Span{ParseHex("aa"       // network type (unknown)
                       "04"       // address length
                       "01020304" // address
                       )};
    s >> addr;
    BOOST_CHECK(!addr.IsValid());
    BOOST_REQUIRE(s.empty());

    // Unknown, with zero length.
    s << Span{ParseHex("aa" // network type (unknown)
                       "00" // address length
                       ""   // address
                       )};
    s >> addr;
    BOOST_CHECK(!addr.IsValid());
    BOOST_REQUIRE(s.empty());
}

// prior to PR #14728, this test triggers an undefined behavior
BOOST_AUTO_TEST_CASE(ipv4_peer_with_ipv6_addrMe_test) {
    // set up local addresses; all that's necessary to reproduce the bug is
    // that a normal IPv4 address is among the entries, but if this address is
    // !IsRoutable the undefined behavior is easier to trigger deterministically
    in_addr raw_addr;
    raw_addr.s_addr = htonl(0x7f000001);
    const CNetAddr mapLocalHost_entry = CNetAddr(raw_addr);
    {
        LOCK(g_maplocalhost_mutex);
        LocalServiceInfo lsi;
        lsi.nScore = 23;
        lsi.nPort = 42;
        mapLocalHost[mapLocalHost_entry] = lsi;
    }

    // create a peer with an IPv4 address
    in_addr ipv4AddrPeer;
    ipv4AddrPeer.s_addr = 0xa0b0c001;
    CAddress addr = CAddress(CService(ipv4AddrPeer, 7777), NODE_NETWORK);
    std::unique_ptr<CNode> pnode = std::make_unique<CNode>(
        0, /*sock=*/nullptr, addr, /* nKeyedNetGroupIn */ 0,
        /* nLocalHostNonceIn */ 0, /* nLocalExtraEntropyIn */ 0, CAddress{},
        /* pszDest */ std::string{}, ConnectionType::OUTBOUND_FULL_RELAY,
        /* inbound_onion = */ false);
    pnode->fSuccessfullyConnected.store(true);

    // the peer claims to be reaching us via IPv6
    in6_addr ipv6AddrLocal;
    memset(ipv6AddrLocal.s6_addr, 0, 16);
    ipv6AddrLocal.s6_addr[0] = 0xcc;
    CAddress addrLocal = CAddress(CService(ipv6AddrLocal, 7777), NODE_NETWORK);
    pnode->SetAddrLocal(addrLocal);

    // before patch, this causes undefined behavior detectable with clang's
    // -fsanitize=memory
    GetLocalAddrForPeer(*pnode);

    // suppress no-checks-run warning; if this test fails, it's by triggering a
    // sanitizer
    BOOST_CHECK(1);

    // Cleanup, so that we don't confuse other tests.
    {
        LOCK(g_maplocalhost_mutex);
        mapLocalHost.erase(mapLocalHost_entry);
    }
}

BOOST_AUTO_TEST_CASE(get_local_addr_for_peer_port) {
    // Test that GetLocalAddrForPeer() properly selects the address to
    // self-advertise:
    //
    // 1. GetLocalAddrForPeer() calls GetLocalAddress() which returns an address
    // that is
    //    not routable.
    // 2. GetLocalAddrForPeer() overrides the address with whatever the peer has
    // told us
    //    he sees us as.
    // 2.1. For inbound connections we must override both the address and the
    // port. 2.2. For outbound connections we must override only the address.

    // Pretend that we bound to this port.
    const uint16_t bind_port = 20001;
    m_node.args->ForceSetArg("-bind", strprintf("3.4.5.6:%u", bind_port));

    // Our address:port as seen from the peer, completely different from the
    // above.
    in_addr peer_us_addr;
    peer_us_addr.s_addr = htonl(0x02030405);
    const CService peer_us{peer_us_addr, 20002};

    // Create a peer with a routable IPv4 address (outbound).
    in_addr peer_out_in_addr;
    peer_out_in_addr.s_addr = htonl(0x01020304);
    CNode peer_out{
        /*id=*/0,
        /*sock=*/nullptr,
        /*addrIn=*/CAddress{CService{peer_out_in_addr, 8333}, NODE_NETWORK},
        /*nKeyedNetGroupIn=*/0,
        /*nLocalHostNonceIn=*/0,
        /*nLocalExtraEntropyIn=*/0,
        /*addrBindIn=*/CAddress{},
        /*addrNameIn=*/std::string{},
        /*conn_type_in=*/ConnectionType::OUTBOUND_FULL_RELAY,
        /*inbound_onion=*/false};
    peer_out.fSuccessfullyConnected = true;
    peer_out.SetAddrLocal(peer_us);

    // Without the fix peer_us:8333 is chosen instead of the proper
    // peer_us:bind_port.
    auto chosen_local_addr = GetLocalAddrForPeer(peer_out);
    BOOST_REQUIRE(chosen_local_addr);
    const CService expected{peer_us_addr, bind_port};
    BOOST_CHECK(*chosen_local_addr == expected);

    // Create a peer with a routable IPv4 address (inbound).
    in_addr peer_in_in_addr;
    peer_in_in_addr.s_addr = htonl(0x05060708);
    CNode peer_in{
        /*id=*/0,
        /*sock=*/nullptr,
        /*addrIn=*/CAddress{CService{peer_in_in_addr, 8333}, NODE_NETWORK},
        /*nKeyedNetGroupIn=*/0,
        /*nLocalHostNonceIn=*/0,
        /*nLocalExtraEntropyIn=*/0,
        /*addrBindIn=*/CAddress{},
        /*addrNameIn=*/std::string{},
        /*conn_type_in=*/ConnectionType::INBOUND,
        /*inbound_onion=*/false};
    peer_in.fSuccessfullyConnected = true;
    peer_in.SetAddrLocal(peer_us);

    // Without the fix peer_us:8333 is chosen instead of the proper
    // peer_us:peer_us.GetPort().
    chosen_local_addr = GetLocalAddrForPeer(peer_in);
    BOOST_REQUIRE(chosen_local_addr);
    BOOST_CHECK(*chosen_local_addr == peer_us);

    m_node.args->ForceSetArg("-bind", "");
}

BOOST_AUTO_TEST_CASE(avalanche_statistics) {
    const std::vector<std::tuple<uint32_t, uint32_t, double>> testCases = {
        // {step, tau, decay_factor}
        {10, 100, 1. - std::exp(-1. * 10 / 100)},
        // Current defaults
        {AVALANCHE_STATISTICS_REFRESH_PERIOD.count(),
         AVALANCHE_STATISTICS_TIME_CONSTANT.count(),
         AVALANCHE_STATISTICS_DECAY_FACTOR},
    };
    for (const auto &[step, tau, decayFactor] : testCases) {
        in_addr ipv4Addr;
        ipv4Addr.s_addr = 0xa0b0c001;
        CAddress addr = CAddress(CService(ipv4Addr, 7777), NODE_NETWORK);
        std::unique_ptr<CNode> pnode = std::make_unique<CNode>(
            0, /*sock=*/nullptr, addr, 0, 0, 0, CAddress(), std::string{},
            ConnectionType::OUTBOUND_FULL_RELAY, false);
        pnode->m_avalanche_enabled = true;

        double previousScore = pnode->getAvailabilityScore();
        BOOST_CHECK_SMALL(previousScore, 1e-6);

        // Check the statistics follow an exponential response for 1 to 10 tau
        for (size_t i = 1; i <= 10; i++) {
            for (uint32_t j = 0; j < tau; j += step) {
                pnode->invsPolled(1);
                // Always respond to everything correctly
                pnode->invsVoted(1);

                pnode->updateAvailabilityScore(decayFactor);

                // Expect a monotonic rise
                double currentScore = pnode->getAvailabilityScore();
                BOOST_CHECK_GE(currentScore, previousScore);
                previousScore = currentScore;
            }

            // We expect (1 - e^-i) after i * tau. The tolerance is expressed
            // as a percentage, and we add a (large) 0.1% margin to account for
            // floating point errors.
            BOOST_CHECK_CLOSE(previousScore, -1 * std::expm1(-1. * i),
                              100.1 / tau);
        }

        // After 10 tau we should be very close to 100% (about 99.995%)
        BOOST_CHECK_CLOSE(previousScore, 1., 0.01);

        for (size_t i = 1; i <= 3; i++) {
            for (uint32_t j = 0; j < tau; j += step) {
                pnode->invsPolled(2);

                // Stop responding to the polls.
                pnode->invsVoted(1);

                pnode->updateAvailabilityScore(decayFactor);

                // Expect a monotonic fall
                double currentScore = pnode->getAvailabilityScore();
                BOOST_CHECK_LE(currentScore, previousScore);
                previousScore = currentScore;
            }

            // There is a slight error in the expected value because we did not
            // start the decay at exactly 100%, but the 0.1% margin is at least
            // an order of magnitude larger than the expected error so it
            // doesn't matter.
            BOOST_CHECK_CLOSE(previousScore, 1. + std::expm1(-1. * i),
                              100.1 / tau);
        }

        // After 3 more tau we should be under 5%
        BOOST_CHECK_LT(previousScore, .05);

        for (size_t i = 1; i <= 100; i++) {
            pnode->invsPolled(10);

            // Completely stop responding to the polls.
            pnode->invsVoted(0);

            pnode->updateAvailabilityScore(decayFactor);

            // It's still a monotonic fall, and the score should turn negative.
            double currentScore = pnode->getAvailabilityScore();
            BOOST_CHECK_LE(currentScore, previousScore);
            BOOST_CHECK_LE(currentScore, 0.);
            previousScore = currentScore;
        }
    }
}

BOOST_AUTO_TEST_CASE(get_extra_full_outbound_count) {
    CConnmanTest connman(m_node.chainman->GetConfig(), 0x1337, 0x1337,
                         *m_node.addrman);

    auto checkExtraFullOutboundCount = [&](size_t fullOutboundCount,
                                           size_t avalancheOutboundCount,
                                           int expectedExtraCount) {
        connman.ClearNodes();
        for (size_t i = 0; i < fullOutboundCount; i++) {
            connman.AddNode(ConnectionType::OUTBOUND_FULL_RELAY);
        }
        for (size_t i = 0; i < avalancheOutboundCount; i++) {
            connman.AddNode(ConnectionType::AVALANCHE_OUTBOUND);
        }
        BOOST_CHECK_EQUAL(connman.GetExtraFullOutboundCount(),
                          expectedExtraCount);
    };

    connman.SetMaxOutbounds(0, 0);
    checkExtraFullOutboundCount(0, 0, 0);
    checkExtraFullOutboundCount(1, 0, 1);
    checkExtraFullOutboundCount(0, 1, 1);
    checkExtraFullOutboundCount(5, 5, 10);

    connman.SetMaxOutbounds(4, 0);
    checkExtraFullOutboundCount(0, 0, 0);
    checkExtraFullOutboundCount(1, 0, 0);
    checkExtraFullOutboundCount(0, 1, 0);
    checkExtraFullOutboundCount(4, 0, 0);
    checkExtraFullOutboundCount(0, 4, 0);
    checkExtraFullOutboundCount(2, 2, 0);
    checkExtraFullOutboundCount(5, 5, 6);

    connman.SetMaxOutbounds(4, 4);
    checkExtraFullOutboundCount(0, 0, 0);
    checkExtraFullOutboundCount(1, 0, 0);
    checkExtraFullOutboundCount(0, 1, 0);
    checkExtraFullOutboundCount(4, 0, 0);
    checkExtraFullOutboundCount(0, 4, 0);
    checkExtraFullOutboundCount(4, 4, 0);
    checkExtraFullOutboundCount(5, 5, 2);
}

BOOST_AUTO_TEST_CASE(net_group_limit) {
    CConnman::Options options;
    auto freshConnman = [&]() {
        m_node.addrman = std::make_unique<AddrMan>(
            /*asmap=*/std::vector<bool>(), /*deterministic=*/true,
            /*consistency_check_ratio=*/0);
        m_node.connman = std::make_unique<CConnmanTest>(
            m_node.chainman->GetConfig(), 0x1337, 0x1337, *m_node.addrman);

        options.nMaxConnections = 200;
        options.m_max_outbound_full_relay = 8;
        options.m_max_avalanche_outbound = 60;

        auto connman = static_cast<CConnmanTest *>(m_node.connman.get());
        connman->Init(options);

        return connman;
    };

    // Single full relay outbound is no problem
    BOOST_CHECK(freshConnman()->checkContiguousAddressesConnection(
        {
            // group, services, quantity
            {0, NODE_NETWORK, 1},
        },
        1, // Expected full-relay outbound count
        0  // Expected avalanche outbound count
        ));

    // Adding more contiguous full relay outbounds fails due to network group
    // limitation
    BOOST_CHECK(freshConnman()->checkContiguousAddressesConnection(
        {
            // group, services, quantity
            {0, NODE_NETWORK, 3},
        },
        1, // Expected full-relay outbound count
        0  // Expected avalanche outbound count
        ));

    // Outbounds from different groups can be connected
    BOOST_CHECK(freshConnman()->checkContiguousAddressesConnection(
        {
            // group, services, quantity
            {0, NODE_NETWORK, 1},
            {1, NODE_NETWORK, 1},
            {2, NODE_NETWORK, 1},
        },
        3, // Expected full-relay outbound count
        0  // Expected avalanche outbound count
        ));

    // Up to the max
    BOOST_CHECK(freshConnman()->checkContiguousAddressesConnection(
        {
            // group, services, quantity
            {0, NODE_NETWORK, 1},
            {1, NODE_NETWORK, 1},
            {2, NODE_NETWORK, 1},
            {3, NODE_NETWORK, 1},
            {4, NODE_NETWORK, 1},
            {5, NODE_NETWORK, 1},
            {6, NODE_NETWORK, 1},
            {7, NODE_NETWORK, 1},
            {8, NODE_NETWORK, 1},
            {9, NODE_NETWORK, 1},
            {10, NODE_NETWORK, 1},
            {11, NODE_NETWORK, 1},
        },
        options.m_max_outbound_full_relay, // Expected full-relay outbound count
        0                                  // Expected avalanche outbound count
        ));

    // Avalanche outbounds are prioritized, so contiguous full relay outbounds
    // will fail due to network group limitation
    BOOST_CHECK(freshConnman()->checkContiguousAddressesConnection(
        {
            // group, services, quantity
            {0, NODE_NETWORK | NODE_AVALANCHE, 1},
            {0, NODE_NETWORK, 3},
        },
        0, // Expected full-relay outbound count
        1  // Expected avalanche outbound count
        ));

    // Adding more avalanche outbounds is fine
    BOOST_CHECK(freshConnman()->checkContiguousAddressesConnection(
        {
            // group, services, quantity
            {0, NODE_NETWORK | NODE_AVALANCHE, 3},
            {0, NODE_NETWORK, 3},
        },
        0, // Expected full-relay outbound count
        3  // Expected avalanche outbound count
        ));

    // Group limit still applies to non avalanche outbounds, which also remain
    // capped to the max from the connman options.
    BOOST_CHECK(freshConnman()->checkContiguousAddressesConnection(
        {
            // group, services, quantity
            {0, NODE_NETWORK | NODE_AVALANCHE, 50},
            {1, NODE_NETWORK, 10},
            {2, NODE_NETWORK, 10},
            {3, NODE_NETWORK, 10},
            {4, NODE_NETWORK, 10},
            {5, NODE_NETWORK, 10},
            {6, NODE_NETWORK, 10},
            {7, NODE_NETWORK, 10},
            {8, NODE_NETWORK, 10},
            {9, NODE_NETWORK, 10},
            {10, NODE_NETWORK, 10},
            {11, NODE_NETWORK, 10},
        },
        options.m_max_outbound_full_relay, // Expected full-relay outbound count
        50                                 // Expected avalanche outbound count
        ));
}

BOOST_AUTO_TEST_CASE(initial_advertise_from_version_message) {
    LOCK(NetEventsInterface::g_msgproc_mutex);

    // Tests the following scenario:
    // * -bind=3.4.5.6:20001 is specified
    // * we make an outbound connection to a peer
    // * the peer reports he sees us as 2.3.4.5:20002 in the version message
    //   (20002 is a random port assigned by our OS for the outgoing TCP
    //   connection, we cannot accept connections to it)
    // * we should self-advertise to that peer as 2.3.4.5:20001

    // Pretend that we bound to this port.
    const uint16_t bind_port = 20001;
    m_node.args->ForceSetArg("-bind", strprintf("3.4.5.6:%u", bind_port));
    m_node.args->ForceSetArg("-capturemessages", "1");

    // Our address:port as seen from the peer - 2.3.4.5:20002 (different from
    // the above).
    in_addr peer_us_addr;
    peer_us_addr.s_addr = htonl(0x02030405);
    const CService peer_us{peer_us_addr, 20002};

    // Create a peer with a routable IPv4 address.
    in_addr peer_in_addr;
    peer_in_addr.s_addr = htonl(0x01020304);
    CNode peer{/*id=*/0,
               /*sock=*/nullptr,
               /*addrIn=*/CAddress{CService{peer_in_addr, 8333}, NODE_NETWORK},
               /*nKeyedNetGroupIn=*/0,
               /*nLocalHostNonceIn=*/0,
               /*nLocalExtraEntropyIn=*/0,
               /*addrBindIn=*/CAddress{},
               /*addrNameIn=*/std::string{},
               /*conn_type_in=*/ConnectionType::OUTBOUND_FULL_RELAY,
               /*inbound_onion=*/false};

    const uint64_t services{NODE_NETWORK};
    const int64_t time{0};
    const CNetMsgMaker msg_maker{PROTOCOL_VERSION};

    // Force ChainstateManager::IsInitialBlockDownload() to return false.
    // Otherwise PushAddress() isn't called by PeerManager::ProcessMessage().
    auto &chainman = static_cast<TestChainstateManager &>(*m_node.chainman);
    chainman.JumpOutOfIbd();

    const Config &config = m_node.chainman->GetConfig();

    m_node.peerman->InitializeNode(config, peer, NODE_NETWORK);

    std::atomic<bool> interrupt_dummy{false};
    std::chrono::microseconds time_received_dummy{0};

    const auto msg_version =
        msg_maker.Make(NetMsgType::VERSION, PROTOCOL_VERSION, services, time,
                       services, peer_us);
    CDataStream msg_version_stream{msg_version.data, SER_NETWORK,
                                   PROTOCOL_VERSION};

    m_node.peerman->ProcessMessage(config, peer, NetMsgType::VERSION,
                                   msg_version_stream, time_received_dummy,
                                   interrupt_dummy);

    const auto msg_verack = msg_maker.Make(NetMsgType::VERACK);
    CDataStream msg_verack_stream{msg_verack.data, SER_NETWORK,
                                  PROTOCOL_VERSION};

    // Will set peer.fSuccessfullyConnected to true (necessary in
    // SendMessages()).
    m_node.peerman->ProcessMessage(config, peer, NetMsgType::VERACK,
                                   msg_verack_stream, time_received_dummy,
                                   interrupt_dummy);

    // Ensure that peer_us_addr:bind_port is sent to the peer.
    const CService expected{peer_us_addr, bind_port};
    bool sent{false};

    const auto CaptureMessageOrig = CaptureMessage;
    CaptureMessage =
        [&sent, &expected](const CAddress &addr, const std::string &msg_type,
                           Span<const uint8_t> data, bool is_incoming) -> void {
        if (!is_incoming && msg_type == "addr") {
            CDataStream s(data, SER_NETWORK, PROTOCOL_VERSION);
            std::vector<CAddress> addresses;

            s >> addresses;

            for (const auto &deserialized_addr : addresses) {
                if (deserialized_addr == expected) {
                    sent = true;
                    return;
                }
            }
        }
    };

    m_node.peerman->SendMessages(config, &peer);

    BOOST_CHECK(sent);

    CaptureMessage = CaptureMessageOrig;
    chainman.ResetIbd();

    m_node.peerman->FinalizeNode(config, peer);

    m_node.args->ForceSetArg("-capturemessages", "0");
    m_node.args->ForceSetArg("-bind", "");
    // PeerManager::ProcessMessage() calls AddTimeData() which changes the
    // internal state in timedata.cpp and later confuses the test
    // "timedata_tests/addtimedata". Thus reset that state as it was before our
    // test was run.
    TestOnlyResetTimeData();
}

BOOST_AUTO_TEST_CASE(already_connected_to_address) {
    CConnmanTest connman(m_node.chainman->GetConfig(), 0x1337, 0x1337,
                         *m_node.addrman);

    CNetAddr ip1 = ip(GetRand<uint32_t>());
    CNetAddr ip2 = ip(GetRand<uint32_t>());
    BOOST_CHECK_NE(ip1.ToStringIP(), ip2.ToStringIP());

    CAddress ip1port1{{ip1, 2001}, NODE_NETWORK};
    CAddress ip1port2{{ip1, 2002}, NODE_NETWORK};
    CAddress ip2port1{{ip2, 2001}, NODE_NETWORK};

    BOOST_CHECK(!connman.AlreadyConnectedToAddress(ip1port1));
    connman.AddNode(ip1port1, ConnectionType::OUTBOUND_FULL_RELAY);
    BOOST_CHECK(connman.AlreadyConnectedToAddress(ip1port1));

    // Different IP, same port
    BOOST_CHECK(!connman.AlreadyConnectedToAddress(ip2port1));
    connman.AddNode(ip2port1, ConnectionType::OUTBOUND_FULL_RELAY);
    BOOST_CHECK(connman.AlreadyConnectedToAddress(ip2port1));

    // Same IP, different port
    BOOST_CHECK(connman.AlreadyConnectedToAddress(ip1port2));
}

BOOST_AUTO_TEST_SUITE_END()
