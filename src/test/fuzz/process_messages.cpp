// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>
#include <consensus/consensus.h>
#include <net.h>
#include <net_processing.h>
#include <protocol.h>
#include <validation.h>
#include <validationinterface.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>
#include <test/util/mining.h>
#include <test/util/net.h>
#include <test/util/setup_common.h>

namespace {
const TestingSetup *g_setup;
} // namespace

void initialize_process_messages() {
    static const auto testing_setup =
        MakeNoLogFileContext<const TestingSetup>();
    g_setup = testing_setup.get();
    for (int i = 0; i < 2 * COINBASE_MATURITY; i++) {
        MineBlock(GetConfig(), g_setup->m_node, CScript() << OP_TRUE);
    }
    SyncWithValidationInterfaceQueue();
}

FUZZ_TARGET_INIT(process_messages, initialize_process_messages) {
    const Config &config = GetConfig();
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());

    ConnmanTestMsg &connman = *(ConnmanTestMsg *)g_setup->m_node.connman.get();
    std::vector<CNode *> peers;

    LOCK(NetEventsInterface::g_msgproc_mutex);

    const auto num_peers_to_add =
        fuzzed_data_provider.ConsumeIntegralInRange(1, 3);
    for (int i = 0; i < num_peers_to_add; ++i) {
        const ServiceFlags service_flags =
            ServiceFlags(fuzzed_data_provider.ConsumeIntegral<uint64_t>());
        peers.push_back(
            ConsumeNodeAsUniquePtr(fuzzed_data_provider, i).release());
        CNode &p2p_node = *peers.back();

        p2p_node.fSuccessfullyConnected = true;
        p2p_node.fPauseSend = false;
        p2p_node.nVersion = PROTOCOL_VERSION;
        p2p_node.SetCommonVersion(PROTOCOL_VERSION);
        g_setup->m_node.peerman->InitializeNode(config, p2p_node,
                                                service_flags);

        connman.AddTestNode(p2p_node);
    }

    while (fuzzed_data_provider.ConsumeBool()) {
        const std::string random_message_type{
            fuzzed_data_provider
                .ConsumeBytesAsString(CMessageHeader::MESSAGE_TYPE_SIZE)
                .c_str()};

        CSerializedNetMsg net_msg;
        net_msg.m_type = random_message_type;
        net_msg.data = ConsumeRandomLengthByteVector(fuzzed_data_provider);

        CNode &random_node =
            *peers.at(fuzzed_data_provider.ConsumeIntegralInRange<int>(
                0, peers.size() - 1));

        (void)connman.ReceiveMsgFrom(random_node, net_msg);
        random_node.fPauseSend = false;

        try {
            connman.ProcessMessagesOnce(random_node);
        } catch (const std::ios_base::failure &) {
        }
    }
    SyncWithValidationInterfaceQueue();
    g_setup->m_node.connman->StopNodes();
}
