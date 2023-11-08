// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/util/net.h>

#include <chainparams.h>
#include <config.h>
#include <net.h>
#include <net_processing.h>
#include <netmessagemaker.h>
#include <span.h>

#include <vector>

void ConnmanTestMsg::Handshake(CNode &node, bool successfully_connected,
                               ServiceFlags remote_services,
                               ServiceFlags local_services,
                               NetPermissionFlags permission_flags,
                               int32_t version, bool relay_txs) {
    // This assumes that peerman is the first element in m_msgproc (see D11302)
    auto &peerman{static_cast<PeerManager &>(*m_msgproc.front())};
    auto &connman{*this};
    const CNetMsgMaker mm{0};

    peerman.InitializeNode(::GetConfig(), node, local_services);

    CSerializedNetMsg msg_version{
        mm.Make(NetMsgType::VERSION, version,
                Using<CustomUintFormatter<8>>(remote_services),
                // dummy time
                int64_t{},
                // ignored service bits
                int64_t{},
                // dummy addrMe
                CService{},
                // ignored service bits
                int64_t{},
                // dummy addrFrom
                CService{},
                // dummy nonce
                uint64_t{1},
                // dummy subver
                std::string{},
                // dummy starting_height
                int32_t{},
                //
                relay_txs,
                // dummy extra entropy
                uint64_t{1}),
    };

    (void)connman.ReceiveMsgFrom(node, msg_version);
    node.fPauseSend = false;
    connman.ProcessMessagesOnce(node);
    {
        LOCK(node.cs_sendProcessing);
        peerman.SendMessages(::GetConfig(), &node);
    }
    if (node.fDisconnect) {
        return;
    }
    assert(node.nVersion == version);
    assert(node.GetCommonVersion() == std::min(version, PROTOCOL_VERSION));
    CNodeStateStats statestats;
    assert(peerman.GetNodeStateStats(node.GetId(), statestats));
    assert(statestats.their_services == remote_services);
    node.m_permissionFlags = permission_flags;
    if (successfully_connected) {
        CSerializedNetMsg msg_verack{mm.Make(NetMsgType::VERACK)};
        (void)connman.ReceiveMsgFrom(node, msg_verack);
        node.fPauseSend = false;
        connman.ProcessMessagesOnce(node);
        {
            LOCK(node.cs_sendProcessing);
            peerman.SendMessages(::GetConfig(), &node);
        }
        assert(node.fSuccessfullyConnected == true);
    }
}

void ConnmanTestMsg::NodeReceiveMsgBytes(CNode &node,
                                         Span<const uint8_t> msg_bytes,
                                         bool &complete) const {
    assert(node.ReceiveMsgBytes(*config, msg_bytes, complete));
    if (complete) {
        size_t nSizeAdded = 0;
        auto it(node.vRecvMsg.begin());
        for (; it != node.vRecvMsg.end(); ++it) {
            // vRecvMsg contains only completed CNetMessage
            // the single possible partially deserialized message are held by
            // TransportDeserializer
            nSizeAdded += it->m_raw_message_size;
        }
        {
            LOCK(node.cs_vProcessMsg);
            node.vProcessMsg.splice(node.vProcessMsg.end(), node.vRecvMsg,
                                    node.vRecvMsg.begin(), it);
            node.nProcessQueueSize += nSizeAdded;
            node.fPauseRecv = node.nProcessQueueSize > nReceiveFloodSize;
        }
    }
}

bool ConnmanTestMsg::ReceiveMsgFrom(CNode &node,
                                    CSerializedNetMsg &ser_msg) const {
    std::vector<uint8_t> ser_msg_header;
    node.m_serializer->prepareForTransport(*config, ser_msg, ser_msg_header);

    bool complete;
    NodeReceiveMsgBytes(node, ser_msg_header, complete);
    NodeReceiveMsgBytes(node, ser_msg.data, complete);
    return complete;
}

std::vector<NodeEvictionCandidate>
GetRandomNodeEvictionCandidates(const int n_candidates,
                                FastRandomContext &random_context) {
    std::vector<NodeEvictionCandidate> candidates;
    for (int id = 0; id < n_candidates; ++id) {
        candidates.push_back({
            /* id */ id,
            /* m_connected */
            std::chrono::seconds{random_context.randrange(100)},
            /* m_min_ping_time */
            std::chrono::microseconds{random_context.randrange(100)},
            /* m_last_block_time */
            std::chrono::seconds{random_context.randrange(100)},
            /* m_last_proof_time */
            std::chrono::seconds{random_context.randrange(100)},
            /* m_last_tx_time */
            std::chrono::seconds{random_context.randrange(100)},
            /* fRelevantServices */ random_context.randbool(),
            /* m_relay_txs */ random_context.randbool(),
            /* fBloomFilter */ random_context.randbool(),
            /* nKeyedNetGroup */ random_context.randrange(100),
            /* prefer_evict */ random_context.randbool(),
            /* m_is_local */ random_context.randbool(),
            /* m_network */
            ALL_NETWORKS[random_context.randrange(ALL_NETWORKS.size())],
            /* availabilityScore */ double(random_context.randrange(-1)),
        });
    }
    return candidates;
}
