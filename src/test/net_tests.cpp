// Copyright (c) 2012-2019 The Bitcoin Core developers
// Copyright (c) 2017-2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.
#include <net.h>

#include <addrdb.h>
#include <addrman.h>
#include <chainparams.h>
#include <clientversion.h>
#include <config.h>
#include <netbase.h>
#include <serialize.h>
#include <span.h>
#include <streams.h>
#include <util/strencodings.h>
#include <util/string.h>
#include <version.h>

#include <test/util/setup_common.h>

#include <boost/test/unit_test.hpp>

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <ios>
#include <memory>
#include <numeric>
#include <string>

class CAddrManSerializationMock : public CAddrMan {
public:
    virtual void Serialize(CDataStream &s) const = 0;

    //! Ensure that bucket placement is always the same for testing purposes.
    void MakeDeterministic() {
        nKey.SetNull();
        insecure_rand = FastRandomContext(true);
    }
};

class CAddrManUncorrupted : public CAddrManSerializationMock {
public:
    void Serialize(CDataStream &s) const override { CAddrMan::Serialize(s); }
};

class CAddrManCorrupted : public CAddrManSerializationMock {
public:
    void Serialize(CDataStream &s) const override {
        // Produces corrupt output that claims addrman has 20 addrs when it only
        // has one addr.
        uint8_t nVersion = 1;
        s << nVersion;
        s << uint8_t(32);
        s << nKey;
        s << 10; // nNew
        s << 10; // nTried

        int nUBuckets = ADDRMAN_NEW_BUCKET_COUNT ^ (1 << 30);
        s << nUBuckets;

        CService serv;
        BOOST_CHECK(Lookup("252.1.1.1", serv, 7777, false));
        CAddress addr = CAddress(serv, NODE_NONE);
        CNetAddr resolved;
        BOOST_CHECK(LookupHost("252.2.2.2", resolved, false));
        CAddrInfo info = CAddrInfo(addr, resolved);
        s << info;
    }
};

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

static CDataStream AddrmanToStream(CAddrManSerializationMock &_addrman) {
    CDataStream ssPeersIn(SER_DISK, CLIENT_VERSION);
    ssPeersIn << Params().DiskMagic();
    ssPeersIn << _addrman;
    std::string str = ssPeersIn.str();
    std::vector<uint8_t> vchData(str.begin(), str.end());
    return CDataStream(vchData, SER_DISK, CLIENT_VERSION);
}

BOOST_FIXTURE_TEST_SUITE(net_tests, BasicTestingSetup)

BOOST_AUTO_TEST_CASE(cnode_listen_port) {
    // test default
    uint16_t port = GetListenPort();
    BOOST_CHECK(port == Params().GetDefaultPort());
    // test set port
    uint16_t altPort = 12345;
    BOOST_CHECK(gArgs.SoftSetArg("-port", ToString(altPort)));
    port = GetListenPort();
    BOOST_CHECK(port == altPort);
}

BOOST_AUTO_TEST_CASE(caddrdb_read) {
    CAddrManUncorrupted addrmanUncorrupted;
    addrmanUncorrupted.MakeDeterministic();

    CService addr1, addr2, addr3;
    BOOST_CHECK(Lookup("250.7.1.1", addr1, 8333, false));
    BOOST_CHECK(Lookup("250.7.2.2", addr2, 9999, false));
    BOOST_CHECK(Lookup("250.7.3.3", addr3, 9999, false));
    BOOST_CHECK(Lookup(std::string("250.7.3.3", 9), addr3, 9999, false));
    BOOST_CHECK(
        !Lookup(std::string("250.7.3.3\0example.com", 21), addr3, 9999, false));

    // Add three addresses to new table.
    CService source;
    BOOST_CHECK(Lookup("252.5.1.1", source, 8333, false));
    BOOST_CHECK(addrmanUncorrupted.Add(CAddress(addr1, NODE_NONE), source));
    BOOST_CHECK(addrmanUncorrupted.Add(CAddress(addr2, NODE_NONE), source));
    BOOST_CHECK(addrmanUncorrupted.Add(CAddress(addr3, NODE_NONE), source));

    // Test that the de-serialization does not throw an exception.
    CDataStream ssPeers1 = AddrmanToStream(addrmanUncorrupted);
    bool exceptionThrown = false;
    CAddrMan addrman1;

    BOOST_CHECK(addrman1.size() == 0);
    try {
        uint8_t pchMsgTmp[4];
        ssPeers1 >> pchMsgTmp;
        ssPeers1 >> addrman1;
    } catch (const std::exception &) {
        exceptionThrown = true;
    }

    BOOST_CHECK(addrman1.size() == 3);
    BOOST_CHECK(exceptionThrown == false);

    // Test that CAddrDB::Read creates an addrman with the correct number of
    // addrs.
    CDataStream ssPeers2 = AddrmanToStream(addrmanUncorrupted);

    CAddrMan addrman2;
    CAddrDB adb(Params());
    BOOST_CHECK(addrman2.size() == 0);
    BOOST_CHECK(adb.Read(addrman2, ssPeers2));
    BOOST_CHECK(addrman2.size() == 3);
}

