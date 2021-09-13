// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <protocol.h>
#include <seeder/bitcoin.h>
#include <seeder/db.h>
#include <seeder/test/util.h>
#include <serialize.h>
#include <streams.h>
#include <util/system.h>
#include <version.h>

#include <boost/test/unit_test.hpp>

#include <cstdint>
#include <memory>
#include <ostream>
#include <string>
#include <vector>

std::ostream &operator<<(std::ostream &os, const PeerMessagingState &state) {
    os << to_integral(state);
    return os;
}

namespace {
class CSeederNodeTest : public CSeederNode {
public:
    CSeederNodeTest(const CService &service, std::vector<CAddress> *vAddrIn)
        : CSeederNode(service, vAddrIn) {}

    void TestProcessMessage(const std::string &strCommand, CDataStream &message,
                            PeerMessagingState expectedState) {
        PeerMessagingState ret = ProcessMessage(strCommand, message);
        BOOST_CHECK_EQUAL(ret, expectedState);
    }

    CDataStream getSendBuffer() { return vSend; }
};
} // namespace

static const uint16_t SERVICE_PORT = 18444;

struct SeederTestingSetup {
    SeederTestingSetup() {
        SelectParams(CBaseChainParams::REGTEST);
        CNetAddr ip;
        ip.SetInternal("bitcoin.test");
        CService service = {ip, SERVICE_PORT};
        vAddr.emplace_back(service, ServiceFlags());
        testNode = std::make_unique<CSeederNodeTest>(service, &vAddr);
    }

    std::vector<CAddress> vAddr;
    std::unique_ptr<CSeederNodeTest> testNode;
};

BOOST_FIXTURE_TEST_SUITE(p2p_messaging_tests, SeederTestingSetup)

static CDataStream
CreateVersionMessage(int64_t now, CAddress addrTo, CAddress addrFrom,
                     int32_t start_height, uint32_t nVersion,
                     uint64_t nonce = 0,
                     std::string user_agent = "/Bitcoin ABC:0.0.0(seeder)/") {
    CDataStream payload(SER_NETWORK, 0);
    payload.SetVersion(nVersion);
    ServiceFlags serviceflags = ServiceFlags(NODE_NETWORK);
    payload << nVersion << uint64_t(serviceflags) << now << addrTo << addrFrom
            << nonce << user_agent << start_height;
    return payload;
}

static const int SEEDER_INIT_VERSION = 0;

BOOST_AUTO_TEST_CASE(process_version_msg) {
    CService serviceFrom;
    CAddress addrFrom(serviceFrom, ServiceFlags(NODE_NETWORK));

    CDataStream versionMessage = CreateVersionMessage(
        GetTime(), vAddr[0], addrFrom, GetRequireHeight(), INIT_PROTO_VERSION);

    // Verify the version is set as the initial value
    BOOST_CHECK_EQUAL(testNode->CSeederNode::GetClientVersion(),
                      SEEDER_INIT_VERSION);
    testNode->TestProcessMessage(NetMsgType::VERSION, versionMessage,
                                 PeerMessagingState::AwaitingMessages);
    // Verify the version has been updated
    BOOST_CHECK_EQUAL(testNode->CSeederNode::GetClientVersion(),
                      versionMessage.GetVersion());
}

BOOST_AUTO_TEST_CASE(process_verack_msg) {
    CDataStream verackMessage(SER_NETWORK, 0);
    verackMessage.SetVersion(INIT_PROTO_VERSION);
    testNode->TestProcessMessage(NetMsgType::VERACK, verackMessage,
                                 PeerMessagingState::AwaitingMessages);

    // Seeder should respond with an ADDR message
    const CMessageHeader::MessageMagic netMagic = Params().NetMagic();
    CMessageHeader header(netMagic);
    CDataStream sendBuffer = testNode->getSendBuffer();
    sendBuffer >> header;
    BOOST_CHECK(header.IsValidWithoutConfig(netMagic));
    BOOST_CHECK_EQUAL(header.GetCommand(), NetMsgType::GETADDR);

    // Next message should be GETHEADERS
    sendBuffer >> header;
    BOOST_CHECK(header.IsValidWithoutConfig(netMagic));
    BOOST_CHECK_EQUAL(header.GetCommand(), NetMsgType::GETHEADERS);

    CBlockLocator locator;
    uint256 hashStop;
    sendBuffer >> locator >> hashStop;
    std::vector<BlockHash> expectedLocator = {
        Params().Checkpoints().mapCheckpoints.rbegin()->second};
    BOOST_CHECK(locator.vHave == expectedLocator);
    BOOST_CHECK(hashStop == uint256());
}

static CDataStream CreateAddrMessage(std::vector<CAddress> sendAddrs,
                                     uint32_t nVersion = INIT_PROTO_VERSION) {
    CDataStream payload(SER_NETWORK, 0);
    payload.SetVersion(nVersion);
    payload << sendAddrs;
    return payload;
}

BOOST_AUTO_TEST_CASE(process_addr_msg) {
    // vAddrs starts with 1 entry.
    std::vector<CAddress> sendAddrs(ADDR_SOFT_CAP - 1, vAddr[0]);

    // Happy path
    // addrs are added normally to vAddr until ADDR_SOFT_CAP is reached.
    // Add addrs up to the soft cap.
    CDataStream addrMessage = CreateAddrMessage(sendAddrs);
    BOOST_CHECK_EQUAL(1, vAddr.size());
    testNode->TestProcessMessage(NetMsgType::ADDR, addrMessage,
                                 PeerMessagingState::AwaitingMessages);
    BOOST_CHECK_EQUAL(ADDR_SOFT_CAP, vAddr.size());

    // ADDR_SOFT_CAP is exceeded
    sendAddrs.resize(1);
    addrMessage = CreateAddrMessage(sendAddrs);
    testNode->TestProcessMessage(NetMsgType::ADDR, addrMessage,
                                 PeerMessagingState::Finished);
    BOOST_CHECK_EQUAL(ADDR_SOFT_CAP + 1, vAddr.size());

    // Test the seeder's behavior after ADDR_SOFT_CAP addrs
    // Only one addr per ADDR message will be added, the rest are ignored
    size_t expectedSize = vAddr.size() + 1;
    for (size_t i = 1; i < 10; i++) {
        sendAddrs.resize(i, sendAddrs[0]);
        addrMessage = CreateAddrMessage(sendAddrs);
        testNode->TestProcessMessage(NetMsgType::ADDR, addrMessage,
                                     PeerMessagingState::Finished);
        BOOST_CHECK_EQUAL(expectedSize, vAddr.size());
        ++expectedSize;
    }
}

BOOST_AUTO_TEST_SUITE_END()
