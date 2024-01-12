// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <chainparams.h>
#include <chainparamsbase.h>
#include <config.h>
#include <net.h>
#include <net_permissions.h>
#include <netaddress.h>
#include <protocol.h>
#include <random.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/fuzz/util.h>
#include <test/util/setup_common.h>
#include <util/asmap.h>

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

void initialize_net() {
    static const auto testing_setup =
        MakeFuzzingContext<>(CBaseChainParams::MAIN);
}

FUZZ_TARGET_INIT(net, initialize_net) {
    FuzzedDataProvider fuzzed_data_provider(buffer.data(), buffer.size());
    const Config &config = GetConfig();

    const std::optional<CAddress> address =
        ConsumeDeserializable<CAddress>(fuzzed_data_provider);
    if (!address) {
        return;
    }
    const std::optional<CAddress> address_bind =
        ConsumeDeserializable<CAddress>(fuzzed_data_provider);
    if (!address_bind) {
        return;
    }

    CNode node{
        fuzzed_data_provider.ConsumeIntegral<NodeId>(),
        INVALID_SOCKET,
        *address,
        fuzzed_data_provider.ConsumeIntegral<uint64_t>(),
        fuzzed_data_provider.ConsumeIntegral<uint64_t>(),
        fuzzed_data_provider.ConsumeIntegral<uint64_t>(),
        *address_bind,
        fuzzed_data_provider.ConsumeRandomLengthString(32),
        fuzzed_data_provider.PickValueInArray(
            {ConnectionType::INBOUND, ConnectionType::OUTBOUND_FULL_RELAY,
             ConnectionType::MANUAL, ConnectionType::FEELER,
             ConnectionType::BLOCK_RELAY, ConnectionType::ADDR_FETCH}),
        fuzzed_data_provider.ConsumeBool()};
    node.SetCommonVersion(fuzzed_data_provider.ConsumeIntegral<int>());
    while (fuzzed_data_provider.ConsumeBool()) {
        switch (fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 6)) {
            case 0: {
                node.CloseSocketDisconnect();
                break;
            }
            case 1: {
                CNodeStats stats;
                node.copyStats(stats);
                break;
            }
            case 2: {
                const CNode *add_ref_node = node.AddRef();
                assert(add_ref_node == &node);
                break;
            }
            case 3: {
                if (node.GetRefCount() > 0) {
                    node.Release();
                }
                break;
            }
            case 4: {
                const std::optional<CService> service_opt =
                    ConsumeDeserializable<CService>(fuzzed_data_provider);
                if (!service_opt) {
                    break;
                }
                node.SetAddrLocal(*service_opt);
                break;
            }
            case 5: {
                const std::vector<uint8_t> b =
                    ConsumeRandomLengthByteVector(fuzzed_data_provider);
                bool complete;
                node.ReceiveMsgBytes(config, b, complete);
                break;
            }
        }
    }

    (void)node.GetAddrLocal();
    (void)node.GetId();
    (void)node.GetLocalNonce();
    const int ref_count = node.GetRefCount();
    assert(ref_count >= 0);
    (void)node.GetCommonVersion();

    const NetPermissionFlags net_permission_flags =
        fuzzed_data_provider.ConsumeBool()
            ? fuzzed_data_provider.PickValueInArray<NetPermissionFlags>(
                  {NetPermissionFlags::None, NetPermissionFlags::BloomFilter,
                   NetPermissionFlags::Relay, NetPermissionFlags::ForceRelay,
                   NetPermissionFlags::NoBan, NetPermissionFlags::Mempool,
                   NetPermissionFlags::Implicit, NetPermissionFlags::All})
            : static_cast<NetPermissionFlags>(
                  fuzzed_data_provider.ConsumeIntegral<uint32_t>());
    (void)node.HasPermission(net_permission_flags);
    (void)node.ConnectedThroughNetwork();
}
