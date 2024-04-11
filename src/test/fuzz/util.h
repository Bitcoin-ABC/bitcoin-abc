// Copyright (c) 2009-2019 The Bitcoin Core developers
// Distributed under the MIT software license, see the accompanying
// file COPYING or http://www.opensource.org/licenses/mit-license.php.

#ifndef BITCOIN_TEST_FUZZ_UTIL_H
#define BITCOIN_TEST_FUZZ_UTIL_H

#include <arith_uint256.h>
#include <chainparamsbase.h>
#include <coins.h>
#include <consensus/amount.h>
#include <net.h>
#include <netbase.h>
#include <script/script.h>
#include <script/standard.h>
#include <serialize.h>
#include <streams.h>
#include <uint256.h>
#include <util/vector.h>
#include <version.h>

#include <test/fuzz/FuzzedDataProvider.h>
#include <test/fuzz/fuzz.h>
#include <test/util/net.h>

#include <algorithm>
#include <cstdint>
#include <cstdio>
#include <optional>
#include <string>

namespace fuzzer {
// FIXME find a better way to avoid duplicating the MAX_MONEY definition
constexpr int64_t MAX_MONEY_AS_INT = int64_t(21000000) * int64_t(100000000);
} // end namespace fuzzer

using namespace fuzzer;

template <typename... Callables>
void CallOneOf(FuzzedDataProvider &fuzzed_data_provider,
               Callables... callables) {
    constexpr size_t call_size{sizeof...(callables)};
    static_assert(call_size >= 1);
    const size_t call_index{
        fuzzed_data_provider.ConsumeIntegralInRange<size_t>(0, call_size - 1)};

    size_t i{0};
    return ((i++ == call_index ? callables() : void()), ...);
}

[[nodiscard]] inline std::vector<uint8_t>
ConsumeRandomLengthByteVector(FuzzedDataProvider &fuzzed_data_provider,
                              const size_t max_length = 4096) noexcept {
    const std::string s =
        fuzzed_data_provider.ConsumeRandomLengthString(max_length);
    return {s.begin(), s.end()};
}

[[nodiscard]] inline CDataStream
ConsumeDataStream(FuzzedDataProvider &fuzzed_data_provider,
                  const size_t max_length = 4096) noexcept {
    return CDataStream{
        ConsumeRandomLengthByteVector(fuzzed_data_provider, max_length),
        SER_NETWORK, INIT_PROTO_VERSION};
}

[[nodiscard]] inline std::vector<std::string>
ConsumeRandomLengthStringVector(FuzzedDataProvider &fuzzed_data_provider,
                                const size_t max_vector_size = 16,
                                const size_t max_string_length = 16) noexcept {
    const size_t n_elements =
        fuzzed_data_provider.ConsumeIntegralInRange<size_t>(0, max_vector_size);
    std::vector<std::string> r;
    for (size_t i = 0; i < n_elements; ++i) {
        r.push_back(
            fuzzed_data_provider.ConsumeRandomLengthString(max_string_length));
    }
    return r;
}

template <typename T>
[[nodiscard]] inline std::vector<T>
ConsumeRandomLengthIntegralVector(FuzzedDataProvider &fuzzed_data_provider,
                                  const size_t max_vector_size = 16) noexcept {
    const size_t n_elements =
        fuzzed_data_provider.ConsumeIntegralInRange<size_t>(0, max_vector_size);
    std::vector<T> r;
    for (size_t i = 0; i < n_elements; ++i) {
        r.push_back(fuzzed_data_provider.ConsumeIntegral<T>());
    }
    return r;
}

template <typename T>
[[nodiscard]] inline std::optional<T>
ConsumeDeserializable(FuzzedDataProvider &fuzzed_data_provider,
                      const size_t max_length = 4096) noexcept {
    const std::vector<uint8_t> buffer =
        ConsumeRandomLengthByteVector(fuzzed_data_provider, max_length);
    CDataStream ds{buffer, SER_NETWORK, INIT_PROTO_VERSION};
    T obj;
    try {
        ds >> obj;
    } catch (const std::ios_base::failure &) {
        return std::nullopt;
    }
    return obj;
}

template <typename WeakEnumType, size_t size>
[[nodiscard]] WeakEnumType
ConsumeWeakEnum(FuzzedDataProvider &fuzzed_data_provider,
                const WeakEnumType (&all_types)[size]) noexcept {
    return fuzzed_data_provider.ConsumeBool()
               ? fuzzed_data_provider.PickValueInArray<WeakEnumType>(all_types)
               : WeakEnumType(
                     fuzzed_data_provider.ConsumeIntegral<
                         typename std::underlying_type<WeakEnumType>::type>());
}