BOOST_AUTO_TEST_CASE(caddrdb_read_corrupted) {
    CAddrManCorrupted addrmanCorrupted;
    addrmanCorrupted.MakeDeterministic();

    // Test that the de-serialization of corrupted addrman throws an exception.
    CDataStream ssPeers1 = AddrmanToStream(addrmanCorrupted);
    bool exceptionThrown = false;
    CAddrMan addrman1;
    BOOST_CHECK(addrman1.size() == 0);
    try {
        uint8_t pchMsgTmp[4];
        ssPeers1 >> pchMsgTmp;
        ssPeers1 >> addrman1;
    } catch (const std::exception &) {
        exceptionThrown = true;
    }
    // Even through de-serialization failed addrman is not left in a clean
    // state.
    BOOST_CHECK(addrman1.size() == 1);
    BOOST_CHECK(exceptionThrown);

    // Test that CAddrDB::Read leaves addrman in a clean state if
    // de-serialization fails.
    CDataStream ssPeers2 = AddrmanToStream(addrmanCorrupted);

    CAddrMan addrman2;
    CAddrDB adb(Params());
    BOOST_CHECK(addrman2.size() == 0);
    BOOST_CHECK(!adb.Read(addrman2, ssPeers2));
    BOOST_CHECK(addrman2.size() == 0);
}

