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
                   NetPermissionFlags permission_flags, int32_t version,
                   bool relay_txs);

    void ProcessMessagesOnce(CNode &node) {
        for (auto interface : m_msgproc) {
            interface->ProcessMessages(*config, &node, flagInterruptMsgProc);
        }
    }

    void NodeReceiveMsgBytes(CNode &node, Span<const uint8_t> msg_bytes,
                             bool &complete) const;

    bool ReceiveMsgFrom(CNode &node, CSerializedNetMsg &ser_msg) const;
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

private:
    const std::string m_contents;
    mutable size_t m_consumed;
};

std::vector<NodeEvictionCandidate>
GetRandomNodeEvictionCandidates(int n_candidates,
                                FastRandomContext &random_context);

#endif // BITCOIN_TEST_UTIL_NET_H