[[nodiscard]] inline opcodetype
ConsumeOpcodeType(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return static_cast<opcodetype>(
        fuzzed_data_provider.ConsumeIntegralInRange<uint32_t>(0, MAX_OPCODE));
}

[[nodiscard]] inline Amount
ConsumeMoney(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return fuzzed_data_provider.ConsumeIntegralInRange<int64_t>(
               0, MAX_MONEY_AS_INT) *
           SATOSHI;
}

[[nodiscard]] inline int64_t
ConsumeTime(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    static const int64_t time_min =
        ParseISO8601DateTime("1970-01-01T00:00:00Z");
    static const int64_t time_max =
        ParseISO8601DateTime("9999-12-31T23:59:59Z");
    return fuzzed_data_provider.ConsumeIntegralInRange<int64_t>(time_min,
                                                                time_max);
}

[[nodiscard]] inline CScript
ConsumeScript(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    const std::vector<uint8_t> b =
        ConsumeRandomLengthByteVector(fuzzed_data_provider);
    return {b.begin(), b.end()};
}

[[nodiscard]] inline CScriptNum
ConsumeScriptNum(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return CScriptNum{fuzzed_data_provider.ConsumeIntegral<int64_t>()};
}

[[nodiscard]] inline uint160
ConsumeUInt160(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    const std::vector<uint8_t> v160 =
        fuzzed_data_provider.ConsumeBytes<uint8_t>(160 / 8);
    if (v160.size() != 160 / 8) {
        return {};
    }
    return uint160{v160};
}

[[nodiscard]] inline uint256
ConsumeUInt256(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    const std::vector<uint8_t> v256 =
        fuzzed_data_provider.ConsumeBytes<uint8_t>(256 / 8);
    if (v256.size() != 256 / 8) {
        return {};
    }
    return uint256{v256};
}

[[nodiscard]] inline arith_uint256
ConsumeArithUInt256(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return UintToArith256(ConsumeUInt256(fuzzed_data_provider));
}

[[nodiscard]] inline CTxDestination
ConsumeTxDestination(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    CTxDestination tx_destination;
    CallOneOf(
        fuzzed_data_provider, [&] { tx_destination = CNoDestination{}; },
        [&] { tx_destination = PKHash{ConsumeUInt160(fuzzed_data_provider)}; },
        [&] {
            tx_destination = ScriptHash{ConsumeUInt160(fuzzed_data_provider)};
        });
    return tx_destination;
}

template <typename T>
[[nodiscard]] bool MultiplicationOverflow(const T i, const T j) noexcept {
    static_assert(std::is_integral<T>::value, "Integral required.");
    if (std::numeric_limits<T>::is_signed) {
        if (i > 0) {
            if (j > 0) {
                return i > (std::numeric_limits<T>::max() / j);
            } else {
                return j < (std::numeric_limits<T>::min() / i);
            }
        } else {
            if (j > 0) {
                return i < (std::numeric_limits<T>::min() / j);
            } else {
                return i != 0 && (j < (std::numeric_limits<T>::max() / i));
            }
        }
    } else {
        return j != 0 && i > std::numeric_limits<T>::max() / j;
    }
}

template <class T>
[[nodiscard]] bool AdditionOverflow(const T i, const T j) noexcept {
    static_assert(std::is_integral<T>::value, "Integral required.");
    if (std::numeric_limits<T>::is_signed) {
        return (i > 0 && j > std::numeric_limits<T>::max() - i) ||
               (i < 0 && j < std::numeric_limits<T>::min() - i);
    }
    return std::numeric_limits<T>::max() - i < j;
}

[[nodiscard]] inline bool
ContainsSpentInput(const CTransaction &tx,
                   const CCoinsViewCache &inputs) noexcept {
    for (const CTxIn &tx_in : tx.vin) {
        const Coin &coin = inputs.AccessCoin(tx_in.prevout);
        if (coin.IsSpent()) {
            return true;
        }
    }
    return false;
}

/**
 * Sets a fuzzed errno in the range [0, 133 (EHWPOISON)]. Can be used from
 * functions emulating standard library functions that set errno, or in other
 * contexts where the value of errno might be relevant for the execution path
 * that will be taken.
 */
inline void SetFuzzedErrNo(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    errno = fuzzed_data_provider.ConsumeIntegralInRange<int>(0, 133);
}

