// Copyright (c) 2020 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_UTIL_NET_H
#define BITCOIN_TEST_UTIL_NET_H

#include <compat.h>
#include <net.h>
#include <netaddress.h>
#include <util/sock.h>

#include <array>
#include <cassert>
#include <cstring>
#include <memory>
#include <string>

struct ConnmanTestMsg : public CConnman {
    using CConnman::CConnman;

    void SetPeerConnectTimeout(std::chrono::seconds timeout) {
        m_peer_connect_timeout = timeout;
    }

    void AddTestNode(CNode &node) {
        LOCK(m_nodes_mutex);
        m_nodes.push_back(&node);
    }
    void ClearTestNodes() {
        LOCK(m_nodes_mutex);
        for (CNode *node : m_nodes) {
            delete node;
        }
        m_nodes.clear();
    }

    void Handshake(CNode &node, bool successfully_connected,
                   ServiceFlags remote_services, ServiceFlags local_services,
                   int32_t version, bool relay_txs)
        EXCLUSIVE_LOCKS_REQUIRED(NetEventsInterface::g_msgproc_mutex);

    void ProcessMessagesOnce(CNode &node)
        EXCLUSIVE_LOCKS_REQUIRED(NetEventsInterface::g_msgproc_mutex) {
        for (auto interface : m_msgproc) {
            interface->ProcessMessages(*config, &node, flagInterruptMsgProc);
        }
    }

    void NodeReceiveMsgBytes(CNode &node, Span<const uint8_t> msg_bytes,
                             bool &complete) const;

    bool ReceiveMsgFrom(CNode &node, CSerializedNetMsg &ser_msg) const;
};

constexpr ServiceFlags ALL_SERVICE_FLAGS[]{
    NODE_NONE,      NODE_NETWORK,         NODE_GETUTXO,
    NODE_BLOOM,     NODE_COMPACT_FILTERS, NODE_NETWORK_LIMITED,
    NODE_AVALANCHE,
};

constexpr NetPermissionFlags ALL_NET_PERMISSION_FLAGS[]{
    NetPermissionFlags::None,     NetPermissionFlags::BloomFilter,
    NetPermissionFlags::Relay,    NetPermissionFlags::ForceRelay,
    NetPermissionFlags::NoBan,    NetPermissionFlags::Mempool,
    NetPermissionFlags::Addr,     NetPermissionFlags::Download,
    NetPermissionFlags::Implicit, NetPermissionFlags::All,
};

constexpr ConnectionType ALL_CONNECTION_TYPES[]{
    ConnectionType::INBOUND,     ConnectionType::OUTBOUND_FULL_RELAY,
    ConnectionType::MANUAL,      ConnectionType::FEELER,
    ConnectionType::BLOCK_RELAY, ConnectionType::ADDR_FETCH,
};

constexpr std::array<Network, 7> ALL_NETWORKS = {{
    Network::NET_UNROUTABLE,
    Network::NET_IPV4,
    Network::NET_IPV6,
    Network::NET_ONION,
    Network::NET_I2P,
    Network::NET_CJDNS,
    Network::NET_INTERNAL,
}};

/**
 * A mocked Sock alternative that returns a statically contained data upon read
 * and succeeds and ignores all writes. The data to be returned is given to the
 * constructor and when it is exhausted an EOF is returned by further reads.
 */
class StaticContentsSock : public Sock {
public:
    explicit StaticContentsSock(const std::string &contents)
        : m_contents{contents}, m_consumed{0} {
        // Just a dummy number that is not INVALID_SOCKET.
        static_assert(INVALID_SOCKET != 1000);
        m_socket = 1000;
    }

    ~StaticContentsSock() override { Reset(); }

    StaticContentsSock &operator=(Sock &&other) override {
        assert(false && "Move of Sock into MockSock not allowed.");
        return *this;
    }

    void Reset() override { m_socket = INVALID_SOCKET; }

    ssize_t Send(const void *, size_t len, int) const override { return len; }

    ssize_t Recv(void *buf, size_t len, int flags) const override {
        const size_t consume_bytes{
            std::min(len, m_contents.size() - m_consumed)};
        std::memcpy(buf, m_contents.data() + m_consumed, consume_bytes);
        if ((flags & MSG_PEEK) == 0) {
            m_consumed += consume_bytes;
        }
        return consume_bytes;
    }

    int Connect(const sockaddr *, socklen_t) const override { return 0; }

    std::unique_ptr<Sock> Accept(sockaddr *addr,
                                 socklen_t *addr_len) const override {
        if (addr != nullptr) {
            // Pretend all connections come from 5.5.5.5:6789
            memset(addr, 0x00, *addr_len);
            const socklen_t write_len =
                static_cast<socklen_t>(sizeof(sockaddr_in));
            if (*addr_len >= write_len) {
                *addr_len = write_len;
                sockaddr_in *addr_in = reinterpret_cast<sockaddr_in *>(addr);
                addr_in->sin_family = AF_INET;
                memset(&addr_in->sin_addr, 0x05, sizeof(addr_in->sin_addr));
                addr_in->sin_port = htons(6789);
            }
        }
        return std::make_unique<StaticContentsSock>("");
    };

    int GetSockOpt(int level, int opt_name, void *opt_val,
                   socklen_t *opt_len) const override {
        std::memset(opt_val, 0x0, *opt_len);
        return 0;
    }

    bool Wait(std::chrono::milliseconds timeout, Event requested,
              Event *occurred = nullptr) const override {
        if (occurred != nullptr) {
            *occurred = requested;
        }
        return true;
    }

    bool WaitMany(std::chrono::milliseconds timeout,
                  EventsPerSock &events_per_sock) const override {
        for (auto &[sock, events] : events_per_sock) {
            (void)sock;
            events.occurred = events.requested;
        }
        return true;
    }

private:
    const std::string m_contents;
    mutable size_t m_consumed;
};

std::vector<NodeEvictionCandidate>
GetRandomNodeEvictionCandidates(int n_candidates,
                                FastRandomContext &random_context);

#endif // BITCOIN_TEST_UTIL_NET_H
