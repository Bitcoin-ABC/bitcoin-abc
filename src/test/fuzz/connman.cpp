// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <config.h>
#include <net.h>
#include <netaddress.h>
#include <protocol.h>
#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>

#include <cstdint>
#include <vector>

namespace {
const TestingSetup *g_setup;
} // namespace

void initialize_connman() {
    static const auto testing_setup = MakeFuzzingContext<const TestingSetup>();
    g_setup = testing_setup.get();
}

FUZZ_TARGET_INIT(connman, initialize_connman) {
    const Config &config = GetConfig();
    FuzzedDataProvider fuzzed_data_provider{buffer.data(), buffer.size()};
    CConnman connman{config, fuzzed_data_provider.ConsumeIntegral<uint64_t>(),
                     fuzzed_data_provider.ConsumeIntegral<uint64_t>(),
                     *g_setup->m_node.addrman,
                     fuzzed_data_provider.ConsumeBool()};
    CNetAddr random_netaddr;
    CNode random_node = ConsumeNode(fuzzed_data_provider);
    CSubNet random_subnet;
    std::string random_string;
    while (fuzzed_data_provider.ConsumeBool()) {
        CallOneOf(
            fuzzed_data_provider,
            [&] { random_netaddr = ConsumeNetAddr(fuzzed_data_provider); },
            [&] { random_subnet = ConsumeSubNet(fuzzed_data_provider); },
            [&] {
                random_string =
                    fuzzed_data_provider.ConsumeRandomLengthString(64);
            },
            [&] { connman.AddNode(random_string); },
            [&] {
                connman.CheckIncomingNonce(
                    fuzzed_data_provider.ConsumeIntegral<uint64_t>());
            },
            [&] {
                connman.DisconnectNode(
                    fuzzed_data_provider.ConsumeIntegral<NodeId>());
            },
            [&] { connman.DisconnectNode(random_netaddr); },
            [&] { connman.DisconnectNode(random_string); },
            [&] { connman.DisconnectNode(random_subnet); },
            [&] { connman.ForEachNode([](auto) {}); },
            [&] {
                (void)connman.ForNode(
                    fuzzed_data_provider.ConsumeIntegral<NodeId>(),
                    [&](auto) { return fuzzed_data_provider.ConsumeBool(); });
            },
            [&] {
                (void)connman.GetAddresses(
                    fuzzed_data_provider.ConsumeIntegral<size_t>(),
                    fuzzed_data_provider.ConsumeIntegral<size_t>(),
                    std::nullopt);
            },
            [&] {
                (void)connman.GetAddresses(
                    random_node, fuzzed_data_provider.ConsumeIntegral<size_t>(),
                    fuzzed_data_provider.ConsumeIntegral<size_t>());
            },
            [&] {
                (void)connman.GetDeterministicRandomizer(
                    fuzzed_data_provider.ConsumeIntegral<uint64_t>());
            },
            [&] {
                (void)connman.GetNodeCount(
                    fuzzed_data_provider.PickValueInArray(
                        {CConnman::CONNECTIONS_NONE, CConnman::CONNECTIONS_IN,
                         CConnman::CONNECTIONS_OUT,
                         CConnman::CONNECTIONS_ALL}));
            },
            [&] {
                (void)connman.OutboundTargetReached(
                    fuzzed_data_provider.ConsumeBool());
            },
            [&] {
                CSerializedNetMsg serialized_net_msg;
                serialized_net_msg.m_type =
                    fuzzed_data_provider.ConsumeRandomLengthString(
                        CMessageHeader::COMMAND_SIZE);
                serialized_net_msg.data =
                    ConsumeRandomLengthByteVector(fuzzed_data_provider);
                connman.PushMessage(&random_node,
                                    std::move(serialized_net_msg));
            },
            [&] { connman.RemoveAddedNode(random_string); },
            [&] {
                connman.SetNetworkActive(fuzzed_data_provider.ConsumeBool());
            },
            [&] {
                connman.SetTryNewOutboundPeer(
                    fuzzed_data_provider.ConsumeBool());
                connman.SetTryNewOutboundPeer(
                    fuzzed_data_provider.ConsumeBool());
            });
    }
    (void)connman.GetAddedNodeInfo();
    (void)connman.GetExtraFullOutboundCount();
    (void)connman.GetLocalServices();
    (void)connman.GetMaxOutboundTarget();
    (void)connman.GetMaxOutboundTimeframe();
    (void)connman.GetMaxOutboundTimeLeftInCycle();
    (void)connman.GetNetworkActive();
    std::vector<CNodeStats> stats;
    connman.GetNodeStats(stats);
    (void)connman.GetOutboundTargetBytesLeft();
    (void)connman.GetReceiveFloodSize();
    (void)connman.GetTotalBytesRecv();
    (void)connman.GetTotalBytesSent();
    (void)connman.GetTryNewOutboundPeer();
    (void)connman.GetUseAddrmanOutgoing();
}