/**
 * Returns a byte vector of specified size regardless of the number of remaining
 * bytes available from the fuzzer. Pads with zero value bytes if needed to
 * achieve the specified size.
 */
[[nodiscard]] inline std::vector<uint8_t>
ConsumeFixedLengthByteVector(FuzzedDataProvider &fuzzed_data_provider,
                             const size_t length) noexcept {
    std::vector<uint8_t> result(length);
    const std::vector<uint8_t> random_bytes =
        fuzzed_data_provider.ConsumeBytes<uint8_t>(length);
    if (!random_bytes.empty()) {
        std::memcpy(result.data(), random_bytes.data(), random_bytes.size());
    }
    return result;
}

inline CNetAddr
ConsumeNetAddr(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    const Network network = fuzzed_data_provider.PickValueInArray(
        {Network::NET_IPV4, Network::NET_IPV6, Network::NET_INTERNAL,
         Network::NET_ONION});
    CNetAddr net_addr;
    if (network == Network::NET_IPV4) {
        const in_addr v4_addr = {
            .s_addr = fuzzed_data_provider.ConsumeIntegral<uint32_t>()};
        net_addr = CNetAddr{v4_addr};
    } else if (network == Network::NET_IPV6) {
        if (fuzzed_data_provider.remaining_bytes() >= 16) {
            in6_addr v6_addr = {};
            memcpy(v6_addr.s6_addr,
                   fuzzed_data_provider.ConsumeBytes<uint8_t>(16).data(), 16);
            net_addr = CNetAddr{
                v6_addr, fuzzed_data_provider.ConsumeIntegral<uint32_t>()};
        }
    } else if (network == Network::NET_INTERNAL) {
        net_addr.SetInternal(fuzzed_data_provider.ConsumeBytesAsString(32));
    } else if (network == Network::NET_ONION) {
        net_addr.SetSpecial(fuzzed_data_provider.ConsumeBytesAsString(32));
    }
    return net_addr;
}

inline CSubNet
ConsumeSubNet(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return {ConsumeNetAddr(fuzzed_data_provider),
            fuzzed_data_provider.ConsumeIntegral<uint8_t>()};
}

inline CService
ConsumeService(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return {ConsumeNetAddr(fuzzed_data_provider),
            fuzzed_data_provider.ConsumeIntegral<uint16_t>()};
}

inline CAddress
ConsumeAddress(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return {ConsumeService(fuzzed_data_provider),
            ConsumeWeakEnum(fuzzed_data_provider, ALL_SERVICE_FLAGS),
            NodeSeconds{std::chrono::seconds{
                fuzzed_data_provider.ConsumeIntegral<uint32_t>()}}};
}

template <bool ReturnUniquePtr = false>
auto ConsumeNode(
    FuzzedDataProvider &fuzzed_data_provider,
    const std::optional<NodeId> &node_id_in = std::nullopt) noexcept {
    const NodeId node_id =
        node_id_in.value_or(fuzzed_data_provider.ConsumeIntegral<NodeId>());
    const SOCKET socket = INVALID_SOCKET;
    const CAddress address = ConsumeAddress(fuzzed_data_provider);
    const uint64_t keyed_net_group =
        fuzzed_data_provider.ConsumeIntegral<uint64_t>();
    const uint64_t local_host_nonce =
        fuzzed_data_provider.ConsumeIntegral<uint64_t>();
    const uint64_t local_extra_entropy =
        fuzzed_data_provider.ConsumeIntegral<uint64_t>();
    const CAddress addr_bind = ConsumeAddress(fuzzed_data_provider);
    const std::string addr_name =
        fuzzed_data_provider.ConsumeRandomLengthString(64);
    const ConnectionType conn_type =
        fuzzed_data_provider.PickValueInArray(ALL_CONNECTION_TYPES);
    const bool inbound_onion = fuzzed_data_provider.ConsumeBool();
    if constexpr (ReturnUniquePtr) {
        return std::make_unique<CNode>(node_id, socket, address,
                                       keyed_net_group, local_host_nonce,
                                       local_extra_entropy, addr_bind,
                                       addr_name, conn_type, inbound_onion);
    } else {
        return CNode{node_id,         socket,           address,
                     keyed_net_group, local_host_nonce, local_extra_entropy,
                     addr_bind,       addr_name,        conn_type,
                     inbound_onion};
    }
}
inline std::unique_ptr<CNode>
ConsumeNodeAsUniquePtr(FuzzedDataProvider &fdp,
                       const std::optional<NodeId> &node_id_in = std::nullopt) {
    return ConsumeNode<true>(fdp, node_id_in);
}