BOOST_AUTO_TEST_CASE(cnode_simple_test) {
    SOCKET hSocket = INVALID_SOCKET;
    NodeId id = 0;
    int height = 0;

    in_addr ipv4Addr;
    ipv4Addr.s_addr = 0xa0b0c001;

    CAddress addr = CAddress(CService(ipv4Addr, 7777), NODE_NETWORK);
    std::string pszDest;

    auto pnode1 = std::make_unique<CNode>(id++, NODE_NETWORK, height, hSocket,
                                          addr, 0, 0, 0, CAddress(), pszDest,
                                          ConnectionType::OUTBOUND_FULL_RELAY);
    BOOST_CHECK(pnode1->IsFullOutboundConn() == true);
    BOOST_CHECK(pnode1->IsManualConn() == false);
    BOOST_CHECK(pnode1->IsBlockOnlyConn() == false);
    BOOST_CHECK(pnode1->IsFeelerConn() == false);
    BOOST_CHECK(pnode1->IsAddrFetchConn() == false);
    BOOST_CHECK(pnode1->IsInboundConn() == false);

    auto pnode2 = std::make_unique<CNode>(id++, NODE_NETWORK, height, hSocket,
                                          addr, 1, 1, 1, CAddress(), pszDest,
                                          ConnectionType::INBOUND);
    BOOST_CHECK(pnode2->IsFullOutboundConn() == false);
    BOOST_CHECK(pnode2->IsManualConn() == false);
    BOOST_CHECK(pnode2->IsBlockOnlyConn() == false);
    BOOST_CHECK(pnode2->IsFeelerConn() == false);
    BOOST_CHECK(pnode2->IsAddrFetchConn() == false);
    BOOST_CHECK(pnode2->IsInboundConn() == true);
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

    // TORv2
    BOOST_REQUIRE(addr.SetSpecial("6hzph5hv6337r6p2.onion"));
    BOOST_REQUIRE(addr.IsValid());
    BOOST_REQUIRE(addr.IsTor());

    BOOST_CHECK(!addr.IsBindAny());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "6hzph5hv6337r6p2.onion");

    // TORv3
    const char *torv3_addr =
        "pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscryd.onion";
    BOOST_REQUIRE(addr.SetSpecial(torv3_addr));
    BOOST_REQUIRE(addr.IsValid());
    BOOST_REQUIRE(addr.IsTor());

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
    s << MakeSpan(ParseHex("01"          // network type (IPv4)
                           "04"          // address length
                           "01020304")); // address
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsIPv4());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "1.2.3.4");
    BOOST_REQUIRE(s.empty());

    // Invalid IPv4, valid length but address itself is shorter.
    s << MakeSpan(ParseHex("01"      // network type (IPv4)
                           "04"      // address length
                           "0102")); // address
    BOOST_CHECK_EXCEPTION(s >> addr, std::ios_base::failure,
                          HasReason("end of data"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Invalid IPv4, with bogus length.
    s << MakeSpan(ParseHex("01"          // network type (IPv4)
                           "05"          // address length
                           "01020304")); // address
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 IPv4 address with length 5 (should be 4)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Invalid IPv4, with extreme length.
    s << MakeSpan(ParseHex("01"          // network type (IPv4)
                           "fd0102"      // address length (513 as CompactSize)
                           "01020304")); // address
    BOOST_CHECK_EXCEPTION(s >> addr, std::ios_base::failure,
                          HasReason("Address too long: 513 > 512"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Valid IPv6.
    s << MakeSpan(ParseHex("02" // network type (IPv6)
                           "10" // address length
                           "0102030405060708090a0b0c0d0e0f10")); // address
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsIPv6());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "102:304:506:708:90a:b0c:d0e:f10");
    BOOST_REQUIRE(s.empty());

    // Valid IPv6, contains embedded "internal".
    s << MakeSpan(
        ParseHex("02"                                  // network type (IPv6)
                 "10"                                  // address length
                 "fd6b88c08724ca978112ca1bbdcafac2")); // address: 0xfd +
                                                       // sha256("bitcoin")[0:5]
                                                       // + sha256(name)[0:10]
    s >> addr;
    BOOST_CHECK(addr.IsInternal());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "zklycewkdo64v6wc.internal");
    BOOST_REQUIRE(s.empty());

    // Invalid IPv6, with bogus length.
    s << MakeSpan(ParseHex("02"    // network type (IPv6)
                           "04"    // address length
                           "00")); // address
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 IPv6 address with length 4 (should be 16)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Invalid IPv6, contains embedded IPv4.
    s << MakeSpan(ParseHex("02" // network type (IPv6)
                           "10" // address length
                           "00000000000000000000ffff01020304")); // address
    s >> addr;
    BOOST_CHECK(!addr.IsValid());
    BOOST_REQUIRE(s.empty());

    // Invalid IPv6, contains embedded TORv2.
    s << MakeSpan(ParseHex("02" // network type (IPv6)
                           "10" // address length
                           "fd87d87eeb430102030405060708090a")); // address
    s >> addr;
    BOOST_CHECK(!addr.IsValid());
    BOOST_REQUIRE(s.empty());

    // Valid TORv2.
    s << MakeSpan(ParseHex("03"                      // network type (TORv2)
                           "0a"                      // address length
                           "f1f2f3f4f5f6f7f8f9fa")); // address
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsTor());
    BOOST_CHECK(addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "6hzph5hv6337r6p2.onion");
    BOOST_REQUIRE(s.empty());

    // Invalid TORv2, with bogus length.
    s << MakeSpan(ParseHex("03"    // network type (TORv2)
                           "07"    // address length
                           "00")); // address
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 TORv2 address with length 7 (should be 10)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Valid TORv3.
    s << MakeSpan(ParseHex("04" // network type (TORv3)
                           "20" // address length
                           "79bcc625184b05194975c28b66b66b04" // address
                           "69f7f6556fb1ac3189a79b40dda32f1f"));
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsTor());
    BOOST_CHECK(!addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(
        addr.ToString(),
        "pg6mmjiyjmcrsslvykfwnntlaru7p5svn6y2ymmju6nubxndf4pscryd.onion");
    BOOST_REQUIRE(s.empty());

    // Invalid TORv3, with bogus length.
    s << MakeSpan(ParseHex("04" // network type (TORv3)
                           "00" // address length
                           "00" // address
                           ));
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 TORv3 address with length 0 (should be 32)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Valid I2P.
    s << MakeSpan(ParseHex("05" // network type (I2P)
                           "20" // address length
                           "a2894dabaec08c0051a481a6dac88b64" // address
                           "f98232ae42d4b6fd2fa81952dfe36a87"));
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsI2P());
    BOOST_CHECK(!addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(
        addr.ToString(),
        "ukeu3k5oycgaauneqgtnvselmt4yemvoilkln7jpvamvfx7dnkdq.b32.i2p");
    BOOST_REQUIRE(s.empty());

    // Invalid I2P, with bogus length.
    s << MakeSpan(ParseHex("05" // network type (I2P)
                           "03" // address length
                           "00" // address
                           ));
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 I2P address with length 3 (should be 32)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Valid CJDNS.
    s << MakeSpan(ParseHex("06" // network type (CJDNS)
                           "10" // address length
                           "fc000001000200030004000500060007" // address
                           ));
    s >> addr;
    BOOST_CHECK(addr.IsValid());
    BOOST_CHECK(addr.IsCJDNS());
    BOOST_CHECK(!addr.IsAddrV1Compatible());
    BOOST_CHECK_EQUAL(addr.ToString(), "fc00:1:2:3:4:5:6:7");
    BOOST_REQUIRE(s.empty());

    // Invalid CJDNS, with bogus length.
    s << MakeSpan(ParseHex("06" // network type (CJDNS)
                           "01" // address length
                           "00" // address
                           ));
    BOOST_CHECK_EXCEPTION(
        s >> addr, std::ios_base::failure,
        HasReason("BIP155 CJDNS address with length 1 (should be 16)"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Unknown, with extreme length.
    s << MakeSpan(
        ParseHex("aa"             // network type (unknown)
                 "fe00000002"     // address length (CompactSize's MAX_SIZE)
                 "01020304050607" // address
                 ));
    BOOST_CHECK_EXCEPTION(s >> addr, std::ios_base::failure,
                          HasReason("Address too long: 33554432 > 512"));
    BOOST_REQUIRE(!s.empty()); // The stream is not consumed on invalid input.
    s.clear();

    // Unknown, with reasonable length.
    s << MakeSpan(ParseHex("aa"       // network type (unknown)
                           "04"       // address length
                           "01020304" // address
                           ));
    s >> addr;
    BOOST_CHECK(!addr.IsValid());
    BOOST_REQUIRE(s.empty());

    // Unknown, with zero length.
    s << MakeSpan(ParseHex("aa" // network type (unknown)
                           "00" // address length
                           ""   // address
                           ));
    s >> addr;
    BOOST_CHECK(!addr.IsValid());
    BOOST_REQUIRE(s.empty());
}

// prior to PR #14728, this test triggers an undefined behavior
BOOST_AUTO_TEST_CASE(ipv4_peer_with_ipv6_addrMe_test) {
    // set up local addresses; all that's necessary to reproduce the bug is
    // that a normal IPv4 address is among the entries, but if this address is
    // !IsRoutable the undefined behavior is easier to trigger deterministically
    {
        LOCK(cs_mapLocalHost);
        in_addr ipv4AddrLocal;
        ipv4AddrLocal.s_addr = 0x0100007f;
        CNetAddr addr = CNetAddr(ipv4AddrLocal);
        LocalServiceInfo lsi;
        lsi.nScore = 23;
        lsi.nPort = 42;
        mapLocalHost[addr] = lsi;
    }

    // create a peer with an IPv4 address
    in_addr ipv4AddrPeer;
    ipv4AddrPeer.s_addr = 0xa0b0c001;
    CAddress addr = CAddress(CService(ipv4AddrPeer, 7777), NODE_NETWORK);
    std::unique_ptr<CNode> pnode = std::make_unique<CNode>(
        0, NODE_NETWORK, 0, INVALID_SOCKET, addr, 0, 0, 0, CAddress{},
        std::string{}, ConnectionType::OUTBOUND_FULL_RELAY);
    pnode->fSuccessfullyConnected.store(true);

    // the peer claims to be reaching us via IPv6
    in6_addr ipv6AddrLocal;
    memset(ipv6AddrLocal.s6_addr, 0, 16);
    ipv6AddrLocal.s6_addr[0] = 0xcc;
    CAddress addrLocal = CAddress(CService(ipv6AddrLocal, 7777), NODE_NETWORK);
    pnode->SetAddrLocal(addrLocal);

    // before patch, this causes undefined behavior detectable with clang's
    // -fsanitize=memory
    AdvertiseLocal(&*pnode);

    // suppress no-checks-run warning; if this test fails, it's by triggering a
    // sanitizer
    BOOST_CHECK(1);
}

BOOST_AUTO_TEST_CASE(PoissonNextSend) {
    g_mock_deterministic_tests = true;

    int64_t now = 5000;
    int average_interval_seconds = 600;

    auto poisson = ::PoissonNextSend(now, average_interval_seconds);
    std::chrono::microseconds poisson_chrono =
        ::PoissonNextSend(std::chrono::microseconds{now},
                          std::chrono::seconds{average_interval_seconds});

    BOOST_CHECK_EQUAL(poisson, poisson_chrono.count());

    g_mock_deterministic_tests = false;
}

std::vector<NodeEvictionCandidate>
GetRandomNodeEvictionCandidates(const int n_candidates,
                                FastRandomContext &random_context) {
    std::vector<NodeEvictionCandidate> candidates;
    for (int id = 0; id < n_candidates; ++id) {
        candidates.push_back({
            /* id */ id,
            /* nTimeConnected */
            static_cast<int64_t>(random_context.randrange(100)),
            /* nMinPingUsecTime */
            static_cast<int64_t>(random_context.randrange(100)),
            /* nLastBlockTime */
            static_cast<int64_t>(random_context.randrange(100)),
            /* nLastProofTime */
            static_cast<int64_t>(random_context.randrange(100)),
            /* nLastTXTime */
            static_cast<int64_t>(random_context.randrange(100)),
            /* fRelevantServices */ random_context.randbool(),
            /* fRelayTxes */ random_context.randbool(),
            /* fBloomFilter */ random_context.randbool(),
            /* nKeyedNetGroup */ random_context.randrange(100),
            /* prefer_evict */ random_context.randbool(),
            /* m_is_local */ random_context.randbool(),
            /* availabilityScore */ double(random_context.randrange(-1)),
        });
    }
    return candidates;
}

// Returns true if any of the node ids in node_ids are selected for eviction.
bool IsEvicted(std::vector<NodeEvictionCandidate> candidates,
               const std::vector<NodeId> &node_ids,
               FastRandomContext &random_context) {
    Shuffle(candidates.begin(), candidates.end(), random_context);
    const std::optional<NodeId> evicted_node_id =
        SelectNodeToEvict(std::move(candidates));
    if (!evicted_node_id) {
        return false;
    }
    return std::find(node_ids.begin(), node_ids.end(), *evicted_node_id) !=
           node_ids.end();
}

// Create number_of_nodes random nodes, apply setup function candidate_setup_fn,
// apply eviction logic and then return true if any of the node ids in node_ids
// are selected for eviction.
bool IsEvicted(const int number_of_nodes,
               std::function<void(NodeEvictionCandidate &)> candidate_setup_fn,
               const std::vector<NodeId> &node_ids,
               FastRandomContext &random_context) {
    std::vector<NodeEvictionCandidate> candidates =
        GetRandomNodeEvictionCandidates(number_of_nodes, random_context);
    for (NodeEvictionCandidate &candidate : candidates) {
        candidate_setup_fn(candidate);
    }
    return IsEvicted(candidates, node_ids, random_context);
}

namespace {
constexpr int NODE_EVICTION_TEST_ROUNDS{10};
constexpr int NODE_EVICTION_TEST_UP_TO_N_NODES{200};
} // namespace

BOOST_AUTO_TEST_CASE(node_eviction_test) {
    FastRandomContext random_context{true};

    for (int i = 0; i < NODE_EVICTION_TEST_ROUNDS; ++i) {
        for (int number_of_nodes = 0;
             number_of_nodes < NODE_EVICTION_TEST_UP_TO_N_NODES;
             ++number_of_nodes) {
            // Four nodes with the highest keyed netgroup values should be
            // protected from eviction.
            BOOST_CHECK(!IsEvicted(
                number_of_nodes,
                [number_of_nodes](NodeEvictionCandidate &candidate) {
                    candidate.nKeyedNetGroup = number_of_nodes - candidate.id;
                },
                {0, 1, 2, 3}, random_context));

            // Eight nodes with the lowest minimum ping time should be protected
            // from eviction.
            BOOST_CHECK(!IsEvicted(
                number_of_nodes,
                [](NodeEvictionCandidate &candidate) {
                    candidate.nMinPingUsecTime = candidate.id;
                },
                {0, 1, 2, 3, 4, 5, 6, 7}, random_context));

            // Four nodes that most recently sent us novel transactions accepted
            // into our mempool should be protected from eviction.
            BOOST_CHECK(!IsEvicted(
                number_of_nodes,
                [number_of_nodes](NodeEvictionCandidate &candidate) {
                    candidate.nLastTXTime = number_of_nodes - candidate.id;
                },
                {0, 1, 2, 3}, random_context));

            // Four nodes that most recently sent us novel proofs accepted
            // into our proof pool should be protected from eviction.
            BOOST_CHECK(!IsEvicted(
                number_of_nodes,
                [number_of_nodes](NodeEvictionCandidate &candidate) {
                    candidate.nLastProofTime = number_of_nodes - candidate.id;
                },
                {0, 1, 2, 3}, random_context));

            // Up to eight non-tx-relay peers that most recently sent us novel
            // blocks should be protected from eviction.
            BOOST_CHECK(!IsEvicted(
                number_of_nodes,
                [number_of_nodes](NodeEvictionCandidate &candidate) {
                    candidate.nLastBlockTime = number_of_nodes - candidate.id;
                    if (candidate.id <= 7) {
                        candidate.fRelayTxes = false;
                        candidate.fRelevantServices = true;
                    }
                },
                {0, 1, 2, 3, 4, 5, 6, 7}, random_context));

            // Four peers that most recently sent us novel blocks should be
            // protected from eviction.
            BOOST_CHECK(!IsEvicted(
                number_of_nodes,
                [number_of_nodes](NodeEvictionCandidate &candidate) {
                    candidate.nLastBlockTime = number_of_nodes - candidate.id;
                },
                {0, 1, 2, 3}, random_context));

            // Combination of the previous two tests.
            BOOST_CHECK(!IsEvicted(
                number_of_nodes,
                [number_of_nodes](NodeEvictionCandidate &candidate) {
                    candidate.nLastBlockTime = number_of_nodes - candidate.id;
                    if (candidate.id <= 7) {
                        candidate.fRelayTxes = false;
                        candidate.fRelevantServices = true;
                    }
                },
                {0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11}, random_context));

            // Combination of all tests above.
            BOOST_CHECK(!IsEvicted(
                number_of_nodes,
                [number_of_nodes](NodeEvictionCandidate &candidate) {
                    candidate.nKeyedNetGroup =
                        number_of_nodes - candidate.id;        // 4 protected
                    candidate.nMinPingUsecTime = candidate.id; // 8 protected
                    candidate.nLastTXTime =
                        number_of_nodes - candidate.id; // 4 protected
                    candidate.nLastProofTime =
                        number_of_nodes - candidate.id; // 4 protected
                    candidate.nLastBlockTime =
                        number_of_nodes - candidate.id; // 4 protected
                },
                {0,  1,  2,  3,  4,  5,  6,  7,  8,  9,  10, 11,
                 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23},
                random_context));

            // 128 peers with the highest availability score should be protected
            // from eviction.
            std::vector<NodeId> protectedNodes(128);
            std::iota(protectedNodes.begin(), protectedNodes.end(), 0);
            BOOST_CHECK(!IsEvicted(
                number_of_nodes,
                [number_of_nodes](NodeEvictionCandidate &candidate) {
                    candidate.availabilityScore =
                        double(number_of_nodes - candidate.id);
                },
                protectedNodes, random_context));

            // An eviction is expected given >= 161 random eviction candidates.
            // The eviction logic protects at most four peers by net group,
            // eight by lowest ping time, four by last time of novel tx, four by
            // last time of novel proof, up to eight non-tx-relay peers by last
            // novel block time, four by last novel block time, and 128 more by
            // avalanche availability score.
            if (number_of_nodes >= 161) {
                BOOST_CHECK(SelectNodeToEvict(GetRandomNodeEvictionCandidates(
                    number_of_nodes, random_context)));
            }

            // No eviction is expected given <= 24 random eviction candidates.
            // The eviction logic protects at least four peers by net group,
            // eight by lowest ping time, four by last time of novel tx, four by
            // last time of novel proof, four peers by last novel block time.
            if (number_of_nodes <= 24) {
                BOOST_CHECK(!SelectNodeToEvict(GetRandomNodeEvictionCandidates(
                    number_of_nodes, random_context)));
            }

            // Cases left to test:
            // * "Protect the half of the remaining nodes which have been
            // connected the longest. [...]"
            // * "Pick out up to 1/4 peers that are localhost, sorted by longest
            // uptime. [...]"
            // * "If any remaining peers are preferred for eviction consider
            // only them. [...]"
            // * "Identify the network group with the most connections and
            // youngest member. [...]"
        }
    }
}

BOOST_AUTO_TEST_CASE(avalanche_statistics) {
    const uint32_t step = AVALANCHE_STATISTICS_REFRESH_PERIOD.count();
    const uint32_t tau = AVALANCHE_STATISTICS_TIME_CONSTANT.count();

    CNode::AvalancheState avastats;

    double previousScore = avastats.getAvailabilityScore();
    BOOST_CHECK_SMALL(previousScore, 1e-6);

    // Check the statistics follow an exponential response for 1 to 10 tau
    for (size_t i = 1; i <= 10; i++) {
        for (uint32_t j = 0; j < tau; j += step) {
            avastats.invsPolled(1);
            // Always respond to everything correctly
            avastats.invsVoted(1);

            avastats.updateAvailabilityScore();

            // Expect a monotonic rise
            double currentScore = avastats.getAvailabilityScore();
            BOOST_CHECK_GE(currentScore, previousScore);
            previousScore = currentScore;
        }

        // We expect (1 - e^-i) after i * tau. The tolerance is expressed
        // as a percentage, and we add a (large) 0.1% margin to account for
        // floating point errors.
        BOOST_CHECK_CLOSE(previousScore, -1 * std::expm1(-1. * i), 100.1 / tau);
    }

    // After 10 tau we should be very close to 100% (about 99.995%)
    BOOST_CHECK_CLOSE(previousScore, 1., 0.01);

    for (size_t i = 1; i <= 3; i++) {
        for (uint32_t j = 0; j < tau; j += step) {
            avastats.invsPolled(2);

            // Stop responding to the polls.
            avastats.invsVoted(1);

            avastats.updateAvailabilityScore();

            // Expect a monotonic fall
            double currentScore = avastats.getAvailabilityScore();
            BOOST_CHECK_LE(currentScore, previousScore);
            previousScore = currentScore;
        }

        // There is a slight error in the expected value because we did not
        // start the decay at exactly 100%, but the 0.1% margin is at least an
        // order of magnitude larger than the expected error so it doesn't
        // matter.
        BOOST_CHECK_CLOSE(previousScore, 1. + std::expm1(-1. * i), 100.1 / tau);
    }

    // After 3 more tau we should be under 5%
    BOOST_CHECK_LT(previousScore, .05);
}

BOOST_AUTO_TEST_SUITE_END()
