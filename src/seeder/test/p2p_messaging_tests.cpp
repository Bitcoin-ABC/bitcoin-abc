// Copyright (c) 2019 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <common/system.h>
#include <net_processing.h>
#include <protocol.h>
#include <seeder/bitcoin.h>
#include <seeder/db.h>
#include <seeder/test/util.h>
#include <serialize.h>
#include <streams.h>
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

    void setStartingHeight(int starting_height) {
        nStartingHeight = starting_height;
    };
};
} // namespace

static const uint16_t SERVICE_PORT = 18444;

struct SeederTestingSetup {
    SeederTestingSetup(const std::string chain = CBaseChainParams::REGTEST) {
        SelectParams(chain);
        CNetAddr ip;
        ip.SetInternal("bitcoin.test");
        CService service = {ip, SERVICE_PORT};
        vAddr.emplace_back(service, ServiceFlags());
        testNode = std::make_unique<CSeederNodeTest>(service, &vAddr);
    }

    std::vector<CAddress> vAddr;
    std::unique_ptr<CSeederNodeTest> testNode;
};

struct MainNetSeederTestingSetup : public SeederTestingSetup {
    MainNetSeederTestingSetup() : SeederTestingSetup(CBaseChainParams::MAIN) {}
};

BOOST_FIXTURE_TEST_SUITE(p2p_messaging_tests, SeederTestingSetup)

static const int SEEDER_INIT_VERSION = 0;

BOOST_AUTO_TEST_CASE(process_version_msg) {
    CDataStream versionMessage(SER_NETWORK, INIT_PROTO_VERSION);
    uint64_t serviceflags = ServiceFlags(NODE_NETWORK);
    CService addr_to = vAddr[0];
    uint64_t addr_to_services = vAddr[0].nServices;
    CService addr_from;
    uint64_t nonce = 0;
    std::string user_agent = "/Bitcoin ABC:0.0.0(seeder)/";

    // Don't include the time in CAddress serialization. See D14753.
    versionMessage << INIT_PROTO_VERSION << serviceflags << GetTime()
                   << addr_to_services << addr_to << serviceflags << addr_from
                   << nonce << user_agent << GetRequireHeight();

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

BOOST_AUTO_TEST_CASE(ban_too_many_headers) {
    // Process the maximum number of headers
    auto header = CBlockHeader{};
    CDataStream maxHeaderMessages(SER_NETWORK, 0);
    maxHeaderMessages.SetVersion(INIT_PROTO_VERSION);
    WriteCompactSize(maxHeaderMessages, MAX_HEADERS_RESULTS);
    for (size_t i = 0; i < MAX_HEADERS_RESULTS; i++) {
        maxHeaderMessages << header;
        WriteCompactSize(maxHeaderMessages, 0);
    }
    testNode->TestProcessMessage(NetMsgType::HEADERS, maxHeaderMessages,
                                 PeerMessagingState::AwaitingMessages);
    BOOST_CHECK_EQUAL(testNode->GetBan(), 0);

    // Process one too many headers
    CDataStream tooManyHeadersMessage(SER_NETWORK, 0);
    tooManyHeadersMessage.SetVersion(INIT_PROTO_VERSION);
    WriteCompactSize(tooManyHeadersMessage, MAX_HEADERS_RESULTS + 1);
    // The message processing will abort when seeing the excessive number of
    // headers from the compact size. No need to actually pack any header data.
    testNode->TestProcessMessage(NetMsgType::HEADERS, tooManyHeadersMessage,
                                 PeerMessagingState::Finished);
    BOOST_CHECK(testNode->GetBan() > 0);
}

BOOST_AUTO_TEST_CASE(empty_headers) {
    // Check that an empty headers message does not cause issues
    CDataStream zeroHeadersMessage(SER_NETWORK, 0);
    zeroHeadersMessage.SetVersion(INIT_PROTO_VERSION);
    WriteCompactSize(zeroHeadersMessage, 0);
    testNode->TestProcessMessage(NetMsgType::HEADERS, zeroHeadersMessage,
                                 PeerMessagingState::AwaitingMessages);
    BOOST_CHECK_EQUAL(testNode->GetBan(), 0);
}

BOOST_FIXTURE_TEST_CASE(good_checkpoint, MainNetSeederTestingSetup) {
    BlockHash recentCheckpoint =
        ::Params().Checkpoints().mapCheckpoints.rbegin()->second;
    int recentCheckpointHeight =
        ::Params().Checkpoints().mapCheckpoints.rbegin()->first;

    // Process a HEADERS message with a first header that immediately follows
    // our most recent checkpoint, check that it is accepted.
    auto header = CBlockHeader{};
    header.hashPrevBlock = recentCheckpoint;
    testNode->setStartingHeight(recentCheckpointHeight + 1);
    CDataStream headersOnCorrectChain(SER_NETWORK, 0);
    headersOnCorrectChain.SetVersion(INIT_PROTO_VERSION);
    WriteCompactSize(headersOnCorrectChain, 1);
    headersOnCorrectChain << header;
    testNode->TestProcessMessage(NetMsgType::HEADERS, headersOnCorrectChain,
                                 PeerMessagingState::AwaitingMessages);
    BOOST_CHECK_EQUAL(testNode->GetBan(), 0);

    // We just ignore HEADERS messages sent by nodes with a chaintip before our
    // most recent checkpoint.
    header.hashPrevBlock = BlockHash{};
    testNode->setStartingHeight(recentCheckpointHeight - 1);
    CDataStream shortHeaderChain(SER_NETWORK, 0);
    shortHeaderChain.SetVersion(INIT_PROTO_VERSION);
    WriteCompactSize(shortHeaderChain, 1);
    shortHeaderChain << header;
    testNode->TestProcessMessage(NetMsgType::HEADERS, shortHeaderChain,
                                 PeerMessagingState::AwaitingMessages);
    BOOST_CHECK_EQUAL(testNode->GetBan(), 0);

    // Process a HEADERS message with a first header that does not follow
    // our most recent checkpoint, check that the node is banned.
    header.hashPrevBlock = BlockHash{};
    testNode->setStartingHeight(recentCheckpointHeight + 1);
    CDataStream headersOnWrongChain(SER_NETWORK, 0);
    headersOnWrongChain.SetVersion(INIT_PROTO_VERSION);
    WriteCompactSize(headersOnWrongChain, 1);
    headersOnWrongChain << header;
    testNode->TestProcessMessage(NetMsgType::HEADERS, headersOnWrongChain,
                                 PeerMessagingState::Finished);
    BOOST_CHECK(testNode->GetBan() > 0);
}

BOOST_AUTO_TEST_SUITE_END()
