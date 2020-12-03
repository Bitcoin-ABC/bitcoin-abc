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
        switch (fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 19)) {
            case 0:
                random_netaddr = ConsumeNetAddr(fuzzed_data_provider);
                break;
            case 1:
                random_subnet = ConsumeSubNet(fuzzed_data_provider);
                break;
            case 2:
                random_string =
                    fuzzed_data_provider.ConsumeRandomLengthString(64);
                break;
            case 3:
                connman.AddNode(random_string);
                break;
            case 4:
                connman.CheckIncomingNonce(
                    fuzzed_data_provider.ConsumeIntegral<uint64_t>());
                break;
            case 5:
                connman.DisconnectNode(
                    fuzzed_data_provider.ConsumeIntegral<NodeId>());
                break;
            case 6:
                connman.DisconnectNode(random_netaddr);
                break;
            case 7:
                connman.DisconnectNode(random_string);
                break;
            case 8:
                connman.DisconnectNode(random_subnet);
                break;
            case 9:
                connman.ForEachNode([](auto) {});
                break;
            case 10:
                (void)connman.ForNode(
                    fuzzed_data_provider.ConsumeIntegral<NodeId>(),
                    [&](auto) { return fuzzed_data_provider.ConsumeBool(); });
                break;
            case 11:
                (void)connman.GetAddresses(
                    fuzzed_data_provider.ConsumeIntegral<size_t>(),
                    fuzzed_data_provider.ConsumeIntegral<size_t>(),
                    std::nullopt);
                break;
            case 12: {
                (void)connman.GetAddresses(
                    random_node, fuzzed_data_provider.ConsumeIntegral<size_t>(),
                    fuzzed_data_provider.ConsumeIntegral<size_t>());
                break;
            }
            case 13:
                (void)connman.GetDeterministicRandomizer(
                    fuzzed_data_provider.ConsumeIntegral<uint64_t>());
                break;
            case 14:
                (void)connman.GetNodeCount(
                    fuzzed_data_provider.PickValueInArray(
                        {CConnman::CONNECTIONS_NONE, CConnman::CONNECTIONS_IN,
                         CConnman::CONNECTIONS_OUT,
                         CConnman::CONNECTIONS_ALL}));
                break;
            case 15:
                (void)connman.OutboundTargetReached(
                    fuzzed_data_provider.ConsumeBool());
                break;
            case 16: {
                CSerializedNetMsg serialized_net_msg;
                serialized_net_msg.m_type =
                    fuzzed_data_provider.ConsumeRandomLengthString(
                        CMessageHeader::COMMAND_SIZE);
                serialized_net_msg.data =
                    ConsumeRandomLengthByteVector(fuzzed_data_provider);
                connman.PushMessage(&random_node,
                                    std::move(serialized_net_msg));
                break;
            }
            case 17:
                connman.RemoveAddedNode(random_string);
                break;
            case 18:
                connman.SetNetworkActive(fuzzed_data_provider.ConsumeBool());
                break;
            case 19:
                connman.SetTryNewOutboundPeer(
                    fuzzed_data_provider.ConsumeBool());
                break;
        }
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
