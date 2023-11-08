// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <banman.h>
#include <chainparams.h>
#include <config.h>
#include <consensus/consensus.h>
#include <net.h>
#include <net_processing.h>
#include <protocol.h>
#include <scheduler.h>
#include <script/script.h>
#include <streams.h>
#include <txorphanage.h>
#include <validationinterface.h>
#include <version.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>
#include <test/util/mining.h>
#include <test/util/net.h>
#include <test/util/setup_common.h>

#include <atomic>
#include <cassert>
#include <chrono>
#include <cstdint>
#include <iosfwd>
#include <iostream>
#include <memory>
#include <string>
#include <vector>

namespace {

#ifdef MESSAGE_TYPE
#define TO_STRING_(s) #s
#define TO_STRING(s) TO_STRING_(s)
const std::string LIMIT_TO_MESSAGE_TYPE{TO_STRING(MESSAGE_TYPE)};
#else
const std::string LIMIT_TO_MESSAGE_TYPE;
#endif

const TestingSetup *g_setup;
} // namespace

void initialize() {
    static const auto testing_setup = MakeFuzzingContext<const TestingSetup>();
    g_setup = testing_setup.get();
    for (int i = 0; i < 2 * COINBASE_MATURITY; i++) {
        MineBlock(GetConfig(), g_setup->m_node, CScript() << OP_TRUE);
    }
    SyncWithValidationInterfaceQueue();
}

void test_one_input(const std::vector<uint8_t> &buffer) {
    const Config &config = GetConfig();
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    ConnmanTestMsg &connman = *(ConnmanTestMsg *)g_setup->m_node.connman.get();
    const std::string random_message_type{
        fuzzed_data_provider.ConsumeBytesAsString(CMessageHeader::COMMAND_SIZE)
            .c_str()};
    if (!LIMIT_TO_MESSAGE_TYPE.empty() &&
        random_message_type != LIMIT_TO_MESSAGE_TYPE) {
        return;
    }
    CDataStream random_bytes_data_stream{
        fuzzed_data_provider.ConsumeRemainingBytes<uint8_t>(), SER_NETWORK,
        PROTOCOL_VERSION};
    CNode &p2p_node =
        *std::make_unique<CNode>(
             0, INVALID_SOCKET,
             CAddress{CService{in_addr{0x0100007f}, 7777}, NODE_NETWORK}, 0, 0,
             0, CAddress{}, std::string{}, ConnectionType::OUTBOUND_FULL_RELAY,
             false)
             .release();
    p2p_node.fSuccessfullyConnected = true;
    p2p_node.nVersion = PROTOCOL_VERSION;
    p2p_node.SetCommonVersion(PROTOCOL_VERSION);
    connman.AddTestNode(p2p_node);
    g_setup->m_node.peerman->InitializeNode(
        config, p2p_node, ServiceFlags(NODE_NETWORK | NODE_BLOOM));
    try {
        g_setup->m_node.peerman->ProcessMessage(
            config, p2p_node, random_message_type, random_bytes_data_stream,
            GetTime<std::chrono::microseconds>(), std::atomic<bool>{false});
    } catch (const std::ios_base::failure &) {
    }
    SyncWithValidationInterfaceQueue();
    g_setup->m_node.connman->StopNodes();
}
