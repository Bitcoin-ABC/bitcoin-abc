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

void initialize() {
    static const BasicTestingSetup basic_testing_setup;
}

void test_one_input(const std::vector<uint8_t> &buffer) {
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
        static_cast<ServiceFlags>(
            fuzzed_data_provider.ConsumeIntegral<uint64_t>()),
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
        switch (fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 8)) {
            case 0: {
                node.CloseSocketDisconnect();
                break;
            }
            case 1: {
                node.MaybeSetAddrName(
                    fuzzed_data_provider.ConsumeRandomLengthString(32));
                break;
            }
            case 2: {
                CNodeStats stats;
                node.copyStats(stats);
                break;
            }
            case 3: {
                const CNode *add_ref_node = node.AddRef();
                assert(add_ref_node == &node);
                break;
            }
            case 4: {
                if (node.GetRefCount() > 0) {
                    node.Release();
                }
                break;
            }
            case 5: {
                const std::optional<CInv> inv_opt =
                    ConsumeDeserializable<CInv>(fuzzed_data_provider);
                if (!inv_opt) {
                    break;
                }
                const TxId &txid = TxId(inv_opt->hash);
                node.AddKnownTx(txid);
                break;
            }
            case 6: {
                const TxId &txid = TxId(ConsumeUInt256(fuzzed_data_provider));
                node.PushTxInventory(txid);
                break;
            }
            case 7: {
                const std::optional<CService> service_opt =
                    ConsumeDeserializable<CService>(fuzzed_data_provider);
                if (!service_opt) {
                    break;
                }
                node.SetAddrLocal(*service_opt);
                break;
            }
            case 8: {
                const std::vector<uint8_t> b =
                    ConsumeRandomLengthByteVector(fuzzed_data_provider);
                bool complete;
                node.ReceiveMsgBytes(config, {(const char *)b.data(), b.size()},
                                     complete);
                break;
            }
        }
    }

    (void)node.GetAddrLocal();
    (void)node.GetAddrName();
    (void)node.GetId();
    (void)node.GetLocalNonce();
    (void)node.GetLocalServices();
    const int ref_count = node.GetRefCount();
    assert(ref_count >= 0);
    (void)node.GetCommonVersion();

    const NetPermissionFlags net_permission_flags =
        fuzzed_data_provider.ConsumeBool()
            ? fuzzed_data_provider.PickValueInArray<NetPermissionFlags>(
                  {NetPermissionFlags::PF_NONE,
                   NetPermissionFlags::PF_BLOOMFILTER,
                   NetPermissionFlags::PF_RELAY,
                   NetPermissionFlags::PF_FORCERELAY,
                   NetPermissionFlags::PF_NOBAN, NetPermissionFlags::PF_MEMPOOL,
                   NetPermissionFlags::PF_ISIMPLICIT,
                   NetPermissionFlags::PF_ALL})
            : static_cast<NetPermissionFlags>(
                  fuzzed_data_provider.ConsumeIntegral<uint32_t>());
    (void)node.HasPermission(net_permission_flags);
    (void)node.ConnectedThroughNetwork();
}
