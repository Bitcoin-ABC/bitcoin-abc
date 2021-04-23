// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#include <test/fuzz/util.h>

FuzzedSock::FuzzedSock(FuzzedDataProvider &fuzzed_data_provider)
    : m_fuzzed_data_provider{fuzzed_data_provider} {}

FuzzedSock &FuzzedSock::operator=(Sock &&other) {
    assert(false && "Not implemented yet.");
    return *this;
}

SOCKET FuzzedSock::Get() const {
    assert(false && "Not implemented yet.");
}

SOCKET FuzzedSock::Release() {
    assert(false && "Not implemented yet.");
}

void FuzzedSock::Reset() {
    assert(false && "Not implemented yet.");
}

ssize_t FuzzedSock::Send(const void *data, size_t len, int flags) const {
    constexpr std::array<int, 18> send_errnos{{
        EACCES,
        EAGAIN,
        EALREADY,
        EBADF,
        ECONNRESET,
        EDESTADDRREQ,
        EFAULT,
        EINTR,
        EINVAL,
        EISCONN,
        EMSGSIZE,
        ENOBUFS,
        ENOMEM,
        ENOTCONN,
        ENOTSOCK,
        EOPNOTSUPP,
        EPIPE,
        EWOULDBLOCK,
    }};
    if (m_fuzzed_data_provider.ConsumeBool()) {
        return len;
    }
    const ssize_t r =
        m_fuzzed_data_provider.ConsumeIntegralInRange<ssize_t>(-1, len);
    if (r == -1) {
        SetFuzzedErrNo(m_fuzzed_data_provider, send_errnos);
    }
    return r;
}

ssize_t FuzzedSock::Recv(void *buf, size_t len, int flags) const {
    constexpr std::array<int, 10> recv_errnos{{
        EAGAIN,
        EBADF,
        ECONNREFUSED,
        EFAULT,
        EINTR,
        EINVAL,
        ENOMEM,
        ENOTCONN,
        ENOTSOCK,
        EWOULDBLOCK,
    }};
    assert(buf != nullptr || len == 0);
    if (len == 0 || m_fuzzed_data_provider.ConsumeBool()) {
        const ssize_t r = m_fuzzed_data_provider.ConsumeBool() ? 0 : -1;
        if (r == -1) {
            SetFuzzedErrNo(m_fuzzed_data_provider, recv_errnos);
        }
        return r;
    }
    const std::vector<uint8_t> random_bytes =
        m_fuzzed_data_provider.ConsumeBytes<uint8_t>(
            m_fuzzed_data_provider.ConsumeIntegralInRange<size_t>(0, len));
    if (random_bytes.empty()) {
        const ssize_t r = m_fuzzed_data_provider.ConsumeBool() ? 0 : -1;
        if (r == -1) {
            SetFuzzedErrNo(m_fuzzed_data_provider, recv_errnos);
        }
        return r;
    }
    std::memcpy(buf, random_bytes.data(), random_bytes.size());
    if (m_fuzzed_data_provider.ConsumeBool()) {
        if (len > random_bytes.size()) {
            std::memset((char *)buf + random_bytes.size(), 0,
                        len - random_bytes.size());
        }
        return len;
    }
    if (m_fuzzed_data_provider.ConsumeBool() &&
        std::getenv("FUZZED_SOCKET_FAKE_LATENCY") != nullptr) {
        std::this_thread::sleep_for(std::chrono::milliseconds{2});
    }
    return random_bytes.size();
}

std::unique_ptr<Sock> FuzzedSock::Accept(sockaddr *addr,
                                         socklen_t *addr_len) const {
    constexpr std::array<int, 3> accept_errnos{{
        ECONNABORTED,
        EINTR,
        ENOMEM,
    }};
    if (m_fuzzed_data_provider.ConsumeBool()) {
        SetFuzzedErrNo(m_fuzzed_data_provider, accept_errnos);
        return std::unique_ptr<FuzzedSock>();
    }
    return std::make_unique<FuzzedSock>(m_fuzzed_data_provider);
}

bool FuzzedSock::Wait(std::chrono::milliseconds timeout, Event requested,
                      Event *occurred) const {
    return m_fuzzed_data_provider.ConsumeBool();
}