class FuzzedFileProvider {
    FuzzedDataProvider &m_fuzzed_data_provider;
    int64_t m_offset = 0;

public:
    FuzzedFileProvider(FuzzedDataProvider &fuzzed_data_provider)
        : m_fuzzed_data_provider{fuzzed_data_provider} {}

    FILE *open() {
        SetFuzzedErrNo(m_fuzzed_data_provider);
        if (m_fuzzed_data_provider.ConsumeBool()) {
            return nullptr;
        }
        std::string mode;
        // clang-format off
        CallOneOf(
            m_fuzzed_data_provider,
            [&] { mode = "r"; },
            [&] { mode = "r+"; },
            [&] { mode = "w"; },
            [&] { mode = "w+"; },
            [&] { mode = "a"; },
            [&] { mode = "a+"; }
        );
        // clang-format on
#ifdef _GNU_SOURCE
        const cookie_io_functions_t io_hooks = {
            FuzzedFileProvider::read,
            FuzzedFileProvider::write,
            FuzzedFileProvider::seek,
            FuzzedFileProvider::close,
        };
        return fopencookie(this, mode.c_str(), io_hooks);
#else
        (void)mode;
        return nullptr;
#endif
    }

    static ssize_t read(void *cookie, char *buf, size_t size) {
        FuzzedFileProvider *fuzzed_file = (FuzzedFileProvider *)cookie;
        SetFuzzedErrNo(fuzzed_file->m_fuzzed_data_provider);
        if (buf == nullptr || size == 0 ||
            fuzzed_file->m_fuzzed_data_provider.ConsumeBool()) {
            return fuzzed_file->m_fuzzed_data_provider.ConsumeBool() ? 0 : -1;
        }
        const std::vector<uint8_t> random_bytes =
            fuzzed_file->m_fuzzed_data_provider.ConsumeBytes<uint8_t>(size);
        if (random_bytes.empty()) {
            return 0;
        }
        std::memcpy(buf, random_bytes.data(), random_bytes.size());
        if (AdditionOverflow(fuzzed_file->m_offset,
                             int64_t(random_bytes.size()))) {
            return fuzzed_file->m_fuzzed_data_provider.ConsumeBool() ? 0 : -1;
        }
        fuzzed_file->m_offset += random_bytes.size();
        return random_bytes.size();
    }

    static ssize_t write(void *cookie, const char *buf, size_t size) {
        FuzzedFileProvider *fuzzed_file = (FuzzedFileProvider *)cookie;
        SetFuzzedErrNo(fuzzed_file->m_fuzzed_data_provider);
        const ssize_t n =
            fuzzed_file->m_fuzzed_data_provider.ConsumeIntegralInRange<ssize_t>(
                0, size);
        if (AdditionOverflow(fuzzed_file->m_offset, int64_t(n))) {
            return fuzzed_file->m_fuzzed_data_provider.ConsumeBool() ? 0 : -1;
        }
        fuzzed_file->m_offset += n;
        return n;
    }

    static int seek(void *cookie, int64_t *offset, int whence) {
        assert(whence == SEEK_SET || whence == SEEK_CUR || whence == SEEK_END);
        FuzzedFileProvider *fuzzed_file = (FuzzedFileProvider *)cookie;
        SetFuzzedErrNo(fuzzed_file->m_fuzzed_data_provider);
        int64_t new_offset = 0;
        if (whence == SEEK_SET) {
            new_offset = *offset;
        } else if (whence == SEEK_CUR) {
            if (AdditionOverflow(fuzzed_file->m_offset, *offset)) {
                return -1;
            }
            new_offset = fuzzed_file->m_offset + *offset;
        } else if (whence == SEEK_END) {
            const int64_t n = fuzzed_file->m_fuzzed_data_provider
                                  .ConsumeIntegralInRange<int64_t>(0, 4096);
            if (AdditionOverflow(n, *offset)) {
                return -1;
            }
            new_offset = n + *offset;
        }
        if (new_offset < 0) {
            return -1;
        }
        fuzzed_file->m_offset = new_offset;
        *offset = new_offset;
        return fuzzed_file->m_fuzzed_data_provider.ConsumeIntegralInRange<int>(
            -1, 0);
    }

    static int close(void *cookie) {
        FuzzedFileProvider *fuzzed_file = (FuzzedFileProvider *)cookie;
        SetFuzzedErrNo(fuzzed_file->m_fuzzed_data_provider);
        return fuzzed_file->m_fuzzed_data_provider.ConsumeIntegralInRange<int>(
            -1, 0);
    }
};

