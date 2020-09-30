// Copyright (c) 2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <config.h>
#include <net.h>
#include <protocol.h>

#include <test/fuzz/fuzz.h>

#include <cassert>
#include <cstdint>
#include <limits>
#include <vector>

void initialize() {
    SelectParams(CBaseChainParams::REGTEST);
}

void test_one_input(const std::vector<uint8_t> &buffer) {
    const Config &config = GetConfig();
    V1TransportDeserializer deserializer{config.GetChainParams().NetMagic(),
                                         SER_NETWORK, INIT_PROTO_VERSION};
    Span<const char> msg_bytes{(const char *)buffer.data(), buffer.size()};
    while (msg_bytes.size() > 0) {
        const int handled = deserializer.Read(config, msg_bytes);
        if (handled < 0) {
            break;
        }
        if (deserializer.Complete()) {
            const std::chrono::microseconds m_time{
                std::numeric_limits<int64_t>::max()};
            const CNetMessage msg = deserializer.GetMessage(config, m_time);
            assert(msg.m_command.size() <= CMessageHeader::COMMAND_SIZE);
            assert(msg.m_raw_message_size <= buffer.size());
            assert(msg.m_raw_message_size ==
                   CMessageHeader::HEADER_SIZE + msg.m_message_size);
            assert(msg.m_time == m_time);
            if (msg.m_valid_header) {
                assert(msg.m_valid_netmagic);
            }
            if (!msg.m_valid_netmagic) {
                assert(!msg.m_valid_header);
            }
        }
    }
}
