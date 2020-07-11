// Copyright (c) 2020 The Bitcoin developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <hash.h>
#include <primitives/block.h>
#include <protocol.h>
#include <seeder/messagewriter.h>
#include <streams.h>
#include <util/chaintype.h>
#include <version.h>

#include <boost/test/unit_test.hpp>

#include <string>
#include <vector>

BOOST_AUTO_TEST_SUITE(message_writer_tests)

template <typename... Args>
static void CheckMessage(CDataStream &expectedMessage, std::string command,
                         Args &&...args) {
    CDataStream message(SER_NETWORK, PROTOCOL_VERSION);
    MessageWriter::WriteMessage(message, command, std::forward<Args>(args)...);
    BOOST_CHECK_EQUAL(message.size(), expectedMessage.size());
    for (size_t i = 0; i < message.size(); i++) {
        BOOST_CHECK_EQUAL(uint8_t(message[i]), uint8_t(expectedMessage[i]));
    }
}

BOOST_AUTO_TEST_CASE(simple_header_and_payload_message_writer_test) {
    SelectParams(ChainType::MAIN);
    int64_t now = GetTime();
    uint64_t nonce = 0;
    uint64_t serviceFlags = uint64_t(ServiceFlags(NODE_NETWORK));
    CService service;
    CAddress addrTo(service, ServiceFlags(NODE_NETWORK));
    CAddress addrFrom(service, ServiceFlags(NODE_NETWORK));
    std::string user_agent = "/Bitcoin ABC:0.0.0(seeder)/";
    int start_height = 1;

    CDataStream versionPayload(SER_NETWORK, PROTOCOL_VERSION);
    // The following .reserve() call is a workaround for a spurious
    // [-Werror=stringop-overflow=] warning in gcc <= 12.2.
    // https://gcc.gnu.org/bugzilla/show_bug.cgi?id=100366#c20
    versionPayload.reserve(200);
    versionPayload << PROTOCOL_VERSION << serviceFlags << now << addrTo
                   << addrFrom << nonce << user_agent << start_height;

    CMessageHeader versionhdr(Params().NetMagic(), NetMsgType::VERSION,
                              versionPayload.size());
    uint256 hash = Hash(versionPayload);
    memcpy(versionhdr.pchChecksum, hash.begin(), CMessageHeader::CHECKSUM_SIZE);

    CDataStream expectedVersion(SER_NETWORK, PROTOCOL_VERSION);
    expectedVersion << versionhdr;
    expectedVersion.write(versionPayload);

    CheckMessage(expectedVersion, NetMsgType::VERSION, PROTOCOL_VERSION,
                 serviceFlags, now, addrTo, addrFrom, nonce, user_agent,
                 start_height);
}

BOOST_AUTO_TEST_CASE(header_empty_payload_message_writer_test) {
    SelectParams(ChainType::MAIN);
    CMessageHeader verackHeader(Params().NetMagic(), NetMsgType::VERACK, 0);
    CDataStream expectedVerack(SER_NETWORK, PROTOCOL_VERSION);
    // This is an empty payload, but is still necessary for the checksum
    std::vector<uint8_t> payload;
    uint256 hash = Hash(payload);
    memcpy(verackHeader.pchChecksum, hash.begin(),
           CMessageHeader::CHECKSUM_SIZE);
    expectedVerack << verackHeader;

    CheckMessage(expectedVerack, NetMsgType::VERACK);
}

BOOST_AUTO_TEST_CASE(write_getheaders_message_test) {
    SelectParams(ChainType::MAIN);
    CDataStream payload(SER_NETWORK, PROTOCOL_VERSION);
    BlockHash bhash(uint256S(
        "0000000099f5509b5f36b1926bcf82b21d936ebeadee811030dfbbb7fae915d7"));
    std::vector<BlockHash> vlocator(1, bhash);
    CBlockLocator locatorhash(std::move(vlocator));
    payload << locatorhash << uint256();
    uint256 hash = Hash(payload);

    CMessageHeader msgHeader(Params().NetMagic(), NetMsgType::GETHEADERS,
                             payload.size());
    memcpy(msgHeader.pchChecksum, hash.begin(), CMessageHeader::CHECKSUM_SIZE);

    CDataStream expectedMsg(SER_NETWORK, PROTOCOL_VERSION);
    expectedMsg << msgHeader;
    expectedMsg.write(payload);

    CheckMessage(expectedMsg, NetMsgType::GETHEADERS, locatorhash, uint256());
}

BOOST_AUTO_TEST_SUITE_END()