[[nodiscard]] inline FuzzedFileProvider
ConsumeFile(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return {fuzzed_data_provider};
}

class FuzzedAutoFileProvider {
    FuzzedFileProvider m_fuzzed_file_provider;

public:
    FuzzedAutoFileProvider(FuzzedDataProvider &fuzzed_data_provider)
        : m_fuzzed_file_provider{fuzzed_data_provider} {}

    AutoFile open() { return AutoFile{m_fuzzed_file_provider.open()}; }
};

[[nodiscard]] inline FuzzedAutoFileProvider
ConsumeAutoFile(FuzzedDataProvider &fuzzed_data_provider) noexcept {
    return {fuzzed_data_provider};
}

#define WRITE_TO_STREAM_CASE(type, consume)                                    \
    [&] {                                                                      \
        type o = consume;                                                      \
        stream << o;                                                           \
    }
template <typename Stream>
void WriteToStream(FuzzedDataProvider &fuzzed_data_provider,
                   Stream &stream) noexcept {
    while (fuzzed_data_provider.ConsumeBool()) {
        try {
            CallOneOf(
                fuzzed_data_provider,
                WRITE_TO_STREAM_CASE(bool, fuzzed_data_provider.ConsumeBool()),
                WRITE_TO_STREAM_CASE(
                    int8_t, fuzzed_data_provider.ConsumeIntegral<int8_t>()),
                WRITE_TO_STREAM_CASE(
                    uint8_t, fuzzed_data_provider.ConsumeIntegral<uint8_t>()),
                WRITE_TO_STREAM_CASE(
                    int16_t, fuzzed_data_provider.ConsumeIntegral<int16_t>()),
                WRITE_TO_STREAM_CASE(
                    uint16_t, fuzzed_data_provider.ConsumeIntegral<uint16_t>()),
                WRITE_TO_STREAM_CASE(
                    int32_t, fuzzed_data_provider.ConsumeIntegral<int32_t>()),
                WRITE_TO_STREAM_CASE(
                    uint32_t, fuzzed_data_provider.ConsumeIntegral<uint32_t>()),
                WRITE_TO_STREAM_CASE(
                    int64_t, fuzzed_data_provider.ConsumeIntegral<int64_t>()),
                WRITE_TO_STREAM_CASE(
                    uint64_t, fuzzed_data_provider.ConsumeIntegral<uint64_t>()),
                WRITE_TO_STREAM_CASE(
                    float, fuzzed_data_provider.ConsumeFloatingPoint<float>()),
                WRITE_TO_STREAM_CASE(
                    double,
                    fuzzed_data_provider.ConsumeFloatingPoint<double>()),
                WRITE_TO_STREAM_CASE(
                    std::string,
                    fuzzed_data_provider.ConsumeRandomLengthString(32)),
                WRITE_TO_STREAM_CASE(std::vector<uint8_t>,
                                     ConsumeRandomLengthIntegralVector<uint8_t>(
                                         fuzzed_data_provider)));
        } catch (const std::ios_base::failure &) {
            break;
        }
    }
}

#define READ_FROM_STREAM_CASE(type)                                            \
    [&] {                                                                      \
        type o;                                                                \
        stream >> o;                                                           \
    }
template <typename Stream>
void ReadFromStream(FuzzedDataProvider &fuzzed_data_provider,
                    Stream &stream) noexcept {
    while (fuzzed_data_provider.ConsumeBool()) {
        try {
            // clang-format off
            CallOneOf(
                fuzzed_data_provider,
                READ_FROM_STREAM_CASE(bool),
                READ_FROM_STREAM_CASE(int8_t),
                READ_FROM_STREAM_CASE(uint8_t),
                READ_FROM_STREAM_CASE(int16_t),
                READ_FROM_STREAM_CASE(uint16_t),
                READ_FROM_STREAM_CASE(int32_t),
                READ_FROM_STREAM_CASE(uint32_t),
                READ_FROM_STREAM_CASE(int64_t),
                READ_FROM_STREAM_CASE(uint64_t),
                READ_FROM_STREAM_CASE(float),
                READ_FROM_STREAM_CASE(double),
                READ_FROM_STREAM_CASE(std::string),
                READ_FROM_STREAM_CASE(std::vector<uint8_t>)
            );
            // clang-format on
        } catch (const std::ios_base::failure &) {
            break;
        }
    }
}

#endif // BITCOIN_TEST_FUZZ_UTIL_H
